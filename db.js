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

const User = mongoose.model("User", userSchema)

module.exports = { User }