'use strict';

const $ = id => document.getElementById(id);

let profile;
try {
  profile = JSON.parse(localStorage.getItem('chessProfile') || '{"xp":0,"mastery":{}}');
} catch (_) {
  profile = { xp: 0, mastery: {} };
}

let color = 'white';
let opening = null;
let level = 1;
let game = null;
let line = [];
let idx = 0;
let selectedSquare = null;
let lastMove = null;
let errors = 0;
let hints = 0;
let firstTry = 0;
let totalAttempts = 0;
let combo = 0;
let boss = false;
let lives = 3;
let queue = [];
let questionIndex = 0;
let currentQuestion = null;

function reportError(message) {
  const banner = $('errorBanner');
  banner.textContent = message;
  banner.classList.add('show');
}

window.addEventListener('error', event => reportError(`Erreur technique : ${event.message}`));

function saveProfile() {
  localStorage.setItem('chessProfile', JSON.stringify(profile));
  updateXP();
}

function updateXP() {
  const playerLevel = Math.floor(profile.xp / 500) + 1;
  const levelBase = (playerLevel - 1) * 500;
  $('lvl').textContent = `Niv. ${playerLevel}`;
  $('xpTxt').textContent = `${profile.xp} XP`;
  $('xpFill').style.width = `${Math.min(100, ((profile.xp - levelBase) / 500) * 100)}%`;
}

function availableOpenings() {
  return OPENING_DATA[color];
}

function mastery() {
  return profile.mastery[opening.id] || 0;
}

function populateOpenings() {
  color = $('color').value;
  $('opening').innerHTML = availableOpenings()
    .map(item => `<option value="${item.id}">${item.name}</option>`)
    .join('');
  opening = availableOpenings()[0];
  populateLevels();
  updatePreview();
}

function populateLevels() {
  const currentMastery = mastery();
  $('level').innerHTML = [1, 2, 3]
    .map(number => {
      const label = number === 1 ? 'Apprendre' : number === 2 ? 'Variantes' : 'Positions';
      return `<option value="${number}" ${number > currentMastery + 1 ? 'disabled' : ''}>Niveau ${number} — ${label}</option>`;
    })
    .join('');
  level = Math.min(Math.max(1, currentMastery + 1), 3);
  $('level').value = String(level);
  $('bossBtn').hidden = currentMastery < 3 || opening.id !== 'italian';
}

function updatePreview() {
  const currentMastery = mastery();
  $('preview').innerHTML = `
    <strong>${opening.name}</strong>
    ${opening.desc}<br><br>
    <b>Concept :</b> ${opening.principles[0]}<br>
    <b>Progression :</b> niveau ${currentMastery}/3 maîtrisé.
  `;
}

function showScreen(id) {
  $('home').classList.remove('active');
  $('train').classList.remove('active');
  $(id).classList.add('active');
}

function showConcept() {
  $('conceptTitle').textContent = opening.name;
  $('conceptBody').innerHTML = `
    <h4>Ce que cherche l’ouverture</h4>
    <ul>${opening.principles.map(item => `<li>${item}</li>`).join('')}</ul>
    <h4>Lire les réponses adverses</h4>
    ${opening.signals.map(([move, text]) => `<div class="legend"><div><b>${move}</b> — ${text}</div></div>`).join('')}
    <h4>Comment raisonner</h4>
    <div class="legend">
      <div>1. Regarde ce que le dernier coup adverse attaque ou libère.</div>
      <div>2. Vérifie si ton roi et tes pièces sont suffisamment développés.</div>
      <div>3. Cherche ensuite la rupture de pion ou la case cible prévue par le plan.</div>
    </div>
    <h4>Comment l’application juge tes coups</h4>
    <div class="legend">
      <div style="border-left:4px solid var(--green)"><b>Coup du répertoire</b> : la réponse précise choisie pour ce répertoire.</div>
      <div style="border-left:4px solid var(--blue)"><b>Bon coup alternatif</b> : valide, mais menant vers un autre plan.</div>
      <div style="border-left:4px solid var(--warn)"><b>Coup non validé</b> : légal, sans être déclaré mauvais faute de moteur.</div>
    </div>
  `;
  $('conceptModal').classList.add('open');
}

function userColor() {
  return color === 'white' ? 'w' : 'b';
}

function prepareMoves(moves) {
  const tempGame = new Chess();
  return moves.map((san, index) => {
    const move = tempGame.move(san, { sloppy: true });
    if (!move) throw new Error(`Ligne invalide au coup ${index + 1} : ${san}`);
    return move;
  });
}

function playPrepared(move) {
  return game.move({ from: move.from, to: move.to, promotion: move.promotion || 'q' });
}

function chooseTrainingBranch() {
  if (level === 1 || opening.branches.length === 1) return opening.branches[0];

  const alternatives = opening.branches.slice(1);
  const rotationKey = `rot_${opening.id}`;
  const rotation = Number(localStorage.getItem(rotationKey) || 0);
  const branch = alternatives[rotation % alternatives.length];
  localStorage.setItem(rotationKey, String((rotation + 1) % alternatives.length));
  return branch;
}

function start(isBoss = false) {
  if (typeof Chess !== 'function') {
    reportError('Le moteur d’échecs n’a pas pu être chargé. Recharge la page.');
    return;
  }

  boss = isBoss;
  lives = 3;
  errors = 0;
  hints = 0;
  firstTry = 0;
  totalAttempts = 0;
  combo = 0;
  selectedSquare = null;
  lastMove = null;
  $('prog').style.width = '0%';

  if (level === 3 || boss) {
    queue = [];
    opening.branches.forEach((branch, branchIndex) => {
      const prepared = prepareMoves(branch.moves);
      prepared.forEach((move, ply) => {
        if (move.color === userColor() && ply >= 4) queue.push({ branch: branchIndex, ply });
      });
    });
    queue.sort(() => Math.random() - 0.5);
    queue = queue.slice(0, boss ? 12 : 10);
    questionIndex = 0;
    loadQuiz();
  } else {
    const branch = chooseTrainingBranch();
    line = prepareMoves(branch.moves);
    idx = 0;
    game = new Chess();
    $('variant').textContent = branch.name;
    showScreen('train');
    autoPlayOpponent();
    renderBoard();
    setStatus('À toi de jouer', 'Trouve le prochain coup.', '');
  }

  $('title').textContent = opening.name;
  $('lives').hidden = !boss;
  $('lives').textContent = `❤️ ${lives}`;
  $('hint').disabled = boss;
}

function loadQuiz() {
  if (questionIndex >= queue.length) {
    finish();
    return;
  }

  currentQuestion = queue[questionIndex];
  const branch = opening.branches[currentQuestion.branch];
  const prepared = prepareMoves(branch.moves);
  game = new Chess();

  for (let i = 0; i < currentQuestion.ply; i += 1) playPrepared(prepared[i]);

  line = prepared;
  idx = currentQuestion.ply;
  lastMove = idx ? line[idx - 1] : null;
  showScreen('train');
  $('title').textContent = opening.name;
  $('variant').textContent = boss ? 'Boss — variante cachée' : `Position ${questionIndex + 1} / ${queue.length}`;
  renderBoard();
  setStatus('À toi de jouer', 'Reconnais la position et trouve le coup du répertoire.', '');
}

function autoPlayOpponent() {
  while (idx < line.length && line[idx].color !== userColor()) {
    playPrepared(line[idx]);
    lastMove = line[idx];
    idx += 1;
  }
  if (idx >= line.length) finish();
}

function squareOrder() {
  const files = 'abcdefgh';
  const ranks = '87654321';
  const squares = [...ranks].flatMap(rank => [...files].map(file => file + rank));
  return color === 'black' ? squares.reverse() : squares;
}

function renderBoard() {
  if (!game) return;
  const order = squareOrder();
  $('board').innerHTML = '';

  for (const square of order) {
    const file = square.charCodeAt(0) - 97;
    const rank = 8 - Number(square[1]);
    const cell = document.createElement('div');
    cell.className = `sq ${(file + rank) % 2 ? 'dark' : 'light'}${selectedSquare === square ? ' sel' : ''}${lastMove && (lastMove.from === square || lastMove.to === square) ? ' last' : ''}`;
    cell.dataset.s = square;
    const piece = game.get(square);
    if (piece) cell.innerHTML = `<span class="piece">${PIECES[piece.color][piece.type]}</span>`;
    cell.onclick = () => clickSquare(square);
    $('board').appendChild(cell);
  }

  const done = level === 3 || boss ? questionIndex : Math.floor(idx / 2);
  const max = level === 3 || boss ? queue.length : Math.ceil(line.length / 2);
  $('prog').style.width = `${max ? Math.min(100, (done / max) * 100) : 0}%`;
  $('combo').textContent = `🔥 ${combo}`;
}

function loseBossLife() {
  if (!boss) return false;
  lives = Math.max(0, lives - 1);
  $('lives').textContent = `❤️ ${lives}`;
  if (lives === 0) {
    renderBoard();
    setTimeout(finish, 300);
    return true;
  }
  return false;
}

function clickSquare(square) {
  if (!game) return;
  const piece = game.get(square);

  if (!selectedSquare) {
    if (piece && piece.color === userColor() && game.turn() === userColor()) {
      selectedSquare = square;
      renderBoard();
    }
    return;
  }

  const historyBeforeMove = game.history();
  const move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
  if (!move) {
    selectedSquare = null;
    renderBoard();
    return;
  }

  const expected = line[idx];
  const positionKey = historyBeforeMove.join(' ');
  const alternatives = (opening.alts[positionKey] || '').split('|').filter(Boolean);
  totalAttempts += 1;

  if (move.from === expected.from && move.to === expected.to) {
    firstTry += 1;
    combo += 1;
    lastMove = move;
    idx += 1;
    setStatus('Coup du répertoire', explainMove(expected.san), 'good');
    selectedSquare = null;
    renderBoard();
    setTimeout(() => {
      if (level === 3 || boss) {
        questionIndex += 1;
        loadQuiz();
      } else {
        autoPlayOpponent();
        renderBoard();
      }
    }, 420);
    return;
  }

  game.undo();
  errors += 1;
  combo = 0;
  selectedSquare = null;
  const gameOver = loseBossLife();

  if (alternatives.includes(move.san)) {
    setStatus('Bon coup alternatif', `${move.san} est jouable, mais mène vers un autre plan. Rejoue le coup du répertoire.`, 'alt');
  } else {
    setStatus('Coup légal non validé', 'Ce coup n’appartient pas au répertoire étudié. Cela ne signifie pas forcément qu’il est mauvais.', 'warn');
  }

  if (!gameOver) renderBoard();
}

function explainMove(san) {
  const explanations = {
    e4: 'Occupe le centre et libère le fou et la dame.',
    d4: 'Prend de l’espace au centre et ouvre les lignes des pièces.',
    Nf3: 'Développe une pièce, contrôle le centre et prépare le roque.',
    Bc4: 'Développe le fou vers f7, point sensible avant le roque.',
    Bf4: 'Place le fou hors de la chaîne de pions avant de jouer e3.',
    c3: 'Soutient d4 et prépare une occupation plus forte du centre.',
    e3: 'Consolide le centre et libère le fou de cases noires.',
    'O-O': 'Met le roi en sécurité et active la tour.',
    c6: 'Prépare ...d5 tout en gardant une structure solide.',
    e6: 'Prépare ...d5 et construit un centre robuste.'
  };
  return explanations[san] || 'Le coup améliore la coordination des pièces et respecte le plan de l’ouverture.';
}

function setStatus(title, message, className) {
  $('status').className = `status ${className}`;
  $('status').innerHTML = `<strong>${title}</strong><span>${message}</span>`;
}

function showHint() {
  hints += 1;
  const expected = line[idx];
  if (!expected) return;
  const square = [...document.querySelectorAll('.sq')].find(item => item.dataset.s === expected.from);
  if (square) square.classList.add('hint');
  setStatus('Indice', `Cherche un coup depuis ${expected.from}. Objectif : ${explainMove(expected.san)}`, 'alt');
}

function finish() {
  const accuracy = totalAttempts ? Math.round((firstTry / totalAttempts) * 100) : 0;
  const gain = Math.max(20, Math.round(accuracy / 2) - errors * 2) + (boss && lives > 0 ? 150 : 0);
  profile.xp += gain;
  let message = 'Progression enregistrée.';

  if (accuracy >= 85 && hints <= 1 && !boss) {
    profile.mastery[opening.id] = Math.max(mastery(), level);
    message = `Niveau ${level} validé.`;
  }
  if (boss && lives > 0) {
    profile.mastery[opening.id] = 3;
    message = 'Boss vaincu — ouverture maîtrisée.';
  }

  saveProfile();
  $('emoji').textContent = boss ? (lives > 0 ? '👑' : '💔') : accuracy >= 85 ? '🎉' : '📚';
  $('resTitle').textContent = boss ? (lives > 0 ? 'Boss vaincu' : 'Boss perdu') : 'Session terminée';
  $('resSub').textContent = message;
  $('acc').textContent = `${accuracy}%`;
  $('err').textContent = String(errors);
  $('hints').textContent = String(hints);
  $('gain').textContent = `+${gain} XP`;
  $('resultModal').classList.add('open');
}

$('color').onchange = populateOpenings;
$('opening').onchange = () => {
  opening = availableOpenings().find(item => item.id === $('opening').value);
  populateLevels();
  updatePreview();
};
$('level').onchange = () => {
  level = Number($('level').value);
  updatePreview();
};
$('startBtn').onclick = () => start(false);
$('bossBtn').onclick = () => start(true);
$('conceptBtn').onclick = showConcept;
$('conceptTrain').onclick = showConcept;
$('conceptClose').onclick = () => $('conceptModal').classList.remove('open');
$('back').onclick = () => {
  showScreen('home');
  populateLevels();
  updatePreview();
};
$('restart').onclick = () => start(boss);
$('hint').onclick = showHint;
$('again').onclick = () => {
  $('resultModal').classList.remove('open');
  start(boss);
};
$('homeBtn').onclick = () => {
  $('resultModal').classList.remove('open');
  showScreen('home');
  populateLevels();
  updatePreview();
};

updateXP();
populateOpenings();
