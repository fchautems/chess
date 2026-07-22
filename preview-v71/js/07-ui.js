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

    function startTraining(options = {}) {
      try {
        selectedOpening = OPENINGS.find(item => item.id === els.openingSelect.value);
        selectedVariation = selectedOpening.variations.find(item => item.id === els.variationSelect.value);
        preparedLine = prepareLine(selectedVariation.moves);
      } catch (error) {
        fail(`Impossible de charger cette ouverture : ${error.message}`);
        return;
      }

      sessionToken += 1;
      game = new Chess();
      moveIndex = 0;
      selectedSquare = null;
      legalMoves = [];
      lastMove = null;
      lastMoveWasCapture = false;
      hintSquares = new Set();
      boardLocked = false;
      temporaryFlip = false;
      errorsTotal = 0;
      hintsUsed = 0;
      firstTryCount = 0;
      solvedUserMoves = 0;
      errorsAtPly = new Map();
      hintLevelAtPly = new Map();
      errorPlySet = new Set();
      reviewMode = Boolean(options.reviewMode);
      reviewPlySet = options.reviewPlySet ? new Set(options.reviewPlySet) : new Set();
      viewedPly = 0;
      totalUserMoves = preparedLine.filter(move => move.color === userColorCode()).length;

      els.openingName.textContent = selectedOpening.name;
      els.variationName.textContent = reviewMode ? `${selectedVariation.name} · Révision` : selectedVariation.name;
      document.body.classList.add("training-active");
      window.scrollTo(0, 0);
      els.homeScreen.classList.remove("active");
      els.trainingScreen.classList.add("active");
      els.resultBackdrop.classList.remove("open");
      renderAll();
      continueFlow(350);
    }

    function userColorCode() {
      return selectedColor === "white" ? "w" : "b";
    }

    function isUserTurn() {
      return game && game.turn() === userColorCode();
    }

    function currentOrientation() {
      const normal = selectedColor;
      if (!temporaryFlip) return normal;
      return normal === "white" ? "black" : "white";
    }

    function currentPly() {
      return game ? game.history().length : 0;
    }

    function isPreviewing() {
      return Boolean(game) && viewedPly !== currentPly();
    }

    function buildPreviewState() {
      const preview = new Chess();
      let last = null;
      const history = game ? game.history() : [];
      for (let i = 0; i < viewedPly; i += 1) last = preview.move(history[i]);
      return { preview, last };
    }

    function strategicHintText() {
      const note = selectedVariation?.notes?.[moveIndex];
      if (note) return note;
      const expected = expectedMove();
      if (!expected) return `Trouve le prochain coup ${selectedColor === "white" ? "blanc" : "noir"}.`;
      const piece = game?.get(expected.from);
      const san = expected.san || "";
      if (san === "O-O" || san === "O-O-O") return "L’objectif est de mettre ton roi à l’abri et de connecter tes tours.";
      if (san.includes("+")) return "Cherche un coup actif qui met le roi adverse sous pression.";
      if (san.includes("x")) return `L’idée est de gagner du temps par une capture active${piece ? ` avec ${articlePiece(piece.type)}` : ""}.`;
      if (piece?.type === "p") return "L’objectif est de renforcer ou contester le centre avec ton pion.";
      if (piece?.type === "n") return "Développe ton cavalier vers une case active pour attaquer le centre et soutenir tes pièces.";
      if (piece?.type === "b") return "Développe ton fou vers une diagonale utile afin de viser le centre ou le roi adverse.";
      if (piece?.type === "r") return "Active la tour sur une colonne ou une rangée utile pour augmenter la pression.";
      if (piece?.type === "q") return "Cherche un coup de dame utile, sans la sortir trop tôt de manière gratuite.";
      if (piece?.type === "k") return "Améliore la sécurité du roi ou coordonne-le avec tes tours.";
      return `Trouve le prochain coup ${selectedColor === "white" ? "blanc" : "noir"}.`;
    }

    function liveTurnMessage() {
      return hideStrategicHint ? `Trouve le prochain coup ${selectedColor === "white" ? "blanc" : "noir"}.` : strategicHintText();
    }

    function setUserTurnStatus({reviewing = false} = {}) {
      if (reviewing) {
        setStatus("hint", "↻", "Coup à revoir", "Tu avais hésité ici lors de la session précédente.");
        return;
      }
      if (hideStrategicHint) {
        setStatus("", selectedColor === "white" ? "♙" : "♟", "À toi de jouer", `Trouve le prochain coup ${selectedColor === "white" ? "blanc" : "noir"}.`);
      } else {
        setStatus("hint", "💡", "Indice stratégique", strategicHintText());
      }
    }

    function updatePreviewButtons() {
      const ply = currentPly();
      els.prevButton.disabled = !game || viewedPly <= 0;
      els.nextButton.disabled = !game || viewedPly >= ply;
    }

    function jumpToPly(targetPly) {
      if (!game) return;
      const ply = currentPly();
      viewedPly = Math.max(0, Math.min(targetPly, ply));
      clearSelection();
      if (isPreviewing()) {
        const history = game.history();
        const label = viewedPly === 0 ? "Position de départ" : `Position après ${history[viewedPly - 1]}`;
        setStatus("hint", "◀", "Aperçu de la ligne", `${label}. Utilise Suivant pour revenir à la position actuelle.`);
      } else if (isUserTurn()) {
        const reviewing = reviewMode && reviewPlySet.has(moveIndex);
        setUserTurnStatus({ reviewing });
      } else {
        setStatus("auto", "…", "L’adversaire joue", "Observe bien sa réponse.");
      }
      renderAll();
    }

    function renderAll() {
      renderBoard();
      renderHistory();
      renderProgress();
      updatePreviewButtons();
      els.hideHintCheckbox.checked = hideStrategicHint;
      els.hintButton.disabled = boardLocked || isPreviewing() || !isUserTurn() || moveIndex >= preparedLine.length;
    }

    function renderBoard() {
      if (!game) return;
      const orientation = currentOrientation();
      const ranks = orientation === "white" ? [8,7,6,5,4,3,2,1] : [1,2,3,4,5,6,7,8];
      const files = orientation === "white" ? FILES : [...FILES].reverse();
      const bottomRank = orientation === "white" ? 1 : 8;
      const leftFile = orientation === "white" ? "a" : "h";
      const previewState = buildPreviewState();
      const boardGame = isPreviewing() ? previewState.preview : game;
      const displayLastMove = isPreviewing() && previewState.last ? { from: previewState.last.from, to: previewState.last.to } : lastMove;
      const displayCapture = isPreviewing() && previewState.last ? Boolean(previewState.last.captured) : lastMoveWasCapture;
      const liveSelection = !isPreviewing();
      const legalTargets = liveSelection ? new Map(legalMoves.map(move => [move.to, move])) : new Map();
      els.board.innerHTML = "";

      for (const rank of ranks) {
        for (const file of files) {
          const squareName = `${file}${rank}`;
          const fileIndex = FILES.indexOf(file);
          const isDark = (fileIndex + rank) % 2 === 1;
          const square = document.createElement("button");
          square.type = "button";
          square.className = `square ${isDark ? "dark" : "light"}`;
          square.dataset.square = squareName;
          square.setAttribute("role", "gridcell");
          square.setAttribute("aria-label", squareName);

          if (displayLastMove && (squareName === displayLastMove.from || squareName === displayLastMove.to)) square.classList.add("last");
          if (displayLastMove && squareName === displayLastMove.to) square.classList.add(displayCapture ? "just-captured" : "just-moved");
          if (liveSelection && selectedSquare === squareName) square.classList.add("selected");
          if (hintSquares.has(squareName)) square.classList.add(squareName === expectedMove()?.from ? "hint-from" : "hint-to");

          const piece = boardGame.get(squareName);
          const targetMove = legalTargets.get(squareName);

          if (targetMove && !piece) {
            const dot = document.createElement("span");
            dot.className = "legal-dot";
            square.appendChild(dot);
          } else if (targetMove && piece) {
            const ring = document.createElement("span");
            ring.className = "capture-ring";
            square.appendChild(ring);
          }

          if (piece) {
            const pieceEl = document.createElement("span");
            pieceEl.className = "piece";
            pieceEl.dataset.from = squareName;
            pieceEl.draggable = !isPreviewing() && !boardLocked && piece.color === userColorCode() && isUserTurn();
            pieceEl.setAttribute("aria-hidden", "true");
            pieceEl.addEventListener("dragstart", onDragStart);
            const pieceImg = document.createElement("img");
            pieceImg.className = "piece-img";
            pieceImg.alt = "";
            pieceImg.draggable = false;
            pieceImg.src = PIECE_IMAGES[`${piece.color}${piece.type}`] || "";
            pieceEl.appendChild(pieceImg);
            square.appendChild(pieceEl);
            square.setAttribute("aria-label", `${PIECE_NAMES[piece.type]} ${piece.color === "w" ? "blanc" : "noir"} en ${squareName}`);
          }

          if (rank === bottomRank) {
            const fileCoord = document.createElement("span");
            fileCoord.className = "coord file";
            fileCoord.textContent = file;
            square.appendChild(fileCoord);
          }
          if (file === leftFile) {
            const rankCoord = document.createElement("span");
            rankCoord.className = "coord rank";
            rankCoord.textContent = String(rank);
            square.appendChild(rankCoord);
          }

          square.addEventListener("click", onSquareClick);
          square.addEventListener("dragover", event => {
            if (legalTargets.has(squareName)) event.preventDefault();
          });
          square.addEventListener("drop", onDrop);
          els.board.appendChild(square);
        }
      }
    }

    function onSquareClick(event) {
      if (boardLocked || isPreviewing() || !isUserTurn()) return;
      const square = event.currentTarget.dataset.square;
      const piece = game.get(square);

      if (selectedSquare && legalMoves.some(move => move.to === square)) {
        attemptUserMove(selectedSquare, square);
        return;
      }

      if (piece && piece.color === userColorCode()) {
        selectSquare(square);
        return;
      }

      clearSelection();
    }

    function selectSquare(square) {
      selectedSquare = square;
      legalMoves = game.moves({ square, verbose: true });
      renderBoard();
    }

    function clearSelection() {
      selectedSquare = null;
      legalMoves = [];
      renderBoard();
    }

    function onDragStart(event) {
      if (boardLocked || isPreviewing() || !isUserTurn()) {
        event.preventDefault();
        return;
      }
      const from = event.currentTarget.dataset.from;
      const piece = game.get(from);
      if (!piece || piece.color !== userColorCode()) {
        event.preventDefault();
        return;
      }
      selectSquare(from);
      event.dataTransfer.setData("text/plain", from);
      event.dataTransfer.effectAllowed = "move";
    }

    function onDrop(event) {
      event.preventDefault();
      if (boardLocked || isPreviewing() || !isUserTurn()) return;
      const from = event.dataTransfer.getData("text/plain") || selectedSquare;
      const to = event.currentTarget.dataset.square;
      if (from && legalMoves.some(move => move.from === from && move.to === to)) {
        attemptUserMove(from, to);
      } else {
        clearSelection();
      }
    }

    function expectedMove() {
      return preparedLine[moveIndex] || null;
    }

    function wait(ms) {
      return new Promise(resolve => window.setTimeout(resolve, ms));
    }

    function clearBoardMarkersForAnimation() {
      els.board.querySelectorAll(".selected").forEach(node => node.classList.remove("selected"));
      els.board.querySelectorAll(".legal-dot, .capture-ring").forEach(node => node.remove());
    }

    async function animatePendingMove(from, to, pieceCode, isCapture = false) {
      if (!els.board) return;
      const fromSquare = els.board.querySelector(`[data-square="${from}"]`);
      const toSquare = els.board.querySelector(`[data-square="${to}"]`);
      const sourcePiece = fromSquare?.querySelector(".piece");
      const sourceImage = sourcePiece?.querySelector(".piece-img");
      const capturedPiece = isCapture ? toSquare?.querySelector(".piece") : null;
      const imageSource = sourceImage?.src || PIECE_IMAGES[pieceCode];
      if (!fromSquare || !toSquare || !sourcePiece || !sourceImage || !imageSource) {
        await wait(MOVE_ANIMATION_MS);
        return;
      }

      clearBoardMarkersForAnimation();
      const sourceRect = sourceImage.getBoundingClientRect();
      const targetRect = toSquare.getBoundingClientRect();
      const destinationLeft = targetRect.left + (targetRect.width - sourceRect.width) / 2;
      const destinationTop = targetRect.top + (targetRect.height - sourceRect.height) / 2;
      const dx = destinationLeft - sourceRect.left;
      const dy = destinationTop - sourceRect.top;

      const floating = document.createElement("img");
      floating.className = "moving-piece-overlay";
      floating.alt = "";
      floating.draggable = false;
      floating.src = imageSource;
      floating.style.left = `${sourceRect.left}px`;
      floating.style.top = `${sourceRect.top}px`;
      floating.style.width = `${sourceRect.width}px`;
      floating.style.height = `${sourceRect.height}px`;
      floating.style.transition = `transform ${MOVE_ANIMATION_MS}ms cubic-bezier(.18,.72,.25,1)`;
      document.body.appendChild(floating);
      sourcePiece.classList.add("animation-source-hidden");

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          floating.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
          capturedPiece?.classList.add("animation-captured");
        });
      });

      await new Promise(resolve => {
        let finished = false;
        const done = () => {
          if (finished) return;
          finished = true;
          resolve();
        };
        floating.addEventListener("transitionend", done, { once: true });
        window.setTimeout(done, MOVE_ANIMATION_MS + 100);
      });

      floating.remove();
      sourcePiece.classList.remove("animation-source-hidden");
      capturedPiece?.classList.remove("animation-captured");
    }

    async function attemptUserMove(from, to) {
      const legal = game.moves({ square: from, verbose: true }).find(move => move.to === to);
      if (!legal) {
        clearSelection();
        return;
      }

      const expected = expectedMove();
      if (!expected || expected.color !== userColorCode()) return;

      if (legal.from === expected.from && legal.to === expected.to) {
        const errorsForMove = errorsAtPly.get(moveIndex) || 0;
        if (errorsForMove === 0) firstTryCount += 1;
        solvedUserMoves += 1;
        boardLocked = true;
        selectedSquare = null;
        legalMoves = [];
        hintSquares = new Set();
        const note = selectedVariation.notes?.[moveIndex] || "Le coup correspond à la ligne étudiée.";
        setStatus("success", "✓", "Bon coup", note);
        renderProgress();
        const token = sessionToken;

        await animatePendingMove(expected.from, expected.to, `${expected.color}${expected.piece}`, Boolean(legal.captured));
        if (token !== sessionToken) return;

        const played = game.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
        if (!played) {
          fail("Le coup attendu n'a pas pu être joué. La ligne d'ouverture est peut-être corrompue.");
          return;
        }

        lastMove = { from: played.from, to: played.to };
        lastMoveWasCapture = Boolean(played.captured);
        moveIndex += 1;
        viewedPly = currentPly();
        playMoveAudio(lastMoveWasCapture ? "capture" : "move");
        renderAll();
        const target = els.board.querySelector(`[data-square="${played.to}"]`);
        target?.classList.add(lastMoveWasCapture ? "capture-landed" : "move-landed");
        window.setTimeout(() => target?.classList.remove("capture-landed", "move-landed"), 220);

        await wait(SUCCESS_PAUSE_MS);
        if (token !== sessionToken) return;
        continueFlow(OPPONENT_THINK_MS);
      } else {
        registerWrongMove(expected);
      }
    }

    function registerWrongMove(expected) {
      const count = (errorsAtPly.get(moveIndex) || 0) + 1;
      errorsAtPly.set(moveIndex, count);
      errorsTotal += 1;
      errorPlySet.add(moveIndex);
      selectedSquare = null;
      legalMoves = [];
      hintSquares = new Set();

      if (navigator.vibrate) navigator.vibrate(35);
      els.board.classList.remove("shake");
      void els.board.offsetWidth;
      els.board.classList.add("shake");

      if (count === 1) {
        setStatus("hint", "💡", "Indice stratégique", strategicHintText());
      } else if (count === 2) {
        hintSquares.add(expected.from);
        const piece = game.get(expected.from);
        setStatus("hint", "💡", "Indice 1", `${strategicHintText()} La pièce à jouer est ${piece ? articlePiece(piece.type) : "la bonne pièce"}.`);
      } else {
        hintSquares.add(expected.from);
        hintSquares.add(expected.to);
        setStatus("hint", "💡", "Indice complet", `Joue de ${expected.from} vers ${expected.to}. Fais toi-même le déplacement.`);
      }
      renderAll();
    }

    function articlePiece(type) {
      const name = PIECE_NAMES[type] || "pièce";
      return ["tour", "dame"].includes(name) ? `la ${name}` : `le ${name}`;
    }

    function useHint() {
      if (boardLocked || isPreviewing() || !isUserTurn() || moveIndex >= preparedLine.length) return;
      const expected = expectedMove();
      const level = Math.min((hintLevelAtPly.get(moveIndex) || 0) + 1, 3);
      hintLevelAtPly.set(moveIndex, level);
      hintsUsed += 1;
      const piece = game.get(expected.from);
      const pieceName = piece ? articlePiece(piece.type) : "la bonne pièce";
      hintSquares = new Set();

      if (level === 1) {
        setStatus("hint", "💡", "Indice 1", `${strategicHintText()} La pièce à jouer est ${pieceName}.`);
      } else if (level === 2) {
        hintSquares.add(expected.from);
        setStatus("hint", "💡", "Indice 2", `Utilise ${pieceName} situé${piece && ["dame","tour"].includes(PIECE_NAMES[piece.type]) ? "e" : ""} en ${expected.from}.`);
      } else {
        hintSquares.add(expected.from);
        hintSquares.add(expected.to);
        setStatus("hint", "💡", "Indice complet", `Joue de ${expected.from} vers ${expected.to}.`);
      }
      renderAll();
    }

    function continueFlow(delay = 0) {
      const token = sessionToken;
      if (moveIndex >= preparedLine.length) {
        window.setTimeout(() => {
          if (token === sessionToken) finishTraining();
        }, Math.max(delay, 350));
        return;
      }

      if (isUserTurn()) {
        boardLocked = false;
        window.setTimeout(() => {
          if (token !== sessionToken || !isUserTurn()) return;
          const reviewing = reviewMode && reviewPlySet.has(moveIndex);
          setUserTurnStatus({ reviewing });
          viewedPly = currentPly();
          renderAll();
        }, delay);
      } else {
        boardLocked = true;
        setStatus("auto", "…", "L’adversaire réfléchit", "Observe la position avant sa réponse.");
        renderAll();
        window.setTimeout(() => {
          if (token !== sessionToken) return;
          playOpponentMove();
        }, Math.max(delay, OPPONENT_THINK_MS));
      }
    }

    async function playOpponentMove() {
      if (moveIndex >= preparedLine.length) {
        finishTraining();
        return;
      }
      const expected = expectedMove();
      const targetPiece = game.get(expected.to);
      const token = sessionToken;

      await animatePendingMove(expected.from, expected.to, `${expected.color}${expected.piece}`, Boolean(targetPiece));
      if (token !== sessionToken) return;

      const played = game.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      if (!played) {
        fail(`Le coup automatique ${expected.san} n'a pas pu être joué.`);
        return;
      }
      lastMove = { from: played.from, to: played.to };
      lastMoveWasCapture = Boolean(played.captured);
      moveIndex += 1;
      viewedPly = currentPly();
      playMoveAudio(lastMoveWasCapture ? "capture" : "move");
      boardLocked = false;
      renderAll();
      const target = els.board.querySelector(`[data-square="${played.to}"]`);
      target?.classList.add(lastMoveWasCapture ? "capture-landed" : "move-landed");
      window.setTimeout(() => target?.classList.remove("capture-landed", "move-landed"), 220);
      continueFlow(220);
    }

    function setStatus(kind, icon, title, message) {
      els.statusCard.className = `status-card ${kind || ""}`.trim();
      els.statusIcon.textContent = icon;
      els.statusTitle.textContent = title;
      els.statusMessage.textContent = message;
    }

    function renderHistory() {
      if (!game) return;
      const history = game.history();
      if (!history.length) {
        els.historyStrip.innerHTML = `<span class="history-empty">Les coups apparaîtront ici…</span>`;
        return;
      }

      let html = "";
      for (let i = 0; i < history.length; i += 2) {
        const white = history[i];
        const black = history[i + 1];
        const whiteLatest = i === history.length - 1 ? " latest" : "";
        const blackLatest = i + 1 === history.length - 1 ? " latest" : "";
        const whiteViewed = viewedPly === i + 1 ? " viewed" : "";
        const blackViewed = viewedPly === i + 2 ? " viewed" : "";
        html += `<span class="move-pair"><span class="move-number">${Math.floor(i / 2) + 1}.</span><span class="move-san${whiteLatest}${whiteViewed}">${white}</span>${black ? `<span class="move-san${blackLatest}${blackViewed}">${black}</span>` : ""}</span>`;
      }
      els.historyStrip.innerHTML = html;
      requestAnimationFrame(() => {
        const target = els.historyStrip.querySelector('.move-san.viewed') || els.historyStrip.querySelector('.move-san.latest') || els.historyStrip.lastElementChild;
        target?.scrollIntoView({ block: "nearest", inline: "end" });
      });
    }

    function renderProgress() {
      const percent = totalUserMoves ? Math.round((solvedUserMoves / totalUserMoves) * 100) : 0;
      els.progressLabel.textContent = reviewMode ? "Révision" : "Progression";
      els.progressValue.textContent = `${solvedUserMoves} / ${totalUserMoves}`;
      els.progressFill.style.width = `${percent}%`;
    }

    function finishTraining() {
      boardLocked = true;
      renderAll();
      const accuracy = totalUserMoves ? Math.round((firstTryCount / totalUserMoves) * 100) : 100;
      lastSessionErrors = new Set(errorPlySet);
      const statsKey = `${selectedOpening.id}:${selectedVariation.id}:${selectedColor}`;
      saveStats(statsKey, accuracy);

      els.resultSubtitle.textContent = `${selectedOpening.name} — ${selectedVariation.name}`;
      els.resultFirstTry.textContent = `${firstTryCount} / ${totalUserMoves}`;
      els.resultAccuracy.textContent = `${accuracy} %`;
      els.resultErrors.textContent = String(errorsTotal);
      els.resultHints.textContent = String(hintsUsed);
      els.resultBackdrop.classList.add("open");
    }

    function restartCurrent(confirmFirst = true) {
      if (confirmFirst && !window.confirm("Recommencer cette ouverture depuis le début ?")) return;
      startTraining();
    }

    function goHome(confirmFirst = false) {
      if (confirmFirst && moveIndex > 0 && !els.resultBackdrop.classList.contains("open")) {
        if (!window.confirm("Quitter l’entraînement en cours ?")) return;
      }
      sessionToken += 1;
      document.body.classList.remove("training-active");
      window.scrollTo(0, 0);
      els.resultBackdrop.classList.remove("open");
      els.trainingScreen.classList.remove("active");
      els.homeScreen.classList.add("active");
      populateOpenings();
    }

    function flipBoard() {
      temporaryFlip = !temporaryFlip;
      renderBoard();
    }


    function bindEvents() {
      els.whiteChoice.addEventListener("click", () => setColor("white"));
      els.blackChoice.addEventListener("click", () => setColor("black"));
      els.openingSelect.addEventListener("change", () => {
        selectedOpening = OPENINGS.find(item => item.id === els.openingSelect.value);
        populateVariations();
      });
      els.variationSelect.addEventListener("change", () => {
        selectedVariation = selectedOpening.variations.find(item => item.id === els.variationSelect.value);
        updatePreview();
      });
      els.startButton.addEventListener("click", () => { primeAudio(); startTraining(); });
      els.bossButton.addEventListener("click", () => { primeAudio(); startBoss(); });
      els.restartButton.addEventListener("click", () => restartCurrent(true));
      els.hintButton.addEventListener("click", useHint);
      els.hideHintCheckbox.addEventListener("change", event => {
        hideStrategicHint = event.currentTarget.checked;
        localStorage.setItem("openingTrainer.hideStrategicHint", hideStrategicHint ? "on" : "off");
        if (!isPreviewing() && isUserTurn()) {
          const reviewing = reviewMode && reviewPlySet.has(moveIndex);
          setUserTurnStatus({ reviewing });
          renderAll();
        }
      });
      els.prevButton.addEventListener("click", () => jumpToPly(viewedPly - 1));
      els.nextButton.addEventListener("click", () => jumpToPly(viewedPly + 1));
      els.backButton.addEventListener("click", () => goHome(true));
      els.homeButton.addEventListener("click", () => goHome(true));
      els.soundButton.addEventListener("click", toggleSound);
      els.flipButton.addEventListener("click", flipBoard);
      els.resultRestart.addEventListener("click", () => startTraining());
      els.resultHome.addEventListener("click", () => goHome(false));
      document.addEventListener("pointerdown", primeAudio, { passive: true });
      document.addEventListener("keydown", primeAudio, { passive: true });
      window.addEventListener("keydown", event => {
        if (event.key === "Escape" && els.resultBackdrop.classList.contains("open")) goHome(false);
      });
    }

    function init() {
      if (typeof Chess === "undefined") {
        fail("La bibliothèque d’échecs n’a pas pu être chargée. Vérifie la connexion Internet puis recharge la page.");
        return;
      }
      if (!["white", "black"].includes(selectedColor)) selectedColor = "white";
      updateSoundButton();
      updateColorButtons();
      els.hideHintCheckbox.checked = hideStrategicHint;
      populateOpenings();
      bindEvents();
    }



    /* ========================= V6 : logique de campagne ========================= */
    function defaultProfile() {
      return {
        xp: 0,
        activeDays: [],
        noChestSessions: 0,
        inventory: ["theme-walnut"],
        equippedTheme: "walnut",
        openingProgress: {},
        weakPositions: {},
        rewards: []
      };
    }

    function loadProfile() {
      try {
        const saved = JSON.parse(localStorage.getItem("openingTrainer.v6.profile") || "null");
        return Object.assign(defaultProfile(), saved || {});
      } catch (_) {
        return defaultProfile();
      }
    }

    function saveProfile() {
      localStorage.setItem("openingTrainer.v6.profile", JSON.stringify(profile));
    }

    function todayKey() {
      return new Date().toISOString().slice(0, 10);
    }

    function registerActiveDay() {
      const day = todayKey();
      profile.activeDays = Array.isArray(profile.activeDays) ? profile.activeDays : [];
      if (!profile.activeDays.includes(day)) profile.activeDays.push(day);
      profile.activeDays = profile.activeDays.slice(-60);
    }

    function activeDayStreak() {
      const days = new Set(profile.activeDays || []);
      let cursor = new Date();
      let streak = 0;
      for (let i = 0; i < 365; i += 1) {
        const key = cursor.toISOString().slice(0, 10);
        if (!days.has(key)) {
          if (i === 0) {
            cursor.setUTCDate(cursor.getUTCDate() - 1);
            continue;
          }
          break;
        }
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }
      return streak;
    }

    function playerLevelFromXp(xp) {
      return Math.floor(Math.max(0, xp) / 500) + 1;
    }

    function updateProfileUI() {
      const level = playerLevelFromXp(profile.xp || 0);
      const within = (profile.xp || 0) % 500;
      els.playerLevel.textContent = String(level);
      els.xpLabel.textContent = `${profile.xp || 0} XP`;
      els.nextLevelLabel.textContent = `${500 - within} avant niv. ${level + 1}`;
      els.xpFill.style.width = `${Math.round((within / 500) * 100)}%`;
      const streak = activeDayStreak();
      els.profileStreak.textContent = `🔥 ${streak} jour${streak > 1 ? "s" : ""}`;
      document.body.dataset.boardTheme = profile.equippedTheme || "walnut";
    }

    function getOpeningProgress(openingId) {
      profile.openingProgress[openingId] ||= { unlockedLevel: 1, masteredLevel: 0, levels: {} };
      const item = profile.openingProgress[openingId];
      item.levels ||= {};
      return item;
    }

    function getLevelProgress(openingId, level) {
      const opening = getOpeningProgress(openingId);
      opening.levels[level] ||= { sessions: 0, qualifying: 0, best: 0, accuracySum: 0, hints: 0 };
      return opening.levels[level];
    }

    function isOpeningUnlocked(openingId) {
      const requirement = CAMPAIGN[openingId]?.unlock;
      if (!requirement) return true;
      return getOpeningProgress(requirement.opening).masteredLevel >= requirement.level;
    }

    function allBranches(opening) {
      const main = opening.variations.map((variation, index) => ({ ...variation, level: index === 0 ? 1 : (variation.level || 1) }));
      return main.concat(EXTRA_VARIATIONS[opening.id] || []);
    }

    function branchesForLevel(opening, level) {
      return allBranches(opening).filter(branch => (branch.level || 1) <= level);
    }

    function weakScoreForBranch(openingId, variationId) {
      return Object.entries(profile.weakPositions || {})
        .filter(([key]) => key.startsWith(`${openingId}|${variationId}|`))
        .reduce((sum, [, value]) => sum + Math.max(0, (value.mistakes || 0) - (value.successes || 0)), 0);
    }

    function chooseVariation(opening, level) {
      const candidates = branchesForLevel(opening, level);
      if (candidates.length <= 1) return candidates[0];

      profile.branchCycles ||= {};
      const key = `${opening.id}|${level}|${selectedColor}`;
      const ids = candidates.map(branch => branch.id);
      const state = profile.branchCycles[key] || { remaining: [], last: null };
      state.remaining = (state.remaining || []).filter(id => ids.includes(id));

      if (!state.remaining.length) {
        const pool = candidates.map(branch => ({
          id: branch.id,
          weight: 1 + Math.min(5, weakScoreForBranch(opening.id, branch.id))
        }));
        const bag = [];
        while (pool.length) {
          const total = pool.reduce((sum, item) => sum + item.weight, 0);
          let roll = Math.random() * total;
          let picked = 0;
          for (; picked < pool.length; picked += 1) {
            roll -= pool[picked].weight;
            if (roll <= 0) break;
          }
          bag.push(pool.splice(Math.min(picked, pool.length - 1), 1)[0].id);
        }
        if (bag.length > 1 && bag[0] === state.last) [bag[0], bag[1]] = [bag[1], bag[0]];
        state.remaining = bag;
      }

      const chosenId = state.remaining.shift();
      state.last = chosenId;
      profile.branchCycles[key] = state;
      saveProfile();
      return candidates.find(branch => branch.id === chosenId) || candidates[0];
    }

    function masteryTarget(level) {
      return level === 1 ? 2 : 3;
    }

    function levelMasteryPercent(openingId, level) {
      const stat = getLevelProgress(openingId, level);
      const target = masteryTarget(level);
      const qualifyingPart = Math.min(1, stat.qualifying / target) * 70;
      const accuracyPart = Math.min(1, stat.best / 90) * 30;
      return Math.round(qualifyingPart + accuracyPart);
    }

    function openingRank(openingId) {
      const progress = getOpeningProgress(openingId);
      if (progress.masteredLevel >= 3) return "Maître";
      if (progress.masteredLevel >= 2) return "Or";
      if (progress.masteredLevel >= 1) return "Argent";
      const l1 = getLevelProgress(openingId, 1);
      if (l1.sessions > 0) return "Bronze";
      return "Découverte";
    }

    function openingUnlockText(openingId) {
      return CAMPAIGN[openingId]?.unlock?.text || "";
    }

    function populateOpenings(preferredId = null) {
      const filtered = OPENINGS.filter(item => item.color === selectedColor);
      els.openingSelect.innerHTML = filtered.map(item => {
        const unlocked = isOpeningUnlocked(item.id);
        return `<option value="${item.id}">${unlocked ? "" : "🔒 "}${item.name}</option>`;
      }).join("");
      const firstUnlocked = filtered.find(item => isOpeningUnlocked(item.id)) || filtered[0];
      const chosen = filtered.find(item => item.id === preferredId) || firstUnlocked;
      els.openingSelect.value = chosen?.id || "";
      selectedOpening = chosen || null;
      populateLevels();
      renderCampaign();
    }

    function populateLevels(preferredLevel = null) {
      if (!selectedOpening) return;
      const unlocked = isOpeningUnlocked(selectedOpening.id);
      const progress = getOpeningProgress(selectedOpening.id);
      const maxLevel = unlocked ? Math.max(1, progress.unlockedLevel || 1) : 0;

      /*
       * Après reconstruction du <select>, le navigateur place toujours sa valeur
       * sur la première option. On choisit donc explicitement le niveau à afficher :
       * - le niveau demandé lorsqu'il est encore accessible ;
       * - sinon le niveau le plus élevé déjà débloqué.
       */
      const requestedLevel = Number(preferredLevel);
      selectedLevel = Number.isFinite(requestedLevel) && requestedLevel >= 1
        ? Math.min(requestedLevel, Math.max(1, maxLevel))
        : Math.max(1, maxLevel);

      els.levelSelect.innerHTML = [1,2,3].map(level => {
        const available = level <= maxLevel;
        const selected = level === selectedLevel ? "selected" : "";
        return `<option value="${level}" ${available ? "" : "disabled"} ${selected}>${available ? "" : "🔒 "}Niveau ${level} — ${LEVELS[level].name}</option>`;
      }).join("");
      els.levelSelect.value = String(selectedLevel);
      els.levelSelect.disabled = !unlocked;
      els.levelLockNote.textContent = unlocked
        ? (maxLevel < 3 ? `Niveau ${maxLevel + 1} verrouillé jusqu’à la maîtrise du niveau ${maxLevel}.` : "Tous les niveaux sont disponibles.")
        : `🔒 ${openingUnlockText(selectedOpening.id)}`;
      updatePreview();
    }

    function updatePreview() {
      if (!selectedOpening) return;
      const meta = CAMPAIGN[selectedOpening.id] || {};
      const unlocked = isOpeningUnlocked(selectedOpening.id);
      const progress = getOpeningProgress(selectedOpening.id);
      const stat = getLevelProgress(selectedOpening.id, selectedLevel);
      const branches = branchesForLevel(selectedOpening, selectedLevel);
      const percent = levelMasteryPercent(selectedOpening.id, selectedLevel);
      const target = masteryTarget(selectedLevel);
      els.startButton.disabled = !unlocked || selectedLevel > progress.unlockedLevel;
      els.startButton.textContent = unlocked ? `Commencer le niveau ${selectedLevel}` : "Ouverture verrouillée";
      els.openingPreview.innerHTML = `
        <strong>${unlocked ? "" : "🔒 "}${selectedOpening.name} — Niveau ${selectedLevel}</strong>
        <div class="opening-tags"><span class="opening-tag">${meta.difficulty || "—"}</span><span class="opening-tag">${meta.style || "—"}</span><span class="opening-tag">${branches.length} branche${branches.length > 1 ? "s" : ""}</span></div>
        <span>${selectedOpening.description}</span>
        <span class="opening-principle"><b>Principe :</b> ${meta.principle || selectedOpening.description}</span>
        ${unlocked ? `<ul class="mini-list">${(meta.plans || []).slice(0,3).map(plan => `<li>${plan}</li>`).join("")}</ul>` : `<span class="lock-box"><br>Condition : ${openingUnlockText(selectedOpening.id)}</span>`}
        <div class="mastery-line"><div class="mastery-meta"><span>Maîtrise ${stat.qualifying}/${target} session${target > 1 ? "s" : ""} validée${target > 1 ? "s" : ""}</span><span>${percent}%</span></div><div class="mastery-track"><div class="mastery-fill" style="width:${percent}%"></div></div></div>
        <span class="previous-stats">${stat.sessions ? `${stat.sessions} session${stat.sessions > 1 ? "s" : ""} · meilleur score ${stat.best}%` : LEVELS[selectedLevel].description}</span>
      `;
      renderCampaign();
    }

    function renderCampaign() {
      const openings = OPENINGS.filter(item => item.color === selectedColor);
      els.campaignGrid.innerHTML = openings.map(opening => {
        const unlocked = isOpeningUnlocked(opening.id);
        const progress = getOpeningProgress(opening.id);
        const active = selectedOpening?.id === opening.id;
        return `<button class="campaign-card${active ? " active" : ""}${unlocked ? "" : " locked"}" type="button" data-opening="${opening.id}">
          ${unlocked ? "" : '<span class="lock">🔒</span>'}
          <h3>${opening.name}</h3><p>${CAMPAIGN[opening.id]?.principle || opening.description}</p>
          <div class="card-foot"><span class="rank-pill">${openingRank(opening.id)}</span><span>${unlocked ? `Niv. ${progress.unlockedLevel}` : "Verrouillée"}</span></div>
        </button>`;
      }).join("");
      els.campaignGrid.querySelectorAll("[data-opening]").forEach(card => card.addEventListener("click", () => {
        const id = card.dataset.opening;
        els.openingSelect.value = id;
        selectedOpening = OPENINGS.find(item => item.id === id);
        populateLevels();
      }));
    }

    function setColor(color) {
      selectedColor = color;
      localStorage.setItem("openingTrainer.color", color);
      updateColorButtons();
      populateOpenings();
    }

    function weakPositionKey(ply = moveIndex) {
      return `${selectedOpening.id}|${selectedVariation.id}|${ply}|${selectedColor}`;
    }

    function recordWeakPosition(ply) {
      const key = weakPositionKey(ply);
      const current = profile.weakPositions[key] || { mistakes: 0, successes: 0, lastSeen: null };
      current.mistakes += 1;
      current.lastSeen = todayKey();
      profile.weakPositions[key] = current;
      saveProfile();
    }

    function recordWeakSuccess(ply) {
      const key = weakPositionKey(ply);
      const current = profile.weakPositions[key];
      if (!current) return;
      current.successes = (current.successes || 0) + 1;
      current.lastSeen = todayKey();
      if (current.successes >= current.mistakes + 2) delete profile.weakPositions[key];
      saveProfile();
    }

    function startTraining(options = {}) {
      try {
        selectedOpening = OPENINGS.find(item => item.id === els.openingSelect.value);
        if (!selectedOpening || !isOpeningUnlocked(selectedOpening.id)) return;
        selectedLevel = Number(els.levelSelect.value) || 1;
        if (selectedLevel > getOpeningProgress(selectedOpening.id).unlockedLevel) return;
        selectedVariation = chooseVariation(selectedOpening, selectedLevel);
        preparedLine = prepareLine(selectedVariation.moves);
      } catch (error) {
        fail(`Impossible de charger cette ouverture : ${error.message}`);
        return;
      }

      sessionToken += 1;
      game = new Chess();
      moveIndex = 0;
      selectedSquare = null;
      legalMoves = [];
      lastMove = null;
      lastMoveWasCapture = false;
      hintSquares = new Set();
      boardLocked = false;
      temporaryFlip = false;
      errorsTotal = 0;
      hintsUsed = 0;
      firstTryCount = 0;
      solvedUserMoves = 0;
      errorsAtPly = new Map();
      hintLevelAtPly = new Map();
      errorPlySet = new Set();
      lastSessionErrors = new Set();
      reviewMode = false;
      reviewPlySet = new Set();
      viewedPly = 0;
      currentCombo = 0;
      bestCombo = 0;
      sessionXp = 0;
      pendingReward = null;
      lastUnlockMessages = [];
      revengeMode = false;
      revengeQueue = [];
      revengeIndex = 0;
      totalUserMoves = preparedLine.filter(move => move.color === userColorCode()).length;

      els.openingName.textContent = selectedOpening.name;
      els.variationName.textContent = `Niveau ${selectedLevel} · ${selectedVariation.name}`;
      document.body.classList.add("training-active");
      window.scrollTo(0, 0);
      els.homeScreen.classList.remove("active");
      els.trainingScreen.classList.add("active");
      els.resultBackdrop.classList.remove("open");
      renderAll();
      continueFlow(350);
    }

    function renderCombo() {
      if (!els.comboChip) return;
      els.comboChip.textContent = `🔥 ${currentCombo}`;
    }

    function renderAll() {
      renderBoard();
      renderHistory();
      renderProgress();
      renderCombo();
      updatePreviewButtons();
      els.hideHintCheckbox.checked = hideStrategicHint;
      els.hintButton.disabled = boardLocked || isPreviewing() || !isUserTurn() || moveIndex >= preparedLine.length;
    }

    async function attemptUserMove(from, to) {
      const legal = game.moves({ square: from, verbose: true }).find(move => move.to === to);
      if (!legal) { clearSelection(); return; }
      const expected = expectedMove();
      if (!expected || expected.color !== userColorCode()) return;

      if (legal.from !== expected.from || legal.to !== expected.to) {
        registerWrongMove(expected);
        return;
      }

      const challengePly = moveIndex;
      const errorsForMove = errorsAtPly.get(moveIndex) || 0;
      if (errorsForMove === 0) {
        firstTryCount += 1;
        currentCombo += 1;
        bestCombo = Math.max(bestCombo, currentCombo);
        els.comboChip?.classList.add("pop");
        window.setTimeout(() => els.comboChip?.classList.remove("pop"), 180);
      }
      solvedUserMoves += 1;
      boardLocked = true;
      selectedSquare = null;
      legalMoves = [];
      hintSquares = new Set();
      const note = selectedVariation.notes?.[moveIndex] || strategicHintText();
      setStatus("success", "✓", revengeMode ? "Revanche réussie" : "Bon coup", revengeMode ? `${note} · +20 XP` : note);
      renderProgress();
      const token = sessionToken;

      await animatePendingMove(expected.from, expected.to, `${expected.color}${expected.piece}`, Boolean(legal.captured));
      if (token !== sessionToken) return;
      const played = game.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      if (!played) { fail("Le coup attendu n'a pas pu être joué."); return; }
      lastMove = { from: played.from, to: played.to };
      lastMoveWasCapture = Boolean(played.captured);
      moveIndex += 1;
      viewedPly = currentPly();
      playMoveAudio(lastMoveWasCapture ? "capture" : "move");
      recordWeakSuccess(challengePly);
      renderAll();
      const target = els.board.querySelector(`[data-square="${played.to}"]`);
      target?.classList.add(lastMoveWasCapture ? "capture-landed" : "move-landed");
      window.setTimeout(() => target?.classList.remove("capture-landed", "move-landed"), 220);
      await wait(SUCCESS_PAUSE_MS);
      if (token !== sessionToken) return;

      if (revengeMode) {
        profile.xp += 20;
        saveProfile();
        revengeIndex += 1;
        loadRevengeChallenge();
      } else {
        continueFlow(OPPONENT_THINK_MS);
      }
    }

    function registerWrongMove(expected) {
      const count = (errorsAtPly.get(moveIndex) || 0) + 1;
      errorsAtPly.set(moveIndex, count);
      errorsTotal += 1;
      errorPlySet.add(moveIndex);
      currentCombo = 0;
      recordWeakPosition(moveIndex);
      selectedSquare = null;
      legalMoves = [];
      hintSquares = new Set();
      if (navigator.vibrate) navigator.vibrate(35);
      els.board.classList.remove("shake"); void els.board.offsetWidth; els.board.classList.add("shake");
      if (count === 1) {
        setStatus("hint", "⚔️", "Position fragile détectée", strategicHintText());
      } else if (count === 2) {
        hintSquares.add(expected.from);
        const piece = game.get(expected.from);
        setStatus("hint", "💡", "Indice 1", `${strategicHintText()} La pièce à jouer est ${piece ? articlePiece(piece.type) : "la bonne pièce"}.`);
      } else {
        hintSquares.add(expected.from); hintSquares.add(expected.to);
        setStatus("hint", "💡", "Indice complet", `Joue de ${expected.from} vers ${expected.to}.`);
      }
      renderAll();
    }

    function renderProgress() {
      const percent = totalUserMoves ? Math.round((solvedUserMoves / totalUserMoves) * 100) : 0;
      els.progressLabel.textContent = revengeMode ? `Défi revanche ${Math.min(revengeIndex + 1, revengeQueue.length)} / ${revengeQueue.length}` : `Niveau ${selectedLevel} · ${selectedVariation?.name || ""}`;
      els.progressValue.textContent = `${solvedUserMoves} / ${totalUserMoves}`;
      els.progressFill.style.width = `${percent}%`;
    }

    function recordLevelResult(accuracy) {
      const beforeUnlocked = OPENINGS.filter(item => isOpeningUnlocked(item.id)).map(item => item.id);
      const openingProgress = getOpeningProgress(selectedOpening.id);
      const stat = getLevelProgress(selectedOpening.id, selectedLevel);
      stat.sessions += 1;
      stat.accuracySum += accuracy;
      stat.best = Math.max(stat.best, accuracy);
      stat.hints += hintsUsed;
      if (accuracy >= 85 && hintsUsed <= 1) stat.qualifying += 1;
      const target = masteryTarget(selectedLevel);
      const masteredNow = stat.qualifying >= target && stat.best >= 90 && openingProgress.masteredLevel < selectedLevel;
      if (masteredNow) {
        openingProgress.masteredLevel = selectedLevel;
        openingProgress.unlockedLevel = Math.min(3, Math.max(openingProgress.unlockedLevel, selectedLevel + 1));
        lastUnlockMessages.push(`🏆 Niveau ${selectedLevel} maîtrisé`);
        if (selectedLevel < 3) lastUnlockMessages.push(`Niveau ${selectedLevel + 1} débloqué`);
      }
      const afterUnlocked = OPENINGS.filter(item => isOpeningUnlocked(item.id)).map(item => item.id);
      afterUnlocked.filter(id => !beforeUnlocked.includes(id)).forEach(id => {
        const opening = OPENINGS.find(item => item.id === id);
        lastUnlockMessages.push(`🔓 ${opening.name} débloquée`);
      });
      return stat;
    }

    function calculateSessionXp(accuracy) {
      return Math.max(35, 50 + firstTryCount * 8 + Math.max(0, bestCombo - 3) * 3 + (accuracy >= 90 ? 25 : 0) - hintsUsed * 3);
    }

    function rollChest() {
      const guaranteed = (profile.noChestSessions || 0) >= 2;
      if (!guaranteed && Math.random() > 0.72) {
        profile.noChestSessions = (profile.noChestSessions || 0) + 1;
        return null;
      }
      profile.noChestSessions = 0;
      const roll = Math.random();
      const rarity = roll < .02 ? "legendary" : roll < .12 ? "gold" : roll < .40 ? "silver" : "wood";
      const pools = {
        wood: [
          { id:"title-apprenti", type:"title", label:"Titre : Apprenti tacticien", icon:"📜" },
          { id:"xp-50", type:"xp", value:50, label:"Bonus de 50 XP", icon:"✨" }
        ],
        silver: [
          { id:"theme-forest", type:"theme", value:"forest", label:"Échiquier Forêt", icon:"🌲" },
          { id:"theme-slate", type:"theme", value:"slate", label:"Échiquier Ardoise", icon:"🌙" }
        ],
        gold: [
          { id:"theme-royal", type:"theme", value:"royal", label:"Échiquier Royal", icon:"👑" },
          { id:"badge-combo", type:"badge", label:"Badge : Série de feu", icon:"🔥" }
        ],
        legendary: [
          { id:"title-maitre-repertoire", type:"title", label:"Titre rare : Maître du répertoire", icon:"🏆" }
        ]
      };
      const pool = pools[rarity];
      return { rarity, reward: pool[Math.floor(Math.random() * pool.length)] };
    }

