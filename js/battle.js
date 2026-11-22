/* Auto-battle engine. Pure logic, no DOM: the UI reads events it produces. */
(function () {
  'use strict';
  const D = (typeof window !== 'undefined' ? window : globalThis).GameData;

  const GAUGE_RATE = 9; // gauge per second per point of speed; acts at 100

  function makeHero(h, petId) {
    const H = D.HEROES[h.id];
    const s = D.heroStats(h, petId);
    return {
      uid: 'h_' + h.id, side: 'hero', cls: h.id, name: H.name, emoji: H.emoji,
      maxHp: s.maxHp, hp: s.maxHp, atk: s.atk, def: s.def, spd: s.spd, crit: s.crit,
      gauge: Math.random() * 40, actions: 0, alive: true,
    };
  }

  function makeMonster(m, i) {
    return Object.assign({}, m, {
      uid: 'm_' + i, side: 'monster', cls: m.boss ? 'boss' : 'monster',
      hp: m.maxHp, gauge: Math.random() * 30, actions: 0, alive: true,
    });
  }

  function Battle(heroStates, monsters, petId, rng) {
    this.rand = rng || Math.random;
    this.heroes = heroStates.map((h) => makeHero(h, petId));
    this.monsters = monsters.map(makeMonster);
    this.regen = D.petMods(petId).regen;
    this.time = 0;
    this.over = false;
    this.winner = null;
    this.regenTimer = 0;
  }

  Battle.prototype.units = function () { return this.heroes.concat(this.monsters); };
  Battle.prototype.alive = function (side) {
    return (side === 'hero' ? this.heroes : this.monsters).filter((u) => u.alive);
  };

  Battle.prototype.damage = function (src, tgt, mult) {
    const r = this.rand;
    const atk = src.atk * mult * (0.9 + r() * 0.2);
    let dmg = (atk * atk) / (atk + tgt.def);
    const crit = r() < src.crit;
    if (crit) dmg *= 2;
    dmg = Math.max(1, Math.round(dmg));
    tgt.hp = Math.max(0, tgt.hp - dmg);
    const hit = { uid: tgt.uid, dmg: dmg, crit: crit };
    if (tgt.hp <= 0 && tgt.alive) { tgt.alive = false; hit.killed = true; }
    return hit;
  };

  Battle.prototype.pickHeroTarget = function () {
    const alive = this.alive('hero');
    const knight = alive.find((u) => u.cls === 'knight');
    if (knight && this.rand() < 0.5) return knight;
    return alive[Math.floor(this.rand() * alive.length)];
  };

  Battle.prototype.act = function (u) {
    u.actions++;
    const foes = this.alive(u.side === 'hero' ? 'monster' : 'hero');
    if (!foes.length) return null;
    const ev = { type: 'attack', src: u.uid, side: u.side, hits: [], skill: null };
    const n = u.actions;
    switch (u.cls) {
      case 'knight': {
        const bash = n % 3 === 0;
        if (bash) ev.skill = 'Shield Bash!';
        ev.hits.push(this.damage(u, foes[0], bash ? 1.6 : 1));
        break;
      }
      case 'archer': {
        const t = foes.reduce((a, b) => (b.hp < a.hp ? b : a));
        ev.hits.push(this.damage(u, t, 1));
        ev.shot = '➶';
        break;
      }
      case 'mage': {
        const meteor = n % 4 === 0;
        if (meteor) ev.skill = 'Meteor!';
        ev.shot = meteor ? '☄️' : '🔥';
        for (const f of foes) ev.hits.push(this.damage(u, f, meteor ? 1.0 : 0.55));
        break;
      }
      case 'healer': {
        const allies = this.alive('hero');
        const hurt = allies.filter((a) => a.hp / a.maxHp < 0.7);
        if (hurt.length) {
          const groupHeal = n % 4 === 0 && hurt.length > 1;
          const targets = groupHeal ? allies : [hurt.reduce((a, b) => (b.hp / b.maxHp < a.hp / a.maxHp ? b : a))];
          ev.type = 'heal';
          ev.skill = groupHeal ? 'Group Heal!' : null;
          for (const t of targets) {
            const amt = Math.round((u.atk * 2.2 + t.maxHp * 0.08) * (groupHeal ? 0.6 : 1));
            const before = t.hp;
            t.hp = Math.min(t.maxHp, t.hp + amt);
            ev.hits.push({ uid: t.uid, heal: t.hp - before });
          }
        } else {
          ev.shot = '✨';
          ev.hits.push(this.damage(u, foes[Math.floor(this.rand() * foes.length)], 0.9));
        }
        break;
      }
      case 'ninja': {
        const dbl = n % 3 === 0;
        if (dbl) ev.skill = 'Double Strike!';
        const t = foes[Math.floor(this.rand() * foes.length)];
        ev.hits.push(this.damage(u, t, 1));
        if (dbl) {
          const left = this.alive('monster');
          if (left.length) ev.hits.push(this.damage(u, left[Math.floor(this.rand() * left.length)], 1));
        }
        break;
      }
      case 'dragon': {
        const breath = n % 3 === 0;
        if (breath) { ev.skill = 'Dragon Breath!'; ev.shot = '🔥'; }
        if (breath) for (const f of foes) ev.hits.push(this.damage(u, f, 0.9));
        else ev.hits.push(this.damage(u, foes[0], 1.1));
        break;
      }
      case 'boss': {
        const slam = n % 3 === 0;
        if (slam) {
          ev.skill = 'Mighty Slam!';
          for (const f of foes) ev.hits.push(this.damage(u, f, 0.6));
        } else {
          ev.hits.push(this.damage(u, this.pickHeroTarget(), 1));
        }
        break;
      }
      default:
        ev.hits.push(this.damage(u, this.pickHeroTarget(), 1));
    }
    return ev;
  };

  /* Advance the battle by dt seconds. Returns a list of events. */
  Battle.prototype.step = function (dt) {
    const events = [];
    if (this.over) return events;
    this.time += dt;
    if (this.regen) {
      this.regenTimer += dt;
      if (this.regenTimer >= 1) {
        this.regenTimer -= 1;
        const hits = [];
        for (const h of this.alive('hero')) {
          if (h.hp < h.maxHp) {
            const amt = Math.max(1, Math.round(h.maxHp * this.regen));
            const before = h.hp; h.hp = Math.min(h.maxHp, h.hp + amt);
            hits.push({ uid: h.uid, heal: h.hp - before, quiet: true });
          }
        }
        if (hits.length) events.push({ type: 'regen', hits: hits });
      }
    }
    const order = this.units().filter((u) => u.alive);
    for (const u of order) {
      if (!u.alive || this.over) continue;
      u.gauge += u.spd * GAUGE_RATE * dt;
      if (u.gauge >= 100) {
        u.gauge -= 100;
        const ev = this.act(u);
        if (ev) events.push(ev);
        if (!this.alive('monster').length) { this.over = true; this.winner = 'hero'; }
        else if (!this.alive('hero').length) { this.over = true; this.winner = 'monster'; }
      }
    }
    // Safety valve: very long fights end in a retreat.
    if (!this.over && this.time > 180) { this.over = true; this.winner = 'monster'; this.timeout = true; }
    if (this.over) events.push({ type: 'end', winner: this.winner });
    return events;
  };

  /* Run a whole battle instantly (for win-chance estimates). */
  function simulate(heroStates, monsters, petId) {
    const b = new Battle(heroStates, monsters, petId);
    while (!b.over) b.step(0.1);
    return b.winner === 'hero';
  }

  function winChance(heroStates, monsters, petId, runs) {
    runs = runs || 24;
    let w = 0;
    for (let i = 0; i < runs; i++) if (simulate(heroStates, monsters, petId)) w++;
    return w / runs;
  }

  (typeof window !== 'undefined' ? window : globalThis).BattleEngine = { Battle, simulate, winChance };
})();
