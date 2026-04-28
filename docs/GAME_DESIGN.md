# Game Design

## First Slice

- Show an 8 by 8 board.
- Use circular pieces as temporary art.
- Allow pieces to be dragged and dropped onto empty squares.
- Players take turns moving one of their own pieces horizontally or vertically through empty squares.
- Current-player pieces with legal moves are highlighted.
- Captures remove opponent pieces immediately.
- A player with no pieces left loses.

## Initial Placeholder Setup

- Light pieces start on columns 1 and 3.
- Dark pieces start on columns 6 and 8.
- The other columns start empty.

## Captures

- Custodian capture removes one or more enemy pieces when the moved piece traps them against another friendly piece in the same row or column.
- Intervention capture removes two enemy pieces when the moved piece lands between them in the same row or column.
- When custodian and intervention captures overlap in the same row or column, custodian capture takes precedence.
