window.Makyek = window.Makyek || {};

window.Makyek.renderBoard = function renderBoard({
  boardElement,
  statusElement,
  game,
  onMove,
  onMoveStart,
  inputBlocked,
  analysisMoves = [],
  hoverMoves = [],
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
        square.append(createPiece(piece, row, col, statusElement, canMove, onMoveStart));
      }

      boardElement.append(square);
    }
  }

  if (analysisMoves.length > 0) {
    boardElement.append(createMoveArrows(analysisMoves, "move-arrows"));
  }

  if (hoverMoves.length > 0) {
    boardElement.append(createMoveArrows(hoverMoves, "move-arrows hover-arrows"));
  }
};

window.Makyek.animateAiMove = function animateAiMove(boardElement, move, capturedSquares = []) {
  const fromSquare = findSquare(boardElement, move.from);
  const toSquare = findSquare(boardElement, move.to);
  const movingPiece = fromSquare ? fromSquare.querySelector(".piece") : null;

  if (!fromSquare || !toSquare || !movingPiece) {
    return Promise.resolve();
  }

  const fromRect = movingPiece.getBoundingClientRect();
  const toRect = toSquare.getBoundingClientRect();
  const boardRect = boardElement.getBoundingClientRect();
  const clone = movingPiece.cloneNode(true);
  const deltaX = toRect.left + toRect.width / 2 - (fromRect.left + fromRect.width / 2);
  const deltaY = toRect.top + toRect.height / 2 - (fromRect.top + fromRect.height / 2);

  clone.classList.add("ai-moving-piece");
  clone.style.left = `${fromRect.left - boardRect.left}px`;
  clone.style.top = `${fromRect.top - boardRect.top}px`;
  clone.style.width = `${fromRect.width}px`;
  clone.style.height = `${fromRect.height}px`;
  movingPiece.classList.add("ai-source-piece");
  boardElement.append(clone);

  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      clone.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
    });

    window.setTimeout(() => {
      markCapturedPieces(boardElement, capturedSquares);
    }, 170);

    window.setTimeout(() => {
      movingPiece.classList.remove("ai-source-piece");
      clone.remove();
      resolve();
    }, capturedSquares.length > 0 ? 560 : 360);
  });
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

function createPiece(piece, row, col, statusElement, canMove, onMoveStart) {
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
    if (onMoveStart) {
      onMoveStart();
    }
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

function findSquare(boardElement, square) {
  return boardElement.querySelector(`[data-row="${square.row}"][data-col="${square.col}"]`);
}

function markCapturedPieces(boardElement, capturedSquares) {
  capturedSquares.forEach((square) => {
    const capturedSquare = findSquare(boardElement, square);
    const capturedPiece = capturedSquare ? capturedSquare.querySelector(".piece") : null;

    if (capturedSquare) {
      capturedSquare.classList.add("capture-square");
    }

    if (capturedPiece) {
      capturedPiece.classList.add("captured-piece");
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

function createMoveArrows(analysisMoves, className) {
  const svgNamespace = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(svgNamespace, "svg");
  const defs = document.createElementNS(svgNamespace, "defs");
  const marker = document.createElementNS(svgNamespace, "marker");
  const markerPath = document.createElementNS(svgNamespace, "path");

  className.split(" ").forEach((name) => {
    svg.classList.add(name);
  });
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("preserveAspectRatio", "none");
  svg.setAttribute("width", "100%");
  svg.setAttribute("height", "100%");
  marker.setAttribute("id", "best-move-arrowhead");
  marker.setAttribute("markerWidth", "5");
  marker.setAttribute("markerHeight", "5");
  marker.setAttribute("refX", "4");
  marker.setAttribute("refY", "2.5");
  marker.setAttribute("orient", "auto");
  markerPath.setAttribute("d", "M0,0 L5,2.5 L0,5 Z");
  markerPath.setAttribute("fill", "#16843a");
  marker.append(markerPath);
  defs.append(marker);
  svg.append(defs);

  analysisMoves.forEach((entry) => {
    const line = document.createElementNS(svgNamespace, "line");
    const title = document.createElementNS(svgNamespace, "title");
    const from = squareCenter(entry.move.from);
    const to = squareCenter(entry.move.to);

    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y);
    line.setAttribute("stroke", "#16843a");
    line.setAttribute("stroke-width", "1.8");
    line.setAttribute("stroke-linecap", "round");
    line.setAttribute("opacity", "0.86");
    line.setAttribute("marker-end", "url(#best-move-arrowhead)");
    title.textContent = `Depth ${entry.depth}: ${squareLabel(entry.move.from.row, entry.move.from.col)} to ${squareLabel(entry.move.to.row, entry.move.to.col)}`;
    line.append(title);
    svg.append(line);
  });

  return svg;
}

function squareCenter(square) {
  const boardSize = window.Makyek.BOARD_SIZE;

  return {
    x: ((square.col + 0.5) / boardSize) * 100,
    y: ((square.row + 0.5) / boardSize) * 100,
  };
}

function squareLabel(row, col) {
  return `${String.fromCharCode(65 + col)}${window.Makyek.BOARD_SIZE - row}`;
}
