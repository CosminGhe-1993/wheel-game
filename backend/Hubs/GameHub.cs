using Microsoft.AspNetCore.SignalR;
using WheelApi.Models;
using WheelApi.Services;

namespace WheelApi.Hubs;

public class GameHub : Hub
{
    private readonly IGameRoomService _roomService;
    private readonly IGroqService _groqService;
    private readonly ICardService _cardService;
    private static readonly Random _random = new();

    public GameHub(IGameRoomService roomService, IGroqService groqService, ICardService cardService)
    {
        _roomService = roomService;
        _groqService = groqService;
        _cardService = cardService;
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var roomCode = _roomService.RemoveConnection(Context.ConnectionId);
        if (roomCode != null)
            await Clients.Group(roomCode).SendAsync("PlayerLeft");
        await base.OnDisconnectedAsync(exception);
    }

    public async Task CreateRoom(int maxPlayers, int totalRounds)
    {
        var code = _roomService.CreateRoom(Context.ConnectionId, maxPlayers, totalRounds);
        await Groups.AddToGroupAsync(Context.ConnectionId, code);
        await Clients.Caller.SendAsync("RoomCreated", code);
    }

    public async Task JoinRoom(string roomCode)
    {
        var success = _roomService.JoinRoom(roomCode, Context.ConnectionId);
        if (!success)
        {
            await Clients.Caller.SendAsync("JoinError", "Camera nu exista sau este plina.");
            return;
        }
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);
        await Clients.Caller.SendAsync("JoinedRoom");
        var room = _roomService.GetRoom(roomCode)!;
        await Clients.Group(roomCode).SendAsync("PlayerJoined", room.Players.Count, room.MaxPlayers);
    }

    public async Task SetName(string name)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room == null) return;
        _roomService.SetPlayerName(Context.ConnectionId, name);

        if (_roomService.AllPlayersNamed(room.RoomCode))
        {
            var allCards = (await _cardService.GetCardNamesAsync()).ToArray();
            foreach (var player in room.Players)
                for (int i = 0; i < 5; i++)
                    player.Cards.Add(allCards[_random.Next(allCards.Length)]);

            room.Phase = GamePhase.Dice;
            room.DiceRollOrder = Enumerable.Range(0, room.Players.Count).ToList();
            room.CurrentDiceRollerIndex = 0;

            await Clients.Group(room.RoomCode).SendAsync("DicePhaseStarted");
            await StartNextDiceRoll(room);
        }
    }

    public async Task RollDice()
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Dice) return;

        var currentIndex = room.DiceRollOrder[room.CurrentDiceRollerIndex];
        if (room.Players[currentIndex].ConnectionId != Context.ConnectionId) return;

        var dice1 = _random.Next(1, 7);
        var dice2 = _random.Next(1, 7);
        var sum = dice1 + dice2;
        var isDouble = dice1 == dice2;

        room.DiceResults.Add(new DiceResult
        {
            PlayerIndex = currentIndex,
            Dice1 = dice1, Dice2 = dice2,
            Sum = sum, IsDouble = isDouble,
            MaxDice = Math.Max(dice1, dice2)
        });

        await Clients.Group(room.RoomCode).SendAsync("DiceRolled",
            room.Players[currentIndex].Name, dice1, dice2, sum, isDouble);

        room.CurrentDiceRollerIndex++;

        if (room.CurrentDiceRollerIndex < room.DiceRollOrder.Count)
        {
            await StartNextDiceRoll(room);
            return;
        }

        room.DiceResults.Sort((a, b) =>
        {
            if (b.Sum != a.Sum) return b.Sum.CompareTo(a.Sum);
            if (a.IsDouble != b.IsDouble) return a.IsDouble ? -1 : 1;
            return b.MaxDice.CompareTo(a.MaxDice);
        });

        var tiedIndices = FindTiedPlayers(room.DiceResults);

        if (tiedIndices.Count > 0)
        {
            room.DiceResults.RemoveAll(r => tiedIndices.Contains(r.PlayerIndex));
            room.DiceRollOrder = tiedIndices;
            room.CurrentDiceRollerIndex = 0;
            var tiedNames = tiedIndices.Select(i => room.Players[i].Name).ToList();
            await Clients.Group(room.RoomCode).SendAsync("TieBreak", tiedNames);
            await StartNextDiceRoll(room);
            return;
        }

        room.Players = room.DiceResults.Select(r => room.Players[r.PlayerIndex]).ToList();
        room.Phase = GamePhase.Playing;
        room.CurrentPlayerIndex = 0;
        room.CurrentRound = 1;

        var sentence = await _groqService.GetSentence();
        room.CurrentSentence = sentence;

        await Clients.Group(room.RoomCode).SendAsync("GameStarted",
            room.Players.Select(p => p.Name).ToList(), sentence);

        foreach (var player in room.Players)
            await Clients.Client(player.ConnectionId).SendAsync("HandUpdated", player.Cards);

        await StartTurn(room);
    }

    public async Task SpinWheel()
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing || !room.SpinAvailable) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        room.SpinAvailable = false;

        var allCards = (await _cardService.GetCardNamesAsync()).ToArray();
        int cardIndex;
        if (room.PredictedCard != null && room.PredictedCard.ForPlayerIndex == room.CurrentPlayerIndex)
        {
            cardIndex = room.PredictedCard.CardIndex;
            room.PredictedCard = null;
        }
        else
        {
            cardIndex = _random.Next(allCards.Length);
        }

        var cardName = allCards[cardIndex];
        currentPlayer.Cards.Add(cardName);

        await Clients.Group(room.RoomCode).SendAsync("WheelSpinStarted", cardIndex);
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("HandUpdated", currentPlayer.Cards);
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("YourTurn", true);
    }

    public async Task GuessLetter(string letter)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        letter = letter.ToUpper();
        if (room.RevealedLetters.Contains(letter)) return;

        var matches = room.CurrentSentence.ToUpper().Count(c => c.ToString() == letter);

        if (matches > 0)
        {
            room.RevealedLetters.Add(letter);
            var points = room.DoubloActive ? matches * 2 : matches;

            var scoreChanges = new List<object>();
            if (room.DictatorActive)
            {
                room.Players[room.DictatorOwnerIndex].Score += points;
                scoreChanges.Add(new { name = room.Players[room.DictatorOwnerIndex].Name, delta = points });
            }
            else if (room.FuraPuncteOwnerIndex >= 0)
            {
                room.Players[room.FuraPuncteOwnerIndex].Score += points;
                scoreChanges.Add(new { name = room.Players[room.FuraPuncteOwnerIndex].Name, delta = points });
            }
            else
            {
                currentPlayer.Score += points;
                scoreChanges.Add(new { name = currentPlayer.Name, delta = points });
            }

            await Clients.Group(room.RoomCode).SendAsync("LetterCorrect",
                letter, matches, points, currentPlayer.Name, scoreChanges);

            var uniqueLetters = room.CurrentSentence.ToUpper()
                .Where(char.IsLetter)
                .Select(c => c.ToString())
                .Distinct()
                .ToHashSet();

            if (uniqueLetters.All(l => room.RevealedLetters.Contains(l)))
            {
                await EndRound(room);
                return;
            }

            if (room.DictatorActive)
            {
                await NextPlayer(room);
            }
            else
            {
                room.SpinAvailable = true;
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("SpinAvailable");
            }
        }
        else
        {
            await Clients.Group(room.RoomCode).SendAsync("LetterWrong", letter, currentPlayer.Name);
            await NextPlayer(room);
        }
    }

    public async Task GuessSentence(string guess)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        var normalized = guess.Trim().ToUpper();
        var expected = room.CurrentSentence.Trim().ToUpper();

        if (normalized == expected)
        {
            await Clients.Group(room.RoomCode).SendAsync("SentenceSolved", currentPlayer.Name, room.CurrentSentence);
            await EndRound(room);
        }
        else
        {
            await Clients.Group(room.RoomCode).SendAsync("SentenceWrong", currentPlayer.Name);
            await NextPlayer(room);
        }
    }

    public async Task ChooseGuessLetter()
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowLetterKeyboard");
    }

    public async Task ChoosePlayCard()
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        if (currentPlayer.Cards.Count == 0)
        {
            await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo", "Nu ai carti de jucat.");
            await NextPlayer(room);
            return;
        }

        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
            "Alege o carte:", currentPlayer.Cards, "PlayCard");
    }

    public async Task PlayCard(int cardIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;
        if (cardIndex < 0 || cardIndex >= currentPlayer.Cards.Count) return;

        var cardName = currentPlayer.Cards[cardIndex];
        currentPlayer.Cards.RemoveAt(cardIndex);
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("HandUpdated", currentPlayer.Cards);
        room.PendingCardEffect = cardName;

        await ProcessCardEffect(room, currentPlayer, cardName);
    }

    // ── SelectTarget: pentru Fura puncte, Bloc, Magnet, Spioneaza ────────────
    public async Task SelectTarget(int targetIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing || room.PendingCardEffect == null) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        var otherPlayers = room.Players.Where(p => p != currentPlayer).ToList();
        if (targetIndex < 0 || targetIndex >= otherPlayers.Count) return;

        var targetPlayer = otherPlayers[targetIndex];
        var targetRealIndex = room.Players.IndexOf(targetPlayer);
        var card = room.PendingCardEffect;
        room.PendingCardEffect = null;

        switch (card)
        {
            case "Fura puncte":
                targetPlayer.ActiveEffects.Add(new Effect { Name = "Fura puncte", OwnerIndex = room.CurrentPlayerIndex });
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", card, currentPlayer.Name, targetPlayer.Name);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    $"Fura puncte activ! In turul urmator al lui {targetPlayer.Name}, punctele sale merg la tine.");
                break;

            case "Bloc":
                targetPlayer.ActiveEffects.Add(new Effect { Name = "Bloc", OwnerIndex = room.CurrentPlayerIndex });
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", card, currentPlayer.Name, targetPlayer.Name);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    $"{targetPlayer.Name} va fi blocat la urmatorul sau tur.");
                break;

            case "Magnet":
                var stolenCards = targetPlayer.Cards.ToList();
                currentPlayer.Cards.AddRange(stolenCards);
                targetPlayer.Cards.Clear();
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("HandUpdated", currentPlayer.Cards);
                await Clients.Client(targetPlayer.ConnectionId).SendAsync("HandUpdated", targetPlayer.Cards);
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", card, currentPlayer.Name, targetPlayer.Name);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    $"Ai furat toate cartile lui {targetPlayer.Name}.");
                break;

            case "Spioneaza":
                var cardList = targetPlayer.Cards.Count > 0
                    ? string.Join(", ", targetPlayer.Cards)
                    : "Nicio carte";
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", card, currentPlayer.Name, targetPlayer.Name);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    $"Cartile lui {targetPlayer.Name}: {cardList}");
                break;
        }

        await NextPlayer(room);
    }

    // ── Protectie: sterge un efect de pe tine ────────────────────────────────
    public async Task SelectEffect(int effectIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        if (effectIndex >= 0 && effectIndex < currentPlayer.ActiveEffects.Count)
            currentPlayer.ActiveEffects.RemoveAt(effectIndex);

        await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", "Protectie", currentPlayer.Name, null);
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo", "Efectul a fost anulat.");
        await NextPlayer(room);
    }

    // ── Anuleaza: alege jucatorul (inclusiv tu) ───────────────────────────────
    public async Task SelectAnulazaTarget(int targetIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        if (targetIndex < 0 || targetIndex >= room.Players.Count) return;

        var targetPlayer = room.Players[targetIndex];
        room.PendingCardTargetIndex = targetIndex;

        if (targetPlayer.ActiveEffects.Count == 0)
        {
            room.PendingCardTargetIndex = null;
            var label = targetIndex == room.CurrentPlayerIndex ? "Tu nu ai" : $"{targetPlayer.Name} nu are";
            await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                $"{label} efecte active.");
            await NextPlayer(room);
            return;
        }

        var effectOptions = targetPlayer.ActiveEffects.Select(e => e.Name).ToList();
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
            $"Anuleaza efect la {targetPlayer.Name}:", effectOptions, "SelectAnulazaEffect");
    }

    public async Task SelectAnulazaEffect(int effectIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing || room.PendingCardTargetIndex == null) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        var targetPlayer = room.Players[room.PendingCardTargetIndex.Value];
        room.PendingCardTargetIndex = null;

        if (effectIndex >= 0 && effectIndex < targetPlayer.ActiveEffects.Count)
            targetPlayer.ActiveEffects.RemoveAt(effectIndex);

        await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", "Anuleaza", currentPlayer.Name, targetPlayer.Name);
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
            $"Efectul lui {targetPlayer.Name} a fost anulat.");
        await NextPlayer(room);
    }

    // ── Super anulare: alege jucator cu efecte, apoi alege efectul ────────────
    public async Task SelectSuperAnulareTarget(int targetIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        var playersWithEffects = room.Players.Where(p => p.ActiveEffects.Count > 0).ToList();
        if (targetIndex < 0 || targetIndex >= playersWithEffects.Count) return;

        var targetPlayer = playersWithEffects[targetIndex];
        room.PendingCardTargetIndex = room.Players.IndexOf(targetPlayer);

        var effectOptions = targetPlayer.ActiveEffects.Select(e => e.Name).ToList();
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
            $"Sterge efect de pe {targetPlayer.Name}:", effectOptions, "SelectSuperAnulareEffect");
    }

    public async Task SelectSuperAnulareEffect(int effectIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing || room.PendingCardTargetIndex == null) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        var targetPlayer = room.Players[room.PendingCardTargetIndex.Value];
        room.PendingCardTargetIndex = null;

        if (effectIndex >= 0 && effectIndex < targetPlayer.ActiveEffects.Count)
            targetPlayer.ActiveEffects.RemoveAt(effectIndex);

        await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", "Super anulare", currentPlayer.Name, targetPlayer.Name);
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
            $"Efectul ales de pe {targetPlayer.Name} a fost sters.");
        await NextPlayer(room);
    }

    // ── Transfer: alege efectul de pe tine, apoi alege jucatorul ─────────────
    public async Task SelectTransferEffectToMove(int effectIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        if (effectIndex < 0 || effectIndex >= currentPlayer.ActiveEffects.Count) return;

        room.PendingCardTargetIndex = effectIndex;

        var otherPlayerNames = room.Players
            .Where(p => p != currentPlayer)
            .Select(p => p.Name)
            .ToList();

        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
            "Transfera efectul la:", otherPlayerNames, "SelectTransferPlayer");
    }

    public async Task SelectTransferPlayer(int playerIndex)
    {
        var room = _roomService.GetRoomByConnectionId(Context.ConnectionId);
        if (room?.Phase != GamePhase.Playing || room.PendingCardTargetIndex == null) return;

        var currentPlayer = room.Players[room.CurrentPlayerIndex];
        if (currentPlayer.ConnectionId != Context.ConnectionId) return;

        var otherPlayers = room.Players.Where(p => p != currentPlayer).ToList();
        if (playerIndex < 0 || playerIndex >= otherPlayers.Count) return;

        var effectIndex = room.PendingCardTargetIndex.Value;
        room.PendingCardTargetIndex = null;

        if (effectIndex >= currentPlayer.ActiveEffects.Count) return;

        var targetPlayer = otherPlayers[playerIndex];
        var effect = currentPlayer.ActiveEffects[effectIndex];
        currentPlayer.ActiveEffects.RemoveAt(effectIndex);
        targetPlayer.ActiveEffects.Add(effect);

        await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", "Transfer", currentPlayer.Name, targetPlayer.Name);
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
            $"Efectul {effect.Name} a fost transferat lui {targetPlayer.Name}.");
        await NextPlayer(room);
    }

    private async Task ProcessCardEffect(GameRoom room, Player currentPlayer, string cardName)
    {
        var otherPlayerNames = room.Players
            .Where(p => p != currentPlayer)
            .Select(p => p.Name)
            .ToList();

        switch (cardName)
        {
            case "Fura puncte":
            case "Bloc":
            case "Magnet":
            case "Spioneaza":
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
                    "Alege jucatorul:", otherPlayerNames, "SelectTarget");
                return;

            case "Anuleaza":
                var allNames = room.Players
                    .Select((p, i) => i == room.CurrentPlayerIndex ? $"{p.Name} (tu)" : p.Name)
                    .ToList();
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
                    "Anuleaza efect al:", allNames, "SelectAnulazaTarget");
                return;

            case "Super anulare":
                var withEffects = room.Players
                    .Where(p => p.ActiveEffects.Count > 0)
                    .Select((p, _) => room.Players.IndexOf(p) == room.CurrentPlayerIndex ? $"{p.Name} (tu)" : p.Name)
                    .ToList();
                if (!withEffects.Any())
                {
                    await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                        "Nimeni nu are efecte active. Tura sarita.");
                    await NextPlayer(room);
                    return;
                }
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
                    "Super anulare - alege jucatorul:", withEffects, "SelectSuperAnulareTarget");
                return;

            case "Transfer":
                if (currentPlayer.ActiveEffects.Count == 0)
                {
                    await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                        "Nu ai efecte active de transferat. Tura sarita.");
                    await NextPlayer(room);
                    return;
                }
                var effectNames = currentPlayer.ActiveEffects.Select(e => e.Name).ToList();
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
                    "Ce efect transferi?", effectNames, "SelectTransferEffectToMove");
                return;

            case "Dublu":
                currentPlayer.ActiveEffects.Add(new Effect { Name = "Dublu" });
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", cardName, currentPlayer.Name, null);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    "Dublu activ! Literele din turul tau urmator valoreaza dublu.");
                break;

            case "Inversare":
                var toReturn = currentPlayer.ActiveEffects
                    .Where(e => e.OwnerIndex.HasValue && e.OwnerIndex != room.CurrentPlayerIndex)
                    .ToList();
                foreach (var effect in toReturn)
                    room.Players[effect.OwnerIndex!.Value].ActiveEffects.Add(
                        new Effect { Name = effect.Name, OwnerIndex = room.CurrentPlayerIndex });
                currentPlayer.ActiveEffects.RemoveAll(e => toReturn.Contains(e));
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", cardName, currentPlayer.Name, null);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    "Efectele primite de la alti jucatori au fost returnate.");
                break;

            case "Arunca":
                foreach (var p in room.Players.Where(p => p != currentPlayer))
                {
                    p.Cards.Clear();
                    await Clients.Client(p.ConnectionId).SendAsync("HandUpdated", p.Cards);
                }
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", cardName, currentPlayer.Name, null);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    "Cartile celorlalti jucatori au fost aruncate!");
                break;

            case "Dictator":
                foreach (var p in room.Players.Where(p => p != currentPlayer))
                    p.ActiveEffects.Add(new Effect { Name = "Dictator", OwnerIndex = room.CurrentPlayerIndex });
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", cardName, currentPlayer.Name, null);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    "Dictator activ! Fiecare jucator ghiceste o singura litera, iar punctele merg la tine.");
                break;

            case "Protectie":
                if (currentPlayer.ActiveEffects.Count == 0)
                {
                    await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                        "Nu ai efecte active pe care sa le anulezi.");
                    await NextPlayer(room);
                    return;
                }
                var protOptions = currentPlayer.ActiveEffects.Select(e => e.Name).ToList();
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowPicker",
                    "Alege efectul de anulat:", protOptions, "SelectEffect");
                return;

            case "Dezvaluie":
                var summary = string.Join("; ", room.Players
                    .Where(p => p != currentPlayer && p.ActiveEffects.Count > 0)
                    .Select(p => $"{p.Name}: {string.Join(", ", p.ActiveEffects.Select(e => e.Name))}"));
                var dezMsg = string.IsNullOrEmpty(summary) ? "Nimeni nu are efecte active." : summary;
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", cardName, currentPlayer.Name, null);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo", dezMsg);
                break;

            case "Radar":
                var radarCards = (await _cardService.GetCardNamesAsync()).ToArray();
                var nextIdx = (room.CurrentPlayerIndex + 1) % room.Players.Count;
                var predictedIdx = _random.Next(radarCards.Length);
                room.PredictedCard = new PredictedCardInfo { ForPlayerIndex = nextIdx, CardIndex = predictedIdx };
                await Clients.Group(room.RoomCode).SendAsync("CardPlayedPublic", cardName, currentPlayer.Name, null);
                await Clients.Client(currentPlayer.ConnectionId).SendAsync("ShowInfo",
                    $"Urmatorul jucator va primi: {radarCards[predictedIdx]}");
                break;
        }

        await NextPlayer(room);
    }

    private async Task EndRound(GameRoom room)
    {
        if (room.CurrentRound >= room.TotalRounds)
        {
            room.Phase = GamePhase.Finished;
            var scores = room.Players
                .OrderByDescending(p => p.Score)
                .Select(p => new { name = p.Name, score = p.Score })
                .ToList();
            await Clients.Group(room.RoomCode).SendAsync("GameFinished", scores);
            return;
        }

        room.CurrentRound++;
        room.RevealedLetters.Clear();
        room.SpinAvailable = false;
        room.DoubloActive = false;
        room.FuraPuncteOwnerIndex = -1;
        room.DictatorActive = false;
        room.DictatorOwnerIndex = -1;
        room.PendingCardEffect = null;
        room.PendingCardTargetIndex = null;
        room.CurrentPlayerIndex = 0;

        var sentence = await _groqService.GetSentence();
        room.CurrentSentence = sentence;

        await Clients.Group(room.RoomCode).SendAsync("RoundStarted", room.CurrentRound, sentence);
        await StartTurn(room);
    }

    private async Task NextPlayer(GameRoom room)
    {
        room.DoubloActive = false;
        room.FuraPuncteOwnerIndex = -1;
        room.DictatorActive = false;
        room.DictatorOwnerIndex = -1;
        room.SpinAvailable = false;
        room.PendingCardEffect = null;
        room.CurrentPlayerIndex = (room.CurrentPlayerIndex + 1) % room.Players.Count;
        await StartTurn(room);
    }

    private async Task StartTurn(GameRoom room)
    {
        var currentPlayer = room.Players[room.CurrentPlayerIndex];

        var blocEffect = currentPlayer.ActiveEffects.FirstOrDefault(e => e.Name == "Bloc");
        if (blocEffect != null)
        {
            currentPlayer.ActiveEffects.Remove(blocEffect);
            await Clients.Group(room.RoomCode).SendAsync("PlayerBlocked", currentPlayer.Name);
            room.CurrentPlayerIndex = (room.CurrentPlayerIndex + 1) % room.Players.Count;
            await StartTurn(room);
            return;
        }

        var dubluEffect = currentPlayer.ActiveEffects.FirstOrDefault(e => e.Name == "Dublu");
        if (dubluEffect != null)
        {
            currentPlayer.ActiveEffects.Remove(dubluEffect);
            room.DoubloActive = true;
        }

        var furaPuncteEffect = currentPlayer.ActiveEffects.FirstOrDefault(e => e.Name == "Fura puncte");
        if (furaPuncteEffect != null)
        {
            currentPlayer.ActiveEffects.Remove(furaPuncteEffect);
            room.FuraPuncteOwnerIndex = furaPuncteEffect.OwnerIndex ?? -1;
        }

        var dictatorEffect = currentPlayer.ActiveEffects.FirstOrDefault(e => e.Name == "Dictator");
        if (dictatorEffect != null)
        {
            currentPlayer.ActiveEffects.Remove(dictatorEffect);
            room.DictatorActive = true;
            room.DictatorOwnerIndex = dictatorEffect.OwnerIndex ?? 0;
        }

        await Clients.Group(room.RoomCode).SendAsync("TurnStarted", currentPlayer.Name);
        await Clients.Client(currentPlayer.ConnectionId).SendAsync("YourTurn", !room.DictatorActive);
    }

    private async Task StartNextDiceRoll(GameRoom room)
    {
        var playerIndex = room.DiceRollOrder[room.CurrentDiceRollerIndex];
        var player = room.Players[playerIndex];
        await Clients.Group(room.RoomCode).SendAsync("NextDiceRoller", player.Name);
        await Clients.Client(player.ConnectionId).SendAsync("YourTurnToDice");
    }

    private static List<int> FindTiedPlayers(List<DiceResult> sorted)
    {
        var tied = new HashSet<int>();
        for (int i = 1; i < sorted.Count; i++)
        {
            var curr = sorted[i];
            var prev = sorted[i - 1];
            if (curr.Sum == prev.Sum && curr.IsDouble == prev.IsDouble && curr.MaxDice == prev.MaxDice)
            {
                tied.Add(curr.PlayerIndex);
                tied.Add(prev.PlayerIndex);
            }
        }
        return [.. tied];
    }
}
