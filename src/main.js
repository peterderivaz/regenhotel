const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#status");
const resetButton = document.querySelector("#reset-board");
const aiEnabledInput = document.querySelector("#ai-enabled");
const aiTypeSelect = document.querySelector("#ai-type");
const aiDepthSelect = document.querySelector("#ai-depth");

const game = window.Makyek.createGame();
let aiTimer = null;

function draw() {
  window.Makyek.renderBoard({
    boardElement,
    statusElement,
    game,
    inputBlocked: isAiTurn(),
    onMove: (from, to) => {
      const result = game.movePiece(from, to);
      statusElement.textContent = result.message;
      draw();
      scheduleAiMove();
    },
  });
}

resetButton.addEventListener("click", () => {
  clearAiTimer();
  game.reset();
  statusElement.textContent = "Board reset. Light to move.";
  draw();
  scheduleAiMove();
});

aiEnabledInput.addEventListener("change", () => {
  draw();
  scheduleAiMove();
});

aiTypeSelect.addEventListener("change", scheduleAiMove);
aiDepthSelect.addEventListener("change", scheduleAiMove);

function isAiTurn() {
  return aiEnabledInput.checked && game.currentPlayer === "dark" && !game.winner;
}

function scheduleAiMove() {
  clearAiTimer();

  if (!isAiTurn()) {
    return;
  }

  statusElement.textContent = "Black AI is thinking...";
  draw();

  aiTimer = window.setTimeout(() => {
    const move = window.Makyek.chooseAiMove(game, {
      type: aiTypeSelect.value,
      depth: Number(aiDepthSelect.value),
    });

    if (!move) {
      statusElement.textContent = "Black AI has no legal move.";
      draw();
      return;
    }

    const result = game.movePiece(move.from, move.to);
    statusElement.textContent = `Black AI: ${result.message}`;
    draw();
    scheduleAiMove();
  }, 250);
}

function clearAiTimer() {
  if (aiTimer) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

statusElement.textContent = "Light to move.";
draw();
scheduleAiMove();
