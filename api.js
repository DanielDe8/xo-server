const mongoose = require("mongoose")
const express = require("express")
const { requireAuthHandler } = require("./auth.js")

const apiRouter = express.Router()

const gameSchema = new mongoose.Schema({
    player1: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    player2: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    xes: [ Object ],
    os: [ Object ],
    status: Number, // -1 for ongoing, 0 for player1 win, 1 for player2 win, 2 for draw
    createdAt: { type: Date, default: Date.now }
})

apiRouter.get("/recent", requireAuthHandler, (req, res) => {
    res.json([
        {
            player1: "Player1",
            player2: "Player2",
            status: "Finished",
            createdAt: new Date().toISOString()
        },
        {
            player1: "Player3",
            player2: "Player4",
            status: "In Progress",
            createdAt: new Date().toISOString()
        }
    ])
})

module.exports = { apiRouter }