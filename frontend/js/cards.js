import { game, saveGame } from "./game.js"
import { cards } from "./ui.js"

export function playFuraPuncte(wheelScreenDiv, cleanup){

    const picker = createPicker(wheelScreenDiv);

    for(let i = 0; i < game.players.length; i++)
    {
        if(i === game.currentPlayerIndex) 
        {
            continue;
        }

        const player = createPlayerBtn(i, picker);
        
        player.addEventListener("click", (e) => {
            game.players[game.currentPlayerIndex].activeEffects.push({ name: "Fura puncte", targetIndex: i });
            picker.remove();
            showInfo(wheelScreenDiv, `Fura puncte activ! In turul tau urmator vei fura punctele lui ${game.players[i].name}.`, cleanup);
        });
    }
}

export function playDublu(wheelScreenDiv, cleanup){
    game.players[game.currentPlayerIndex].activeEffects.push({name: "Dublu"});
    showInfo(wheelScreenDiv, "Dublu activ! Literele din turul tau urmator valoreaza dublu.", cleanup);
}

export function playBloc(wheelScreenDiv, cleanup){
    const picker = createPicker(wheelScreenDiv);

    for(let i = 0; i < game.players.length; i++)
    {
        if(i === game.currentPlayerIndex) 
        {
            continue;
        }

        const player = createPlayerBtn(i, picker);
        
        player.addEventListener("click", (e) => {
            game.players[i].activeEffects.push({ name: "Bloc", ownerIndex: game.currentPlayerIndex });
            picker.remove();
            cleanup();
        });
    }
}

export function playAnuleaza(wheelScreenDiv, cleanup){
    const picker = createPicker(wheelScreenDiv);

    for(let i = 0; i < game.players.length; i++)
    {
        const player = createPlayerBtn(i, picker);

        if(game.players[i].activeEffects.length === 0)
        {
            player.disabled = true;
        }

        player.addEventListener("click", (e) => {
            const effectsPickerDiv = document.createElement("div");
            effectsPickerDiv.id = "effects-picker";
            wheelScreenDiv.appendChild(effectsPickerDiv);
            for(let j = 0; j < game.players[i].activeEffects.length; j++){
                const effectBtn = document.createElement("button");
                effectBtn.id = `effect-btn-${game.players[i].activeEffects[j].name}`;
                effectBtn.textContent = game.players[i].activeEffects[j].name;
                effectsPickerDiv.appendChild(effectBtn);

                effectBtn.addEventListener("click", (e) => {
                    game.players[i].activeEffects.splice(j, 1);
                    picker.remove();
                    effectsPickerDiv.remove();
                    cleanup();
                });
            }
        });
    }
}

export function playDezvaluie(wheelScreenDiv, cleanup){
    const infoDiv = document.createElement("div");
    infoDiv.id = "info";
    wheelScreenDiv.appendChild(infoDiv);
    for(let i = 0; i < game.players.length; i++){
        if(i === game.currentPlayerIndex) 
        {
            continue;
        }

        const playerNameP = createP(`player-name-${i}`, game.players[i].name, infoDiv)

        for(let j = 0; j < game.players[i].activeEffects.length; j++){
            const effectNameP = createP(`effect-name-${i}-${j}`, game.players[i].activeEffects[j].name, infoDiv);
        }
    }

    const okBtn = document.createElement("button");
    okBtn.id = "ok-btn";
    okBtn.textContent = "OK";
    infoDiv.appendChild(okBtn);

    okBtn.addEventListener("click", (e) => {
        infoDiv.remove();
        cleanup();
    });
}

export function playSuperAnulare(wheelScreenDiv, cleanup)
{
    const optionsDiv = document.createElement("div");
    optionsDiv.id = "options";
    wheelScreenDiv.appendChild(optionsDiv);

    const removeAllCardsOnMeBtn = document.createElement("button");
    removeAllCardsOnMeBtn.id = "remove-all-cards-on-me";
    removeAllCardsOnMeBtn.textContent = "Sterge toate de pe mine";
    optionsDiv.appendChild(removeAllCardsOnMeBtn);

    removeAllCardsOnMeBtn.addEventListener("click", (e) => {
        game.players[game.currentPlayerIndex].activeEffects = [];
        optionsDiv.remove();
        cleanup();
    });

    const removeACardFromAllBtn = document.createElement("button");
    removeACardFromAllBtn.id = "remove-a-card-from-all";
    removeACardFromAllBtn.textContent = "Sterge o carte de la fiecare";
    optionsDiv.appendChild(removeACardFromAllBtn);

    removeACardFromAllBtn.addEventListener("click", (e) => {
        for(let i = 0; i < game.players.length; i++)
        {
            if(game.players[i].activeEffects.length > 0)
            {
                game.players[i].activeEffects.splice(0, 1);
            
            }
        }

        optionsDiv.remove();
        cleanup();
    });
}

export function playInversare(wheelScreenDiv, cleanup){
    const effectsToKeep = [];

    for(let i = 0; i < game.players[game.currentPlayerIndex].activeEffects.length; i++){
        const effect = game.players[game.currentPlayerIndex].activeEffects[i];
        if(effect.ownerIndex !== game.currentPlayerIndex)
        {
            game.players[effect.ownerIndex].activeEffects.push(effect);
        }
        else
        {
            effectsToKeep.push(effect);
        }
    }

    game.players[game.currentPlayerIndex].activeEffects = effectsToKeep;
    showInfo(wheelScreenDiv, "Efectele primite de la alti jucatori au fost returnate.", cleanup);
}

export function playTransfer(wheelScreenDiv, cleanup){
    const picker = createPicker(wheelScreenDiv);
    for(let i = 0; i < game.players.length; i++)
    {
        if(i === game.currentPlayerIndex)
        {
            continue;
        }

        const playerBtn = createPlayerBtn(i, picker);
        
        playerBtn.addEventListener("click", (e) => {
            const effectPicker = createPicker(wheelScreenDiv);
            for(let j = 0; j < game.players[game.currentPlayerIndex].activeEffects.length; j++)
            {
                const effectBtn = document.createElement("button");
                effectBtn.id = `effect-${j + 1}-button`;
                effectBtn.textContent = game.players[game.currentPlayerIndex].activeEffects[j].name;
                effectPicker.appendChild(effectBtn);

                effectBtn.addEventListener("click", (e) => {
                    game.players[i].activeEffects.push(game.players[game.currentPlayerIndex].activeEffects[j]);
                    game.players[game.currentPlayerIndex].activeEffects.splice(j, 1);
                    picker.remove();
                    effectPicker.remove();
                    cleanup();
                })
            }
        });
    }
}

export function playProtectie(wheelScreenDiv, cleanup){
    if(game.players[game.currentPlayerIndex].activeEffects.length === 0) {
        showInfo(wheelScreenDiv, "Nu ai efecte active pe care sa le stergi.", cleanup);
        return;
    }
    const effectPicker = createPicker(wheelScreenDiv);
    for(let i = 0; i < game.players[game.currentPlayerIndex].activeEffects.length; i++){
        const effectBtn = document.createElement("button");
        effectBtn.id = `effect-${i}`;
        effectBtn.textContent = game.players[game.currentPlayerIndex].activeEffects[i].name;
        effectPicker.appendChild(effectBtn);
        effectBtn.addEventListener("click", (e) => {
            game.players[game.currentPlayerIndex].activeEffects.splice(i, 1);
            effectPicker.remove(); 
            cleanup();
        });
    }
}

export function playArunca(wheelScreenDiv, cleanup){
    for(let i = 0; i < game.players.length; i++){
        if(i === game.currentPlayerIndex) continue;
        game.players[i].cards = [];
    }
    showInfo(wheelScreenDiv, "Cartile celorlalti jucatori au fost aruncate!", cleanup);
}

export function playSpioneaza(wheelScreenDiv, cleanup){
    const picker = createPicker(wheelScreenDiv);
    for(let i = 0; i < game.players.length; i++)
    {
        if(i === game.currentPlayerIndex)
        {
            continue;
        }

        const playerBtn = createPlayerBtn(i, picker);
        playerBtn.addEventListener("click", (e) => {
            const infoDiv = document.createElement("div");
            infoDiv.id = "info";
            wheelScreenDiv.appendChild(infoDiv);
            for(let j = 0; j < game.players[i].cards.length; j++)
            {
                const cardP = createP(`card-${j}`, game.players[i].cards[j], infoDiv);
            }

            const okBtn = document.createElement("button");
            okBtn.id = "ok-button";
            okBtn.textContent = "OK";
            infoDiv.appendChild(okBtn);

            okBtn.addEventListener("click", (e) => {
                picker.remove();
                infoDiv.remove();
                cleanup();
            });
        });
    }
}

export function playDictator(wheelScreenDiv, cleanup){
    for(let i = 0; i < game.players.length; i++){
        if(i === game.currentPlayerIndex) continue;
        game.players[i].activeEffects.push({ name: "Dictator", ownerIndex: game.currentPlayerIndex });
    }
    showInfo(wheelScreenDiv, "Dictator activ! Punctele tuturor jucatorilor din tura urmatoare merg la tine.", cleanup);
}

export function playRadar(wheelScreenDiv, cards, cleanup){
    const nextPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    
    const randomCardIndex = Math.floor(Math.random() * cards.length);
    game.predictedCard = { forPlayerIndex: nextPlayerIndex, cardIndex: randomCardIndex };

    const infoDiv = document.createElement("div");
    infoDiv.id = "info";
    wheelScreenDiv.appendChild(infoDiv);

    const cardP = createP("card", cards[randomCardIndex], infoDiv);

    const okBtn = document.createElement("button");
    okBtn.id = "ok-button";
    okBtn.textContent = "OK";
    infoDiv.appendChild(okBtn);
    okBtn.addEventListener("click", (e) => {
        infoDiv.remove();
        cleanup();
    });
}

export function playMagnet(wheelScreenDiv, cleanup){
    const picker = createPicker(wheelScreenDiv);
    for(let i = 0; i < game.players.length; i++)
    {
        if(i === game.currentPlayerIndex) 
        {
            continue;
        }
        const playerBtn = createPlayerBtn(i, picker);
        playerBtn.addEventListener("click", (e) => {
            for(let j = 0; j < game.players[i].cards.length; j++){
                game.players[game.currentPlayerIndex].cards.push(game.players[i].cards[j]);
            }
            game.players[i].cards = [];
            picker.remove();
            cleanup();
        })
    }
}

//#region helpers
function createPicker(wheelScreenDiv){
    const pickerDiv = document.createElement("div");
    pickerDiv.id = "picker";
    wheelScreenDiv.appendChild(pickerDiv);
    return pickerDiv;
}

function createPlayerBtn(i, picker){
    const playerBtn = document.createElement("button");
    playerBtn.id = `player-${i+1}-btn`;
    playerBtn.textContent = game.players[i].name;
    picker.appendChild(playerBtn);
    return playerBtn
}

function createP(id, text, parent){
    const p = document.createElement("p");
    p.id = id;
    p.textContent = text;
    parent.appendChild(p);
    return p;
}

function showInfo(wheelScreenDiv, message, callback){
    const infoDiv = document.createElement("div");
    infoDiv.id = "info";
    wheelScreenDiv.appendChild(infoDiv);
    const msgP = document.createElement("p");
    msgP.textContent = message;
    infoDiv.appendChild(msgP);
    const okBtn = document.createElement("button");
    okBtn.textContent = "OK";
    infoDiv.appendChild(okBtn);
    okBtn.addEventListener("click", () => {
        infoDiv.remove();
        callback();
    });
}
//#endregion