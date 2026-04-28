const boardElement = document.querySelector("#board");
const statusElement = document.querySelector("#status");
const resetButton = document.querySelector("#reset-board");
const aiEnabledInput = document.querySelector("#ai-enabled");
const aiTypeSelect = document.querySelector("#ai-type");
const aiDepthSelect = document.querySelector("#ai-depth");
const ponderEnabledInput = document.querySelector("#ponder-enabled");
const ponderDepthSelect = document.querySelector("#ponder-depth");

const game = window.Makyek.createGame();
let aiTimer = null;
let ponderTimer = null;
let ponderRunId = 0;
let analysisMoves = [];

fillDepthSelect(aiDepthSelect);
fillDepthSelect(ponderDepthSelect);

function draw() {
  window.Makyek.renderBoard({
    boardElement,
    statusElement,
    game,
    inputBlocked: isAiTurn(),
    analysisMoves,
    onMove: (from, to) => {
      clearPondering();
      const result = game.movePiece(from, to);
      statusElement.textContent = result.message;
      draw();
      scheduleAiMove();
      schedulePondering();
    },
  });
}

resetButton.addEventListener("click", () => {
  clearAiTimer();
  clearPondering();
  game.reset();
  statusElement.textContent = "Board reset. Light to move.";
  draw();
  scheduleAiMove();
  schedulePondering();
});

aiEnabledInput.addEventListener("change", () => {
  clearPondering();
  draw();
  scheduleAiMove();
  schedulePondering();
});

aiTypeSelect.addEventListener("change", scheduleAiMove);
aiDepthSelect.addEventListener("change", scheduleAiMove);
ponderEnabledInput.addEventListener("change", () => {
  clearPondering();
  draw();
  schedulePondering();
});
ponderDepthSelect.addEventListener("change", () => {
  clearPondering();
  draw();
  schedulePondering();
});

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
    schedulePondering();
  }, 250);
}

function clearAiTimer() {
  if (aiTimer) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
}

function schedulePondering() {
  clearPonderTimer();

  if (!shouldPonder()) {
    analysisMoves = [];
    draw();
    return;
  }

  const runId = ponderRunId;
  const maxDepth = Number(ponderDepthSelect.value);
  let depth = 1;

  statusElement.textContent = `Thinking for White to depth ${maxDepth}...`;

  function thinkAtNextDepth() {
    if (runId !== ponderRunId || !shouldPonder()) {
      return;
    }

    const result = window.Makyek.chooseAiMoveAtDepth(game, depth, "light");

    if (runId !== ponderRunId || !shouldPonder()) {
      return;
    }

    if (result) {
      analysisMoves = analysisMoves.filter((entry) => entry.depth !== depth);
      analysisMoves.push({
        depth,
        move: result.move,
        score: result.score,
      });
      statusElement.textContent = `White hint depth ${depth}: ${formatMove(result.move)}.`;
      draw();
    }

    depth += 1;

    if (depth <= maxDepth) {
      ponderTimer = window.setTimeout(thinkAtNextDepth, 25);
    }
  }

  ponderTimer = window.setTimeout(thinkAtNextDepth, 25);
}

function shouldPonder() {
  return ponderEnabledInput.checked && game.currentPlayer === "light" && !game.winner;
}

function clearPondering() {
  analysisMoves = [];
  ponderRunId += 1;
  clearPonderTimer();
}

function clearPonderTimer() {
  if (ponderTimer) {
    window.clearTimeout(ponderTimer);
    ponderTimer = null;
  }
}

function formatMove(move) {
  return `${window.Makyek.squareLabel(move.from)} to ${window.Makyek.squareLabel(move.to)}`;
}

function fillDepthSelect(selectElement) {
  const selectedValue = selectElement.value || "2";

  selectElement.replaceChildren();

  for (let depth = 1; depth <= 10; depth += 1) {
    const option = document.createElement("option");
    option.value = String(depth);
    option.textContent = `${depth} ply`;
    option.selected = String(depth) === selectedValue;
    selectElement.append(option);
  }
}

statusElement.textContent = "Light to move.";
draw();
scheduleAiMove();
schedulePondering();
