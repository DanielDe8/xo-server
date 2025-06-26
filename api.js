const mongoose = require("mongoose")
const express = require("express")
const { requireAuthHandler } = require("./auth.js")
const { Game } = require("./db.js")

const apiRouter = express.Router()

apiRouter.get("/recent", requireAuthHandler, (req, res) => {
    const userId = new mongoose.Types.ObjectId(req.session.user._id)

    Game.find({
        $or: [
            { player1: userId },
            { player2: userId }
        ]
    })
        .sort({ dateCreated: -1 })
        .limit(10)
        .populate("player1 player2", "username")
        .lean()
        .then(games => res.send(games))
        .catch(e => res.status(500).send(e))
})
apiRouter.get("/games", (req, res) => {
    Game.find()
        .sort({ dateCreated: -1 })
        .populate("player1 player2", "username")
        .lean()
        .then(games => res.send(games))
        .catch(e => res.status(500).send(e))
})
apiRouter.get("/games/:id", (req, res) => {
    Game.findById(req.params.id)
        .populate("player1 player2", "username")
        .lean()
        .then(game => {
            if (!game) return res.status(404).send("Game not found")
            res.send(game)
        })
        .catch(e => res.status(500).send(e))
})

module.exports = { apiRouter }