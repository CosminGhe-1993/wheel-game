import { game, Player, saveGame, loadGame } from "./game.js"
import { createDiceScreen, cards } from "./ui.js"

loadGame();

let totalRounds = 0;
document.getElementById("input-num-players").addEventListener("input", checkSetup);
document.getElementById("input-num-rounds").addEventListener("input", checkSetup);

function checkSetup() {
    const players = parseInt(document.getElementById("input-num-players").value);
    const rounds = parseInt(document.getElementById("input-num-rounds").value);



    if(!isNaN(players) && players >= 2 && players <= 6 && !isNaN(rounds) && rounds > 0)
    {
        totalRounds = rounds;
        if(!document.getElementById("btn-continue")) 
        {
            const btn = document.createElement("button");
            btn.textContent = "Continua";
            btn.id = "btn-continue";
            document.getElementById("start-screen").appendChild(btn);
        }
    }
}

document.getElementById("start-screen").addEventListener("click", (e) =>{
    if(e.target.id === "btn-continue")
    {
        const playersNumber = parseInt(document.getElementById("input-num-players").value);
        const roundsNumber = parseInt(document.getElementById("input-num-rounds").value);
        
        const info = document.createElement("p");
        info.textContent = `Numar jucatori: ${playersNumber} | Numar runde: ${roundsNumber}`;
        document.getElementById("start-screen").insertBefore(info, document.getElementById("players-input"));

        for(let i = 1; i <= playersNumber; i++)
        {
            const input = document.createElement("input");
            input.type = "text";
            input.id = `input-player-${i}`;
            input.placeholder = `Nume jucator ${i}`;
            document.getElementById("players-input").appendChild(input);
        }
        
        document.getElementById("input-num-players").disabled = true;
        document.getElementById("input-num-rounds").disabled = true;

        document.getElementById("input-num-players").remove();
        document.getElementById("input-num-rounds").remove();
        e.target.remove();
    }
});

document.getElementById("players-input").addEventListener("input", checkPlayersNames);

function checkPlayersNames() {
    const playersInputs = document.querySelectorAll("#players-input input");
    const inputsOk = playersInputs.length > 0 && Array.from(playersInputs).every(input => input.value.trim() !== "" && /^[a-zA-Z\s]+$/.test(input.value.trim()));

    if(inputsOk)
    {
        if(!document.getElementById("btn-start-game"))
        {
            const btn = document.createElement("button");
            btn.textContent = "Start joc";
            btn.id = "btn-start-game";
            document.getElementById("players-input").appendChild(btn);
        }
    }
    else
    {
        if(document.getElementById("btn-start-game"))
        {
            document.getElementById("btn-start-game").remove();
        }
    }
}

document.getElementById("players-input").addEventListener("click", (e) => {
    if(e.target.id === "btn-start-game")
    {
        const playersInputs = document.querySelectorAll("#players-input input");
        game.totalRounds = totalRounds;
        game.players = [];
        game.currentRound = 0;
        game.currentPlayerIndex = 0;
        game.order = [];
        for(let i = 0; i < playersInputs.length; i++)
        {
            
            game.players.push(new Player(playersInputs[i].value.trim()));
            for(let j = 0; j < 5; j++)
            {
                const randomIndex = Math.floor(Math.random() * cards.length);
                game.players[i].cards.push(cards[randomIndex]);
            }
        }
        saveGame();
        if(!document.getElementById("game-screen"))
        {
            const gameScreenDiv = document.createElement("div");
            gameScreenDiv.id = "game-screen";          
            document.body.appendChild(gameScreenDiv);
            createDiceScreen();
            document.getElementById("start-screen").style.display = "none";
        }
        
    }
})