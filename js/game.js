/* Number Knights – main game: profiles, quests, shop, heroes, adventure, battles. */
(function () {
  'use strict';
  const D = window.GameData, M = window.MathGen, BE = window.BattleEngine;
  const esc = M.esc, fmt = M.fmt;
  const $ = (s, el) => (el || document).querySelector(s);
  const app = $('#app');
  const SAVE_KEY = 'numberKnights.v1';

  /* ================= Storage ================= */
  let store = loadStore();
  let P = null; // the current player profile

  function loadStore() {
    try {
      const s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && Array.isArray(s.profiles)) return s;
    } catch (e) { /* ignore */ }
    return { profiles: [] };
  }
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(store)); } catch (e) { /* storage full or private mode */ }
  }

  function blankHeroes() {
    const heroes = {};
    for (const id of D.HERO_ORDER) heroes[id] = { id, level: 1, xp: 0, gear: { weapon: 0, armor: 0, charm: 0 } };
    return heroes;
  }
  function blankStats() {
    return { solved: 0, perfect: 0, streak: 0, bestStreak: 0, challengeSolved: 0, goldEarned: 0, wins: 0, losses: 0, stepsFirst: 0, stepsTotal: 0, byGrade: {} };
  }
  function createProfile(name, avatar, grade) {
    return {
      id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4),
      name, avatar, grade, challenge: false, sound: true, pin: '', speed: 1,
      gold: 0, heroes: blankHeroes(), unlocked: ['knight', 'archer'], party: ['knight', 'archer'], partySlots: 3,
      cleared: {}, bossesBeaten: 0, pets: [], pet: null, bestiary: {}, trophies: [], towerBest: 0,
      stats: blankStats(), seenIntro: false, created: Date.now(),
    };
  }
  function migrate(p) {
    const fresh = createProfile(p.name, p.avatar, p.grade);
    for (const k of Object.keys(fresh)) if (p[k] === undefined) p[k] = fresh[k];
    for (const k of Object.keys(fresh.stats)) if (p.stats[k] === undefined) p.stats[k] = fresh.stats[k];
    for (const id of D.HERO_ORDER) if (!p.heroes[id]) p.heroes[id] = fresh.heroes[id];
    return p;
  }

  /* ================= Progress helpers ================= */
  const maxTier = () => Math.min(D.MAX_TIER, 1 + P.bossesBeaten);
  const rewardMult = () => D.priceMult(maxTier());
  const isCleared = (a, s) => !!P.cleared[a + '-' + s];
  const isUnlocked = (a, s) => (a === 0 && s === 0) || (s > 0 ? isCleared(a, s - 1) : isCleared(a - 1, D.STAGES_PER_AREA - 1));
  const towerUnlocked = () => P.bossesBeaten >= 7;
  function currentArea() {
    for (let a = D.AREAS.length - 1; a >= 0; a--) if (isUnlocked(a, 0)) return a;
    return 0;
  }
  function stageLabel(a, s) {
    return s === D.STAGES_PER_AREA - 1 ? 'Boss: ' + D.AREAS[a].boss.name : 'Battle ' + (s + 1);
  }
  function tierUnlockText(tier) {
    const a = tier - 2; // tier t unlocks after beating boss of area t-2 (0-indexed)
    return a >= 0 && a < D.AREAS.length ? 'Beat ' + D.AREAS[a].boss.name + ' ' + D.AREAS[a].boss.emoji : '';
  }
  function heroUnlockText(id) {
    const i = D.BOSS_UNLOCKS.findIndex((u) => u.hero === id);
    return i >= 0 ? 'Beat ' + D.AREAS[i].boss.name + ' ' + D.AREAS[i].boss.emoji : '';
  }

  /* ================= Sound ================= */
  const SOUNDS = {
    tap: [[700, 0.03, 'square', 0.03]],
    correct: [[660, 0.09], [880, 0.14]],
    wrong: [[240, 0.12, 'sawtooth', 0.06], [190, 0.18, 'sawtooth', 0.06]],
    coin: [[988, 0.07], [1319, 0.22]],
    hit: [[160, 0.05, 'square', 0.05]],
    crit: [[420, 0.04, 'square', 0.07], [140, 0.1, 'square', 0.07]],
    heal: [[523, 0.07, 'sine'], [784, 0.12, 'sine']],
    win: [[523, 0.11], [659, 0.11], [784, 0.11], [1047, 0.32]],
    lose: [[392, 0.18], [330, 0.18], [262, 0.4]],
    buy: [[784, 0.06], [1047, 0.06], [1319, 0.16]],
    unlock: [[523, 0.08], [784, 0.08], [1047, 0.08], [1568, 0.3]],
  };
  const Sfx = {
    ctx: null, lastHit: 0,
    play(name) {
      if (!P || !P.sound) return;
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const c = this.ctx;
        if (c.state === 'suspended') c.resume();
        if (name === 'hit' || name === 'crit') {
          if (c.currentTime - this.lastHit < 0.09) return;
          this.lastHit = c.currentTime;
        }
        let t = c.currentTime;
        for (const [f, d, type, vol] of SOUNDS[name]) {
          const o = c.createOscillator(), g = c.createGain();
          o.type = type || 'triangle'; o.frequency.value = f;
          g.gain.setValueAtTime(vol || 0.12, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + d);
          o.connect(g); g.connect(c.destination);
          o.start(t); o.stop(t + d + 0.02);
          t += d * 0.9;
        }
      } catch (e) { /* audio not available */ }
    },
  };

  /* ================= Toasts ================= */
  function toast(html, cls) {
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = 'toast ' + (cls || '');
    el.innerHTML = html;
    box.appendChild(el);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => el.classList.add('out'), 2600);
    setTimeout(() => el.remove(), 3100);
  }

  /* ================= Unlock checks ================= */
  function checkUnlocks() {
    const news = [];
    for (const pet of D.PETS) {
      if (!P.pets.includes(pet.id) && pet.check(P)) {
        P.pets.push(pet.id);
        if (!P.pet) P.pet = pet.id;
        news.push({ icon: pet.emoji, title: 'New Pet: ' + pet.name + '!', text: pet.bonus });
      }
    }
    for (const t of D.TROPHIES) {
      if (!P.trophies.includes(t.id) && t.check(P)) {
        P.trophies.push(t.id);
        news.push({ icon: t.emoji, title: 'Trophy: ' + t.name, text: t.desc });
      }
    }
    if (news.length) save();
    return news;
  }
  function toastNews(news) {
    news.forEach((n, i) => setTimeout(() => {
      Sfx.play('unlock');
      toast(`<span class="t-icon">${n.icon}</span><div><b>${esc(n.title)}</b><br><small>${esc(n.text)}</small></div>`, 'gold');
    }, i * 700));
  }

  /* ================= UI state ================= */
  const ui = { screen: 'profiles', tab: 'quest', shopHero: 'knight', quest: null, modal: null, battle: null, newProfile: null, trophyTab: 'trophies' };

  function render() {
    if (ui.screen === 'battle') return; // battle draws itself
    let html = '';
    if (ui.screen === 'profiles') html = viewProfiles();
    else if (ui.screen === 'newProfile') html = viewNewProfile();
    else html = viewHub();
    if (ui.modal) html += `<div class="modal-back" data-act="modalBack"><div class="modal" role="dialog">${ui.modal}</div></div>`;
    app.innerHTML = html;
    if (ui.screen === 'hub' && ui.tab === 'quest') afterQuestRender();
  }
  function openModal(html) { ui.modal = html; render(); }
  function closeModal() { ui.modal = null; render(); }

  /* ================= Profiles ================= */
  function viewProfiles() {
    const cards = store.profiles.map((p) => {
      const a = p.bossesBeaten >= 7 ? '👑 Kingdom saved!' : D.AREAS[Math.min(6, p.bossesBeaten)].emoji + ' ' + D.AREAS[Math.min(6, p.bossesBeaten)].name;
      return `<button class="profile-card" data-act="login" data-arg="${p.id}">
        <div class="avatar">${p.avatar}</div>
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-sub">Grade ${p.grade} · 🪙 ${fmt(p.gold)}</div>
        <div class="pc-sub">${a}</div>
      </button>`;
    }).join('');
    return `<div class="title-screen">
      <div class="logo">
        <div class="logo-emoji">🤺🧙🧝</div>
        <h1>Number Knights</h1>
        <div class="tagline">Solve math quests · Gear up your heroes · Battle monsters!</div>
      </div>
      <h2 class="who">Who's playing?</h2>
      <div class="profile-grid">
        ${cards}
        <button class="profile-card new" data-act="newProfile"><div class="avatar">➕</div><div class="pc-name">New Player</div></button>
      </div>
    </div>`;
  }

  function viewNewProfile() {
    const np = ui.newProfile;
    return `<div class="title-screen">
      <div class="card np-card">
        <h2>Create your player</h2>
        <label class="lbl">Your name</label>
        <input id="np-name" class="text-in" maxlength="14" placeholder="Type your name" value="${esc(np.name)}" autocomplete="off">
        <label class="lbl">Pick your look</label>
        <div class="avatar-grid">${D.AVATARS.map((a) => `<button class="av ${np.avatar === a ? 'sel' : ''}" data-act="npAvatar" data-arg="${a}">${a}</button>`).join('')}</div>
        <label class="lbl">What grade are you in?</label>
        <div class="grade-row">${[3, 4, 5, 6].map((g) => `<button class="grade-btn ${np.grade === g ? 'sel' : ''}" data-act="npGrade" data-arg="${g}">${g}<small>${['rd', 'th', 'th', 'th'][g - 3]}</small></button>`).join('')}</div>
        <div class="np-actions">
          <button class="btn ghost" data-act="toProfiles">Back</button>
          <button class="btn big primary" data-act="npCreate">Start Adventure! ⚔️</button>
        </div>
      </div>
    </div>`;
  }

  function login(id) {
    const p = store.profiles.find((x) => x.id === id);
    if (!p) return;
    P = migrate(p);
    ui.screen = 'hub';
    ui.quest = null;
    ui.tab = 'quest';
    ui.shopHero = P.party[0] || 'knight';
    if (!P.seenIntro) {
      P.seenIntro = true; save();
      ui.modal = introModal();
    }
    render();
  }

  function introModal() {
    return `<div class="intro">
      <div class="big-emoji">🧛</div>
      <h2>Oh no, ${esc(P.name)}!</h2>
      <p><b>Count Zero</b> has stolen all the numbers in the kingdom and hidden in his Cloud Castle! 🏰</p>
      <p>Help the townsfolk by solving their <b>📜 Math Quests</b>. Each quest pays <b>🪙 gold</b>.</p>
      <p>Spend your gold in the <b>🛒 Shop</b> to buy gear for your heroes, then send them on an <b>🗺️ Adventure</b> to battle monsters!</p>
      <p>Beat the big <b>boss</b> 👑 in each land to unlock new lands, new heroes and better gear.</p>
      <button class="btn big primary" data-act="closeModal">Let's go! 🚀</button>
    </div>`;
  }

  function helpModal() {
    return `<div class="intro">
      <h2>How to play</h2>
      <div class="help-list">
        <div><span>📜</span><p><b>Quests:</b> Solve the math story one step at a time. Use the number pad, then tap <b>Check</b>. Right on the first try = full gold! Get many in a row for a 🔥 streak bonus.</p></div>
        <div><span>🧠</span><p><b>Challenge Mode</b> (in ⚙️ Settings): Only type the final answer for <b>+50% gold</b>.</p></div>
        <div><span>🛒</span><p><b>Shop:</b> Buy weapons, armor and charms for each hero. Better gear appears after you beat bosses.</p></div>
        <div><span>🗺️</span><p><b>Adventure:</b> Tap a battle and watch your heroes fight! Heroes earn XP and level up.</p></div>
        <div><span>🦸</span><p><b>Heroes:</b> Choose your team and your pet. Each hero has a special skill.</p></div>
        <div><span>🏆</span><p><b>Trophies:</b> Earn trophies, collect pets and discover monsters.</p></div>
      </div>
      <button class="btn big primary" data-act="closeModal">Got it!</button>
    </div>`;
  }

  /* ================= Hub ================= */
  const TABS = [
    ['quest', '📜', 'Quests'], ['adventure', '🗺️', 'Adventure'], ['shop', '🛒', 'Shop'],
    ['heroes', '🦸', 'Heroes'], ['trophies', '🏆', 'Trophies'], ['settings', '⚙️', 'Settings'],
  ];
  function viewHub() {
    let body = '';
    switch (ui.tab) {
      case 'quest': body = viewQuest(); break;
      case 'adventure': body = viewAdventure(); break;
      case 'shop': body = viewShop(); break;
      case 'heroes': body = viewHeroes(); break;
      case 'trophies': body = viewTrophies(); break;
      case 'settings': body = viewSettings(); break;
    }
    const streak = P.stats.streak;
    return `<div class="hub">
      <header class="topbar">
        <button class="tb-player" data-act="tab" data-arg="settings"><span class="avatar sm">${P.avatar}</span><span class="tb-name">${esc(P.name)}</span></button>
        <div class="tb-right">
          ${streak > 0 ? `<div class="chip streak" title="Streak">🔥 ${streak}</div>` : ''}
          <div class="chip gold" id="goldChip">🪙 <span id="goldVal">${fmt(P.gold)}</span></div>
          <button class="chip help" data-act="help" aria-label="Help">❓</button>
        </div>
      </header>
      <main class="content tab-${ui.tab}">${body}</main>
      <nav class="tabbar">
        ${TABS.map(([id, ic, label]) => `<button class="tabbtn ${ui.tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}"><span class="ti">${ic}</span><span class="tl">${label}</span></button>`).join('')}
      </nav>
    </div>`;
  }
  function updateGold() {
    const g = $('#goldVal');
    if (g) g.textContent = fmt(P.gold);
    const chip = $('#goldChip');
    if (chip) { chip.classList.remove('pulse'); void chip.offsetWidth; chip.classList.add('pulse'); }
  }

  /* ================= Quests ================= */
  function newQuest() {
    const p = M.generate(P.grade, P.name);
    ui.quest = {
      p, mode: P.challenge ? 'challenge' : 'guided', step: 0, input: '', tries: 0, hint: false,
      credits: [], perfect: true, chTries: 0, reveal: null, done: false, reward: 0, fb: '', fbCls: '', usedHint: false,
    };
  }
  function questBase(q) {
    return (25 + 5 * q.p.steps.length) * rewardMult();
  }
  function roundGold(g) { return g >= 100 ? Math.round(g / 5) * 5 : Math.max(1, Math.round(g)); }
  function questPreview(q) {
    const mult = (q.mode === 'challenge' ? 1.5 : 1) * D.petMods(P.pet).gold * (1 + 0.1 * Math.min(5, P.stats.streak + 1));
    return roundGold(questBase(q) * mult);
  }

  function viewQuest() {
    if (!ui.quest) newQuest();
    const q = ui.quest, p = q.p;
    const steps = p.steps;
    let stepsHtml = '';
    if (q.mode === 'challenge' && !q.done) {
      stepsHtml = `<div class="challenge-box"><div>🧠 <b>Challenge Mode!</b> Work it out on paper or in your head, then type the <b>final answer</b> for +50% gold.</div>
        <button class="btn small" data-act="toGuided">👣 Break it into steps</button></div>`;
    } else {
      stepsHtml = steps.map((st, i) => {
        if (i < q.step || q.done) {
          const c = q.credits[i];
          const mark = c === 1 ? '✅' : c > 0 ? '☑️' : '👀';
          return `<div class="step done"><span class="sn">${mark}</span><div class="sq">${st.q}</div><div class="sa">${ansFmt(st, st.a)}</div></div>`;
        }
        if (i === q.step) {
          return `<div class="step cur"><span class="sn">${i + 1}</span><div class="sq"><small>Step ${i + 1} of ${steps.length}</small><br>${st.q}
            ${q.hint || q.reveal != null ? `<div class="hint">💡 ${st.hint}</div>` : ''}</div></div>`;
        }
        return `<div class="step later"><span class="sn">${i + 1}</span><div class="sq">Step ${i + 1} 🔒</div></div>`;
      }).join('');
    }
    const cur = q.mode === 'challenge' ? p.final : steps[Math.min(q.step, steps.length - 1)];
    let right;
    if (q.done) {
      right = questDonePanel(q);
    } else if (q.reveal != null) {
      right = `<div class="reveal card">
        <div class="big-emoji">🤔</div>
        <p>That one was tricky! The answer is</p>
        <div class="reveal-ans">${ansFmt(cur, q.reveal)}</div>
        <p class="hint">💡 ${cur.hint.replace('?', ansFmt(cur, q.reveal))}</p>
        <button class="btn big primary" data-act="revealOk">Got it! Next step ➜</button>
      </div>`;
    } else {
      right = `<div class="answer-area">
        <div class="answer-row">
          ${cur.money ? '<span class="prefix">$</span>' : ''}
          <div class="answer-box ${q.input ? '' : 'empty'}" id="ansBox">${q.input || '?'}</div>
          ${cur.unit ? `<span class="unit">${cur.unit}</span>` : ''}
        </div>
        <div class="feedback ${q.fbCls}" id="fb">${q.fb}</div>
        <div class="keypad">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => `<button class="key ${k === '⌫' ? 'del' : ''}" data-act="key" data-arg="${k}">${k}</button>`).join('')}
        </div>
        <button class="btn big check" data-act="check">Check ✓</button>
        ${q.mode === 'guided' && !q.hint ? `<button class="btn small ghost hint-btn" data-act="hint">💡 Hint <small>(half gold for this step)</small></button>` : ''}
      </div>`;
    }
    return `<div class="quest-wrap">
      <section class="card quest-card">
        <div class="quest-head">
          <span class="giver">${p.giver[1]}</span>
          <div class="qh-text"><div class="quest-from">Quest from ${p.giver[0]}</div><div class="quest-title">${p.icon} ${p.title}</div></div>
          ${q.done ? '' : `<div class="reward-chip">🪙 ${fmt(questPreview(q))}</div>`}
        </div>
        <div class="problem-text">${p.text}</div>
        <div class="steps">${stepsHtml}</div>
      </section>
      <section class="quest-side">${right}</section>
    </div>`;
  }
  function ansFmt(st, v) {
    if (st.money) return M.money(v);
    return fmt(v) + (st.unit ? ' <small>' + st.unit + '</small>' : '');
  }

  function questDonePanel(q) {
    const best = q.perfect && P.stats.streak > 1 ? `<div class="streak-msg">🔥 ${P.stats.streak} in a row!</div>` : '';
    return `<div class="done-panel card">
      <div class="big-emoji bounce">${q.perfect ? '🌟' : '🎉'}</div>
      <h2>${q.perfect ? 'Perfect!' : 'Quest complete!'}</h2>
      <div class="gold-won">+${fmt(q.reward)} 🪙</div>
      ${best}
      <div class="breakdown">${q.breakdown.map((b) => `<div>${b}</div>`).join('')}</div>
      <button class="btn big primary" data-act="nextQuest">Next Quest ➜</button>
      <div class="row-btns">
        <button class="btn" data-act="tab" data-arg="shop">🛒 Shop</button>
        <button class="btn" data-act="tab" data-arg="adventure">⚔️ Battle</button>
      </div>
    </div>`;
  }

  function afterQuestRender() {
    const q = ui.quest;
    if (q && q.fbCls === 'bad') {
      const box = $('#ansBox');
      if (box) box.parentElement.classList.add('shake');
    }
  }

  function updateAnswerBox() {
    const box = $('#ansBox');
    if (!box) return;
    box.textContent = ui.quest.input || '?';
    box.classList.toggle('empty', !ui.quest.input);
    const fb = $('#fb');
    if (fb && ui.quest.fbCls === 'bad') { fb.textContent = ''; fb.className = 'feedback'; ui.quest.fb = ''; ui.quest.fbCls = ''; }
  }

  function pressKey(k) {
    const q = ui.quest;
    if (!q || q.done || q.reveal != null) return;
    Sfx.play('tap');
    if (k === '⌫' || k === 'Backspace') q.input = q.input.slice(0, -1);
    else if (k === '.') { if (!q.input.includes('.') && q.input.length < 8) q.input += q.input ? '.' : '0.'; }
    else if (/^[0-9]$/.test(k)) {
      const dec = q.input.split('.')[1];
      if (q.input.length >= 9 || (dec && dec.length >= 2)) return;
      q.input = q.input === '0' ? k : q.input + k;
    }
    updateAnswerBox();
  }

  function setFb(text, cls) { ui.quest.fb = text; ui.quest.fbCls = cls; }

  function questCheck() {
    const q = ui.quest;
    if (!q || q.done || q.reveal != null) return;
    if (q.input === '') { setFb('Type an answer first!', 'info'); render(); return; }
    if (q.mode === 'challenge') {
      if (M.check(q.input, q.p.answer)) {
        q.chFactor = q.chTries === 0 ? 1.5 : 1.0;
        q.credits = q.p.steps.map(() => 1);
        P.stats.challengeSolved++;
        finishQuest();
      } else {
        q.chTries++; q.perfect = false; q.input = '';
        Sfx.play('wrong');
        if (q.chTries >= 2) {
          q.mode = 'guided'; q.step = 0; q.tries = 0;
          setFb("Let's break it into steps together! 👣", 'info');
        } else setFb('Not quite — check your work and try once more!', 'bad');
      }
      render();
      return;
    }
    const st = q.p.steps[q.step];
    if (M.check(q.input, st.a)) {
      const first = q.tries === 0;
      if (first && !q.hint) P.stats.stepsFirst++;
      q.credits[q.step] = first ? (q.hint ? 0.5 : 1) : (q.hint ? 0.25 : 0.5);
      if (!first || q.hint) q.perfect = false;
      advanceStep();
    } else {
      q.tries++; q.perfect = false; q.input = '';
      Sfx.play('wrong');
      if (q.tries >= 3) { q.reveal = st.a; q.credits[q.step] = 0; setFb('', ''); }
      else if (q.tries === 2) { q.hint = true; setFb("Not quite. Here's a hint! 💡", 'bad'); }
      else setFb(pick(['Not quite — try again!', 'Almost! Check your math.', 'Oops! Give it another go.']), 'bad');
    }
    render();
  }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  function advanceStep() {
    const q = ui.quest;
    P.stats.stepsTotal++;
    q.step++; q.tries = 0; q.hint = false; q.input = '';
    if (q.step >= q.p.steps.length) finishQuest();
    else { Sfx.play('correct'); setFb(pick(['Correct! ✨', 'Nice! 👍', 'Yes! 🎯', 'Great job! ⭐']), 'good'); }
  }

  function finishQuest() {
    const q = ui.quest;
    const steps = q.p.steps.length;
    const base = questBase(q);
    const breakdown = [];
    let frac;
    if (q.chFactor) {
      frac = q.chFactor;
      breakdown.push(q.chFactor > 1 ? '🧠 Challenge bonus +50%' : '🧠 Challenge solved');
    } else {
      frac = q.credits.reduce((a, b) => a + (b || 0), 0) / steps;
      frac = Math.max(0.2, frac);
      if (frac < 1) breakdown.push('Mistakes or hints cost some gold — you can do it!');
    }
    if (q.perfect) {
      P.stats.streak++; P.stats.perfect++;
      P.stats.bestStreak = Math.max(P.stats.bestStreak, P.stats.streak);
    } else {
      P.stats.streak = 0;
    }
    const streakB = q.perfect ? 1 + 0.1 * Math.min(5, P.stats.streak) : 1;
    if (streakB > 1) breakdown.push(`🔥 Streak bonus +${Math.round((streakB - 1) * 100)}%`);
    const pet = D.petMods(P.pet).gold;
    if (pet > 1) breakdown.push(`${D.PETS.find((x) => x.id === P.pet).emoji} Pet bonus +${Math.round((pet - 1) * 100)}%`);
    const reward = roundGold(base * frac * streakB * pet);
    q.reward = reward; q.breakdown = breakdown; q.done = true;
    P.gold += reward;
    P.stats.goldEarned += reward;
    P.stats.solved++;
    const g = (P.stats.byGrade[q.p.grade] = P.stats.byGrade[q.p.grade] || { solved: 0, perfect: 0 });
    g.solved++; if (q.perfect) g.perfect++;
    save();
    Sfx.play('coin');
    setTimeout(() => { updateGold(); coinBurst(); }, 50);
    toastNews(checkUnlocks());
  }

  function coinBurst() {
    const host = $('.done-panel');
    if (!host) return;
    for (let i = 0; i < 14; i++) {
      const c = document.createElement('span');
      c.className = 'coin-fly';
      c.textContent = '🪙';
      c.style.setProperty('--dx', (Math.random() * 260 - 130) + 'px');
      c.style.setProperty('--dy', (-Math.random() * 180 - 60) + 'px');
      c.style.animationDelay = Math.random() * 0.2 + 's';
      host.appendChild(c);
      setTimeout(() => c.remove(), 1400);
    }
  }

  /* ================= Adventure ================= */
  function viewAdventure() {
    const areas = D.AREAS.map((A, a) => {
      const open = isUnlocked(a, 0);
      if (!open) {
        return `<div class="area-card locked"><div class="area-head"><span class="area-emoji">🔒</span><div><h3>${a === currentArea() + 1 ? A.name : '???'}</h3>
          <small>Beat ${D.AREAS[a - 1].boss.name} ${D.AREAS[a - 1].boss.emoji} to unlock</small></div></div></div>`;
      }
      const nodes = [];
      for (let s = 0; s < D.STAGES_PER_AREA; s++) {
        const boss = s === D.STAGES_PER_AREA - 1;
        const un = isUnlocked(a, s), cl = isCleared(a, s);
        nodes.push(`<button class="node ${boss ? 'boss' : ''} ${cl ? 'cleared' : ''} ${un ? '' : 'locked'} ${un && !cl ? 'next' : ''}" ${un ? `data-act="preBattle" data-arg="${a}-${s}"` : 'disabled'}>
          <span>${un ? (boss ? A.boss.emoji : s + 1) : '🔒'}</span>${cl ? '<i>✓</i>' : ''}</button>`);
      }
      const done = isCleared(a, D.STAGES_PER_AREA - 1);
      return `<div class="area-card" style="background:${A.bg}">
        <div class="area-deco">${A.deco.join(' ')}</div>
        <div class="area-head"><span class="area-emoji">${A.emoji}</span><div><h3>${A.name}</h3>
          <small>${done ? '⭐ Cleared! Battle again for XP' : 'Monsters: ' + A.monsters.map((m) => m.emoji).join(' ')}</small></div></div>
        <div class="nodes">${nodes.join('<span class="path"></span>')}</div>
      </div>`;
    }).join('');
    const tower = towerUnlocked()
      ? `<div class="area-card tower"><div class="area-head"><span class="area-emoji">🗼</span><div><h3>Endless Tower</h3>
          <small>Best floor: ${P.towerBest}. How high can you climb?</small></div></div>
          <button class="btn big primary" data-act="preTower">Climb to floor ${P.towerBest + 1} ➜</button></div>`
      : `<div class="area-card locked"><div class="area-head"><span class="area-emoji">🗼</span><div><h3>???</h3><small>A secret appears after you save the kingdom…</small></div></div></div>`;
    return `<div class="story-banner">🧛 <b>Count Zero</b> stole the kingdom's numbers! Battle your way to the Cloud Castle and stop him.</div>
      <div class="areas">${areas}${tower}</div>`;
  }

  function partyStates() { return P.party.map((id) => P.heroes[id]); }

  function chanceInfo(c) {
    if (c >= 0.9) return ['easy', '😄 Easy win!'];
    if (c >= 0.6) return ['good', '🙂 Good chance to win'];
    if (c >= 0.3) return ['tough', '😬 Tough fight!'];
    if (c > 0) return ['hard', '😱 Very dangerous!'];
    return ['nope', '☠️ Too strong for now!'];
  }

  function preBattle(kind, a, s) {
    const enemies = kind === 'tower' ? D.towerEnemies(P.towerBest + 1) : D.stageEnemies(a, s);
    const chance = BE.winChance(partyStates(), enemies, P.pet, 30);
    const [cls, msg] = chanceInfo(chance);
    const title = kind === 'tower' ? `🗼 Endless Tower – Floor ${P.towerBest + 1}` : `${D.AREAS[a].emoji} ${D.AREAS[a].name} – ${stageLabel(a, s)}`;
    const tip = chance < 0.6
      ? `<div class="tip">💡 Tip: Solve <b>📜 Quests</b> for gold, then buy better gear in the <b>🛒 Shop</b>!</div>` : '';
    const pet = P.pet ? D.PETS.find((x) => x.id === P.pet) : null;
    openModal(`<div class="prebattle">
      <h2>${title}</h2>
      <div class="pb-row enemies">${enemies.map((e) => `<div class="pb-unit ${e.boss ? 'boss' : ''}"><span>${e.emoji}</span><small>${e.name}</small></div>`).join('')}</div>
      <div class="vs">VS</div>
      <div class="pb-row">${P.party.map((id) => `<div class="pb-unit"><span>${D.HEROES[id].emoji}</span><small>${D.HEROES[id].name} Lv${P.heroes[id].level}</small></div>`).join('')}
        ${pet ? `<div class="pb-unit pet"><span>${pet.emoji}</span><small>${pet.name}</small></div>` : ''}</div>
      <div class="chance ${cls}">${msg}</div>
      ${tip}
      <div class="row-btns">
        <button class="btn ghost" data-act="closeModal">Not yet</button>
        ${chance < 0.6 ? '<button class="btn" data-act="tab" data-arg="shop">🛒 Shop</button>' : ''}
        <button class="btn big primary" data-act="fight" data-arg="${kind}:${a}-${s}">Fight! ⚔️</button>
      </div>
    </div>`);
  }

  /* ================= Battle ================= */
  function startBattle(kind, a, s) {
    ui.modal = null;
    $('#toasts').innerHTML = '';
    const floor = P.towerBest + 1;
    const enemies = kind === 'tower' ? D.towerEnemies(floor) : D.stageEnemies(a, s);
    const b = new BE.Battle(partyStates(), enemies, P.pet);
    const area = kind === 'tower' ? D.AREAS[6] : D.AREAS[a];
    ui.battle = { b, kind, a, s, floor, enemies, speed: P.speed || 1, area, ended: false, raf: 0 };
    ui.screen = 'battle';
    drawBattle();
    startLoop();
  }

  function unitHtml(u) {
    return `<div class="unit ${u.side} ${u.boss ? 'boss' : ''}" id="u_${u.uid}">
      <div class="u-emoji">${u.emoji}</div>
      <div class="hpbar"><div class="hpfill" style="width:100%"></div><span class="hptext">${Math.ceil(u.hp)}</span></div>
      <div class="u-name">${u.name}</div>
      <div class="gauge"><div></div></div>
    </div>`;
  }

  function drawBattle() {
    const B = ui.battle, b = B.b, A = B.area;
    const deco = [];
    for (let i = 0; i < 10; i++) {
      deco.push(`<span style="left:${(i * 37) % 95}%;top:${10 + ((i * 53) % 80)}%;font-size:${24 + (i % 3) * 12}px">${A.deco[i % A.deco.length]}</span>`);
    }
    const title = B.kind === 'tower' ? `🗼 Floor ${B.floor}` : `${A.emoji} ${A.name} – ${stageLabel(B.a, B.s)}`;
    const pet = P.pet ? D.PETS.find((x) => x.id === P.pet) : null;
    app.innerHTML = `<div class="battle" style="background:${B.kind === 'tower' ? 'linear-gradient(180deg,#0b0b2a,#2b1d5a 50%,#3d2a7a 51%,#1a1040)' : A.bg}">
      <div class="b-deco">${deco.join('')}</div>
      <div class="b-top">
        <div class="b-title">${title}</div>
        <div class="b-ctrl">
          <button class="btn small" id="speedBtn">⏩ ${B.speed}x</button>
          <button class="btn small ghost" id="fleeBtn">🏳️ Retreat</button>
        </div>
      </div>
      <div class="b-field">
        <div class="b-row b-monsters">${b.monsters.map(unitHtml).join('')}</div>
        <div class="skill-banner" id="banner"></div>
        <div class="b-row b-heroes">${b.heroes.map(unitHtml).join('')}${pet ? `<div class="pet-unit">${pet.emoji}</div>` : ''}</div>
      </div>
      <div id="fx"></div>
    </div>`;
    $('#speedBtn').onclick = () => {
      B.speed = B.speed >= 3 ? 1 : B.speed + 1;
      P.speed = B.speed; save();
      $('#speedBtn').textContent = '⏩ ' + B.speed + 'x';
    };
    $('#fleeBtn').onclick = () => {
      if (B.ended) return;
      B.ended = true; cancelAnimationFrame(B.raf);
      endBattle(false, true);
    };
    updateUnits();
  }

  function updateUnits() {
    const b = ui.battle.b;
    for (const u of b.units()) {
      const el = document.getElementById('u_' + u.uid);
      if (!el) continue;
      const pct = Math.max(0, u.hp / u.maxHp * 100);
      const fill = el.querySelector('.hpfill');
      fill.style.width = pct + '%';
      fill.classList.toggle('low', pct < 30);
      el.querySelector('.hptext').textContent = Math.ceil(u.hp);
      el.querySelector('.gauge div').style.width = Math.min(100, u.gauge) + '%';
      if (!u.alive && !el.classList.contains('dead')) setTimeout(() => el.classList.add('dead'), 250 / ui.battle.speed);
    }
  }

  function startLoop() {
    const B = ui.battle;
    let last = performance.now(), acc = 0;
    const TICK = 0.05;
    function frame(t) {
      if (ui.battle !== B || B.ended) return;
      const dt = Math.min(0.1, (t - last) / 1000) * B.speed;
      last = t; acc += dt;
      while (acc >= TICK && !B.b.over) {
        acc -= TICK;
        handleEvents(B.b.step(TICK));
      }
      updateUnits();
      if (B.b.over) {
        B.ended = true;
        setTimeout(() => endBattle(B.b.winner === 'hero', false), 900);
        return;
      }
      B.raf = requestAnimationFrame(frame);
    }
    B.raf = requestAnimationFrame(frame);
  }

  function elCenter(uid) {
    const el = document.getElementById('u_' + uid);
    if (!el) return null;
    const r = el.querySelector('.u-emoji').getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, el };
  }

  function floatText(uid, text, cls) {
    const c = elCenter(uid);
    if (!c) return;
    const f = document.createElement('div');
    f.className = 'float ' + (cls || '');
    f.textContent = text;
    f.style.left = c.x + (Math.random() * 30 - 15) + 'px';
    f.style.top = c.y - 20 + 'px';
    $('#fx').appendChild(f);
    setTimeout(() => f.remove(), 1100);
  }

  function projectile(fromUid, toUid, char) {
    const a = elCenter(fromUid), b = elCenter(toUid);
    if (!a || !b) return;
    const p = document.createElement('div');
    p.className = 'proj';
    p.textContent = char;
    p.style.left = a.x + 'px'; p.style.top = a.y + 'px';
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    p.style.setProperty('--rot', (char === '➶' ? ang + 45 : 0) + 'deg');
    $('#fx').appendChild(p);
    const dur = 220 / ui.battle.speed;
    p.style.transition = `transform ${dur}ms linear`;
    requestAnimationFrame(() => { p.style.transform = `translate(${b.x - a.x}px, ${b.y - a.y}px) rotate(var(--rot))`; });
    setTimeout(() => p.remove(), dur + 30);
  }

  function banner(text) {
    const el = $('#banner');
    if (!el) return;
    el.textContent = text;
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  }

  function handleEvents(events) {
    const sp = ui.battle.speed;
    for (const ev of events) {
      if (ev.type === 'attack' || ev.type === 'heal') {
        const src = document.getElementById('u_' + ev.src);
        if (src) { src.classList.remove('act'); void src.offsetWidth; src.classList.add('act'); }
        if (ev.skill) banner(ev.skill);
        if (ev.shot) ev.hits.forEach((h) => projectile(ev.src, h.uid, ev.shot));
        const delay = (ev.shot ? 220 : 120) / sp;
        setTimeout(() => {
          for (const h of ev.hits) {
            if (h.heal != null) {
              if (h.heal > 0) floatText(h.uid, '+' + h.heal, 'heal');
              Sfx.play('heal');
            } else {
              floatText(h.uid, (h.crit ? '💥' : '') + h.dmg, h.crit ? 'crit' : '');
              const t = document.getElementById('u_' + h.uid);
              if (t) { t.classList.remove('hit'); void t.offsetWidth; t.classList.add('hit'); }
              Sfx.play(h.crit ? 'crit' : 'hit');
            }
          }
        }, delay);
      } else if (ev.type === 'regen') {
        for (const h of ev.hits) if (h.heal > 0) floatText(h.uid, '+' + h.heal, 'heal small');
      }
    }
  }

  function endBattle(win, fled) {
    const B = ui.battle, b = B.b;
    const lines = [];
    const xpTotal = B.enemies.reduce((x, m) => x + m.xp, 0);
    const xp = fled ? 0 : win ? xpTotal : Math.round(xpTotal * 0.3);
    const levelUps = [];
    if (xp > 0) {
      for (const id of P.party) {
        const h = P.heroes[id];
        h.xp += xp;
        let up = false;
        while (h.xp >= D.xpToNext(h.level)) { h.xp -= D.xpToNext(h.level); h.level++; up = true; }
        if (up) levelUps.push(`${D.HEROES[id].emoji} ${D.HEROES[id].name} reached <b>level ${h.level}</b>!`);
      }
    }
    // Bestiary: count defeated monsters
    for (const m of b.monsters) if (!m.alive) P.bestiary[m.name] = (P.bestiary[m.name] || 0) + 1;

    const unlocks = [];
    if (win) {
      P.stats.wins++;
      if (B.kind === 'tower') {
        if (B.floor > P.towerBest) { P.towerBest = B.floor; unlocks.push({ icon: '🗼', text: `New record: floor ${B.floor}!` }); }
      } else {
        const key = B.a + '-' + B.s;
        if (!P.cleared[key]) {
          P.cleared[key] = true;
          if (B.s === D.STAGES_PER_AREA - 1) {
            P.bossesBeaten = Math.max(P.bossesBeaten, B.a + 1);
            const t = maxTier();
            unlocks.push({ icon: '🛒', text: `<b>${D.TIERS[t].name}</b> gear is now in the Shop!` });
            if (B.a + 1 < D.AREAS.length) unlocks.push({ icon: D.AREAS[B.a + 1].emoji, text: `New land: <b>${D.AREAS[B.a + 1].name}</b>!` });
            const u = D.BOSS_UNLOCKS[B.a] || {};
            if (u.hero && !P.unlocked.includes(u.hero)) {
              P.unlocked.push(u.hero);
              const top = Math.max(...P.unlocked.map((id) => P.heroes[id].level));
              P.heroes[u.hero].level = Math.max(1, top - 1);
              if (P.party.length < P.partySlots) P.party.push(u.hero);
              unlocks.push({ icon: D.HEROES[u.hero].emoji, text: `New hero: <b>${D.HEROES[u.hero].name} the ${D.HEROES[u.hero].title}</b> joins you!` });
            }
            if (u.slot) {
              P.partySlots = Math.max(P.partySlots, u.slot);
              const extra = P.unlocked.find((id) => !P.party.includes(id));
              if (extra && P.party.length < P.partySlots) P.party.push(extra);
              unlocks.push({ icon: '👥', text: 'Your team can now have <b>4 heroes</b>!' });
            }
            if (u.tower) unlocks.push({ icon: '🗼', text: 'You saved the kingdom! The <b>Endless Tower</b> has appeared…' });
          } else {
            unlocks.push({ icon: '🗺️', text: 'Next battle unlocked!' });
          }
        }
      }
    } else if (!fled) P.stats.losses++;
    save();
    const news = checkUnlocks();
    for (const n of news) unlocks.push({ icon: n.icon, text: `<b>${esc(n.title)}</b> – ${esc(n.text)}` });

    if (win) Sfx.play('win'); else if (!fled) Sfx.play('lose');
    if (unlocks.length > 1) setTimeout(() => Sfx.play('unlock'), 700);

    let next = '';
    if (win) {
      if (B.kind === 'tower') next = `<button class="btn big primary" data-act="fight" data-arg="tower:0-0">Next floor ➜</button>`;
      else {
        let na = B.a, ns = B.s + 1;
        if (ns >= D.STAGES_PER_AREA) { na++; ns = 0; }
        if (na < D.AREAS.length && isUnlocked(na, ns)) next = `<button class="btn big primary" data-act="preBattle" data-arg="${na}-${ns}">Next battle ➜</button>`;
      }
    }
    const isBossWin = win && B.kind === 'stage' && B.s === D.STAGES_PER_AREA - 1;
    lines.push(xp ? `<div class="xp-line">⭐ Each hero earned <b>${xp} XP</b></div>` : '');
    const html = `<div class="result ${win ? 'win' : 'lose'}">
      <div class="big-emoji bounce">${win ? (isBossWin ? '👑' : '🏆') : fled ? '🏳️' : '💫'}</div>
      <h2>${win ? (isBossWin ? 'BOSS DEFEATED!' : 'Victory!') : fled ? 'You retreated' : 'Defeated…'}</h2>
      ${!win && !fled ? `<p>The monsters were too strong this time. Solve quests 📜 to earn gold and buy better gear 🛒!</p>` : ''}
      ${lines.join('')}
      ${levelUps.map((l) => `<div class="lvl-line">⬆️ ${l}</div>`).join('')}
      ${unlocks.length ? `<div class="unlocks">${unlocks.map((u) => `<div class="unlock"><span>${u.icon}</span><div>${u.text}</div></div>`).join('')}</div>` : ''}
      <div class="row-btns">
        ${win ? '' : `<button class="btn" data-act="goTab" data-arg="quest">📜 Quests</button><button class="btn" data-act="goTab" data-arg="shop">🛒 Shop</button>`}
        <button class="btn ${win && !next ? 'primary' : ''}" data-act="goTab" data-arg="adventure">🗺️ Map</button>
        ${!win && B.kind === 'stage' ? `<button class="btn primary" data-act="fight" data-arg="stage:${B.a}-${B.s}">Try again</button>` : ''}
        ${next}
      </div>
    </div>`;
    if (win) confetti();
    const back = document.createElement('div');
    back.className = 'modal-back';
    back.innerHTML = `<div class="modal">${html}</div>`;
    app.querySelector('.battle').appendChild(back);
  }

  function confetti() {
    const host = $('#fx') || document.body;
    const bits = ['🎉', '⭐', '✨', '🪅', '🎊'];
    for (let i = 0; i < 24; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.textContent = bits[i % bits.length];
      c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDelay = Math.random() * 0.6 + 's';
      c.style.animationDuration = 1.6 + Math.random() * 1.2 + 's';
      host.appendChild(c);
      setTimeout(() => c.remove(), 3500);
    }
  }

  function leaveBattle(tab) {
    if (ui.battle) { cancelAnimationFrame(ui.battle.raf); ui.battle.ended = true; }
    ui.battle = null;
    ui.screen = 'hub';
    ui.tab = tab || 'adventure';
    render();
  }

  /* ================= Shop ================= */
  function statLine(st) {
    const parts = [];
    if (st.hp) parts.push(`❤️+${st.hp}`);
    if (st.atk) parts.push(`⚔️+${st.atk}`);
    if (st.def) parts.push(`🛡️+${st.def}`);
    if (st.spd) parts.push(`💨+${st.spd}`);
    return parts.join(' ');
  }
  function heroStatBar(id) {
    const s = D.heroStats(P.heroes[id], P.pet);
    return `<div class="statbar"><span>❤️ ${s.maxHp}</span><span>⚔️ ${Math.round(s.atk)}</span><span>🛡️ ${Math.round(s.def)}</span><span>💨 ${Math.round(s.spd)}</span><span class="pow">💪 ${D.heroPower(P.heroes[id], P.pet)}</span></div>`;
  }

  function viewShop() {
    if (!P.unlocked.includes(ui.shopHero)) ui.shopHero = P.unlocked[0];
    const id = ui.shopHero, H = D.HEROES[id], h = P.heroes[id];
    const tabs = P.unlocked.map((hid) => `<button class="hero-tab ${hid === id ? 'on' : ''}" data-act="shopHero" data-arg="${hid}">
      <span>${D.HEROES[hid].emoji}</span><small>${D.HEROES[hid].name}${P.party.includes(hid) ? '' : ' 💤'}</small></button>`).join('');
    const mt = maxTier();
    const slots = Object.keys(D.SLOTS).map((slot) => {
      const S = D.SLOTS[slot], cur = h.gear[slot];
      const cards = [];
      for (let t = cur + 1; t <= Math.min(D.MAX_TIER, mt + 1); t++) {
        const st = D.gearStats(slot, t), T = D.TIERS[t];
        if (t > mt) {
          cards.push(`<div class="item locked" style="--tc:${T.color}"><div class="it-tier">🔒 ${T.name}</div><div class="it-ic">${S.icon}</div><div class="it-stats">${statLine(st)}</div><div class="it-lock">${tierUnlockText(t)}</div></div>`);
        } else {
          const price = D.gearPrice(slot, t);
          const trade = cur ? Math.round(D.gearPrice(slot, cur) * 0.25) : 0;
          const cost = price - trade;
          const can = P.gold >= cost;
          cards.push(`<div class="item ${t === mt ? 'best' : ''}" style="--tc:${T.color}">
            ${t === mt ? '<div class="best-tag">BEST</div>' : ''}
            <div class="it-tier">${T.name}</div><div class="it-ic">${S.icon}</div>
            <div class="it-name">${D.gearName(id, slot, t)}</div>
            <div class="it-stats">${statLine(st)}</div>
            <button class="btn buy ${can ? '' : 'poor'}" data-act="buy" data-arg="${slot}:${t}">🪙 ${fmt(cost)}</button>
            ${trade ? `<div class="it-trade">(trade-in −${fmt(trade)})</div>` : ''}
          </div>`);
        }
      }
      if (!cards.length) cards.push(`<div class="item maxed"><div class="it-ic">🌟</div><div>Best gear!</div></div>`);
      const equipped = cur
        ? `<div class="equipped" style="--tc:${D.TIERS[cur].color}"><div class="eq-ic">${S.icon}</div><div><b>${D.gearName(id, slot, cur)}</b><br><small>${statLine(D.gearStats(slot, cur))}</small></div></div>`
        : `<div class="equipped empty"><div class="eq-ic">${S.icon}</div><div><b>No ${S.label.toLowerCase()}</b><br><small>Buy one below!</small></div></div>`;
      return `<div class="slot-sec card"><div class="slot-head"><h3>${S.icon} ${S.label}</h3>${equipped}</div><div class="items">${cards.join('')}</div></div>`;
    }).join('');
    return `<div class="shop">
      <div class="shop-top card">
        <div class="shopkeeper">🧑‍🔧</div>
        <div><b>Bruno's Gear Shop</b><br><small>Pick a hero, then buy them gear. Beat bosses to unlock better gear!</small></div>
      </div>
      <div class="hero-tabs">${tabs}</div>
      <div class="card shop-hero">
        <div class="sh-emoji">${H.emoji}</div>
        <div><b>${H.name} the ${H.title}</b> · Lv ${h.level}${P.party.includes(id) ? '' : ' <span class="muted">(not on your team)</span>'}${heroStatBar(id)}</div>
      </div>
      ${slots}
    </div>`;
  }

  function buy(slot, tier) {
    const id = ui.shopHero, h = P.heroes[id];
    if (tier > maxTier() || tier <= h.gear[slot]) return;
    const price = D.gearPrice(slot, tier);
    const trade = h.gear[slot] ? Math.round(D.gearPrice(slot, h.gear[slot]) * 0.25) : 0;
    const cost = price - trade;
    if (P.gold < cost) {
      Sfx.play('wrong');
      openModal(`<div class="intro"><div class="big-emoji">🪙</div><h2>Not enough gold</h2>
        <p>You need <b>${fmt(cost - P.gold)}</b> more gold for the ${D.gearName(id, slot, tier)}.</p>
        <p>Solve quests to earn more!</p>
        <div class="row-btns"><button class="btn ghost" data-act="closeModal">OK</button><button class="btn big primary" data-act="goTab" data-arg="quest">📜 Go solve quests</button></div></div>`);
      return;
    }
    P.gold -= cost;
    h.gear[slot] = tier;
    save();
    Sfx.play('buy');
    toast(`<span class="t-icon">${D.SLOTS[slot].icon}</span><div><b>${D.HEROES[id].name}</b> equipped the <b>${D.gearName(id, slot, tier)}</b>!</div>`, 'good');
    render();
    toastNews(checkUnlocks());
  }

  /* ================= Heroes ================= */
  function viewHeroes() {
    const team = [];
    for (let i = 0; i < 4; i++) {
      if (i >= P.partySlots) { team.push(`<div class="team-slot locked">🔒<small>${heroSlotText()}</small></div>`); continue; }
      const id = P.party[i];
      team.push(id ? `<div class="team-slot"><span>${D.HEROES[id].emoji}</span><small>${D.HEROES[id].name}</small></div>` : `<div class="team-slot empty">➕<small>Empty</small></div>`);
    }
    const cards = D.HERO_ORDER.map((id) => {
      const H = D.HEROES[id], h = P.heroes[id];
      if (!P.unlocked.includes(id)) {
        return `<div class="hero-card locked card"><div class="hc-emoji">❔</div><div><b>??? the ${H.title}</b><br><small>🔒 ${heroUnlockText(id)}</small></div></div>`;
      }
      const inParty = P.party.includes(id);
      const need = D.xpToNext(h.level);
      const gear = Object.keys(D.SLOTS).map((s) => `<span class="g-ic" style="--tc:${h.gear[s] ? D.TIERS[h.gear[s]].color : '#ccc'}" title="${h.gear[s] ? D.gearName(id, s, h.gear[s]) : 'none'}">${D.SLOTS[s].icon}</span>`).join('');
      return `<div class="hero-card card ${inParty ? 'in' : ''}" style="--hc:${H.color}">
        <div class="hc-emoji">${H.emoji}</div>
        <div class="hc-body">
          <div class="hc-name"><b>${H.name}</b> the ${H.title} <span class="lv">Lv ${h.level}</span></div>
          <div class="xpbar"><div style="width:${Math.min(100, h.xp / need * 100)}%"></div><span>${h.xp}/${need} XP</span></div>
          ${heroStatBar(id)}
          <div class="hc-skill">✨ ${H.skill}</div>
          <div class="hc-gear">${gear}<button class="btn small ghost" data-act="gearUp" data-arg="${id}">🛒 Gear</button>
            <button class="btn small ${inParty ? '' : 'primary'}" data-act="toggleParty" data-arg="${id}">${inParty ? '✓ On team' : '➕ Add to team'}</button></div>
        </div>
      </div>`;
    }).join('');
    const pets = D.PETS.map((pet) => {
      const has = P.pets.includes(pet.id);
      return has
        ? `<button class="pet ${P.pet === pet.id ? 'sel' : ''}" data-act="pet" data-arg="${pet.id}"><span>${pet.emoji}</span><b>${pet.name}</b><small>${pet.bonus}</small></button>`
        : `<div class="pet locked"><span>❓</span><b>???</b><small>🔒 ${pet.need}</small></div>`;
    }).join('');
    return `<div class="heroes">
      <div class="card team"><h3>Your Team (${P.party.length}/${P.partySlots})</h3><div class="team-row">${team.join('')}</div><small class="muted">Tap “Add to team” on a hero to swap them in.</small></div>
      <div class="hero-list">${cards}</div>
      <div class="card"><h3>🐾 Pets <small class="muted">(pick one to join your team)</small></h3><div class="pet-grid">${pets}</div></div>
    </div>`;
  }
  function heroSlotText() {
    const i = D.BOSS_UNLOCKS.findIndex((u) => u.slot);
    return 'Beat ' + D.AREAS[i].boss.name;
  }
  function toggleParty(id) {
    const i = P.party.indexOf(id);
    if (i >= 0) {
      if (P.party.length <= 1) { toast('You need at least one hero on your team!', 'bad'); return; }
      P.party.splice(i, 1);
    } else {
      if (P.party.length >= P.partySlots) {
        toast(`Your team is full! Remove a hero first.`, 'bad');
        return;
      }
      P.party.push(id);
    }
    Sfx.play('tap');
    save(); render();
  }

  /* ================= Trophies ================= */
  function viewTrophies() {
    const t = ui.trophyTab;
    const sub = [['trophies', '🏆 Trophies'], ['bestiary', '📖 Monsters']].map(([id, l]) => `<button class="seg ${t === id ? 'on' : ''}" data-act="trophyTab" data-arg="${id}">${l}</button>`).join('');
    let body;
    if (t === 'trophies') {
      body = `<div class="trophy-grid">${D.TROPHIES.map((tr) => {
        const has = P.trophies.includes(tr.id);
        return `<div class="trophy ${has ? 'has' : ''}"><span>${has ? tr.emoji : '🔒'}</span><b>${tr.name}</b><small>${tr.desc}</small></div>`;
      }).join('')}</div>`;
    } else {
      const all = [];
      D.AREAS.forEach((A) => { A.monsters.forEach((m) => all.push(m)); all.push(Object.assign({ boss: true }, A.boss)); });
      body = `<div class="trophy-grid">${all.map((m) => {
        const n = P.bestiary[m.name] || 0;
        return `<div class="trophy ${n ? 'has' : ''} ${m.boss ? 'bossy' : ''}"><span>${n ? m.emoji : '❔'}</span><b>${n ? m.name : '???'}</b><small>${n ? 'Defeated ×' + n : 'Not found yet'}</small></div>`;
      }).join('')}</div>`;
    }
    const found = Object.keys(P.bestiary).length;
    return `<div class="trophies">
      <div class="seg-row">${sub}</div>
      <div class="muted center">${t === 'trophies' ? `${P.trophies.length} of ${D.TROPHIES.length} trophies earned` : `${found} of ${D.AREAS.length * 5} monsters discovered`}</div>
      ${body}
    </div>`;
  }

  /* ================= Settings ================= */
  function viewSettings() {
    const s = P.stats;
    const acc = s.stepsTotal ? Math.round(s.stepsFirst / s.stepsTotal * 100) : 0;
    const byGrade = Object.keys(s.byGrade).sort().map((g) => `<div>Grade ${g}: ${s.byGrade[g].solved} solved, ${s.byGrade[g].perfect} perfect</div>`).join('') || '<div class="muted">No quests yet</div>';
    return `<div class="settings">
      <div class="card">
        <h3>${P.avatar} ${esc(P.name)}</h3>
        <label class="lbl">Grade level ${P.pin ? '🔐' : ''}</label>
        <div class="grade-row">${[3, 4, 5, 6].map((g) => `<button class="grade-btn ${P.grade === g ? 'sel' : ''}" data-act="setGrade" data-arg="${g}">${g}<small>${['rd', 'th', 'th', 'th'][g - 3]}</small></button>`).join('')}</div>
        <div class="toggle-row">
          <div><b>🧠 Challenge Mode</b><br><small>Only type the final answer. Earn <b>+50% gold</b>!</small></div>
          <button class="switch ${P.challenge ? 'on' : ''}" data-act="toggleChallenge" aria-label="Challenge mode"><span></span></button>
        </div>
        <div class="toggle-row">
          <div><b>🔊 Sound</b></div>
          <button class="switch ${P.sound ? 'on' : ''}" data-act="toggleSound" aria-label="Sound"><span></span></button>
        </div>
      </div>
      <div class="card">
        <h3>📊 Stats</h3>
        <div class="stats-grid">
          <div><b>${s.solved}</b><small>Quests solved</small></div>
          <div><b>${acc}%</b><small>Steps right first try</small></div>
          <div><b>${s.bestStreak}</b><small>Best streak</small></div>
          <div><b>${s.challengeSolved}</b><small>Challenge solves</small></div>
          <div><b>${s.wins}</b><small>Battles won</small></div>
          <div><b>${fmt(s.goldEarned)}</b><small>Gold earned</small></div>
        </div>
        <div class="by-grade">${byGrade}</div>
      </div>
      <div class="card">
        <h3>👪 For grown-ups</h3>
        <p class="muted">Set a 4-digit PIN so the grade level can only be changed by a grown-up.</p>
        <div class="row-btns left">
          <button class="btn" data-act="setPin">${P.pin ? 'Change PIN' : 'Set PIN'}</button>
          ${P.pin ? '<button class="btn ghost" data-act="clearPin">Remove PIN</button>' : ''}
        </div>
        <p class="muted small">Progress is saved on this device only (in the browser).</p>
      </div>
      <div class="row-btns">
        <button class="btn big" data-act="switchPlayer">👥 Switch player</button>
        <button class="btn danger" data-act="deletePlayer">🗑️ Delete player</button>
      </div>
    </div>`;
  }

  function askPin(title, cb) {
    openModal(`<div class="intro"><h2>${title}</h2>
      <input id="pinIn" class="text-in pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="••••">
      <div class="row-btns"><button class="btn ghost" data-act="closeModal">Cancel</button><button class="btn primary" id="pinOk">OK</button></div></div>`);
    const inp = $('#pinIn');
    setTimeout(() => inp && inp.focus(), 50);
    $('#pinOk').onclick = () => cb(inp.value);
    inp.onkeydown = (e) => { if (e.key === 'Enter') cb(inp.value); };
  }

  /* ================= Actions ================= */
  const actions = {
    login: (id) => login(id),
    newProfile: () => { ui.newProfile = { name: '', avatar: D.AVATARS[0], grade: 3 }; ui.screen = 'newProfile'; render(); setTimeout(() => $('#np-name') && $('#np-name').focus(), 50); },
    toProfiles: () => { ui.screen = 'profiles'; render(); },
    npAvatar: (a) => { ui.newProfile.name = $('#np-name').value; ui.newProfile.avatar = a; render(); },
    npGrade: (g) => { ui.newProfile.name = $('#np-name').value; ui.newProfile.grade = +g; render(); },
    npCreate: () => {
      const name = $('#np-name').value.trim();
      if (!name) { toast('Please type your name first!', 'bad'); $('#np-name').focus(); return; }
      const p = createProfile(name.slice(0, 14), ui.newProfile.avatar, ui.newProfile.grade);
      store.profiles.push(p); save();
      login(p.id);
    },
    tab: (t) => { ui.modal = null; ui.tab = t; render(); window.scrollTo(0, 0); },
    goTab: (t) => leaveBattleOrTab(t),
    help: () => openModal(helpModal()),
    closeModal: () => closeModal(),
    modalBack: (_, el, e) => { if (e.target === el && ui.screen !== 'battle') closeModal(); },
    key: (k) => pressKey(k),
    check: () => questCheck(),
    hint: () => { ui.quest.hint = true; render(); },
    revealOk: () => { ui.quest.reveal = null; ui.quest.fb = ''; ui.quest.fbCls = ''; advanceStep(); render(); },
    toGuided: () => { const q = ui.quest; q.mode = 'guided'; q.step = 0; q.tries = 0; render(); },
    nextQuest: () => { newQuest(); render(); },
    preBattle: (arg) => { const [a, s] = arg.split('-').map(Number); if (ui.screen === 'battle') leaveBattle('adventure'); preBattle('stage', a, s); },
    preTower: () => preBattle('tower', 0, 0),
    fight: (arg) => {
      const [kind, rest] = arg.split(':');
      const [a, s] = rest.split('-').map(Number);
      if (ui.battle) { cancelAnimationFrame(ui.battle.raf); ui.battle = null; }
      startBattle(kind, a, s);
    },
    shopHero: (id) => { ui.shopHero = id; render(); },
    buy: (arg) => { const [slot, t] = arg.split(':'); buy(slot, +t); },
    gearUp: (id) => { ui.shopHero = id; ui.tab = 'shop'; render(); window.scrollTo(0, 0); },
    toggleParty: (id) => toggleParty(id),
    pet: (id) => { P.pet = P.pet === id ? null : id; save(); Sfx.play('tap'); render(); },
    trophyTab: (t) => { ui.trophyTab = t; render(); },
    setGrade: (g) => {
      g = +g;
      const apply = () => { P.grade = g; ui.quest = null; save(); closeModal(); toast(`Grade set to ${g}`, 'good'); };
      if (P.pin) askPin('Grown-up PIN', (v) => { if (v === P.pin) apply(); else toast('Wrong PIN', 'bad'); });
      else apply();
    },
    toggleChallenge: () => { P.challenge = !P.challenge; ui.quest = null; save(); render(); },
    toggleSound: () => { P.sound = !P.sound; save(); render(); },
    setPin: () => {
      const doSet = () => askPin('Choose a 4-digit PIN', (v) => {
        if (!/^\d{4}$/.test(v)) { toast('PIN must be 4 digits', 'bad'); return; }
        P.pin = v; save(); closeModal(); toast('PIN saved 🔐', 'good');
      });
      if (P.pin) askPin('Current PIN', (v) => { if (v === P.pin) doSet(); else toast('Wrong PIN', 'bad'); });
      else doSet();
    },
    clearPin: () => askPin('Current PIN', (v) => { if (v === P.pin) { P.pin = ''; save(); closeModal(); toast('PIN removed', 'good'); } else toast('Wrong PIN', 'bad'); }),
    switchPlayer: () => { P = null; ui.screen = 'profiles'; ui.quest = null; render(); },
    deletePlayer: () => openModal(`<div class="intro"><div class="big-emoji">🗑️</div><h2>Delete ${esc(P.name)}?</h2>
      <p>All gold, heroes and progress for this player will be gone forever.</p>
      <div class="row-btns"><button class="btn primary" data-act="closeModal">Keep player</button><button class="btn danger" data-act="confirmDelete">Delete forever</button></div></div>`),
    confirmDelete: () => {
      const go = () => {
        store.profiles = store.profiles.filter((p) => p.id !== P.id);
        save(); P = null; ui.modal = null; ui.screen = 'profiles'; render();
      };
      if (P.pin) askPin('Grown-up PIN', (v) => { if (v === P.pin) go(); else toast('Wrong PIN', 'bad'); });
      else go();
    },
  };
  function leaveBattleOrTab(t) {
    if (ui.screen === 'battle') leaveBattle(t);
    else actions.tab(t);
  }

  app.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = actions[el.dataset.act];
    if (fn) fn(el.dataset.arg, el, e);
  });

  document.addEventListener('keydown', (e) => {
    if (ui.screen !== 'hub' || ui.tab !== 'quest' || ui.modal) return;
    if (e.target && e.target.tagName === 'INPUT') return;
    if (/^[0-9.]$/.test(e.key)) { pressKey(e.key); e.preventDefault(); }
    else if (e.key === 'Backspace') { pressKey('⌫'); e.preventDefault(); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (ui.quest && ui.quest.done) actions.nextQuest();
      else if (ui.quest && ui.quest.reveal != null) actions.revealOk();
      else questCheck();
    }
  });

  // Handy for debugging in the browser console.
  window.NK = { ui, profile: () => P, save };

  render();
})();
