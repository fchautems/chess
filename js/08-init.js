    function showSessionResult(accuracy, stat) {
      els.modalEmoji.textContent = "🎉";
      els.resultTitle.textContent = "Session terminée";
      els.resultSubtitle.textContent = `${selectedOpening.name} — Niveau ${selectedLevel} · ${selectedVariation.name}`;
      els.resultFirstTry.textContent = `${firstTryCount} / ${totalUserMoves}`;
      els.resultAccuracy.textContent = `${accuracy} %`;
      els.resultErrors.textContent = String(errorPlySet.size);
      els.resultHints.textContent = String(hintsUsed);
      els.resultXp.textContent = `+${sessionXp} XP`;
      els.resultProgress.textContent = `${stat.qualifying}/${masteryTarget(selectedLevel)} sessions validées · meilleur score ${stat.best}% · meilleure série ${bestCombo}`;
      els.unlockBanner.classList.toggle("show", lastUnlockMessages.length > 0);
      els.unlockBanner.innerHTML = lastUnlockMessages.join("<br>");
      els.resultRevenge.hidden = errorPlySet.size === 0;
      els.resultRevenge.textContent = `🔥 Défi revanche (${errorPlySet.size})`;
      els.chestArea.classList.toggle("show", Boolean(pendingReward));
      els.rewardReveal.classList.remove("show");
      els.rewardReveal.innerHTML = "";
      if (pendingReward) {
        els.openChestButton.disabled = false;
        els.openChestButton.className = `chest-button ${pendingReward.rarity}`;
        const names = { wood:"bois", silver:"argent", gold:"or", legendary:"légendaire" };
        els.chestLabel.textContent = `Ouvrir le coffre ${names[pendingReward.rarity]}`;
      }
      els.resultRestart.textContent = "Rejouer une session";
      els.resultBackdrop.classList.add("open");
    }

    function finishTraining() {
      if (revengeMode) { finishRevenge(); return; }
      boardLocked = true;
      renderAll();
      const accuracy = totalUserMoves ? Math.round((firstTryCount / totalUserMoves) * 100) : 100;
      lastSessionErrors = new Set(errorPlySet);
      revengeSourceErrors = [...errorPlySet];
      registerActiveDay();
      lastUnlockMessages = [];
      const stat = recordLevelResult(accuracy);
      sessionXp = calculateSessionXp(accuracy);
      profile.xp += sessionXp;
      pendingReward = rollChest();
      saveProfile();
      updateProfileUI();
      showSessionResult(accuracy, stat);
    }

    function openPendingChest() {
      if (!pendingReward) return;
      const { reward, rarity } = pendingReward;
      let duplicate = (profile.inventory || []).includes(reward.id) || (profile.rewards || []).includes(reward.id);
      let message = "";
      if (reward.type === "xp") {
        profile.xp += reward.value;
        message = `${reward.icon} ${reward.label}`;
      } else if (duplicate) {
        profile.xp += 75;
        message = `${reward.icon} Déjà obtenue : conversion en 75 XP`;
      } else if (reward.type === "theme") {
        profile.inventory.push(reward.id);
        profile.equippedTheme = reward.value;
        message = `${reward.icon} ${reward.label} débloqué et équipé`;
      } else {
        profile.rewards.push(reward.id);
        message = `${reward.icon} ${reward.label} débloqué`;
      }
      saveProfile();
      updateProfileUI();
      els.openChestButton.disabled = true;
      els.rewardReveal.innerHTML = `<strong>${rarity === "legendary" ? "Récompense légendaire !" : "Récompense obtenue"}</strong>${message}`;
      els.rewardReveal.classList.add("show");
      pendingReward = null;
    }

    function rebuildGameToPly(ply) {
      const rebuilt = new Chess();
      for (let i = 0; i < ply; i += 1) {
        const move = preparedLine[i];
        const played = rebuilt.move({ from: move.from, to: move.to, promotion: move.promotion });
        if (!played) throw new Error(`Impossible de reconstruire la position ${i}.`);
      }
      return rebuilt;
    }

    function startRevenge() {
      if (!revengeSourceErrors.length) return;
      sessionToken += 1;
      revengeMode = true;
      revengeQueue = [...revengeSourceErrors];
      revengeIndex = 0;
      solvedUserMoves = 0;
      totalUserMoves = revengeQueue.length;
      errorsTotal = 0;
      hintsUsed = 0;
      firstTryCount = 0;
      errorsAtPly = new Map();
      hintLevelAtPly = new Map();
      errorPlySet = new Set();
      currentCombo = 0;
      bestCombo = 0;
      els.resultBackdrop.classList.remove("open");
      els.variationName.textContent = `Défi revanche · ${selectedVariation.name}`;
      loadRevengeChallenge();
    }

    function loadRevengeChallenge() {
      if (!revengeMode) return;
      if (revengeIndex >= revengeQueue.length) { finishRevenge(); return; }
      const ply = revengeQueue[revengeIndex];
      game = rebuildGameToPly(ply);
      moveIndex = ply;
      selectedSquare = null;
      legalMoves = [];
      hintSquares = new Set();
      boardLocked = false;
      viewedPly = currentPly();
      const history = game.history({ verbose:true });
      const previous = history[history.length - 1];
      lastMove = previous ? { from: previous.from, to: previous.to } : null;
      lastMoveWasCapture = Boolean(previous?.captured);
      setStatus("hint", "🔥", `Défi revanche ${revengeIndex + 1}/${revengeQueue.length}`, "Tu avais raté cette position. Retrouve maintenant le bon coup.");
      renderAll();
    }

    function finishRevenge() {
      revengeMode = false;
      boardLocked = true;
      saveProfile();
      updateProfileUI();
      els.modalEmoji.textContent = "🔥";
      els.resultTitle.textContent = "Défi revanche réussi";
      els.resultSubtitle.textContent = `${revengeQueue.length} position${revengeQueue.length > 1 ? "s" : ""} fragile${revengeQueue.length > 1 ? "s" : ""} rejouée${revengeQueue.length > 1 ? "s" : ""}`;
      els.resultFirstTry.textContent = `${firstTryCount} / ${totalUserMoves}`;
      els.resultAccuracy.textContent = `${totalUserMoves ? Math.round(firstTryCount / totalUserMoves * 100) : 100} %`;
      els.resultErrors.textContent = String(errorPlySet.size);
      els.resultHints.textContent = String(hintsUsed);
      els.resultXp.textContent = `+${revengeQueue.length * 20} XP`;
      els.resultProgress.textContent = "Les positions corrigées seront désormais moins fréquentes.";
      els.unlockBanner.classList.remove("show");
      els.chestArea.classList.remove("show");
      els.resultRevenge.hidden = true;
      els.resultRestart.textContent = "Rejouer l’ouverture";
      els.resultBackdrop.classList.add("open");
    }

    function goHome(confirmFirst = false) {
      if (confirmFirst && moveIndex > 0 && !els.resultBackdrop.classList.contains("open")) {
        if (!window.confirm("Quitter l’entraînement en cours ?")) return;
      }
      sessionToken += 1;
      revengeMode = false;
      document.body.classList.remove("training-active");
      window.scrollTo(0, 0);
      els.resultBackdrop.classList.remove("open");
      els.trainingScreen.classList.remove("active");
      els.homeScreen.classList.add("active");
      updateProfileUI();
      populateOpenings(selectedOpening?.id);
    }

    /* ================================================================
       V7 — moteur pédagogique de l’Italienne
       Niveau 3 = positions indépendantes, erreurs répétées et boss final.
       ================================================================ */

    function migrateProfileV7() {
      profile.openingProgress ||= {};
      profile.weakPositions ||= {};
      const italian = getOpeningProgress("italian");
      if ((profile.schemaVersion || 0) < 7) {
        /* Une ancienne maîtrise du niveau 3 débloque le boss, mais le nouveau
           test final reste à réussir puisqu’il n’existait pas en V6. */
        if ((italian.masteredLevel || 0) >= 3 && !italian.bossPassed) {
          italian.masteredLevel = 2;
          italian.unlockedLevel = 3;
          italian.bossReady = true;
        }
        profile.schemaVersion = 7;
        saveProfile();
      }
      italian.bossReady = Boolean(italian.bossReady || italian.bossPassed);
      italian.bossPassed = Boolean(italian.bossPassed);
    }

    function branchById(opening, branchId) {
      return allBranches(opening).find(branch => branch.id === branchId) || null;
    }

    function branchContextText(branch = selectedVariation, ply = moveIndex) {
      const opponentText = branch?.opponentNotes?.[ply - 1];
      const objective = branch?.notes?.[ply];
      if (opponentText && objective) return `${opponentText} ${objective}`;
      return objective || opponentText || "Reconnais la structure et retrouve le coup de ton répertoire.";
    }

    function strategicHintText() {
      const branchText = selectedVariation?.notes?.[moveIndex];
      if (branchText) return branchText;
      const expected = expectedMove();
      if (!expected) return "Retrouve le plan de la position.";
      const piece = game?.get(expected.from);
      if (expected.san === "O-O" || expected.san === "O-O-O") return "Mets ton roi à l’abri avant d’ouvrir davantage la position.";
      if (piece?.type === "p") return "Cherche la poussée de pion qui conteste ou renforce le centre.";
      if (piece?.type === "n") return "Améliore ton cavalier vers une case centrale utile.";
      if (piece?.type === "b") return "Développe ou replace ton fou sur la diagonale correspondant au plan.";
      if (piece?.type === "r") return "Active une tour derrière le centre ou sur une colonne utile.";
      return "Trouve le coup qui poursuit le plan de l’ouverture.";
    }

    function getChallengePool(opening) {
      const unique = new Map();
      for (const branch of branchesForLevel(opening, 2)) {
        let line;
        try { line = prepareLine(branch.moves); } catch (_) { continue; }
        const temp = new Chess();
        for (let ply = 0; ply < line.length; ply += 1) {
          const move = line[ply];
          if (move.color === userColorCode() && ply >= 4) {
            const fen = temp.fen();
            const positionKey = fen.split(" ").slice(0, 4).join(" ");
            const id = `${opening.id}|${branch.id}|${ply}|${selectedColor}`;
            const weak = profile.weakPositions[id] || {};
            const weakness = Math.max(0, (weak.mistakes || 0) * 2 - (weak.successes || 0));
            const dedupeKey = `${positionKey}|${move.from}${move.to}`;
            const challenge = {
              id, branchId: branch.id, branchName: branch.name,
              branch, line, ply, fen, expected: move,
              explanation: branch.notes?.[ply] || "Ce coup poursuit le plan de la variante.",
              opponentMeaning: branch.opponentNotes?.[ply - 1] || "Observe le dernier coup adverse et la structure centrale.",
              weight: 1 + Math.min(10, weakness * 2),
              weak: weakness > 0,
              retry: false
            };
            const existing = unique.get(dedupeKey);
            if (!existing || challenge.weight > existing.weight) unique.set(dedupeKey, challenge);
          }
          temp.move({ from: move.from, to: move.to, promotion: move.promotion });
        }
      }
      return [...unique.values()];
    }

    function weightedTake(pool, count) {
      const remaining = [...pool];
      const picked = [];
      while (remaining.length && picked.length < count) {
        const total = remaining.reduce((sum, item) => sum + Math.max(.1, item.weight || 1), 0);
        let roll = Math.random() * total;
        let index = 0;
        for (; index < remaining.length; index += 1) {
          roll -= Math.max(.1, remaining[index].weight || 1);
          if (roll <= 0) break;
        }
        picked.push(remaining.splice(Math.min(index, remaining.length - 1), 1)[0]);
      }
      while (picked.length < count && pool.length) picked.push({ ...pool[picked.length % pool.length] });
      return picked;
    }

    function buildQuizQueue(opening, count) {
      const pool = getChallengePool(opening);
      const weak = pool.filter(item => item.weak).sort((a,b) => b.weight - a.weight);
      const guaranteedWeak = weak.slice(0, Math.min(3, Math.floor(count / 3)));
      const used = new Set(guaranteedWeak.map(item => item.id));
      const rest = weightedTake(pool.filter(item => !used.has(item.id)), count - guaranteedWeak.length);
      return [...guaranteedWeak, ...rest].sort(() => Math.random() - .5);
    }

    function updateBossChip() {
      if (!els.bossChip) return;
      els.bossChip.classList.toggle("show", bossMode);
      els.bossChip.textContent = `❤️ ${Math.max(0, bossLives)}`;
    }

    function startPositionQuiz(asBoss = false) {
      selectedOpening = OPENINGS.find(item => item.id === els.openingSelect.value);
      if (!selectedOpening) return;
      const progress = getOpeningProgress(selectedOpening.id);
      if (asBoss && (selectedOpening.id !== "italian" || !progress.bossReady)) return;

      selectedLevel = 3;
      positionQuizMode = true;
      bossMode = asBoss;
      revengeMode = false;
      lastSessionMode = asBoss ? "boss" : "quiz";
      sessionToken += 1;
      quizIndex = 0;
      quizQueue = buildQuizQueue(selectedOpening, asBoss ? V7_BOSS_SIZE : V7_QUIZ_SIZE);
      currentChallenge = null;
      currentChallengeErrors = 0;
      retryChallengeIds = new Set();
      bossLives = V7_BOSS_LIVES;
      selectedSquare = null; legalMoves = []; hintSquares = new Set();
      errorsTotal = 0; hintsUsed = 0; firstTryCount = 0; solvedUserMoves = 0;
      errorsAtPly = new Map(); hintLevelAtPly = new Map(); errorPlySet = new Set();
      currentCombo = 0; bestCombo = 0; sessionXp = 0; pendingReward = null;
      totalUserMoves = quizQueue.length;
      if (preQuizHintPreference === null) preQuizHintPreference = hideStrategicHint;
      hideStrategicHint = true;

      els.openingName.textContent = selectedOpening.name;
      els.variationName.textContent = asBoss ? "Boss final · 12 positions" : "Niveau 3 · Défi de positions";
      document.body.classList.add("training-active", "quiz-active");
      document.body.classList.toggle("boss-active", asBoss);
      window.scrollTo(0, 0);
      els.homeScreen.classList.remove("active");
      els.trainingScreen.classList.add("active");
      els.resultBackdrop.classList.remove("open");
      updateBossChip();
      loadQuizChallenge();
    }

    function loadQuizChallenge() {
      if (!positionQuizMode) return;
      if (quizIndex >= quizQueue.length) {
        if (bossMode) finishBoss(true); else finishPositionQuiz();
        return;
      }
      currentChallenge = quizQueue[quizIndex];
      selectedVariation = currentChallenge.branch;
      preparedLine = currentChallenge.line;
      moveIndex = currentChallenge.ply;
      game = rebuildGameToPly(moveIndex);
      currentChallengeErrors = 0;
      lastBossPenaltyAt = 0;
      selectedSquare = null; legalMoves = []; hintSquares = new Set();
      boardLocked = false;
      viewedPly = currentPly();
      const history = game.history({ verbose:true });
      const previous = history[history.length - 1];
      lastMove = previous ? { from: previous.from, to: previous.to } : null;
      lastMoveWasCapture = Boolean(previous?.captured);
      els.variationName.textContent = bossMode
        ? `Boss final · Position ${quizIndex + 1}/${quizQueue.length}`
        : `Niveau 3 · Position ${quizIndex + 1}/${quizQueue.length}`;
      if (bossMode) {
        setStatus("", "👑", "Position du boss", "Aucun nom de variante, aucun indice automatique. Trouve le coup de ton répertoire.");
      } else {
        setStatus("hint", "🧩", currentChallenge.retry ? "Position fragile — revanche" : "Position à reconnaître", currentChallenge.opponentMeaning);
      }
      updateBossChip();
      renderAll();
    }

    function scheduleChallengeRetry(challenge) {
      if (!positionQuizMode || bossMode || !challenge || retryChallengeIds.has(challenge.id)) return;
      retryChallengeIds.add(challenge.id);
      const retry = { ...challenge, retry: true, weight: challenge.weight + 5 };
      const insertAt = Math.min(quizQueue.length, quizIndex + 3);
      quizQueue.splice(insertAt, 0, retry);
      totalUserMoves = quizQueue.length;
    }

    const REPERTOIRE_ALTERNATIVES = {
      "italian|giuoco-piano|4": [
        { san:"Bb5", message:"C’est un bon coup, mais il transpose vers la Partie espagnole." },
        { san:"d4", message:"C’est un bon coup central, mais il entre plutôt dans la Partie écossaise." },
        { san:"Nc3", message:"C’est un développement sain qui mène souvent à la Partie des Quatre Cavaliers." }
      ],
      "italian|two-knights|4": [
        { san:"Bb5", message:"Bon développement, mais tu quittes l’Italienne pour l’Espagnole." },
        { san:"d4", message:"Bon coup central, mais il change complètement de répertoire." }
      ],
      "italian|hungarian|4": [
        { san:"Bb5", message:"Bon coup, mais il mène à une structure espagnole." },
        { san:"d4", message:"Bon coup central, mais l’objectif de cette session est d’abord d’installer le fou en c4." }
      ],
      "italian|classical-d6|4": [
        { san:"Bb5", message:"Bon coup, mais il mène à la Partie espagnole." },
        { san:"d4", message:"Coup central valable, mais il change le plan étudié ici." }
      ],
      "italian|giuoco-piano|6": [
        { san:"d3", message:"Très bon plan calme : tu consolides e4 avant de préparer d4 plus tard." },
        { san:"O-O", message:"Très bon coup de sécurité. Le répertoire travaillé choisit c3 d’abord pour préparer d4." }
      ],
      "italian|two-knights|6": [
        { san:"O-O", message:"Bon coup : tu mets le roi à l’abri. Ici, notre ligne choisit d3 pour sécuriser e4." },
        { san:"Ng5", message:"C’est une grande variante tactique des Deux Cavaliers, mais elle n’appartient pas au répertoire calme étudié ici." }
      ],
      "italian|hungarian|6": [
        { san:"O-O", message:"Bon coup naturel. Le répertoire profite cependant de la passivité de ...Fe7 pour jouer d4 immédiatement." },
        { san:"d3", message:"C’est solide, mais moins ambitieux que d4 dans cette position précise." }
      ],
      "italian|classical-d6|6": [
        { san:"O-O", message:"Bon coup de développement. Notre ligne choisit d4 pour exploiter le fou noir encore enfermé." },
        { san:"c3", message:"Bon plan de préparation de d4, simplement plus lent que la rupture immédiate étudiée." }
      ]
    };

    function normalizedSan(san) {
      return String(san || "").replace(/[+#?!]/g, "");
    }

    function assessAlternativeMove(legal) {
      if (!selectedOpening || !selectedVariation) return null;
      const key = `${selectedOpening.id}|${selectedVariation.id}|${moveIndex}`;
      const options = REPERTOIRE_ALTERNATIVES[key] || [];
      const playedSan = normalizedSan(legal.san);
      return options.find(option => normalizedSan(option.san) === playedSan) || null;
    }

    function showAlternativeMove(alternative) {
      selectedSquare = null; legalMoves = []; hintSquares = new Set();
      setStatus("hint", "≈", "Bon coup alternatif", `${alternative.message} Il n’est pas compté comme une erreur, mais rejoue le coup du répertoire pour poursuivre.`);
      renderAll();
    }

    function conceptLevelText(level) {
      if (level === 1) return "Tu apprends la ligne de référence. Cherche surtout à relier chaque coup à une idée : développement, sécurité du roi ou rupture centrale.";
      if (level === 2) return "Les réponses adverses tournent maintenant sans répétition immédiate. Identifie le signal donné par le dernier coup noir avant de choisir ton plan.";
      return "Tu dois reconnaître des positions isolées. Ne récite pas la suite : demande-toi ce que le dernier coup adverse attaque ou défend, puis retrouve le plan.";
    }

    function buildConceptHtml(opening, level, asBoss = false) {
      const meta = CAMPAIGN[opening.id] || {};
      const signals = (meta.branchSignals || []).map(([move, meaning]) => `<div class="signal-row"><span class="signal-move">${move}</span><span class="signal-text">${meaning}</span></div>`).join("");
      return `
        <div class="concept-section"><h4>Le vrai principe</h4><p>${meta.concept || meta.principle || opening.description}</p></div>
        <div class="concept-section"><h4>Ce que ce niveau entraîne</h4><p>${asBoss ? "Le boss vérifie la reconnaissance réelle : chaque coup légal non validé peut coûter une vie, tandis qu’un bon coup alternatif est signalé sans pénalité." : conceptLevelText(level)}</p></div>
        ${(meta.plans || []).length ? `<div class="concept-section"><h4>Plans typiques</h4><ul class="concept-list">${meta.plans.map(item => `<li>${item}</li>`).join("")}</ul></div>` : ""}
        ${signals ? `<div class="concept-section"><h4>Lire la réponse adverse</h4><div class="signal-grid">${signals}</div></div>` : ""}
        ${(meta.checklist || []).length ? `<div class="concept-section"><h4>Les questions à te poser</h4><ul class="concept-list">${meta.checklist.map(item => `<li>${item}</li>`).join("")}</ul></div>` : ""}
        ${(meta.mistakes || []).length ? `<div class="concept-section"><h4>Pièges d’apprentissage</h4><ul class="concept-list">${meta.mistakes.map(item => `<li>${item}</li>`).join("")}</ul></div>` : ""}
        <div class="concept-section"><h4>Comment l’application juge ton coup</h4><div class="assessment-legend">
          <div class="assessment-item"><span class="assessment-dot repertoire"></span><span><b>Coup du répertoire :</b> il poursuit exactement la ligne apprise.</span></div>
          <div class="assessment-item"><span class="assessment-dot alternative"></span><span><b>Bon coup alternatif :</b> théoriquement valable, sans pénalité, mais il faut rejouer le plan étudié.</span></div>
          <div class="assessment-item"><span class="assessment-dot unverified"></span><span><b>Coup légal non validé :</b> l’application ne prétend pas qu’il est forcément mauvais, seulement qu’il n’appartient pas au répertoire défini.</span></div>
        </div></div>`;
    }

    function openConceptModal(action = null) {
      const opening = selectedOpening || OPENINGS.find(item => item.id === els.openingSelect.value);
      if (!opening) return;
      const level = Number(els.levelSelect?.value || selectedLevel || 1);
      pendingConceptAction = action;
      els.conceptTitle.textContent = opening.name;
      els.conceptSubtitle.textContent = `Niveau ${level} — ${LEVELS[level]?.name || "Apprentissage"}`;
      els.conceptBody.innerHTML = buildConceptHtml(opening, level, action === "boss");
      els.conceptStartButton.hidden = !action;
      els.conceptStartButton.textContent = action === "boss" ? "J’ai compris — affronter le boss" : "J’ai compris — commencer";
      els.conceptBackdrop.classList.add("open");
    }

    function closeConceptModal() {
      pendingConceptAction = null;
      els.conceptBackdrop.classList.remove("open");
    }

    function requestSessionStart(mode = "training") {
      const opening = OPENINGS.find(item => item.id === els.openingSelect.value);
      const level = Number(els.levelSelect.value) || 1;
      const seenKey = `openingTrainer.conceptSeen.${opening?.id}.${level}`;
      if (localStorage.getItem(seenKey) !== "yes") {
        openConceptModal(mode);
      } else if (mode === "boss") {
        startBoss();
      } else {
        startTraining();
      }
    }

    async function attemptUserMove(from, to) {
      const legal = game.moves({ square: from, verbose: true }).find(move => move.to === to);
      if (!legal) { clearSelection(); return; }
      const expected = expectedMove();
      if (!expected || expected.color !== userColorCode()) return;
      if (legal.from !== expected.from || legal.to !== expected.to) {
        const alternative = assessAlternativeMove(legal);
        if (alternative) showAlternativeMove(alternative);
        else registerWrongMove(expected, legal);
        return;
      }

      const challengePly = moveIndex;
      const mistakesBefore = positionQuizMode ? currentChallengeErrors : (errorsAtPly.get(moveIndex) || 0);
      if (mistakesBefore === 0) {
        firstTryCount += 1;
        currentCombo += 1;
        bestCombo = Math.max(bestCombo, currentCombo);
        els.comboChip?.classList.add("pop");
        window.setTimeout(() => els.comboChip?.classList.remove("pop"), 180);
      }
      solvedUserMoves += 1;
      boardLocked = true; selectedSquare = null; legalMoves = []; hintSquares = new Set();
      const note = branchContextText(selectedVariation, moveIndex);
      setStatus("success", "✓", bossMode ? "Coup validé" : (positionQuizMode ? "Position résolue" : "Bon coup"), note);
      renderProgress();
      const token = sessionToken;
      await animatePendingMove(expected.from, expected.to, `${expected.color}${expected.piece}`, Boolean(legal.captured));
      if (token !== sessionToken) return;
      const played = game.move({ from: expected.from, to: expected.to, promotion: expected.promotion });
      if (!played) { fail("Le coup attendu n'a pas pu être joué."); return; }
      lastMove = { from: played.from, to: played.to };
      lastMoveWasCapture = Boolean(played.captured);
      moveIndex += 1; viewedPly = currentPly();
      playMoveAudio(lastMoveWasCapture ? "capture" : "move");
      recordWeakSuccess(challengePly);
      renderAll();
      const target = els.board.querySelector(`[data-square="${played.to}"]`);
      target?.classList.add(lastMoveWasCapture ? "capture-landed" : "move-landed");
      window.setTimeout(() => target?.classList.remove("capture-landed", "move-landed"), 220);
      await wait(positionQuizMode ? 760 : SUCCESS_PAUSE_MS);
      if (token !== sessionToken) return;

      if (positionQuizMode) {
        quizIndex += 1;
        loadQuizChallenge();
      } else if (revengeMode) {
        profile.xp += 20; saveProfile(); revengeIndex += 1; loadRevengeChallenge();
      } else {
        continueFlow(OPPONENT_THINK_MS);
      }
    }

    function registerWrongMove(expected, playedLegal = null) {
      if (positionQuizMode) {
        currentChallengeErrors += 1;
        errorsTotal += 1;
        errorPlySet.add(currentChallenge?.id || `${selectedVariation.id}|${moveIndex}`);
        currentCombo = 0;
        recordWeakPosition(moveIndex);
        selectedSquare = null; legalMoves = []; hintSquares = new Set();
        if (navigator.vibrate) navigator.vibrate(45);
        els.board.classList.remove("shake"); void els.board.offsetWidth; els.board.classList.add("shake");

        if (bossMode) {
          const now = Date.now();
          if (now - lastBossPenaltyAt < 280) return;
          lastBossPenaltyAt = now;
          bossLives -= 1;
          updateBossChip();
          if (bossLives <= 0) {
            boardLocked = true;
            setStatus("error", "💔", "Plus de vies", "Le boss a gagné cette manche. Tes positions fragiles seront conservées.");
            renderAll();
            window.setTimeout(() => finishBoss(false), 850);
          } else {
            setStatus("error", "✕", "Coup non validé — une vie perdue", `Ce coup est légal, mais il ne correspond ni au répertoire ni à une alternative reconnue. Il te reste ${bossLives} vie${bossLives > 1 ? "s" : ""}.`);
            renderAll();
          }
          return;
        }

        if (currentChallengeErrors === 1) scheduleChallengeRetry(currentChallenge);
        setStatus("error", "⚔️", "Coup légal hors répertoire", "L’application ne le classe pas forcément comme mauvais, mais il ne correspond pas au plan étudié. Cette position reviendra dans quelques questions.");
        renderAll();
        return;
      }

      const count = (errorsAtPly.get(moveIndex) || 0) + 1;
      errorsAtPly.set(moveIndex, count); errorsTotal += 1; errorPlySet.add(moveIndex);
      currentCombo = 0; recordWeakPosition(moveIndex);
      selectedSquare = null; legalMoves = []; hintSquares = new Set();
      if (navigator.vibrate) navigator.vibrate(35);
      els.board.classList.remove("shake"); void els.board.offsetWidth; els.board.classList.add("shake");
      if (count === 1) {
        setStatus("hint", "⚔️", "Coup légal non validé", `${branchContextText()} Le coup joué ne suit pas le répertoire défini ; cela ne signifie pas automatiquement qu’il est mauvais aux échecs.`);
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

    function useHint() {
      if (bossMode || boardLocked || isPreviewing() || !isUserTurn() || moveIndex >= preparedLine.length) return;
      const expected = expectedMove();
      const level = Math.min((hintLevelAtPly.get(moveIndex) || 0) + 1, 3);
      hintLevelAtPly.set(moveIndex, level); hintsUsed += 1;
      const piece = game.get(expected.from);
      const pieceName = piece ? articlePiece(piece.type) : "la bonne pièce";
      hintSquares = new Set();
      if (level === 1) {
        setStatus("hint", "💡", "Indice 1", `${branchContextText()} La pièce à jouer est ${pieceName}.`);
      } else if (level === 2) {
        hintSquares.add(expected.from);
        setStatus("hint", "💡", "Indice 2", `Utilise ${pieceName} en ${expected.from}.`);
      } else {
        hintSquares.add(expected.from); hintSquares.add(expected.to);
        setStatus("hint", "💡", "Indice complet", `Joue de ${expected.from} vers ${expected.to}.`);
      }
      renderAll();
    }

    function renderAll() {
      renderBoard(); renderHistory(); renderProgress(); renderCombo(); updatePreviewButtons(); updateBossChip();
      els.hideHintCheckbox.checked = hideStrategicHint;
      els.hintButton.disabled = bossMode || boardLocked || isPreviewing() || !isUserTurn() || moveIndex >= preparedLine.length;
    }

    function renderProgress() {
      const percent = totalUserMoves ? Math.round((solvedUserMoves / totalUserMoves) * 100) : 0;
      if (positionQuizMode) {
        els.progressLabel.textContent = bossMode ? `Boss · ${bossLives} vie${bossLives > 1 ? "s" : ""}` : "Défi de positions";
      } else if (revengeMode) {
        els.progressLabel.textContent = `Défi revanche ${Math.min(revengeIndex + 1, revengeQueue.length)} / ${revengeQueue.length}`;
      } else {
        els.progressLabel.textContent = `Niveau ${selectedLevel} · ${selectedVariation?.name || ""}`;
      }
      els.progressValue.textContent = `${solvedUserMoves} / ${totalUserMoves}`;
      els.progressFill.style.width = `${percent}%`;
    }

    function masteryTarget(level) {
      if (level === 1) return 2;
      if (level === 3) return 2;
      return 3;
    }

    function levelMasteryPercent(openingId, level) {
      const opening = getOpeningProgress(openingId);
      if (level === 3 && openingId === "italian") {
        if (opening.bossPassed) return 100;
        if (opening.bossReady) return 90;
        const stat = getLevelProgress(openingId, level);
        return Math.min(85, Math.round(Math.min(1, stat.qualifying / masteryTarget(level)) * 65 + Math.min(1, stat.best / 90) * 20));
      }
      const stat = getLevelProgress(openingId, level);
      const target = masteryTarget(level);
      return Math.round(Math.min(1, stat.qualifying / target) * 70 + Math.min(1, stat.best / 90) * 30);
    }

    function recordLevelResult(accuracy) {
      const beforeUnlocked = OPENINGS.filter(item => isOpeningUnlocked(item.id)).map(item => item.id);
      const openingProgress = getOpeningProgress(selectedOpening.id);
      const stat = getLevelProgress(selectedOpening.id, selectedLevel);
      stat.sessions += 1; stat.accuracySum += accuracy; stat.best = Math.max(stat.best, accuracy); stat.hints += hintsUsed;
      if (accuracy >= 85 && hintsUsed <= 1) stat.qualifying += 1;

      if (selectedOpening.id === "italian" && selectedLevel === 3) {
        if (stat.qualifying >= masteryTarget(3) && stat.best >= 90 && !openingProgress.bossReady) {
          openingProgress.bossReady = true;
          lastUnlockMessages.push("👑 Boss final de l’Italienne disponible");
        }
      } else {
        const masteredNow = stat.qualifying >= masteryTarget(selectedLevel) && stat.best >= 90 && openingProgress.masteredLevel < selectedLevel;
        if (masteredNow) {
          openingProgress.masteredLevel = selectedLevel;
          openingProgress.unlockedLevel = Math.min(3, Math.max(openingProgress.unlockedLevel, selectedLevel + 1));
          lastUnlockMessages.push(`🏆 Niveau ${selectedLevel} maîtrisé`);
          if (selectedLevel < 3) lastUnlockMessages.push(`Niveau ${selectedLevel + 1} débloqué`);
        }
      }
      const afterUnlocked = OPENINGS.filter(item => isOpeningUnlocked(item.id)).map(item => item.id);
      afterUnlocked.filter(id => !beforeUnlocked.includes(id)).forEach(id => {
        const opening = OPENINGS.find(item => item.id === id);
        lastUnlockMessages.push(`🔓 ${opening.name} débloquée`);
      });
      return stat;
    }

    function startTraining(options = {}) {
      selectedOpening = OPENINGS.find(item => item.id === els.openingSelect.value);
      selectedLevel = Number(els.levelSelect.value) || 1;
      if (selectedOpening && selectedLevel === 3) {
        startPositionQuiz(false);
        return;
      }
      positionQuizMode = false; bossMode = false; lastSessionMode = "line";
      document.body.classList.remove("quiz-active", "boss-active");
      updateBossChip();
      try {
        if (!selectedOpening || !isOpeningUnlocked(selectedOpening.id)) return;
        if (selectedLevel > getOpeningProgress(selectedOpening.id).unlockedLevel) return;
        selectedVariation = chooseVariation(selectedOpening, selectedLevel);
        preparedLine = prepareLine(selectedVariation.moves);
      } catch (error) { fail(`Impossible de charger cette ouverture : ${error.message}`); return; }

      sessionToken += 1; game = new Chess(); moveIndex = 0;
      selectedSquare = null; legalMoves = []; lastMove = null; lastMoveWasCapture = false; hintSquares = new Set();
      boardLocked = false; temporaryFlip = false; errorsTotal = 0; hintsUsed = 0; firstTryCount = 0; solvedUserMoves = 0;
      errorsAtPly = new Map(); hintLevelAtPly = new Map(); errorPlySet = new Set(); lastSessionErrors = new Set();
      reviewMode = false; reviewPlySet = new Set(); viewedPly = 0; currentCombo = 0; bestCombo = 0; sessionXp = 0;
      pendingReward = null; lastUnlockMessages = []; revengeMode = false; revengeQueue = []; revengeIndex = 0;
      totalUserMoves = preparedLine.filter(move => move.color === userColorCode()).length;
      els.openingName.textContent = selectedOpening.name;
      els.variationName.textContent = `Niveau ${selectedLevel} · ${selectedVariation.name}`;
      document.body.classList.add("training-active"); window.scrollTo(0, 0);
      els.homeScreen.classList.remove("active"); els.trainingScreen.classList.add("active"); els.resultBackdrop.classList.remove("open");
      renderAll(); continueFlow(350);
    }

    function finishPositionQuiz() {
      positionQuizMode = false; bossMode = false; document.body.classList.remove("boss-active"); updateBossChip();
      boardLocked = true; renderAll();
      const accuracy = totalUserMoves ? Math.round(firstTryCount / totalUserMoves * 100) : 100;
      registerActiveDay(); lastUnlockMessages = [];
      const stat = recordLevelResult(accuracy);
      sessionXp = calculateSessionXp(accuracy) + 35;
      profile.xp += sessionXp; pendingReward = rollChest(); saveProfile(); updateProfileUI();
      showSessionResult(accuracy, stat);
    }

    function showSessionResult(accuracy, stat) {
      els.modalEmoji.textContent = lastSessionMode === "quiz" ? "🧩" : "🎉";
      els.resultTitle.textContent = lastSessionMode === "quiz" ? "Défi de positions terminé" : "Session terminée";
      els.resultSubtitle.textContent = lastSessionMode === "quiz"
        ? `${selectedOpening.name} — ${totalUserMoves} positions mélangées`
        : `${selectedOpening.name} — Niveau ${selectedLevel} · ${selectedVariation.name}`;
      els.resultFirstTry.textContent = `${firstTryCount} / ${totalUserMoves}`;
      els.resultAccuracy.textContent = `${accuracy} %`;
      els.resultErrors.textContent = String(errorPlySet.size);
      els.resultHints.textContent = String(hintsUsed);
      els.resultXp.textContent = `+${sessionXp} XP`;
      const italian = getOpeningProgress("italian");
      els.resultProgress.textContent = selectedLevel === 3 && selectedOpening.id === "italian"
        ? (italian.bossReady ? "Le boss final est disponible." : `${stat.qualifying}/${masteryTarget(3)} défis validés · meilleur score ${stat.best}%`)
        : `${stat.qualifying}/${masteryTarget(selectedLevel)} sessions validées · meilleur score ${stat.best}% · meilleure série ${bestCombo}`;
      els.unlockBanner.classList.toggle("show", lastUnlockMessages.length > 0);
      els.unlockBanner.innerHTML = lastUnlockMessages.join("<br>");
      els.resultRevenge.hidden = lastSessionMode === "quiz" || errorPlySet.size === 0;
      els.chestArea.classList.toggle("show", Boolean(pendingReward));
      els.rewardReveal.classList.remove("show"); els.rewardReveal.innerHTML = "";
      if (pendingReward) {
        els.openChestButton.disabled = false;
        els.openChestButton.className = `chest-button ${pendingReward.rarity}`;
        const names = { wood:"bois", silver:"argent", gold:"or", legendary:"légendaire" };
        els.chestLabel.textContent = `Ouvrir le coffre ${names[pendingReward.rarity]}`;
      }
      els.resultRestart.textContent = lastSessionMode === "quiz" ? "Nouveau défi" : "Rejouer une session";
      els.resultBackdrop.classList.add("open");
    }

    function finishTraining() {
      if (positionQuizMode) { finishPositionQuiz(); return; }
      if (revengeMode) { finishRevenge(); return; }
      boardLocked = true; renderAll();
      const accuracy = totalUserMoves ? Math.round(firstTryCount / totalUserMoves * 100) : 100;
      lastSessionErrors = new Set(errorPlySet); revengeSourceErrors = [...errorPlySet]; registerActiveDay(); lastUnlockMessages = [];
      const stat = recordLevelResult(accuracy); sessionXp = calculateSessionXp(accuracy); profile.xp += sessionXp;
      pendingReward = rollChest(); saveProfile(); updateProfileUI(); showSessionResult(accuracy, stat);
    }

    function startBoss() {
      selectedColor = "white"; updateColorButtons();
      selectedOpening = OPENINGS.find(item => item.id === "italian");
      els.openingSelect.value = "italian"; selectedLevel = 3; els.levelSelect.value = "3";
      startPositionQuiz(true);
    }

    function finishBoss(passed) {
      if (!bossMode && !positionQuizMode) return;
      const accuracy = totalUserMoves ? Math.round(firstTryCount / totalUserMoves * 100) : 100;
      positionQuizMode = false; bossMode = false; boardLocked = true;
      document.body.classList.remove("boss-active"); updateBossChip();
      const progress = getOpeningProgress("italian");
      lastUnlockMessages = [];
      if (passed) {
        const beforeUnlocked = OPENINGS.filter(item => isOpeningUnlocked(item.id)).map(item => item.id);
        progress.bossPassed = true; progress.bossReady = true; progress.masteredLevel = 3; progress.unlockedLevel = 3;
        sessionXp = 300 + firstTryCount * 5; profile.xp += sessionXp;
        lastUnlockMessages.push("🏆 Partie italienne maîtrisée");
        const afterUnlocked = OPENINGS.filter(item => isOpeningUnlocked(item.id)).map(item => item.id);
        afterUnlocked.filter(id => !beforeUnlocked.includes(id)).forEach(id => {
          const opening = OPENINGS.find(item => item.id === id);
          lastUnlockMessages.push(`🔓 ${opening.name} débloquée`);
        });
      } else {
        sessionXp = 50 + solvedUserMoves * 4; profile.xp += sessionXp;
      }
      saveProfile(); updateProfileUI(); lastSessionMode = "boss";
      els.modalEmoji.textContent = passed ? "🏆" : "💔";
      els.resultTitle.textContent = passed ? "Boss vaincu !" : "Le boss résiste encore";
      els.resultSubtitle.textContent = passed ? "Tu reconnais les positions clés de l’Italienne." : "Tes erreurs ont été enregistrées pour les prochains défis.";
      els.resultFirstTry.textContent = `${firstTryCount} / ${totalUserMoves}`;
      els.resultAccuracy.textContent = `${accuracy} %`;
      els.resultErrors.textContent = String(errorPlySet.size);
      els.resultHints.textContent = "0";
      els.resultXp.textContent = `+${sessionXp} XP`;
      els.resultProgress.textContent = passed ? "Rang Maître obtenu pour la Partie italienne." : `${Math.max(0,bossLives)} vie restante · entraîne les positions fragiles puis retente ta chance.`;
      els.unlockBanner.classList.toggle("show", lastUnlockMessages.length > 0);
      els.unlockBanner.innerHTML = lastUnlockMessages.join("<br>");
      els.resultRevenge.hidden = true; els.chestArea.classList.remove("show");
      els.resultRestart.textContent = passed ? "Rejouer le niveau 3" : "Retenter le boss";
      els.resultBackdrop.classList.add("open");
    }

    function updatePreview() {
      if (!selectedOpening) return;
      const meta = CAMPAIGN[selectedOpening.id] || {};
      const unlocked = isOpeningUnlocked(selectedOpening.id);
      const progress = getOpeningProgress(selectedOpening.id);
      const stat = getLevelProgress(selectedOpening.id, selectedLevel);
      const branches = branchesForLevel(selectedOpening, Math.min(selectedLevel, 2));
      const percent = levelMasteryPercent(selectedOpening.id, selectedLevel);
      const target = masteryTarget(selectedLevel);
      els.startButton.disabled = !unlocked || selectedLevel > progress.unlockedLevel;
      els.startButton.textContent = unlocked
        ? (selectedLevel === 3 ? "Lancer 10 positions aléatoires" : `Commencer le niveau ${selectedLevel}`)
        : "Ouverture verrouillée";

      let levelSpecific = selectedLevel === 2
        ? `<span class="quiz-badge">🔄 Rotation garantie : chaque branche apparaît avant qu’une branche ne soit répétée.</span>`
        : "";
      if (selectedLevel === 3) {
        levelSpecific = `<span class="quiz-badge">🧩 Départs intermédiaires · variante masquée</span>
          ${selectedOpening.id === "italian" ? `<div class="boss-state"><strong>${progress.bossPassed ? "Boss vaincu" : progress.bossReady ? "Boss disponible" : "Accès au boss"}</strong><br>
          ${progress.bossPassed ? "L’Italienne est maîtrisée." : progress.bossReady ? "Douze positions, trois vies, aucun indice automatique." : `Valide ${target} défis à 85 % ou plus, avec au maximum un indice.`}</div>` : ""}`;
      }
      els.openingPreview.innerHTML = `
        <strong>${unlocked ? "" : "🔒 "}${selectedOpening.name} — Niveau ${selectedLevel}</strong>
        <div class="opening-tags"><span class="opening-tag">${meta.difficulty || "—"}</span><span class="opening-tag">${meta.style || "—"}</span><span class="opening-tag">${selectedLevel === 3 ? "positions" : `${branches.length} branche${branches.length > 1 ? "s" : ""}`}</span></div>
        <span>${selectedOpening.description}</span>
        <span class="opening-principle"><b>Principe :</b> ${meta.principle || selectedOpening.description}</span>
        ${unlocked ? `<ul class="mini-list">${(meta.plans || []).slice(0,3).map(plan => `<li>${plan}</li>`).join("")}</ul>` : `<span class="lock-box"><br>Condition : ${openingUnlockText(selectedOpening.id)}</span>`}
        ${levelSpecific}
        <div class="mastery-line"><div class="mastery-meta"><span>${selectedLevel === 3 && selectedOpening.id === "italian" ? "Préparation du boss" : `Maîtrise ${stat.qualifying}/${target}`}</span><span>${percent}%</span></div><div class="mastery-track"><div class="mastery-fill" style="width:${percent}%"></div></div></div>
        <span class="previous-stats">${stat.sessions ? `${stat.sessions} session${stat.sessions > 1 ? "s" : ""} · meilleur score ${stat.best}%` : LEVELS[selectedLevel].description}</span>`;
      els.bossButton.hidden = !(selectedOpening.id === "italian" && selectedLevel === 3 && progress.bossReady && !progress.bossPassed);
      renderCampaign();
    }

    function openingRank(openingId) {
      const progress = getOpeningProgress(openingId);
      if (openingId === "italian" && progress.bossPassed) return "Maître";
      if (progress.masteredLevel >= 3) return "Maître";
      if (progress.masteredLevel >= 2) return "Or";
      if (progress.masteredLevel >= 1) return "Argent";
      return getLevelProgress(openingId, 1).sessions > 0 ? "Bronze" : "Découverte";
    }

    function restartCurrent(confirmFirst = true) {
      if (confirmFirst && !window.confirm(positionQuizMode ? "Recommencer ce défi depuis le début ?" : "Recommencer cette ouverture depuis le début ?")) return;
      if (bossMode) startBoss(); else startTraining();
    }

    function goHome(confirmFirst = false) {
      if (confirmFirst && moveIndex > 0 && !els.resultBackdrop.classList.contains("open")) {
        if (!window.confirm("Quitter l’entraînement en cours ?")) return;
      }
      sessionToken += 1; revengeMode = false; positionQuizMode = false; bossMode = false;
      if (preQuizHintPreference !== null) { hideStrategicHint = preQuizHintPreference; preQuizHintPreference = null; }
      document.body.classList.remove("training-active", "quiz-active", "boss-active");
      updateBossChip(); window.scrollTo(0,0);
      els.resultBackdrop.classList.remove("open"); els.trainingScreen.classList.remove("active"); els.homeScreen.classList.add("active");
      updateProfileUI(); populateOpenings(selectedOpening?.id);
    }

    function restartLastSession() {
      els.resultBackdrop.classList.remove("open");
      if (lastSessionMode === "boss" && !getOpeningProgress("italian").bossPassed) startBoss();
      else startTraining();
    }


    function bindEvents() {
      els.whiteChoice.addEventListener("click", () => setColor("white"));
      els.blackChoice.addEventListener("click", () => setColor("black"));
      els.openingSelect.addEventListener("change", () => {
        selectedOpening = OPENINGS.find(item => item.id === els.openingSelect.value);
        populateLevels();
      });
      els.levelSelect.addEventListener("change", () => {
        selectedLevel = Number(els.levelSelect.value) || 1;
        updatePreview();
      });
      els.conceptButton.addEventListener("click", () => openConceptModal(null));
      els.conceptTrainingButton.addEventListener("click", () => openConceptModal(null));
      els.startButton.addEventListener("click", () => { primeAudio(); requestSessionStart("training"); });
      els.bossButton.addEventListener("click", () => { primeAudio(); requestSessionStart("boss"); });
      els.conceptCloseButton.addEventListener("click", closeConceptModal);
      els.conceptStartButton.addEventListener("click", () => {
        const action = pendingConceptAction;
        const opening = OPENINGS.find(item => item.id === els.openingSelect.value) || selectedOpening;
        const level = Number(els.levelSelect.value) || selectedLevel || 1;
        if (opening) localStorage.setItem(`openingTrainer.conceptSeen.${opening.id}.${level}`, "yes");
        closeConceptModal();
        if (action === "boss") startBoss();
        else if (action === "training") startTraining();
      });
      els.restartButton.addEventListener("click", () => restartCurrent(true));
      els.hintButton.addEventListener("click", useHint);
      els.hideHintCheckbox.addEventListener("change", event => {
        hideStrategicHint = event.currentTarget.checked;
        localStorage.setItem("openingTrainer.hideStrategicHint", hideStrategicHint ? "on" : "off");
        if (!isPreviewing() && isUserTurn()) { setUserTurnStatus(); renderAll(); }
      });
      els.prevButton.addEventListener("click", () => jumpToPly(viewedPly - 1));
      els.nextButton.addEventListener("click", () => jumpToPly(viewedPly + 1));
      els.backButton.addEventListener("click", () => goHome(true));
      els.homeButton.addEventListener("click", () => goHome(true));
      els.soundButton.addEventListener("click", toggleSound);
      els.flipButton.addEventListener("click", flipBoard);
      els.resultRestart.addEventListener("click", restartLastSession);
      els.resultRevenge.addEventListener("click", startRevenge);
      els.openChestButton.addEventListener("click", openPendingChest);
      els.resultHome.addEventListener("click", () => goHome(false));
      document.addEventListener("pointerdown", primeAudio, { passive: true });
      document.addEventListener("keydown", primeAudio, { passive: true });
      window.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;
        if (els.conceptBackdrop.classList.contains("open")) closeConceptModal();
        else if (els.resultBackdrop.classList.contains("open")) goHome(false);
      });
    }

    function init() {
      if (typeof Chess === "undefined") {
        fail("La bibliothèque d’échecs n’a pas pu être chargée. Vérifie la connexion Internet puis recharge la page.");
        return;
      }
      profile = loadProfile();
      migrateProfileV7();
      if (!["white", "black"].includes(selectedColor)) selectedColor = "white";
      updateSoundButton();
      updateColorButtons();
      els.hideHintCheckbox.checked = hideStrategicHint;
      updateProfileUI();
      populateOpenings();
      bindEvents();
    }

    init();
  