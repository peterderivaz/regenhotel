window.Makyek = window.Makyek || {};

window.Makyek.renderBoard = function renderBoard({
  boardElement,
  statusElement,
  game,
  onMove,
  inputBlocked,
}) {
  boardElement.replaceChildren();

  const boardSize = window.Makyek.BOARD_SIZE;

  for (let row = 0; row < boardSize; row += 1) {
    for (let col = 0; col < boardSize; col += 1) {
      const square = createSquare(row, col);
      const piece = game.board[row][col];
      const canMove = !inputBlocked && piece && game.canMoveFrom({ row, col });

      addDropHandlers(square, onMove, inputBlocked);

      if (piece) {
        square.append(createPiece(piece, row, col, statusElement, canMove));
      }

      boardElement.append(square);
    }
  }
};

function createSquare(row, col) {
  const square = document.createElement("div");
  square.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;
  square.dataset.row = row;
  square.dataset.col = col;
  square.setAttribute("role", "gridcell");
  square.setAttribute("aria-label", squareLabel(row, col));
  return square;
}

function createPiece(piece, row, col, statusElement, canMove) {
  const pieceElement = document.createElement("button");
  pieceElement.className = `piece ${piece}-piece${canMove ? " movable" : ""}`;
  pieceElement.type = "button";
  pieceElement.draggable = canMove;
  pieceElement.disabled = !canMove;
  pieceElement.dataset.row = row;
  pieceElement.dataset.col = col;
  pieceElement.setAttribute("aria-label", `${piece} piece on ${squareLabel(row, col)}`);
  pieceElement.title = `${piece} piece`;

  pieceElement.addEventListener("dragstart", (event) => {
    if (!canMove) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("application/json", JSON.stringify({ row, col }));
    pieceElement.classList.add("dragging");
    statusElement.textContent = `Dragging ${piece} piece from ${squareLabel(row, col)}.`;
  });

  pieceElement.addEventListener("dragend", () => {
    pieceElement.classList.remove("dragging");
  });

  return pieceElement;
}

function addDropHandlers(square, onMove, inputBlocked) {
  square.addEventListener("dragover", (event) => {
    if (inputBlocked) {
      return;
    }

    event.preventDefault();
    square.classList.add("drop-target");
  });

  square.addEventListener("dragleave", () => {
    square.classList.remove("drop-target");
  });

  square.addEventListener("drop", (event) => {
    if (inputBlocked) {
      return;
    }

    event.preventDefault();
    square.classList.remove("drop-target");

    const from = readDragData(event);
    const to = {
      row: Number(square.dataset.row),
      col: Number(square.dataset.col),
    };

    if (from) {
      onMove(from, to);
    }
  });
}

function readDragData(event) {
  const dragData = event.dataTransfer.getData("application/json");

  if (!dragData) {
    return null;
  }

  try {
    return JSON.parse(dragData);
  } catch {
    return null;
  }
}

function squareLabel(row, col) {
  return `${String.fromCharCode(65 + col)}${window.Makyek.BOARD_SIZE - row}`;
}
