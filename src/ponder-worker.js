self.window = self;

importScripts("rules.js", "game.js", "ai.js");

self.addEventListener("message", (event) => {
  const { id, board, maxDepth } = event.data;
  const game = { board };

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    const result = self.Makyek.chooseAiMoveAtDepth(game, depth, "light");

    self.postMessage({
      id,
      depth,
      result,
    });
  }
});
