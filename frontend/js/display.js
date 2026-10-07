import { HUB_URL } from "./config.js";

const CARD_NAMES = [
    "Fura puncte", "Dublu", "Bloc", "Anuleaza", "Dezvaluie",
    "Super anulare", "Inversare", "Transfer", "Protectie",
    "Arunca", "Spioneaza", "Dictator", "Radar", "Magnet"
];

const WHEEL_COLORS = [
    "#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#1abc9c",
    "#3498db", "#9b59b6", "#c0392b", "#d35400", "#f39c12",
    "#27ae60", "#16a085", "#2980b9", "#8e44ad"
];

function buildWheel() {
    const svg = document.getElementById("wheel");
    const cx = 180, cy = 180, r = 172;
    const n = CARD_NAMES.length;
    const angleStep = 360 / n;
    const NS = "http://www.w3.org/2000/svg";

    const defs = document.createElementNS(NS, "defs");
    const clip = document.createElementNS(NS, "clipPath");
    clip.setAttribute("id", "wclip");
    const clipCircle = document.createElementNS(NS, "circle");
    clipCircle.setAttribute("cx", cx); clipCircle.setAttribute("cy", cy); clipCircle.setAttribute("r", r);
    clip.appendChild(clipCircle);
    defs.appendChild(clip);
    svg.appendChild(defs);

    const g = document.createElementNS(NS, "g");
    g.setAttribute("clip-path", "url(#wclip)");

    for (let i = 0; i < n; i++) {
        const startDeg = i * angleStep - 90;
        const endDeg = (i + 1) * angleStep - 90;
        const midDeg = (startDeg + endDeg) / 2;
        const startRad = startDeg * Math.PI / 180;
        const endRad = endDeg * Math.PI / 180;
        const midRad = midDeg * Math.PI / 180;

        const x1 = cx + r * Math.cos(startRad);
        const y1 = cy + r * Math.sin(startRad);
        const x2 = cx + r * Math.cos(endRad);
        const y2 = cy + r * Math.sin(endRad);

        const path = document.createElementNS(NS, "path");
        path.setAttribute("d", `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`);
        path.setAttribute("fill", WHEEL_COLORS[i]);
        path.setAttribute("stroke", "#111");
        path.setAttribute("stroke-width", "1.5");
        g.appendChild(path);

    }

    svg.appendChild(g);

    const border = document.createElementNS(NS, "circle");
    border.setAttribute("cx", cx); border.setAttribute("cy", cy); border.setAttribute("r", r);
    border.setAttribute("fill", "none");
    border.setAttribute("stroke", "#f4c430");
    border.setAttribute("stroke-width", "4");
    svg.appendChild(border);
}

buildWheel();

const connection = new signalR.HubConnectionBuilder()
    .withUrl(HUB_URL)
    .withAutomaticReconnect()
    .build();

// ── Screens ──────────────────────────────────────────────
function showScreen(id) {
    document.querySelectorAll("body > div").forEach(d => d.classList.add("hidden"));
    document.getElementById(id).classList.remove("hidden");
}

// ── Wheel ────────────────────────────────────────────────
const wheel = document.getElementById("wheel");
let currentWheelAngle = 0;

function spinWheelTo(cardIndex) {
    const sectorSize = 360 / 14;
    const targetAngle = cardIndex * sectorSize + sectorSize / 2;
    const currentMod = currentWheelAngle % 360;
    const diff = (targetAngle - currentMod + 360) % 360;
    currentWheelAngle = currentWheelAngle + 5 * 360 + diff;
    wheel.style.transform = `rotate(${currentWheelAngle}deg)`;
}

// ── Sentence ─────────────────────────────────────────────
let revealedLetters = new Set();

function buildSentence(sentence) {
    revealedLetters = new Set();
    const container = document.getElementById("sentence-screen");
    container.innerHTML = "";
    sentence.split(" ").forEach((word, wi) => {
        const wordDiv = document.createElement("div");
        wordDiv.className = "word-cell";
        [...word].forEach(char => {
            const cell = document.createElement("div");
            cell.className = "letter-cell";
            cell.dataset.letter = char.toUpperCase();
            wordDiv.appendChild(cell);
        });
        container.appendChild(wordDiv);
        if (wi < sentence.split(" ").length - 1) {
            const space = document.createElement("div");
            space.className = "space-cell";
            container.appendChild(space);
        }
    });
}

function revealLetter(letter) {
    revealedLetters.add(letter.toUpperCase());
    document.querySelectorAll(`.letter-cell[data-letter="${letter.toUpperCase()}"]`)
        .forEach(cell => cell.textContent = letter.toUpperCase());
}

// ── Player scores ─────────────────────────────────────────
let players = [];

function buildPlayerCards(playerNames) {
    players = playerNames.map(name => ({ name, score: 0 }));
    const left = document.getElementById("left-players-screen");
    const right = document.getElementById("right-players-screen");
    left.innerHTML = "";
    right.innerHTML = "";
    const half = Math.ceil(players.length / 2);
    players.forEach((p, i) => {
        const card = document.createElement("div");
        card.className = "player-card";
        card.id = `player-card-${i}`;
        card.innerHTML = `<p>${p.name}</p><p class="player-score">0</p>`;
        (i < half ? left : right).appendChild(card);
    });
}

function updateScore(playerName, delta) {
    const idx = players.findIndex(p => p.name === playerName);
    if (idx === -1) return;
    players[idx].score += delta;
    document.querySelector(`#player-card-${idx} .player-score`).textContent = players[idx].score;
}

function setActivePlayer(playerName) {
    document.querySelectorAll(".player-card").forEach(c => c.classList.remove("active-player"));
    const idx = players.findIndex(p => p.name === playerName);
    if (idx !== -1) document.getElementById(`player-card-${idx}`)?.classList.add("active-player");
    document.getElementById("wheel-spinning-player").textContent = `${playerName} ghiceste`;
}

// ── Messages ─────────────────────────────────────────────
function showMessage(text) {
    const area = document.getElementById("message-area");
    area.textContent = text;
}

// ── Dice ─────────────────────────────────────────────────
function getDots(value) {
    return Array(value).fill('<span class="dot"></span>').join('');
}

function updateDice(dice1, dice2) {
    const d1 = document.getElementById("dice1");
    const d2 = document.getElementById("dice2");
    d1.className = `dice dice-${dice1}`;
    d2.className = `dice dice-${dice2}`;
    d1.innerHTML = getDots(dice1);
    d2.innerHTML = getDots(dice2);
}

// ── Setup ─────────────────────────────────────────────────
document.getElementById("btn-start-game").addEventListener("click", async () => {
    const maxPlayers = parseInt(document.getElementById("input-num-players").value);
    const totalRounds = parseInt(document.getElementById("input-num-rounds").value);
    if (!maxPlayers || !totalRounds || maxPlayers < 2) return;
    await connection.invoke("CreateRoom", maxPlayers, totalRounds);
});

// ── SignalR events ────────────────────────────────────────
connection.on("RoomCreated", (code) => {
    showScreen("waiting-screen");
    document.getElementById("room-code-label").textContent = `Cod: ${code}`;
    document.getElementById("players-count").textContent = "0 jucatori conectati";
    const playerUrl = `${window.location.origin}${window.location.pathname.replace('display.html', 'player.html')}?room=${code}`;
    new QRCode(document.getElementById("qr-code"), { text: playerUrl, width: 200, height: 200 });
});

connection.on("PlayerJoined", (count, max) => {
    document.getElementById("players-count").textContent = `${count} / ${max} jucatori conectati`;
});

connection.on("DicePhaseStarted", () => {
    showScreen("dice-screen");
});

connection.on("NextDiceRoller", (playerName) => {
    document.getElementById("throwing-player").textContent = `${playerName} arunca...`;
    document.getElementById("tie-msg").textContent = "";
});

connection.on("DiceRolled", (playerName, dice1, dice2, sum, isDouble) => {
    updateDice(dice1, dice2);
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${playerName}</td><td>${dice1} + ${dice2}${isDouble ? " ⚡" : ""}</td><td>${sum}</td>`;
    document.getElementById("dice-tbody").appendChild(tr);
});

connection.on("TieBreak", (playerNames) => {
    document.getElementById("dice-tbody").innerHTML = "";
    document.getElementById("tie-msg").textContent = `Egalitate! ${playerNames.join(" si ")} arunca din nou.`;
});

connection.on("GameStarted", (playerNames, sentence) => {
    showScreen("game-screen");
    buildPlayerCards(playerNames);
    buildSentence(sentence);
    document.getElementById("round-indicator").textContent = "Runda 1";
});

connection.on("TurnStarted", (playerName) => {
    setActivePlayer(playerName);
    showMessage(`Tura lui ${playerName}`);
});

connection.on("LetterCorrect", (letter, matches, points, playerName, scoreChanges) => {
    revealLetter(letter);
    scoreChanges.forEach(c => updateScore(c.name, c.delta));
    showMessage(`${playerName}: ${letter} — ${matches} aparitii, ${points} puncte`);
});

connection.on("LetterWrong", (letter, playerName) => {
    showMessage(`${playerName}: ${letter} — litera gresita!`);
});

connection.on("WheelSpinStarted", (cardIndex) => {
    spinWheelTo(cardIndex);
    showMessage("Se invarte roata...");
});

connection.on("CardPlayedPublic", (cardName, playerName, targetName) => {
    const msg = targetName
        ? `${playerName} a jucat ${cardName} pe ${targetName}`
        : `${playerName} a jucat ${cardName}`;
    showMessage(msg);
});

connection.on("PlayerBlocked", (playerName) => {
    showMessage(`${playerName} este blocat! Tura sarita.`);
});

connection.on("RoundStarted", (round, sentence) => {
    buildSentence(sentence);
    document.getElementById("round-indicator").textContent = `Runda ${round}`;
    showMessage(`Runda ${round} a inceput!`);
});

connection.on("GameFinished", (scores) => {
    showScreen("finished-screen");
    const list = document.getElementById("final-scores");
    list.innerHTML = "";
    scores.forEach((s, i) => {
        const li = document.createElement("li");
        li.textContent = `${i + 1}. ${s.name} — ${s.score} puncte`;
        list.appendChild(li);
    });
});

connection.on("SentenceSolved", (playerName, sentence) => {
    showMessage(`${playerName} a ghicit propozitia: "${sentence}"!`);
});

connection.on("SentenceWrong", (playerName) => {
    showMessage(`${playerName} a ghicit gresit propozitia.`);
});

connection.on("PlayerLeft", () => {
    showMessage("Un jucator s-a deconectat.");
});

// ── Start ─────────────────────────────────────────────────
connection.start().catch(err => console.error("SignalR error:", err));
