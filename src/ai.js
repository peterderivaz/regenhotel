window.Makyek = window.Makyek || {};

window.Makyek.chooseAiMove = function chooseAiMove(game, options) {
  const player = "dark";
  const board = game.board;
  const moves = window.Makyek.getAllLegalMoves(board, player);
  const cache = options.cacheEnabled ? new Map() : null;

  if (moves.length === 0) {
    return null;
  }

  if (options.type === "random") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (options.type === "greedy") {
    return chooseGreedyMove(board, moves, player);
  }

  return chooseMinimaxMove(board, moves, player, options.depth, cache);
};

window.Makyek.chooseAiMoveAtDepth = function chooseAiMoveAtDepth(
  game,
  depth,
  player = "dark",
  stats,
  cache,
) {
  const board = game.board;
  const moves = window.Makyek.getAllLegalMoves(board, player);

  if (moves.length === 0) {
    return null;
  }

  return chooseMinimaxResult(board, moves, player, depth, stats, cache);
};

function chooseGreedyMove(board, moves, player) {
  return bestMoveByScore(moves, (move) => {
    const result = window.Makyek.applyMove(board, move, player);
    return result.captured * 1000 + evaluateBoard(result.board, player);
  });
}

function chooseMinimaxMove(board, moves, player, depth, cache) {
  const result = chooseMinimaxResult(board, moves, player, depth, null, cache);
  return result ? result.move : null;
}

function chooseMinimaxResult(board, moves, player, depth, stats, cache) {
  const searchDepth = Math.max(1, Math.min(Number(depth) || 1, 10));
  const orderedMoves = orderMoves(board, moves, player);

  return bestResultByScore(orderedMoves, (move) => {
    const result = window.Makyek.applyMove(board, move, player);

    if (result.winner) {
      countPosition(stats);
      return Infinity;
    }

    return minimax(
      result.board,
      window.Makyek.otherPlayer(player),
      player,
      searchDepth - 1,
      -Infinity,
      Infinity,
      stats,
      cache,
    );
  });
}

function minimax(board, playerToMove, maximizingPlayer, depth, alpha, beta, stats, cache) {
  const cacheKey = cache ? makeCacheKey(board, playerToMove, maximizingPlayer, depth) : null;

  if (cacheKey && cache.has(cacheKey)) {
    countCacheHit(stats);
    return cache.get(cacheKey);
  }

  countPosition(stats);

  const opponent = window.Makyek.otherPlayer(maximizingPlayer);

  if (window.Makyek.countPieces(board, opponent) === 0) {
    return rememberScore(cache, cacheKey, Infinity);
  }

  if (window.Makyek.countPieces(board, maximizingPlayer) === 0) {
    return rememberScore(cache, cacheKey, -Infinity);
  }

  if (depth === 0) {
    return rememberScore(cache, cacheKey, evaluateBoard(board, maximizingPlayer));
  }

  const moves = orderMoves(
    board,
    window.Makyek.getAllLegalMoves(board, playerToMove),
    playerToMove,
  );

  if (moves.length === 0) {
    return rememberScore(cache, cacheKey, evaluateBoard(board, maximizingPlayer));
  }

  const limitedMoves = moves.slice(0, 24);
  const isMaximizing = playerToMove === maximizingPlayer;
  let bestScore = isMaximizing ? -Infinity : Infinity;
  let searchedAllMoves = true;

  limitedMoves.forEach((move) => {
    if (alpha >= beta) {
      searchedAllMoves = false;
      return;
    }

    const result = window.Makyek.applyMove(board, move, playerToMove);
    const score = result.winner
      ? winnerScore(result.winner, maximizingPlayer, depth)
      : minimax(
          result.board,
          window.Makyek.otherPlayer(playerToMove),
          maximizingPlayer,
          depth - 1,
          alpha,
          beta,
          stats,
          cache,
        );

    if (isMaximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }
  });

  if (searchedAllMoves && limitedMoves.length === moves.length) {
    rememberScore(cache, cacheKey, bestScore);
  }

  return bestScore;
}

function countPosition(stats) {
  if (stats) {
    stats.positions += 1;
  }
}

function countCacheHit(stats) {
  if (stats) {
    stats.cacheHits += 1;
  }
}

function rememberScore(cache, cacheKey, score) {
  if (cacheKey) {
    cache.set(cacheKey, score);
  }

  return score;
}

function makeCacheKey(board, playerToMove, maximizingPlayer, depth) {
  return `${playerToMove[0]}${maximizingPlayer[0]}${depth}|${encodeBoard(board)}`;
}

function encodeBoard(board) {
  const cells = [];

  board.forEach((row) => {
    row.forEach((piece) => {
      cells.push(piece ? piece[0] : ".");
    });
  });

  return cells.join("");
}

function bestMoveByScore(moves, scoreMove) {
  const result = bestResultByScore(moves, scoreMove);
  return result ? result.move : null;
}

function bestResultByScore(moves, scoreMove) {
  let bestMove = moves[0];
  let bestScore = -Infinity;

  moves.forEach((move) => {
    const score = scoreMove(move);

    if (score > bestScore || (score === bestScore && Math.random() < 0.5)) {
      bestMove = move;
      bestScore = score;
    }
  });

  return {
    move: bestMove,
    score: bestScore,
  };
}

function orderMoves(board, moves, player) {
  return moves
    .map((move) => {
      const result = window.Makyek.applyMove(board, move, player);

      return {
        move,
        score: result.captured * 1000 + evaluateBoard(result.board, player),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.move);
}

function evaluateBoard(board, player) {
  const opponent = window.Makyek.otherPlayer(player);
  const material = window.Makyek.countPieces(board, player) - window.Makyek.countPieces(board, opponent);
  const mobility =
    window.Makyek.getAllLegalMoves(board, player).length -
    window.Makyek.getAllLegalMoves(board, opponent).length;

  return material * 100 + mobility * 3;
}

function winnerScore(winner, maximizingPlayer, depth) {
  const score = 100000 + depth;
  return winner === maximizingPlayer ? score : -score;
}
