namespace WheelApi.Models;

public class GameRoom
{
    public string RoomCode { get; set; } = string.Empty;
    public int MaxPlayers { get; set; }
    public int TotalRounds { get; set; }
    public int CurrentRound { get; set; } = 0;
    public int CurrentPlayerIndex { get; set; } = 0;
    public string DisplayConnectionId { get; set; } = string.Empty;
    public List<Player> Players { get; set; } = new();
    public string CurrentSentence { get; set; } = string.Empty;
    public GamePhase Phase { get; set; } = GamePhase.Waiting;

    public bool SpinAvailable { get; set; } = false;
    public bool DoubloActive { get; set; } = false;
    public int FuraPuncteOwnerIndex { get; set; } = -1;
    public bool DictatorActive { get; set; } = false;
    public int DictatorOwnerIndex { get; set; } = -1;
    public string? PendingCardEffect { get; set; }
    public int? PendingCardTargetIndex { get; set; }
    public PredictedCardInfo? PredictedCard { get; set; }
    public List<string> RevealedLetters { get; set; } = [];
    public List<DiceResult> DiceResults { get; set; } = [];
    public List<int> DiceRollOrder { get; set; } = [];
    public int CurrentDiceRollerIndex { get; set; } = 0;
}
