import { HUB_URL, API_URL } from "./config.js";

const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect()
    .build();

const params = new URLSearchParams(window.location.search);
const prefilledCode = params.get("room") || "";
if (prefilledCode) {
    document.getElementById("input-room-code").value = prefilledCode;
}

let cardDescriptions = {};
async function loadCards() {
    const res = await fetch(`${API_URL}/cards`);
    const cards = await res.json();
    cards.forEach(c => cardDescriptions[c.name] = c.description);
}

loadCards();

function showCardPreview(name){
    const overlay = document.createElement("div");
    overlay.className = "card-preview-overlay";

    const card = document.createElement("div");
    card.className = "card-preview-card";

    const closeBtn = document.createElement("button");
    closeBtn.className = "card-preview-close";
    closeBtn.textContent = "X";
    closeBtn.addEventListener("click", () => overlay.remove());

    const title = document.createElement("h3");
    title.textContent = name;

    const desc = document.createElement("p");
    desc.textContent = cardDescriptions[name] || "";

    card.appendChild(closeBtn);
    card.appendChild(title);
    card.appendChild(desc);
    overlay.appendChild(card);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
        if(e.target === overlay){
            overlay.remove();
        }
    });
}

//  Show Screens 
function showScreen(id) {
    document.querySelectorAll("body > div").forEach(d => d.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

// Action areas
const actionDivs = [
    "dice-action", "letter-action", "spin-action",
    "choice-action", "must-play-action", "picker-action",
    "info-action", "waiting-action", "sentence-guess-action"
];

function showAction(id) {
    actionDivs.forEach(a => document.getElementById(a).classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

// Card selection
let selectedCardIndex = -1;

function resetSelection() {
    selectedCardIndex = -1;
    document.querySelectorAll(".card-chip").forEach(c => c.classList.remove("selected"));
    document.getElementById("btn-play-card").disabled = true;
    document.getElementById("btn-must-play-card").disabled = true;
}

// Cards in Hand
function renderHand(cards) {
    const container = document.getElementById("hand-cards");
    container.innerHTML = "";
    cards.forEach((card, i) => {
        const div = document.createElement("div");
        div.className = "card-chip";
        div.textContent = card;
        div.addEventListener("click", () => {
            document.querySelectorAll(".card-chip").forEach(c => c.classList.remove("selected"));
            div.classList.add("selected");
            selectedCardIndex = i;
            document.getElementById("btn-play-card").disabled = false;
            document.getElementById("btn-must-play-card").disabled = false;
        });
        let pressTimer = null;
        div.addEventListener("touchstart", () => {
            pressTimer = setTimeout(() => showCardPreview(card), 500);
        },{ passive: true });
        div.addEventListener("touchend", () => clearTimeout(pressTimer));
        div.addEventListener("touchmove", () => clearTimeout(pressTimer));

        container.appendChild(div);
    });
    resetSelection();
}

// Mini sentence display
let miniSentence = "";
let miniRevealed = new Set();

function buildMiniSentence(sentence) {
    miniSentence = sentence.toUpperCase();
    miniRevealed = new Set();
    renderMiniSentence();
}

function revealMiniLetter(letter) {
    miniRevealed.add(letter.toUpperCase());
    renderMiniSentence();
}

function renderMiniSentence() {
    const container = document.getElementById("mini-sentence");
    if (!miniSentence) { 
        container.textContent = ""; return; 
    }
    container.innerHTML = miniSentence.split("").map(ch => {
        if (ch === " ") {
            return '<span class="mini-space"> </span>';
        }
        if (miniRevealed.has(ch)) {
            return `<span class="mini-letter revealed">${ch}</span>`;
        }
        return '<span class="mini-letter">_</span>';
    }).join("");
}

// Letter keyboard
const LETTERS = "AĂÂBCDEFGHIÎJKLMNOPQRSȘTȚUVWXYZ";
let guessedLetters = new Set();

function disableLetter(letter) {
    const upper = letter.toUpperCase();
    guessedLetters.add(upper);
    const btn = [...document.querySelectorAll(".letter-btn")].find(b => b.textContent === upper);
    if (btn) {
        btn.disabled = true;
    }
}

function buildKeyboard() {
    guessedLetters = new Set();
    const kb = document.getElementById("letter-keyboard");
    kb.innerHTML = "";
    [...LETTERS].forEach(letter => {
        const btn = document.createElement("button");
        btn.className = "letter-btn";
        btn.textContent = letter;
        btn.addEventListener("click", async () => {
            if (guessedLetters.has(letter)) {
                return;
            }
            guessedLetters.add(letter);
            btn.disabled = true;
            await connection.invoke("GuessLetter", letter);
        });
        kb.appendChild(btn);
    });
}

// Picker
function showPicker(label, options, invokeMethod) {
    showAction("picker-action");
    document.getElementById("picker-label").textContent = label;
    const container = document.getElementById("picker-options");
    container.innerHTML = "";
    options.forEach((opt, i) => {
        const btn = document.createElement("button");
        btn.className = "picker-btn";
        btn.textContent = opt;
        btn.addEventListener("click", async () => {
            container.querySelectorAll("button").forEach(b => b.disabled = true);
            await connection.invoke(invokeMethod, i);
        });
        container.appendChild(btn);
    });
}

// Setup flow
document.getElementById("btn-join").addEventListener("click", async () => {
    const code = document.getElementById("input-room-code").value.trim().toUpperCase();
    if (!code || code.length !== 4) {
        return;
    }
    await connection.invoke("JoinRoom", code);
});

document.getElementById("btn-confirm-name").addEventListener("click", async () => {
    const name = document.getElementById("input-name").value.trim();
    if (!name) {
        return;
    }
    await connection.invoke("SetName", name);
    showScreen("waiting-screen");
});

// Dice button
document.getElementById("btn-roll-dice").addEventListener("click", async () => {
    document.getElementById("btn-roll-dice").disabled = true;
    await connection.invoke("RollDice");
});

// Spin button
document.getElementById("btn-spin").addEventListener("click", async () => {
    document.getElementById("btn-spin").disabled = true;
    await connection.invoke("SpinWheel");
});

// Play card buttons
document.getElementById("btn-play-card").addEventListener("click", async () => {
    if (selectedCardIndex < 0) {
        return;
    }
   const idx = selectedCardIndex;
    resetSelection();
    await connection.invoke("PlayCard", idx);
});

document.getElementById("btn-must-play-card").addEventListener("click", async () => {
    if (selectedCardIndex < 0) {
        return;
    }
    const idx = selectedCardIndex;
    resetSelection();
    await connection.invoke("PlayCard", idx);
});

// Guess letter button
document.getElementById("btn-guess-letter").addEventListener("click", async () => {
    await connection.invoke("ChooseGuessLetter");
});

// Guess sentence buttons
document.getElementById("btn-guess-sentence").addEventListener("click", () => {
    document.getElementById("input-sentence-guess").value = "";
    showAction("sentence-guess-action");
    document.getElementById("input-sentence-guess").focus();
});

document.getElementById("btn-submit-sentence").addEventListener("click", async () => {
    const guess = document.getElementById("input-sentence-guess").value.trim();
    if (!guess) {
        return;
    }
    showAction("waiting-action");
    await connection.invoke("GuessSentence", guess);
});

document.getElementById("btn-cancel-guess").addEventListener("click", () => {
    showAction("choice-action");
});

document.getElementById("input-sentence-guess").addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
        const guess = document.getElementById("input-sentence-guess").value.trim();
        if (!guess) {
            return;
        }
        showAction("waiting-action");
        await connection.invoke("GuessSentence", guess);
    }
});

// Info ok
document.getElementById("btn-info-ok").addEventListener("click", () => {
    showAction("waiting-action");
});

// SignalR events
connection.on("JoinedRoom", () => {
    showScreen("name-screen");
});

connection.on("JoinError", (msg) => {
    alert(msg);
});

connection.on("WaitingForPlayers", () => {
    showScreen("waiting-screen");
    document.getElementById("waiting-msg").textContent = "Se asteapta toti jucatorii...";
});

connection.on("DicePhaseStarted", () => {
    showScreen("game-screen");
    showAction("waiting-action");
    buildKeyboard();
});

connection.on("YourTurnToDice", () => {
    showScreen("game-screen");
    showAction("dice-action");
    document.getElementById("btn-roll-dice").disabled = false;
});

connection.on("DiceRolled", () => {
    showAction("waiting-action");
});

connection.on("GameStarted", (_playerNames, sentence) => {
    showScreen("game-screen");
    buildMiniSentence(sentence);
    showAction("waiting-action");
});

connection.on("TurnStarted", (_playerName) => {
    const infoShowing = !document.getElementById("info-action").classList.contains("hidden");
    if (!infoShowing) {
        showAction("waiting-action");
    }
});

connection.on("YourTurn", (canPlayCard) => {
    resetSelection();
    if (canPlayCard) {
        showAction("choice-action");
    } else {
        showAction("letter-action");
    }
});

connection.on("SpinAvailable", () => {
    showAction("spin-action");
    document.getElementById("btn-spin").disabled = false;
});

connection.on("MustPlayCard", () => {
    resetSelection();
    showAction("must-play-action");
});

connection.on("ShowLetterKeyboard", () => {
    showAction("letter-action");
});

connection.on("HandUpdated", (cards) => {
    renderHand(cards);
});

connection.on("ShowPicker", (label, options, invokeMethod) => {
    showPicker(label, options, invokeMethod);
});

connection.on("ShowInfo", (message) => {
    showAction("info-action");
    document.getElementById("info-message").textContent = message;
});

connection.on("LetterCorrect", (letter, _matches, _points, _playerName, _scoreChanges) => {
    disableLetter(letter);
    revealMiniLetter(letter);
    showAction("waiting-action");
});

connection.on("LetterWrong", (letter) => {
    disableLetter(letter);
    showAction("waiting-action");
});

connection.on("RoundStarted", (round, sentence) => {
    buildKeyboard();
    buildMiniSentence(sentence);
    showAction("waiting-action");
    document.getElementById("waiting-msg").textContent = `Runda ${round}`;
});

connection.on("GameFinished", (scores) => {
    showAction("info-action");
    document.getElementById("info-message").textContent =
        "Joc terminat! " + scores.map((s, i) => `${i + 1}. ${s.name}: ${s.score}`).join(" | ");
    document.getElementById("btn-info-ok").style.display = "none";
});

connection.on("SentenceSolved", (playerName, sentence) => {
    showAction("info-action");
    document.getElementById("info-message").textContent = `${playerName} a ghicit propozitia: "${sentence}"!`;
    document.getElementById("btn-info-ok").style.display = "";
});

connection.on("SentenceWrong", (_playerName) => {
    showAction("waiting-action");
});

connection.on("CardPlayedPublic", () => {});
connection.on("PlayerBlocked", () => { showAction("waiting-action"); });
connection.on("PlayerLeft", () => {});

// Start
connection.start().catch(err => console.error("SignalR error:", err));
