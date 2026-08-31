# Chess Openings Trainer — Next Steps

Status: working note  
Date: 2026-08-31  
Baseline: v0.5 (`fb3a743`)

This note records the immediate direction after v0.5 without changing the reboot product principles in `SPEC_REBOOT.md`.

## Baseline confirmed

- Current `main` is still v0.5 — Experience & sound.
- The Italian playable has 26 graph nodes and 13 learner-decision positions, including tested transpositions.
- The adaptive Session Director, per-position mastery, spaced-review tiers, lives, gold, hints, streaks, master challenge and cosmetics are already implemented.
- Runtime Stockfish remains planned as the v0.6 consultant for classifying legal moves outside the authored repertoire.
- The current board still supports both click-to-move and drag-and-drop. The latest product decision is to remove drag-and-drop and keep click-to-move only.
- The current piece rendering uses the `react-chessboard` default piece set with theme-specific shadows. Audio is procedural Web Audio rather than external sound files.

## New direction to investigate: frequency-aware repertoire construction

A useful idea observed in the OpenChess project/video is to build opening coverage from the moves opponents at the learner's actual rating play most frequently, instead of copying a grandmaster repertoire.

We do **not** depend on OpenChess code and should not attempt to clone its product. The interesting mechanism can be implemented independently from public/open components:

1. start from a position and learner rating/rating band;
2. query Lichess opening statistics for opponent move frequencies at that level;
3. use Stockfish to propose/evaluate reasonable learner responses;
4. allocate a fixed branch/line budget according to encounter frequency and practical importance;
5. recursively grow the repertoire where the learner is most likely to encounter positions;
6. feed the resulting frequency/importance metadata into the existing curriculum and Session Director.

This complements the current adaptive trainer rather than replacing it:

- **repertoire construction** decides what material deserves to exist/unlock for a given player level;
- **Session Director** decides what already-authored/unlocked material the player should see now, based on mastery, review urgency and surprise.

## Ordered next steps

### 1. Playtest the existing v0.5 first

Before adding architecture, run the current build and record only concrete issues:

- sound levels and sound character;
- timing of authored mistake consequences;
- master-challenge pacing;
- gold earning versus hint usefulness;
- mastery gains/review intervals;
- awkward or dubious Italian teaching positions.

Do not tune from theory alone.

### 2. Simplify board input to click-only

Remove drag-and-drop from `BoardView` while preserving:

- click piece → click destination;
- selected-square highlight;
- legal-destination feedback;
- last-move feedback;
- keyboard/touch portability where practical later.

This supersedes the earlier decision that click and drag were both first-class interactions.

### 3. Research piece sets and sounds before replacing assets

Do not commit another visual/audio set blindly.

First collect several concrete candidates that can be previewed and compare:

- visual quality/readability;
- licence and attribution requirements;
- vector/raster format and ease of integration;
- consistency across all 12 chess pieces;
- sound quality for move, capture, correct/error, hint and reward events;
- whether the assets are truly open source / redistributable.

The current procedural sounds and default pieces remain the fallback until a clearly better open option is selected.

### 4. Build a small repertoire-builder POC outside the gameplay loop

Keep this isolated from React and from the live trainer initially.

POC inputs:

- learner side;
- opening seed/start position;
- target Elo or rating band;
- branch/line budget;
- maximum depth;
- optional minimum opponent-frequency threshold.

POC outputs:

- generated tree/graph proposal;
- opponent move frequencies by position;
- proposed learner move(s) with Stockfish evaluation;
- allocated branch budget;
- provenance/source metadata so generated content can be inspected and reproduced.

Start only with White `1.e4` leading toward the Italian family. Do not expand to a general repertoire generator until the numbers and generated tree make practical sense.

### 5. Validate the allocation algorithm before integrating it

The first algorithm can be deliberately simple and deterministic.

Candidate principle:

`branch priority = encounter frequency × practical importance × coverage need`

Questions to test:

- direct proportional allocation versus minimum coverage for rare-but-important replies;
- how much rating-band smoothing is needed when Lichess samples are small;
- whether to separate opening popularity from learner mastery;
- how to handle transpositions without double-counting lines;
- when to stop expanding a branch;
- whether Stockfish's top move is always the best pedagogical/repertoire choice.

Stockfish should propose/validate choices, not automatically define pedagogy.

### 6. Integrate only after the POC is convincing

If the POC is useful, extend static opening metadata with measured fields such as:

- source population/rating band;
- opponent move count/frequency;
- sample size/confidence;
- generated practical importance;
- data refresh timestamp/version.

Then let the existing Session Director use measured practical frequency as one input alongside mastery, overdue review, previous failures, curriculum target and controlled surprise.

### 7. Keep the two Stockfish roles separate

There are potentially two uses of Stockfish:

- **offline/authoring:** help construct and validate a frequency-aware repertoire;
- **runtime v0.6 consultant:** classify a learner's legal move that is not authored in the lesson.

They should share evaluation concepts where useful but should not be coupled architecturally.

## Explicit non-goals for the next iteration

- cloning OpenChess;
- importing thousands of lines immediately;
- replacing authored pedagogy with Stockfish output;
- supporting many openings before the Italian POC is validated;
- adding accounts/backend/cloud sync;
- replacing the current mastery/review engine with a more complex spaced-repetition algorithm before real playtesting shows a need.

## Decision checkpoint

After the v0.5 playtest and the small frequency-aware repertoire POC, decide whether the next implementation milestone should be:

- **v0.6A:** click-only input + selected asset improvements + repertoire-frequency metadata/authoring tooling; then
- **v0.6B:** runtime Stockfish consultant;

or whether to keep the original single v0.6 Stockfish milestone and treat repertoire construction as separate offline tooling.
