window.Makyek = window.Makyek || {};

window.Makyek.chooseAiMove = function chooseAiMove(game, options) {
  const player = "dark";
  const board = game.board;
  const moves = window.Makyek.getAllLegalMoves(board, player);

  if (moves.length === 0) {
    return null;
  }

  if (options.type === "random") {
    return moves[Math.floor(Math.random() * moves.length)];
  }

  if (options.type === "greedy") {
    return chooseGreedyMove(board, moves, player);
  }

  return chooseMinimaxMove(board, moves, player, options.depth);
};

function chooseGreedyMove(board, moves, player) {
  return bestMoveByScore(moves, (move) => {
    const result = window.Makyek.applyMove(board, move, player);
    return result.captured * 1000 + evaluateBoard(result.board, player);
  });
}

function chooseMinimaxMove(board, moves, player, depth) {
  const searchDepth = Math.max(1, Math.min(Number(depth) || 1, 3));
  const orderedMoves = orderMoves(board, moves, player);

  return bestMoveByScore(orderedMoves, (move) => {
    const result = window.Makyek.applyMove(board, move, player);

    if (result.winner) {
      return Infinity;
    }

    return minimax(
      result.board,
      window.Makyek.otherPlayer(player),
      player,
      searchDepth - 1,
      -Infinity,
      Infinity,
    );
  });
}

function minimax(board, playerToMove, maximizingPlayer, depth, alpha, beta) {
  const opponent = window.Makyek.otherPlayer(maximizingPlayer);

  if (window.Makyek.countPieces(board, opponent) === 0) {
    return Infinity;
  }

  if (window.Makyek.countPieces(board, maximizingPlayer) === 0) {
    return -Infinity;
  }

  if (depth === 0) {
    return evaluateBoard(board, maximizingPlayer);
  }

  const moves = orderMoves(
    board,
    window.Makyek.getAllLegalMoves(board, playerToMove),
    playerToMove,
  );

  if (moves.length === 0) {
    return evaluateBoard(board, maximizingPlayer);
  }

  const limitedMoves = moves.slice(0, 24);
  const isMaximizing = playerToMove === maximizingPlayer;
  let bestScore = isMaximizing ? -Infinity : Infinity;

  limitedMoves.forEach((move) => {
    if (alpha >= beta) {
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
        );

    if (isMaximizing) {
      bestScore = Math.max(bestScore, score);
      alpha = Math.max(alpha, score);
    } else {
      bestScore = Math.min(bestScore, score);
      beta = Math.min(beta, score);
    }
  });

  return bestScore;
}

function bestMoveByScore(moves, scoreMove) {
  let bestMove = moves[0];
  let bestScore = -Infinity;

  moves.forEach((move) => {
    const score = scoreMove(move);

    if (score > bestScore || (score === bestScore && Math.random() < 0.5)) {
      bestMove = move;
      bestScore = score;
    }
  });

  return bestMove;
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
