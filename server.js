const http = require("http")
const socketio = require("socket.io")
const dotenv = require("dotenv")
const mongoose = require("mongoose")
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const { checkWin, checkTaken, createGameState, moveErrorMsg } = require("./game.js")
const { authRouter, authSession } = require("./auth.js")
const { apiRouter } = require("./api.js")
const { User, Game } = require("./db.js")

dotenv.config()
const corsConfig = {
    origin: ["http://localhost:8080", "https://xo-r.github.io", "http://localhost:5173", "http://192.168.1.209:5173", "https://xo-r.netlify.app", "https://xo.dandev.dev"],
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
app.use("/api", apiRouter)
io.use((s, next) => authSession(s.request, {}, next))

app.get("/", (req, res) => res.send("API running!"))

var gameStates = {}
var clientRoomId = {}

var randomQueue = []

io.on("connection", client => {
    client.on("disconnect", handleDisconnect)
    client.on("click", handleClick)
    client.on("joinGame", handleJoinGame)
    client.on("createGame", handleCreateGame)

    console.log(client.id +  " connected")

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
    
        errorMsg = moveErrorMsg(pos, gameState)
        if (errorMsg) {
            client.emit("invalidMove", errorMsg)
            return
        }

        if (!checkTaken(pos, gameState) && client.number === (gameState.xTurn ? gameState.xNumber : 1 - gameState.xNumber)) {
            if (!gameState.last.exists) {
                gameState.xes.push({ x: 0, y: 0})
                gameState.last = { x: 0, y: 0, exists: true }

                client.emit("firstMoveOffset", JSON.stringify(pos))
            } else { 
                if (gameState.xTurn) { gameState.xes.push(pos) } else { gameState.os.push(pos) }
                gameState.last = { ...pos, exists: true }

                checkWin(gameState)
            }
    
            if (gameState.status != -1) { 
                gameOver(gameState)
            } else {
                gameState.xTurn = !gameState.xTurn
            }

            setGameState(gameState)
            io.to(clientRoomId[client.id]).emit("gameState", JSON.stringify(gameState))
        }
    }

    function handleDisconnect() {
        console.log(client.id + " disconnected")
        if (randomQueue.includes(client)) {
            randomQueue = randomQueue.filter(c => c.id !== client.id)
        }
        if (clientRoomId[client.id]) {
            const gameState = getGameState()
            if (gameState && gameState.status == -1) {
                gameState.status = (client.number == gameState.xNumber ? 1 : 0)
                gameState.playerDisconnected = true

                gameOver(gameState, client)

                setGameState(gameState)
                io.to(clientRoomId[client.id]).emit("gameState", JSON.stringify(gameState))
            }

            client.leave(clientRoomId[client.id])
            delete clientRoomId[client.id]
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
        gameState.dateStarted = Date.now()
        setGameState(gameState)

        client.join(roomId)
        client.number = 1
        io.to(roomId).emit("init", JSON.stringify(gameState))
    }

    function joinRandom() {
        if (randomQueue.length > 0) {
            const opponent = randomQueue.shift()
            const roomId = "g_" + createRoomCodeRandom()

            clientRoomId[client.id] = roomId
            clientRoomId[opponent.id] = roomId

            var gameState = createGameState()
            gameState.status = -1
            gameState.usernames[1] = client.request.session?.user?.username || ""
            gameState.usernames[0] = opponent.request.session?.user?.username || ""
            gameState.dateStarted = Date.now()
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

    function gameOver(gameState, extraClient = null) {
        const roomId = clientRoomId[client.id]
        var sockets = io.sockets.adapter.rooms.get(roomId)
        if (extraClient) sockets.add(extraClient.id)

        for (const clientId of sockets) {
            const clientSocket = io.sockets.sockets.get(clientId) || (extraClient?.id == clientId ? extraClient : null)

            updateStats(clientSocket, gameState, roomId)
        }

        storeGame(gameState, roomId)
        
        delete gameStates[roomId]
    }
})

function updateStats(client, gameState, roomId) {
    const user = client.request.session?.user

    if (user && (roomId.startsWith("g_") || roomId.startsWith("r_"))) {
        const isRanked = roomId.startsWith("r_")
        const isDraw = gameState.status == 2
        const isWinner = (client.number == gameState.xNumber ? 0 : 1) == gameState.status

        const update = {
            $inc: {
                [isRanked ? "rankedGames" : "randomGames"]: 1,
                ...(isDraw ? {} : isWinner 
                    ? { [isRanked ? "rankedWins" : "randomWins"]: 1, }
                    : { [isRanked ? "rankedLosses" : "randomLosses"]: 1 }
                )
            }
        }

        User.findByIdAndUpdate(user._id, update).then(() => {
            User.findById(user._id).then(dbUser => {
                const sessionUser = dbUser.toObject()
                delete sessionUser.passwordHash

                client.request.session.user = sessionUser
                client.request.session.save((err) => {
                    if (err) {
                        console.log(err)
                        return
                    }
                })
            })
        }).catch(err => console.log(err))
    }
}
async function storeGame(gameState, roomId) {
    const type = roomId.substring(0, 1)

    const user1 = await User.findOne({ username: gameState.usernames[0] })
    const user2 = await User.findOne({ username: gameState.usernames[1] })

    Game.create({
        player1: user1?._id || null,
        player2: user2?._id || null,

        xes: gameState.xes,
        os: gameState.os,
        xNumber: gameState.xNumber,
        type: type,
        last: gameState.last,
        winLine: gameState.winLine,

        status: gameState.status,
        playerDisconnected: gameState.playerDisconnected,

        dateStarted: gameState.dateStarted
    }).then((game) => {
        console.log(`Stored game ${game._id}`)
    }).catch(err => console.log(err))
}

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
        server.listen(process.env.PORT, "0.0.0.0", () => console.log(`Listening on port ${process.env.PORT}...`))
    })
    .catch(error => console.error("Could not connect to MongoDB... ", error))
