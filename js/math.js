/* Multi-step word problem generator for grades 3–6. */
(function () {
  'use strict';

  const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const r2 = (x) => Math.round(x * 100) / 100;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = (n) => {
    const v = r2(n);
    const [i, d] = String(v).split('.');
    return i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (d ? '.' + d : '');
  };
  const money = (n) => '$' + (Number.isInteger(r2(n)) ? fmt(n) : r2(n).toFixed(2));
  const frac = (a, b) => `<span class="frac"><sup>${a}</sup>&frasl;<sub>${b}</sub></span>`;
  const b = (x) => `<b>${x}</b>`;

  const NPCS = [
    ['Baker Bo', '🧁'], ['Farmer Fern', '👩‍🌾'], ['Wizard Wren', '🧙‍♀️'], ['Captain Kale', '🏴‍☠️'],
    ['Princess Pip', '👸'], ['Gnome Gus', '🍄'], ['Blacksmith Bruno', '🔨'], ['Queen Quin', '👑'],
    ['Robo Rex', '🤖'], ['Elf Ella', '🧝‍♀️'], ['Chef Chip', '👨‍🍳'], ['Sailor Sam', '⚓'],
  ];

  let playerName = 'Hero';
  function who() {
    if (Math.random() < 0.4) return esc(playerName);
    return pick(NPCS)[0];
  }
  function two() {
    const a = pick(NPCS)[0];
    let c = pick(NPCS)[0];
    while (c === a) c = pick(NPCS)[0];
    return Math.random() < 0.5 ? [esc(playerName), a] : [a, c];
  }

  /* Each template returns { title, text, steps: [{ q, a, hint, unit?, money? }] } */
  const T = {};

  /* ---------------- Grade 3 ---------------- */
  T[3] = [
    function gemHunt() {
      const n = who(), a = ri(15, 60), bb = ri(8, 35), c = ri(5, a + bb - 5);
      return {
        title: 'The Gem Hunt', icon: '💎',
        text: `${n} has ${b(a)} shiny gems 💎. On an adventure, ${n} finds ${b(bb)} more gems. Then ${n} gives ${b(c)} gems to a friend. How many gems does ${n} have now?`,
        steps: [
          { q: 'How many gems after finding more?', a: a + bb, hint: `${a} + ${bb} = ?`, unit: 'gems' },
          { q: `How many gems after giving ${c} away?`, a: a + bb - c, hint: `${a + bb} − ${c} = ?`, unit: 'gems' },
        ],
      };
    },
    function appleBags() {
      const n = who(), bags = ri(3, 9), per = ri(3, 9), e = ri(2, 15);
      return {
        title: 'Apple Delivery', icon: '🍎',
        text: `${n} packs ${b(bags)} bags with ${b(per)} apples 🍎 in each bag. There are ${b(e)} more apples on the table. How many apples are there in all?`,
        steps: [
          { q: 'How many apples are in the bags?', a: bags * per, hint: `${bags} bags × ${per} apples = ?`, unit: 'apples' },
          { q: 'How many apples in all?', a: bags * per + e, hint: `${bags * per} + ${e} = ?`, unit: 'apples' },
        ],
      };
    },
    function arrows() {
      const n = who(), q = ri(3, 8), per = ri(4, 10), tot = q * per, u = ri(3, tot - 3);
      return {
        title: 'Target Practice', icon: '🎯',
        text: `${n} has ${b(q)} quivers with ${b(per)} arrows in each. ${n} shoots ${b(u)} arrows at targets. How many arrows are left?`,
        steps: [
          { q: 'How many arrows to start?', a: tot, hint: `${q} × ${per} = ?`, unit: 'arrows' },
          { q: 'How many arrows are left?', a: tot - u, hint: `${tot} − ${u} = ?`, unit: 'arrows' },
        ],
      };
    },
    function potionShop() {
      const n = who(), k = ri(2, 5), p = ri(2, 9), tot = k * p, pay = tot < 20 ? 20 : 50;
      return {
        title: 'Potion Shop', icon: '🧪',
        text: `Potions 🧪 cost ${b(p)} gold coins each. ${n} buys ${b(k)} potions and pays with ${b(pay)} gold coins. How much change does ${n} get back?`,
        steps: [
          { q: 'How much do the potions cost?', a: tot, hint: `${k} × ${p} = ?`, unit: 'coins' },
          { q: 'How much change?', a: pay - tot, hint: `${pay} − ${tot} = ?`, unit: 'coins' },
        ],
      };
    },
    function moreThan() {
      const [x, y] = two(), a = ri(12, 45), m = ri(5, 25);
      return {
        title: 'Shell Collectors', icon: '🐚',
        text: `${x} collects ${b(a)} seashells 🐚. ${y} collects ${b(m)} more seashells than ${x}. How many seashells do they have together?`,
        steps: [
          { q: `How many shells does ${y} have?`, a: a + m, hint: `${a} + ${m} = ?`, unit: 'shells' },
          { q: 'How many shells together?', a: a + a + m, hint: `${a} + ${a + m} = ?`, unit: 'shells' },
        ],
      };
    },
    function cookies() {
      const k = ri(2, 6), m = ri(3, 9), e = ri(1, m - 1), n = who();
      return {
        title: 'Cookie Party', icon: '🍪',
        text: `${n} bakes ${b(k * m)} cookies 🍪 and shares them equally with ${b(k)} friends. Each friend eats ${b(e)} cookies right away. How many cookies does each friend have left?`,
        steps: [
          { q: 'How many cookies does each friend get?', a: m, hint: `${k * m} ÷ ${k} = ?`, unit: 'cookies' },
          { q: 'How many does each friend have left?', a: m - e, hint: `${m} − ${e} = ?`, unit: 'cookies' },
        ],
      };
    },
    function shields() {
      const t = ri(6, 12), g = ri(1, t - 2), m = ri(2, 9);
      return {
        title: 'Shield Polishing', icon: '🛡️',
        text: `A team of ${b(t)} knights is at the castle. ${b(g)} knights go home. Each knight who stays polishes ${b(m)} shields 🛡️. How many shields get polished?`,
        steps: [
          { q: 'How many knights stay?', a: t - g, hint: `${t} − ${g} = ?`, unit: 'knights' },
          { q: 'How many shields get polished?', a: (t - g) * m, hint: `${t - g} × ${m} = ?`, unit: 'shields' },
        ],
      };
    },
    function garden() {
      const n = who(), r1 = ri(2, 6), c1 = ri(3, 9), r2_ = ri(2, 6), c2 = ri(3, 9);
      return {
        title: 'Magic Garden', icon: '🥕',
        text: `${n} plants ${b(r1)} rows of carrots 🥕 with ${b(c1)} carrots in each row, and ${b(r2_)} rows of pumpkins 🎃 with ${b(c2)} pumpkins in each row. How many plants in all?`,
        steps: [
          { q: 'How many carrots?', a: r1 * c1, hint: `${r1} × ${c1} = ?`, unit: 'carrots' },
          { q: 'How many pumpkins?', a: r2_ * c2, hint: `${r2_} × ${c2} = ?`, unit: 'pumpkins' },
          { q: 'How many plants in all?', a: r1 * c1 + r2_ * c2, hint: `${r1 * c1} + ${r2_ * c2} = ?`, unit: 'plants' },
        ],
      };
    },
    function reading() {
      const n = who(), a = ri(8, 45);
      return {
        title: 'Spell Book Reading', icon: '📖',
        text: `On Monday, ${n} reads ${b(a)} pages of a spell book 📖. On Tuesday, ${n} reads ${b('twice as many')} pages. How many pages did ${n} read on both days?`,
        steps: [
          { q: 'How many pages on Tuesday?', a: 2 * a, hint: `${a} × 2 = ?`, unit: 'pages' },
          { q: 'How many pages on both days?', a: 3 * a, hint: `${a} + ${2 * a} = ?`, unit: 'pages' },
        ],
      };
    },
  ];

  /* ---------------- Grade 4 ---------------- */
  T[4] = [
    function armory() {
      const n = who(), k1 = ri(2, 5), p1 = ri(12, 45), k2 = ri(2, 4), p2 = ri(8, 30);
      const tot = k1 * p1 + k2 * p2, pay = Math.ceil((tot + 1) / 100) * 100;
      return {
        title: 'Armory Shopping', icon: '⚔️',
        text: `At the armory, swords cost ${b(p1)} coins and shields cost ${b(p2)} coins. ${n} buys ${b(k1)} swords and ${b(k2)} shields, and pays with ${b(pay)} coins. How much change does ${n} get?`,
        steps: [
          { q: 'How much for the swords?', a: k1 * p1, hint: `${k1} × ${p1} = ?`, unit: 'coins' },
          { q: 'How much for the shields?', a: k2 * p2, hint: `${k2} × ${p2} = ?`, unit: 'coins' },
          { q: 'What is the total cost?', a: tot, hint: `${k1 * p1} + ${k2 * p2} = ?`, unit: 'coins' },
          { q: 'How much change?', a: pay - tot, hint: `${pay} − ${tot} = ?`, unit: 'coins' },
        ],
      };
    },
    function fence() {
      const n = who(), L = ri(6, 20), W = ri(4, 15), c = ri(2, 9), P = 2 * L + 2 * W;
      return {
        title: 'Dragon-Proof Fence', icon: '🚧',
        text: `${n}'s rectangle garden is ${b(L)} meters long and ${b(W)} meters wide. A dragon-proof fence costs ${b(c)} coins per meter. How much will it cost to put a fence all the way around the garden?`,
        steps: [
          { q: 'What is the perimeter (distance all the way around)?', a: P, hint: `${L} + ${W} + ${L} + ${W} = ?`, unit: 'meters' },
          { q: 'How much does the fence cost?', a: P * c, hint: `${P} × ${c} = ?`, unit: 'coins' },
        ],
      };
    },
    function wagons() {
      const w = ri(2, 6), c = ri(3, 8), p = ri(5, 12);
      return {
        title: 'Potato Wagons', icon: '🥔',
        text: `${b(w)} wagons roll into town. Each wagon carries ${b(c)} crates, and each crate holds ${b(p)} potatoes 🥔. How many potatoes are there in all?`,
        steps: [
          { q: 'How many crates in all?', a: w * c, hint: `${w} × ${c} = ?`, unit: 'crates' },
          { q: 'How many potatoes in all?', a: w * c * p, hint: `${w * c} × ${p} = ?`, unit: 'potatoes' },
        ],
      };
    },
    function chests() {
      const m = ri(6, 25), k = ri(3, 9), j = ri(2, k - 1);
      return {
        title: 'Treasure Chests', icon: '🧰',
        text: `Pirates split ${b(m * k)} gold coins equally into ${b(k)} treasure chests. Captain Kale takes ${b(j)} of the chests. How many coins does the captain take?`,
        steps: [
          { q: 'How many coins go in each chest?', a: m, hint: `${m * k} ÷ ${k} = ?`, unit: 'coins' },
          { q: 'How many coins does the captain take?', a: m * j, hint: `${m} × ${j} = ?`, unit: 'coins' },
        ],
      };
    },
    function earnSpend() {
      const n = who(), e = ri(12, 45), d = ri(3, 7), s = ri(20, e * d - 10);
      return {
        title: 'Dragon Sitting', icon: '🐉',
        text: `${n} earns ${b(e)} coins each day for babysitting a baby dragon. After ${b(d)} days, ${n} spends ${b(s)} coins on dragon snacks. How many coins are left?`,
        steps: [
          { q: `How many coins earned in ${d} days?`, a: e * d, hint: `${e} × ${d} = ?`, unit: 'coins' },
          { q: 'How many coins are left?', a: e * d - s, hint: `${e * d} − ${s} = ?`, unit: 'coins' },
        ],
      };
    },
    function timesAsMany() {
      const [x, y] = two(), k = ri(100, 250), t = ri(2, 4);
      const word = { 2: 'twice', 3: '3 times', 4: '4 times' }[t];
      return {
        title: 'Sticker Collections', icon: '⭐',
        text: `${x} has ${b(k)} star stickers ⭐. ${y} has ${b(word)} as many stickers as ${x}. How many stickers do they have altogether?`,
        steps: [
          { q: `How many stickers does ${y} have?`, a: k * t, hint: `${k} × ${t} = ?`, unit: 'stickers' },
          { q: 'How many altogether?', a: k * t + k, hint: `${k * t} + ${k} = ?`, unit: 'stickers' },
        ],
      };
    },
    function pond() {
      const L = ri(8, 20), W = ri(6, 15), l = ri(2, 5), w = ri(2, 5);
      return {
        title: 'Castle Lawn', icon: '🏰',
        text: `The castle lawn is a rectangle ${b(L)} meters by ${b(W)} meters. A rectangle pond 🐟 in the lawn is ${b(l)} meters by ${b(w)} meters. How many square meters of grass are there?`,
        steps: [
          { q: 'What is the area of the whole lawn?', a: L * W, hint: `${L} × ${W} = ?`, unit: 'sq m' },
          { q: 'What is the area of the pond?', a: l * w, hint: `${l} × ${w} = ?`, unit: 'sq m' },
          { q: 'How much grass is there?', a: L * W - l * w, hint: `${L * W} − ${l * w} = ?`, unit: 'sq m' },
        ],
      };
    },
    function ferry() {
      let kids, adults, cap;
      do { kids = ri(25, 70); adults = ri(3, 9); cap = ri(5, 9); } while ((kids + adults) % cap === 0);
      const tot = kids + adults;
      return {
        title: 'Field Trip Boats', icon: '⛵',
        text: `${b(kids)} kids and ${b(adults)} grown-ups are going to Dragon Island. Each boat ⛵ can carry ${b(cap)} people. How many boats do they need so everyone can go?`,
        steps: [
          { q: 'How many people in all?', a: tot, hint: `${kids} + ${adults} = ?`, unit: 'people' },
          { q: 'How many boats are needed?', a: Math.ceil(tot / cap), hint: `${tot} ÷ ${cap} = ? If there are leftover people, they need one more boat!`, unit: 'boats' },
        ],
      };
    },
    function marbles() {
      const n = who(), a = ri(20, 80), k = ri(3, 8), m = ri(6, 12), g = ri(10, 40);
      return {
        title: 'Magic Marbles', icon: '🔮',
        text: `${n} has ${b(a)} magic marbles. ${n} buys ${b(k)} bags with ${b(m)} marbles in each bag. Then ${n} gives ${b(g)} marbles to a friend. How many marbles does ${n} have now?`,
        steps: [
          { q: 'How many marbles in the bags?', a: k * m, hint: `${k} × ${m} = ?`, unit: 'marbles' },
          { q: 'How many marbles after buying?', a: a + k * m, hint: `${a} + ${k * m} = ?`, unit: 'marbles' },
          { q: 'How many after giving some away?', a: a + k * m - g, hint: `${a + k * m} − ${g} = ?`, unit: 'marbles' },
        ],
      };
    },
  ];

  /* ---------------- Grade 5 ---------------- */
  T[5] = [
    function decimalChange() {
      const n = who(), p = ri(5, 19) * 0.25, k = ri(2, 4), tot = r2(k * p), pay = tot < 10 ? 10 : 20;
      return {
        title: 'Market Day', icon: '🧺',
        text: `Magic muffins 🧁 cost ${b(money(p))} each. ${n} buys ${b(k)} muffins and pays with a ${b(money(pay))} bill. How much change does ${n} get?`,
        steps: [
          { q: 'How much do the muffins cost?', a: tot, hint: `${k} × ${money(p)} = ?`, money: true },
          { q: 'How much change?', a: r2(pay - tot), hint: `${money(pay)} − ${money(tot)} = ?`, money: true },
        ],
      };
    },
    function goblinHats() {
      const d = pick([3, 4, 5, 6, 8]), a = ri(1, d - 1), T_ = d * 2 * ri(3, 10), one = T_ / d;
      return {
        title: 'Goblin Hats', icon: '🎩',
        text: `There are ${b(T_)} goblins 👺 in the forest. ${frac(a, d)} of them wear hats 🎩. Half of the goblins with hats also wear boots 👢. How many goblins wear hats AND boots?`,
        steps: [
          { q: `What is ${frac(1, d)} of ${T_}?`, a: one, hint: `${T_} ÷ ${d} = ?`, unit: 'goblins' },
          { q: `How many goblins wear hats (${frac(a, d)} of ${T_})?`, a: one * a, hint: `${one} × ${a} = ?`, unit: 'goblins' },
          { q: 'How many wear hats AND boots?', a: (one * a) / 2, hint: `${one * a} ÷ 2 = ?`, unit: 'goblins' },
        ],
      };
    },
    function volume() {
      const L = ri(2, 9), W = ri(2, 8), H = ri(2, 6), c = ri(2, 5);
      return {
        title: 'Crystal Box', icon: '📦',
        text: `A wizard fills a box with tiny crystal cubes. The box is ${b(L)} cubes long, ${b(W)} cubes wide, and ${b(H)} cubes tall. Each crystal cube costs ${b(c)} coins. How much do all the cubes cost?`,
        steps: [
          { q: 'How many cubes in the bottom layer?', a: L * W, hint: `${L} × ${W} = ?`, unit: 'cubes' },
          { q: 'How many cubes fill the box (the volume)?', a: L * W * H, hint: `${L * W} × ${H} = ?`, unit: 'cubes' },
          { q: 'How much do all the cubes cost?', a: L * W * H * c, hint: `${L * W * H} × ${c} = ?`, unit: 'coins' },
        ],
      };
    },
    function average() {
      const avg = ri(12, 40), d1 = ri(1, 8), d2 = ri(1, 8), d3 = ri(1, 6);
      const vals = [avg + d1, avg - d2, avg + d3, avg - d1 + d2 - d3];
      if (vals.some((v) => v <= 0)) return T[5][3]();
      const n = who(), sum = vals.reduce((x, y) => x + y, 0);
      return {
        title: 'Monster Points', icon: '🏆',
        text: `In 4 practice battles, ${n} scores ${b(vals[0])}, ${b(vals[1])}, ${b(vals[2])}, and ${b(vals[3])} points. What is the average (mean) score?`,
        steps: [
          { q: 'What is the total of all 4 scores?', a: sum, hint: `${vals.join(' + ')} = ?`, unit: 'points' },
          { q: 'What is the average?', a: avg, hint: `${sum} ÷ 4 = ?`, unit: 'points' },
        ],
      };
    },
    function dragonSheep() {
      const r = ri(12, 36), d = pick([2, 3, 4]), w = d * ri(3, 6);
      return {
        title: 'Hungry Dragon', icon: '🐲',
        text: `A dragon eats ${b(r)} melons 🍉 every week. After ${b(w)} weeks, it shares the melons equally with its ${b(d)} babies. How many melons does each baby get?`,
        steps: [
          { q: `How many melons in ${w} weeks?`, a: r * w, hint: `${r} × ${w} = ?`, unit: 'melons' },
          { q: 'How many does each baby get?', a: (r * w) / d, hint: `${r * w} ÷ ${d} = ?`, unit: 'melons' },
        ],
      };
    },
    function running() {
      const n = who(), a = pick([1.5, 2.5, 1.25, 3.5, 2.75, 1.75]), d = ri(3, 7), e = pick([0.5, 1.75, 2.25, 3.4, 1.6]);
      return {
        title: 'Training Run', icon: '🏃',
        text: `${n} runs ${b(a)} km every day for ${b(d)} days. On the next day, ${n} runs ${b(e)} km. How many km did ${n} run in all?`,
        steps: [
          { q: `How far in ${d} days?`, a: r2(a * d), hint: `${a} × ${d} = ?`, unit: 'km' },
          { q: 'How far in all?', a: r2(a * d + e), hint: `${r2(a * d)} + ${e} = ?`, unit: 'km' },
        ],
      };
    },
    function rope() {
      const m = ri(2, 9), piece = pick([20, 25, 50]), keep = ri(1, 4);
      const pieces = (m * 100) / piece;
      return {
        title: 'Rope Bridge', icon: '🪢',
        text: `Builders have a rope that is ${b(m)} meters long. They cut it into pieces that are each ${b(piece)} centimeters long. They use all but ${b(keep)} pieces to build a bridge. How many pieces go into the bridge? (1 meter = 100 cm)`,
        steps: [
          { q: 'How many centimeters long is the rope?', a: m * 100, hint: `${m} × 100 = ?`, unit: 'cm' },
          { q: 'How many pieces can they cut?', a: pieces, hint: `${m * 100} ÷ ${piece} = ?`, unit: 'pieces' },
          { q: 'How many pieces go into the bridge?', a: pieces - keep, hint: `${pieces} − ${keep} = ?`, unit: 'pieces' },
        ],
      };
    },
    function stickerShare() {
      let n1, m1, n2, m2, k;
      do { n1 = ri(2, 6); m1 = ri(8, 15); n2 = ri(2, 5); m2 = ri(5, 12); k = pick([3, 4, 5, 6]); } while ((n1 * m1 + n2 * m2) % k !== 0);
      const tot = n1 * m1 + n2 * m2, n = who();
      return {
        title: 'Card Trading', icon: '🃏',
        text: `${n} buys ${b(n1)} packs of monster cards with ${b(m1)} cards each, and ${b(n2)} packs of hero cards with ${b(m2)} cards each. ${n} shares all the cards equally among ${b(k)} friends. How many cards does each friend get?`,
        steps: [
          { q: 'How many monster cards?', a: n1 * m1, hint: `${n1} × ${m1} = ?`, unit: 'cards' },
          { q: 'How many hero cards?', a: n2 * m2, hint: `${n2} × ${m2} = ?`, unit: 'cards' },
          { q: 'How many cards in all?', a: tot, hint: `${n1 * m1} + ${n2 * m2} = ?`, unit: 'cards' },
          { q: 'How many does each friend get?', a: tot / k, hint: `${tot} ÷ ${k} = ?`, unit: 'cards' },
        ],
      };
    },
  ];

  /* ---------------- Grade 6 ---------------- */
  T[6] = [
    function sale() {
      const pct = pick([10, 20, 25, 50]);
      const price = pct === 25 ? ri(2, 10) * 20 : ri(4, 20) * 10;
      const off = (price * pct) / 100, salePrice = price - off;
      const pay = Math.ceil((salePrice + 1) / 50) * 50, n = who();
      return {
        title: 'Big Sword Sale', icon: '🏷️',
        text: `A magic sword costs ${b(money(price))}. Today it is ${b(pct + '% off')}! ${n} buys it and pays with ${b(money(pay))}. How much change does ${n} get?`,
        steps: [
          { q: `How much is ${pct}% of ${money(price)}?`, a: off, hint: `${pct}% = ${pct}/100, so ${price} × ${pct} ÷ 100 = ?`, money: true },
          { q: 'What is the sale price?', a: salePrice, hint: `${money(price)} − ${money(off)} = ?`, money: true },
          { q: 'How much change?', a: pay - salePrice, hint: `${money(pay)} − ${money(salePrice)} = ?`, money: true },
        ],
      };
    },
    function ratio() {
      const r1 = ri(1, 5), r2_ = ri(2, 7), k = ri(3, 12);
      if (r1 === r2_) return T[6][1]();
      const tot = k * (r1 + r2_);
      return {
        title: 'Gem Ratio', icon: '💎',
        text: `A treasure chest holds red 🔴 and blue 🔵 gems in the ratio ${b(r1 + ' : ' + r2_)} (red to blue). There are ${b(tot)} gems in all. How many red gems are there?`,
        steps: [
          { q: 'How many parts are there in all?', a: r1 + r2_, hint: `${r1} + ${r2_} = ?`, unit: 'parts' },
          { q: 'How many gems are in one part?', a: k, hint: `${tot} ÷ ${r1 + r2_} = ?`, unit: 'gems' },
          { q: 'How many red gems?', a: k * r1, hint: `${k} × ${r1} = ?`, unit: 'gems' },
        ],
      };
    },
    function griffin() {
      const s1 = ri(4, 12) * 5, t1 = ri(2, 5), s2 = ri(3, 10) * 5, t2 = ri(1, 4);
      return {
        title: 'Griffin Flight', icon: '🦅',
        text: `A griffin flies at ${b(s1)} miles per hour for ${b(t1)} hours. Then it slows down to ${b(s2)} miles per hour for ${b(t2)} more hours. How far did it fly in all?`,
        steps: [
          { q: 'How far in the first part?', a: s1 * t1, hint: `${s1} × ${t1} = ?`, unit: 'miles' },
          { q: 'How far in the second part?', a: s2 * t2, hint: `${s2} × ${t2} = ?`, unit: 'miles' },
          { q: 'How far in all?', a: s1 * t1 + s2 * t2, hint: `${s1 * t1} + ${s2 * t2} = ?`, unit: 'miles' },
        ],
      };
    },
    function unitRate() {
      const k = ri(3, 8), unit = pick([ri(2, 12), ri(2, 12) + 0.5]), m = ri(5, 15), cost = r2(k * unit);
      return {
        title: 'Potion Prices', icon: '⚗️',
        text: `${b(k)} healing potions cost ${b(money(cost))}. At the same price, how much would ${b(m)} potions cost?`,
        steps: [
          { q: 'How much does 1 potion cost (the unit rate)?', a: unit, hint: `${money(cost)} ÷ ${k} = ?`, money: true },
          { q: `How much would ${m} potions cost?`, a: r2(unit * m), hint: `${money(unit)} × ${m} = ?`, money: true },
        ],
      };
    },
    function feastTip() {
      let meal, k;
      do { meal = ri(4, 15) * 10; k = pick([2, 3, 4, 5]); } while (Math.round(meal * 1.2 * 100) % k !== 0);
      const tip = meal * 0.2, tot = meal + tip;
      return {
        title: 'Royal Feast', icon: '🍗',
        text: `A feast for ${b(k)} knights costs ${b(money(meal))}. They leave a ${b('20% tip')} for the cook. They split the total cost equally. How much does each knight pay?`,
        steps: [
          { q: `What is 20% of ${money(meal)}?`, a: r2(tip), hint: `${meal} × 20 ÷ 100 = ?`, money: true },
          { q: 'What is the total with the tip?', a: r2(tot), hint: `${money(meal)} + ${money(tip)} = ?`, money: true },
          { q: 'How much does each knight pay?', a: r2(tot / k), hint: `${money(tot)} ÷ ${k} = ?`, money: true },
        ],
      };
    },
    function houseArea() {
      const W = ri(4, 12), H = ri(4, 10), h = 2 * ri(2, 5);
      return {
        title: 'Painting the Tower', icon: '🎨',
        text: `The front of a tower is a rectangle ${b(W)} feet wide and ${b(H)} feet tall, with a triangle roof on top. The roof triangle has a base of ${b(W)} feet and a height of ${b(h)} feet. What is the total area to paint?`,
        steps: [
          { q: 'What is the area of the rectangle?', a: W * H, hint: `${W} × ${H} = ?`, unit: 'sq ft' },
          { q: 'What is the area of the triangle?', a: (W * h) / 2, hint: `Triangle area = base × height ÷ 2 → ${W} × ${h} ÷ 2 = ?`, unit: 'sq ft' },
          { q: 'What is the total area?', a: W * H + (W * h) / 2, hint: `${W * H} + ${(W * h) / 2} = ?`, unit: 'sq ft' },
        ],
      };
    },
    function slimes() {
      let tot, pct, k;
      do { tot = ri(4, 20) * 20; pct = pick([15, 25, 35, 40, 45, 60, 75]); k = pick([2, 4, 5]); }
      while ((tot * pct) % 100 !== 0 || (tot - (tot * pct) / 100) % k !== 0);
      const s = (tot * pct) / 100, rest = tot - s;
      return {
        title: 'Monster Count', icon: '🟢',
        text: `There are ${b(tot)} monsters in the swamp. ${b(pct + '%')} of them are slimes. The rest are split equally into ${b(k)} groups. How many monsters are in each group?`,
        steps: [
          { q: `How many are slimes (${pct}% of ${tot})?`, a: s, hint: `${tot} × ${pct} ÷ 100 = ?`, unit: 'slimes' },
          { q: 'How many are NOT slimes?', a: rest, hint: `${tot} − ${s} = ?`, unit: 'monsters' },
          { q: 'How many in each group?', a: rest / k, hint: `${rest} ÷ ${k} = ?`, unit: 'monsters' },
        ],
      };
    },
    function missingScore() {
      const m = ri(6, 18), a = m + ri(-4, 4), bb = m + ri(-4, 4), c = m + ri(-4, 4);
      const need = 4 * m - (a + bb + c);
      if (need <= 0 || a <= 0 || bb <= 0 || c <= 0) return T[6][7]();
      const n = who();
      return {
        title: 'Arena Champion', icon: '🥇',
        text: `${n} wants an average (mean) of ${b(m)} points over 4 arena rounds. The first 3 scores are ${b(a)}, ${b(bb)}, and ${b(c)}. What must ${n} score in round 4?`,
        steps: [
          { q: `What total is needed for an average of ${m} in 4 rounds?`, a: 4 * m, hint: `${m} × 4 = ?`, unit: 'points' },
          { q: 'What is the total of the first 3 scores?', a: a + bb + c, hint: `${a} + ${bb} + ${c} = ?`, unit: 'points' },
          { q: 'What score is needed in round 4?', a: need, hint: `${4 * m} − ${a + bb + c} = ?`, unit: 'points' },
        ],
      };
    },
  ];

  let last = '';
  function generate(grade, name) {
    playerName = name || 'Hero';
    grade = Math.max(3, Math.min(6, grade | 0));
    // Mostly the chosen grade, sometimes review from the grade below.
    const g = grade > 3 && Math.random() < 0.25 ? grade - 1 : grade;
    let fn;
    do { fn = pick(T[g]); } while (fn.name === last && T[g].length > 1);
    last = fn.name;
    const p = fn();
    p.grade = g;
    p.key = fn.name;
    p.giver = pick(NPCS);
    p.answer = p.steps[p.steps.length - 1].a;
    p.final = p.steps[p.steps.length - 1];
    return p;
  }

  function check(input, expected) {
    if (input === '' || input === '.' || input == null) return false;
    const v = parseFloat(String(input).replace(/[$,]/g, ''));
    return Number.isFinite(v) && Math.abs(v - expected) < 0.001;
  }

  const api = { generate, check, money, fmt, esc, templates: T };
  (typeof window !== 'undefined' ? window : globalThis).MathGen = api;
})();
