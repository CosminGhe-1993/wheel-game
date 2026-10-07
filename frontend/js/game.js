export class Player{
    constructor(name)
    {
        this.name = name;
        this.score = 0;
        this.cards = [];
        this.correctLetters = 0;
        this.activeEffects = [];
    }
}

export class Card{
    constructor(name)
    {
        this.name = name;
        this.action = "";
    }
}

export const game = {

    currentRound: 0,
    players: [],
    currentSentence: "",
    totalRounds: 0,
    order: [],
    currentPlayerIndex: 0,
    predictedCard: null,
    doubloActive: false,
    furaPuncteTargetIndex: -1,
    dictatorActive: false,
    dictatorOwnerIndex: -1,
}

export function saveGame() {
    sessionStorage.setItem("wheelGame", JSON.stringify(game));
}

export function loadGame() {
    const saved = sessionStorage.getItem("wheelGame");
    if(saved !== null)
    {
        const parsed = JSON.parse(saved);
        game.players = parsed.players;
        game.currentRound = parsed.currentRound;
        game.currentSentence = parsed.currentSentence;
        game.totalRounds = parsed.totalRounds;
        game.order = parsed.order;
        game.currentPlayerIndex = parsed.currentPlayerIndex;
        game.predictedCard = parsed.predictedCard ?? null;
        game.doubloActive = parsed.doubloActive ?? false;
        game.furaPuncteTargetIndex = parsed.furaPuncteTargetIndex ?? -1;
        game.dictatorActive = parsed.dictatorActive ?? false;
        game.dictatorOwnerIndex = parsed.dictatorOwnerIndex ?? -1;
    }
}