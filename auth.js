const mongoose = require("mongoose")
const express = require("express")
const Joi = require("joi")
const bcrypt = require("bcrypt")
const expressSession = require("express-session")
const dotenv = require('dotenv')

dotenv.config()
const authRouter = express.Router()

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

const authSession = expressSession({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true
    }
})

const requireAuthHandler = (req, res, next) => {
    const user = req.session.user
    if (!user) {
        res.status(401).send("Log in first")
        return
    }

    User.findById(user._id).then(dbUser => {
        if (user === null) {
            req.session.destroy(err => {
                if (err) {
                    res.status(500).send("Authentication failed")
                    return
                }
                res.status(401).send("Log in first")
            })
            return
        }
        next()
    }).catch(() => {
        res.status(500).send("Authentication failed")
    })
}

const requireAdminHandlers = [
    requireAuthHandler,
    (req, res, next) => {
        const user = req.session.user
        if (!user.isAdmin) {
            res.status(403).send("Not admin")
        }
        next()
    }
]

function validateUser(data) {
    const { email, username, password } = data

    const schema = Joi.object({
        email: Joi.string().email(),
        username: Joi.string().min(4),
        password: Joi.string().min(8)
    })

    return schema.validate({ email, username, password }, { presence: "required" })
}

function validateLogin(data) {
    const { email, password } = data

    const schema = Joi.object({
        email: Joi.string(),
        password: Joi.string()
    })

    return schema.validate({ email, password }, { presence: "required" })
}

function hashPassword(password, saltRounds = 10) {
    return bcrypt.hashSync(password, saltRounds)
}

function verifyPassword(passwordHash, password) {
    return bcrypt.compareSync(password, passwordHash)
}

function getPublicSessionData(sessionData) {
    const allowedKeys = [
        "_id", "email", "username", "isAdmin", 
        "eloBlitz", "eloClassic", 
        "rankedGames", "rankedWins", "rankedLosses", 
        "randomGames", "randomWins", "randomLosses"
    ];
    
    const entries = allowedKeys
        .map(key => [key, sessionData[key]]);
    return Object.fromEntries(entries);
}

authRouter.post("/register", (req, res) => {
    const data = req.body
    const { error } = validateUser(data)
    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }
    User.create({
        email: data.email,
        username: data.username,
        passwordHash: hashPassword(data.password),
        isAdmin: false
    }).then(savedUser => {
        const user = savedUser.toObject()
        delete user.passwordHash

        req.session.user = user
        req.session.save((err) => {
            if (err) {
                res.status(500).send("Login failed")
                return
            }
            res.send(user)
        })
    }).catch(e => {
        if (e.code === 11000) { 
            res.status(400).send("This email/username is already registered!")
            return
        }
        res.status(500).send("Registration failed")
    })
})

authRouter.post("/", (req, res) => {
    const data = req.body
    const { error } = validateLogin(data)
    if (error) {
        res.status(400).send(error.details[0].message)
        return
    }
    User.findOne({ email: data.email }).then(user => {
        if (!user || !verifyPassword(user.passwordHash, data.password)) {
            res.status(400).send("Incorrect email/password")
            return
        }

        const sessionUser = user.toObject()
        delete sessionUser.passwordHash

        req.session.user = sessionUser
        req.session.save((err) => {
            if (err) {
                res.status(500).send("Login failed")
                return
            }
            res.send(getPublicSessionData(sessionUser))
        })
    }).catch(e => res.status(500).send("Login failed"))
})

authRouter.delete("/", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            res.status(500).send("Logout failed")
            return
        }
        res.send("User logged out")
    })
})

authRouter.get("/", requireAuthHandler, (req, res) => {
    res.send(getPublicSessionData(req.session.user))
})

module.exports = { authRouter, authSession, requireAuthHandler, requireAdminHandlers, User }