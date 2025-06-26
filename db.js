const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({
    email: { type: String, index: { unique: true }},
    username: { type: String, unique: true },
    passwordHash: String,
    dateCreated: { type: Date, default: Date.now },
    isAdmin: Boolean,

    eloBlitz: { type: Number, default: 400 },
    eloClassic: { type: Number, default: 400 },
    
    rankedGames: { type: Number, default: 0 },
    rankedWins: { type: Number, default: 0 },
    rankedLosses: { type: Number, default: 0 },

    randomGames: { type: Number, default: 0 },
    randomWins: { type: Number, default: 0 },
    randomLosses: { type: Number, default: 0 }
})
const gameSchema = new mongoose.Schema({
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    xes: [ Object ],
    os: [ Object ],
    xNumber: Number,
    type: String,
    last: Object,
    winLine: Object,

    status: Number, // -1 for ongoing, 0 for player1 win, 1 for player2 win, 2 for draw
    playerDisconnected: Boolean,

    dateStarted: Date
})

const User = mongoose.model("User", userSchema)
const Game = mongoose.model("Game", gameSchema)

module.exports = { User, Game }