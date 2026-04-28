window.Makyek = window.Makyek || {};

window.Makyek.createGame = function createGame() {
  let board = window.Makyek.createInitialBoard();

  return {
    get board() {
      return board;
    },

    reset() {
      board = window.Makyek.createInitialBoard();
    },

    movePiece(from, to) {
      if (!isInsideBoard(from) || !isInsideBoard(to)) {
        return { ok: false, message: "That move is outside the board." };
      }

      const piece = board[from.row][from.col];
      if (!piece) {
        return { ok: false, message: "Choose a square with a piece." };
      }

      if (board[to.row][to.col]) {
        return { ok: false, message: "Drop onto an empty square." };
      }

      board[to.row][to.col] = piece;
      board[from.row][from.col] = null;

      const fromLabel = squareLabel(from);
      const toLabel = squareLabel(to);
      return { ok: true, message: `Moved ${piece} from ${fromLabel} to ${toLabel}.` };
    },
  };
};

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

function squareLabel(square) {
  return `${String.fromCharCode(65 + square.col)}${window.Makyek.BOARD_SIZE - square.row}`;
}
