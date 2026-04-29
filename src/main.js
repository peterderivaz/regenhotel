const boardElement = document.querySelector("#board");
const playAreaElement = document.querySelector(".play-area");
const statusElement = document.querySelector("#status");
const gameHeaderElement = document.querySelector(".game-header");
const gameTitle = document.querySelector("#game-title");
const controlsElement = document.querySelector("#game-controls");
const resetButton = document.querySelector("#reset-board");
const moveListElement = document.querySelector("#move-list");
const levelSelect = document.querySelector("#level-select");
const aiEnabledInput = document.querySelector("#ai-enabled");
const aiTypeSelect = document.querySelector("#ai-type");
const aiDepthSelect = document.querySelector("#ai-depth");
const ponderEnabledInput = document.querySelector("#ponder-enabled");
const ponderDepthSelect = document.querySelector("#ponder-depth");
const cacheEnabledInput = document.querySelector("#cache-enabled");
const moveListEnabledInput = document.querySelector("#move-list-enabled");

const game = window.Makyek.createGame();
let aiTimer = null;
let ponderWorker = null;
let ponderRunId = 0;
let analysisMoves = [];
let analysisMoveScores = [];
let hoveredMove = null;
let levelComplete = false;

fillDepthSelect(aiDepthSelect);
fillDepthSelect(ponderDepthSelect);
fillLevelSelect(levelSelect);

gameTitle.addEventListener("click", toggleAdvancedControls);
gameTitle.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") {
    return;
  }

  event.preventDefault();
  toggleAdvancedControls();
});

function draw() {
  boardElement.classList.remove("start-screen");
  window.Makyek.renderBoard({
    boardElement,
    statusElement,
    game,
    inputBlocked: isAiTurn() || levelComplete,
    analysisMoves,
    hoverMoves: hoveredMove ? [{ move: hoveredMove }] : [],
    onMoveStart: clearPondering,
    onMove: async (from, to) => {
      clearPondering();
      const result = game.movePiece(from, to);
      statusElement.textContent = result.message;
      if (result.ok) {
        await window.Makyek.animateAiMove(boardElement, { from, to }, result.capturedSquares);
      }

      if (result.ok && completeLevelIfNoGoblinsRemain()) {
        return;
      }

      draw();
      scheduleAiMove();
      schedulePondering();
    },
  });

  if (levelComplete) {
    boardElement.append(createLevelCompletePrompt());
  }
}

resetButton.addEventListener("click", () => {
  clearAiTimer();
  clearPondering();
  levelComplete = false;
  game.reset();
  statusElement.textContent = game.helpText || "Board reset. Light to move.";
  draw();
  scheduleAiMove();
  schedulePondering();
});

levelSelect.addEventListener("change", async () => {
  await loadSelectedLevel();
});

aiEnabledInput.addEventListener("change", () => {
  clearPondering();
  draw();
  scheduleAiMove();
  schedulePondering();
});

aiTypeSelect.addEventListener("change", scheduleAiMove);
aiDepthSelect.addEventListener("change", scheduleAiMove);
cacheEnabledInput.addEventListener("change", () => {
  clearPondering();
  draw();
  scheduleAiMove();
  schedulePondering();
});
moveListEnabledInput.addEventListener("change", () => {
  renderMoveList(analysisMoveScores[0] ? analysisMoveScores[0].depth : null);
});
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
  return aiEnabledInput.checked && game.darkCanMove && game.currentPlayer === "dark" && !game.winner;
}

function scheduleAiMove() {
  clearAiTimer();

  if (!isAiTurn()) {
    return;
  }

  statusElement.textContent = "Black AI is thinking...";
  draw();

  aiTimer = window.setTimeout(async () => {
    const move = window.Makyek.chooseAiMove(game, {
      type: aiTypeSelect.value,
      depth: Number(aiDepthSelect.value),
      cacheEnabled: cacheEnabledInput.checked,
    });

    if (!move) {
      statusElement.textContent = "Black AI has no legal move.";
      draw();
      return;
    }

    const result = game.movePiece(move.from, move.to);
    statusElement.textContent = `Black AI: ${result.message}`;
    await window.Makyek.animateAiMove(boardElement, move, result.capturedSquares);

    if (result.ok && completeLevelIfNoGoblinsRemain()) {
      return;
    }

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
  clearPonderWorker();

  if (!shouldPonder()) {
    analysisMoves = [];
    analysisMoveScores = [];
    draw();
    renderMoveList();
    return;
  }

  const runId = ponderRunId;
  const maxDepth = Number(ponderDepthSelect.value);

  statusElement.textContent = `Thinking for White to depth ${maxDepth}...`;

  if (!window.Worker) {
    statusElement.textContent = "White thinking needs Web Worker support.";
    return;
  }

  try {
    ponderWorker = new Worker("src/ponder-worker.js");
  } catch {
    statusElement.textContent = "White thinking needs this page served by a local web server.";
    return;
  }

  ponderWorker.addEventListener("message", (event) => {
    const { id, depth, result, positionsPerSecond, cacheHits } = event.data;

    if (id !== ponderRunId || !shouldPonder()) {
      return;
    }

    if (!result) {
      return;
    }

    const bestMoves = result.moves || (result.move ? [result.move] : []);

    if (bestMoves.length === 0) {
      return;
    }

    analysisMoves = bestMoves.map((move) => ({
      depth,
      move,
      score: result.score,
    }));
    analysisMoveScores = (result.scoredMoves || bestMoves.map((move) => ({
      move,
      score: result.score,
    }))).map((entry) => ({
      depth,
      move: entry.move,
      score: entry.score,
      isBest: bestMoves.some((move) => sameMove(move, entry.move)),
    }));
    statusElement.textContent = `White hint depth ${depth}: ${formatMove(result.move || bestMoves[0])} (${formatCount(bestMoves.length)} best). ${formatRate(positionsPerSecond)} positions/s, ${formatCount(cacheHits)} cache hits.`;
    draw();
    renderMoveList(depth);
  });
  ponderWorker.addEventListener("error", () => {
    if (runId !== ponderRunId) {
      return;
    }

    clearPondering();
    statusElement.textContent = "White thinking worker failed to start.";
    draw();
  });
  ponderWorker.postMessage({
    id: runId,
    board: game.board,
    maxDepth,
    cacheEnabled: cacheEnabledInput.checked,
  });
}

function shouldPonder() {
  return ponderEnabledInput.checked && game.currentPlayer === "light" && !game.winner;
}

function clearPondering() {
  analysisMoves = [];
  analysisMoveScores = [];
  hoveredMove = null;
  ponderRunId += 1;
  clearPonderWorker();
  renderMoveList();
}

function clearPonderWorker() {
  if (ponderWorker) {
    ponderWorker.terminate();
    ponderWorker = null;
  }
}

function formatMove(move) {
  return `${window.Makyek.squareLabel(move.from)} to ${window.Makyek.squareLabel(move.to)}`;
}

function renderMoveList(depth) {
  moveListElement.classList.toggle("hidden", !moveListEnabledInput.checked);
  playAreaElement.classList.toggle("single-column", !moveListEnabledInput.checked);
  moveListElement.replaceChildren();

  if (!moveListEnabledInput.checked) {
    return;
  }

  const heading = document.createElement("h2");
  heading.textContent = depth ? `White depth ${depth}` : "White moves";
  moveListElement.append(heading);

  if (analysisMoveScores.length === 0) {
    const empty = document.createElement("p");
    empty.className = "move-list-empty";
    empty.textContent = "No scores yet.";
    moveListElement.append(empty);
    return;
  }

  const list = document.createElement("ol");
  analysisMoveScores.forEach((entry) => {
    const item = document.createElement("li");
    const moveText = document.createElement("span");
    const scoreText = document.createElement("strong");

    item.className = entry.isBest ? "best" : "";
    moveText.textContent = formatMove(entry.move);
    scoreText.textContent = formatScore(entry.score);
    item.addEventListener("mouseenter", () => {
      hoveredMove = entry.move;
      draw();
    });
    item.addEventListener("mouseleave", () => {
      hoveredMove = null;
      draw();
    });
    item.addEventListener("focus", () => {
      hoveredMove = entry.move;
      draw();
    });
    item.addEventListener("blur", () => {
      hoveredMove = null;
      draw();
    });
    item.tabIndex = 0;
    item.append(moveText, scoreText);
    list.append(item);
  });
  moveListElement.append(list);
}

function sameMove(firstMove, secondMove) {
  return (
    firstMove.from.row === secondMove.from.row &&
    firstMove.from.col === secondMove.from.col &&
    firstMove.to.row === secondMove.to.row &&
    firstMove.to.col === secondMove.to.col
  );
}

function formatScore(score) {
  if (score === Infinity) {
    return "win";
  }

  if (score === -Infinity) {
    return "loss";
  }

  return String(Math.round(score));
}

function formatRate(rate) {
  if (rate >= 1000000) {
    return `${(rate / 1000000).toFixed(1)}M`;
  }

  if (rate >= 1000) {
    return `${(rate / 1000).toFixed(1)}K`;
  }

  return String(Math.round(rate));
}

function formatCount(count) {
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }

  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }

  return String(count || 0);
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

function fillLevelSelect(selectElement) {
  selectElement.replaceChildren();

  window.Makyek.LEVEL_FILES.forEach((fileName, index) => {
    const option = document.createElement("option");
    option.value = fileName;
    option.textContent = `Level ${index + 1}`;
    selectElement.append(option);
  });
}

function completeLevelIfNoGoblinsRemain() {
  if (window.Makyek.countPieces(game.board, "dark") > 0) {
    return false;
  }

  levelComplete = true;
  clearAiTimer();
  clearPondering();
  statusElement.textContent = "Brilliant work. Click the board to continue to the next level.";
  draw();
  return true;
}

function createLevelCompletePrompt() {
  const prompt = document.createElement("button");
  const levelNumber = levelSelect.selectedIndex + 1;
  const hasNextLevel = levelSelect.selectedIndex < levelSelect.options.length - 1;

  prompt.className = "level-complete-prompt";
  prompt.type = "button";
  prompt.textContent = hasNextLevel
    ? `Level ${levelNumber} complete. Click for Level ${levelNumber + 1}.`
    : "All levels complete. Click to play again.";
  prompt.addEventListener("click", loadNextLevel);

  return prompt;
}

function showStartScreen() {
  clearAiTimer();
  clearPondering();
  levelComplete = false;
  gameHeaderElement.hidden = true;
  controlsElement.hidden = true;
  playAreaElement.classList.add("single-column");
  moveListElement.classList.add("hidden");
  boardElement.classList.add("start-screen");
  boardElement.style.setProperty("--board-aspect", "9 / 16");
  boardElement.style.setProperty("--board-fit-ratio", "0.5625");
  boardElement.replaceChildren(createStartButton());
  statusElement.textContent = "Click start to begin.";
}

function createStartButton() {
  const button = document.createElement("button");
  const image = document.createElement("img");
  const label = document.createElement("span");

  button.className = "start-button";
  button.type = "button";
  button.setAttribute("aria-label", "Start game");
  image.src = "assets/images/Poster_regen.png";
  image.alt = "Regen Hotel";
  label.textContent = "Click to start";
  button.append(image, label);
  button.addEventListener("click", startFirstLevel);

  return button;
}

async function startFirstLevel() {
  gameHeaderElement.hidden = false;
  controlsElement.hidden = false;
  levelSelect.selectedIndex = 0;
  await loadSelectedLevel();
}

async function loadNextLevel() {
  if (!levelComplete) {
    return;
  }

  const nextIndex = levelSelect.selectedIndex + 1;
  levelComplete = false;

  if (nextIndex < levelSelect.options.length) {
    levelSelect.selectedIndex = nextIndex;
  } else {
    levelSelect.selectedIndex = 0;
  }

  await loadSelectedLevel();
}

function toggleAdvancedControls() {
  const isCollapsed = controlsElement.classList.toggle("advanced-collapsed");
  gameTitle.setAttribute("aria-expanded", String(!isCollapsed));
}

async function loadSelectedLevel() {
  clearAiTimer();
  clearPondering();
  levelComplete = false;
  gameHeaderElement.hidden = false;
  controlsElement.hidden = false;
  statusElement.textContent = "Loading level...";

  try {
    const level = await window.Makyek.loadLevel(levelSelect.value);
    game.reset(level);
    setSelectValue(aiDepthSelect, level.aiDepth || 2);
    statusElement.textContent = level.helpText || "Level loaded. Light to move.";
  } catch (error) {
    game.reset(null);
    setSelectValue(aiDepthSelect, 2);
    statusElement.textContent = error.message || "Could not load level.";
  }

  draw();
  scheduleAiMove();
  schedulePondering();
}

function setSelectValue(selectElement, value) {
  const stringValue = String(value);

  if (![...selectElement.options].some((option) => option.value === stringValue)) {
    const option = document.createElement("option");
    option.value = stringValue;
    option.textContent = `${stringValue} ply`;
    selectElement.append(option);
  }

  selectElement.value = stringValue;
}

showStartScreen();
