// =============================================================================
// MEME SOLITAIRE — Full Game Logic
// =============================================================================

'use strict';

// ─── MEME CONFIG ──────────────────────────────────────────────────────────────
const MEMES = {
  suits: {
    '♠': { img: '../weegees-mansion/Weegee-Sprites/Weegee_Left.png',       name: 'Weegee Spades',   color: 'black' },
    '♥': { img: '../grand-meme-prix/assets/Rick-Astley.png',               name: 'Rickroll Hearts', color: 'red'   },
    '♦': { img: '../meme-claw-machine/memes/HotelMarioMario.png',          name: 'Mario Diamonds',  color: 'red'   },
    '♣': { img: '../meme-claw-machine/memes/Doge.png',                     name: 'Doge Clubs',      color: 'black' },
  },
  // Face card PNGs — same image used across all suits for that rank
  kingImg:  '../king-harkinians-personal-chef-simulator/assets/sprites/King-Harkinian-CD-i.png',
  queenImg: '../king-harkinians-personal-chef-simulator/assets/sprites/Zelda-CD-i.png',
  jackImg:  '../king-harkinians-personal-chef-simulator/assets/sprites/Gwonam-CD-i.png',
  aceImg:   '../rick-roll-2d/Trollface.png',
  cpuNames: ['DOGE CPU', 'TROLLFACE BOT', 'OVER 9000 AI', 'SHREK-3000'],
  winPhrases: [
    'GG EZ LMAO',
    'U MAD BRO?',
    'GET REKT SCRUB',
    'IT\'S OVER 9000 POINTS!',
    'ALL YOUR BASE ARE BELONG TO US',
    'DO A BARREL ROLL... INTO VICTORY!',
  ],
  losePhrases: [
    'AYYYY LMAO YOU WIN',
    'SUCH LOSS. MUCH SAD. WOW.',
    'THE CAKE WAS A LIE',
    'I AM ERROR.',
    'OBJECTION! ...SUSTAINED.',
    'NYAN CAT OUT 🐱🌈',
  ],
  cpuStatusPhrases: [
    '💻 CRUNCHING MEMES...',
    '🤔 BIG BRAIN TIME...',
    '📊 OVER 9000 CALCULATIONS...',
    '🔄 BUFFERING...',
    '💾 LOADING TROLLFACE.EXE...',
  ],
  statusPhrases: {
    gameStart:  '🎮 PRESS F TO PAY RESPECTS — GAME ON!',
    playerTurn: '👤 YOUR TURN — DO A BARREL ROLL!',
    cpuTurn:    '💻 CPU IS THINKING... THIS IS FINE 🔥',
    cardMoved:  ['📦 NICE MOVE!', '👌 OK!', '💯 100%!', '🔥 HOT!'],
    stockDraw:  ['🃏 DREW A CARD!', '🎴 YOINK!', '🔄 CYCLES!'],
    noMoves:    '😱 NO MOVES! DRAWING FROM STOCK...',
    stockEmpty: '💀 STOCK IS EMPTY! FLIPPING WASTE...',
    cantPlace:  ['❌ NOPE!', '🚫 WRONG!', '😅 NUH UH!'],
  }
};

// ─── CONSTANTS ─────────────────────────────────────────────────────────────────
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const RANK_VAL = { A:1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7, '8':8, '9':9, '10':10, J:11, Q:12, K:13 };

// Scoring
const SCORE = {
  FOUNDATION: 10,
  FLIP_CARD:  5,
  WASTE_TO_TAB: 5,
  FOUNDATION_BACK: -15,
  CPU_TURN_PENALTY: 0,
};

// CPU difficulty params — tuned to feel "fair but beatable"
const CPU = {
  MOVE_DELAY_MIN: 1200,  // ms between moves
  MOVE_DELAY_MAX: 2200,
  TURN_MIN_MOVES: 1,     // CPU makes 1-3 moves per "turn"
  TURN_MAX_MOVES: 3,
  // Probability CPU will make a "suboptimal" move (creates fairness)
  BLUNDER_CHANCE: 0.18,
  // Probability CPU skips a valid foundation play (makes it beatable)
  SKIP_FOUNDATION_CHANCE: 0.10,
  // Max draws per turn
  MAX_DRAWS: 3,
};

// ─── GAME STATE ────────────────────────────────────────────────────────────────
let G = null;

function makeCard(suit, rank) {
  return { suit, rank, faceUp: false, id: `${rank}${suit}` };
}

function shuffleDeck(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function freshDeck() {
  const d = [];
  for (const s of SUITS) for (const r of RANKS) d.push(makeCard(s, r));
  return shuffleDeck(d);
}

function suitColor(suit) {
  return MEMES.suits[suit].color;
}

function isRed(card) { return suitColor(card.suit) === 'red'; }

function rankVal(card) { return RANK_VAL[card.rank]; }

// Can `card` be placed on top of `target` in tableau (alternate color, one lower)?
function canStackTab(card, target) {
  if (!target) return card.rank === 'K'; // empty column: only kings
  if (!target.faceUp) return false;
  return suitColor(card.suit) !== suitColor(target.suit) &&
         rankVal(card) === rankVal(target) - 1;
}

// Can `card` go on the given foundation pile?
function canStackFound(card, foundPile) {
  if (foundPile.length === 0) return card.rank === 'A';
  const top = foundPile[foundPile.length - 1];
  return card.suit === top.suit && rankVal(card) === rankVal(top) + 1;
}

// ─── INIT STATE ────────────────────────────────────────────────────────────────
function initGame() {
  const playerDeck = freshDeck();
  const cpuDeck    = freshDeck();

  // Build tableau for each side (7 piles)
  function buildTableau(deck) {
    const tab = [];
    let idx = 0;
    for (let i = 0; i < 7; i++) {
      const pile = [];
      for (let j = 0; j <= i; j++) {
        const card = deck[idx++];
        card.faceUp = (j === i);
        pile.push(card);
      }
      tab.push(pile);
    }
    return { tableau: tab, stock: deck.slice(idx), waste: [] };
  }

  const pSide = buildTableau(playerDeck);
  const cSide = buildTableau(cpuDeck);

  // CPU has all its waste face-up (known to it)
  cSide.stock.forEach(c => { c.faceUp = false; });

  G = {
    // Player
    playerTab:   pSide.tableau,
    playerFound: [[], [], [], []],   // ♠ ♥ ♦ ♣
    playerStock: pSide.stock,
    playerWaste: pSide.waste,
    playerScore: 0,

    // CPU
    cpuTab:   cSide.tableau,
    cpuFound: [[], [], [], []],
    cpuStock: cSide.stock,
    cpuWaste: cSide.waste,
    cpuScore: 0,

    // Turn / state
    turn:       'player', // 'player' | 'cpu'
    selected:   null,     // { source, pileIdx, cardIdx } | null
    cpuActive:  false,
    gameOver:   false,
    stockPasses: 0,       // how many times stock has been recycled (player)
    cpuStockPasses: 0,
    startTime:  Date.now(),
    elapsed:    0,
    timerInt:   null,
    cpuName:    MEMES.cpuNames[Math.floor(Math.random() * MEMES.cpuNames.length)],
  };

  return G;
}

// ─── CHECK WIN ─────────────────────────────────────────────────────────────────
function checkWin(found) {
  return found.every(f => f.length === 13);
}

// ─── UI RENDERING ──────────────────────────────────────────────────────────────
function cardEl(card, opts = {}) {
  const el = document.createElement('div');
  el.classList.add('card');
  el.dataset.cardId = card.id;

  if (!card.faceUp) {
    el.classList.add('face-down', 'no-hover');
    return el;
  }

  el.classList.add('face-up', suitColor(card.suit) === 'red' ? 'red' : 'black');

  // Corner top-left
  const topCorner = document.createElement('div');
  topCorner.className = 'card-corner card-corner-top';
  topCorner.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit-small">${card.suit}</span>`;

  // Corner bottom-right
  const botCorner = document.createElement('div');
  botCorner.className = 'card-corner card-corner-bot';
  botCorner.innerHTML = `<span class="card-rank">${card.rank}</span><span class="card-suit-small">${card.suit}</span>`;

  // Center meme image
  const center = document.createElement('div');
  center.className = 'card-center';

  let imgSrc;
  if      (card.rank === 'K') imgSrc = MEMES.kingImg;
  else if (card.rank === 'Q') imgSrc = MEMES.queenImg;
  else if (card.rank === 'J') imgSrc = MEMES.jackImg;
  else if (card.rank === 'A') imgSrc = MEMES.aceImg;
  else                         imgSrc = MEMES.suits[card.suit].img;

  const img = document.createElement('img');
  img.src = imgSrc;
  img.alt = card.rank + card.suit;
  img.className = 'card-meme-img';
  center.appendChild(img);

  el.appendChild(topCorner);
  el.appendChild(botCorner);
  el.appendChild(center);

  if (opts.selected) el.classList.add('selected');

  return el;
}

function renderSide(side) {
  // 'player' or 'cpu'
  const isPlayer = side === 'player';
  const tab      = isPlayer ? G.playerTab   : G.cpuTab;
  const found    = isPlayer ? G.playerFound : G.cpuFound;
  const stock    = isPlayer ? G.playerStock : G.cpuStock;
  const waste    = isPlayer ? G.playerWaste : G.cpuWaste;
  const prefix   = isPlayer ? 'p' : 'c';

  // ── Stock ──
  const stockEl = document.getElementById(`${prefix}-stock`);
  stockEl.innerHTML = '';
  if (stock.length > 0) {
    const top = makeCard('♠', 'A'); // just for visual — always show back
    top.faceUp = false;
    const c = cardEl(top);
    c.style.position = 'relative';
    c.style.display = 'block';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.top = '0'; c.style.left = '0';
    stockEl.appendChild(c);

    // Count badge
    const badge = document.createElement('div');
    badge.style.cssText = 'position:absolute;top:4px;right:4px;background:rgba(0,0,0,0.7);color:#fff;font-size:11px;padding:2px 5px;border-radius:3px;font-family:ComicSans,cursive,sans-serif;z-index:10;pointer-events:none;';
    badge.textContent = stock.length;
    stockEl.appendChild(badge);
  } else {
    stockEl.textContent = '🔄';
  }

  // ── Waste ──
  const wasteEl = document.getElementById(`${prefix}-waste`);
  wasteEl.innerHTML = '';
  if (waste.length > 0) {
    const top = waste[waste.length - 1];
    const c = cardEl(top);
    c.style.position = 'relative';
    c.style.display = 'block';
    c.style.width = '100%';
    c.style.height = '100%';
    c.style.top = '0'; c.style.left = '0';
    if (isPlayer && G.selected && G.selected.source === 'waste') c.classList.add('selected');
    wasteEl.appendChild(c);
  }

  // ── Foundations ──
  for (let i = 0; i < 4; i++) {
    const fEl = document.getElementById(`${prefix}-found-${i}`);
    fEl.innerHTML = '';
    fEl.textContent = SUITS[i]; // default slot label
    if (found[i].length > 0) {
      fEl.textContent = '';
      const top = found[i][found[i].length - 1];
      const c = cardEl(top);
      c.style.position = 'relative';
      c.style.display = 'block';
      c.style.width = '100%';
      c.style.height = '100%';
      c.style.top = '0'; c.style.left = '0';
      c.classList.add('no-hover');
      fEl.appendChild(c);

      // Show count
      if (found[i].length > 1) {
        const cnt = document.createElement('div');
        cnt.style.cssText = 'position:absolute;bottom:3px;right:4px;font-size:10px;color:rgba(255,255,255,0.6);font-family:ComicSans,cursive,sans-serif;pointer-events:none;';
        cnt.textContent = found[i].length;
        fEl.appendChild(cnt);
      }
    }
  }

  // ── Tableau ──
  for (let pi = 0; pi < 7; pi++) {
    const pileEl = document.getElementById(`${prefix}-tab-${pi}`);
    pileEl.innerHTML = '';
    const pile = tab[pi];

    // Slot placeholder
    const slotGhost = document.createElement('div');
    slotGhost.style.cssText = `position:absolute;top:0;left:0;width:100%;height:var(--card-h);border:2px dashed rgba(255,255,255,0.15);border-radius:var(--card-radius);box-sizing:border-box;`;
    pileEl.appendChild(slotGhost);

    // Dynamic height for pile
    const cardH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-h'));
    const offsetY = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stack-offset-y'));

    let totalH = cardH;
    if (pile.length > 1) totalH = cardH + offsetY * (pile.length - 1);
    pileEl.style.height = totalH + 'px';

    pile.forEach((card, ci) => {
      const c = cardEl(card);
      const topOffset = ci * offsetY;
      c.style.top    = topOffset + 'px';
      c.style.left   = '0';
      c.style.zIndex = ci + 1;
      c.style.width  = 'var(--card-w)';
      c.style.height = 'var(--card-h)';

      if (isPlayer && G.selected) {
        const sel = G.selected;
        if (sel.source === 'tableau' && sel.pileIdx === pi && sel.cardIdx <= ci && ci < pile.length) {
          c.classList.add('selected');
        }
      }
      pileEl.appendChild(c);
    });
  }
}

function renderAll() {
  renderSide('player');
  renderSide('cpu');
  updateHUD();
}

function updateHUD() {
  document.getElementById('hud-player-score').textContent = G.playerScore;
  document.getElementById('hud-cpu-score').textContent    = G.cpuScore;
  document.getElementById('hud-cpu-name').textContent     = G.cpuName;
}

function setStatus(msg) {
  document.getElementById('status-bar').textContent = msg;
}

function rnd(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function scorePopup(text, x, y, color = '#f5f500') {
  const el = document.createElement('div');
  el.className = 'score-pop';
  el.textContent = text;
  el.style.color = color;
  el.style.left  = x + 'px';
  el.style.top   = y + 'px';
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 1300);
}

// ─── TIMER ─────────────────────────────────────────────────────────────────────
function startTimer() {
  if (G.timerInt) clearInterval(G.timerInt);
  G.timerInt = setInterval(() => {
    if (G.gameOver) return;
    G.elapsed = Math.floor((Date.now() - G.startTime) / 1000);
    const m = String(Math.floor(G.elapsed / 60)).padStart(2, '0');
    const s = String(G.elapsed % 60).padStart(2, '0');
    document.getElementById('hud-timer').textContent = `${m}:${s}`;
  }, 500);
}

function stopTimer() {
  if (G.timerInt) { clearInterval(G.timerInt); G.timerInt = null; }
}

// ─── PLAYER ACTIONS ────────────────────────────────────────────────────────────
function playerDrawStock() {
  if (G.turn !== 'player' || G.cpuActive) return;

  if (G.playerStock.length === 0) {
    if (G.playerWaste.length === 0) {
      setStatus('💀 NOTHING LEFT! YOU LITERALLY HAVE NOTHING!');
      return;
    }
    // Flip waste back to stock
    G.playerStock = G.playerWaste.reverse().map(c => ({ ...c, faceUp: false }));
    G.playerWaste = [];
    G.stockPasses++;
    setStatus(MEMES.statusPhrases.stockEmpty);
  } else {
    const card = G.playerStock.pop();
    card.faceUp = true;
    G.playerWaste.push(card);
    setStatus(rnd(MEMES.statusPhrases.stockDraw));
  }

  G.selected = null;
  renderAll();
  checkGameOverCondition();
}

function playerSelectWaste() {
  if (G.turn !== 'player' || G.cpuActive) return;
  if (G.playerWaste.length === 0) return;

  if (G.selected && G.selected.source === 'waste') {
    G.selected = null;
  } else {
    G.selected = { source: 'waste', card: G.playerWaste[G.playerWaste.length - 1] };
  }
  renderSide('player');
}

function playerClickTableau(pileIdx, cardIdx) {
  if (G.turn !== 'player' || G.cpuActive) return;
  const pile = G.playerTab[pileIdx];
  const card = pile[cardIdx];

  if (!card.faceUp) {
    // Flip if it's the top card
    if (cardIdx === pile.length - 1) {
      card.faceUp = true;
      G.playerScore += SCORE.FLIP_CARD;
      scorePopup(`+${SCORE.FLIP_CARD}`, 200, 200);
      renderAll();
      checkGameOverCondition();
    }
    return;
  }

  if (!G.selected) {
    // Select this card (and all below it face-up)
    G.selected = { source: 'tableau', pileIdx, cardIdx, cards: pile.slice(cardIdx) };
    renderSide('player');
    return;
  }

  // Try to move selected onto this pile
  const selCards = getSelectedCards();
  const bottomSelected = selCards[0];
  const topOfPile = pile[pile.length - 1];

  if (canStackTab(bottomSelected, topOfPile || null)) {
    moveSelectedToTableau(pileIdx);
  } else {
    // Reselect
    G.selected = { source: 'tableau', pileIdx, cardIdx, cards: pile.slice(cardIdx) };
    renderSide('player');
  }
}

function playerClickFoundation(foundIdx) {
  if (G.turn !== 'player' || G.cpuActive) return;

  if (!G.selected) return;
  const selCards = getSelectedCards();
  if (selCards.length !== 1) { setStatus('😅 CAN ONLY MOVE ONE CARD TO FOUNDATION!'); return; }

  const card = selCards[0];
  if (canStackFound(card, G.playerFound[foundIdx])) {
    // Remove from source
    removeSelected();
    G.playerFound[foundIdx].push(card);
    G.playerScore += SCORE.FOUNDATION;
    scorePopup(`+${SCORE.FOUNDATION} 🔥`, window.innerWidth * 0.5, window.innerHeight * 0.4, '#4ff508');
    setStatus(`${MEMES.suits[card.suit].emoji} ${card.rank}${card.suit} → FOUNDATION! +${SCORE.FOUNDATION}`);
    G.selected = null;
    renderAll();
    checkWinCondition();
  } else {
    setStatus(rnd(MEMES.statusPhrases.cantPlace));
  }
}

function getSelectedCards() {
  if (!G.selected) return [];
  if (G.selected.source === 'waste') return [G.playerWaste[G.playerWaste.length - 1]];
  if (G.selected.source === 'tableau') return G.selected.cards;
  return [];
}

function moveSelectedToTableau(targetPileIdx) {
  const selCards = getSelectedCards();
  removeSelected();
  G.playerTab[targetPileIdx].push(...selCards);

  const wasFromWaste = G.selected && G.selected.source === 'waste';
  G.playerScore += wasFromWaste ? SCORE.WASTE_TO_TAB : SCORE.FLIP_CARD;
  scorePopup(`+${SCORE.WASTE_TO_TAB}`, 300, 250);
  setStatus(rnd(MEMES.statusPhrases.cardMoved));
  G.selected = null;
  renderAll();
  checkGameOverCondition();
}

function removeSelected() {
  const sel = G.selected;
  if (!sel) return;
  if (sel.source === 'waste') {
    G.playerWaste.pop();
  } else if (sel.source === 'tableau') {
    G.playerTab[sel.pileIdx] = G.playerTab[sel.pileIdx].slice(0, sel.cardIdx);
    // Flip new top card
    const pile = G.playerTab[sel.pileIdx];
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1].faceUp = true;
      G.playerScore += SCORE.FLIP_CARD;
    }
  }
}

// ─── WIN / GAME OVER CHECK ─────────────────────────────────────────────────────
function checkWinCondition() {
  if (checkWin(G.playerFound)) { endGame('player'); return; }
  if (checkWin(G.cpuFound))    { endGame('cpu');    return; }
}

function checkGameOverCondition() {
  checkWinCondition();
}

function endGame(winner) {
  if (G.gameOver) return;
  G.gameOver = true;
  stopTimer();

  const isPlayerWin = winner === 'player';
  const screen = document.getElementById('end-screen');
  screen.classList.add('active');

  document.getElementById('end-meme').textContent = isPlayerWin ? '🏆' : '💀';
  const titleEl = document.getElementById('end-title');
  titleEl.textContent = isPlayerWin ? 'YOU WIN!' : 'CPU WINS!';
  titleEl.className = 'end-title ' + (isPlayerWin ? 'win' : 'lose');

  const phrases = isPlayerWin ? MEMES.winPhrases : MEMES.losePhrases;
  document.getElementById('end-subtitle').textContent = rnd(phrases);
  document.getElementById('end-player-score').textContent = G.playerScore;
  document.getElementById('end-cpu-score').textContent    = G.cpuScore;

  // Bonus time score for player win
  if (isPlayerWin) {
    const bonus = Math.max(0, Math.floor(700000 / Math.max(1, G.elapsed)));
    G.playerScore += bonus;
    document.getElementById('end-player-score').textContent = G.playerScore;
    document.getElementById('end-subtitle').textContent += `  ⏱️ TIME BONUS: +${bonus}`;
  }
}

// ─── CPU AI ────────────────────────────────────────────────────────────────────
// The CPU plays a separate Klondike board.
// AI logic: tries foundation first, then tableau melds, then draws.
// Introduces blunders for fairness.

function cpuGetMoves() {
  const moves = [];

  // 1. Foundation moves from waste
  if (G.cpuWaste.length > 0) {
    const c = G.cpuWaste[G.cpuWaste.length - 1];
    for (let fi = 0; fi < 4; fi++) {
      if (canStackFound(c, G.cpuFound[fi])) {
        moves.push({ type: 'waste-found', foundIdx: fi, priority: 10 });
      }
    }
  }

  // 2. Foundation moves from tableau
  for (let pi = 0; pi < 7; pi++) {
    const pile = G.cpuTab[pi];
    if (pile.length === 0) continue;
    const c = pile[pile.length - 1];
    if (!c.faceUp) continue;
    for (let fi = 0; fi < 4; fi++) {
      if (canStackFound(c, G.cpuFound[fi])) {
        moves.push({ type: 'tab-found', pileIdx: pi, foundIdx: fi, priority: 9 });
      }
    }
  }

  // 3. Tableau to tableau
  for (let fromPi = 0; fromPi < 7; fromPi++) {
    const fromPile = G.cpuTab[fromPi];
    if (fromPile.length === 0) continue;

    // Find top-most face-up card index
    let firstFaceUp = fromPile.length - 1;
    while (firstFaceUp > 0 && fromPile[firstFaceUp - 1].faceUp) firstFaceUp--;

    for (let ci = firstFaceUp; ci < fromPile.length; ci++) {
      const card = fromPile[ci];
      if (!card.faceUp) continue;
      const cards = fromPile.slice(ci);

      for (let toPi = 0; toPi < 7; toPi++) {
        if (toPi === fromPi) continue;
        const toTop = G.cpuTab[toPi][G.cpuTab[toPi].length - 1] || null;
        if (canStackTab(card, toTop)) {
          // Prioritize moves that flip hidden cards
          const willFlip = ci > 0 && !fromPile[ci - 1].faceUp;
          // Don't move kings to empty piles unless it reveals something
          const emptyPileKing = (toTop === null && card.rank === 'K' && ci === 0);
          if (emptyPileKing) continue; // useless king move
          moves.push({
            type: 'tab-tab',
            fromPi, ci, toPi,
            priority: willFlip ? 7 : 4,
          });
        }
      }
    }
  }

  // 4. Waste to tableau
  if (G.cpuWaste.length > 0) {
    const c = G.cpuWaste[G.cpuWaste.length - 1];
    for (let toPi = 0; toPi < 7; toPi++) {
      const toTop = G.cpuTab[toPi][G.cpuTab[toPi].length - 1] || null;
      if (canStackTab(c, toTop)) {
        moves.push({ type: 'waste-tab', toPi, priority: 3 });
      }
    }
  }

  // 5. Draw from stock
  if (G.cpuStock.length > 0 || G.cpuWaste.length > 0) {
    moves.push({ type: 'draw', priority: 1 });
  }

  return moves;
}

function cpuPickMove(moves) {
  if (moves.length === 0) return null;

  // Sort by priority desc
  moves.sort((a, b) => b.priority - a.priority);

  // Blunder: skip the best move sometimes
  if (Math.random() < CPU.BLUNDER_CHANCE && moves.length > 1) {
    moves.shift(); // drop best move
  }

  // Sometimes skip foundation to make game last longer
  if (moves[0] && (moves[0].type === 'waste-found' || moves[0].type === 'tab-found')) {
    if (Math.random() < CPU.SKIP_FOUNDATION_CHANCE && moves.length > 1) {
      moves.shift();
    }
  }

  return moves[0] || null;
}

function cpuApplyMove(move) {
  if (!move) return false;

  switch (move.type) {
    case 'waste-found': {
      const c = G.cpuWaste.pop();
      G.cpuFound[move.foundIdx].push(c);
      G.cpuScore += SCORE.FOUNDATION;
      setStatus(`💻 ${G.cpuName}: ${c.rank}${c.suit} → FOUNDATION! +${SCORE.FOUNDATION}`);
      scorePopup(`CPU +${SCORE.FOUNDATION}`, window.innerWidth * 0.25, 150, '#ff4444');
      return true;
    }
    case 'tab-found': {
      const pile = G.cpuTab[move.pileIdx];
      const c = pile.pop();
      G.cpuFound[move.foundIdx].push(c);
      G.cpuScore += SCORE.FOUNDATION;
      // Flip new top
      if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
        pile[pile.length - 1].faceUp = true;
        G.cpuScore += SCORE.FLIP_CARD;
      }
      setStatus(`💻 ${G.cpuName}: ${c.rank}${c.suit} → FOUNDATION!`);
      scorePopup(`CPU +${SCORE.FOUNDATION}`, window.innerWidth * 0.25, 150, '#ff4444');
      return true;
    }
    case 'tab-tab': {
      const fromPile = G.cpuTab[move.fromPi];
      const cards = fromPile.splice(move.ci);
      G.cpuTab[move.toPi].push(...cards);
      // Flip new top of source
      if (fromPile.length > 0 && !fromPile[fromPile.length - 1].faceUp) {
        fromPile[fromPile.length - 1].faceUp = true;
        G.cpuScore += SCORE.FLIP_CARD;
      }
      setStatus(`💻 ${G.cpuName}: MOVING CARDS... ${rnd(['📦','🃏','💡'])}`);
      return true;
    }
    case 'waste-tab': {
      const c = G.cpuWaste.pop();
      G.cpuTab[move.toPi].push(c);
      G.cpuScore += SCORE.WASTE_TO_TAB;
      setStatus(`💻 ${G.cpuName}: PLAYED FROM WASTE!`);
      return true;
    }
    case 'draw': {
      if (G.cpuStock.length === 0) {
        if (G.cpuWaste.length === 0) return false;
        G.cpuStock = G.cpuWaste.reverse().map(c => ({ ...c, faceUp: false }));
        G.cpuWaste = [];
        G.cpuStockPasses++;
        setStatus(`💻 ${G.cpuName}: CYCLING STOCK...`);
      } else {
        const c = G.cpuStock.pop();
        c.faceUp = true;
        G.cpuWaste.push(c);
        setStatus(`💻 ${G.cpuName}: DRAWING CARD...`);
      }
      return true;
    }
  }
  return false;
}

let cpuMoveCount = 0;
let cpuDrawsThisTurn = 0;
let cpuStuckCount = 0;

function runCpuTurn() {
  if (G.gameOver) return;
  G.cpuActive = true;
  G.turn = 'cpu';

  const numMoves = CPU.TURN_MIN_MOVES + Math.floor(Math.random() * (CPU.TURN_MAX_MOVES - CPU.TURN_MIN_MOVES + 1));
  cpuMoveCount = 0;
  cpuDrawsThisTurn = 0;
  cpuStuckCount = 0;

  document.getElementById('cpu-thinking').classList.add('active');
  setStatus(rnd(MEMES.statusPhrases.cpuStatusPhrases));

  function doNextMove() {
    if (G.gameOver) {
      finishCpuTurn();
      return;
    }
    if (cpuMoveCount >= numMoves) {
      finishCpuTurn();
      return;
    }

    const moves = cpuGetMoves();
    const move  = cpuPickMove(moves);

    if (!move) {
      cpuStuckCount++;
      if (cpuStuckCount > 3) {
        finishCpuTurn();
        return;
      }
    } else {
      const wasDraw = move.type === 'draw';
      if (wasDraw) cpuDrawsThisTurn++;
      if (cpuDrawsThisTurn > CPU.MAX_DRAWS) {
        finishCpuTurn();
        return;
      }
      cpuApplyMove(move);
      if (!wasDraw) cpuMoveCount++;
    }

    renderAll();
    checkWinCondition();
    if (G.gameOver) { finishCpuTurn(); return; }

    const delay = CPU.MOVE_DELAY_MIN + Math.random() * (CPU.MOVE_DELAY_MAX - CPU.MOVE_DELAY_MIN);
    setTimeout(doNextMove, delay);
  }

  const firstDelay = 600 + Math.random() * 600;
  setTimeout(doNextMove, firstDelay);
}

function finishCpuTurn() {
  document.getElementById('cpu-thinking').classList.remove('active');
  G.cpuActive = false;
  G.turn = 'player';
  G.selected = null;
  renderAll();
  if (!G.gameOver) setStatus(MEMES.statusPhrases.playerTurn);
}

// ─── END TURN BUTTON ───────────────────────────────────────────────────────────
function endPlayerTurn() {
  if (G.turn !== 'player' || G.cpuActive || G.gameOver) return;
  G.selected = null;
  setStatus(MEMES.statusPhrases.cpuTurn);
  renderAll();
  setTimeout(runCpuTurn, 500);
}

// ─── DOM SETUP ─────────────────────────────────────────────────────────────────
function buildGameDOM() {
  const gc = document.getElementById('game-container');
  gc.innerHTML = '';

  // HUD
  gc.innerHTML = `
    <div id="hud">
      <div class="hud-score-block">
        <div class="hud-label">YOUR SCORE</div>
        <div class="hud-value player-score" id="hud-player-score">0</div>
      </div>
      <div>
        <div id="hud-title">🎮 MEME SOLITAIRE 🎮</div>
        <div style="display:flex;gap:8px;justify-content:center;margin-top:4px;">
          <button class="hud-btn" onclick="endPlayerTurn()">END TURN ▶</button>
          <button class="hud-btn" onclick="confirmNewGame()">NEW GAME 🔄</button>
          <button class="hud-btn" onclick="goToMenu()">MENU 🏠</button>
        </div>
      </div>
      <div class="hud-score-block" style="text-align:right;">
        <div class="hud-label" id="hud-cpu-name">CPU</div>
        <div class="hud-value cpu-score" id="hud-cpu-score">0</div>
      </div>
      <div class="hud-score-block" style="text-align:center;">
        <div class="hud-label">TIME</div>
        <div class="hud-value timer-val" id="hud-timer">00:00</div>
      </div>
    </div>
    <div id="status-bar">🎮 WELCOME TO MEME SOLITAIRE — GLHF!</div>
    <div id="boards-wrap">
      <div class="board-side cpu-side" id="board-cpu">
        <div class="board-label">💻 CPU BOARD</div>
        ${buildSideHTML('c')}
      </div>
      <div class="board-side player-side" id="board-player">
        <div class="board-label">👤 YOUR BOARD</div>
        ${buildSideHTML('p')}
      </div>
    </div>
    <div id="cpu-thinking">
      <div>💻 ${G ? G.cpuName : 'CPU'} IS THINKING</div>
      <div class="think-dots"></div>
    </div>
  `;
}

function buildSideHTML(prefix) {
  let html = `<div class="top-row">`;

  // Stock slot
  html += `<div class="card-slot stock-slot" id="${prefix}-stock" onclick="${prefix === 'p' ? 'playerDrawStock()' : ''}"></div>`;

  // Waste slot
  html += `<div class="waste-display" id="${prefix}-waste"`;
  if (prefix === 'p') html += ` onclick="playerSelectWaste()"`;
  html += `></div>`;

  html += `<div class="foundations-row">`;
  for (let i = 0; i < 4; i++) {
    html += `<div class="card-slot foundation-slot" id="${prefix}-found-${i}"`;
    if (prefix === 'p') html += ` onclick="playerClickFoundation(${i})"`;
    html += `>${SUITS[i]}</div>`;
  }
  html += `</div></div>`;

  // Tableau row
  html += `<div class="tableau-row">`;
  for (let i = 0; i < 7; i++) {
    html += `<div class="tableau-pile" id="${prefix}-tab-${i}"`;
    if (prefix === 'p') {
      html += ` data-pile="${i}"`;
    }
    html += `></div>`;
  }
  html += `</div>`;

  return html;
}

// ─── TABLEAU CLICK DELEGATION ──────────────────────────────────────────────────
function setupTableauClicks() {
  for (let pi = 0; pi < 7; pi++) {
    const pileEl = document.getElementById(`p-tab-${pi}`);
    pileEl.addEventListener('click', (e) => {
      if (G.turn !== 'player' || G.cpuActive) return;
      const pile = G.playerTab[pi];

      // Empty pile — try to place selected king
      if (pile.length === 0) {
        if (G.selected) {
          const selCards = getSelectedCards();
          if (selCards[0] && selCards[0].rank === 'K') {
            moveSelectedToTableau(pi);
          } else {
            setStatus('👑 ONLY KINGS CAN GO IN EMPTY COLUMNS!');
          }
        }
        return;
      }

      // Figure out which card was clicked by Y position
      const rect = pileEl.getBoundingClientRect();
      const clickY = e.clientY - rect.top;
      const cardH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--card-h'));
      const offsetY = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stack-offset-y'));

      let clickedIdx = pile.length - 1;
      for (let ci = 0; ci < pile.length - 1; ci++) {
        const topOfCard = ci * offsetY;
        const bottomOfCard = (ci + 1) * offsetY; // next card starts here
        if (clickY >= topOfCard && clickY < bottomOfCard) {
          clickedIdx = ci;
          break;
        }
      }

      // If we have a selection, try to place it
      if (G.selected) {
        const selCards = getSelectedCards();
        const topOfTargetPile = pile[pile.length - 1];
        const bottomOfSel = selCards[0];

        if (canStackTab(bottomOfSel, topOfTargetPile)) {
          moveSelectedToTableau(pi);
          return;
        }
      }

      // Otherwise select the clicked card
      playerClickTableau(pi, clickedIdx);
    });
  }

  // Foundation drop zones also support drag from selection
  for (let fi = 0; fi < 4; fi++) {
    const fEl = document.getElementById(`p-found-${fi}`);
    // onclick already wired via HTML, nothing extra needed
  }
}

// ─── MENU / NAVIGATION ─────────────────────────────────────────────────────────
function startGame() {
  document.getElementById('start-menu').classList.add('hidden');
  document.getElementById('game-container').classList.add('active');
  document.getElementById('end-screen').classList.remove('active');

  initGame();
  buildGameDOM();
  setupTableauClicks();
  renderAll();
  startTimer();

  setStatus(MEMES.statusPhrases.gameStart);
}

function goToMenu() {
  stopTimer();
  G = null;
  document.getElementById('game-container').classList.remove('active');
  document.getElementById('end-screen').classList.remove('active');
  document.getElementById('start-menu').classList.remove('hidden');
}

function confirmNewGame() {
  if (confirm('START A NEW GAME? (CURRENT PROGRESS WILL BE LOST)\n\nSUCH RESTART. VERY FRESH. WOW.')) {
    startGame();
  }
}

function showHowToPlay() {
  document.getElementById('how-to-play').classList.add('active');
}

function hideHowToPlay() {
  document.getElementById('how-to-play').classList.remove('active');
}

window.startGame         = startGame;
window.goToMenu          = goToMenu;
window.confirmNewGame    = confirmNewGame;
window.showHowToPlay     = showHowToPlay;
window.hideHowToPlay     = hideHowToPlay;
window.endPlayerTurn     = endPlayerTurn;
window.playerDrawStock   = playerDrawStock;
window.playerSelectWaste = playerSelectWaste;
window.playerClickFoundation = playerClickFoundation;