/* Number Knights – main game: profiles, quests, shop, heroes, adventure, battles. */
(function () {
  'use strict';
  const D = window.GameData, M = window.MathGen, BE = window.BattleEngine, Art = window.Art;
  const esc = M.esc, fmt = M.fmt;
  const $ = (s, el) => (el || document).querySelector(s);
  const app = $('#app');
  const SAVE_KEY = 'numberKnights.v1';
  const ic = (n) => Art.icon(n);

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
    return { solved: 0, perfect: 0, streak: 0, bestStreak: 0, challengeSolved: 0, goldEarned: 0, wins: 0, losses: 0, stepsFirst: 0, stepsTotal: 0, byGrade: {}, ults: 0, blocks: 0 };
  }
  function createProfile(name, avatar, grade) {
    return {
      id: 'p' + Date.now().toString(36) + Math.floor(Math.random() * 1e4),
      name, avatar, grade, challenge: false, sound: true, pin: '', speed: 1, autoUlt: false,
      gold: 0, heroes: blankHeroes(), unlocked: ['knight', 'archer'], party: ['knight', 'archer'], partySlots: 3,
      cleared: {}, stars: {}, bossesBeaten: 0, pets: [], pet: null, bestiary: {}, trophies: [], towerBest: 0,
      stats: blankStats(), seenIntro: false, tips: {}, created: Date.now(),
    };
  }
  function migrate(p) {
    const fresh = createProfile(p.name, p.avatar, p.grade);
    for (const k of Object.keys(fresh)) if (p[k] === undefined) p[k] = fresh[k];
    for (const k of Object.keys(fresh.stats)) if (p.stats[k] === undefined) p.stats[k] = fresh.stats[k];
    for (const id of D.HERO_ORDER) if (!p.heroes[id]) p.heroes[id] = fresh.heroes[id];
    // Battles won before stars existed count as 1 star.
    for (const k of Object.keys(p.cleared)) if (!p.stars[k]) p.stars[k] = 1;
    return p;
  }

  /* ================= Progress helpers ================= */
  const maxTier = () => Math.min(D.MAX_TIER, 1 + P.bossesBeaten);
  const rewardMult = () => D.priceMult(maxTier());
  const isCleared = (a, s) => !!P.cleared[a + '-' + s];
  const isUnlocked = (a, s) => (a === 0 && s === 0) || (s > 0 ? isCleared(a, s - 1) : isCleared(a - 1, D.STAGES_PER_AREA - 1));
  const towerUnlocked = () => P.bossesBeaten >= 7;
  const starsAt = (a, s) => P.stars[a + '-' + s] || 0;
  function currentArea() {
    for (let a = D.AREAS.length - 1; a >= 0; a--) if (isUnlocked(a, 0)) return a;
    return 0;
  }
  function stageLabel(a, s) {
    return s === D.STAGES_PER_AREA - 1 ? 'Boss: ' + D.AREAS[a].boss.name : 'Battle ' + (s + 1);
  }
  function tierUnlockText(tier) {
    const a = tier - 2; // tier t unlocks after beating boss of area t-2 (0-indexed)
    return a >= 0 && a < D.AREAS.length ? 'Beat ' + D.AREAS[a].boss.name : '';
  }
  function heroUnlockText(id) {
    const i = D.BOSS_UNLOCKS.findIndex((u) => u.hero === id);
    return i >= 0 ? 'Beat ' + D.AREAS[i].boss.name : '';
  }
  const starRow = (n, max) => {
    let s = '';
    for (let i = 0; i < (max || 3); i++) s += `<i class="st ${i < n ? 'on' : ''}">${ic(i < n ? 'star' : 'starEmpty')}</i>`;
    return `<span class="stars">${s}</span>`;
  };

  /* Pictures for trophies (drawn icons instead of emoji). */
  const TROPHY_ART = {
    first_quest: () => ic('scroll'), q10: () => ic('book'), q50: () => ic('brain'), q100: () => ic('crown'), q250: () => ic('trophy'),
    perfect10: () => ic('check'), streak5: () => ic('fire'), streak15: () => ic('bolt'), challenge1: () => ic('brain'), challenge25: () => ic('power'),
    win1: () => ic('sword'), win50: () => ic('sword2'), boss1: () => Art.monster('Big Grizzly'), boss3: () => Art.monster('Cave Kraken'),
    boss5: () => Art.monster('Mega Mammoth'), boss7: () => ic('crown'), gold1000: () => ic('coin'), gold25000: () => ic('chest'),
    fullset: () => ic('shield'), lvl10: () => ic('xp'), lvl25: () => ic('star'), bestiary20: () => ic('book'), pets5: () => ic('paw'),
    tower10: () => ic('tower'), tower25: () => ic('gem'), stars30: () => ic('star'), stars100: () => ic('crown'), super10: () => ic('bolt'), block1: () => ic('shield'),
  };
  const trophyArt = (id) => (TROPHY_ART[id] || (() => ic('trophy')))();

  /* ================= Sound ================= */
  // [frequency, duration, wave, volume] tones, or ['noise', duration, filterHz, volume] bursts.
  const SOUNDS = {
    tap: [[700, 0.03, 'square', 0.03]],
    correct: [[660, 0.09], [880, 0.14]],
    wrong: [[240, 0.12, 'sawtooth', 0.06], [190, 0.18, 'sawtooth', 0.06]],
    coin: [[988, 0.07], [1319, 0.22]],
    hit: [['noise', 0.06, 1400, 0.12], [160, 0.05, 'square', 0.04]],
    crit: [['noise', 0.1, 2200, 0.16], [420, 0.04, 'square', 0.06], [140, 0.1, 'square', 0.06]],
    heal: [[523, 0.07, 'sine'], [784, 0.12, 'sine']],
    win: [[523, 0.11], [659, 0.11], [784, 0.11], [1047, 0.32]],
    lose: [[392, 0.18], [330, 0.18], [262, 0.4]],
    buy: [[784, 0.06], [1047, 0.06], [1319, 0.16]],
    unlock: [[523, 0.08], [784, 0.08], [1047, 0.08], [1568, 0.3]],
    ult: [['noise', 0.25, 3000, 0.06], [392, 0.07], [523, 0.07], [659, 0.07], [1047, 0.22]],
    boom: [['noise', 0.45, 500, 0.3], [90, 0.3, 'sine', 0.2]],
    slam: [['noise', 0.5, 300, 0.35], [70, 0.4, 'sine', 0.25]],
    alarm: [[880, 0.1, 'square', 0.04], [660, 0.1, 'square', 0.04], [880, 0.1, 'square', 0.04], [660, 0.1, 'square', 0.04]],
    wave: [[330, 0.12, 'sawtooth', 0.05], [440, 0.12, 'sawtooth', 0.05], [554, 0.3, 'sawtooth', 0.05]],
    boss: [[110, 0.3, 'sawtooth', 0.08], [104, 0.3, 'sawtooth', 0.08], [98, 0.6, 'sawtooth', 0.08]],
    shield: [[600, 0.06, 'sine'], [900, 0.25, 'sine']],
    star: [[1319, 0.08], [1760, 0.22]],
    poof: [['noise', 0.18, 900, 0.12]],
    shoot: [['noise', 0.05, 4000, 0.05]],
  };
  const Sfx = {
    ctx: null, last: {}, noiseBuf: null,
    play(name) {
      if (!P || !P.sound) return;
      try {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        const c = this.ctx;
        if (c.state === 'suspended') c.resume();
        const gap = { hit: 0.08, crit: 0.08, shoot: 0.07, heal: 0.1, poof: 0.08 }[name];
        if (gap) {
          if (c.currentTime - (this.last[name] || 0) < gap) return;
          this.last[name] = c.currentTime;
        }
        let t = c.currentTime;
        for (const n of SOUNDS[name]) {
          const g = c.createGain();
          if (n[0] === 'noise') {
            const [, d, hz, vol] = n;
            if (!this.noiseBuf) {
              this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
              const ch = this.noiseBuf.getChannelData(0);
              for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
            }
            const src = c.createBufferSource(), f = c.createBiquadFilter();
            src.buffer = this.noiseBuf; f.type = 'lowpass'; f.frequency.value = hz;
            g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
            src.connect(f); f.connect(g); g.connect(c.destination);
            src.start(t); src.stop(t + d + 0.02);
            continue; // noise plays under the next tone
          }
          const [f, d, type, vol] = n;
          const o = c.createOscillator();
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
        news.push({ icon: Art.pet(pet.id), title: 'New Pet: ' + pet.name + '!', text: pet.bonus });
      }
    }
    for (const t of D.TROPHIES) {
      if (!P.trophies.includes(t.id) && t.check(P)) {
        P.trophies.push(t.id);
        news.push({ icon: trophyArt(t.id), title: 'Trophy: ' + t.name, text: t.desc });
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
      const area = D.AREAS[Math.min(6, p.bossesBeaten)];
      const where = p.bossesBeaten >= 7 ? 'Kingdom saved!' : area.name;
      return `<button class="profile-card" data-act="login" data-arg="${p.id}">
        <div class="av-frame">${Art.avatar(p.avatar)}</div>
        <div class="pc-name">${esc(p.name)}</div>
        <div class="pc-sub">Grade ${p.grade} · <span class="coin-amt">${ic('coin')}${fmt(p.gold)}</span></div>
        <div class="pc-sub">${ic('map')} ${where}</div>
      </button>`;
    }).join('');
    return `<div class="title-screen">
      <div class="title-bg">${Art.scene('meadow')}</div>
      <div class="logo">
        <div class="logo-heroes"><div class="lh l1">${Art.hero('archer')}</div><div class="lh l2">${Art.hero('knight')}</div><div class="lh l3">${Art.hero('mage')}</div></div>
        <h1 class="logo-title">Number Knights</h1>
        <div class="tagline">Solve math quests · Gear up your heroes · Battle monsters!</div>
      </div>
      <div class="card who-card">
        <h2 class="ribbon">Who's playing?</h2>
        <div class="profile-grid">
          ${cards}
          <button class="profile-card new" data-act="newProfile"><div class="av-frame plus">${ic('plus')}</div><div class="pc-name">New Player</div></button>
        </div>
      </div>
    </div>`;
  }

  function viewNewProfile() {
    const np = ui.newProfile;
    return `<div class="title-screen">
      <div class="title-bg">${Art.scene('meadow')}</div>
      <div class="card np-card">
        <h2 class="ribbon">Create your player</h2>
        <label class="lbl">Your name</label>
        <input id="np-name" class="text-in" maxlength="14" placeholder="Type your name" value="${esc(np.name)}" autocomplete="off">
        <label class="lbl">Pick your look</label>
        <div class="avatar-grid">${D.AVATARS.map((a) => `<button class="av ${np.avatar === a ? 'sel' : ''}" data-act="npAvatar" data-arg="${a}">${Art.avatar(a)}</button>`).join('')}</div>
        <label class="lbl">What grade are you in?</label>
        <div class="grade-row">${[3, 4, 5, 6].map((g) => `<button class="grade-btn ${np.grade === g ? 'sel' : ''}" data-act="npGrade" data-arg="${g}">${g}<small>${['rd', 'th', 'th', 'th'][g - 3]}</small></button>`).join('')}</div>
        <div class="np-actions">
          <button class="btn" data-act="toProfiles">Back</button>
          <button class="btn big primary" data-act="npCreate">Start Adventure!</button>
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
      <div class="big-art">${Art.monster('Count Zero')}</div>
      <h2 class="ttl">Oh no, ${esc(P.name)}!</h2>
      <p><b>Count Zero</b> has stolen all the numbers in the kingdom and hidden in his Cloud Castle!</p>
      <p>Help the townsfolk by solving their <b>Math Quests</b>. Each quest pays <b>gold</b>.</p>
      <p>Spend your gold in the <b>Shop</b> to buy gear for your heroes, then send them on an <b>Adventure</b> to battle monsters!</p>
      <p>Beat the big <b>boss</b> in each land to unlock new lands, new heroes and better gear.</p>
      <button class="btn big primary" data-act="closeModal">Let's go!</button>
    </div>`;
  }

  function helpModal() {
    return `<div class="intro">
      <h2 class="ttl">How to play</h2>
      <div class="help-list">
        <div><span>${ic('scroll')}</span><p><b>Quests:</b> Solve the math story one step at a time. Use the number pad, then tap <b>Check</b>. Right on the first try = full gold! Get many in a row for a streak bonus.</p></div>
        <div><span>${ic('brain')}</span><p><b>Challenge Mode</b> (in Settings): Only type the final answer for <b>+50% gold</b>.</p></div>
        <div><span>${ic('shop')}</span><p><b>Shop:</b> Buy weapons, armor and charms for each hero. Better gear appears after you beat bosses.</p></div>
        <div><span>${ic('map')}</span><p><b>Adventure:</b> Battle waves of monsters! Your heroes fight on their own.</p></div>
        <div><span>${ic('bolt')}</span><p><b>Super powers:</b> When a hero's card glows, <b>tap it</b> to unleash their super power. When a boss winds up a big attack, tap the Knight's <b>Shield Wall</b> to block it!</p></div>
        <div><span>${ic('star')}</span><p><b>Stars:</b> Win with nobody knocked out to earn all 3 stars.</p></div>
        <div><span>${ic('trophy')}</span><p><b>Trophies:</b> Earn trophies, collect pets and discover monsters.</p></div>
      </div>
      <button class="btn big primary" data-act="closeModal">Got it!</button>
    </div>`;
  }

  /* ================= Hub ================= */
  const TABS = [
    ['quest', 'scroll', 'Quests'], ['adventure', 'map', 'Adventure'], ['shop', 'shop', 'Shop'],
    ['heroes', 'helmet', 'Heroes'], ['trophies', 'trophy', 'Trophies'], ['settings', 'cog', 'Settings'],
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
        <button class="tb-player" data-act="tab" data-arg="settings"><span class="av-frame sm">${Art.avatar(P.avatar)}</span><span class="tb-name">${esc(P.name)}</span></button>
        <div class="tb-right">
          ${streak > 0 ? `<div class="res streak" title="Streak">${ic('fire')}<b>${streak}</b></div>` : ''}
          <div class="res gold" id="goldChip">${ic('coin')}<b id="goldVal">${fmt(P.gold)}</b></div>
          <button class="rbtn" data-act="help" aria-label="Help">${ic('help')}</button>
        </div>
      </header>
      <main class="content tab-${ui.tab}">${body}</main>
      <nav class="tabbar">
        ${TABS.map(([id, icn, label]) => `<button class="tabbtn ${ui.tab === id ? 'on' : ''}" data-act="tab" data-arg="${id}"><span class="ti">${ic(icn)}</span><span class="tl">${label}</span></button>`).join('')}
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
      stepsHtml = `<div class="challenge-box"><div>${ic('brain')} <b>Challenge Mode!</b> Work it out on paper or in your head, then type the <b>final answer</b> for +50% gold.</div>
        <button class="btn small" data-act="toGuided">Break it into steps</button></div>`;
    } else {
      stepsHtml = steps.map((st, i) => {
        if (i < q.step || q.done) {
          const c = q.credits[i];
          const mark = c === 1 ? '<span class="sn ok">✓</span>' : c > 0 ? '<span class="sn part">✓</span>' : '<span class="sn shown">!</span>';
          return `<div class="step done">${mark}<div class="sq">${st.q}</div><div class="sa">${ansFmt(st, st.a)}</div></div>`;
        }
        if (i === q.step) {
          return `<div class="step cur"><span class="sn">${i + 1}</span><div class="sq"><small>Step ${i + 1} of ${steps.length}</small><br>${st.q}
            ${q.hint || q.reveal != null ? `<div class="hint">${ic('bulb')} ${st.hint}</div>` : ''}</div></div>`;
        }
        return `<div class="step later"><span class="sn">${i + 1}</span><div class="sq">Step ${i + 1} ${ic('lock')}</div></div>`;
      }).join('');
    }
    const cur = q.mode === 'challenge' ? p.final : steps[Math.min(q.step, steps.length - 1)];
    let right;
    if (q.done) {
      right = questDonePanel(q);
    } else if (q.reveal != null) {
      right = `<div class="reveal card">
        <div class="big-art sm">${Art.npc('Wizard Wren')}</div>
        <p>That one was tricky! The answer is</p>
        <div class="reveal-ans">${ansFmt(cur, q.reveal)}</div>
        <p class="hint">${ic('bulb')} ${cur.hint.replace('?', ansFmt(cur, q.reveal))}</p>
        <button class="btn big primary" data-act="revealOk">Got it! Next step</button>
      </div>`;
    } else {
      right = `<div class="answer-area card">
        <div class="answer-row">
          ${cur.money ? '<span class="prefix">$</span>' : ''}
          <div class="answer-box ${q.input ? '' : 'empty'}" id="ansBox">${q.input || '?'}</div>
          ${cur.unit ? `<span class="ans-unit">${cur.unit}</span>` : ''}
        </div>
        <div class="feedback ${q.fbCls}" id="fb">${q.fb}</div>
        <div class="keypad">
          ${['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫'].map((k) => `<button class="key ${k === '⌫' ? 'del' : ''}" data-act="key" data-arg="${k}">${k}</button>`).join('')}
        </div>
        <button class="btn big check" data-act="check">Check ✓</button>
        ${q.mode === 'guided' && !q.hint ? `<button class="btn small hint-btn" data-act="hint">${ic('bulb')} Hint <small>(half gold for this step)</small></button>` : ''}
      </div>`;
    }
    return `<div class="quest-wrap">
      <section class="card quest-card">
        <div class="quest-head">
          <div class="giver">${Art.npc(p.giver[0])}</div>
          <div class="qh-text"><div class="quest-from">Quest from ${p.giver[0]}</div><div class="quest-title">${p.title}</div></div>
          ${q.done ? '' : `<div class="reward-chip">${ic('coin')}${fmt(questPreview(q))}</div>`}
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
    const best = q.perfect && P.stats.streak > 1 ? `<div class="streak-msg">${ic('fire')} ${P.stats.streak} in a row!</div>` : '';
    return `<div class="done-panel card">
      <div class="big-art bounce">${q.perfect ? Art.icon('star') : Art.icon('trophy')}</div>
      <h2 class="ttl">${q.perfect ? 'Perfect!' : 'Quest complete!'}</h2>
      <div class="gold-won">+${fmt(q.reward)} ${ic('coin')}</div>
      ${best}
      <div class="breakdown">${q.breakdown.map((b) => `<div>${b}</div>`).join('')}</div>
      <button class="btn big primary" data-act="nextQuest">Next Quest</button>
      <div class="row-btns">
        <button class="btn" data-act="tab" data-arg="shop">${ic('shop')} Shop</button>
        <button class="btn" data-act="tab" data-arg="adventure">${ic('sword2')} Battle</button>
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
          setFb("Let's break it into steps together!", 'info');
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
      else if (q.tries === 2) { q.hint = true; setFb("Not quite. Here's a hint!", 'bad'); }
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
    else { Sfx.play('correct'); setFb(pick(['Correct!', 'Nice!', 'Yes!', 'Great job!']), 'good'); }
  }

  function finishQuest() {
    const q = ui.quest;
    const steps = q.p.steps.length;
    const base = questBase(q);
    const breakdown = [];
    let frac;
    if (q.chFactor) {
      frac = q.chFactor;
      breakdown.push(q.chFactor > 1 ? 'Challenge bonus +50%' : 'Challenge solved');
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
    if (streakB > 1) breakdown.push(`${ic('fire')} Streak bonus +${Math.round((streakB - 1) * 100)}%`);
    const pet = D.petMods(P.pet).gold;
    if (pet > 1) breakdown.push(`${D.PETS.find((x) => x.id === P.pet).name} bonus +${Math.round((pet - 1) * 100)}%`);
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
      c.innerHTML = ic('coin');
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
        const known = a === currentArea() + 1;
        return `<div class="area-card locked">
          <div class="area-bg dim">${known ? Art.scene(A.id) : ''}</div>
          <div class="area-lock">${ic('lock')}<div><h3 class="ttl">${known ? A.name : '???'}</h3><small>Beat ${D.AREAS[a - 1].boss.name} to unlock</small></div></div>
        </div>`;
      }
      const nodes = [];
      let got = 0;
      for (let s = 0; s < D.STAGES_PER_AREA; s++) {
        const boss = s === D.STAGES_PER_AREA - 1;
        const un = isUnlocked(a, s), cl = isCleared(a, s);
        got += starsAt(a, s);
        const face = !un ? ic('lock') : boss ? Art.monster(A.boss.name) : `<b>${s + 1}</b>`;
        nodes.push(`<div class="node-wrap ${boss ? 'boss' : ''}"><button class="node ${boss ? 'boss' : ''} ${cl ? 'cleared' : ''} ${un ? '' : 'locked'} ${un && !cl ? 'next' : ''}" ${un ? `data-act="preBattle" data-arg="${a}-${s}"` : 'disabled'} aria-label="${stageLabel(a, s)}">${face}</button>${cl ? starRow(starsAt(a, s)) : ''}</div>`);
      }
      const done = isCleared(a, D.STAGES_PER_AREA - 1);
      return `<div class="area-card">
        <div class="area-bg">${Art.scene(A.id)}</div>
        <div class="area-head">
          <div><h3 class="ttl">${A.name}</h3><small>${done ? 'Cleared! Battle again for XP and stars' : `${a + 1} of ${D.AREAS.length}`}</small></div>
          <div class="area-stars">${ic('star')}<b>${got}/${D.STAGES_PER_AREA * 3}</b></div>
        </div>
        <div class="nodes">${nodes.join('<span class="path"></span>')}</div>
      </div>`;
    }).join('');
    const tower = towerUnlocked()
      ? `<div class="area-card tower">
          <div class="area-bg">${Art.scene('tower')}</div>
          <div class="area-head"><div><h3 class="ttl">Endless Tower</h3><small>Best floor: ${P.towerBest}. How high can you climb?</small></div></div>
          <div class="tower-go"><button class="btn big primary" data-act="preTower">Climb to floor ${P.towerBest + 1}</button></div></div>`
      : `<div class="area-card locked"><div class="area-bg dim"></div><div class="area-lock">${ic('tower')}<div><h3 class="ttl">???</h3><small>A secret appears after you save the kingdom…</small></div></div></div>`;
    return `<div class="story-banner card"><div class="sb-art">${Art.monster('Count Zero')}</div><div><b>Count Zero</b> stole the kingdom's numbers! Battle your way to the Cloud Castle and stop him.</div></div>
      <div class="areas">${areas}${tower}</div>`;
  }

  function partyStates() { return P.party.map((id) => P.heroes[id]); }

  function chanceInfo(c) {
    if (c >= 0.9) return ['easy', 'Easy win!'];
    if (c >= 0.6) return ['good', 'Good chance to win'];
    if (c >= 0.3) return ['tough', 'Tough fight!'];
    if (c > 0) return ['hard', 'Very dangerous!'];
    return ['nope', 'Too strong for now!'];
  }

  function preBattle(kind, a, s) {
    const battle = kind === 'tower' ? D.towerBattle(P.towerBest + 1) : D.stageBattle(a, s);
    const chance = BE.winChance(partyStates(), battle, P.pet, 30);
    const [cls, msg] = chanceInfo(chance);
    const title = kind === 'tower' ? `Endless Tower – Floor ${P.towerBest + 1}` : `${D.AREAS[a].name} – ${stageLabel(a, s)}`;
    const tip = chance < 0.6
      ? `<div class="tip">${ic('bulb')} Tip: Solve <b>Quests</b> for gold, then buy better gear in the <b>Shop</b>!</div>` : '';
    const pet = P.pet ? D.PETS.find((x) => x.id === P.pet) : null;
    const roster = D.battleRoster(battle);
    const waves = battle.waves.length;
    const prevStars = kind === 'stage' && isCleared(a, s) ? `<div class="pb-stars">Best: ${starRow(starsAt(a, s))}</div>` : '';
    openModal(`<div class="prebattle">
      <h2 class="ttl">${title}</h2>
      <div class="pb-waves">${waves} waves${battle.boss ? ' · <b>BOSS</b> in the last wave!' : ''}</div>
      <div class="pb-row enemies">${roster.map((e) => `<div class="pb-unit ${e.boss ? 'boss' : ''}"><div class="pb-art">${Art.monster(e.name)}</div><small>${e.name}</small></div>`).join('')}</div>
      <div class="vs">VS</div>
      <div class="pb-row">${P.party.map((id) => `<div class="pb-unit"><div class="pb-art">${Art.hero(id)}</div><small>${D.HEROES[id].name} <span class="lvl-tag">${P.heroes[id].level}</span></small></div>`).join('')}
        ${pet ? `<div class="pb-unit pb-pet"><div class="pb-art">${Art.pet(pet.id)}</div><small>${pet.name}</small></div>` : ''}</div>
      <div class="chance ${cls}">${msg}</div>
      ${prevStars}
      ${tip}
      <div class="row-btns">
        <button class="btn" data-act="closeModal">Not yet</button>
        ${chance < 0.6 ? `<button class="btn" data-act="tab" data-arg="shop">${ic('shop')} Shop</button>` : ''}
        <button class="btn big primary" data-act="fight" data-arg="${kind}:${a}-${s}">Fight!</button>
      </div>
    </div>`);
  }

  /* ================= Battle ================= */
  // Formation slots: [x as share of width, depth 0 (back) .. 1 (front)]
  const HERO_SLOTS = {
    1: [[0.3, 0.55]],
    2: [[0.33, 0.62], [0.18, 0.25]],
    3: [[0.34, 0.5], [0.2, 0.12], [0.19, 0.9]],
    4: [[0.37, 0.45], [0.25, 0.05], [0.24, 0.92], [0.11, 0.48]],
  };
  const MON_SLOTS = {
    1: [[0.7, 0.5]],
    2: [[0.67, 0.6], [0.83, 0.22]],
    3: [[0.65, 0.5], [0.8, 0.12], [0.81, 0.92]],
    4: [[0.63, 0.45], [0.76, 0.05], [0.77, 0.92], [0.9, 0.5]],
  };
  const BOSS_SLOTS = [[0.64, 0.05], [0.79, 0.5], [0.64, 0.95]];
  const TICK = 0.05;

  function startBattle(kind, a, s) {
    ui.modal = null;
    $('#toasts').innerHTML = '';
    const floor = P.towerBest + 1;
    const battle = kind === 'tower' ? D.towerBattle(floor) : D.stageBattle(a, s);
    const b = new BE.Battle(partyStates(), battle, P.pet, { auto: !!P.autoUlt });
    const sceneId = kind === 'tower' ? 'tower' : D.AREAS[a].id;
    ui.battle = { b, battle, kind, a, s, floor, sceneId, speed: P.speed || 1, ended: false, raf: 0, paused: false, freeze: 0, els: {}, pos: {}, vis: [], endShown: false, hintShown: {} };
    ui.screen = 'battle';
    drawBattle();
    startLoop();
  }

  function cardHtml(h) {
    const H = D.HEROES[h.cls];
    return `<button class="hcard" id="c_${h.uid}" data-uid="${h.uid}" style="--hc:${H.color}" aria-label="${BE.ULTS[h.cls].name}">
      <div class="hc-port">${Art.hero(h.cls)}</div>
      <div class="hc-info"><div class="hc-ult">${BE.ULTS[h.cls].name}</div>
        <div class="hc-bar hp"><i></i></div><div class="hc-bar en"><i></i></div></div>
      <div class="hc-tap">TAP!</div><div class="hc-ko">KO</div>
    </button>`;
  }

  function drawBattle() {
    const B = ui.battle, b = B.b;
    const title = B.kind === 'tower' ? `Endless Tower · Floor ${B.floor}` : `${D.AREAS[B.a].name} · ${stageLabel(B.a, B.s)}`;
    app.innerHTML = `<div class="battle" id="battle">
      <div class="b-bg">${Art.scene(B.sceneId)}</div>
      <div class="b-shake" id="shake"><div class="b-field" id="field"></div><div id="fx"></div></div>
      <div class="b-top">
        <div class="b-title"><b>${title}</b><span class="wave-pill" id="waveLbl"></span></div>
        <div class="b-ctrl">
          <button class="cbtn ${P.autoUlt ? 'on' : ''}" id="autoBtn" title="Use super powers automatically">${ic('bolt')}<span>Auto</span></button>
          <button class="cbtn" id="speedBtn">${ic('speed')}<span>${B.speed}x</span></button>
          <button class="cbtn" id="pauseBtn" aria-label="Pause">${ic('pause')}</button>
        </div>
      </div>
      <div class="boss-bar" id="bossBar"><div class="bb-art"></div><div class="bb-body"><div class="bb-name"></div><div class="bb-track"><i></i></div></div></div>
      <div class="b-banner" id="banner"></div>
      <div class="b-warn" id="warn"></div>
      <div class="b-cards" id="cards">${b.heroes.map(cardHtml).join('')}</div>
      <div class="cutin" id="cutin"></div>
      <div id="bModal"></div>
    </div>`;
    const field = $('#field');
    b.heroes.forEach((h, i) => addUnit(h, i));
    if (P.pet) {
      const el = document.createElement('div');
      el.className = 'unit pet';
      el.id = 'petUnit';
      el.innerHTML = `<div class="u-in"><div class="u-art">${Art.pet(P.pet)}</div></div>`;
      field.appendChild(el);
    }
    layout();
    $('#autoBtn').onclick = () => {
      P.autoUlt = !P.autoUlt; B.b.auto = P.autoUlt; save();
      $('#autoBtn').classList.toggle('on', P.autoUlt);
      toast(P.autoUlt ? 'Auto: heroes use super powers by themselves.' : 'Auto off: tap a glowing hero card to use a super power!', 'good');
    };
    $('#speedBtn').onclick = () => {
      B.speed = B.speed >= 3 ? 1 : B.speed + 1;
      P.speed = B.speed; save();
      $('#speedBtn span').textContent = B.speed + 'x';
    };
    $('#pauseBtn').onclick = () => pauseBattle(true);
    $('#cards').onclick = (e) => {
      const c = e.target.closest('.hcard');
      if (c) tryUlt(c.dataset.uid);
    };
    updateHud();
  }

  function addUnit(u, slot) {
    const B = ui.battle;
    const el = document.createElement('div');
    const info = u.side === 'hero' ? {} : Art.monsterInfo(u.name);
    el.className = `unit ${u.side}${u.boss ? ' boss' : ''}${info.fly ? ' fly' : ''}`;
    el.id = 'u_' + u.uid;
    el.dataset.slot = slot;
    const art = u.side === 'hero' ? Art.hero(u.cls) : Art.monster(u.name);
    el.innerHTML = `<div class="u-in"><div class="u-bar"><i></i></div><div class="u-art">${art}</div><div class="u-shield"></div><div class="u-burn"></div><div class="u-alert">!</div></div>`;
    el.style.setProperty('--d', (Math.random() * 1.2).toFixed(2) + 's');
    $('#field').appendChild(el);
    B.els[u.uid] = el;
    return el;
  }

  function layout() {
    const B = ui.battle;
    if (!B) return;
    const b = B.b, W = window.innerWidth, H = window.innerHeight;
    const cards = $('#cards');
    const cardsTop = cards ? cards.getBoundingClientRect().top : H;
    // Where the scene's ground starts (scene is 400x225, slice, bottom aligned, ground at y=140).
    const sc = Math.max(W / 400, H / 225);
    const groundY = H - 225 * sc + 140 * sc;
    let bandBottom = cardsTop - 6, bandTop = groundY + H * 0.02;
    const minBand = H * 0.17;
    if (bandBottom - bandTop < minBand) bandTop = bandBottom - minBand;
    const portrait = H > W * 1.15;
    const size = Math.max(54, Math.min(W * (portrait ? 0.21 : 0.14), (bandBottom - 70) * 0.36, 170));
    B.size = size;
    const place = (u, el, x, d, s) => {
      const fx = x * W, fy = bandTop + d * (bandBottom - bandTop);
      el.style.width = el.style.height = s + 'px';
      el.style.left = fx - s / 2 + 'px';
      el.style.top = fy - s + 'px';
      el.style.zIndex = 10 + Math.round(fy);
      B.pos[u.uid] = { x: fx, y: fy, s };
    };
    const hs = HERO_SLOTS[b.heroes.length] || HERO_SLOTS[4];
    b.heroes.forEach((h, i) => { const el = B.els[h.uid]; if (el) place(h, el, hs[i][0], hs[i][1], size); });
    const mons = b.monsters;
    const hasBoss = mons.some((m) => m.boss);
    const slots = hasBoss ? BOSS_SLOTS : MON_SLOTS[mons.length] || MON_SLOTS[4];
    mons.forEach((m, i) => {
      const el = B.els[m.uid];
      if (el) place(m, el, slots[i][0], slots[i][1], m.boss ? size * 1.65 : size);
    });
    const pet = $('#petUnit');
    if (pet) place({ uid: 'pet' }, pet, 0.05, 0.98, size * 0.55);
  }

  function center(uid) {
    const p = ui.battle.pos[uid];
    if (!p) return null;
    return { x: p.x, y: p.y - p.s * 0.48, s: p.s, feet: p.y };
  }

  function startLoop() {
    const B = ui.battle;
    let last = performance.now(), acc = 0;
    function frame(t) {
      if (ui.battle !== B || B.ended) return;
      const rdt = Math.min(0.1, (t - last) / 1000);
      last = t;
      if (!B.paused) {
        if (B.freeze > 0) B.freeze -= rdt;
        else if (!B.b.over) {
          acc += rdt * B.speed;
          while (acc >= TICK && !B.b.over && B.freeze <= 0 && !B.paused) {
            acc -= TICK;
            handleEvents(B.b.step(TICK));
            runVis();
          }
        }
      }
      updateHud();
      if (B.b.over && !B.endShown) {
        B.endShown = true;
        setTimeout(() => { if (ui.battle === B) endBattle(B.b.winner === 'hero', false); }, 1500);
      }
      B.raf = requestAnimationFrame(frame);
    }
    B.raf = requestAnimationFrame(frame);
  }

  // Visual effects timed in battle time (so they line up with impacts at any speed).
  function vis(delay, fn) { const B = ui.battle; B.vis.push({ at: B.b.time + delay, fn }); }
  function runVis() {
    const B = ui.battle;
    if (!B.vis.length) return;
    const now = B.b.time;
    const due = B.vis.filter((v) => v.at <= now);
    if (!due.length) return;
    B.vis = B.vis.filter((v) => v.at > now);
    for (const v of due) v.fn();
  }
  const ms = (sec) => (sec * 1000) / ui.battle.speed;

  function updateHud() {
    const B = ui.battle, b = B.b;
    for (const u of b.units()) {
      const el = B.els[u.uid];
      if (!el) continue;
      const pct = Math.max(0, (u.hp / u.maxHp) * 100);
      const bar = el.querySelector('.u-bar i');
      bar.style.width = pct + '%';
      bar.classList.toggle('low', pct < 30);
    }
    for (const h of b.heroes) {
      const c = document.getElementById('c_' + h.uid);
      if (!c) continue;
      c.querySelector('.hp i').style.width = Math.max(0, (h.hp / h.maxHp) * 100) + '%';
      c.querySelector('.en i').style.width = Math.min(100, h.energy) + '%';
      const ready = b.canUlt(h.uid);
      c.classList.toggle('ready', ready);
      c.classList.toggle('ko', !h.alive);
      if (ready && !P.autoUlt && !P.tips.ult && !B.paused && !b.over) showUltTip(h);
    }
    const boss = b.monsters.find((m) => m.boss);
    const bb = $('#bossBar');
    if (bb) {
      bb.classList.toggle('show', !!boss && boss.alive);
      if (boss) bb.querySelector('.bb-track i').style.width = Math.max(0, (boss.hp / boss.maxHp) * 100) + '%';
    }
  }

  /* ---------- player actions ---------- */
  function tryUlt(uid) {
    const B = ui.battle;
    if (!B || B.paused || B.b.over) return;
    if (B.b.useUlt(uid)) handleEvents(B.b.drain());
    else {
      const h = B.b.heroes.find((x) => x.uid === uid);
      const c = document.getElementById('c_' + uid);
      if (c) { c.classList.remove('nope'); void c.offsetWidth; c.classList.add('nope'); }
      if (h && h.alive && h.energy < 100) toast(`${D.HEROES[h.cls].name}'s super power is still charging…`, '');
    }
  }

  function pauseBattle(on) {
    const B = ui.battle;
    if (!B || B.b.over) return;
    B.paused = on;
    const m = $('#bModal');
    if (!on) { m.innerHTML = ''; return; }
    m.innerHTML = `<div class="modal-back"><div class="modal"><div class="intro">
      <h2 class="ttl">Paused</h2>
      <p>Take a breather! Your heroes will wait.</p>
      <div class="row-btns"><button class="btn" id="fleeBtn">${ic('flag')} Retreat</button><button class="btn big primary" id="resumeBtn">${ic('play')} Keep fighting</button></div>
    </div></div></div>`;
    $('#resumeBtn').onclick = () => pauseBattle(false);
    $('#fleeBtn').onclick = () => {
      if (B.ended) return;
      $('#bModal').innerHTML = '';
      B.ended = true; cancelAnimationFrame(B.raf);
      endBattle(false, true);
    };
  }

  function showUltTip(h) {
    const B = ui.battle;
    P.tips.ult = true; save();
    B.paused = true;
    const c = document.getElementById('c_' + h.uid);
    const r = c.getBoundingClientRect();
    const m = $('#bModal');
    m.innerHTML = `<div class="tip-layer"><div class="tip-bubble" style="left:${Math.min(window.innerWidth - 300, Math.max(10, r.left - 40))}px;bottom:${window.innerHeight - r.top + 18}px">
      <div class="tb-art">${Art.hero(h.cls)}</div>
      <div><b>${D.HEROES[h.cls].name}'s SUPER POWER is ready!</b><br>Tap the glowing card to use <b>${BE.ULTS[h.cls].name}</b>.<br><small>${BE.ULTS[h.cls].desc}</small></div>
      <button class="btn primary" id="tipOk">OK!</button></div></div>`;
    $('#tipOk').onclick = () => { m.innerHTML = ''; B.paused = false; };
  }

  /* ---------- effects ---------- */
  function fx(cls, x, y, html, life, style) {
    const d = document.createElement('div');
    d.className = 'fx ' + cls;
    d.style.left = x + 'px'; d.style.top = y + 'px';
    if (style) for (const k in style) d.style.setProperty(k, style[k]);
    if (html) d.innerHTML = html;
    $('#fx').appendChild(d);
    setTimeout(() => d.remove(), life || 900);
    return d;
  }
  function shake(power) {
    const s = $('#shake');
    if (!s || !s.animate) return;
    const p = power || 8;
    s.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${-p}px,${p / 2}px)` }, { transform: `translate(${p}px,${-p / 2}px)` }, { transform: `translate(${-p / 2}px,${p / 3}px)` }, { transform: 'translate(0,0)' }], { duration: 320 });
  }
  function flash(color) {
    const f = fx('screen-flash', 0, 0, '', 400);
    if (color) f.style.background = color;
  }
  function banner(text, cls, life) {
    const el = $('#banner');
    if (!el) return;
    el.className = 'b-banner ' + (cls || '');
    el.innerHTML = text;
    void el.offsetWidth; el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), life || 1500);
  }
  function warn(text) {
    const el = $('#warn');
    if (!el) return;
    if (!text) { el.classList.remove('show'); return; }
    el.innerHTML = text; el.classList.add('show');
  }
  function num(uid, text, cls) {
    const c = center(uid);
    if (!c) return;
    fx('num ' + (cls || ''), c.x + (Math.random() * 50 - 25), c.y - c.s * 0.3 + (Math.random() * 24 - 12), `<span>${text}</span>`, 1100);
  }
  function burst(x, y, color, n, spread) {
    for (let i = 0; i < (n || 6); i++) {
      const a = Math.random() * Math.PI * 2, r = (spread || 50) * (0.5 + Math.random() * 0.7);
      fx('spark', x, y, '', 650, { '--dx': Math.cos(a) * r + 'px', '--dy': Math.sin(a) * r + 'px', '--c': color });
    }
  }
  function puff(x, y, n, size) {
    for (let i = 0; i < (n || 5); i++) {
      const a = Math.random() * Math.PI * 2, r = 20 + Math.random() * 30;
      fx('puff', x, y, '', 800, { '--dx': Math.cos(a) * r + 'px', '--dy': Math.sin(a) * r - 15 + 'px', '--s': (size || 1) * (0.7 + Math.random() * 0.6) });
    }
  }
  const PROJ = {
    arrow: '<svg viewBox="0 0 40 12"><path d="M2 6 L32 6" stroke="#6b4228" stroke-width="2.6" stroke-linecap="round"/><path d="M30 1 L40 6 L30 11 Z" fill="#d3dce6" stroke="#2b1b17" stroke-width="1.4"/><path d="M2 6 L-2 1 M2 6 L-2 11 M6 6 L2 1 M6 6 L2 11" stroke="#e8463c" stroke-width="2.2"/></svg>',
    fireball: '<div class="orb fire"></div>', fire: '<div class="orb fire"></div>', sparkle: '<div class="orb gold"></div>', magic: '<div class="orb purple"></div>',
    spit: '<div class="orb green"></div>', web: '<div class="orb web"></div>', ice: '<div class="orb ice"></div>', feather: '<div class="orb feather"></div>', wind: '<div class="orb wind"></div>',
  };
  function projectile(kind, from, to, dur, arc) {
    if (!from || !to) return;
    const el = fx('proj ' + kind, from.x, from.y, PROJ[kind] || PROJ.magic, dur + 60);
    if (!el.animate) return;
    const dx = to.x - from.x, dy = to.y - from.y;
    const ang = Math.atan2(dy, dx) * 180 / Math.PI;
    const lift = arc ? -Math.min(120, Math.abs(dx) * 0.25) : 0;
    const frames = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4;
      const x = dx * t, y = dy * t + lift * 4 * t * (1 - t);
      const slope = arc ? Math.atan2(dy + lift * 4 * (1 - 2 * t), dx) * 180 / Math.PI : ang;
      frames.push({ transform: `translate(${x}px,${y}px) rotate(${kind === 'arrow' || kind === 'ice' ? slope : 0}deg)` });
    }
    el.animate(frames, { duration: dur, easing: 'linear', fill: 'forwards' });
  }
  function beam(from, to, color, dur) {
    if (!from || !to) return;
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx) * 180 / Math.PI;
    fx('beam', from.x, from.y, '', dur || 300, { width: len + 'px', transform: `rotate(${ang}deg)`, '--c': color || '#5af0ff' });
  }
  function lunge(uid, tuid, dur) {
    const B = ui.battle, el = B.els[uid];
    const a = B.pos[uid], t = B.pos[tuid];
    if (!el || !a || !t || !el.animate) return;
    const dir = Math.sign(t.x - a.x) || 1;
    const dx = t.x - a.x - dir * (t.s * 0.55 + a.s * 0.2), dy = t.y - a.y;
    const inner = el.querySelector('.u-in');
    inner.animate([
      { transform: 'translate(0,0)' },
      { transform: `translate(${dx * 0.85}px,${dy * 0.85 - 18}px)`, offset: 0.55 },
      { transform: `translate(${dx}px,${dy}px)`, offset: 0.75 },
      { transform: `translate(${dx * 0.92}px,${dy * 0.92}px)`, offset: 0.85 },
      { transform: 'translate(0,0)' },
    ], { duration: dur * 1.9, easing: 'ease-out' });
  }
  function pose(uid, cls, dur) {
    const el = ui.battle.els[uid];
    if (!el) return;
    el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
    setTimeout(() => el.classList.remove(cls), dur || 400);
  }
  function hurt(uid) {
    const el = ui.battle.els[uid];
    if (!el) return;
    const art = el.querySelector('.u-art');
    art.classList.remove('hurt'); void art.offsetWidth; art.classList.add('hurt');
  }

  const SKILL_LABEL = { 'Shield Bash!': 1, 'Double Strike!': 1, 'Dragon Breath!': 1, 'Group Heal!': 1, 'Heavy Hit!': 1 };

  /* ---------- event playback ---------- */
  function handleEvents(events) {
    const B = ui.battle;
    for (const ev of events) {
      switch (ev.type) {
        case 'wave': onWave(ev); break;
        case 'act': onAct(ev); break;
        case 'hit': onHit(ev); break;
        case 'ult': onUlt(ev); break;
        case 'charge': {
          const el = B.els[ev.src];
          if (el) el.classList.add('charging');
          const u = B.b.unit(ev.src);
          const knight = B.b.heroes.find((h) => h.cls === 'knight' && h.alive);
          let extra = '';
          if (knight) {
            extra = B.b.canUlt(knight.uid) ? '<br><span class="w-tip">Tap Sir Bolt\'s <b>Shield Wall</b> now to block it!</span>' : knight.shield > 0 ? '<br><span class="w-tip">Shield Wall is up!</span>' : '';
            const c = document.getElementById('c_' + knight.uid);
            if (c) c.classList.add('urgent');
          }
          warn(`${ic('bolt')} <b>${u ? u.name : 'Boss'}</b> is winding up <b>${ev.name}</b>!${extra}`);
          Sfx.play('alarm');
          break;
        }
        case 'rage': {
          const el = B.els[ev.src];
          if (el) el.classList.add('raged');
          const u = B.b.unit(ev.src);
          banner(`${esc(u.name)} is ANGRY!`, 'rage', 1600);
          shake(10);
          Sfx.play('boss');
          break;
        }
        case 'status': {
          const el = B.els[ev.uid];
          if (el) el.classList.toggle(ev.s === 'shield' ? 'shielded' : 'burning', ev.on);
          break;
        }
        case 'regen':
          for (const h of ev.hits) if (h.heal > 0) num(h.uid, '+' + h.heal, 'heal small');
          break;
        case 'waveClear':
          banner('Wave cleared!', 'good', 1400);
          Sfx.play('win');
          for (const h of ev.hits) num(h.uid, '+' + h.heal, 'heal');
          for (const h of B.b.alive('hero')) { const c = center(h.uid); if (c) burst(c.x, c.y, '#7dff9a', 5, 40); }
          break;
        case 'end': onEnd(ev); break;
      }
    }
  }

  function onWave(ev) {
    const B = ui.battle;
    // Clear out the last wave's monsters.
    for (const uid of Object.keys(B.els)) if (uid.startsWith('m_')) { B.els[uid].remove(); delete B.els[uid]; delete B.pos[uid]; }
    ev.units.forEach((m, i) => { const el = addUnit(m, i); el.classList.add('enter'); setTimeout(() => el.classList.remove('enter'), 1200); });
    layout();
    $('#waveLbl').textContent = `Wave ${ev.idx + 1}/${ev.total}`;
    if (ev.boss) {
      const boss = ev.units.find((m) => m.boss);
      const bb = $('#bossBar');
      bb.querySelector('.bb-art').innerHTML = Art.monster(boss.name);
      bb.querySelector('.bb-name').textContent = boss.name;
      banner(`<small>BOSS BATTLE</small>${esc(boss.name)}`, 'boss', 2000);
      Sfx.play('boss');
      setTimeout(() => shake(14), 700);
    } else {
      banner(ev.idx === ev.total - 1 && ev.total > 1 ? 'Final wave!' : `Wave ${ev.idx + 1}`, '', 1200);
      Sfx.play('wave');
    }
  }

  function onAct(ev) {
    const B = ui.battle;
    const d = ms(ev.dur);
    const from = center(ev.src);
    if (ev.skill && SKILL_LABEL[ev.skill]) {
      const c = center(ev.src);
      if (c) fx('skill-tag', c.x, c.y - c.s * 0.75, `<span>${ev.skill}</span>`, 1000);
    }
    switch (ev.kind) {
      case 'melee':
        if (ev.targets[0]) lunge(ev.src, ev.targets[0], d);
        break;
      case 'shoot':
        pose(ev.src, 'cast', 350);
        Sfx.play('shoot');
        for (const t of ev.targets) {
          if (ev.fx === 'laser') vis(ev.dur * 0.8, () => beam(center(ev.src), center(t), '#ff5a5a', ms(0.25)));
          else projectile(ev.fx, from, center(t), d, ev.fx === 'arrow' || ev.fx === 'spit' || ev.fx === 'web');
        }
        break;
      case 'cast':
        pose(ev.src, 'cast', 450);
        Sfx.play('shoot');
        if (ev.fx === 'breath') {
          for (let i = 0; i < 9; i++) {
            const t = ev.targets[i % ev.targets.length];
            const tc = center(t);
            if (tc) setTimeout(() => projectile('fire', { x: from.x + 20, y: from.y - 10 }, { x: tc.x + (Math.random() * 40 - 20), y: tc.y + (Math.random() * 40 - 20) }, d * 0.7), i * d * 0.03);
          }
        } else for (const t of ev.targets) projectile(ev.fx, from, center(t), d, false);
        break;
      case 'heal':
        pose(ev.src, 'cast', 400);
        for (const t of ev.targets) projectile('sparkle', from, center(t), d, true);
        break;
      case 'slam': {
        const el = B.els[ev.src];
        if (el) { el.classList.remove('charging'); pose(ev.src, 'slamming', 700); }
        warn('');
        document.querySelectorAll('.hcard.urgent').forEach((c) => c.classList.remove('urgent'));
        const s = B.b.unit(ev.src);
        if (s && s.fx) for (const t of ev.targets) projectile(s.fx === 'laser' ? 'magic' : s.fx, from, center(t), d, true);
        break;
      }
    }
  }

  const IMPACT = {
    slash: '#ffffff', bash: '#ffd84a', claw: '#ffffff', bite: '#ffffff', arrow: '#ffe7a0', fireball: '#ff9a3a', fire: '#ff7a1a', sparkle: '#fff27a',
    magic: '#c98cff', spit: '#9dff6a', web: '#ffffff', ice: '#9ff0ff', laser: '#ff6a6a', wind: '#d8e6ff', feather: '#e6cfa0', slam: '#ffb347',
    meteor: '#ff7a1a', arrowrain: '#ffe7a0', shadow: '#b58cff', inferno: '#ff5a1a', burn: '#ff7a1a',
  };
  function onHit(ev) {
    const B = ui.battle;
    if (ev.big) shake(ev.fx === 'meteor' || ev.fx === 'slam' || ev.fx === 'inferno' ? 14 : 7);
    if (ev.fx === 'slam') { flash('rgba(255,120,60,.35)'); Sfx.play('slam'); }
    if (ev.fx === 'meteor') { flash('rgba(255,200,120,.5)'); Sfx.play('boom'); }
    let blocked = false;
    for (const h of ev.hits) {
      const c = center(h.uid);
      if (h.revive) {
        const el = B.els[h.uid];
        if (el) { el.classList.remove('ko'); pose(h.uid, 'revived', 1200); }
        if (c) fx('pillar', c.x, c.feet, '', 1200);
        num(h.uid, 'REVIVED!', 'heal big');
        Sfx.play('unlock');
        continue;
      }
      if (h.heal != null) {
        if (h.heal > 0) num(h.uid, '+' + h.heal, 'heal');
        if (c) burst(c.x, c.y, '#7dff9a', 4, 36);
        Sfx.play('heal');
        continue;
      }
      if (h.blocked) blocked = true;
      const label = (h.crit ? 'CRIT ' : '') + h.dmg;
      num(h.uid, label, (h.crit ? 'crit' : '') + (h.burn ? ' burn' : '') + (B.b.unit(h.uid) && B.b.unit(h.uid).side === 'hero' ? ' ouch' : ''));
      hurt(h.uid);
      if (c && !h.burn) {
        const col = IMPACT[ev.fx] || '#ffffff';
        if (ev.fx === 'slash' || ev.fx === 'claw' || ev.fx === 'shadow' || ev.fx === 'bash' || ev.fx === 'bite') fx('slash-fx' + (ev.fx === 'shadow' ? ' shadow' : ''), c.x, c.y, '', 400, { '--r': (Math.random() * 60 - 30) + 'deg' });
        else fx('boom', c.x, c.y, '', 450, { '--c': col });
        burst(c.x, c.y, col, h.crit ? 9 : 5, h.crit ? 70 : 45);
      }
      if (h.killed) onDown(h.uid);
    }
    if (blocked) {
      const knight = B.b.heroes.find((x) => x.cls === 'knight');
      if (knight) num(knight.uid, 'BLOCKED!', 'block');
      if (ev.fx === 'slam') Sfx.play('shield');
    }
    if (ev.hits.some((h) => h.dmg != null && !h.burn)) Sfx.play(ev.hits.some((h) => h.crit) ? 'crit' : 'hit');
  }

  function onDown(uid) {
    const B = ui.battle;
    const el = B.els[uid];
    const c = center(uid);
    const u = B.b.unit(uid);
    if (!el) return;
    if (u && u.side === 'hero') {
      el.classList.add('ko');
      el.classList.remove('shielded');
      if (c) puff(c.x, c.feet - 10, 4, 0.8);
      return;
    }
    el.classList.add('dying');
    el.classList.remove('charging', 'burning');
    if (u && u.boss) { warn(''); document.querySelectorAll('.hcard.urgent').forEach((x) => x.classList.remove('urgent')); }
    setTimeout(() => {
      if (c) { puff(c.x, c.y, u && u.boss ? 10 : 6, u && u.boss ? 1.8 : 1); burst(c.x, c.y, '#ffe066', u && u.boss ? 14 : 7, u && u.boss ? 110 : 60); }
      Sfx.play('poof');
      el.classList.add('gone');
    }, ms(0.3));
  }

  function onUlt(ev) {
    const B = ui.battle;
    const H = D.HEROES[ev.cls];
    const c = $('#cutin');
    c.innerHTML = `<div class="ci-band" style="--hc:${H.color}"><div class="ci-art">${Art.hero(ev.cls)}</div><div class="ci-text"><small>${H.name} uses</small><b>${ev.name}!</b></div></div>`;
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    B.freeze = 0.75;
    Sfx.play('ult');
    pose(ev.src, 'powered', 1400);
    const card = document.getElementById('c_' + ev.src);
    if (card) { card.classList.remove('fired'); void card.offsetWidth; card.classList.add('fired'); }
    const mons = () => B.b.alive('monster').map((m) => center(m.uid)).filter(Boolean);
    const W = window.innerWidth, Hh = window.innerHeight;
    switch (ev.cls) {
      case 'knight':
        vis(0, () => { Sfx.play('shield'); for (const h of B.b.alive('hero')) { const p = center(h.uid); if (p) fx('ring blue', p.x, p.y, '', 700); } });
        break;
      case 'archer':
        for (let v = 0; v < 3; v++) {
          vis(0.25 + v * 0.32, () => {
            for (const m of mons()) for (let k = 0; k < 3; k++) {
              const tx = m.x + (Math.random() * 60 - 30), ty = m.y + (Math.random() * 40 - 20);
              projectile('arrow', { x: tx - 120, y: -40 }, { x: tx, y: ty }, ms(0.25), false);
            }
            Sfx.play('shoot');
          });
        }
        break;
      case 'mage':
        vis(0, () => {
          const ms2 = mons();
          if (!ms2.length) return;
          const cx = ms2.reduce((a, p) => a + p.x, 0) / ms2.length, cy = ms2.reduce((a, p) => a + p.y, 0) / ms2.length;
          const el = fx('meteor', cx - W * 0.35, -120, '<div class="orb meteor-core"></div>', ms(0.9) + 100);
          if (el.animate) el.animate([{ transform: 'translate(0,0) scale(.6)' }, { transform: `translate(${W * 0.35}px,${cy + 120}px) scale(1.2)` }], { duration: ms(0.9), easing: 'ease-in', fill: 'forwards' });
          vis(0.9, () => { fx('blast', cx, cy, '', 800); puff(cx, cy, 10, 2); burst(cx, cy, '#ffb347', 16, 160); });
        });
        break;
      case 'healer':
        vis(0, () => { for (const h of B.b.heroes) { const p = center(h.uid); if (p) fx('pillar gold', p.x, p.feet, '', 1000); } });
        break;
      case 'ninja': {
        const el = B.els[ev.src];
        if (el) { el.classList.add('vanish'); vis(1.25, () => el.classList.remove('vanish')); }
        vis(0, () => { const p = center(ev.src); if (p) puff(p.x, p.y, 6, 1.2); });
        break;
      }
      case 'dragon':
        vis(0, () => {
          const from = center(ev.src);
          for (let i = 0; i < 16; i++) {
            const t = mons()[i % Math.max(1, mons().length)];
            if (t) setTimeout(() => projectile('fire', { x: from.x + 20, y: from.y - 10 }, { x: t.x + (Math.random() * 70 - 35), y: t.y + (Math.random() * 60 - 30) }, ms(0.5)), i * ms(0.02));
          }
        });
        vis(0.7, () => { for (const m of mons()) fx('blast fire', m.x, m.y, '', 700); });
        break;
    }
    void Hh;
  }

  function onEnd(ev) {
    const B = ui.battle;
    warn('');
    const side = ev.winner === 'hero' ? B.b.alive('hero') : B.b.alive('monster');
    for (const u of side) pose(u.uid, 'cheer', 2400);
    banner(ev.winner === 'hero' ? 'VICTORY!' : ev.timeout ? 'Out of time!' : 'Defeated…', ev.winner === 'hero' ? 'win' : 'lose', 1600);
  }

  /* ---------- results ---------- */
  function endBattle(win, fled) {
    const B = ui.battle, b = B.b;
    B.ended = true;
    cancelAnimationFrame(B.raf);
    const lines = [];
    const xpTotal = B.battle.xp;
    const xp = fled ? 0 : win ? xpTotal : Math.round(xpTotal * 0.3);
    const levelUps = [];
    if (xp > 0) {
      for (const id of P.party) {
        const h = P.heroes[id];
        h.xp += xp;
        let up = false;
        while (h.xp >= D.xpToNext(h.level)) { h.xp -= D.xpToNext(h.level); h.level++; up = true; }
        if (up) levelUps.push(`<span class="mini-art">${Art.hero(id)}</span><span>${D.HEROES[id].name} reached <b>level ${h.level}</b>!</span>`);
      }
    }
    // Bestiary: count defeated monsters (every wave), plus super power stats.
    for (const name of Object.keys(b.defeated)) P.bestiary[name] = (P.bestiary[name] || 0) + b.defeated[name];
    P.stats.ults += b.ults;
    P.stats.blocks += b.blocks;

    const stars = win ? b.stars : 0;
    const unlocks = [];
    if (win) {
      P.stats.wins++;
      if (B.kind === 'tower') {
        if (B.floor > P.towerBest) { P.towerBest = B.floor; unlocks.push({ icon: ic('tower'), text: `New record: floor ${B.floor}!` }); }
      } else {
        const key = B.a + '-' + B.s;
        if (stars > (P.stars[key] || 0)) P.stars[key] = stars;
        if (!P.cleared[key]) {
          P.cleared[key] = true;
          if (B.s === D.STAGES_PER_AREA - 1) {
            P.bossesBeaten = Math.max(P.bossesBeaten, B.a + 1);
            const t = maxTier();
            unlocks.push({ icon: ic('shop'), text: `<b>${D.TIERS[t].name}</b> gear is now in the Shop!` });
            if (B.a + 1 < D.AREAS.length) unlocks.push({ icon: ic('map'), text: `New land: <b>${D.AREAS[B.a + 1].name}</b>!` });
            const u = D.BOSS_UNLOCKS[B.a] || {};
            if (u.hero && !P.unlocked.includes(u.hero)) {
              P.unlocked.push(u.hero);
              const top = Math.max(...P.unlocked.map((id) => P.heroes[id].level));
              P.heroes[u.hero].level = Math.max(1, top - 1);
              if (P.party.length < P.partySlots) P.party.push(u.hero);
              unlocks.push({ icon: Art.hero(u.hero), text: `New hero: <b>${D.HEROES[u.hero].name} the ${D.HEROES[u.hero].title}</b> joins you!` });
            }
            if (u.slot) {
              P.partySlots = Math.max(P.partySlots, u.slot);
              const extra = P.unlocked.find((id) => !P.party.includes(id));
              if (extra && P.party.length < P.partySlots) P.party.push(extra);
              unlocks.push({ icon: ic('team'), text: 'Your team can now have <b>4 heroes</b>!' });
            }
            if (u.tower) unlocks.push({ icon: ic('tower'), text: 'You saved the kingdom! The <b>Endless Tower</b> has appeared…' });
          } else {
            unlocks.push({ icon: ic('map'), text: 'Next battle unlocked!' });
          }
        }
      }
    } else if (!fled) P.stats.losses++;
    save();
    const news = checkUnlocks();
    for (const n of news) unlocks.push({ icon: n.icon, text: `<b>${esc(n.title)}</b> – ${esc(n.text)}` });

    if (win) Sfx.play('win'); else if (!fled) Sfx.play('lose');
    if (unlocks.length > 1) setTimeout(() => Sfx.play('unlock'), 900);

    let next = '';
    if (win) {
      if (B.kind === 'tower') next = `<button class="btn big primary" data-act="fight" data-arg="tower:0-0">Next floor</button>`;
      else {
        let na = B.a, ns = B.s + 1;
        if (ns >= D.STAGES_PER_AREA) { na++; ns = 0; }
        if (na < D.AREAS.length && isUnlocked(na, ns)) next = `<button class="btn big primary" data-act="preBattle" data-arg="${na}-${ns}">Next battle</button>`;
      }
    }
    const isBossWin = win && B.kind === 'stage' && B.s === D.STAGES_PER_AREA - 1;
    lines.push(xp ? `<div class="xp-line">${ic('xp')}<span>Each hero earned <b>${xp} XP</b></span></div>` : '');
    const starHtml = win ? `<div class="res-stars">${[0, 1, 2].map((i) => `<span class="rs ${i < stars ? 'on' : ''}" style="animation-delay:${0.35 + i * 0.35}s">${ic(i < stars ? 'star' : 'starEmpty')}</span>`).join('')}</div>
      <div class="star-note">${stars === 3 ? 'Flawless! Nobody was knocked out.' : 'Keep every hero standing for 3 stars!'}</div>` : '';
    const html = `<div class="result ${win ? 'win' : 'lose'}">
      <div class="res-head">${win ? (isBossWin ? 'BOSS DEFEATED!' : 'Victory!') : fled ? 'You retreated' : 'Defeated…'}</div>
      ${starHtml}
      ${!win ? `<div class="big-art sm">${Art.monster(b.monsters.find((m) => m.alive) ? b.monsters.find((m) => m.alive).name : 'Big Grizzly')}</div>` : ''}
      ${!win && !fled ? `<p>The monsters were too strong this time. Solve quests to earn gold and buy better gear!${!P.autoUlt ? ' Don\'t forget to tap your heroes\' <b>super powers</b>.' : ''}</p>` : ''}
      ${lines.join('')}
      ${levelUps.map((l) => `<div class="lvl-line">${l}</div>`).join('')}
      ${unlocks.length ? `<div class="unlocks">${unlocks.map((u, i) => `<div class="unlock" style="animation-delay:${0.4 + i * 0.15}s"><span class="ul-ic">${u.icon}</span><div>${u.text}</div></div>`).join('')}</div>` : ''}
      <div class="row-btns">
        ${win ? '' : `<button class="btn" data-act="goTab" data-arg="quest">${ic('scroll')} Quests</button><button class="btn" data-act="goTab" data-arg="shop">${ic('shop')} Shop</button>`}
        <button class="btn ${win && !next ? 'primary' : ''}" data-act="goTab" data-arg="adventure">${ic('map')} Map</button>
        ${!win && B.kind === 'stage' ? `<button class="btn primary" data-act="fight" data-arg="stage:${B.a}-${B.s}">Try again</button>` : ''}
        ${next}
      </div>
    </div>`;
    if (win) { confetti(); for (let i = 0; i < stars; i++) setTimeout(() => Sfx.play('star'), 450 + i * 350); }
    const m = $('#bModal');
    if (m) m.innerHTML = `<div class="modal-back"><div class="modal">${html}</div></div>`;
  }

  function confetti() {
    const host = $('#fx') || document.body;
    const colors = ['#ffd23f', '#ff5fa2', '#5ab8ff', '#7dff9a', '#ff8a3a', '#b58cff'];
    for (let i = 0; i < 40; i++) {
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = Math.random() * 100 + 'vw';
      c.style.background = colors[i % colors.length];
      c.style.animationDelay = Math.random() * 0.6 + 's';
      c.style.animationDuration = 1.8 + Math.random() * 1.4 + 's';
      host.appendChild(c);
      setTimeout(() => c.remove(), 4000);
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
    if (st.hp) parts.push(`<span>${ic('heart')}+${st.hp}</span>`);
    if (st.atk) parts.push(`<span>${ic('sword')}+${st.atk}</span>`);
    if (st.def) parts.push(`<span>${ic('shield')}+${st.def}</span>`);
    if (st.spd) parts.push(`<span>${ic('speed')}+${st.spd}</span>`);
    return parts.join(' ');
  }
  function heroStatBar(id) {
    const s = D.heroStats(P.heroes[id], P.pet);
    return `<div class="statbar"><span>${ic('heart')}${s.maxHp}</span><span>${ic('sword')}${Math.round(s.atk)}</span><span>${ic('shield')}${Math.round(s.def)}</span><span>${ic('speed')}${Math.round(s.spd)}</span><span class="pow">${ic('power')}${D.heroPower(P.heroes[id], P.pet)}</span></div>`;
  }

  function viewShop() {
    if (!P.unlocked.includes(ui.shopHero)) ui.shopHero = P.unlocked[0];
    const id = ui.shopHero, H = D.HEROES[id], h = P.heroes[id];
    const tabs = P.unlocked.map((hid) => `<button class="hero-tab ${hid === id ? 'on' : ''}" data-act="shopHero" data-arg="${hid}">
      <span class="ht-art">${Art.hero(hid)}</span><small>${D.HEROES[hid].name}${P.party.includes(hid) ? '' : ' <i class="zz">zz</i>'}</small></button>`).join('');
    const mt = maxTier();
    const slots = Object.keys(D.SLOTS).map((slot) => {
      const S = D.SLOTS[slot], cur = h.gear[slot];
      const cards = [];
      for (let t = cur + 1; t <= Math.min(D.MAX_TIER, mt + 1); t++) {
        const st = D.gearStats(slot, t), T = D.TIERS[t];
        if (t > mt) {
          cards.push(`<div class="item locked" style="--tc:${T.color}"><div class="it-tier">${T.name}</div><div class="it-ic">${Art.item(id, slot, T.color)}<span class="it-lock-ic">${ic('lock')}</span></div><div class="it-stats">${statLine(st)}</div><div class="it-lock">${tierUnlockText(t)}</div></div>`);
        } else {
          const price = D.gearPrice(slot, t);
          const trade = cur ? Math.round(D.gearPrice(slot, cur) * 0.25) : 0;
          const cost = price - trade;
          const can = P.gold >= cost;
          cards.push(`<div class="item ${t === mt ? 'best' : ''}" style="--tc:${T.color}">
            ${t === mt ? '<div class="best-tag">BEST</div>' : ''}
            <div class="it-tier">${T.name}</div><div class="it-ic">${Art.item(id, slot, T.color)}</div>
            <div class="it-name">${D.gearName(id, slot, t)}</div>
            <div class="it-stats">${statLine(st)}</div>
            <button class="btn buy ${can ? '' : 'poor'}" data-act="buy" data-arg="${slot}:${t}">${ic('coin')} ${fmt(cost)}</button>
            ${trade ? `<div class="it-trade">(trade-in −${fmt(trade)})</div>` : ''}
          </div>`);
        }
      }
      if (!cards.length) cards.push(`<div class="item maxed"><div class="it-ic">${ic('star')}</div><div>Best gear!</div></div>`);
      const equipped = cur
        ? `<div class="equipped" style="--tc:${D.TIERS[cur].color}"><div class="eq-ic">${Art.item(id, slot, D.TIERS[cur].color)}</div><div><b>${D.gearName(id, slot, cur)}</b><br><small>${statLine(D.gearStats(slot, cur))}</small></div></div>`
        : `<div class="equipped empty"><div class="eq-ic">${Art.item(id, slot, '#bbbbbb')}</div><div><b>No ${S.label.toLowerCase()}</b><br><small>Buy one below!</small></div></div>`;
      return `<div class="slot-sec card"><div class="slot-head"><h3 class="ttl sm">${S.label}</h3>${equipped}</div><div class="items">${cards.join('')}</div></div>`;
    }).join('');
    return `<div class="shop">
      <div class="shop-top card">
        <div class="shopkeeper">${Art.npc('Blacksmith Bruno')}</div>
        <div><b class="shop-name">Bruno's Gear Shop</b><br><small>Pick a hero, then buy them gear. Beat bosses to unlock better gear!</small></div>
      </div>
      <div class="hero-tabs">${tabs}</div>
      <div class="card shop-hero">
        <div class="sh-art">${Art.hero(id)}</div>
        <div><b class="sh-name">${H.name} the ${H.title}</b> <span class="lvl-tag">Lv ${h.level}</span>${P.party.includes(id) ? '' : ' <span class="muted">(not on your team)</span>'}${heroStatBar(id)}</div>
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
      openModal(`<div class="intro"><div class="big-art sm">${ic('coin')}</div><h2 class="ttl">Not enough gold</h2>
        <p>You need <b>${fmt(cost - P.gold)}</b> more gold for the ${D.gearName(id, slot, tier)}.</p>
        <p>Solve quests to earn more!</p>
        <div class="row-btns"><button class="btn" data-act="closeModal">OK</button><button class="btn big primary" data-act="goTab" data-arg="quest">${ic('scroll')} Go solve quests</button></div></div>`);
      return;
    }
    P.gold -= cost;
    h.gear[slot] = tier;
    save();
    Sfx.play('buy');
    toast(`<span class="t-icon">${Art.item(id, slot, D.TIERS[tier].color)}</span><div><b>${D.HEROES[id].name}</b> equipped the <b>${D.gearName(id, slot, tier)}</b>!</div>`, 'good');
    render();
    toastNews(checkUnlocks());
  }

  /* ================= Heroes ================= */
  function viewHeroes() {
    const team = [];
    for (let i = 0; i < 4; i++) {
      if (i >= P.partySlots) { team.push(`<div class="team-slot locked">${ic('lock')}<small>${heroSlotText()}</small></div>`); continue; }
      const id = P.party[i];
      team.push(id ? `<div class="team-slot"><span class="ts-art">${Art.hero(id)}</span><small>${D.HEROES[id].name}</small></div>` : `<div class="team-slot empty">${ic('plus')}<small>Empty</small></div>`);
    }
    const cards = D.HERO_ORDER.map((id) => {
      const H = D.HEROES[id], h = P.heroes[id];
      if (!P.unlocked.includes(id)) {
        return `<div class="hero-card locked card"><div class="hc-art sil">${Art.hero(id)}</div><div><b>??? the ${H.title}</b><br><small>${ic('lock')} ${heroUnlockText(id)}</small></div></div>`;
      }
      const inParty = P.party.includes(id);
      const need = D.xpToNext(h.level);
      const gear = Object.keys(D.SLOTS).map((s) => `<span class="g-ic" style="--tc:${h.gear[s] ? D.TIERS[h.gear[s]].color : '#ccc'}" title="${h.gear[s] ? D.gearName(id, s, h.gear[s]) : 'none'}">${Art.item(id, s, h.gear[s] ? D.TIERS[h.gear[s]].color : '#bbbbbb')}</span>`).join('');
      const U = BE.ULTS[id];
      return `<div class="hero-card card ${inParty ? 'in' : ''}" style="--hc:${H.color}">
        <div class="hc-art">${Art.hero(id)}<span class="lv-badge">${h.level}</span></div>
        <div class="hc-body">
          <div class="hc-name"><b>${H.name}</b> the ${H.title}</div>
          <div class="xpbar"><div style="width:${Math.min(100, h.xp / need * 100)}%"></div><span>${h.xp}/${need} XP</span></div>
          ${heroStatBar(id)}
          <div class="hc-skill">${H.skill}</div>
          <div class="hc-super">${ic('bolt')} <b>${U.name}:</b> ${U.desc}</div>
          <div class="hc-gear">${gear}<button class="btn small" data-act="gearUp" data-arg="${id}">${ic('shop')} Gear</button>
            <button class="btn small ${inParty ? '' : 'primary'}" data-act="toggleParty" data-arg="${id}">${inParty ? '✓ On team' : 'Add to team'}</button></div>
        </div>
      </div>`;
    }).join('');
    const pets = D.PETS.map((pet) => {
      const has = P.pets.includes(pet.id);
      return has
        ? `<button class="pet-card ${P.pet === pet.id ? 'sel' : ''}" data-act="pet" data-arg="${pet.id}"><span class="pet-art">${Art.pet(pet.id)}</span><b>${pet.name}</b><small>${pet.bonus}</small></button>`
        : `<div class="pet-card locked"><span class="pet-art sil">${Art.pet(pet.id)}</span><b>???</b><small>${ic('lock')} ${pet.need}</small></div>`;
    }).join('');
    return `<div class="heroes">
      <div class="card team"><h3 class="ttl sm">Your Team (${P.party.length}/${P.partySlots})</h3><div class="team-row">${team.join('')}</div><small class="muted">Tap “Add to team” on a hero to swap them in.</small></div>
      <div class="hero-list">${cards}</div>
      <div class="card"><h3 class="ttl sm">Pets <small class="muted">(pick one to join your team)</small></h3><div class="pet-grid">${pets}</div></div>
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
        toast('Your team is full! Remove a hero first.', 'bad');
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
    const sub = [['trophies', 'trophy', 'Trophies'], ['bestiary', 'book', 'Monsters']].map(([id, icn, l]) => `<button class="seg ${t === id ? 'on' : ''}" data-act="trophyTab" data-arg="${id}">${ic(icn)} ${l}</button>`).join('');
    let body;
    if (t === 'trophies') {
      body = `<div class="trophy-grid">${D.TROPHIES.map((tr) => {
        const has = P.trophies.includes(tr.id);
        return `<div class="trophy ${has ? 'has' : ''}"><span class="tr-art">${has ? trophyArt(tr.id) : ic('lock')}</span><b>${tr.name}</b><small>${tr.desc}</small></div>`;
      }).join('')}</div>`;
    } else {
      const all = [];
      D.AREAS.forEach((A) => { A.monsters.forEach((m) => all.push(m)); all.push(Object.assign({ boss: true }, A.boss)); });
      body = `<div class="trophy-grid">${all.map((m) => {
        const n = P.bestiary[m.name] || 0;
        return `<div class="trophy mon ${n ? 'has' : ''} ${m.boss ? 'bossy' : ''}"><span class="tr-art ${n ? '' : 'sil'}">${Art.monster(m.name)}</span><b>${n ? m.name : '???'}</b><small>${n ? 'Defeated ×' + n : 'Not found yet'}</small></div>`;
      }).join('')}</div>`;
    }
    const found = Object.keys(P.bestiary).length;
    const total = D.AREAS.length * 5;
    return `<div class="trophies">
      <div class="seg-row">${sub}</div>
      <div class="count-note">${t === 'trophies' ? `${P.trophies.length} of ${D.TROPHIES.length} trophies earned` : `${Math.min(found, total)} of ${total} monsters discovered`}</div>
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
        <div class="set-head"><span class="av-frame">${Art.avatar(P.avatar)}</span><h3 class="ttl">${esc(P.name)}</h3></div>
        <label class="lbl">Grade level ${P.pin ? ic('lock') : ''}</label>
        <div class="grade-row">${[3, 4, 5, 6].map((g) => `<button class="grade-btn ${P.grade === g ? 'sel' : ''}" data-act="setGrade" data-arg="${g}">${g}<small>${['rd', 'th', 'th', 'th'][g - 3]}</small></button>`).join('')}</div>
        <div class="toggle-row">
          <div><b>${ic('brain')} Challenge Mode</b><br><small>Only type the final answer. Earn <b>+50% gold</b>!</small></div>
          <button class="switch ${P.challenge ? 'on' : ''}" data-act="toggleChallenge" aria-label="Challenge mode"><span></span></button>
        </div>
        <div class="toggle-row">
          <div><b>${ic('bolt')} Auto super powers</b><br><small>Heroes use their super powers by themselves in battle.</small></div>
          <button class="switch ${P.autoUlt ? 'on' : ''}" data-act="toggleAuto" aria-label="Auto super powers"><span></span></button>
        </div>
        <div class="toggle-row">
          <div><b>${ic('sound')} Sound</b></div>
          <button class="switch ${P.sound ? 'on' : ''}" data-act="toggleSound" aria-label="Sound"><span></span></button>
        </div>
      </div>
      <div class="card">
        <h3 class="ttl sm">Stats</h3>
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
        <h3 class="ttl sm">For grown-ups</h3>
        <p class="muted">Set a 4-digit PIN so the grade level can only be changed by a grown-up.</p>
        <div class="row-btns left">
          <button class="btn" data-act="setPin">${P.pin ? 'Change PIN' : 'Set PIN'}</button>
          ${P.pin ? '<button class="btn" data-act="clearPin">Remove PIN</button>' : ''}
        </div>
        <p class="muted small">Progress is saved on this device only (in the browser).</p>
      </div>
      <div class="row-btns">
        <button class="btn big" data-act="switchPlayer">${ic('users')} Switch player</button>
        <button class="btn danger" data-act="deletePlayer">${ic('trash')} Delete player</button>
      </div>
    </div>`;
  }

  function askPin(title, cb) {
    openModal(`<div class="intro"><h2 class="ttl">${title}</h2>
      <input id="pinIn" class="text-in pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="4" placeholder="••••">
      <div class="row-btns"><button class="btn" data-act="closeModal">Cancel</button><button class="btn primary" id="pinOk">OK</button></div></div>`);
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
      if (ui.battle) { cancelAnimationFrame(ui.battle.raf); ui.battle.ended = true; ui.battle = null; }
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
    toggleAuto: () => { P.autoUlt = !P.autoUlt; save(); render(); },
    toggleSound: () => { P.sound = !P.sound; save(); render(); },
    setPin: () => {
      const doSet = () => askPin('Choose a 4-digit PIN', (v) => {
        if (!/^\d{4}$/.test(v)) { toast('PIN must be 4 digits', 'bad'); return; }
        P.pin = v; save(); closeModal(); toast('PIN saved', 'good');
      });
      if (P.pin) askPin('Current PIN', (v) => { if (v === P.pin) doSet(); else toast('Wrong PIN', 'bad'); });
      else doSet();
    },
    clearPin: () => askPin('Current PIN', (v) => { if (v === P.pin) { P.pin = ''; save(); closeModal(); toast('PIN removed', 'good'); } else toast('Wrong PIN', 'bad'); }),
    switchPlayer: () => { P = null; ui.screen = 'profiles'; ui.quest = null; render(); },
    deletePlayer: () => openModal(`<div class="intro"><div class="big-art sm">${ic('trash')}</div><h2 class="ttl">Delete ${esc(P.name)}?</h2>
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
    if (ui.screen === 'battle' && ui.battle) {
      // Number keys 1-4 fire super powers; space pauses.
      const B = ui.battle;
      if (/^[1-4]$/.test(e.key) && B.b.heroes[+e.key - 1]) tryUlt(B.b.heroes[+e.key - 1].uid);
      else if (e.key === ' ' || e.key === 'Escape') { e.preventDefault(); if (!B.b.over && !B.ended) pauseBattle(!B.paused); }
      return;
    }
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

  window.addEventListener('resize', () => { if (ui.screen === 'battle') layout(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ui.battle && !ui.battle.b.over && !ui.battle.paused) pauseBattle(true);
  });

  // Handy for debugging in the browser console.
  window.NK = { ui, profile: () => P, save };

  Art.flush();
  render();
})();
