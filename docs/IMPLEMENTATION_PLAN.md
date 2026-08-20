# Chess Openings Trainer — Implementation Plan

Status: implementation reference  
Date: 2026-08-19  
Source product spec: `docs/SPEC_REBOOT.md`  
Scope: first polished desktop playable, then mobile adaptation

## 1. Goal of this plan

Turn the reboot product specification into a concrete build sequence without prematurely expanding scope. The first success condition is not “many openings”; it is one Italian Game curriculum that is genuinely understandable, adaptive and fun for 5–10 minute sessions.

The old V7/V7.1 code remains legacy/reference material. The reboot should be implemented as a clean architecture rather than incrementally patching the old application.

## 2. Technical decisions

### Confirmed stack for the reboot

- TypeScript
- React
- Vite
- chess.js behind an application adapter for rules/state
- browser-local persistence for the first versions
- Vitest for unit/integration tests
- seeded deterministic RNG for adaptive-selection and hint tests
- Stockfish in a Web Worker, added only after the core trainer is stable
- Python only for offline opening-data import/validation if it becomes useful

### Board rendering

Start with a replaceable React chessboard component behind `BoardView`/adapter boundaries rather than writing drag/drop, touch interaction and animation from scratch. The renderer must support custom pieces, custom square styles and responsive sizing. If visual limits appear later, replace it without changing the domain core.

### Deliberately postponed

- backend/accounts/cloud sync
- multiplayer
- native mobile packaging
- physical electronic board integration
- large shop
- many openings
- AI-generated pedagogical text at runtime

## 3. Architectural rule

React displays state and emits player actions. It does not contain the learning logic.

```text
UI / React
   ↓ player events
Application Controller
   ↓
Pure TypeScript domain
   ├── Chess Rules Adapter
   ├── Opening Graph
   ├── Curriculum / Training Engine
   ├── Mastery Engine
   ├── Session Director
   ├── Hint Engine
   ├── Run / Economy Engine
   └── Domain Events
   ↓
Infrastructure
   ├── Storage
   ├── Audio
   ├── Seeded RNG
   └── Stockfish Worker (later)
```

The same domain core must be usable later by desktop web, responsive mobile/PWA and a possible packaged mobile app.

## 4. Proposed repository structure

```text
src/
  domain/
    chess/
      ChessRules.ts
      ChessJsAdapter.ts
    opening/
      OpeningGraph.ts
      OpeningNode.ts
      OpeningMove.ts
    curriculum/
      Curriculum.ts
      LessonStage.ts
    training/
      TrainingEngine.ts
      TrainingState.ts
    mastery/
      MasteryEngine.ts
      MasteryState.ts
      ReviewSchedule.ts
    director/
      SessionDirector.ts
      SelectionPolicy.ts
    hints/
      HintEngine.ts
      HintQuality.ts
    run/
      RunEngine.ts
      Economy.ts
      Streak.ts
    events/
      DomainEvent.ts
  application/
    GameController.ts
    GameViewModel.ts
  data/
    openings/
      italian/
        curriculum.ts
        nodes.ts
        metadata.ts
  infrastructure/
    storage/
      LocalStorageRepository.ts
      migrations.ts
    rng/
      SeededRandom.ts
    audio/
      AudioService.ts
    engine/
      StockfishWorker.ts
  ui/
    board/
    coach/
    hud/
    results/
    map/
    settings/
  assets/
    boards/
    pieces/
    sounds/
  tests/
```

No module should depend on React except `ui/` and composition/bootstrap code.

## 5. Domain model v1

### 5.1 Opening node

Each learner-relevant position is identified independently from its display order so transpositions can be supported later.

Minimum node data:

- `id`
- normalized FEN/position key
- side to move
- curriculum stage
- node type: learner decision / opponent branch / automatic transition
- accepted learner moves
- preferred training move when several moves are acceptable
- opponent child moves
- theoretical importance: 0–1
- pedagogical prompt
- explanation after error
- hint pool by quality tier
- tags/concepts: centre, development, king safety, tempo, etc.
- prerequisite/unlock information

### 5.2 Player state per node

Persist:

- mastery 0–100
- total attempts
- clean successes
- assisted successes
- failures
- current clean streak
- last seen timestamp
- review tier / next due date
- latest result
- discovered/unlocked flags

Do not mix player statistics into static opening data.

### 5.3 Session state

Persist only what is needed for recovery; keep transient run state separate:

- current node
- current run lives
- current streak
- run gold earned
- hints bought for current encounter
- path taken through current run
- lesson target/current frontier
- RNG seed

## 6. Italian Game curriculum v1

The first curriculum is intentionally small. It validates the learning system, not the whole theory of the Italian Game.

### Stage 0 — Discover the identity of the opening

Learner discovers and actively plays:

1. `e4`
2. after `...e5`, `Nf3`
3. after `...Nc6`, `Bc4`

Teaching ideas:

- occupy/control the centre
- develop a piece with purpose
- develop the bishop actively

Flow revised after v0.2 playtesting: let the learner play the three decisions
continuously, then require one unaided reproduction of the whole identity block.
Do not restart after each individual move.

### Stage 1 — Quiet main structure

Use a compact Giuoco Pianissimo-style trunk after `...Bc5`:

- `d3`
- `O-O`
- `c3`
- later `Re1` / centre-preparation concepts when the exact node ordering is authored

The objective is not to memorize a tournament repertoire immediately; it is to teach development, king safety and centre preparation.

### Stage 2 — First real branch

Introduce `3...Nf6` as the first meaningful surprise branch after `Bc4`.

Teach a quiet continuation that can converge toward familiar Italian structures. The player must now identify the position rather than recite the previous sequence.

### Stage 3 — Move-order variation and consolidation

Allow different orders of common developing moves and reinforce positions that transpose into already learned structures.

This is where the internal position-key model starts demonstrating value: the user can arrive at a known position by a different route and mastery should attach to the position/decision, not merely to one string of moves.

### Stage 4 — First deviations

Add only 2–3 pedagogically useful Black deviations after the core system is proven. Exact lines are to be validated as chess content before authoring.

### Initial content size target

For the first polished desktop playable:

- roughly 20–35 meaningful nodes
- 8–15 learner decision nodes
- 2 major opponent branches
- enough transposition/move-order variation to test adaptive selection

Do not add further Italian theory until this content produces a fun loop.

After v0.3 playtesting, apply an additional floor before calling the game loop
meaningful rather than merely functional:

- at least 10–15 learner decisions available across a normal session
- at least 3 pedagogically distinct Black continuations across 2 or more branch points
- at least one real transposition or move-order convergence
- enough unlocked material for an ordinary run to vary without immediately repeating the same six White decisions
- every added line legally validated and given a clear teaching purpose before UI/gamification work depends on it

This is not permission to add broad opening theory. It is the minimum content
runway needed for lives, streaks, gold and records to create real choices.

## 7. Definition of “level”

Do not equate level directly with depth.

Use named/numeric **curriculum stages** as the progression gate. Separately display:

- depth reached
- branch coverage
- weighted mastery

Stage unlock rule v1:

- weighted mastery of required nodes >= 80
- no required/core node below 60
- at least two clean, unassisted successes on each critical learner decision

These are starting values for playtesting.

## 8. Mastery Engine v1

### 8.1 Outcome quality

Convert the encounter into quality `q`:

- clean correct: `1.00`
- correct after weak hint: `0.80`
- correct after medium hint: `0.60`
- correct after strong hint: `0.35`
- correct after near-direct visual hint: `0.15`
- wrong answer: `0.00`

If a player is wrong and then recovers, the encounter receives low mastery credit even though the run continues.

### 8.2 Score update

Use a simple deterministic exponential update, easy to understand and test:

- correct/assisted: `Mnew = M + 0.35 × (100q - M)`
- wrong: `Mnew = M + 0.45 × (0 - M)`

Clamp to 0–100.

This intentionally makes errors hurt more quickly than one lucky success helps.

### 8.3 Spaced review separate from mastery

Do not silently decay the visible mastery score in v1. Track review urgency independently.

Review tiers:

- tier 0: due again in the current/next run
- tier 1: ~6 h
- tier 2: ~1 day
- tier 3: ~3 days
- tier 4: ~7 days
- tier 5: ~21 days

Clean unassisted success can increase tier. Assisted success normally holds tier. Failure decreases tier.

The exact intervals are tuning parameters, not schema assumptions.

## 9. Session Director v1

Implement controlled randomness as a two-step process rather than one opaque formula.

### 9.1 Choose a bucket

Default probabilities while learning:

- 70% targeted: weak, failed, overdue, or current lesson target
- 20% consolidation: known/common material
- 10% surprise: unlocked and under-seen material

When the current stage is strongly mastered, gradually move toward approximately:

- 50% targeted
- 30% consolidation
- 20% surprise

### 9.2 Choose a node/branch inside the bucket

Weight candidates using:

- weakness `(1 - mastery)`
- overdue-review urgency
- curriculum importance
- previous failure bonus
- current lesson-target bonus
- recent-seen penalty
- over-practice penalty

Use seeded weighted random selection. Tests must reproduce selections exactly from a fixed seed.

### 9.3 Guardrails

- avoid the exact same branch three times in succession unless it is the current discovery lesson
- do not choose locked material
- do not choose a surprise that depends on unknown prerequisites
- guarantee a due/failed node eventually returns rather than relying forever on probability

## 10. Hint Engine v1

All standard hints cost **5 gold** in the first version.

Four quality tiers:

1. vague conceptual clue
2. useful concept/piece clue
3. strong clue
4. exceptional/direct visual clue

Suggested draw distribution:

| Purchase on same position | Weak | Medium | Strong | Exceptional |
|---|---:|---:|---:|---:|
| 1st | 45% | 35% | 17% | 3% |
| 2nd | 20% | 40% | 30% | 10% |
| 3rd | 5% | 25% | 45% | 25% |
| 4th+ | 0% | 10% | 40% | 50% |

Rules:

- never repeat the exact same hint text in one encounter
- repeated purchases progressively eliminate useless results
- an exceptional hint may occur on the very first 5-gold purchase
- the learner must still make the move themselves
- hint tier feeds directly into mastery credit

## 11. Lives and recovery v1

Start a normal run with **3 lives**.

On the first wrong answer at a position:

1. lose one life
2. break/reduce streak
3. give short conceptual feedback
4. keep the same position and allow a recovery attempt

The recovery attempt does **not** consume another life for the same encounter. If the learner still cannot solve it, escalate to strong/direct teaching, but require the learner to physically play the correct move before continuing.

This avoids losing all lives by repeatedly failing one position while preserving the tension of errors.

Zero lives ends the run, shows results, and allows immediate replay. No timers or lockouts.

## 12. Gold economy v1

Start a new profile with enough gold to discover the hint mechanic, proposed initial balance: **15 gold**.

Initial earning rules:

- correct learner decision below 90 mastery: +1 gold
- first clean solve of a newly introduced decision: +3
- clean recovery of a previously failed/weak node: +2 or +3
- streak milestones: small bonus
- stage/boss milestone: larger bonus

Highly mastered trivial positions should give reduced/no base gold to prevent farming.

Balance target for playtesting: an ordinary 5–10 minute run should typically earn enough for roughly 1–3 hints, not unlimited hints.

Do not add XP in the first vertical slice. Mastery, gold, stage progress and records already provide enough progression signals. Add XP only if playtesting shows a missing long-term progression layer.

## 13. Streak / combo v1

- clean correct decision: +1 streak
- assisted correct: maintain or increase slowly
- wrong answer: reset streak
- visible milestone feedback at 3, 5, 10, etc.
- gold bonus only at selected milestones

Do not multiply reward on already-mastered trivial nodes aggressively.

## 14. UI plan — first desktop composition

### Main screen

```text
┌──────────────────────────────────────────────────────────┐
│ Italian Game     Stage 2       ❤️❤️❤️   🪙 23   🔥 6     │
├──────────────────────────────┬───────────────────────────┤
│                              │ COACH                     │
│                              │ short prompt              │
│        CHESSBOARD            │ explanation / question   │
│                              │                           │
│                              │ [💡 Hint — 5 🪙]          │
│                              │                           │
├──────────────────────────────┴───────────────────────────┤
│ current objective / compact progress                     │
└──────────────────────────────────────────────────────────┘
```

Principles:

- board remains visually dominant
- coach copy is short, normally 1–3 sentences
- lives/gold/streak always visible
- hint button always reachable
- no dense theoretical move list on the main play screen
- desktop layout stays compact enough to collapse cleanly on mobile later

### Results screen

Show only useful reinforcement:

- deepest point
- gold earned/spent
- best streak
- newly learned/improved nodes
- one or two weak positions to expect again
- immediate “Rejouer” action

### Progress map

Do not block the vertical slice on a sophisticated map. First implement a simple stage/branch status view. Upgrade to the visual “territory/tree” after the core loop is fun.

## 15. Visual system

Design theme support from day one even if only one theme ships initially.

Configuration separates:

- board skin
- piece set
- UI theme
- sound pack

First playable quality target:

- one polished warm/premium board
- one highly readable polished piece set
- subtle move/capture animations
- success/error/gold/streak micro-animations

A second board/piece set is a reward milestone after gameplay validation, not a prerequisite for the first vertical slice.

## 16. Audio v1

Create an `AudioService` with named domain events rather than playing files directly from components.

First sounds:

- move
- capture
- correct
- error/life lost
- hint purchase
- gold reward
- streak milestone
- branch/stage mastered

Sound can be disabled globally. Music is postponed until basic effects feel good.

## 17. Stockfish integration — later milestone

Stockfish is not required for ordinary repertoire training.

Add it only after the trainer can already teach, branch, score mastery, use hints and persist state.

Integration design:

- dedicated Web Worker
- adapter exposing `evaluatePosition()` / `classifyAlternativeMove()`
- strict time/depth budget
- cancellation support
- UI never waits on Stockfish for known opening-node moves

Main use case:

> learner played a legal move not accepted by the current lesson — determine whether it is a reasonable chess move, a serious mistake, or simply a move that leaves the target repertoire.

Do not tightly couple the application to one WASM package/build. Browser Stockfish deployment details can impose worker/thread/header constraints, so keep the adapter replaceable and validate hosting before committing the production build.

## 18. Persistence v1

Use one versioned root object, e.g. schema version `1`.

Persist:

- player profile
- node mastery/review state
- stage unlocks
- gold
- records
- cosmetics unlocks
- sound/visual settings

Requirements:

- one repository interface in the domain/application layer
- localStorage implementation first
- migration function for every future schema change
- export/import debug function during development
- ability to reset progression deliberately

## 19. Testing strategy

### Unit tests — mandatory before UI polish

**Mastery Engine**
- clean correct increases score
- hints reduce gain
- wrong decreases score
- score remains within 0–100
- review tier changes correctly

**Hint Engine**
- fixed seed gives deterministic output
- first hint can be excellent
- repeated purchases improve distribution
- duplicate hint text is prevented

**Session Director**
- locked branches never selected
- weak/overdue nodes receive more exposure over many seeded runs
- surprise remains non-zero
- recent-repeat guard works
- exact seed produces exact path

**Run Engine**
- lives decrement once per failed encounter
- recovery attempt does not double-charge a life
- zero lives ends run
- streak/gold rules correct

**Opening Graph**
- every move leads to a valid node
- FEN keys correspond to expected positions
- no unreachable required node
- prerequisites are valid

### Integration tests

Test full flows without the visual board:

- brand-new player learns e4 → Nf3 → Bc4
- continuous discovery reaches the end of a block before one checkpoint
- successful block checkpoint continues from the position reached
- weak branch reappears later
- hint purchase changes gold and mastery credit
- save/reload restores progression

### E2E later

Add browser tests for drag/click moves, sounds toggles, refresh persistence and responsive layout after the vertical slice stabilizes.

## 20. Milestone roadmap

### v0.1 — Clean foundation

Status: **completed**

Goal: architecture proves itself.

Deliver:

- fresh Vite/React/TypeScript application
- chess.js adapter
- board rendering
- opening-node types
- first 3-move Italian trunk data
- pure controller/domain tests
- legacy code untouched or clearly separated

Exit criterion: player can legally play the first Italian sequence and the core is testable without React.

### v0.2 — Teaching vertical slice

Status: **completed; its restart-after-every-decision flow was superseded by v0.3 playtesting**

Goal: prove active learning.

Deliver:

- discovery → restart → reproduction loop
- coach prompts
- Stage 0 + Stage 1 curriculum
- local persistence
- basic result screen

Exit criterion: a player who does not know the Italian can learn and reproduce the initial trunk without external explanation.

### v0.3 — Adaptive trainer

Status: **completed**

Goal: stop feeling scripted.

Deliver:

- continuous discovery while the learner is correct
- one unaided checkpoint per meaningful curriculum block
- next block continues from the position already reached
- hints hidden until explicitly requested
- per-node mastery
- review tiers
- first two opponent branches
- Session Director 70/20/10 logic
- seeded tests
- coverage/depth/mastery stats

Exit criterion: learning no longer restarts after every concept, repeated runs
vary, and weak/due nodes demonstrably return more often.

### v0.4 — Game loop

Status: **completed**

Goal: make a 5–10 minute run varied, understandable and worth replaying.

Build it in three internal slices; do not publish a thin economy on top of the
current seven learner-decision positions.

#### v0.4a — Content runway

- extend the Italian curriculum to the content floor defined in section 6
- author 3 pedagogically distinct Black continuations across at least 2 branch points
- preserve transpositions and per-position mastery
- validate every FEN, move and prerequisite in deterministic tests
- tune Session Director guardrails against immediate branch repetition

#### v0.4b — Run tension

- 3 lives
- one-life maximum loss per failed encounter, followed by recovery teaching
- streak/combo
- run end at zero lives with immediate replay
- run results: depth, clean streak, branches seen, weak nodes improved and records
- concise surprise/weakness/milestone event copy

#### v0.4c — Economy and hints

- starting gold balance
- gold earning that rewards learning rather than trivial farming
- 5-gold random-quality hints
- first hint may already be excellent
- repeated purchases improve the quality distribution and never repeat text
- hint quality reduces mastery credit
- economy simulation tests across many deterministic runs

Exit criterion: runs vary materially, lives create tension without blocking
learning, gold creates a real hint decision, and the player immediately wants to
retry after a failed or record-setting run.

Implemented outcome:

- 26-node Italian graph with 13 learner-decision nodes
- ordinary adaptive path of 11 learner decisions
- branch points at `3...Bc5/3...Nf6` and `...O-O/...a6`
- two position-key transpositions validated from different move orders
- three lives with one-life maximum loss per encounter and recovery
- clean streaks plus milestones at 3, 5 and 10
- persistent gold, 15-piece migration/start balance and 5-piece hints
- seeded variable hint quality, improving distributions and no duplicate text
- results containing depth, branches, streak, gold and improved positions
- schema-v3 migration preserving v0.2/v0.3 learning state
- deterministic unit/integration/economy coverage

Deliberately retained for v0.5: sound effects, final art, animations, progression
map, cosmetics and the first boss. These improve the proven loop rather than
being required to make its rules work.

### v0.5 — Polish

Goal: turn the proven v0.4 loop into a small finished game.

Deliver:

- final first board skin
- final first piece set
- sound effects
- restrained animation
- improved coach copy
- simple visual branch/stage progression
- basic cosmetic unlock mechanism
- first milestone/boss run using the unlocked Italian branches
- candidate boss baseline for playtesting: 12 positions, 3 lives, at most one hint and an 85% success target

Exit criterion: the application feels like a small finished game rather than a training demo.

### v0.6 — Stockfish consultant

Goal: intelligent handling of off-repertoire legal moves.

Deliver:

- worker adapter
- shallow local evaluation
- classify good-but-off-line vs bad move
- graceful fallback if engine unavailable

Exit criterion: Stockfish can be disabled completely and ordinary training still works.

### v0.7 — Responsive/mobile web

Goal: same game on phone without rewriting the core.

Deliver:

- responsive layout
- touch interaction validation
- audio/haptic considerations
- performance/battery profiling
- PWA evaluation

Exit criterion: same progression data model and learning engines run unchanged on desktop and phone.

### Later

- richer boss tiers
- richer opening map
- additional Italian content
- Black-side repertoire
- second opening
- more skins/sound packs
- Capacitor/native packaging if useful

### Operational model guidance — 2026-08-20

This is workflow guidance, not a product dependency, and should be revisited as
available models change.

- roadmap/specification revisions: **GPT-5.6 Sol, high**
- v0.4a chess content, graph and transposition tests: **Sol, high**
- v0.4b run state machine and recovery: **Sol, high**
- v0.4c economy, probabilistic hints and simulation tests: **Sol, high**
- v0.5 UI/audio/animation integration: **Sol, high**; use dedicated image generation only for bitmap assets
- v0.6 Stockfish worker/WASM integration: **Sol, xhigh** for the initial architecture and difficult debugging, then high for normal follow-up
- v0.7 responsive/mobile work: **Sol, high**

Do not default to max. Escalate beyond high only for a demonstrated hard
integration/debugging problem, not merely because a milestone is larger.

## 21. Build order inside each version

For every feature:

1. domain types/API
2. deterministic unit tests
3. implementation
4. integration test
5. minimal UI
6. UX/polish
7. manual playtest
8. tune constants only after observing play

Do not tune mastery/economy probabilities by intuition indefinitely before real playtesting.

## 22. First implementation sprint — exact task order

1. Create clean reboot branch/workspace.
2. Scaffold React + TypeScript + Vite.
3. Add test runner and lint/typecheck scripts.
4. Implement `ChessRules` interface + chess.js adapter.
5. Choose/wrap board renderer in `BoardView`.
6. Define `OpeningNode`, `OpeningGraph`, `CurriculumStage`.
7. Author only Stage 0 Italian data (`e4`, `Nf3`, `Bc4`).
8. Implement controller capable of learner move → validation → opponent scripted reply.
9. Implement discovery/reproduction state machine.
10. Unit/integration-test complete Stage 0 flow.
11. Add minimal coach/HUD UI.
12. Play it manually before adding mastery, gold or Stockfish.

If Stage 0 itself is awkward, fix architecture/interaction before building more systems.

## 23. Decisions intentionally made by this plan

- use curriculum stages, not raw depth, as level gates
- keep depth/coverage/mastery as separate metrics
- model position identity from the start so transpositions remain possible
- use deterministic seeded randomness
- separate visible mastery from review urgency
- three lives for v1
- one life maximum lost per failed encounter before recovery teaching
- hints cost 5 gold in v1
- first hint can be excellent; repeated hints become progressively better
- no XP in the first vertical slice
- no Stockfish until after the main adaptive/gamified loop works
- first playable contains only a deliberately small Italian curriculum
- board renderer is replaceable rather than part of the domain architecture

## 24. Validation gate before adding a second opening

Do not add a second opening until all are true:

- a beginner can learn Stage 0/1 without outside help
- a 5–10 minute run feels varied rather than repetitive
- failed positions reliably return later
- player notices the difference between mastered and weak branches
- hints are entertaining without feeling unfair
- lives create tension without blocking learning
- gold has obvious value
- visual/audio feedback improves the desire to continue
- save/reload is reliable
- the codebase remains modular and well-tested

Only after this gate should content breadth become the priority.
