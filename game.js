module.exports = { checkWin, checkTaken, createGameState, moveErrorMsg }

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
    return [...gameState.xes, ...gameState.os].some(p => p.x === pos.x && p.y === pos.y)
}

function moveErrorMsg({ x, y }, gameState) {
    const allMoves = [...gameState.xes, ...gameState.os]

    if (x >= 0 && x < 20 && y >= 0 && y < 20) return ""
    if (!allMoves.some(p => Math.abs(p.x - x) <= 5 && Math.abs(p.y - y) <= 5)) return "Stone too far away"

    return ""   
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