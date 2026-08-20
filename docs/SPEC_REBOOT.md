# Chess Openings Trainer — Reboot Specification

Status: product specification / reference for the reboot  
Date: 2026-08-18  
Repository: `fchautems/chess`  
Scope: rebuild from scratch, desktop-first, mobile-ready

## 1. Purpose

Build a chess-opening learning game that teaches openings actively, progressively and enjoyably instead of asking the player to passively memorize fixed move sequences.

The core idea is to treat an opening as a branching structure of positions and responses. The player learns a trunk first, then progressively learns deeper and wider branches. The game adapts to what the player has or has not mastered, deliberately varies the opponent's responses, and adds enough surprise and gamification to make short repeated sessions enjoyable.

The first opening used to validate the concept will be the Italian Game.

This reboot supersedes the old V7/V7.1 architecture as the implementation basis. The old implementation remains useful as historical reference for ideas and experiments, but the new version should be designed from a clean architecture.

---

## 2. Product principles

### P1 — Active learning, never passive playback

The application should not play the learner's move for them during teaching. Even when the app explains exactly what to do, the learner must physically make the move on the board.

### P2 — Learn positions, not a memorized sentence of moves

The goal is not to recite `e4 e5 Nf3 Nc6 Bc4 ...` mechanically. The learner should progressively understand: “in this position, what should I do and why?”

### P3 — Depth is a major dimension of level

The deeper a player can navigate an opening tree while responding correctly to different opponent branches, the stronger their practical knowledge of the opening.

Depth alone is not sufficient, however. A player who knows one 15-move line is not necessarily stronger than someone who knows many common branches to move 8. The game should therefore track both depth and coverage.

### P4 — Surprise, but controlled surprise

Sessions must not become identical repetitions. The opponent's branch should vary. Selection should be weighted toward weak or forgotten branches while retaining some randomness so that the player cannot predict the next line.

### P5 — Gamification must support learning

Lives, gold, streaks, rewards, unlocks and visual progression exist to make practice enjoyable. They must not distort the learning system or create artificial waiting/paywall mechanics.

### P6 — Short sessions should feel rewarding

A useful target is that a 5–10 minute session feels complete: the player discovers something, is tested, earns something and sees progression.

### P7 — The learning engine is independent from the UI

The long-term value of the project is the pedagogical engine. Board rendering, desktop/mobile layout, sounds and visual themes should be replaceable without rewriting the learning logic.

---

## 3. Opening model

### 3.1 Tree for learning, graph in reality

Chess openings are not perfectly represented by a tree because transpositions can make different move orders reach the same position. Internally, the long-term model may therefore behave more like a graph keyed by position/FEN.

For the first implementation, a tree-like authoring model is acceptable as long as position identity can later support transpositions.

### 3.2 Node concept

Each relevant position/node should be able to contain:

- position identity, ideally FEN or normalized position key;
- move that led to it;
- side to move;
- accepted learner move(s);
- opponent candidate responses;
- pedagogical explanation;
- conceptual question/prompt;
- graded hints;
- theoretical importance/frequency;
- difficulty;
- prerequisites/unlock conditions;
- mastery statistics for the current player;
- references to child nodes / branches.

### 3.3 Learner side versus opponent side

If the learner trains the Italian Game with White:

- White moves are the decisions the learner must know and play;
- Black moves create the branches and tests;
- the system chooses Black's reply according to pedagogy, mastery and surprise.

The architecture should later allow learning openings from the Black side as well.

---

## 4. First-use learning flow — Italian Game

The first experience assumes the player knows nothing about the opening.

### 4.1 Discovery phase

The coach first lets the learner continue with a neutral prompt for as long as
they recognize the positions. A correct move immediately continues the line;
the app does not interrupt after every decision. Teaching appears only when the
learner makes a mistake or explicitly requests a hint.

Example:

1. Invite the learner to play what they already know.
2. If they block on the first move, explain briefly that the Italian Game begins by taking space in the centre.
3. Highlight the origin/destination only after an explicit hint request, and never execute the learner's move automatically.
4. Opponent replies `...e5`.
5. Ask the learner to develop the knight toward a square that attacks `e5`.
6. Opponent replies `...Nc6`.
7. Ask which bishop can now develop actively toward the centre / f7 area.
8. Learner plays `Bc4`.

The exact French copy should be short, friendly and interactive rather than textbook-like.

### 4.2 Reproduction phase

Once a meaningful short chunk has been traversed, ask the learner to replay
that chunk once without visible help. The first chunk starts from the initial
position; later chunks may start from their entry position so the learner does
not repeatedly recite already stable material.

If they succeed, that chunk becomes provisionally learned.

If they hesitate, they may purchase/request a hint rather than having the app auto-play the move.

### 4.3 Incremental extension

After the learner reproduces a chunk, continue directly from the position
reached and introduce the next small group of decisions. Concepts remain small,
but the board is not reset after every individual concept.

Example structure:

- Block 1 discovery: `e4 e5 Nf3 Nc6 Bc4`, continuously
- Block 1 checkpoint: replay that identity chunk once from the start
- Block 2 discovery: continue from `Bc4` with `...Bc5 d3 ...Nf6 O-O ...d6 c3`
- Block 2 checkpoint: replay only the quiet-structure chunk from its entry
- Adaptive runs: replay the known trunk while opponent branches vary

Continuous play is the default. Full replay from the beginning remains useful
for adaptive runs and occasional consolidation, not as a mandatory interruption
after every new move.

### 4.4 From trunk to branches

At first, the learner sees one main line so that the structure is understandable.

Once the trunk is sufficiently stable, the coach explicitly introduces another opponent response. Thereafter, the opponent can choose either branch in future runs.

The learner should progressively stop experiencing a fixed script and instead learn to identify the current position and choose the correct response.

---

## 5. Pedagogical coach

The coach is not only an error message system. It should teach ideas and ask questions.

### 5.1 Preferred interaction

Instead of immediately saying:

> Play d3.

Prefer a progression such as:

> The centre is under pressure. What do you want to reinforce?

Then, if needed:

> Look for a pawn that can support e4.

Then, if needed:

> The d-pawn can help.

The learner always plays the final move themselves.

### 5.2 Types of prompts

Prompts may include:

- strategic question;
- tactical observation;
- “which piece is not developed yet?”;
- “what is attacked?”;
- “which move develops with tempo?”;
- “which piece can support this pawn?”;
- “what should we improve before attacking?”;
- occasional multiple choice when useful, but not as the default interaction.

### 5.3 Good chess move but wrong training move

The app should distinguish between:

- illegal move;
- objectively poor move;
- valid chess move that leaves the target opening;
- accepted theoretical alternative;
- requested training move.

Example: if the training goal is `Bc4` but the learner plays another good developing move, the app should not simply say “wrong”. It can say that the move is playable but leaves the Italian line currently being learned.

This is one reason to integrate Stockfish later as an evaluator/consultant.

---

## 6. Hint system

Hints are a central mechanic and one of the main uses of gold.

### 6.1 Hints cost gold

Initial design: each hint purchase costs a small fixed amount such as 5 gold. Exact economy values are tunable later.

### 6.2 Hint quality is variable

A 5-gold hint is not guaranteed to be equally useful every time. This is deliberate and adds a playful “what will I get?” element.

Possible results:

- weak/vague: “Think about the centre.”
- medium: “A minor piece can develop with tempo.”
- strong: “Your g1 knight can develop while attacking e5.”
- excellent/rare: highlight the correct piece or destination.

### 6.3 Anti-frustration rule

Randomness must not trap the learner indefinitely. Repeated hint purchases on the same position should progressively increase the chance of receiving a useful/strong hint.

Conceptually:

- first hint: broad quality distribution;
- second hint: lower chance of useless hint;
- third/fourth hint: high probability of strong help.

### 6.4 Mastery impact

A position solved without help should count more strongly toward mastery than one solved after a strong hint.

Illustrative, not final values:

- no hint: full mastery credit;
- light hint: reduced credit;
- strong hint: small credit;
- direct visual answer: minimal credit.

The learner still continues the run after using hints; hints are not treated as failure.

---

## 7. Mastery and progression

### 7.1 Mastery belongs to positions/decisions

Do not mark a position as learned after a single correct answer. Track a mastery score over repeated encounters.

Useful inputs may include:

- number of correct answers;
- number of wrong answers;
- answer streak;
- time since last review;
- hints used;
- response time;
- whether the position was solved after an earlier mistake;
- difficulty/importance of the node.

### 7.2 Spaced reinforcement

A mastered position should still reappear occasionally to verify retention.

Weak and forgotten positions should reappear more often.

A failed position should not necessarily be repeated immediately; bringing it back later is more useful and more satisfying when the learner recognises it.

### 7.3 Depth + coverage + mastery

The player's displayed strength in an opening should eventually reflect at least:

- maximum useful depth;
- branch coverage;
- average/weighted mastery.

Potential display example:

> Italian Game — Level 6  
> Depth: 12 plies  
> Coverage: 87%  
> Mastery: 91%

The exact formula is open for design.

### 7.4 Unlock logic

Deeper material becomes available when the current layer is sufficiently mastered.

Do not require literal 100% perfection everywhere. A threshold such as 85–90% weighted mastery may be more enjoyable, but must be tuned through playtesting.

---

## 8. Adaptive branch selection / Session Director

A dedicated Session Director chooses what the opponent plays and what the learner sees next.

This component is essential to the feeling that the app is intelligent rather than scripted.

### 8.1 Selection signals

Each candidate branch can receive weight from:

- low mastery: strong positive weight;
- previously failed position: positive weight;
- not seen for a long time: positive weight;
- theoretical/common importance: positive weight;
- seen very recently: negative weight;
- already over-practised: negative weight;
- current lesson target: strong positive weight;
- surprise factor: stochastic component.

### 8.2 Controlled randomness

The weakest branch should not be chosen every single time. Otherwise the learner can predict it and sessions feel repetitive.

A conceptual balance discussed is roughly:

- 70% targeted learning/weakness work;
- 20% consolidation;
- 10% surprise.

These are design starting points, not fixed constants.

As mastery increases, the surprise proportion can increase because the app shifts from teaching toward testing.

### 8.3 Example

After `1.e4 e5 2.Nf3`, suppose:

- `...Nc6` is strongly mastered;
- `...Nf6` is weak;
- another rare unlocked branch has not appeared recently.

The director might choose approximately:

- 55% weak branch;
- 30% mastered/common branch;
- 15% surprise branch.

The player should not know these probabilities.

### 8.4 Boss mode

A boss run can allow the director to draw from all branches unlocked in the current level, with fewer or more expensive hints. This becomes a meaningful mastery test rather than a separate chess AI opponent.

---

## 9. Session / run structure

A training session should feel like a run through the opening tree.

### 9.1 Lives

Start a run with a small number of lives, for example 3.

- correct move: continue deeper;
- wrong move: lose a life;
- explain briefly;
- allow another attempt / resume according to the training mode;
- zero lives: end the run and show rewards/results.

Important: zero lives must never create a real-time lockout. The player can immediately start another run. Lives create tension, not frustration.

### 9.2 Continue while correct

A central fun mechanic is continuous progression: as long as the learner keeps finding correct moves, the run continues deeper through the opening.

Potential records:

- deepest run;
- longest correct streak;
- best no-hint run;
- branch mastery record;
- boss victories.

### 9.3 Streaks / combo

Consecutive correct answers can build a combo multiplier or streak indicator.

A mistake breaks or reduces the combo.

The reward should be satisfying but must not encourage mindless farming of trivial nodes.

---

## 10. Gold economy

Gold is an earned in-game currency only. There is no planned real-money economy.

### 10.1 Main intended use

The clearest current purpose of gold is buying hints.

This creates a meaningful choice during a run:

> Spend 5 gold now for a chance at useful help, or try to solve the position unaided?

### 10.2 Ways to earn gold

Potential rewards:

- correct moves;
- streak milestones;
- completing a branch;
- correcting a previously failed position;
- no-hint success;
- boss completion;
- daily/session challenge;
- treasure/chest rewards.

Values need balancing later.

### 10.3 Other possible uses

Secondary future uses may include:

- board skins;
- piece sets;
- sound packs;
- cosmetic themes;
- temporary run bonuses;
- shields / second chances.

Do not overload the first version with a large shop. Hints are the primary economy loop.

---

## 11. Gamification

The app should feel like a polished game rather than a school exercise.

Candidate systems:

- lives;
- gold;
- XP / levels;
- streak/combo;
- mastery badges;
- branch completion;
- boss runs;
- surprise/ambush events;
- chests/rewards;
- unlockable visual themes;
- personal records.

### 11.1 Surprise events

Short copy can make branch variation visible and fun:

- “Ambush! Black leaves the usual line.”
- “You know this one? This position caught you last time.”
- “Branch mastered.”
- “Old weakness detected.”

The writing should remain concise enough not to interrupt play.

### 11.2 Visual tree / map

A longer-term motivating screen can reveal the opening progressively like a map or territory.

Branches may appear as:

- locked;
- discovered;
- weak;
- improving;
- mastered.

Do not reveal the entire theoretical tree at the beginning. Discovery itself should feel rewarding.

---

## 12. Graphics and art direction

The reboot should deliberately spend more effort on polish than the earlier mobile prototype.

### 12.1 Direction

Target: premium, warm, modern and playful without looking childish.

Avoid both extremes:

- sterile chess database/tool;
- loud cartoon/mobile casino aesthetic.

### 12.2 Board themes

Planned examples:

- warm/classic wood;
- dark stone or marble;
- modern dark;
- minimal/light.

### 12.3 Piece sets

Planned examples:

- high-quality Staunton;
- modern clean set;
- subtle fantasy/medieval set;
- premium unlockable set(s).

Readability always wins over decoration.

### 12.4 Unlockable cosmetics

The player may earn or buy with in-game gold:

- board skins;
- piece sets;
- UI themes/backgrounds;
- coach/avatar cosmetics;
- sound packs;
- subtle move/reward effects.

### 12.5 Animation

Use restrained, fluid animation for:

- piece movement;
- captures;
- gold gain;
- streak changes;
- branch completion;
- chest/reward reveal;
- level/boss events.

Animation should never make moves feel slow.

---

## 13. Sound

Sound is considered part of the desired game feel, not an afterthought.

Minimum useful sound events:

- normal move;
- capture;
- check if desired;
- correct answer;
- mistake;
- gold reward;
- combo/streak increase;
- chest/reward;
- branch mastered;
- level/boss/surprise event.

Potential ambient music should remain light and optional.

Controls should eventually separate:

- sound effects on/off or volume;
- music on/off or volume.

Mobile vibration/haptics can be added later where appropriate.

---

## 14. Technical architecture — current direction

The new application should not be another monolithic HTML file.

### 14.1 Desktop first, portable core

Develop and iterate first as a desktop browser application because debugging and rapid iteration are easier.

However, the UI and architecture must be designed so that mobile is a later port/responsive adaptation rather than a rewrite.

### 14.2 Current preferred stack

Current direction, to confirm during implementation planning:

- TypeScript;
- React;
- Vite;
- chess.js for chess rules/state;
- local browser storage initially;
- Stockfish via WebAssembly when chess evaluation is required.

No backend/server is required for the first version.

### 14.3 Core separation

Suggested logical architecture:

```text
src/
  core/
    chess/
    opening/
    training/
    mastery/
    session-director/
    hints/
    gamification/
  data/
    openings/
      italian/
  ui/
    board/
    coach/
    hud/
    map/
    shop/
  engine/
    stockfish/
  storage/
  audio/
  assets/
    boards/
    pieces/
    sounds/
```

React must not own the learning logic. The core should be usable and testable independently of the UI.

### 14.4 Suggested responsibilities

**chess.js / chess rules layer**

- legal moves;
- board state;
- check/checkmate where relevant;
- castling, en passant, promotion;
- FEN/PGN handling.

**Opening Engine**

- opening positions and branches;
- accepted theoretical moves;
- teaching metadata;
- graph/tree navigation.

**Training Engine**

- current lesson state;
- discovery/reproduction cycle;
- when to introduce a new node;
- learner answer evaluation.

**Mastery Engine**

- per-position performance;
- spaced review;
- depth/coverage/mastery calculations;
- unlock readiness.

**Session Director**

- adaptive branch selection;
- targeted weak nodes;
- consolidation;
- controlled surprise.

**Hint Engine**

- gold cost;
- hint quality distribution;
- anti-frustration escalation;
- mastery penalty/credit adjustment.

**Gamification Engine**

- lives;
- gold;
- XP;
- streak/combo;
- rewards;
- boss/run state.

**Stockfish adapter**

- optional objective evaluation;
- verify whether an off-line move is still good chess;
- candidate moves when useful;
- never control the pedagogical progression directly.

---

## 15. Stockfish strategy

Stockfish should be a consultant, not the teacher.

### 15.1 Why

Opening theory and learning intent are human/pedagogical concepts. The engine's best move is not automatically the move we want to teach at that moment.

### 15.2 Uses

Stockfish can help answer:

- Was the learner's alternative move objectively reasonable?
- Did the learner make a serious chess error or merely leave the target line?
- Which candidate moves are playable in an unexpected position?
- Is a generated teaching branch tactically sound?

### 15.3 Local execution

Preferred long-term model: Stockfish compiled to WebAssembly and running locally on PC and later phone.

This avoids mandatory Internet access, external API dependence and server cost.

Analysis should normally be shallow/fast because the app needs pedagogical feedback, not grandmaster correspondence-depth analysis.

### 15.4 No engine dependency for ordinary line training

If the current opening node already defines the expected response and explanation, do not call Stockfish. Use the opening data directly.

---

## 16. Opening data generation

The runtime application should stay browser/mobile friendly.

Python may be useful offline as a development/data tool for:

- importing PGN/opening databases;
- generating/cleaning opening trees;
- calculating line frequency;
- finding transpositions;
- validating opening datasets;
- generating JSON/structured assets consumed by the app.

Python is not currently intended to be part of the runtime application.

---

## 17. Persistence

First version can use browser-local persistence.

Persist at minimum:

- player settings;
- learned/unlocked opening nodes;
- per-position mastery statistics;
- gold;
- XP/level if implemented;
- unlocked cosmetics;
- records/streak statistics;
- audio/visual preferences.

The data model should be versioned so migrations are possible as the app evolves.

A user account/cloud sync system is out of initial scope.

---

## 18. Desktop-to-mobile strategy

### Phase 1 — Desktop browser

Build the game on PC first to make architecture, debugging, visual work and playtesting easier.

The desktop UI should not rely on huge desktop-only layouts. Keep the main game composition compact enough that mobile adaptation remains realistic.

### Phase 2 — Responsive/mobile browser

Adapt layout and touch interactions once gameplay and architecture are stable.

### Phase 3 — Installable mobile experience

Potential directions:

- PWA;
- Capacitor wrapper for Android/iOS if native packaging/features are useful.

Exact packaging is not yet a committed decision.

---

## 19. First playable scope

The first reboot milestone should deliberately stay narrow.

### Required

1. One opening only: Italian Game.
2. High-quality interactive board.
3. Legal move validation.
4. Opening tree/data model.
5. Beginner discovery lesson from zero.
6. Replay-from-start incremental learning.
7. Multiple opponent branches.
8. Per-position mastery.
9. Adaptive branch selection with controlled randomness.
10. Lives/run mechanic.
11. Gold earning.
12. 5-gold variable-quality hints.
13. Streak/combo.
14. Automatic local persistence.
15. Basic sound feedback.
16. One polished board + one polished piece set.

### Strong candidates soon after

- Stockfish WASM evaluator;
- branch map/progression tree;
- boss runs;
- second/third board or piece skin;
- richer rewards/chests;
- additional Italian branches;
- learner can choose White/Black side;
- second opening.

### Explicitly not required at first

- account system;
- cloud sync;
- multiplayer;
- full general-purpose chess engine UI;
- dozens of openings;
- large cosmetic shop;
- mobile-native packaging;
- electronic physical-board integration.

---

## 20. Core gameplay loop

A target loop for the first version:

```text
Choose Italian Game / Continue
        ↓
Start run with lives + current gold
        ↓
Replay known trunk
        ↓
Session Director chooses opponent branch
        ↓
Player chooses move
   ┌────┴─────┐
 correct     wrong
   │           │
 reward      lose life
 mastery     short explanation
 combo       retry/continue
   │           │
   └────┬──────┘
        ↓
Maybe introduce one new concept
        ↓
Continue deeper / surprise branch
        ↓
Run ends (lives, milestone or player choice)
        ↓
Rewards + mastery update + visible progress
        ↓
Immediate option to replay
```

This loop must be fun before expanding the product.

---

## 21. Example adaptive run

Illustrative scenario:

- learner already knows the main `...Nc6` branch well;
- has repeatedly failed a `...Nf6` branch;
- starts with 3 lives and 42 gold;
- reaches `1.e4 e5 2.Nf3`;
- Session Director chooses `...Nf6` with elevated probability;
- UI labels it subtly as an ambush/surprise;
- learner hesitates;
- buys a 5-gold hint;
- first hint is vague;
- buys another 5-gold hint;
- anti-frustration weighting yields a stronger conceptual hint;
- learner finds the move themselves;
- receives reduced mastery credit because hints were used, but the run continues;
- several moves later, a previously mastered `...Nc6` branch reappears to check retention;
- learner succeeds without help, combo rises;
- run ends later after lives reach zero;
- results show gold earned, deepest point, weak nodes improved, and the opening map reveals progress.

This is close to the desired emotional/pedagogical experience.

---

## 22. Design questions still open

These should be resolved during the implementation plan, not guessed prematurely.

1. Exact definition of a “level”: plies, depth bands, mastery gates, or named stages?
2. Exact mastery formula and decay/review timing.
3. Exact weighted branch-selection algorithm.
4. Exact gold earning rate and hint price balance.
5. Whether an error immediately lets the learner retry the same position or briefly explains and restarts from a checkpoint.
6. How many lives per standard run.
7. Whether hints all cost 5 gold permanently or cost can vary by mode.
8. Exact quality distribution of hints and anti-frustration curve.
9. How much XP adds beyond mastery/gold, or whether XP is unnecessary in the first version.
10. How boss runs are unlocked and rewarded.
11. How the opening map is visualized.
12. Art asset source/licensing and whether custom generated assets are used.
13. Audio asset source/licensing.
14. Exact React board component/library versus custom rendering.
15. Exact Stockfish WASM package/build and worker architecture.
16. Whether to model the opening immediately as a graph keyed by FEN or start with a simpler tree abstraction.
17. Exact Italian Game curriculum and which branches are pedagogically important at each stage.
18. Mobile packaging choice after desktop gameplay is validated.

---

## 23. Architecture quality requirements

The reboot should be considered successful technically if:

- opening data can be changed without rewriting the UI;
- the Session Director can be unit-tested without a browser;
- mastery logic can be unit-tested independently;
- hint randomness can be deterministic under seeded tests;
- game state can be serialized/deserialized cleanly;
- Stockfish can be removed/disabled without breaking ordinary training;
- themes can be added mostly through assets/configuration;
- desktop and mobile share the same learning core;
- no single giant file owns the application;
- core decisions are documented as the project evolves.

---

## 24. Success criteria for the concept

Before adding many openings, validate these questions through actual use:

1. Is learning the Italian Game from zero understandable without external explanation?
2. Does restarting from the beginning while extending one step at a time feel useful rather than tedious?
3. Do adaptive branches feel surprising but fair?
4. Does the player learn positions rather than merely memorize a move string?
5. Are hints fun to buy without becoming frustrating gambling?
6. Do lives create useful tension without discouraging practice?
7. Does gold feel valuable because it helps during learning?
8. Do sound, animation and visual polish materially improve desire to continue?
9. Does a 5–10 minute session feel rewarding?
10. Does the player want to return and deepen the same opening?

If these are true for one opening, the system can then scale to more openings.

---

## 25. Current decisions versus proposals

### Accepted direction from the 2026-08-18 design discussion

- restart implementation from scratch rather than extending the old prototype;
- focus the first validation on the Italian Game;
- model learning as progressive traversal of a branching opening structure;
- teach actively: learner always plays their own move;
- introduce moves/concepts gradually, continue while correct and consolidate by meaningful chunks;
- vary opponent branches rather than repeat one fixed line;
- weight branch selection toward weak mastery while retaining surprise;
- track mastery per position/decision;
- use lives to create run tension, with immediate replay after run end;
- use gold as an in-game resource, especially to buy hints;
- make hint usefulness variable, with anti-frustration escalation;
- invest in higher-quality graphics, multiple board/piece skins and sound;
- develop on PC first, then port/adapt to phone;
- separate chess rules, learning logic, gamification, UI and engine evaluation;
- use Stockfish as an optional evaluator/consultant rather than the pedagogical controller;
- keep the path open to local Stockfish execution on phone.

### Current technical proposal, to confirm in the implementation plan

- TypeScript + React + Vite;
- chess.js;
- Stockfish WASM;
- local persistence first;
- Python used only for offline opening-data tooling where useful;
- later PWA/Capacitor for mobile packaging.

---

## 26. Next step

Do not start broad feature coding directly from this document.

The next project step should be a more precise implementation plan covering:

1. first Italian Game curriculum/tree;
2. domain/data model;
3. mastery algorithm v1;
4. Session Director algorithm v1;
5. hint generation/quality model v1;
6. run/gold/lives economy v1;
7. UI wireframe and art direction;
8. technical stack confirmation;
9. repository structure and testing strategy;
10. milestone sequence for the first playable desktop build.

This specification is the product reference for that plan.
