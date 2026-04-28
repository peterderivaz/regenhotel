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
  statusElement.textContent = "Board reset. Light to move.";
  draw();
});

statusElement.textContent = "Light to move.";
draw();
