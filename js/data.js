/* Game data: heroes, gear, areas, monsters, pets, trophies. */
(function () {
  'use strict';

  const HEROES = {
    knight: {
      id: 'knight', name: 'Sir Bolt', title: 'Knight', emoji: '🤺', color: '#4a7bd1',
      base: { hp: 70, atk: 8, def: 5, spd: 9, crit: 0.05 },
      skill: 'Shield Bash — every 3rd attack hits extra hard. Monsters love to attack the Knight, keeping friends safe!',
      weapon: 'Sword', armor: 'Plate', charm: 'Badge', ranged: false,
    },
    archer: {
      id: 'archer', name: 'Lina', title: 'Archer', emoji: '🧝', color: '#3aa856',
      base: { hp: 45, atk: 10, def: 2, spd: 12, crit: 0.1 },
      skill: 'Sharp Eye — always shoots the weakest monster.',
      weapon: 'Bow', armor: 'Vest', charm: 'Feather', ranged: true, shot: '➶',
    },
    mage: {
      id: 'mage', name: 'Merlo', title: 'Mage', emoji: '🧙', color: '#8a4fd1',
      base: { hp: 40, atk: 9, def: 2, spd: 9, crit: 0.05 },
      skill: 'Fireball — hits ALL monsters at once. Every 4th spell is a giant Meteor!',
      weapon: 'Staff', armor: 'Robe', charm: 'Orb', ranged: true, shot: '🔥',
    },
    healer: {
      id: 'healer', name: 'Pixie', title: 'Healer', emoji: '🧚', color: '#e46fb0',
      base: { hp: 50, atk: 7, def: 3, spd: 10, crit: 0.05 },
      skill: 'Healing Light — heals hurt friends. Attacks when everyone is healthy.',
      weapon: 'Wand', armor: 'Cloak', charm: 'Bell', ranged: true, shot: '✨',
    },
    ninja: {
      id: 'ninja', name: 'Kage', title: 'Ninja', emoji: '🥷', color: '#3b3b4f',
      base: { hp: 48, atk: 11, def: 3, spd: 14, crit: 0.35 },
      skill: 'Shadow Strike — super fast with lots of critical hits. Every 3rd move strikes twice!',
      weapon: 'Stars', armor: 'Garb', charm: 'Mask', ranged: false,
    },
    dragon: {
      id: 'dragon', name: 'Ember', title: 'Dragon', emoji: '🐲', color: '#d1452f',
      base: { hp: 85, atk: 13, def: 6, spd: 10, crit: 0.1 },
      skill: 'Dragon Breath — every 3rd move breathes fire on ALL monsters.',
      weapon: 'Claws', armor: 'Scales', charm: 'Gem', ranged: false,
    },
  };
  const HERO_ORDER = ['knight', 'archer', 'mage', 'healer', 'ninja', 'dragon'];

  const TIERS = [
    null,
    { name: 'Wooden', color: '#a0703c' },
    { name: 'Iron', color: '#7d8590' },
    { name: 'Steel', color: '#5b8fb9' },
    { name: 'Crystal', color: '#2fc1d6' },
    { name: 'Golden', color: '#e0a800' },
    { name: 'Dragon', color: '#d1452f' },
    { name: 'Starlight', color: '#8a4fd1' },
    { name: 'Cosmic', color: '#ff4fa3' },
  ];
  const MAX_TIER = 8;
  const GEAR_GROWTH = 1.8;

  const SLOTS = {
    weapon: { label: 'Weapon', icon: '⚔️', basePrice: 80 },
    armor: { label: 'Armor', icon: '🛡️', basePrice: 80 },
    charm: { label: 'Charm', icon: '📿', basePrice: 60 },
  };

  function gearStats(slot, tier) {
    if (!tier) return { hp: 0, atk: 0, def: 0, spd: 0 };
    const g = Math.pow(GEAR_GROWTH, tier - 1);
    if (slot === 'weapon') return { hp: 0, atk: Math.round(7 * g), def: 0, spd: 0 };
    if (slot === 'armor') return { hp: Math.round(35 * g), atk: 0, def: Math.round(3 * g), spd: 0 };
    return { hp: Math.round(12 * g), atk: Math.round(2 * g), def: 0, spd: tier };
  }
  function priceMult(tier) { return Math.pow(2, tier - 1); }
  function gearPrice(slot, tier) {
    const p = SLOTS[slot].basePrice * priceMult(tier);
    return p < 1000 ? Math.round(p / 5) * 5 : Math.round(p / 50) * 50;
  }
  function gearName(heroId, slot, tier) {
    return TIERS[tier].name + ' ' + HEROES[heroId][slot];
  }

  /* Monster archetypes: multipliers on the area baseline. */
  const ARCH = {
    normal: { hp: 1, atk: 1, def: 1, spd: 1 },
    tank: { hp: 1.5, atk: 0.75, def: 1.6, spd: 0.7 },
    fast: { hp: 0.65, atk: 0.85, def: 0.6, spd: 1.6 },
    hitter: { hp: 1.05, atk: 1.35, def: 0.9, spd: 0.9 },
  };

  const AREAS = [
    {
      id: 'meadow', name: 'Sunny Meadow', emoji: '🌼',
      bg: 'linear-gradient(180deg,#8fd3ff 0%,#c8f0ff 45%,#9be07a 46%,#6cbf4c 100%)',
      deco: ['🌼', '🌷', '🌳', '🦋', '🌻'],
      monsters: [
        { name: 'Slow Snail', emoji: '🐌', arch: 'tank' },
        { name: 'Buzzy Bee', emoji: '🐝', arch: 'fast' },
        { name: 'Grumpy Frog', emoji: '🐸', arch: 'normal' },
        { name: 'Wild Boar', emoji: '🐗', arch: 'hitter' },
      ],
      boss: { name: 'Big Grizzly', emoji: '🐻' },
    },
    {
      id: 'forest', name: 'Whispering Woods', emoji: '🌲',
      bg: 'linear-gradient(180deg,#2f5d50 0%,#4f8a6b 45%,#3d6b3a 46%,#24452a 100%)',
      deco: ['🌲', '🍄', '🌲', '🍂', '🌿'],
      monsters: [
        { name: 'Night Bat', emoji: '🦇', arch: 'fast' },
        { name: 'Web Spider', emoji: '🕷️', arch: 'normal' },
        { name: 'Shadow Wolf', emoji: '🐺', arch: 'hitter' },
        { name: 'Old Owl', emoji: '🦉', arch: 'tank' },
      ],
      boss: { name: 'Goblin King', emoji: '👺' },
    },
    {
      id: 'caves', name: 'Crystal Caves', emoji: '💎',
      bg: 'linear-gradient(180deg,#1e1b3a 0%,#3b3270 45%,#4a3f7a 46%,#231d45 100%)',
      deco: ['💎', '🪨', '💎', '✨', '🔮'],
      monsters: [
        { name: 'Cave Snake', emoji: '🐍', arch: 'fast' },
        { name: 'Rock Crab', emoji: '🦀', arch: 'tank' },
        { name: 'Spooky Ghost', emoji: '👻', arch: 'normal' },
        { name: 'Stone Golem', emoji: '🗿', arch: 'hitter' },
      ],
      boss: { name: 'Cave Kraken', emoji: '🐙' },
    },
    {
      id: 'desert', name: 'Sandy Dunes', emoji: '🏜️',
      bg: 'linear-gradient(180deg,#ffb347 0%,#ffd98a 45%,#f2c46d 46%,#d99a3e 100%)',
      deco: ['🌵', '🏜️', '🌵', '☀️', '🐫'],
      monsters: [
        { name: 'Sand Lizard', emoji: '🦎', arch: 'fast' },
        { name: 'Stinger Scorpion', emoji: '🦂', arch: 'hitter' },
        { name: 'Sleepy Mummy', emoji: '🧟', arch: 'tank' },
        { name: 'Desert Vulture', emoji: '🦅', arch: 'normal' },
      ],
      boss: { name: 'Sand Genie', emoji: '🧞' },
    },
    {
      id: 'peaks', name: 'Frosty Peaks', emoji: '🏔️',
      bg: 'linear-gradient(180deg,#b9d9f5 0%,#e8f4ff 45%,#ffffff 46%,#cfe3f5 100%)',
      deco: ['❄️', '🏔️', '⛄', '❄️', '🌨️'],
      monsters: [
        { name: 'Angry Penguin', emoji: '🐧', arch: 'fast' },
        { name: 'Evil Snowman', emoji: '☃️', arch: 'tank' },
        { name: 'Ice Sprite', emoji: '❄️', arch: 'normal' },
        { name: 'Wild Bison', emoji: '🦬', arch: 'hitter' },
      ],
      boss: { name: 'Mega Mammoth', emoji: '🦣' },
    },
    {
      id: 'volcano', name: 'Lava Volcano', emoji: '🌋',
      bg: 'linear-gradient(180deg,#3a0d0d 0%,#8a1f12 45%,#5a1a10 46%,#2a0a05 100%)',
      deco: ['🌋', '🔥', '🪨', '🔥', '💥'],
      monsters: [
        { name: 'Flame Sprite', emoji: '🔥', arch: 'fast' },
        { name: 'Lava Turtle', emoji: '🐢', arch: 'tank' },
        { name: 'Little Imp', emoji: '😈', arch: 'normal' },
        { name: 'Rex', emoji: '🦖', arch: 'hitter' },
      ],
      boss: { name: 'Inferno Dragon', emoji: '🐉' },
    },
    {
      id: 'sky', name: 'Cloud Castle', emoji: '🏰',
      bg: 'linear-gradient(180deg,#6a5acd 0%,#b5a8ff 45%,#f5f0ff 46%,#c9c0ff 100%)',
      deco: ['☁️', '🏰', '⭐', '☁️', '🌙'],
      monsters: [
        { name: 'Storm Eagle', emoji: '🦅', arch: 'fast' },
        { name: 'Robo Guard', emoji: '🤖', arch: 'tank' },
        { name: 'Space Invader', emoji: '👾', arch: 'normal' },
        { name: 'Twister', emoji: '🌪️', arch: 'hitter' },
      ],
      boss: { name: 'Count Zero', emoji: '🧛' },
    },
  ];

  const STAGES_PER_AREA = 6; // 5 battles + boss
  const STAGE_LAYOUT = [[0, 1], [1, 2], [0, 2, 3], [2, 3, 1], [3, 0, 3]];
  const AREA_GROWTH = 1.8;

  /* What beating each boss unlocks (index = area index). */
  const BOSS_UNLOCKS = [
    { hero: 'mage' },
    { hero: 'healer' },
    { hero: 'ninja' },
    { slot: 4 },
    {},
    { hero: 'dragon' },
    { tower: true },
  ];

  const TUNE = { hp: 55, atk: 12, def: 3, boss: 0.8 };
  function monsterUnit(area, stage, def, isBoss, scale) {
    const g = Math.pow(AREA_GROWTH, area) * (1 + 0.09 * stage) * (scale || 1);
    const a = isBoss ? { hp: 4.2, atk: 1.45, def: 1.3, spd: 1.0 } : ARCH[def.arch];
    return {
      name: def.name, emoji: def.emoji, boss: !!isBoss,
      maxHp: Math.round(TUNE.hp * g * a.hp * (isBoss ? TUNE.boss : 1)),
      atk: Math.round(TUNE.atk * g * a.atk * 10) / 10,
      def: Math.round(TUNE.def * g * a.def * 10) / 10,
      spd: Math.round((8 + area * 0.4) * a.spd * 10) / 10,
      crit: 0.05,
      xp: Math.round((isBoss ? 30 : 6) * Math.pow(1.6, area) * (1 + 0.15 * stage) * (scale || 1)),
    };
  }

  function stageEnemies(areaIdx, stage) {
    const A = AREAS[areaIdx];
    if (stage === STAGES_PER_AREA - 1) {
      return [
        monsterUnit(areaIdx, stage - 1, A.monsters[0], false),
        monsterUnit(areaIdx, stage, A.boss, true),
        monsterUnit(areaIdx, stage - 1, A.monsters[1], false),
      ];
    }
    return STAGE_LAYOUT[stage].map((i) => monsterUnit(areaIdx, stage, A.monsters[i], false));
  }

  function towerEnemies(floor) {
    // Endless tower: mixes monsters from every area, ever stronger.
    const scale = Math.pow(1.12, floor - 1);
    const count = floor % 5 === 0 ? 3 : 2 + (floor % 2);
    const list = [];
    let seed = floor * 9301 + 49297;
    const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };
    for (let i = 0; i < count; i++) {
      const a = AREAS[Math.floor(rnd() * AREAS.length)];
      if (floor % 5 === 0 && i === 1) {
        list.push(monsterUnit(6, 5, a.boss, true, scale));
      } else {
        list.push(monsterUnit(6, 4, a.monsters[Math.floor(rnd() * 4)], false, scale));
      }
    }
    return list;
  }

  const PETS = [
    { id: 'puppy', name: 'Puppy', emoji: '🐶', bonus: '+10% hero health', need: 'Solve 5 quests', check: (p) => p.stats.solved >= 5 },
    { id: 'kitty', name: 'Kitty', emoji: '🐱', bonus: '+10% critical hits', need: 'Get a 5-quest streak', check: (p) => p.stats.bestStreak >= 5 },
    { id: 'owl', name: 'Wise Owl', emoji: '🦉', bonus: '+10% quest gold', need: 'Solve 25 quests', check: (p) => p.stats.solved >= 25 },
    { id: 'turtle', name: 'Turtle', emoji: '🐢', bonus: '+20% defense', need: 'Beat the Cave Kraken', check: (p) => p.bossesBeaten >= 3 },
    { id: 'fox', name: 'Fox', emoji: '🦊', bonus: '+10% speed', need: 'Solve 10 quests in Challenge Mode', check: (p) => p.stats.challengeSolved >= 10 },
    { id: 'bunny', name: 'Bunny', emoji: '🐰', bonus: 'Heals heroes slowly in battle', need: 'Solve 50 quests', check: (p) => p.stats.solved >= 50 },
    { id: 'panda', name: 'Panda', emoji: '🐼', bonus: '+15% attack', need: 'Get a 10-quest streak', check: (p) => p.stats.bestStreak >= 10 },
    { id: 'unicorn', name: 'Unicorn', emoji: '🦄', bonus: '+10% to everything', need: 'Beat the Mega Mammoth', check: (p) => p.bossesBeaten >= 5 },
    { id: 'lion', name: 'Lion', emoji: '🦁', bonus: '+20% attack and +10% quest gold', need: 'Solve 100 quests', check: (p) => p.stats.solved >= 100 },
  ];

  function petMods(petId) {
    const m = { hp: 1, atk: 1, def: 1, spd: 1, crit: 0, gold: 1, regen: 0 };
    switch (petId) {
      case 'puppy': m.hp = 1.1; break;
      case 'kitty': m.crit = 0.1; break;
      case 'owl': m.gold = 1.1; break;
      case 'turtle': m.def = 1.2; break;
      case 'fox': m.spd = 1.1; break;
      case 'bunny': m.regen = 0.015; break;
      case 'panda': m.atk = 1.15; break;
      case 'unicorn': m.hp = m.atk = m.def = m.spd = 1.1; break;
      case 'lion': m.atk = 1.2; m.gold = 1.1; break;
    }
    return m;
  }

  function xpToNext(level) { return Math.round(20 * Math.pow(level, 1.7)); }

  function heroStats(h, petId) {
    const H = HEROES[h.id];
    const lv = 1 + 0.09 * (h.level - 1);
    const s = {
      maxHp: H.base.hp * lv, atk: H.base.atk * lv, def: H.base.def * lv, spd: H.base.spd, crit: H.base.crit,
    };
    for (const slot of Object.keys(SLOTS)) {
      const g = gearStats(slot, h.gear[slot]);
      s.maxHp += g.hp; s.atk += g.atk; s.def += g.def; s.spd += g.spd;
    }
    const m = petMods(petId);
    s.maxHp = Math.round(s.maxHp * m.hp);
    s.atk = Math.round(s.atk * m.atk * 10) / 10;
    s.def = Math.round(s.def * m.def * 10) / 10;
    s.spd = Math.round(s.spd * m.spd * 10) / 10;
    s.crit = Math.min(0.75, s.crit + m.crit);
    return s;
  }

  function heroPower(h, petId) {
    const s = heroStats(h, petId);
    return Math.round(Math.sqrt(s.maxHp * s.atk * (1 + s.def / 20)) * Math.sqrt(s.spd / 10) * 2);
  }

  const TROPHIES = [
    { id: 'first_quest', emoji: '📜', name: 'First Quest', desc: 'Solve your first quest', check: (p) => p.stats.solved >= 1 },
    { id: 'q10', emoji: '🧮', name: 'Number Cruncher', desc: 'Solve 10 quests', check: (p) => p.stats.solved >= 10 },
    { id: 'q50', emoji: '🧠', name: 'Math Brain', desc: 'Solve 50 quests', check: (p) => p.stats.solved >= 50 },
    { id: 'q100', emoji: '🎓', name: 'Math Master', desc: 'Solve 100 quests', check: (p) => p.stats.solved >= 100 },
    { id: 'q250', emoji: '🏅', name: 'Math Legend', desc: 'Solve 250 quests', check: (p) => p.stats.solved >= 250 },
    { id: 'perfect10', emoji: '🎯', name: 'Sharpshooter', desc: 'Solve 10 quests with no mistakes', check: (p) => p.stats.perfect >= 10 },
    { id: 'streak5', emoji: '🔥', name: 'On Fire', desc: 'Get a 5-quest streak', check: (p) => p.stats.bestStreak >= 5 },
    { id: 'streak15', emoji: '☄️', name: 'Unstoppable', desc: 'Get a 15-quest streak', check: (p) => p.stats.bestStreak >= 15 },
    { id: 'challenge1', emoji: '💪', name: 'Brave Brain', desc: 'Solve a quest in Challenge Mode', check: (p) => p.stats.challengeSolved >= 1 },
    { id: 'challenge25', emoji: '🦾', name: 'Mental Math Hero', desc: 'Solve 25 quests in Challenge Mode', check: (p) => p.stats.challengeSolved >= 25 },
    { id: 'win1', emoji: '⚔️', name: 'First Victory', desc: 'Win your first battle', check: (p) => p.stats.wins >= 1 },
    { id: 'win50', emoji: '🗡️', name: 'Veteran', desc: 'Win 50 battles', check: (p) => p.stats.wins >= 50 },
    { id: 'boss1', emoji: '🐻', name: 'Bear Tamer', desc: 'Beat the Big Grizzly', check: (p) => p.bossesBeaten >= 1 },
    { id: 'boss3', emoji: '🐙', name: 'Cave Explorer', desc: 'Beat the Cave Kraken', check: (p) => p.bossesBeaten >= 3 },
    { id: 'boss5', emoji: '🦣', name: 'Mountain Climber', desc: 'Beat the Mega Mammoth', check: (p) => p.bossesBeaten >= 5 },
    { id: 'boss7', emoji: '👑', name: 'Kingdom Saved', desc: 'Defeat Count Zero', check: (p) => p.bossesBeaten >= 7 },
    { id: 'gold1000', emoji: '💰', name: 'Treasure Hoard', desc: 'Earn 1,000 gold in total', check: (p) => p.stats.goldEarned >= 1000 },
    { id: 'gold25000', emoji: '🏦', name: 'Dragon Hoard', desc: 'Earn 25,000 gold in total', check: (p) => p.stats.goldEarned >= 25000 },
    { id: 'fullset', emoji: '✨', name: 'Matching Set', desc: 'Give a hero 3 items of the same tier', check: (p) => Object.values(p.heroes).some((h) => h.gear.weapon && h.gear.weapon === h.gear.armor && h.gear.armor === h.gear.charm) },
    { id: 'lvl10', emoji: '⬆️', name: 'Growing Up', desc: 'Get a hero to level 10', check: (p) => Object.values(p.heroes).some((h) => h.level >= 10) },
    { id: 'lvl25', emoji: '🌟', name: 'Super Hero', desc: 'Get a hero to level 25', check: (p) => Object.values(p.heroes).some((h) => h.level >= 25) },
    { id: 'bestiary20', emoji: '📖', name: 'Monster Expert', desc: 'Discover 20 kinds of monsters', check: (p) => Object.keys(p.bestiary).length >= 20 },
    { id: 'pets5', emoji: '🐾', name: 'Pet Friend', desc: 'Unlock 5 pets', check: (p) => p.pets.length >= 5 },
    { id: 'tower10', emoji: '🗼', name: 'Tower Climber', desc: 'Reach floor 10 of the Endless Tower', check: (p) => p.towerBest >= 10 },
    { id: 'tower25', emoji: '🌌', name: 'Sky High', desc: 'Reach floor 25 of the Endless Tower', check: (p) => p.towerBest >= 25 },
  ];

  const AVATARS = ['🦸', '🧑‍🚀', '🦊', '🐯', '🦄', '🐼', '🐸', '🐙', '🦖', '🐧', '🌟', '🚀'];

  window.GameData = {
    HEROES, HERO_ORDER, TIERS, MAX_TIER, SLOTS, AREAS, STAGES_PER_AREA, BOSS_UNLOCKS, PETS, TROPHIES, AVATARS,
    TUNE, gearStats, gearPrice, gearName, priceMult, stageEnemies, towerEnemies, petMods, heroStats, heroPower, xpToNext,
  };
})();
