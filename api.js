const express = require("express")
const { requireAuthHandler } = require("./auth.js")

const apiRouter = express.Router()

apiRouter.get("/recent", requireAuthHandler, (req, res) => {
    res.json({
        message: "Recent games data would be here",
        user: req.session.user
    })
})

module.exports = { apiRouter }