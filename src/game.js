window.Makyek = window.Makyek || {};

window.Makyek.createGame = function createGame() {
  let board = window.Makyek.createInitialBoard();
  let currentPlayer = "light";
  let winner = null;

  return {
    get board() {
      return board;
    },

    get currentPlayer() {
      return currentPlayer;
    },

    get winner() {
      return winner;
    },

    reset() {
      board = window.Makyek.createInitialBoard();
      currentPlayer = "light";
      winner = null;
    },

    canMoveFrom(from) {
      if (!isInsideBoard(from) || winner) {
        return false;
      }

      const piece = board[from.row][from.col];
      if (piece !== currentPlayer) {
        return false;
      }

      return getLegalMoves(board, from).length > 0;
    },

    movePiece(from, to) {
      if (winner) {
        return { ok: false, message: `${playerName(winner)} has already won.` };
      }

      if (!isInsideBoard(from) || !isInsideBoard(to)) {
        return { ok: false, message: "That move is outside the board." };
      }

      const piece = board[from.row][from.col];
      if (!piece) {
        return { ok: false, message: "Choose a square with a piece." };
      }

      if (piece !== currentPlayer) {
        return { ok: false, message: `${playerName(currentPlayer)} to move.` };
      }

      const validation = validateRookMove(board, from, to);
      if (!validation.ok) {
        return validation;
      }

      board[to.row][to.col] = piece;
      board[from.row][from.col] = null;

      const captured = capturePieces(board, to, piece);
      const fromLabel = squareLabel(from);
      const toLabel = squareLabel(to);
      const opponent = otherPlayer(piece);

      if (countPieces(board, opponent) === 0) {
        winner = piece;
        return {
          ok: true,
          message: `${playerName(piece)} moved from ${fromLabel} to ${toLabel}, ${captureMessage(captured)}, and won.`,
        };
      }

      currentPlayer = opponent;

      return {
        ok: true,
        message: `${playerName(piece)} moved from ${fromLabel} to ${toLabel} and ${captureMessage(captured)}. ${playerName(currentPlayer)} to move.`,
      };
    },
  };
};

const DIRECTIONS = [
  { row: -1, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: -1 },
  { row: 0, col: 1 },
];

const AXES = [
  [
    { row: 0, col: -1 },
    { row: 0, col: 1 },
  ],
  [
    { row: -1, col: 0 },
    { row: 1, col: 0 },
  ],
];

function getLegalMoves(board, from) {
  const moves = [];

  DIRECTIONS.forEach((direction) => {
    let row = from.row + direction.row;
    let col = from.col + direction.col;

    while (isInsideBoard({ row, col }) && !board[row][col]) {
      moves.push({ row, col });
      row += direction.row;
      col += direction.col;
    }
  });

  return moves;
}

function validateRookMove(board, from, to) {
  if (from.row === to.row && from.col === to.col) {
    return { ok: false, message: "Move to a different square." };
  }

  if (board[to.row][to.col]) {
    return { ok: false, message: "Drop onto an empty square." };
  }

  const isHorizontal = from.row === to.row;
  const isVertical = from.col === to.col;

  if (!isHorizontal && !isVertical) {
    return { ok: false, message: "Move horizontally or vertically." };
  }

  const rowStep = Math.sign(to.row - from.row);
  const colStep = Math.sign(to.col - from.col);
  let row = from.row + rowStep;
  let col = from.col + colStep;

  while (row !== to.row || col !== to.col) {
    if (board[row][col]) {
      return { ok: false, message: "Pieces cannot move through other pieces." };
    }

    row += rowStep;
    col += colStep;
  }

  return { ok: true };
}

function capturePieces(board, movedTo, player) {
  const captured = [];

  AXES.forEach((axis) => {
    const custodianCaptures = getCustodianCaptures(board, movedTo, player, axis);

    if (custodianCaptures.length > 0) {
      captured.push(...custodianCaptures);
      return;
    }

    captured.push(...getInterventionCaptures(board, movedTo, player, axis));
  });

  captured.forEach((square) => {
    board[square.row][square.col] = null;
  });

  return captured.length;
}

function getCustodianCaptures(board, movedTo, player, axis) {
  const captures = [];

  axis.forEach((direction) => {
    captures.push(...getCustodianLineCaptures(board, movedTo, player, direction));
  });

  return captures;
}

function getCustodianLineCaptures(board, movedTo, player, direction) {
  const opponent = otherPlayer(player);
  const captures = [];
  let square = offsetSquare(movedTo, direction, 1);

  while (isInsideBoard(square) && board[square.row][square.col] === opponent) {
    captures.push(square);
    square = offsetSquare(square, direction, 1);
  }

  if (
    captures.length > 0 &&
    isInsideBoard(square) &&
    board[square.row][square.col] === player
  ) {
    return captures;
  }

  return [];
}

function getInterventionCaptures(board, movedTo, player, axis) {
  const opponent = otherPlayer(player);
  const firstEnemy = offsetSquare(movedTo, axis[0], 1);
  const secondEnemy = offsetSquare(movedTo, axis[1], 1);

  if (
    isInsideBoard(firstEnemy) &&
    isInsideBoard(secondEnemy) &&
    board[firstEnemy.row][firstEnemy.col] === opponent &&
    board[secondEnemy.row][secondEnemy.col] === opponent
  ) {
    return [firstEnemy, secondEnemy];
  }

  return [];
}

function offsetSquare(square, direction, distance) {
  return {
    row: square.row + direction.row * distance,
    col: square.col + direction.col * distance,
  };
}

function countPieces(board, player) {
  return board.reduce(
    (total, row) => total + row.filter((piece) => piece === player).length,
    0,
  );
}

function isInsideBoard(square) {
  const boardSize = window.Makyek.BOARD_SIZE;

  return (
    square &&
    square.row >= 0 &&
    square.row < boardSize &&
    square.col >= 0 &&
    square.col < boardSize
  );
}

function otherPlayer(player) {
  return player === "light" ? "dark" : "light";
}

function playerName(player) {
  return player === "light" ? "Light" : "Dark";
}

function captureMessage(captured) {
  return `captured ${captured} ${captured === 1 ? "piece" : "pieces"}`;
}

function squareLabel(square) {
  return `${String.fromCharCode(65 + square.col)}${window.Makyek.BOARD_SIZE - square.row}`;
}
