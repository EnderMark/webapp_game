(() => {
  'use strict';

  const CHOICES = {
    sasso: {
      label: 'Sasso',
      beats: 'forbici',
      reason: 'Il sasso rompe le forbici',
      svg: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M18 32V23a4 4 0 0 1 8 0v6"></path>
        <path d="M26 27v-6a4 4 0 0 1 8 0v7"></path>
        <path d="M34 27v-5a4 4 0 0 1 8 0v8"></path>
        <path d="M42 29v-3a4 4 0 0 1 8 0v12c0 10-7 17-17 17H28c-9 0-14-6-14-14v-7a4 4 0 0 1 8 0v3"></path>
        <path d="M22 36c4-2 9-2 13 0"></path>
      </svg>`
    },
    carta: {
      label: 'Carta',
      beats: 'sasso',
      reason: 'La carta avvolge il sasso',
      svg: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M20 34V16a3.5 3.5 0 0 1 7 0v14"></path>
        <path d="M27 30V12a3.5 3.5 0 0 1 7 0v18"></path>
        <path d="M34 30V14a3.5 3.5 0 0 1 7 0v17"></path>
        <path d="M41 31V20a3.5 3.5 0 0 1 7 0v19c0 10-6.5 16-16 16h-3c-8 0-14-5.5-15-13l-2-10a3.5 3.5 0 0 1 6.8-1.5L20 34"></path>
      </svg>`
    },
    forbici: {
      label: 'Forbici',
      beats: 'carta',
      reason: 'Le forbici tagliano la carta',
      svg: `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M25 32L18 13a3.5 3.5 0 0 1 6.6-2.4L31 28"></path>
        <path d="M33 28L40 11a3.5 3.5 0 0 1 6.6 2.4L39 32"></path>
        <path d="M39 32a4 4 0 0 1 7.5 2v6c0 9-6 15-15.5 15h-3C19 55 14 49 14 41v-4a4 4 0 0 1 8 0v2"></path>
        <path d="M22 39a4 4 0 0 1 8 0"></path>
        <path d="M30 37a4 4 0 0 1 8 0"></path>
      </svg>`
    }
  };

  const PLACEHOLDER_SVG = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <circle cx="32" cy="32" r="20" stroke-dasharray="4 6"></circle>
    <path d="M27 26a5 5 0 1 1 7 4.6c-1.3.6-2 1.7-2 3.4v1"></path>
    <circle cx="32" cy="41" r="1.4" fill="currentColor" stroke="none"></circle>
  </svg>`;

  const CHOICE_KEYS = Object.keys(CHOICES);
  const STORAGE_KEY = 'cfs_game_state_v1';
  const BO5_TARGET = 3;
  const MAX_HISTORY = 8;

  // DOM Elements
  const el = {
    scorePlayer: document.getElementById('score-player'),
    scoreCpu: document.getElementById('score-cpu'),
    roundCounter: document.getElementById('round-counter'),
    drawsCounter: document.getElementById('draws-counter'),
    streakValue: document.getElementById('streak-value'),
    stagePlayer: document.getElementById('stage-player'),
    stageCpu: document.getElementById('stage-cpu'),
    labelPlayer: document.getElementById('label-player'),
    labelCpu: document.getElementById('label-cpu'),
    outcomeBox: document.getElementById('outcome-box'),
    outcomeTitle: document.getElementById('outcome-title'),
    outcomeDetail: document.getElementById('outcome-detail'),
    matchBanner: document.getElementById('match-banner'),
    matchBannerText: document.getElementById('match-banner-text'),
    historyDots: document.getElementById('history-dots'),
    btnSound: document.getElementById('btn-sound'),
    btnShare: document.getElementById('btn-share'),
    btnReset: document.getElementById('btn-reset'),
    btnRematch: document.getElementById('btn-rematch'),
    modeButtons: document.querySelectorAll('.mode-btn'),
    choiceButtons: document.querySelectorAll('.choice-btn'),
    toast: document.getElementById('toast')
  };

  // Game State
  let state = {
    mode: 'free',
    playerScore: 0,
    cpuScore: 0,
    draws: 0,
    rounds: 0,
    streak: 0,
    history: [],
    soundEnabled: true
  };

  let isAnimating = false;
  let matchOver = false;
  let audioCtx = null;
  let toastTimer = null;

  // =========================================================================
  // Audio (Synthesized via Web Audio API — zero external dependencies)
  // =========================================================================

  function getAudioContext() {
    if (!audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function playTone(freq, duration, type = 'sine', gainValue = 0.08, delay = 0) {
    if (!state.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function playSound(kind) {
    if (!state.soundEnabled) return;
    if (kind === 'pick') {
      playTone(320, 0.07, 'triangle', 0.06);
    } else if (kind === 'win') {
      playTone(523.25, 0.12, 'triangle', 0.08, 0);
      playTone(659.25, 0.18, 'triangle', 0.08, 0.09);
    } else if (kind === 'lose') {
      playTone(260, 0.14, 'sine', 0.08, 0);
      playTone(195, 0.2, 'sine', 0.07, 0.1);
    } else if (kind === 'draw') {
      playTone(415, 0.12, 'sine', 0.06, 0);
    }
  }

  // =========================================================================
  // Persistence
  // =========================================================================

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        state.mode = parsed.mode === 'bo5' ? 'bo5' : 'free';
        state.playerScore = Number.isInteger(parsed.playerScore) ? parsed.playerScore : 0;
        state.cpuScore = Number.isInteger(parsed.cpuScore) ? parsed.cpuScore : 0;
        state.draws = Number.isInteger(parsed.draws) ? parsed.draws : 0;
        state.rounds = Number.isInteger(parsed.rounds) ? parsed.rounds : 0;
        state.streak = Number.isInteger(parsed.streak) ? parsed.streak : 0;
        state.history = Array.isArray(parsed.history) ? parsed.history.slice(-MAX_HISTORY) : [];
        state.soundEnabled = typeof parsed.soundEnabled === 'boolean' ? parsed.soundEnabled : true;
      }
    } catch {
      // Ignore storage access errors
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota / privacy errors
    }
  }

  // =========================================================================
  // Core Game Logic
  // =========================================================================

  function pickCpuChoice() {
    const idx = Math.floor(Math.random() * CHOICE_KEYS.length);
    return CHOICE_KEYS[idx];
  }

  function evaluateRound(playerChoice, cpuChoice) {
    if (playerChoice === cpuChoice) {
      return {
        outcome: 'draw',
        title: 'Pareggio!',
        detail: `Entrambi avete scelto ${CHOICES[playerChoice].label}.`
      };
    }

    if (CHOICES[playerChoice].beats === cpuChoice) {
      return {
        outcome: 'win',
        title: 'Hai vinto!',
        detail: `${CHOICES[playerChoice].reason}.`
      };
    }

    return {
      outcome: 'lose',
      title: 'Hai perso!',
      detail: `${CHOICES[cpuChoice].reason}.`
    };
  }

  function bumpElement(node) {
    node.classList.remove('bump');
    void node.offsetWidth;
    node.classList.add('bump');
    setTimeout(() => node.classList.remove('bump'), 260);
  }

  function setChoicesDisabled(disabled) {
    el.choiceButtons.forEach((btn) => {
      btn.disabled = disabled;
    });
  }

  function clearSelectedChoice() {
    el.choiceButtons.forEach((btn) => btn.classList.remove('is-selected'));
  }

  function renderScores() {
    el.scorePlayer.textContent = String(state.playerScore);
    el.scoreCpu.textContent = String(state.cpuScore);
    el.roundCounter.textContent =
      state.mode === 'bo5'
        ? `Round ${state.rounds} · Primo a ${BO5_TARGET}`
        : `Round ${state.rounds}`;
    el.drawsCounter.textContent = `Pareggi: ${state.draws}`;
    el.streakValue.textContent = String(state.streak);
  }

  function renderHistory() {
    el.historyDots.innerHTML = '';
    if (state.history.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'history-label';
      empty.textContent = 'Nessuno';
      el.historyDots.appendChild(empty);
      return;
    }

    const labels = { win: 'V', lose: 'S', draw: 'P' };
    const titles = { win: 'Vittoria', lose: 'Sconfitta', draw: 'Pareggio' };

    state.history.forEach((entry) => {
      const li = document.createElement('li');
      li.className = `history-dot history-dot--${entry}`;
      li.textContent = labels[entry] || '·';
      li.title = titles[entry] || '';
      li.setAttribute('aria-label', titles[entry] || '');
      el.historyDots.appendChild(li);
    });
  }

  function resetArenaToIdle() {
    el.stagePlayer.className = 'fighter-stage is-placeholder';
    el.stageCpu.className = 'fighter-stage is-placeholder';
    el.stagePlayer.innerHTML = PLACEHOLDER_SVG;
    el.stageCpu.innerHTML = PLACEHOLDER_SVG;
    el.labelPlayer.textContent = '—';
    el.labelCpu.textContent = '—';
    el.outcomeBox.dataset.state = 'idle';
    el.outcomeTitle.textContent = 'Pronto a giocare?';
    el.outcomeDetail.textContent =
      state.mode === 'bo5'
        ? `Modalità al meglio di 5: il primo a ${BO5_TARGET} punti vince.`
        : 'Scegli Sasso, Carta o Forbici qui sotto.';
    clearSelectedChoice();
  }

  function checkMatchEnd() {
    if (state.mode !== 'bo5') {
      matchOver = false;
      el.matchBanner.hidden = true;
      setChoicesDisabled(false);
      return;
    }

    if (state.playerScore >= BO5_TARGET || state.cpuScore >= BO5_TARGET) {
      matchOver = true;
      const playerWon = state.playerScore >= BO5_TARGET;
      el.matchBannerText.textContent = playerWon
        ? `Partita vinta ${state.playerScore}–${state.cpuScore}! Ottima giocata.`
        : `La CPU vince la partita ${state.cpuScore}–${state.playerScore}. Vuoi la rivincita?`;
      el.matchBanner.hidden = false;
      setChoicesDisabled(true);
    } else {
      matchOver = false;
      el.matchBanner.hidden = true;
      setChoicesDisabled(false);
    }
  }

  function playRound(playerChoice) {
    if (isAnimating || matchOver || !CHOICES[playerChoice]) return;

    isAnimating = true;
    playSound('pick');
    setChoicesDisabled(true);
    clearSelectedChoice();

    const activeBtn = document.getElementById(`choice-${playerChoice}`);
    if (activeBtn) activeBtn.classList.add('is-selected');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const delayMs = prefersReducedMotion ? 0 : 340;

    if (!prefersReducedMotion) {
      el.stagePlayer.className = 'fighter-stage is-shaking';
      el.stageCpu.className = 'fighter-stage is-shaking';
      el.stagePlayer.innerHTML = CHOICES.sasso.svg;
      el.stageCpu.innerHTML = CHOICES.sasso.svg;
      el.labelPlayer.textContent = '...';
      el.labelCpu.textContent = '...';
      el.outcomeBox.dataset.state = 'idle';
      el.outcomeTitle.textContent = 'Morra...';
      el.outcomeDetail.textContent = 'Sasso, carta, forbici!';
    }

    setTimeout(() => {
      const cpuChoice = pickCpuChoice();
      const result = evaluateRound(playerChoice, cpuChoice);

      state.rounds += 1;
      if (result.outcome === 'win') {
        state.playerScore += 1;
        state.streak += 1;
        bumpElement(el.scorePlayer);
      } else if (result.outcome === 'lose') {
        state.cpuScore += 1;
        state.streak = 0;
        bumpElement(el.scoreCpu);
      } else {
        state.draws += 1;
      }

      state.history.push(result.outcome);
      if (state.history.length > MAX_HISTORY) {
        state.history.shift();
      }

      // Render reveal
      el.stagePlayer.innerHTML = CHOICES[playerChoice].svg;
      el.stageCpu.innerHTML = CHOICES[cpuChoice].svg;
      el.labelPlayer.textContent = CHOICES[playerChoice].label;
      el.labelCpu.textContent = CHOICES[cpuChoice].label;

      const playerClass =
        result.outcome === 'win'
          ? 'is-winner'
          : result.outcome === 'lose'
            ? 'is-loser'
            : 'is-draw';
      const cpuClass =
        result.outcome === 'lose'
          ? 'is-winner'
          : result.outcome === 'win'
            ? 'is-loser'
            : 'is-draw';

      el.stagePlayer.className = `fighter-stage is-revealed ${playerClass}`;
      el.stageCpu.className = `fighter-stage is-revealed ${cpuClass}`;

      el.outcomeBox.dataset.state = result.outcome;
      el.outcomeTitle.textContent = result.title;
      el.outcomeDetail.textContent = result.detail;

      playSound(result.outcome);
      renderScores();
      renderHistory();
      saveState();

      isAnimating = false;
      checkMatchEnd();
    }, delayMs);
  }

  function resetGame() {
    state.playerScore = 0;
    state.cpuScore = 0;
    state.draws = 0;
    state.rounds = 0;
    state.streak = 0;
    state.history = [];
    matchOver = false;
    el.matchBanner.hidden = true;
    setChoicesDisabled(false);
    renderScores();
    renderHistory();
    resetArenaToIdle();
    saveState();
  }

  function setMode(newMode) {
    if (newMode !== 'free' && newMode !== 'bo5') return;
    if (state.mode === newMode) return;
    state.mode = newMode;
    el.modeButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === newMode));
    });
    resetGame();
  }

  function showToast(message) {
    el.toast.textContent = message;
    el.toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.toast.classList.remove('is-visible');
    }, 2400);
  }

  async function handleShare() {
    const shareData = {
      title: 'Carta, Forbici, Sasso',
      text: 'Sfida la CPU a Carta, Forbici, Sasso!',
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (err) {
        if (err && err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(window.location.href);
        showToast('Link copiato negli appunti!');
        return;
      } catch {
        // Fallback below
      }
    }

    showToast('Copia il link dalla barra degli indirizzi.');
  }

  // =========================================================================
  // Event Bindings & Init
  // =========================================================================

  el.choiceButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      playRound(btn.dataset.choice);
    });
  });

  el.modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setMode(btn.dataset.mode);
    });
  });

  el.btnReset.addEventListener('click', resetGame);
  el.btnRematch.addEventListener('click', resetGame);

  el.btnSound.addEventListener('click', () => {
    state.soundEnabled = !state.soundEnabled;
    el.btnSound.setAttribute('aria-pressed', String(state.soundEnabled));
    saveState();
    if (state.soundEnabled) {
      playSound('pick');
    }
  });

  el.btnShare.addEventListener('click', handleShare);

  document.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = event.target && event.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    const key = event.key.toLowerCase();
    if (key === '1' || key === 's') {
      playRound('sasso');
    } else if (key === '2' || key === 'c') {
      playRound('carta');
    } else if (key === '3' || key === 'f') {
      playRound('forbici');
    } else if (key === 'r') {
      resetGame();
    }
  });

  function init() {
    loadState();
    el.btnSound.setAttribute('aria-pressed', String(state.soundEnabled));
    el.modeButtons.forEach((btn) => {
      btn.setAttribute('aria-pressed', String(btn.dataset.mode === state.mode));
    });
    renderScores();
    renderHistory();
    resetArenaToIdle();
    checkMatchEnd();
  }

  init();
})();
