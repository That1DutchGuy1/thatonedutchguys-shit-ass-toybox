document.addEventListener('DOMContentLoaded', () => {
  var milestoneAudio = document.getElementById("milestoneAudio");
  var toadAudio = document.getElementById("toadAudio");
  var egaddAudio = document.getElementById("egaddAudio");
  var mamaLuigiAudio = document.getElementById("mamaLuigiAudio");
  var nopeAudio = document.getElementById("nopeAudio");
  var cricketsAudio = document.getElementById("cricketsAudio"); // Added for AFK crickets

  const milestones = [
    { value: 100, description: "Loser," },
    { value: 500, description: "Noob," },
    { value: 1000, description: "Okay," },
    { value: 10000, description: "Nice," },
    { value: 25000, description: "That's crazy," },
    { value: 100000, description: "Bro go touch grass," },
    { value: 1000000, description: "What the hell," },
    { value: 5000000, description: "Stop already," },
    { value: 10000000, description: "You are insane," },
    { value: 100000000, description: "Cheater," },
    { value: 1000000000, description: "Turn off this game," },
  ];

  // --- Upgrade definitions ---
  const TOAD_MAX = 20;
  const EGADD_MAX = 10;

  function toadCost(level) {
    // level = current level (0-19), cost to buy next
    return Math.floor(50 * Math.pow(2.4, level));
  }
  function toadClickBonus(level) {
    // level 0 = 1 BUP/click, level 1 = 2, ..., level 20 = 100
    if (level === 0) return 1;
    if (level >= 20) return 100;
    return Math.floor(2 + (98 / 19) * (level - 1));
  }
  function egaddCost(level) {
    return Math.floor(500 * Math.pow(4, level));
  }
  function egaddRate(level) {
    // level 0 = 0/s, level 1 = 1/s, ..., level 10 = 10/s
    return level;
  }

  // --- State ---
  let counter = parseInt(localStorage.getItem('bupScore')) || 0;
  let toadLevel = parseInt(localStorage.getItem('toadLevel')) || 0;
  let egaddLevel = parseInt(localStorage.getItem('egaddLevel')) || 0;
  let idleTimeout; // Track the AFK timer

  // --- UI refs ---
  const scoreEl = document.getElementById('score');
  const milestoneEl = document.getElementById('milestone');
  const upgradeMsgEl = document.getElementById('upgrade-msg');
  const button = document.getElementById('button');
  const toadBtn = document.getElementById('upgrade-toad');
  const egaddBtn = document.getElementById('upgrade-egadd');
  const gambBtn = document.getElementById('upgrade-gamble');

  function saveAll() {
    localStorage.setItem('bupScore', counter);
    localStorage.setItem('toadLevel', toadLevel);
    localStorage.setItem('egaddLevel', egaddLevel);
  }

  function updateScoreDisplay() {
    scoreEl.innerText = counter;
  }

  function updateUpgradeButtons() {
    // Toad
    if (toadLevel >= TOAD_MAX) {
      toadBtn.innerHTML = toadButtonHTML(true);
    } else {
      toadBtn.innerHTML = toadButtonHTML(false);
    }
    // E. Gadd
    if (egaddLevel >= EGADD_MAX) {
      egaddBtn.innerHTML = egaddButtonHTML(true);
    } else {
      egaddBtn.innerHTML = egaddButtonHTML(false);
    }
    // Gamble always available
    gambBtn.innerHTML = gambleButtonHTML();
  }

  function toadButtonHTML(maxed) {
    const cost = maxed ? '—' : toadCost(toadLevel).toLocaleString();
    const lvl = toadLevel;
    const nextBonus = maxed ? 100 : toadClickBonus(lvl + 1);
    const statusLine = maxed
      ? `<span class="upg-maxed">MAXED OUT! (100 BUP/click)</span>`
      : `<span class="upg-cost">Cost: ${cost} BUP</span><span class="upg-level">Lvl ${lvl}/${TOAD_MAX}</span>`;
    return `
      <img src="Toad.png" class="upg-img" alt="Toad">
      <div class="upg-info">
        <span class="upg-name">Toad Helper</span>
        <span class="upg-desc">Hire a Toad to help!<br>${maxed ? '' : `Next: ${nextBonus} BUP/click`}</span>
        ${statusLine}
      </div>`;
  }

  function egaddButtonHTML(maxed) {
    const cost = maxed ? '—' : egaddCost(egaddLevel).toLocaleString();
    const lvl = egaddLevel;
    const nextRate = maxed ? 10 : egaddRate(lvl + 1);
    const statusLine = maxed
      ? `<span class="upg-maxed">MAXED OUT! (10 BUP/sec)</span>`
      : `<span class="upg-cost">Cost: ${cost} BUP</span><span class="upg-level">Lvl ${lvl}/${EGADD_MAX}</span>`;
    return `
      <img src="Egadd.png" class="upg-img" alt="E. Gadd">
      <div class="upg-info">
        <span class="upg-name">E. Gadd's Automation</span>
        <span class="upg-desc">E. Gadd The Science Guy!<br>${maxed ? '' : `Next: ${nextRate} BUP/sec`}</span>
        ${statusLine}
      </div>`;
  }

  function gambleButtonHTML() {
    return `
      <img src="MamaLuigi.png" class="upg-img" alt="Mama Luigi">
      <div class="upg-info">
        <span class="upg-name">Mama Luigi's Gamble</span>
        <span class="upg-desc">That's Mama Luigi to you!<br>Win BUP!</span>
        <span class="upg-cost">Cost: 100 BUP</span>
      </div>`;
  }

  function checkMilestone(val) {
    milestones.forEach(milestone => {
      if (val === milestone.value) {
        milestoneAudio.currentTime = 0;
        milestoneAudio.play();
        milestoneEl.innerText = `Milestone reached: ${milestone.description} you've clicked the button ${milestone.value.toLocaleString()} times!`;
        milestoneEl.style.display = 'block';
        if (milestone.value === 1000000000) {
          setTimeout(() => { window.location.href = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"; }, 5000);
        } else {
          setTimeout(() => { milestoneEl.style.display = 'none'; }, 7000);
        }
      }
    });
  }

  function addScore(amount) {
    const prev = counter;
    counter += amount;
    if (counter < 0) counter = 0;
    updateScoreDisplay();
    saveAll();
    // check milestones for each value crossed
    for (let m of milestones) {
      if (prev < m.value && counter >= m.value) checkMilestone(m.value);
    }
  }

  function incrementScore() {
    let soundEffect = new Audio("bup.mp3");
    soundEffect.play();
    const bonus = toadClickBonus(toadLevel);
    addScore(bonus);
  }

  // Hold-to-click
  let holdInterval;
  button.addEventListener('mousedown', () => {
    incrementScore();
    holdInterval = setInterval(incrementScore, 500);
  });
  button.addEventListener('mouseup', () => clearInterval(holdInterval));
  button.addEventListener('mouseleave', () => clearInterval(holdInterval));

  // Touch support
  button.addEventListener('touchstart', (e) => {
    e.preventDefault();
    incrementScore();
    holdInterval = setInterval(incrementScore, 500);
  });
  button.addEventListener('touchend', () => clearInterval(holdInterval));

  // --- Auto-clicker (E. Gadd) ---
  let autoInterval = null;
  function startAutoClicker() {
    if (autoInterval) clearInterval(autoInterval);
    if (egaddLevel > 0) {
      const rate = egaddRate(egaddLevel); // clicks per second
      autoInterval = setInterval(() => {
        addScore(rate);
      }, 1000);
    }
  }

  // --- Upgrade button handlers ---
  toadBtn.addEventListener('click', () => {
    if (toadLevel >= TOAD_MAX) return;
    const cost = toadCost(toadLevel);
    if (counter < cost) {
      playUpgradeAudio(nopeAudio);
      showUpgradeMsg("Not enough BUP! Toad flips you the bird!");
      return;
    }
    counter -= cost;
    toadLevel++;
    saveAll();
    updateScoreDisplay();
    updateUpgradeButtons();
    playUpgradeAudio(toadAudio);
    showUpgradeMsg(`Toad Helper upgraded to level ${toadLevel}! Now ${toadClickBonus(toadLevel)} BUP per click!`);
  });

  egaddBtn.addEventListener('click', () => {
    if (egaddLevel >= EGADD_MAX) return;
    const cost = egaddCost(egaddLevel);
    if (counter < cost) {
      playUpgradeAudio(nopeAudio);
      showUpgradeMsg("Not enough BUP! Science is expensive, idiot!");
      return;
    }
    counter -= cost;
    egaddLevel++;
    saveAll();
    updateScoreDisplay();
    updateUpgradeButtons();
    startAutoClicker();
    playUpgradeAudio(egaddAudio);
    showUpgradeMsg(`E. Gadd's Automation level ${egaddLevel}! ${egaddRate(egaddLevel)} BUP per sec!`);
  });

  gambBtn.addEventListener('click', () => {
    if (counter < 100) {
      playUpgradeAudio(nopeAudio);
      showUpgradeMsg("You can't even afford the gamble, loser!");
      return;
    }
    counter -= 100;
    // Weighted random: heavily favor low numbers, tiny chance of big win
    const roll = Math.random();
    let prize;
    if (roll < 0.60) {
      // 60%: 1-30 (mostly a rip-off)
      prize = Math.floor(Math.random() * 30) + 1;
    } else if (roll < 0.85) {
      // 25%: 31-80
      prize = Math.floor(Math.random() * 50) + 31;
    } else if (roll < 0.97) {
      // 12%: 81-100 (break even or slightly under)
      prize = Math.floor(Math.random() * 20) + 81;
    } else if (roll < 0.999) {
      // 3.9%: 101-200
      prize = Math.floor(Math.random() * 100) + 101;
    } else {
      // 0.1%: 201-500 JACKPOT
      prize = Math.floor(Math.random() * 300) + 201;
    }
    addScore(prize);
    updateScoreDisplay();
    saveAll();
    updateUpgradeButtons();
    playUpgradeAudio(mamaLuigiAudio);
    if (prize > 200) {
      showUpgradeMsg(`DAAAAAAAMN! You won ${prize} BUP!!`);
    } else if (prize >= 100) {
      showUpgradeMsg(`Aight! You got ${prize} BUP back!`);
    } else if (prize >= 50) {
      showUpgradeMsg(`Ehhhh... ${prize} BUP. That's it.`);
    } else {
      showUpgradeMsg(`Lol, you little shit. You got ${prize} BUP. That's Mama Luigi to you, Mario!`);
    }
  });

  // Upgrade message display (separate element from milestone)
  let upgMsgTimeout;
  function showUpgradeMsg(msg) {
    upgradeMsgEl.innerText = msg;
    upgradeMsgEl.style.display = 'block';
    clearTimeout(upgMsgTimeout);
    upgMsgTimeout = setTimeout(() => {
      upgradeMsgEl.style.display = 'none';
    }, 4000);
  }

  function playUpgradeAudio(audio) {
    audio.currentTime = 0;
    audio.play();
  }

  // Reset game
  document.querySelector('.reset-button').addEventListener('click', () => {
    if (!confirm("Reset EVERYTHING? All the BUP and upgrades will be gone!")) return;
    localStorage.removeItem('bupScore');
    localStorage.removeItem('toadLevel');
    localStorage.removeItem('egaddLevel');
    counter = 0;
    toadLevel = 0;
    egaddLevel = 0;
    if (autoInterval) { clearInterval(autoInterval); autoInterval = null; }
    updateScoreDisplay();
    updateUpgradeButtons();
  });

  // --- AFK Tracking Mechanism ---
  function pokePlayer() {
    if (cricketsAudio) {
      cricketsAudio.pause();
      cricketsAudio.currentTime = 0;
    }
    clearTimeout(idleTimeout);
    idleTimeout = setTimeout(() => {
      if (cricketsAudio) {
        cricketsAudio.play().catch(e => console.log("Audio play blocked by browser interaction policy:", e));
      }
    }, 30000); // 30,000ms = 30 seconds
  }

  // Intercept any click or tap interaction on the page to reset the 30-second countdown
  window.addEventListener('mousedown', pokePlayer);
  window.addEventListener('touchstart', pokePlayer, { passive: true });

  // Init
  updateScoreDisplay();
  updateUpgradeButtons();
  startAutoClicker();
  pokePlayer(); // Fire up the first AFK countdown immediately upon page load
});