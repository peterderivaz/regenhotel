const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#status");
const resetButton = document.querySelector("#reset-board");

const game = window.Makyek.createGame();

function draw() {
  window.Makyek.renderBoard({
    boardElement,
    statusElement,
    game,
    onMove: (from, to) => {
      const result = game.movePiece(from, to);
      statusElement.textContent = result.message;
      draw();
    },
  });
}

resetButton.addEventListener("click", () => {
  game.reset();
  statusElement.textContent = "Board reset. Drag a piece to an empty square.";
  draw();
});

draw();
