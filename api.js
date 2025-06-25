const mongoose = require("mongoose")
const express = require("express")
const { requireAuthHandler } = require("./auth.js")
const { Game } = require("./db.js")

const apiRouter = express.Router()

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