import { getSentence } from "./api.js"
import { game, saveGame } from "./game.js"
import { playFuraPuncte, playDublu, playBloc, playAnuleaza, playDezvaluie, playSuperAnulare, playInversare, playTransfer, playProtectie, playArunca, playSpioneaza, playDictator, playRadar, playMagnet } from "./cards.js"
export const cards = [
    "Fura puncte", "Dublu", "Bloc", "Anuleaza", "Dezvaluie",
    "Super anulare", "Inversare", "Transfer", "Protectie",
    "Arunca", "Spioneaza", "Dictator", "Radar", "Magnet"
];

export async function createGameScreen(){
    const sentence = await getSentence() 
    const half = Math.ceil(game.players.length / 2);
    game.currentSentence = sentence;
    saveGame();
    const roundDiv = document.createElement("div");
    roundDiv.id = "round-indicator";
    roundDiv.textContent = `Runda ${game.currentRound + 1} / ${game.totalRounds}`;
    
    const sentenceScreenDiv = document.createElement("div");
    sentenceScreenDiv.id="sentence-screen";
    const words = sentence.split(" ");
    words.forEach((word, index) => {
        const wordDiv = document.createElement("div");
        wordDiv.className = "word-cell";

        for(let i = 0; i < word.length; i++) {
            const charDiv = document.createElement("div");
            charDiv.className = "letter-cell";
            charDiv.dataset.letter = word[i].toUpperCase();
            wordDiv.appendChild(charDiv);
        }
        sentenceScreenDiv.appendChild(wordDiv);

        if(index < words.length - 1) {
            const spaceDiv = document.createElement("div");
            spaceDiv.className = "space-cell";
            sentenceScreenDiv.appendChild(spaceDiv);
        }
    });

    const middleScreenDiv = document.createElement("div");
    middleScreenDiv.id = "middle-screen"
    
    const leftPlayersScreenDiv = document.createElement("div");
    leftPlayersScreenDiv.id = "left-players-screen";
    middleScreenDiv.appendChild(leftPlayersScreenDiv);

    const wheelScreenDiv = document.createElement("div");
    wheelScreenDiv.id = "wheel-screen";
    const wheelDiv = document.createElement("div");
    wheelDiv.id = "wheel";
    wheelScreenDiv.appendChild(wheelDiv);
    const wheelSpinningPlayerP = document.createElement("button");
    wheelSpinningPlayerP.id = "wheel-spinning-player";
    wheelSpinningPlayerP.textContent = `${game.players[game.currentPlayerIndex].name} invarte`;
    wheelSpinningPlayerP.type = "button";
    wheelSpinningPlayerP.style.pointerEvents = "none";
    wheelScreenDiv.appendChild(wheelSpinningPlayerP);
    middleScreenDiv.appendChild(wheelScreenDiv);

    const rightPlayersScreenDiv = document.createElement("div");
    rightPlayersScreenDiv.id = "right-players-screen";
    middleScreenDiv.appendChild(rightPlayersScreenDiv);

    game.players.forEach((player, index) => {
        const card = document.createElement("div");
        card.className = "player-card";
        card.id = `player-card-${index}`;

        const nameP = document.createElement("p");
        nameP.textContent = player.name;

        const scoreP = document.createElement("p");
        scoreP.className = "player-score";
        scoreP.textContent = player.score;

        card.appendChild(nameP);
        card.appendChild(scoreP);

        if(index < half)
        {
            leftPlayersScreenDiv.appendChild(card);
        }
        else
        {
            rightPlayersScreenDiv.appendChild(card);
        }
    });

    const lettersScreenDiv = document.createElement("div");
    lettersScreenDiv.id = "letters-screen";
    for(let i = 65; i <= 90; i++) {
        const btn = document.createElement("button");
        btn.textContent = String.fromCharCode(i);
        lettersScreenDiv.appendChild(btn);
    }

    lettersScreenDiv.addEventListener("click", (e) => 
    {
        if(e.target.id === "guess-sentence") 
        {
            return;
        }

        if(e.target.id === "confirm-sentence") 
        {
            return;
        }

        if(e.target.tagName === "BUTTON")
        {
            const letter = e.target.textContent;
            const cells = document.querySelectorAll(`.letter-cell[data-letter="${letter}"]`);
            cells.forEach(cell => cell.textContent = letter);
            if(cells.length > 0) 
            {
                const points = game.doubloActive ? cells.length * 2 : cells.length;
                if(game.dictatorActive) {
                    game.players[game.dictatorOwnerIndex].score += points;
                    const dictatorScoreEl = document.querySelector(`#player-card-${game.dictatorOwnerIndex} .player-score`);
                    dictatorScoreEl.textContent = game.players[game.dictatorOwnerIndex].score;
                } 
                else {
                    game.players[game.currentPlayerIndex].score += points;
                    const scoreEl = document.querySelector(`#player-card-${game.currentPlayerIndex} .player-score`);
                    scoreEl.textContent = game.players[game.currentPlayerIndex].score;
                }
                
                if(game.furaPuncteTargetIndex !== -1) {
                    game.players[game.furaPuncteTargetIndex].score -= points;
                    const targetScoreEl = document.querySelector(`#player-card-${game.furaPuncteTargetIndex} .player-score`);
                    targetScoreEl.textContent = game.players[game.furaPuncteTargetIndex].score;
                }
                if(!document.getElementById("spin-wheel"))
                {
                    const spinWheelBtn = document.createElement("button");
                    spinWheelBtn.id = "spin-wheel";
                    spinWheelBtn.textContent = "Invarte";
                    wheelScreenDiv.appendChild(spinWheelBtn);
                    spinWheelBtn.addEventListener("click", (e) => {
                        const angle = Math.floor(Math.random() * 360) + 1440;
                        wheelDiv.style.transform = `rotate(${angle}deg)`;
                        spinWheelBtn.disabled = true;
                        setTimeout(() => {
                            const finalAngle = angle % 360;
                            let cardIndex = Math.floor(finalAngle / (360 / 14));
                            if (game.predictedCard !== null && game.predictedCard.forPlayerIndex === game.currentPlayerIndex) 
                            {
                                cardIndex = game.predictedCard.cardIndex;
                                game.predictedCard = null;
                            }
                            game.players[game.currentPlayerIndex].cards.push(cards[cardIndex]);
                            
                            const newCardP = document.createElement("p")
                            newCardP.id = "new-card";
                            newCardP.textContent = cards[cardIndex];
                            wheelScreenDiv.appendChild(newCardP);

                            const playCardBtn = document.createElement("button");
                            playCardBtn.id = "play-card";
                            playCardBtn.textContent = "Joaca cartea";
                            wheelScreenDiv.appendChild(playCardBtn);
                            
                            function cleanup(){
                                game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
                                document.querySelectorAll(".player-card").forEach(c => c.classList.remove("active-player"));
                                document.getElementById(`player-card-${game.currentPlayerIndex}`).classList.add("active-player");
                                wheelSpinningPlayerP.textContent = `${game.players[game.currentPlayerIndex].name} invarte`;
                                newCardP.remove();
                                playCardBtn.remove();
                                document.getElementById("guess-new-letter")?.remove();
                                spinWheelBtn.remove();
                                saveGame();
                                startTurn();
                            }

                            playCardBtn.addEventListener("click", () => {
                                playCardBtn.disabled = true;
                                const hand = game.players[game.currentPlayerIndex].cards;
                                const handPicker = document.createElement("div");
                                handPicker.id = "picker";
                                wheelScreenDiv.appendChild(handPicker);
                                for(let h = 0; h < hand.length; h++) {
                                    const cardBtn = document.createElement("button");
                                    cardBtn.textContent = hand[h];
                                    handPicker.appendChild(cardBtn);
                                    cardBtn.addEventListener("click", () => {
                                        const selected = hand[h];
                                        game.players[game.currentPlayerIndex].cards.splice(h, 1);
                                        handPicker.remove();
                                        if(selected === "Fura puncte") playFuraPuncte(wheelScreenDiv, cleanup);
                                        else if(selected === "Dublu") playDublu(wheelScreenDiv, cleanup);
                                        else if(selected === "Bloc") playBloc(wheelScreenDiv, cleanup);
                                        else if(selected === "Anuleaza") playAnuleaza(wheelScreenDiv, cleanup);
                                        else if(selected === "Dezvaluie") playDezvaluie(wheelScreenDiv, cleanup);
                                        else if(selected === "Super anulare") playSuperAnulare(wheelScreenDiv, cleanup);
                                        else if(selected === "Inversare") playInversare(wheelScreenDiv, cleanup);
                                        else if(selected === "Transfer") playTransfer(wheelScreenDiv, cleanup);
                                        else if(selected === "Protectie") playProtectie(wheelScreenDiv, cleanup);
                                        else if(selected === "Arunca") playArunca(wheelScreenDiv, cleanup);
                                        else if(selected === "Spioneaza") playSpioneaza(wheelScreenDiv, cleanup);
                                        else if(selected === "Dictator") playDictator(wheelScreenDiv, cleanup);
                                        else if(selected === "Radar") playRadar(wheelScreenDiv, cards, cleanup);
                                        else if(selected === "Magnet") playMagnet(wheelScreenDiv, cleanup);
                                    });
                                }
                            });

                            
                            if(!game.dictatorActive) {
                                const guessNewLetterBtn = document.createElement("button");
                                guessNewLetterBtn.id = "guess-new-letter";
                                guessNewLetterBtn.textContent = "Ghiceste o litera";
                                wheelScreenDiv.appendChild(guessNewLetterBtn);
                                guessNewLetterBtn.addEventListener("click", () => {
                                    newCardP.remove();
                                    playCardBtn.remove();
                                    guessNewLetterBtn.remove();
                                    spinWheelBtn.remove();
                                    saveGame();
                                });
                            }
                        }, 4000);


                    });
                }
                saveGame();
            }
            else
            {
                document.getElementById("spin-wheel")?.remove();
                document.getElementById("new-card")?.remove();
                document.getElementById("play-card")?.remove();
                document.getElementById("guess-new-letter")?.remove();
                document.getElementById("picker")?.remove();
                game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
                document.querySelectorAll(".player-card").forEach(c => c.classList.remove("active-player"));
                document.getElementById(`player-card-${game.currentPlayerIndex}`).classList.add("active-player");
                wheelSpinningPlayerP.textContent = `${game.players[game.currentPlayerIndex].name} invarte`;
                saveGame();
                startTurn();
            }
            const allRevealed = Array.from(document.querySelectorAll(".letter-cell")).every(cell => cell.textContent !== "");
            if(allRevealed) 
            {
                game.players[game.currentPlayerIndex].score += 5;
                const scoreEl = document.querySelector(`#player-card-${game.currentPlayerIndex} .player-score`);
                scoreEl.textContent = game.players[game.currentPlayerIndex].score;
                saveGame();
                game.currentRound++;
                if(game.currentRound >= game.totalRounds)
                {
                    showFinalScreen()
                }
                else
                {
                    document.getElementById("game-screen").innerHTML = "";
                    createDiceScreen();
                }
            }
            e.target.disabled = true;
        }
    });

    const guessSentenceButton = document.createElement("button");
    guessSentenceButton.id = "guess-sentence";
    guessSentenceButton.textContent = "Propozitie gasita";
    lettersScreenDiv.appendChild(guessSentenceButton);

    guessSentenceButton.addEventListener("click", (e) => {
        if(e.target.id === "guess-sentence") 
        {
            guessSentenceButton.disabled = true
            const guessAreaDiv = document.createElement("div");
            guessAreaDiv.id = "guess-area";

            const completeSentence = document.createElement("input");
            completeSentence.id = "complete-sentence";
            completeSentence.type = "text";
            completeSentence.placeholder = "Propozitia completa";
            guessAreaDiv.appendChild(completeSentence);
            
            const confirmSentenceButton = document.createElement("button");
            confirmSentenceButton.id = "confirm-sentence";
            confirmSentenceButton.textContent = "confirma";
            guessAreaDiv.appendChild(confirmSentenceButton);
            
             confirmSentenceButton.addEventListener("click", (e) => {
                if(e.target.id === "confirm-sentence")
                {
                    if(completeSentence.value.toLowerCase() === game.currentSentence.toLowerCase())
                    {
                        game.players[game.currentPlayerIndex].score += 5;
                        const scoreEl = document.querySelector(`#player-card-${game.currentPlayerIndex} .player-score`);
                        scoreEl.textContent = game.players[game.currentPlayerIndex].score;
                        saveGame();

                        document.querySelectorAll(".letter-cell").forEach(cell => cell.textContent = cell.dataset.letter)

                        game.currentRound++;
                        saveGame();
                        if(game.currentRound >= game.totalRounds)
                        {
                            showFinalScreen()
                        }
                        else
                        {
                            document.getElementById("game-screen").innerHTML = "";
                            createDiceScreen();
                        }
                    
                    }
                    else
                    {
                        game.players[game.currentPlayerIndex].score--;
                        const scoreEl = document.querySelector(`#player-card-${game.currentPlayerIndex} .player-score`);
                        scoreEl.textContent = game.players[game.currentPlayerIndex].score;

                        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;

                        document.querySelectorAll(".player-card").forEach(c => c.classList.remove("active-player"));
                        document.getElementById(`player-card-${game.currentPlayerIndex}`).classList.add("active-player");
                        saveGame();

                        document.getElementById("guess-area").remove();
                        guessSentenceButton.disabled = false;
                    }
                }
            });

            lettersScreenDiv.appendChild(guessAreaDiv);
        }
    });

   

    const gameScreenDiv = document.getElementById("game-screen");
    gameScreenDiv.appendChild(roundDiv)
    gameScreenDiv.appendChild(sentenceScreenDiv);
    gameScreenDiv.appendChild(middleScreenDiv);
    gameScreenDiv.appendChild(lettersScreenDiv);
    document.getElementById("player-card-0").classList.add("active-player");
}

export function showFinalScreen(){
    game.players.sort((a, b) => b.score !== a.score ? b.score - a.score : b.correctLetters - a.correctLetters);
    const finalScoreScreenDiv = document.createElement("div");
    finalScoreScreenDiv.id = "final-score-screen";
    
    const finalHeader = document.createElement("h1");
    finalHeader.textContent = "Clasament final";
    finalScoreScreenDiv.appendChild(finalHeader);

    const podiumScreenDiv = document.createElement("div");
    podiumScreenDiv.id = "podium-screen";

    //#region podium first place
    const firstPlaceDiv = document.createElement("div");
    firstPlaceDiv.id = "first-place";

    const firstPlaceInfoDiv = document.createElement("div");
    firstPlaceInfoDiv.id = "first-place-info";
    
    const firstPlaceNameP = document.createElement("p");
    firstPlaceNameP.id = "first-place-name";
    firstPlaceNameP.textContent = game.players[0].name;
    
    const firstPlaceScoreP = document.createElement("p");
    firstPlaceScoreP.id = "first-place-score";
    firstPlaceScoreP.textContent = game.players[0].score;
    
    firstPlaceInfoDiv.appendChild(firstPlaceNameP);
    firstPlaceInfoDiv.appendChild(firstPlaceScoreP);

    const firstPlaceStepDiv = document.createElement("div");
    firstPlaceStepDiv.id = "first-place-step";

    firstPlaceDiv.appendChild(firstPlaceInfoDiv);
    firstPlaceDiv.appendChild(firstPlaceStepDiv);
    //#endregion

    //#region podium second place
    const secondPlaceDiv = document.createElement("div");
    secondPlaceDiv.id = "second-place";

    const secondPlaceInfoDiv = document.createElement("div");
    secondPlaceInfoDiv.id = "second-place-info";

    const secondPlaceNameP = document.createElement("p");
    secondPlaceNameP.id = "second-place-name";
    secondPlaceNameP.textContent = game.players[1].name;

    const secondPlaceScoreP = document.createElement("p");
    secondPlaceScoreP.id = "second-place-score";
    secondPlaceScoreP.textContent = game.players[1].score;

    secondPlaceInfoDiv.appendChild(secondPlaceNameP);
    secondPlaceInfoDiv.appendChild(secondPlaceScoreP);

    const secondPlaceStepDiv = document.createElement("div");
    secondPlaceStepDiv.id = "second-place-step";

    secondPlaceDiv.appendChild(secondPlaceInfoDiv);
    secondPlaceDiv.appendChild(secondPlaceStepDiv);
    //#endregion
    
    podiumScreenDiv.appendChild(secondPlaceDiv);
    podiumScreenDiv.appendChild(firstPlaceDiv);
    
    //#region podium third place
    if(game.players.length >= 3)
    {
        const thirdPlaceDiv = document.createElement("div");
        thirdPlaceDiv.id = "third-place";

        const thirdPlaceInfoDiv = document.createElement("div");
        thirdPlaceInfoDiv.id = "third-place-info";

        const thirdPlaceNameP = document.createElement("p");
        thirdPlaceNameP.id = "third-place-name";
        thirdPlaceNameP.textContent = game.players[2].name;

        const thirdPlaceScoreP = document.createElement("p");
        thirdPlaceScoreP.id = "third-place-score";
        thirdPlaceScoreP.textContent = game.players[2].score;

        thirdPlaceInfoDiv.appendChild(thirdPlaceNameP);
        thirdPlaceInfoDiv.appendChild(thirdPlaceScoreP);

        const thirdPlaceStepDiv = document.createElement("div");
        thirdPlaceStepDiv.id = "third-place-step";

        thirdPlaceDiv.appendChild(thirdPlaceInfoDiv);
        thirdPlaceDiv.appendChild(thirdPlaceStepDiv);
        podiumScreenDiv.appendChild(thirdPlaceDiv);
    }
    //#endregion

    finalScoreScreenDiv.appendChild(podiumScreenDiv);
    document.body.appendChild(finalScoreScreenDiv);
    document.getElementById("game-screen").style.display = "none";
}

function getDots(value) {
    return Array(value).fill('<span class="dot"></span>').join('');
}

export function createDiceScreen(){
    let currentRollingIndex = 0;
    let diceResults = [];
    let rollOrder = game.players.map((_, i) => i);

    const diceScreenDiv = document.createElement("div");
    diceScreenDiv.id = "dice-screen";

    const diceDiv = document.createElement("div");
    diceDiv.id = "dices";
    diceScreenDiv.appendChild(diceDiv);

    const dice1Div = document.createElement("div");
    dice1Div.id = "dice1";
    dice1Div.className = "dice dice-1";
    diceDiv.appendChild(dice1Div);

    const dice2Div = document.createElement("div");
    dice2Div.id = "dice2";
    dice2Div.className = "dice dice-1";
    diceDiv.appendChild(dice2Div);

    const currentPlayerThrowingP = document.createElement("p");
    currentPlayerThrowingP.id = "throwing-player";
    currentPlayerThrowingP.textContent = game.players[0].name;
    diceScreenDiv.appendChild(currentPlayerThrowingP);

    const throwDiceButton = document.createElement("button");
    throwDiceButton.id = "throw-dice";
    throwDiceButton.textContent = "Arunca";
    diceScreenDiv.appendChild(throwDiceButton);

    throwDiceButton.addEventListener("click", (e) => {
        const playerIndex = rollOrder[currentRollingIndex];
        currentPlayerThrowingP.textContent = game.players[playerIndex].name;

        const diceValue1 = Math.floor(Math.random() * 6) + 1;
        const diceValue2 = Math.floor(Math.random() * 6) + 1;
        dice1Div.className = `dice dice-${diceValue1}`;
        dice2Div.className = `dice dice-${diceValue2}`;
        dice1Div.innerHTML = getDots(diceValue1);
        dice2Div.innerHTML = getDots(diceValue2);

        diceResults.push({ playerIndex, diceValue1, diceValue2, sum: diceValue1 + diceValue2, isDouble: diceValue1 === diceValue2, maxDice: Math.max(diceValue1, diceValue2) });
        currentRollingIndex++;

        if(currentRollingIndex === rollOrder.length) {
            diceResults.sort((a, b) => {
                if(b.sum !== a.sum) return b.sum - a.sum;
                if(a.isDouble !== b.isDouble) return a.isDouble ? -1 : 1;
                return b.maxDice - a.maxDice;
            });

            const tiedIndices = findTiedPlayers(diceResults);

            if(tiedIndices.length > 0) {
                diceResults = diceResults.filter(r => !tiedIndices.includes(r.playerIndex));
                rollOrder = tiedIndices;
                currentRollingIndex = 0;

                document.getElementById("tie-msg")?.remove();
                const tieMsg = document.createElement("p");
                tieMsg.id = "tie-msg";
                tieMsg.textContent = `Egalitate! ${tiedIndices.map(i => game.players[i].name).join(" si ")} arunca din nou.`;
                diceScreenDiv.appendChild(tieMsg);

                currentPlayerThrowingP.textContent = game.players[rollOrder[0]].name;
            } else {
                game.order = diceResults.map(result => result.playerIndex);
                game.players = game.order.map(idx => game.players[idx]);

                document.getElementById("tie-msg")?.remove();

                const orderP = document.createElement("p");
                orderP.id = "order-p";
                orderP.textContent = game.players.map((player, pos) => `${pos+1}. ${player.name}`).join(", ");
                diceScreenDiv.appendChild(orderP);

                const continueToGameButton = document.createElement("button");
                continueToGameButton.id = "continue-to-game";
                continueToGameButton.textContent = "Continua";
                continueToGameButton.addEventListener("click", (e) => {
                    document.getElementById("dice-screen").remove();
                    game.currentPlayerIndex = 0;
                    createGameScreen();
                });
                diceScreenDiv.appendChild(continueToGameButton);
                throwDiceButton.disabled = true;
            }
        }
    });

    document.body.appendChild(diceScreenDiv);
}

function findTiedPlayers(sortedResults) {
    const tied = new Set();
    for(let i = 1; i < sortedResults.length; i++) {
        const curr = sortedResults[i];
        const prev = sortedResults[i - 1];
        if(curr.sum === prev.sum && curr.isDouble === prev.isDouble && curr.maxDice === prev.maxDice) {
            tied.add(curr.playerIndex);
            tied.add(prev.playerIndex);
        }
    }
    return [...tied];
}

function startTurn() {
    game.doubloActive = false;
    game.furaPuncteTargetIndex = -1;
    game.dictatorActive = false;
    game.dictatorOwnerIndex = -1;
    
    const currentPlayer = game.players[game.currentPlayerIndex];

    const blocIndex = currentPlayer.activeEffects.findIndex(e => e.name === "Bloc");
    if(blocIndex !== -1) {
        currentPlayer.activeEffects.splice(blocIndex, 1);
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
        document.querySelectorAll(".player-card").forEach(c => c.classList.remove("active-player"));
        document.getElementById(`player-card-${game.currentPlayerIndex}`).classList.add("active-player");
        const spinningLabel = document.getElementById("wheel-spinning-player");
        if(spinningLabel) spinningLabel.textContent = `${game.players[game.currentPlayerIndex].name} invarte`;
        saveGame();
        startTurn();
        return;
    }

    const dubluIndex = currentPlayer.activeEffects.findIndex(e => e.name === "Dublu");
    if(dubluIndex !== -1) {
        currentPlayer.activeEffects.splice(dubluIndex, 1);
        game.doubloActive = true;
    }

    const furaPuncteEffect = currentPlayer.activeEffects.find(e => e.name === "Fura puncte");
    if(furaPuncteEffect) {
        const furaPuncteIndex = currentPlayer.activeEffects.indexOf(furaPuncteEffect);
        currentPlayer.activeEffects.splice(furaPuncteIndex, 1);
        game.furaPuncteTargetIndex = furaPuncteEffect.targetIndex;
    }

    const dictatorEffect = currentPlayer.activeEffects.find(e => e.name === "Dictator");
    if(dictatorEffect) {
        currentPlayer.activeEffects.splice(currentPlayer.activeEffects.indexOf(dictatorEffect), 1);
        game.dictatorActive = true;
        game.dictatorOwnerIndex = dictatorEffect.ownerIndex;
    }
}