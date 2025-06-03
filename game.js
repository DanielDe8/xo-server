module.exports = { checkWin, checkTaken, createGameState }

function checkWin(gameState) {
    var currentMoves = gameState.xTurn ? gameState.xes : gameState.os
    var currentPlayer = gameState.xTurn ? 0 : 1
    var dirs = [
        { x: 1, y: 0 },
        { x: 0, y: 1 },
        { x: 1, y: 1 },
        { x: 1, y: -1 }
    ]

    for (var dir of dirs) {
        if (count(dir.x, dir.y) + count(-dir.x, -dir.y) + 1 >= 5) gameState.status = currentPlayer
    }

    function count(dx, dy, x = gameState.last.x, y = gameState.last.y, tmpCount = 0) {
        for (move of currentMoves) {
            if (x + dx == move.x && y + dy == move.y) return count(dx, dy, x + dx, y + dy, tmpCount + 1)
        }
        return tmpCount
    }
}

function checkTaken(pos, gameState) {
    for (xx of gameState.xes) {
        if (pos.x == xx.x && pos.y == xx.y) return true
    }
    for (o of gameState.os) {
        if (pos.x == o.x && pos.y == o.y) return true
    }
    return false
}

function createGameState() {
    return {
        xes: [],
        os: [],
        last: { x: 0, y: 0, exists: false },
        xTurn: true,
        xNumber: Math.round(Math.random()),
        status: -2,
        usernames: [ "", "" ]
    }
}