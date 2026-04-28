window.Makyek = window.Makyek || {};

window.Makyek.BOARD_SIZE = 8;

window.Makyek.createInitialBoard = function createInitialBoard() {
  const boardSize = window.Makyek.BOARD_SIZE;

  return Array.from({ length: boardSize }, (_, row) =>
    Array.from({ length: boardSize }, (_, col) => createInitialPiece(row, col)),
  );
};

function createInitialPiece(row, col) {
  if (row < 2) {
    return "dark";
  }

  if (row > 5) {
    return "light";
  }

  return null;
}
