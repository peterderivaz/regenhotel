# Game Design

## First Slice

- Show an 8 by 8 board.
- Use circular pieces as temporary art.
- Allow pieces to be dragged and dropped onto empty squares.
- Players take turns moving one of their own pieces horizontally or vertically through empty squares.
- Current-player pieces with legal moves are highlighted.
- Captures remove opponent pieces immediately.
- A player with no pieces left loses.
- Black can optionally be controlled by AI.
- White can optionally show AI hints while thinking up to the selected depth.

## Initial Placeholder Setup

- Light pieces start on columns 1 and 3.
- Dark pieces start on columns 6 and 8.
- The other columns start empty.

## Captures

- Custodian capture removes one or more enemy pieces when the moved piece traps them against another friendly piece in the same row or column.
- Intervention capture removes two enemy pieces when the moved piece lands between them in the same row or column.
- When custodian and intervention captures overlap in the same row or column, custodian capture takes precedence.

## AI

- Random chooses any legal Black move.
- Greedy captures chooses the move with the strongest immediate capture and board score.
- Minimax searches ahead up to the selected depth, using material and mobility to score boards.
- White thinking shows green arrows for all tied best White moves at each completed depth and cancels when White moves.
- White thinking can optionally show a sorted move-score list beside the board.
- Minimax caching can reuse previously searched positions keyed by board, side to move, perspective, and remaining depth.
