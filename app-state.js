    const els = {
      homeScreen: document.getElementById("homeScreen"),
      trainingScreen: document.getElementById("trainingScreen"),
      whiteChoice: document.getElementById("whiteChoice"),
      blackChoice: document.getElementById("blackChoice"),
      openingSelect: document.getElementById("openingSelect"),
      levelSelect: document.getElementById("levelSelect"),
      levelLockNote: document.getElementById("levelLockNote"),
      campaignGrid: document.getElementById("campaignGrid"),
      playerLevel: document.getElementById("playerLevel"),
      xpLabel: document.getElementById("xpLabel"),
      nextLevelLabel: document.getElementById("nextLevelLabel"),
      xpFill: document.getElementById("xpFill"),
      profileStreak: document.getElementById("profileStreak"),
      openingPreview: document.getElementById("openingPreview"),
      conceptButton: document.getElementById("conceptButton"),
      startButton: document.getElementById("startButton"),
      bossButton: document.getElementById("bossButton"),
      backButton: document.getElementById("backButton"),
      homeButton: document.getElementById("homeButton"),
      conceptTrainingButton: document.getElementById("conceptTrainingButton"),
      soundButton: document.getElementById("soundButton"),
      flipButton: document.getElementById("flipButton"),
      restartButton: document.getElementById("restartButton"),
      hintButton: document.getElementById("hintButton"),
      hideHintCheckbox: document.getElementById("hideHintCheckbox"),
      prevButton: document.getElementById("prevButton"),
      nextButton: document.getElementById("nextButton"),
      board: document.getElementById("board"),
      historyStrip: document.getElementById("historyStrip"),
      openingName: document.getElementById("trainingOpeningName"),
      variationName: document.getElementById("trainingVariationName"),
      statusCard: document.getElementById("statusCard"),
      statusIcon: document.getElementById("statusIcon"),
      statusTitle: document.getElementById("statusTitle"),
      statusMessage: document.getElementById("statusMessage"),
      progressLabel: document.getElementById("progressLabel"),
      progressValue: document.getElementById("progressValue"),
      progressFill: document.getElementById("progressFill"),
      bossChip: document.getElementById("bossChip"),
      comboChip: document.getElementById("comboChip"),
      resultBackdrop: document.getElementById("resultBackdrop"),
      modalEmoji: document.getElementById("modalEmoji"),
      resultTitle: document.getElementById("resultTitle"),
      resultSubtitle: document.getElementById("resultSubtitle"),
      resultFirstTry: document.getElementById("resultFirstTry"),
      resultAccuracy: document.getElementById("resultAccuracy"),
      resultErrors: document.getElementById("resultErrors"),
      resultHints: document.getElementById("resultHints"),
      resultXp: document.getElementById("resultXp"),
      resultProgress: document.getElementById("resultProgress"),
      unlockBanner: document.getElementById("unlockBanner"),
      chestArea: document.getElementById("chestArea"),
      openChestButton: document.getElementById("openChestButton"),
      chestLabel: document.getElementById("chestLabel"),
      rewardReveal: document.getElementById("rewardReveal"),
      resultRevenge: document.getElementById("resultRevenge"),
      resultRestart: document.getElementById("resultRestart"),
      resultHome: document.getElementById("resultHome"),
      conceptBackdrop: document.getElementById("conceptBackdrop"),
      conceptTitle: document.getElementById("conceptTitle"),
      conceptSubtitle: document.getElementById("conceptSubtitle"),
      conceptBody: document.getElementById("conceptBody"),
      conceptStartButton: document.getElementById("conceptStartButton"),
      conceptCloseButton: document.getElementById("conceptCloseButton"),
      fatalError: document.getElementById("fatalError")
    };

    let selectedColor = localStorage.getItem("openingTrainer.color") || "white";
    let selectedOpening = null;
    let selectedVariation = null;
    let game = null;
    let preparedLine = [];
    let moveIndex = 0;
    let selectedSquare = null;
    let legalMoves = [];
    let lastMove = null;
    let lastMoveWasCapture = false;
    let hintSquares = new Set();
    let boardLocked = false;
    let temporaryFlip = false;
    let sessionToken = 0;
    let errorsTotal = 0;
    let hintsUsed = 0;
    let firstTryCount = 0;
    let solvedUserMoves = 0;
    let totalUserMoves = 0;
    let errorsAtPly = new Map();
    let hintLevelAtPly = new Map();
    let errorPlySet = new Set();
    let reviewPlySet = new Set();
    let reviewMode = false;
    let lastSessionErrors = new Set();
    let audioContext = null;
    let audioPrimed = false;
    let soundEnabled = localStorage.getItem("openingTrainer.sound") !== "off";
    let hideStrategicHint = localStorage.getItem("openingTrainer.hideStrategicHint") === "on";
    let viewedPly = 0;
    let selectedLevel = 1;
    let profile = null;
    let currentCombo = 0;
    let bestCombo = 0;
    let sessionXp = 0;
    let pendingReward = null;
    let lastUnlockMessages = [];
    let revengeMode = false;
    let revengeQueue = [];
    let revengeIndex = 0;
    let revengeSourceErrors = [];
    let positionQuizMode = false;
    let bossMode = false;
    let quizQueue = [];
    let quizIndex = 0;
    let currentChallenge = null;
    let currentChallengeErrors = 0;
    let bossLives = V7_BOSS_LIVES;
    let retryChallengeIds = new Set();
    let lastSessionMode = "line";
    let preQuizHintPreference = null;
    let pendingConceptAction = null;
    let lastBossPenaltyAt = 0;

    const SOUND_ON_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;
    const SOUND_OFF_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m16 9 5 5"/><path d="m21 9-5 5"/></svg>`;

    function updateSoundButton() {
      if (!els.soundButton) return;
      els.soundButton.innerHTML = soundEnabled ? SOUND_ON_ICON : SOUND_OFF_ICON;
      els.soundButton.title = soundEnabled ? "Son activé" : "Son coupé";
      els.soundButton.setAttribute("aria-label", soundEnabled ? "Couper le son" : "Activer le son");
      els.soundButton.setAttribute("aria-pressed", String(soundEnabled));
    }

    async function primeAudio() {
      if (audioPrimed) {
        if (audioContext?.state === "suspended") audioContext.resume().catch(() => {});
        return;
      }
      audioPrimed = true;
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        audioContext = new AudioCtx();
        if (audioContext.state === "suspended") await audioContext.resume();
      } catch (_) {
        audioContext = null;
      }
    }

    function toggleSound() {
      soundEnabled = !soundEnabled;
      localStorage.setItem("openingTrainer.sound", soundEnabled ? "on" : "off");
      updateSoundButton();
      if (soundEnabled) primeAudio();
    }

    function playMoveAudio(kind = "move") {
      if (!soundEnabled || !audioContext) return;
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      const now = audioContext.currentTime;
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = kind === "capture" ? "square" : "triangle";
      oscillator.frequency.setValueAtTime(kind === "capture" ? 125 : 185, now);
      oscillator.frequency.exponentialRampToValueAtTime(kind === "capture" ? 58 : 115, now + (kind === "capture" ? .10 : .065));
      gain.gain.setValueAtTime(kind === "capture" ? .055 : .035, now);
      gain.gain.exponentialRampToValueAtTime(.0001, now + (kind === "capture" ? .11 : .075));
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + (kind === "capture" ? .115 : .08));
    }

    function fail(message) {
      els.fatalError.style.display = "block";
      els.fatalError.textContent = message;
      els.homeScreen.style.display = "none";
      els.trainingScreen.style.display = "none";
    }

    function getStats() {
      try {
        return JSON.parse(localStorage.getItem("openingTrainer.stats") || "{}");
      } catch (_) {
        return {};
      }
    }

    function saveStats(openingKey, accuracy) {
      const stats = getStats();
      const current = stats[openingKey] || { sessions: 0, best: 0, errors: 0, hints: 0 };
      current.sessions += 1;
      current.best = Math.max(current.best, accuracy);
      current.errors += errorsTotal;
      current.hints += hintsUsed;
      stats[openingKey] = current;
      localStorage.setItem("openingTrainer.stats", JSON.stringify(stats));
    }

    function updateColorButtons() {
      els.whiteChoice.classList.toggle("active", selectedColor === "white");
      els.blackChoice.classList.toggle("active", selectedColor === "black");
      els.whiteChoice.setAttribute("aria-pressed", String(selectedColor === "white"));
      els.blackChoice.setAttribute("aria-pressed", String(selectedColor === "black"));
    }

    function populateOpenings() {
      const filtered = OPENINGS.filter(item => item.color === selectedColor);
      els.openingSelect.innerHTML = filtered.map(item => `<option value="${item.id}">${item.name}</option>`).join("");
      els.openingSelect.selectedIndex = 0;
      selectedOpening = filtered[0] || null;
      populateVariations();
    }

    function populateVariations() {
      if (!selectedOpening) return;
      els.variationSelect.innerHTML = selectedOpening.variations
        .map(item => `<option value="${item.id}">${item.name}</option>`)
        .join("");
      els.variationSelect.selectedIndex = 0;
      selectedVariation = selectedOpening.variations[0] || null;
      updatePreview();
    }

    function updatePreview() {
      if (!selectedOpening || !selectedVariation) return;
      const statsKey = `${selectedOpening.id}:${selectedVariation.id}:${selectedColor}`;
      const stat = getStats()[statsKey];
      const userMoveCount = selectedVariation.moves.filter((_, index) => (index % 2 === 0) === (selectedColor === "white")).length;
      const summary = selectedVariation.summary || "Développer les pièces, contrôler le centre et mettre le roi en sécurité.";
      els.openingPreview.innerHTML = `
        <strong>${selectedOpening.name} — ${selectedVariation.name}</strong>
        <span>${selectedOpening.description}</span>
        <span class="preview-plan"><b>Plan à retenir :</b> ${summary}</span>
        <span class="previous-stats">${userMoveCount} coups à trouver · ${stat ? `${stat.sessions} entraînement${stat.sessions > 1 ? "s" : ""} · meilleur score ${stat.best} %` : "pas encore entraînée"}</span>
      `;
    }

    function setColor(color) {
      selectedColor = color;
      localStorage.setItem("openingTrainer.color", color);
      updateColorButtons();
      populateOpenings();
    }

    function prepareLine(sanMoves) {
      const temp = new Chess();
      return sanMoves.map((san, index) => {
        const move = temp.move(san, { sloppy: true });
        if (!move) {
          throw new Error(`Coup invalide dans la ligne au demi-coup ${index + 1} : ${san}`);
        }
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

