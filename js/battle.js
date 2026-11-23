/* Auto-battle engine. Pure logic, no DOM: the UI plays back the events it produces.
   A battle is a series of monster waves. Heroes attack on their own, build up energy,
   and can unleash a SUPER POWER (tapped by the player, or automatic in Auto mode / simulations).
   Bosses wind up big attacks that a well-timed Shield Wall can block. */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const D = root.GameData;

  const T = {
    gauge: 6.2, // gauge gained per second per point of speed; a unit acts at 100
    heroHp: 2.4, // battle HP multipliers (battles last longer than raw stats suggest)
    monHp: 2.2,
    bossHp: 1.0, // extra multiplier on top of monHp for bosses
    monAtk: 1.15, // monster attack multiplier
    monAtkArea: 0.15, // extra monster attack per land (bigger teams later on)
    waveHeal: 0.3, // share of max HP healed between waves
    waveGap: 2.2, // seconds between waves
    introTime: 1.2, // monsters run in
    bossIntro: 2.0,
    energyStart: [20, 40],
    energyPerAct: 12,
    energyPerHurt: 30, // * (damage / maxHp)
    chargeTime: 2.8, // boss wind-up
    chargeEvery: 3, // boss charges on every Nth action
    slam: 1.25, // boss wind-up attack strength (hits every hero)
    shieldTime: 5, // Shield Wall
    shieldMult: 0.4, // damage taken while shielded
    ultPower: 1.0, // scales super power damage
    blessHeal: 0.2, // Fairy Blessing heal (share of max HP)
    revive: 0.3, // revived hero's HP share
    timeLimit: 240,
  };

  const ULTS = {
    knight: { name: 'Shield Wall', desc: 'Protects the whole team: everyone takes 60% less damage for 5 seconds. Use it when a boss winds up a big attack!' },
    archer: { name: 'Arrow Rain', desc: 'Three volleys of arrows hit every monster.' },
    mage: { name: 'Meteor', desc: 'A giant meteor smashes every monster.' },
    healer: { name: 'Fairy Blessing', desc: 'Heals the whole team and brings back a knocked-out hero.' },
    ninja: { name: 'Shadow Flurry', desc: 'Five lightning-fast critical strikes.' },
    dragon: { name: 'Inferno', desc: 'Burns every monster with dragon fire that keeps burning.' },
  };
  const BOSS_MOVES = {
    'Big Grizzly': 'Bear Slam', 'Goblin King': 'Club Smash', 'Cave Kraken': 'Tentacle Storm', 'Sand Genie': 'Sandstorm',
    'Mega Mammoth': 'Avalanche', 'Inferno Dragon': 'Fire Rain', 'Count Zero': 'Zero Beam',
  };
  const MELEE = { knight: 1, ninja: 1, dragon: 1 };

  function makeHero(h, petId, rnd) {
    const H = D.HEROES[h.id];
    const s = D.heroStats(h, petId);
    const hp = Math.round(s.maxHp * T.heroHp);
    return {
      uid: 'h_' + h.id, side: 'hero', cls: h.id, name: H.name, level: h.level,
      maxHp: hp, hp, atk: s.atk, def: s.def, spd: s.spd, crit: s.crit,
      gauge: rnd() * 40, actions: 0, alive: true, busy: 0,
      energy: T.energyStart[0] + rnd() * (T.energyStart[1] - T.energyStart[0]),
      shield: 0, kos: 0,
    };
  }

  let monCount = 0;
  function makeMonster(m, waveIdx, rnd) {
    const hp = Math.round(m.maxHp * T.monHp * (m.boss ? T.bossHp : 1));
    return Object.assign({}, m, {
      uid: 'm_' + (monCount++), side: 'monster', cls: m.boss ? 'boss' : 'monster', wave: waveIdx,
      maxHp: hp, hp, atk: m.atk * T.monAtk * (1 + T.monAtkArea * (m.area || 0)), gauge: rnd() * 30, actions: 0, alive: true, busy: 0,
      burn: 0, burnDmg: 0, burnTick: 0, charging: 0, raged: false,
      move: m.boss ? BOSS_MOVES[m.name] || 'Mighty Slam' : null,
    });
  }

  /* opts: { auto: bool, rng: fn } ; battle: { waves: [[monster...]...] } */
  function Battle(heroStates, battle, petId, opts) {
    opts = opts || {};
    this.rand = opts.rng || Math.random;
    this.auto = !!opts.auto;
    this.heroes = heroStates.map((h) => makeHero(h, petId, this.rand));
    this.waves = battle.waves;
    this.waveIdx = -1;
    this.monsters = [];
    this.regen = D.petMods(petId).regen;
    this.time = 0;
    this.over = false;
    this.winner = null;
    this.regenTimer = 0;
    this.pending = []; // scheduled impacts: { at, fn }
    this.phase = 'gap';
    this.phaseLeft = 0.2;
    this.kos = 0;
    this.ults = 0;
    this.blocks = 0;
    this.defeated = {};
    this.events = [];
  }
  const BP = Battle.prototype;

  BP.units = function () { return this.heroes.concat(this.monsters); };
  BP.alive = function (side) { return (side === 'hero' ? this.heroes : this.monsters).filter((u) => u.alive); };
  BP.unit = function (uid) { return this.heroes.find((u) => u.uid === uid) || this.monsters.find((u) => u.uid === uid); };
  BP.emit = function (ev) { this.events.push(ev); };
  /* Hand over (and clear) everything that happened since the last call. */
  BP.drain = function () { const e = this.events; this.events = []; return e; };
  BP.later = function (delay, fn) { this.pending.push({ at: this.time + delay, fn }); };
  BP.hasBoss = function () { return this.monsters.some((m) => m.boss && m.alive); };

  BP.damage = function (src, tgt, mult, o) {
    o = o || {};
    const r = this.rand;
    const atk = src.atk * mult * (0.9 + r() * 0.2) * (src.raged ? 1.15 : 1);
    let dmg = (atk * atk) / (atk + tgt.def);
    const crit = o.crit || r() < (src.crit || 0);
    if (crit) dmg *= 2;
    if (tgt.side === 'hero' && tgt.shield > 0) dmg *= T.shieldMult;
    dmg = Math.max(1, Math.round(dmg));
    tgt.hp = Math.max(0, tgt.hp - dmg);
    const hit = { uid: tgt.uid, dmg, crit };
    if (tgt.shield > 0 && tgt.side === 'hero') hit.blocked = true;
    if (tgt.side === 'hero' && tgt.alive) tgt.energy = Math.min(100, tgt.energy + T.energyPerHurt * dmg / tgt.maxHp);
    if (tgt.hp <= 0 && tgt.alive) this.kill(tgt, hit);
    return hit;
  };
  BP.kill = function (u, hit) {
    u.alive = false; u.hp = 0; u.charging = 0; u.burn = 0;
    if (hit) hit.killed = true;
    if (u.side === 'hero') { u.kos++; this.kos++; u.shield = 0; u.energy = Math.min(u.energy, 50); }
    else this.defeated[u.name] = (this.defeated[u.name] || 0) + 1;
  };
  BP.heal = function (tgt, amt) {
    const before = tgt.hp;
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + Math.round(amt));
    return { uid: tgt.uid, heal: tgt.hp - before };
  };

  /* Resolve a single-target hit later; retarget if the target already fell. */
  BP.strikeLater = function (src, tgtUid, delay, mult, fx, o) {
    this.later(delay, () => {
      if (!src.alive) return;
      let t = this.unit(tgtUid);
      const foes = this.alive(src.side === 'hero' ? 'monster' : 'hero');
      if (!t || !t.alive) t = foes[Math.floor(this.rand() * foes.length)];
      if (!t) return;
      this.emit({ type: 'hit', src: src.uid, fx, hits: [this.damage(src, t, mult, o)], big: o && o.big });
    });
  };
  BP.splashLater = function (src, delay, mult, fx, o) {
    this.later(delay, () => {
      if (!src.alive && !(o && o.evenIfDead)) return;
      const foes = this.alive(src.side === 'hero' ? 'monster' : 'hero');
      if (!foes.length) return;
      this.emit({ type: 'hit', src: src.uid, fx, hits: foes.map((f) => this.damage(src, f, mult, o)), big: o && o.big });
    });
  };

  BP.pickHeroTarget = function () {
    const alive = this.alive('hero');
    const knight = alive.find((u) => u.cls === 'knight');
    if (knight && (knight.shield > 0 || this.rand() < 0.5)) return knight;
    return alive[Math.floor(this.rand() * alive.length)];
  };

  /* ---------- basic attacks ---------- */
  BP.act = function (u) {
    u.actions++;
    const n = u.actions;
    const foes = this.alive(u.side === 'hero' ? 'monster' : 'hero');
    if (!foes.length) return;
    if (u.side === 'hero') u.energy = Math.min(100, u.energy + T.energyPerAct);
    const ev = { type: 'act', src: u.uid, side: u.side, kind: 'melee', fx: 'slash', targets: [], dur: 0.35 };
    const go = (kind, fx, dur, targets, skill) => { ev.kind = kind; ev.fx = fx; ev.dur = dur; ev.targets = targets.map((t) => t.uid); if (skill) ev.skill = skill; this.emit(ev); };
    switch (u.cls) {
      case 'knight': {
        const bash = n % 3 === 0;
        go('melee', 'slash', 0.35, [foes[0]], bash ? 'Shield Bash!' : null);
        this.strikeLater(u, foes[0].uid, 0.35, bash ? 1.6 : 1, bash ? 'bash' : 'slash');
        break;
      }
      case 'archer': {
        const t = foes.reduce((a, b) => (b.hp < a.hp ? b : a));
        go('shoot', 'arrow', 0.3, [t]);
        this.strikeLater(u, t.uid, 0.3, 1, 'arrow');
        break;
      }
      case 'mage': {
        go('cast', 'fireball', 0.42, foes);
        this.splashLater(u, 0.42, 0.55, 'fireball');
        break;
      }
      case 'healer': {
        const allies = this.alive('hero');
        const hurt = allies.filter((a) => a.hp / a.maxHp < 0.7);
        if (hurt.length) {
          const group = n % 4 === 0 && hurt.length > 1;
          const targets = group ? allies : [hurt.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a))];
          go('heal', 'heal', 0.3, targets, group ? 'Group Heal!' : null);
          this.later(0.3, () => {
            if (!u.alive) return;
            const hits = targets.filter((t) => t.alive).map((t) => this.heal(t, (u.atk * 2.2 + t.maxHp * 0.08) * (group ? 0.6 : 1)));
            if (hits.length) this.emit({ type: 'hit', src: u.uid, fx: 'heal', hits });
          });
        } else {
          const t = foes[Math.floor(this.rand() * foes.length)];
          go('shoot', 'sparkle', 0.3, [t]);
          this.strikeLater(u, t.uid, 0.3, 0.9, 'sparkle');
        }
        break;
      }
      case 'ninja': {
        const dbl = n % 3 === 0;
        const t = foes[Math.floor(this.rand() * foes.length)];
        go('melee', 'slash', 0.3, [t], dbl ? 'Double Strike!' : null);
        this.strikeLater(u, t.uid, 0.3, 1, 'slash');
        if (dbl) this.strikeLater(u, t.uid, 0.45, 1, 'slash');
        break;
      }
      case 'dragon': {
        const breath = n % 3 === 0;
        if (breath) { go('cast', 'breath', 0.45, foes, 'Dragon Breath!'); this.splashLater(u, 0.45, 0.9, 'fire'); }
        else { go('melee', 'claw', 0.35, [foes[0]]); this.strikeLater(u, foes[0].uid, 0.35, 1.1, 'claw'); }
        break;
      }
      case 'boss': {
        if (n % T.chargeEvery === 0) {
          // Wind up a huge attack the heroes can see coming.
          u.charging = T.chargeTime;
          this.emit({ type: 'charge', src: u.uid, name: u.move, dur: T.chargeTime });
          return;
        }
        const t = this.pickHeroTarget();
        go(u.fx ? 'shoot' : 'melee', u.fx || 'bite', 0.38, [t]);
        this.strikeLater(u, t.uid, 0.38, 1, u.fx || 'bite');
        break;
      }
      default: {
        const t = this.pickHeroTarget();
        const heavy = u.arch === 'hitter' && n % 3 === 0;
        go(u.fx ? 'shoot' : 'melee', u.fx || 'bite', 0.36, [t], heavy ? 'Heavy Hit!' : null);
        this.strikeLater(u, t.uid, 0.36, heavy ? 1.5 : 1, u.fx || 'bite', { big: heavy });
      }
    }
  };

  BP.bossSlam = function (u) {
    u.charging = 0;
    const heroes = this.alive('hero');
    if (!heroes.length) return;
    this.emit({ type: 'act', src: u.uid, side: 'monster', kind: 'slam', fx: 'slam', targets: heroes.map((h) => h.uid), dur: 0.4, skill: u.move + '!' });
    this.later(0.4, () => {
      const foes = this.alive('hero');
      if (!foes.length) return;
      const hits = foes.map((f) => this.damage(u, f, T.slam));
      if (hits.some((x) => x.blocked)) this.blocks++;
      this.emit({ type: 'hit', src: u.uid, fx: 'slam', hits, big: true });
    });
  };

  /* ---------- super powers ---------- */
  BP.canUlt = function (uid) {
    const h = this.heroes.find((x) => x.uid === uid);
    return !!(h && h.alive && h.energy >= 100 && this.phase === 'fight' && !this.over && this.alive('monster').length);
  };
  BP.useUlt = function (uid) {
    if (!this.canUlt(uid)) return false;
    const h = this.heroes.find((x) => x.uid === uid);
    h.energy = 0;
    h.gauge = Math.min(h.gauge, 50);
    const U = ULTS[h.cls];
    this.ults++;
    this.emit({ type: 'ult', src: h.uid, cls: h.cls, name: U.name });
    switch (h.cls) {
      case 'knight': {
        for (const a of this.alive('hero')) { a.shield = T.shieldTime; this.emit({ type: 'status', uid: a.uid, s: 'shield', on: true }); }
        const f = this.alive('monster')[0];
        if (f) this.strikeLater(h, f.uid, 0.4, 1.3 * T.ultPower, 'bash', { big: true });
        break;
      }
      case 'archer':
        for (let i = 0; i < 3; i++) this.splashLater(h, 0.5 + i * 0.32, 0.75 * T.ultPower, 'arrowrain', { evenIfDead: true });
        break;
      case 'mage':
        this.splashLater(h, 0.9, 2.2 * T.ultPower, 'meteor', { big: true, evenIfDead: true });
        break;
      case 'healer':
        this.later(0.6, () => {
          const hits = [];
          const down = this.heroes.find((x) => !x.alive);
          if (down) {
            down.alive = true; down.hp = Math.round(down.maxHp * T.revive); down.gauge = 0;
            hits.push({ uid: down.uid, heal: down.hp, revive: true });
          }
          for (const a of this.alive('hero')) if (!down || a !== down) hits.push(this.heal(a, a.maxHp * T.blessHeal + h.atk * 1.5));
          this.emit({ type: 'hit', src: h.uid, fx: 'blessing', hits, big: true });
        });
        break;
      case 'ninja': {
        for (let i = 0; i < 5; i++) {
          const foes = this.alive('monster');
          const t = foes[Math.floor(this.rand() * foes.length)];
          this.strikeLater(h, t.uid, 0.3 + i * 0.18, 0.9 * T.ultPower, 'shadow', { crit: true });
        }
        break;
      }
      case 'dragon':
        this.later(0.7, () => {
          const foes = this.alive('monster');
          if (!foes.length) return;
          const hits = foes.map((f) => this.damage(h, f, 1.6 * T.ultPower));
          for (const f of foes) if (f.alive) { f.burn = 3; f.burnTick = 0.5; f.burnDmg = Math.max(1, Math.round(h.atk * 0.32 * T.ultPower)); this.emit({ type: 'status', uid: f.uid, s: 'burn', on: true }); }
          this.emit({ type: 'hit', src: h.uid, fx: 'inferno', hits, big: true });
        });
        break;
    }
    return true;
  };

  /* Simple, sensible auto-pilot for super powers. */
  BP.autoUlts = function () {
    const heroes = this.alive('hero');
    const boss = this.monsters.find((m) => m.boss && m.alive);
    for (const h of heroes) {
      if (h.energy < 100) continue;
      if (h.cls === 'knight') {
        if (boss) { if (boss.charging > 0 && boss.charging < T.chargeTime - 0.6) this.useUlt(h.uid); }
        else if (heroes.some((a) => a.hp / a.maxHp < 0.6)) this.useUlt(h.uid);
        continue;
      }
      if (h.cls === 'healer') {
        if (this.heroes.some((a) => !a.alive) || heroes.some((a) => a.hp / a.maxHp < 0.45)) this.useUlt(h.uid);
        continue;
      }
      this.useUlt(h.uid);
    }
  };

  /* ---------- flow ---------- */
  BP.startWave = function () {
    this.waveIdx++;
    this.monsters = this.waves[this.waveIdx].map((m) => makeMonster(m, this.waveIdx, this.rand));
    const boss = this.monsters.some((m) => m.boss);
    this.phase = 'intro';
    this.phaseLeft = boss ? T.bossIntro : T.introTime;
    this.emit({ type: 'wave', idx: this.waveIdx, total: this.waves.length, units: this.monsters, boss });
  };

  /* Advance the battle by dt seconds. Returns the list of events. */
  BP.step = function (dt) {
    if (this.over) return this.drain();
    this.time += dt;

    // Scheduled impacts.
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= this.time + 1e-9).sort((a, b) => a.at - b.at);
      if (due.length) {
        this.pending = this.pending.filter((p) => p.at > this.time + 1e-9);
        for (const p of due) p.fn();
      }
    }

    if (this.phase === 'gap' || this.phase === 'intro') {
      this.phaseLeft -= dt;
      if (this.phaseLeft <= 0) {
        if (this.phase === 'gap') this.startWave();
        else this.phase = 'fight';
      }
      return this.drain();
    }

    // Status effects.
    for (const h of this.heroes) if (h.shield > 0) { h.shield -= dt; if (h.shield <= 0) { h.shield = 0; this.emit({ type: 'status', uid: h.uid, s: 'shield', on: false }); } }
    const burnHits = [];
    for (const m of this.monsters) {
      if (m.burn > 0 && m.alive) {
        m.burn -= dt; m.burnTick -= dt;
        if (m.burnTick <= 0) {
          m.burnTick += 0.5;
          m.hp = Math.max(0, m.hp - m.burnDmg);
          const hit = { uid: m.uid, dmg: m.burnDmg, burn: true };
          if (m.hp <= 0) this.kill(m, hit);
          burnHits.push(hit);
        }
        if (m.burn <= 0 && m.alive) this.emit({ type: 'status', uid: m.uid, s: 'burn', on: false });
      }
    }
    if (burnHits.length) this.emit({ type: 'hit', src: null, fx: 'burn', hits: burnHits });

    // Pet regeneration.
    if (this.regen) {
      this.regenTimer += dt;
      if (this.regenTimer >= 1) {
        this.regenTimer -= 1;
        const hits = [];
        for (const h of this.alive('hero')) if (h.hp < h.maxHp) hits.push(Object.assign(this.heal(h, Math.max(1, h.maxHp * this.regen)), { quiet: true }));
        if (hits.length) this.emit({ type: 'regen', hits });
      }
    }

    // Boss wind-ups and rage.
    for (const m of this.monsters) {
      if (!m.alive) continue;
      if (m.boss && !m.raged && m.hp < m.maxHp * 0.5) { m.raged = true; m.spd *= 1.3; this.emit({ type: 'rage', src: m.uid }); }
      if (m.charging > 0) { m.charging -= dt; if (m.charging <= 0) this.bossSlam(m); }
    }

    if (this.auto) this.autoUlts();

    // Turn gauges.
    for (const u of this.units()) {
      if (!u.alive || this.over || u.charging > 0) continue;
      u.gauge += u.spd * T.gauge * dt;
      if (u.gauge >= 100) { u.gauge -= 100; this.act(u); }
    }

    this.checkEnd();
    if (!this.over && this.time > T.timeLimit) { this.over = true; this.winner = 'monster'; this.timeout = true; this.finish(); }
    return this.drain();
  };

  BP.checkEnd = function () {
    if (this.over) return;
    if (!this.alive('hero').length) { this.over = true; this.winner = 'monster'; this.finish(); return; }
    if (this.phase === 'fight' && !this.alive('monster').length) {
      if (this.waveIdx >= this.waves.length - 1) { this.over = true; this.winner = 'hero'; this.finish(); return; }
      // Next wave: heal up a little, clear leftovers.
      this.pending = [];
      const hits = [];
      for (const h of this.alive('hero')) { const x = this.heal(h, h.maxHp * T.waveHeal); if (x.heal) hits.push(x); }
      this.emit({ type: 'waveClear', idx: this.waveIdx, hits });
      this.phase = 'gap';
      this.phaseLeft = T.waveGap;
    }
  };

  BP.finish = function () {
    let stars = 0;
    if (this.winner === 'hero') stars = this.kos === 0 ? 3 : this.kos === 1 ? 2 : 1;
    this.stars = stars;
    this.emit({ type: 'end', winner: this.winner, stars, timeout: !!this.timeout });
  };

  /* Run a whole battle instantly (for win-chance estimates). */
  function simulate(heroStates, battle, petId, rng) {
    const b = new Battle(heroStates, battle, petId, { auto: true, rng });
    while (!b.over) b.step(0.1);
    return b;
  }
  function winChance(heroStates, battle, petId, runs) {
    runs = runs || 24;
    let w = 0;
    for (let i = 0; i < runs; i++) if (simulate(heroStates, battle, petId).winner === 'hero') w++;
    return w / runs;
  }

  root.BattleEngine = { Battle, simulate, winChance, ULTS, TUNE: T };
})();
