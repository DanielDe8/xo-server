const http = require("http")
const socketio = require("socket.io")
const dotenv = require("dotenv")
const mongoose = require("mongoose")
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const { checkWin, checkTaken, createGameState } = require("./game.js")
const { authRouter, authSession } = require("./auth.js")

dotenv.config()
const corsConfig = {
    origin: "http://localhost:8080",
    credentials: true
}

const app = express()
const server = http.createServer(app)
const io = socketio(server, { cors: corsConfig })

app.use(cors(corsConfig))
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(authSession)
app.use("/auth", authRouter)
io.use((s, next) => authSession(s.request, {}, next))

var gameStates = {}
var clientRoomId = {}

var randomQueue = []

io.on("connection", client => {
    client.on("click", handleClick)
    client.on("joinGame", handleJoinGame)
    client.on("createGame", handleCreateGame)

    function getGameState() {
        return gameStates[clientRoomId[client.id]]
    }

    function setGameState(newGameState) {
        gameStates[clientRoomId[client.id]] = newGameState
    }

    function handleClick(data) {
        var gameState = getGameState()

        if (!gameState || gameState?.status != -1) return

        const pos = JSON.parse(data)
    
        if (!checkTaken(pos, gameState) && client.number === (gameState.xTurn ? gameState.xNumber : 1 - gameState.xNumber)) {
            if (gameState.xTurn) { gameState.xes.push(pos) } else { gameState.os.push(pos) }
    
            gameState.last = pos
            gameState.last.exists = true
    
            checkWin(gameState)
    
            gameState.xTurn = !gameState.xTurn

            setGameState(gameState)
            io.to(clientRoomId[client.id]).emit("gameState", JSON.stringify(gameState))
        }
    }

    function handleJoinGame(data) {
        const info = JSON.parse(data)

        switch (info.type) {
            case "friendly":
                joinFriendly(info)
                break
            case "random":
                joinRandom(info)
                break
        }
    }

    function handleCreateGame() {
        const roomCode = createRoomCodeFriendly(6)
        const roomId = "f_" + roomCode

        clientRoomId[client.id] = roomId
        client.emit("preInit", roomCode)

        var gameState = createGameState()
        gameState.usernames[0] = client.request.session?.user?.username || "",
        gameStates[roomId] = gameState

        client.join(roomId)
        client.number = 0
        // client.emit("init")
    }

    function joinFriendly(info) {
        const roomId = "f_" + (info.code.toUpperCase())
        const room = io.sockets.adapter.rooms.get(roomId)

        if (!room) {
            client.emit("joinGameError", "unknownCode")
            return
        }
        if (room.length > 1) {
            client.emit("joinGameError", "roomFull")
            return
        }

        clientRoomId[client.id] = roomId

        var gameState = getGameState()
        gameState.status = -1
        gameState.usernames[1] = client.request.session?.user?.username || "",
        setGameState(gameState)

        client.join(roomId)
        client.number = 1
        io.to(roomId).emit("init", JSON.stringify(gameState))
    }

    function joinRandom() {
        if (randomQueue.length > 0) {
            const opponent = randomQueue.shift()
            const roomId = "g_" + createRoomCodeFriendly(6)

            clientRoomId[client.id] = roomId
            clientRoomId[opponent.id] = roomId

            var gameState = createGameState()
            gameState.usernames[1] = client.request.session?.user?.username || ""
            gameState.usernames[0] = opponent.request.session?.user?.username || ""
            gameStates[roomId] = gameState

            client.join(roomId)
            opponent.join(roomId)

            client.number = 1

            io.to(roomId).emit("init", JSON.stringify(gameState))
        } else {
            client.number = 0
            randomQueue.push(client)
            client.emit("preInit")
        }
    }
})

function createRoomCodeFriendly(len) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    var result = ""

    for (let i = 0; i < len; i++) {
        result += chars[Math.floor(Math.random() * chars.length)]
    }

    return result
}

function createRoomCodeRandom(len) {
    // https://stackoverflow.com/questions/3231459/how-can-i-create-unique-ids-with-javascript
    return Date.now().toString(36) + Math.floor(Math.pow(10, 12) + Math.random() * 9*Math.pow(10, 12)).toString(36)
}

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Connected to MongoDB!")
        server.listen(process.env.PORT, () => console.log(`Listening on port ${process.env.PORT}...`))
    })
    .catch(error => console.error("Could not connect to MongoDB... ", error))
