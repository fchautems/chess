(() => {
  "use strict";

  const MISSION_PROGRESS_KEY = "openingTrainer.missionProgress.v1";
  const MISSION_ID = "italian-king-safety";
  const STARTING_LIVES = 3;
  const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];

  const MISSION_LINES = [
    {
      id: "calm-giuoco",
      name: "Italienne calme",
      summary: "Développer, défendre e4, roquer puis préparer d4.",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "d3", "Nf6", "O-O", "d6", "c3", "O-O", "Re1"],
      notes: {
        0: "Prends le centre.",
        2: "Développe le cavalier avec tempo sur e5.",
        4: "Place le fou sur sa diagonale naturelle vers f7.",
        6: "Consolide e4 sans fermer ton fou.",
        8: "Ton développement est suffisant : mets maintenant le roi à l’abri.",
        10: "Prépare la poussée d4.",
        12: "Place la tour derrière e4 et termine la mission."
      }
    },
    {
      id: "giuoco-open-center",
      name: "Giuoco Piano central",
      summary: "Préparer c3 et d4 avant de mettre le roi à l’abri.",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Bc5", "c3", "Nf6", "d4", "exd4", "cxd4", "Bb4+", "Bd2", "Bxd2+", "Nbxd2", "d5", "exd5", "Nxd5", "O-O", "O-O"],
      notes: {
        0: "Prends le centre.",
        2: "Développe le cavalier avec tempo.",
        4: "Développe le fou vers f7.",
        6: "Prépare d4 avec c3.",
        8: "Ouvre le centre pendant que tes pièces sont actives.",
        10: "Reprends au centre.",
        12: "Réponds à l’échec en développant une pièce.",
        14: "Reprends avec le cavalier vers le centre.",
        16: "Récupère le pion central.",
        18: "Mets enfin ton roi à l’abri."
      }
    },
    {
      id: "two-knights",
      name: "Défense des Deux Cavaliers",
      summary: "Répondre à l’attaque sur e4 puis roquer rapidement.",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6", "d3", "Bc5", "O-O", "d6", "c3", "O-O", "Re1", "a6"],
      notes: {
        0: "Prends le centre.",
        2: "Développe avec tempo sur e5.",
        4: "Développe le fou vers f7.",
        6: "Défends e4 sans bloquer le fou.",
        8: "Roque avant que le centre ne s’ouvre.",
        10: "Prépare d4.",
        12: "Renforce e4 avec la tour."
      }
    },
    {
      id: "hungarian",
      name: "Défense hongroise",
      summary: "Profiter du jeu passif des Noirs pour prendre le centre.",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "Be7", "d4", "d6", "O-O", "Nf6", "Re1", "O-O", "c3"],
      notes: {
        0: "Prends le centre.",
        2: "Développe le cavalier avec tempo.",
        4: "Développe le fou vers f7.",
        6: "Les Noirs sont passifs : gagne de l’espace par d4.",
        8: "Mets ton roi à l’abri.",
        10: "Soutiens e4 avec la tour.",
        12: "Renforce d4 et prépare la suite."
      }
    },
    {
      id: "classical-d6",
      name: "Défense classique avec ...d6",
      summary: "Ouvrir le centre puis achever le développement.",
      moves: ["e4", "e5", "Nf3", "Nc6", "Bc4", "d6", "d4", "exd4", "Nxd4", "Nf6", "Nc3", "Be7", "O-O", "O-O"],
      notes: {
        0: "Prends le centre.",
        2: "Développe le cavalier avec tempo.",
        4: "Développe le fou vers f7.",
        6: "Ouvre le centre face à la position passive des Noirs.",
        8: "Reprends avec le cavalier au centre.",
        10: "Développe ta dernière pièce légère.",
        12: "Mets ton roi à l’abri."
      }
    }
  ];

  let homeScreen;
  let missionScreen;
  let missionBoard;
  let historyEl;
  let statusTitleEl;
  let statusMessageEl;
  let livesEl;
  let progressEl;
  let progressFillEl;
  let introBackdrop;
  let resultBackdrop;

  let game = null;
  let activeLine = null;
  let preparedLine = [];
  let moveIndex = 0;
  let lives = STARTING_LIVES;
  let selectedSquare = null;
  let legalMoves = [];
  let lastMove = null;
  let boardLocked = true;
  let mistakesAtPly = new Map();
  let correctFirstTry = 0;
  let alternativesUsed = 0;
  let whiteCastled = false;
  let sessionToken = 0;

  function prepareLine(line) {
    const temp = new Chess();
    return line.moves.map((san, index) => {
      const move = temp.move(san, { sloppy: true });
      if (!move) throw new Error(`Coup invalide dans ${line.name}, demi-coup ${index + 1}: ${san}`);
      return {
        san: move.san,
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q",
        color: move.color,
        piece: move.piece
      };
    });
  }

  function safeJson(value, fallback) {
    try {
      return JSON.parse(value);
    } catch (_error) {
      return fallback;
    }
  }

  function loadMissionProgress() {
    const stored = safeJson(localStorage.getItem(MISSION_PROGRESS_KEY), {});
    return stored && typeof stored === "object" ? stored : {};
  }

  function saveMissionResult(success, xp) {
    const all = loadMissionProgress();
    const current = all[MISSION_ID] && typeof all[MISSION_ID] === "object" ? all[MISSION_ID] : {};
    all[MISSION_ID] = {
      attempts: Number(current.attempts || 0) + 1,
      wins: Number(current.wins || 0) + (success ? 1 : 0),
      bestLives: success ? Math.max(Number(current.bestLives || 0), lives) : Number(current.bestLives || 0),
      totalXp: Number(current.totalXp || 0) + xp,
      lastPlayedAt: new Date().toISOString(),
      lastResult: success ? "success" : "failed"
    };
    localStorage.setItem(MISSION_PROGRESS_KEY, JSON.stringify(all));
  }

  function addXpToMainProfile(xp) {
    try {
      if (typeof profile === "object" && profile) {
        profile.xp = Number(profile.xp || 0) + xp;
        if (typeof saveProfile === "function") saveProfile();
        if (typeof updateProfileUI === "function") updateProfileUI();
      }
    } catch (_error) {
      // La mission reste jouable même si le profil principal évolue plus tard.
    }
  }

  function buildHomeCard() {
    const campaignTitle = homeScreen.querySelector(".campaign-title");
    const card = document.createElement("section");
    card.className = "mission-home-card";
    card.innerHTML = `
      <div class="mission-home-copy">
        <span class="mission-kicker">NOUVEAU MODE</span>
        <h2>Mission : mettre le roi à l’abri</h2>
        <p>Une vraie séquence d’ouverture, trois vies et une variante adverse cachée.</p>
      </div>
      <button id="openingMissionButton" class="mission-launch-button" type="button">Jouer la mission</button>`;
    homeScreen.insertBefore(card, campaignTitle);
    card.querySelector("#openingMissionButton").addEventListener("click", openIntro);
  }

  function buildMissionScreen() {
    missionScreen = document.createElement("section");
    missionScreen.id = "openingMissionScreen";
    missionScreen.className = "screen mission-screen";
    missionScreen.innerHTML = `
      <header class="mission-header">
        <button id="missionBackButton" class="mission-icon-button" type="button" aria-label="Quitter la mission">←</button>
        <div class="mission-heading">
          <h2>Mettre le roi à l’abri</h2>
          <p id="missionBranchLabel">Variante adverse cachée</p>
        </div>
        <div id="missionLives" class="mission-lives" aria-label="Vies restantes">❤️❤️❤️</div>
      </header>
      <div id="missionHistory" class="mission-history"><span>La partie va commencer…</span></div>
      <div class="mission-board-wrap">
        <div id="missionBoard" class="mission-board" role="grid" aria-label="Échiquier de la mission"></div>
      </div>
      <div class="mission-progress-row">
        <span>Ouverture</span>
        <div class="mission-progress-track"><div id="missionProgressFill" class="mission-progress-fill"></div></div>
        <strong id="missionProgressValue">0 %</strong>
      </div>
      <div class="mission-status" aria-live="polite">
        <strong id="missionStatusTitle">Objectif</strong>
        <span id="missionStatusMessage">Développe tes pièces et mets ton roi en sécurité.</span>
      </div>
      <div class="mission-actions">
        <button id="missionRestartButton" type="button">↻ Recommencer</button>
        <button id="missionQuitButton" type="button">Retour aux ouvertures</button>
      </div>`;
    document.querySelector("main.app").appendChild(missionScreen);

    missionBoard = missionScreen.querySelector("#missionBoard");
    historyEl = missionScreen.querySelector("#missionHistory");
    statusTitleEl = missionScreen.querySelector("#missionStatusTitle");
    statusMessageEl = missionScreen.querySelector("#missionStatusMessage");
    livesEl = missionScreen.querySelector("#missionLives");
    progressEl = missionScreen.querySelector("#missionProgressValue");
    progressFillEl = missionScreen.querySelector("#missionProgressFill");

    missionScreen.querySelector("#missionBackButton").addEventListener("click", () => quitMission(true));
    missionScreen.querySelector("#missionQuitButton").addEventListener("click", () => quitMission(true));
    missionScreen.querySelector("#missionRestartButton").addEventListener("click", () => {
      if (window.confirm("Recommencer cette mission depuis le début ?")) startMission();
    });
  }

  function buildIntro() {
    introBackdrop = document.createElement("div");
    introBackdrop.className = "mission-modal-backdrop";
    introBackdrop.innerHTML = `
      <section class="mission-modal-panel" role="dialog" aria-modal="true" aria-labelledby="missionIntroTitle">
        <span class="mission-kicker">MISSION 1</span>
        <h2 id="missionIntroTitle">Mettre le roi à l’abri</h2>
        <p>L’adversaire choisira une réponse de la Partie italienne sans te dire laquelle.</p>
        <ul>
          <li>Développe rapidement le cavalier et le fou.</li>
          <li>Observe ce que change chaque coup noir.</li>
          <li>Roque avant que le centre ne devienne dangereux.</li>
        </ul>
        <div class="mission-rules"><strong>❤️ 3 vies</strong><span>Un coup légal hors mission coûte une vie. La position reste à résoudre.</span></div>
        <div class="mission-modal-actions">
          <button id="missionIntroCancel" type="button">Pas maintenant</button>
          <button id="missionIntroStart" class="primary" type="button">Commencer la mission</button>
        </div>
      </section>`;
    document.body.appendChild(introBackdrop);
    introBackdrop.querySelector("#missionIntroCancel").addEventListener("click", closeIntro);
    introBackdrop.querySelector("#missionIntroStart").addEventListener("click", () => {
      closeIntro();
      startMission();
    });
    introBackdrop.addEventListener("click", (event) => {
      if (event.target === introBackdrop) closeIntro();
    });
  }

  function buildResult() {
    resultBackdrop = document.createElement("div");
    resultBackdrop.className = "mission-modal-backdrop";
    resultBackdrop.innerHTML = `
      <section class="mission-modal-panel mission-result-panel" role="dialog" aria-modal="true" aria-labelledby="missionResultTitle">
        <div id="missionResultEmoji" class="mission-result-emoji">🏰</div>
        <h2 id="missionResultTitle">Mission réussie</h2>
        <p id="missionResultSubtitle"></p>
        <div class="mission-result-grid">
          <div><strong id="missionResultFirstTry">0 / 0</strong><span>du premier essai</span></div>
          <div><strong id="missionResultLives">0</strong><span>vies restantes</span></div>
          <div><strong id="missionResultAlternatives">0</strong><span>alternatives</span></div>
          <div><strong id="missionResultXp">+0 XP</strong><span>récompense</span></div>
        </div>
        <p id="missionResultLesson" class="mission-result-lesson"></p>
        <div class="mission-modal-actions">
          <button id="missionResultHome" type="button">Retour au parcours</button>
          <button id="missionResultReplay" class="primary" type="button">Rejouer</button>
        </div>
      </section>`;
    document.body.appendChild(resultBackdrop);
    resultBackdrop.querySelector("#missionResultHome").addEventListener("click", () => {
      resultBackdrop.classList.remove("open");
      quitMission(false);
    });
    resultBackdrop.querySelector("#missionResultReplay").addEventListener("click", () => {
      resultBackdrop.classList.remove("open");
      startMission();
    });
  }

  function openIntro() {
    introBackdrop.classList.add("open");
  }

  function closeIntro() {
    introBackdrop.classList.remove("open");
  }

  function chooseLine() {
    const playable = MISSION_LINES.filter((line) => line.id !== "giuoco-open-center");
    return playable[Math.floor(Math.random() * playable.length)];
  }

  function startMission() {
    if (typeof Chess === "undefined") {
      window.alert("La bibliothèque d’échecs n’est pas disponible. Recharge la page avec une connexion Internet.");
      return;
    }

    sessionToken += 1;
    game = new Chess();
    activeLine = chooseLine();
    preparedLine = prepareLine(activeLine);
    moveIndex = 0;
    lives = STARTING_LIVES;
    selectedSquare = null;
    legalMoves = [];
    lastMove = null;
    boardLocked = true;
    mistakesAtPly = new Map();
    correctFirstTry = 0;
    alternativesUsed = 0;
    whiteCastled = false;

    document.body.classList.add("mission-active");
    homeScreen.classList.remove("active");
    const trainingScreen = document.getElementById("trainingScreen");
    trainingScreen?.classList.remove("active");
    missionScreen.classList.add("active");
    missionScreen.querySelector("#missionBranchLabel").textContent = "Variante adverse cachée";
    setStatus("Prépare-toi", "L’adversaire a choisi sa réponse. Trouve le plan sans réciter mécaniquement.");
    renderAll();
    window.scrollTo(0, 0);
    window.setTimeout(() => continueFlow(), 550);
  }

  function quitMission(confirmFirst) {
    if (confirmFirst && game && moveIndex > 0 && !resultBackdrop.classList.contains("open")) {
      if (!window.confirm("Quitter la mission en cours ?")) return;
    }
    sessionToken += 1;
    game = null;
    document.body.classList.remove("mission-active");
    missionScreen.classList.remove("active");
    resultBackdrop.classList.remove("open");
    homeScreen.classList.add("active");
    window.scrollTo(0, 0);
  }

  function isWhiteTurn() {
    return game && game.turn() === "w";
  }

  function setStatus(title, message) {
    statusTitleEl.textContent = title;
    statusMessageEl.textContent = message;
  }

  function renderAll() {
    renderBoard();
    renderHistory();
    renderLives();
    renderProgress();
  }

  function renderLives() {
    livesEl.textContent = `${"❤️".repeat(Math.max(0, lives))}${"🖤".repeat(Math.max(0, STARTING_LIVES - lives))}`;
    livesEl.setAttribute("aria-label", `${lives} vie${lives > 1 ? "s" : ""} restante${lives > 1 ? "s" : ""}`);
  }

  function renderProgress() {
    const percent = preparedLine.length ? Math.round((moveIndex / preparedLine.length) * 100) : 0;
    progressEl.textContent = `${percent} %`;
    progressFillEl.style.width = `${percent}%`;
  }

  function renderHistory() {
    if (!game) return;
    const history = game.history();
    if (!history.length) {
      historyEl.innerHTML = "<span>La partie va commencer…</span>";
      return;
    }
    let html = "";
    for (let index = 0; index < history.length; index += 2) {
      html += `<span class="mission-move-pair"><b>${Math.floor(index / 2) + 1}.</b><span>${history[index]}</span>${history[index + 1] ? `<span>${history[index + 1]}</span>` : ""}</span>`;
    }
    historyEl.innerHTML = html;
    historyEl.lastElementChild?.scrollIntoView({ block: "nearest", inline: "end" });
  }

  function renderBoard() {
    if (!game) return;
    missionBoard.innerHTML = "";
    const legalTargets = new Map(legalMoves.map((move) => [move.to, move]));

    for (const rank of [8, 7, 6, 5, 4, 3, 2, 1]) {
      for (const file of FILES) {
        const squareName = `${file}${rank}`;
        const square = document.createElement("button");
        square.type = "button";
        square.className = `square ${(FILES.indexOf(file) + rank) % 2 === 1 ? "dark" : "light"}`;
        square.dataset.square = squareName;
        square.setAttribute("role", "gridcell");

        if (lastMove && (lastMove.from === squareName || lastMove.to === squareName)) square.classList.add("last");
        if (selectedSquare === squareName) square.classList.add("selected");

        const piece = game.get(squareName);
        const target = legalTargets.get(squareName);
        if (target && !piece) {
          const dot = document.createElement("span");
          dot.className = "legal-dot";
          square.appendChild(dot);
        } else if (target && piece) {
          const ring = document.createElement("span");
          ring.className = "capture-ring";
          square.appendChild(ring);
        }

        if (piece) {
          const pieceEl = document.createElement("span");
          pieceEl.className = "piece";
          const image = document.createElement("img");
          image.className = "piece-img";
          image.alt = "";
          image.draggable = false;
          image.src = PIECE_IMAGES[`${piece.color}${piece.type}`] || "";
          pieceEl.appendChild(image);
          square.appendChild(pieceEl);
        }

        if (rank === 1) {
          const coord = document.createElement("span");
          coord.className = "coord file";
          coord.textContent = file;
          square.appendChild(coord);
        }
        if (file === "a") {
          const coord = document.createElement("span");
          coord.className = "coord rank";
          coord.textContent = String(rank);
          square.appendChild(coord);
        }

        square.addEventListener("click", onSquareClick);
        missionBoard.appendChild(square);
      }
    }
  }

  function onSquareClick(event) {
    if (boardLocked || !isWhiteTurn()) return;
    const squareName = event.currentTarget.dataset.square;
    const piece = game.get(squareName);

    if (selectedSquare && legalMoves.some((move) => move.to === squareName)) {
      attemptUserMove(selectedSquare, squareName);
      return;
    }

    if (piece && piece.color === "w") {
      selectedSquare = squareName;
      legalMoves = game.moves({ square: squareName, verbose: true });
      renderBoard();
      return;
    }

    selectedSquare = null;
    legalMoves = [];
    renderBoard();
  }

  function currentHistoryMatches(line, ply) {
    const expectedPrefix = line.moves.slice(0, ply);
    const actual = game.history();
    if (expectedPrefix.length !== actual.length) return false;
    const test = new Chess();
    for (let index = 0; index < expectedPrefix.length; index += 1) {
      const played = test.move(expectedPrefix[index], { sloppy: true });
      if (!played || played.san !== actual[index]) return false;
    }
    return true;
  }

  function findRecognizedAlternative(legal) {
    for (const line of MISSION_LINES) {
      if (!currentHistoryMatches(line, moveIndex)) continue;
      const prepared = prepareLine(line);
      const candidate = prepared[moveIndex];
      if (candidate && candidate.color === "w" && candidate.from === legal.from && candidate.to === legal.to) {
        return { line, prepared, move: candidate };
      }
    }
    return null;
  }

  function attemptUserMove(from, to) {
    const legal = game.moves({ square: from, verbose: true }).find((move) => move.to === to);
    if (!legal) return;
    const expected = preparedLine[moveIndex];
    if (!expected || expected.color !== "w") return;

    let moveToPlay = expected;
    let alternative = false;
    if (legal.from !== expected.from || legal.to !== expected.to) {
      const recognized = findRecognizedAlternative(legal);
      if (!recognized) {
        registerWrongMove();
        return;
      }
      activeLine = recognized.line;
      preparedLine = recognized.prepared;
      moveToPlay = recognized.move;
      alternativesUsed += 1;
      alternative = true;
    }

    const errors = mistakesAtPly.get(moveIndex) || 0;
    if (errors === 0) correctFirstTry += 1;
    boardLocked = true;
    selectedSquare = null;
    legalMoves = [];

    const played = game.move({ from: moveToPlay.from, to: moveToPlay.to, promotion: moveToPlay.promotion });
    if (!played) {
      setStatus("Erreur technique", "Le coup prévu n’a pas pu être joué.");
      return;
    }
    if (played.san === "O-O" || played.san === "O-O-O") whiteCastled = true;
    lastMove = { from: played.from, to: played.to };
    const note = activeLine.notes?.[moveIndex] || "Le coup poursuit correctement le plan de l’ouverture.";
    moveIndex += 1;
    setStatus(alternative ? "Bonne alternative reconnue" : "Bon coup", note);
    renderAll();

    const token = sessionToken;
    window.setTimeout(() => {
      if (token === sessionToken) continueFlow();
    }, alternative ? 750 : 540);
  }

  function registerWrongMove() {
    const count = (mistakesAtPly.get(moveIndex) || 0) + 1;
    mistakesAtPly.set(moveIndex, count);
    lives -= 1;
    selectedSquare = null;
    legalMoves = [];
    missionBoard.classList.remove("shake");
    void missionBoard.offsetWidth;
    missionBoard.classList.add("shake");

    if (lives <= 0) {
      boardLocked = true;
      setStatus("Plus de vies", "L’ouverture n’est pas terminée. Observe le plan puis retente la mission.");
      renderAll();
      window.setTimeout(() => finishMission(false), 700);
      return;
    }

    const expected = preparedLine[moveIndex];
    const piece = expected ? game.get(expected.from) : null;
    const pieceText = piece ? ({ p: "un pion", n: "un cavalier", b: "un fou", r: "une tour", q: "la dame", k: "le roi" }[piece.type] || "une pièce") : "une autre pièce";
    setStatus("Une vie perdue", count >= 2 ? `Le plan utilise ${pieceText}. La position reste la même.` : "Ce coup est légal, mais il ne suit pas le plan de cette mission. La position reste la même.");
    boardLocked = false;
    renderAll();
  }

  function continueFlow() {
    if (!game) return;
    if (moveIndex >= preparedLine.length) {
      finishMission(true);
      return;
    }

    const expected = preparedLine[moveIndex];
    if (expected.color === "w") {
      boardLocked = false;
      const message = moveIndex < 6
        ? "Développe naturellement et observe la réponse noire."
        : "Trouve le coup qui poursuit le plan sans indice automatique.";
      setStatus("À toi de jouer", message);
      renderAll();
      return;
    }

    boardLocked = true;
    setStatus("L’adversaire réfléchit", "Sa réponse peut révéler une nouvelle branche de l’Italienne.");
    renderAll();
    const token = sessionToken;
    window.setTimeout(() => {
      if (token !== sessionToken || !game) return;
      const played = game.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      if (!played) {
        setStatus("Erreur technique", `Le coup adverse ${expected.san} n’a pas pu être joué.`);
        return;
      }
      lastMove = { from: played.from, to: played.to };
      moveIndex += 1;
      renderAll();
      window.setTimeout(() => {
        if (token === sessionToken) continueFlow();
      }, 320);
    }, 620);
  }

  function finishMission(requestedSuccess) {
    if (!game) return;
    boardLocked = true;
    const success = Boolean(requestedSuccess && lives > 0 && whiteCastled);
    const totalWhiteMoves = preparedLine.filter((move) => move.color === "w").length;
    const xp = success ? 100 + lives * 25 + alternativesUsed * 10 : 20 + correctFirstTry * 5;
    saveMissionResult(success, xp);
    addXpToMainProfile(xp);

    resultBackdrop.querySelector("#missionResultEmoji").textContent = success ? "🏰" : "💔";
    resultBackdrop.querySelector("#missionResultTitle").textContent = success ? "Mission réussie" : "Mission échouée";
    resultBackdrop.querySelector("#missionResultSubtitle").textContent = success
      ? `${activeLine.name} terminée : ton roi est en sécurité.`
      : `${activeLine.name} : il reste encore le plan à consolider.`;
    resultBackdrop.querySelector("#missionResultFirstTry").textContent = `${correctFirstTry} / ${totalWhiteMoves}`;
    resultBackdrop.querySelector("#missionResultLives").textContent = String(Math.max(0, lives));
    resultBackdrop.querySelector("#missionResultAlternatives").textContent = String(alternativesUsed);
    resultBackdrop.querySelector("#missionResultXp").textContent = `+${xp} XP`;
    resultBackdrop.querySelector("#missionResultLesson").textContent = success
      ? "À retenir : développe d’abord, lis la réponse adverse, puis roque avant d’ouvrir davantage le centre."
      : "À retenir : un coup légal peut être bon aux échecs sans correspondre au plan précis travaillé dans cette mission.";

    missionScreen.querySelector("#missionBranchLabel").textContent = activeLine.name;
    resultBackdrop.classList.add("open");
  }

  function initMissionFeature() {
    homeScreen = document.getElementById("homeScreen");
    if (!homeScreen || document.getElementById("openingMissionButton")) return;
    buildHomeCard();
    buildMissionScreen();
    buildIntro();
    buildResult();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMissionFeature, { once: true });
  } else {
    initMissionFeature();
  }
})();
