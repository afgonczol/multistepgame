/* Number Knights – cartoon art kit.
   Every character, pet, portrait, icon and item is drawn here as SVG markup
   (chunky shapes, thick dark outlines, soft shading), so the game needs no image files. */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;
  const OL = '#2b1b17'; // outline ink
  const SW = 2.4; // default outline width (in a 100-unit box)

  /* ---------- colour helpers ---------- */
  function rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function hex(r, g, b) {
    return '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  }
  function mix(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return hex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
  }
  const lt = (c, t) => mix(c, '#ffffff', t);
  const dk = (c, t) => mix(c, '#000000', t);

  /* ---------- shared gradients (one hidden <svg> holds them all) ---------- */
  const made = new Set();
  const queue = [];
  let defsEl = null;
  function flush() {
    if (!defsEl && typeof document !== 'undefined' && document.body) {
      const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      s.setAttribute('width', '0'); s.setAttribute('height', '0'); s.setAttribute('aria-hidden', 'true');
      s.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      s.innerHTML = '<defs></defs>';
      document.body.insertBefore(s, document.body.firstChild);
      defsEl = s.firstChild;
    }
    if (defsEl && queue.length) { defsEl.insertAdjacentHTML('beforeend', queue.join('')); queue.length = 0; }
  }
  function def(id, markup) {
    if (made.has(id)) return;
    made.add(id); queue.push(markup); flush();
  }
  const key = (c) => c.replace('#', '').toLowerCase();
  /* Ball shading: light top-left, dark bottom-right. */
  function R(c) {
    const id = 'r' + key(c);
    def(id, `<radialGradient id="${id}" cx=".38" cy=".3" r=".8" fx=".32" fy=".22"><stop offset="0" stop-color="${lt(c, 0.42)}"/><stop offset=".5" stop-color="${c}"/><stop offset="1" stop-color="${dk(c, 0.32)}"/></radialGradient>`);
    return `url(#${id})`;
  }
  /* Vertical shading: light top, dark bottom. */
  function V(c) {
    const id = 'v' + key(c);
    def(id, `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${lt(c, 0.3)}"/><stop offset=".55" stop-color="${c}"/><stop offset="1" stop-color="${dk(c, 0.3)}"/></linearGradient>`);
    return `url(#${id})`;
  }
  /* Shiny metal with a bright band. */
  function M(c) {
    const id = 'm' + key(c);
    def(id, `<linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${lt(c, 0.55)}"/><stop offset=".35" stop-color="${c}"/><stop offset=".5" stop-color="${dk(c, 0.22)}"/><stop offset=".62" stop-color="${lt(c, 0.35)}"/><stop offset="1" stop-color="${dk(c, 0.3)}"/></linearGradient>`);
    return `url(#${id})`;
  }
  /* Soft glow blob (for magic, fire, gems). */
  function GL(c) {
    const id = 'gl' + key(c);
    def(id, `<radialGradient id="${id}"><stop offset="0" stop-color="#fff" stop-opacity="1"/><stop offset=".35" stop-color="${lt(c, 0.3)}" stop-opacity=".95"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`);
    return `url(#${id})`;
  }

  /* ---------- primitives ---------- */
  // Paint: '#hex' = shaded, '=#hex' = flat, 'url(...)' / 'none' as-is.
  function paint(c) {
    if (!c || c === 'none') return 'none';
    if (c[0] === '=') return c.slice(1);
    if (c[0] === '#') return R(c);
    return c;
  }
  function st(o) {
    if (o && o.w === 0) return '';
    return ` stroke="${(o && o.s) || OL}" stroke-width="${(o && o.w) || SW}" stroke-linejoin="round" stroke-linecap="round"`;
  }
  const xa = (o) => (o && o.x ? ' ' + o.x : '');
  const P = (d, c, o) => `<path d="${d}" fill="${paint(c)}"${st(o)}${xa(o)}/>`;
  const C = (cx, cy, r, c, o) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${paint(c)}"${st(o)}${xa(o)}/>`;
  const E = (cx, cy, rx, ry, c, o) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${paint(c)}"${st(o)}${xa(o)}/>`;
  const Rc = (x, y, w, h, r, c, o) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${paint(c)}"${st(o)}${xa(o)}/>`;
  const ln = (d, w, c, o) => `<path d="${d}" fill="none" stroke="${c || OL}" stroke-width="${w || SW}" stroke-linecap="round" stroke-linejoin="round"${xa(o)}/>`;
  // A stroked "tube" with an outline (staffs, bows, tails...).
  const tube = (d, w, c) => ln(d, w + SW * 1.6, OL) + ln(d, w, c);
  const hl = (cx, cy, rx, ry, rot, op) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff" opacity="${op || 0.5}" transform="rotate(${rot == null ? -30 : rot} ${cx} ${cy})"/>`;
  const g = (inner, tr, cls) => `<g${tr ? ` transform="${tr}"` : ''}${cls ? ` class="${cls}"` : ''}>${inner}</g>`;
  const op = (inner, o) => `<g opacity="${o}">${inner}</g>`;
  const shadow = (rx, cx, cy) => `<ellipse class="shd" cx="${cx || 50}" cy="${cy || 94}" rx="${rx || 26}" ry="${(rx || 26) * 0.22}" fill="#000" opacity=".28"/>`;

  function star(cx, cy, r, c, o, pts, inner) {
    pts = pts || 5; inner = inner || 0.45;
    let d = '';
    for (let i = 0; i < pts * 2; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / pts;
      const rr = i % 2 ? r * inner : r;
      d += (i ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1);
    }
    return P(d + 'Z', c, o);
  }

  /* Cartoon eye. o.lx/o.ly shift the pupil, o.r2 pupil size, o.pupil colour, o.lid draws a sleepy/angry lid. */
  function eye(x, y, r, o) {
    o = o || {};
    const lx = o.lx == null ? r * 0.28 : o.lx, ly = o.ly == null ? 0.05 * r : o.ly;
    const pr = r * (o.r2 || 0.56);
    let s = (o.white === false ? '' : C(x, y, r, o.sclera || '=#ffffff', { w: o.w || 1.8 }));
    s += C(x + lx, y + ly, pr, '=' + (o.pupil || '#1d1424'), { w: 0 });
    if (o.iris) s += C(x + lx, y + ly, pr * 0.62, '=' + o.iris, { w: 0 }) + C(x + lx, y + ly, pr * 0.32, '=#1d1424', { w: 0 });
    s += C(x + lx - pr * 0.35, y + ly - pr * 0.4, pr * 0.34, '=#ffffff', { w: 0 });
    if (o.lid) s += P(`M${x - r - 0.5} ${y - r * 0.15} Q${x} ${y - r * 1.5} ${x + r + 0.5} ${y - r * 0.15} Z`, '=' + o.lid, { w: 1.6 });
    return s;
  }
  /* Glowing evil eye (no white). */
  function glowEye(x, y, r, c) {
    return C(x, y, r * 2.2, GL(c), { w: 0 }) + E(x, y, r, r * 0.8, '=' + c, { w: 1.4 }) + C(x - r * 0.3, y - r * 0.25, r * 0.3, '=#ffffff', { w: 0 });
  }
  /* Eyebrow: thick dark slash. */
  const brow = (x1, y1, x2, y2, w, c) => ln(`M${x1} ${y1} L${x2} ${y2}`, w || 3.4, c || OL);
  /* Angry pair of brows above two eyes (facing right). */
  const angry = (x1, x2, y, r, c) => brow(x1 - r, y - r * 1.5, x1 + r * 0.9, y - r * 0.8, r * 0.75, c) + brow(x2 - r * 0.9, y - r * 0.8, x2 + r, y - r * 1.5, r * 0.75, c);
  /* Mouths */
  const smile = (x, y, w) => ln(`M${x - w} ${y} Q${x} ${y + w * 0.8} ${x + w} ${y}`, 2.2);
  const frown = (x, y, w) => ln(`M${x - w} ${y + w * 0.4} Q${x} ${y - w * 0.5} ${x + w} ${y + w * 0.4}`, 2.2);
  function grin(x, y, w, h, o) {
    // Open toothy mouth.
    o = o || {};
    let s = P(`M${x - w} ${y} Q${x} ${y + h * 2} ${x + w} ${y} Q${x} ${y + h * 0.5} ${x - w} ${y} Z`, '=' + (o.c || '#5a1420'), { w: 1.8 });
    if (o.teeth !== false) {
      const n = o.n || 3;
      for (let i = 0; i < n; i++) {
        const tx = x - w * 0.7 + (i * (w * 1.4)) / Math.max(1, n - 1);
        s += P(`M${tx - 1.8} ${y + h * 0.2} L${tx} ${y + h * 0.95} L${tx + 1.8} ${y + h * 0.2} Z`, '=#ffffff', { w: 1 });
      }
    }
    return s;
  }
  const fang = (x, y, s, dir) => P(`M${x} ${y} L${x + (dir || 1) * s * 0.5} ${y + s * 1.3} L${x + (dir || 1) * s} ${y} Z`, '=#ffffff', { w: 1.2 });
  const blush = (x, y, r) => E(x, y, r || 3.2, (r || 3.2) * 0.6, '=#ff8fa8', { w: 0, x: 'opacity=".7"' });

  /* Wrap a drawing in an <svg>. */
  function svg(inner, o) {
    o = o || {};
    return `<svg class="art ${o.cls || ''}" viewBox="${o.vb || '0 0 100 100'}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"${o.style ? ` style="${o.style}"` : ''}>${inner}</svg>`;
  }
  /* A standing figure: ground shadow + animated body group. */
  function fig(rx, body, o) {
    o = o || {};
    return svg(shadow(rx, o.cx, o.cy) + `<g class="bd${o.fly ? ' fly' : ''}">${body}</g>`, { cls: 'fig ' + (o.cls || '') });
  }

  /* =====================================================================
     HEROES (all face right)
     ===================================================================== */
  const HERO_ART = {
    knight() {
      const skin = '#ffcfa0';
      return fig(26,
        // sword held back
        P('M31 61 L15 21 Q15 15 20 17 L36 58 Z', M('#e5ebf2')) + ln('M20 20 L33 55', 1.2, '#ffffff', { x: 'opacity=".8"' }) +
        P('M22 63 L39 54 L41 58 L25 67 Z', M('#f4b934')) + Rc(26.5, 62, 6, 9, 2, '#7a4a22', { x: 'transform="rotate(-25 29 66)"' }) + C(27, 72, 3, M('#f4b934')) +
        // legs
        Rc(39, 79, 10, 14, 3.5, '#5d4a3c') + Rc(52, 79, 10, 14, 3.5, '#5d4a3c') +
        // body + breastplate + belt
        P('M33 85 Q31 62 42 55 L61 55 Q71 62 68 85 Z', '#3b6fd6') +
        P('M39 76 Q38 61 46 58 L57 58 Q64 61 63 76 Q51 80 39 76 Z', M('#d3dce6')) +
        Rc(34, 76, 33, 7, 3, '#7a4a22') + Rc(47, 76.5, 7, 6, 1.5, M('#ffcc33'), { w: 1.6 }) +
        C(30, 63, 5.5, skin) +
        // head
        C(52, 37, 19, skin) +
        P('M31 41 Q29 13 52 12 Q75 13 73 41 L67 42 Q67 27 52 26 Q37 27 37 42 Z', M('#c9d3de')) +
        Rc(49.5, 11, 5, 16, 2, M('#f4b934'), { w: 1.8 }) +
        P('M50 12 Q38 -1 20 7 Q35 9 43 18 Z', '#e8463c') + hl(34, 7, 6, 2, -15, 0.45) +
        hl(40, 19, 7, 3, -35, 0.6) +
        eye(48.5, 38, 4.4) + eye(60, 38, 4.4) + angry(48.5, 60, 38, 4.4) +
        smile(55, 47.5, 4.5) + blush(44, 45, 3) +
        // shield
        P('M57 52 L83 52 Q85 73 70 87 Q55 73 57 52 Z', M('#f4b934')) +
        P('M61 56 L79 56 Q80 71 70 82 Q60 71 61 56 Z', '#2f62cf', { w: 1.6 }) +
        P('M72 58 L64.5 70 L69.5 70 L66.5 80 L77 66 L71.5 66 L75 58 Z', '=#ffd84a', { w: 1.4 }) +
        hl(64, 59, 3, 1.5, -40, 0.5) +
        C(58, 66, 5, skin)
      );
    },
    archer() {
      const skin = '#f8c99b', hair = '#c4552b', cl = '#3aa152', hood = '#2c7d3b';
      return fig(25,
        // quiver
        P('M21 40 L33 35 L44 68 L32 73 Z', '#8a5a2b') + P('M21 40 L33 35 L35 40 L23 45 Z', M('#f4b934'), { w: 1.6 }) +
        P('M24 37 L17 26 L25 28 Z', '=#e8463c', { w: 1.4 }) + P('M29 35 L25 22 L32 26 Z', '=#ffffff', { w: 1.4 }) +
        // flowing hair behind
        P('M35 30 Q27 54 19 64 Q37 63 44 48 Z', hair) +
        // legs
        Rc(41, 79, 8.5, 14, 3, '#6b4a2b') + Rc(52.5, 79, 8.5, 14, 3, '#6b4a2b') +
        // body
        P('M35 85 Q34 63 43 56 L59 56 Q68 63 66 85 Z', cl) +
        P('M47 56 L50 70 L53 56 Z', '=#f1e3b8', { w: 1.4 }) +
        Rc(36, 74, 30, 6, 3, '#7a4a22') +
        // head + hood
        P('M30 46 Q26 13 52 13 Q76 13 73 42 Q66 22 52 22 Q37 22 35 47 Z', hood) +
        C(52, 38, 18, skin) +
        P('M34 36 Q34 16 54 16 Q72 17 72 34 Q64 23 52 23 Q41 24 34 36 Z', hood) +
        P('M38 31 Q46 22 61 27 Q53 30 44 35 Z', hair) +
        P('M36 39 L24 30 L35 46 Z', skin, { w: 2 }) +
        hl(44, 19, 7, 2.6, -25, 0.5) +
        eye(49, 39, 4.3, { iris: '#3aa152' }) + eye(60, 39, 4.3, { iris: '#3aa152' }) +
        brow(45, 33, 52, 32.5, 2.6) + brow(57, 32.5, 64, 33, 2.6) +
        smile(55, 47, 4) + blush(45, 45, 3) + blush(64, 45, 2.6) +
        // bow
        tube('M72 27 Q93 58 72 89', 4, '#9a6232') + ln('M73 30 Q90 58 73 86', 1.2, '#d9a86a') +
        ln('M72 27 L67 58 L72 89', 1.2, '#f3ead2') +
        C(68, 60, 5, skin)
      );
    },
    mage() {
      const skin = '#ffd7b5', robe = '#7d4fd6';
      return fig(26,
        // staff + orb
        tube('M76 93 L80 25', 4, '#8a5a2b') +
        C(80, 19, 13, GL('#62d8ff'), { w: 0 }) + C(80, 19, 7.5, '#4ccaff') + hl(77.5, 16.5, 2.5, 1.6, -30, 0.8) +
        P('M73 26 Q80 30 87 26 L85 31 Q80 33 75 31 Z', M('#f4b934'), { w: 1.6 }) +
        // robe
        P('M29 93 Q33 62 42 54 L60 54 Q68 62 73 93 Z', robe) +
        P('M29 93 Q51 97 73 93 L72 87 Q51 91 30 87 Z', M('#f4b934'), { w: 1.8 }) +
        star(40, 74, 3.2, '=#ffe066', { w: 1.2 }) + star(60, 80, 2.6, '=#ffe066', { w: 1.2 }) + star(52, 64, 2.2, '=#ffe066', { w: 1.2 }) +
        C(75, 62, 5, skin) +
        // head + beard
        C(50, 42, 15.5, skin) +
        P('M36 44 Q37 72 50 78 Q63 72 64 44 Q57 53 50 51 Q43 53 36 44 Z', '#f4f1ea') +
        ln('M44 58 Q47 66 50 70', 1.2, '#cfc8ba') + ln('M56 58 Q53 66 50 70', 1.2, '#cfc8ba') +
        P('M41 50.5 Q50 45 59 50.5 Q54 54 50 52 Q46 54 41 50.5 Z', '#e8e4da', { w: 1.8 }) +
        E(54, 46, 3.6, 3, skin, { w: 1.8 }) +
        eye(46, 40, 3.4, { iris: '#5aa0ff' }) + eye(57, 40, 3.4, { iris: '#5aa0ff' }) +
        P('M40 35 Q46 31 51 35 L50 37 Q45 35 41 37 Z', '=#f4f1ea', { w: 1.4 }) + P('M53 35 Q58 31 64 35 L63 37 Q58 35 54 37 Z', '=#f4f1ea', { w: 1.4 }) +
        // hat
        P('M35 33 Q41 13 33 1 Q58 6 66 32 Q50 27 35 33 Z', robe) +
        P('M23 34 Q50 23 79 33 Q75 39 50 35 Q30 38 23 34 Z', dk(robe, 0.08)) +
        Rc(36, 27.5, 30, 5, 2.5, M('#f4b934'), { w: 1.6, x: 'transform="rotate(-3 50 30)"' }) +
        star(48, 16, 3, '=#ffe066', { w: 1.2 }) + star(56, 23, 2, '=#ffe066', { w: 1 }) + hl(43, 14, 3, 7, 20, 0.35)
      );
    },
    healer() {
      const skin = '#ffdcc6', hair = '#ff7fbf', dress = '#ff9ccf';
      return fig(22,
        // wings
        op(E(33, 47, 13, 22, '#bdf3ff', { x: 'transform="rotate(-28 33 47)"' }) + E(30, 66, 9, 13, '#bdf3ff', { x: 'transform="rotate(-62 30 66)"' }), 0.85) +
        hl(29, 40, 4, 10, -28, 0.6) +
        // legs
        Rc(44, 80, 5, 11, 2.5, skin, { w: 1.8 }) + Rc(53, 80, 5, 11, 2.5, skin, { w: 1.8 }) +
        E(46, 92, 5, 3, '#ff5fa2', { w: 1.8 }) + E(56, 92, 5, 3, '#ff5fa2', { w: 1.8 }) +
        // dress
        P('M34 84 Q37 62 44 55 L58 55 Q65 62 68 84 Q51 90 34 84 Z', dress) +
        P('M35 83 Q51 89 67 83 L68 86 Q51 92 34 86 Z', '=#ffffff', { w: 1.6 }) +
        P('M44 55 L51 63 L58 55 Z', '=#ffffff', { w: 1.6 }) +
        // hair back
        C(51, 38, 19.5, hair) +
        // head
        C(51, 39, 16.5, skin) +
        C(50, 17, 8.5, hair) + hl(47, 14, 3, 2, -30, 0.6) +
        P('M35 36 Q38 20 52 21 Q66 21 68 36 Q60 28 52 30 Q44 27 35 36 Z', hair) +
        star(60, 21, 4.5, '=#ffe066', { w: 1.4 }) +
        eye(46, 40, 4.6, { iris: '#a05bd6' }) + eye(58, 40, 4.6, { iris: '#a05bd6' }) +
        ln('M42 35.5 L40 33.5 M44 35 L43 32.5', 1.4) + ln('M62 35.5 L64 33.5 M60 35 L61 32.5', 1.4) +
        smile(52, 48, 3.4) + blush(42, 46, 3) + blush(62, 46, 3) +
        // wand
        tube('M64 72 L75 45', 2.4, '#f6e7ff') + star(76.5, 40, 7.5, '#ffd84a', { w: 1.8 }) + C(76.5, 40, 12, GL('#fff27a'), { w: 0 }) +
        C(64, 70, 4.5, skin)
      );
    },
    ninja() {
      const gi = '#363b5c', skin = '#eab78d', red = '#e23b3b';
      return fig(26,
        // sword handle on back
        tube('M27 24 L40 52', 3.6, '#8f2d2d') + Rc(28, 36, 10, 3.5, 1.5, M('#f4b934'), { w: 1.4, x: 'transform="rotate(-25 33 38)"' }) +
        // headband tails
        P('M35 29 Q22 22 10 30 Q22 30 32 34 Z', red) + P('M35 32 Q20 34 12 44 Q24 38 34 37 Z', red) +
        // legs (ready stance)
        P('M40 77 L34 93 L45 93 L48 80 Z', dk(gi, 0.1)) + P('M55 80 L58 93 L68 93 L62 77 Z', dk(gi, 0.1)) +
        Rc(33, 89, 12, 5, 2.5, '#22253a') + Rc(57, 89, 12, 5, 2.5, '#22253a') +
        // body
        P('M34 83 Q33 62 42 56 L60 56 Q69 62 67 83 Z', gi) +
        P('M46 56 L51 66 L56 56 Z', '=#22253a', { w: 1.4 }) +
        Rc(35, 72, 31, 6, 3, red) +
        // head
        C(52, 38, 19, gi) + hl(42, 26, 6, 3, -35, 0.35) +
        Rc(36.5, 31, 31, 12, 6, skin) +
        Rc(33, 23, 39, 6.5, 3, red) + Rc(48, 22.5, 8, 7.5, 2, M('#d3dce6'), { w: 1.6 }) +
        eye(48, 37, 3.8) + eye(60, 37, 3.8) + angry(48, 60, 37, 3.8) +
        // shuriken
        P('M72 52 L75 59 L82 62 L75 65 L72 72 L69 65 L62 62 L69 59 Z', M('#c9d3de')) + C(72, 62, 2, '=' + OL, { w: 0 }) +
        C(65, 64, 5, gi)
      );
    },
    dragon() {
      const red = '#e2482f', belly = '#ffd38a', horn = '#fff1d0';
      return fig(28,
        // tail
        P('M34 80 Q12 86 9 66 Q18 77 34 72 Z', red) + P('M9 67 L2 58 L15 61 Z', '#ffb347') +
        // wing
        P('M40 58 Q20 32 28 14 Q35 28 47 31 Q44 44 52 54 Z', '#b8321f') +
        ln('M30 20 L44 52 M38 30 L48 52', 1.4) +
        // legs
        Rc(37, 80, 12, 13, 5, red) + Rc(55, 80, 12, 13, 5, red) +
        P('M38 92 L40 89 L42 92 L44 89 L46 92', '=' + horn, { w: 1.2 }) +
        // body
        E(51, 70, 20, 18, red) +
        P('M52 56 Q68 58 68 72 Q68 86 56 88 Q46 76 52 56 Z', belly) + ln('M52 63 Q60 64 66 62 M51 70 Q60 72 68 70 M51 77 Q60 79 66 77', 1.3, '#d99b54') +
        // spikes
        P('M33 56 L28 50 L36 53 Z M30 64 L23 60 L31 61 Z', '=#ffb347', { w: 1.4 }) +
        // head
        P('M44 25 L35 8 L51 21 Z', horn) + P('M54 22 L52 6 L62 21 Z', horn) +
        E(57, 38, 20, 17, red) + E(73, 45, 13, 10, red) + hl(50, 28, 7, 3, -25, 0.45) +
        C(78, 42, 1.3, '=' + OL, { w: 0 }) + C(83, 44, 1.3, '=' + OL, { w: 0 }) +
        eye(54, 34, 5.5, { iris: '#ffb000' }) + eye(66, 34, 5, { iris: '#ffb000' }) +
        brow(48, 26, 58, 27.5, 3) + brow(62, 27.5, 71, 26, 3) +
        ln('M64 51 Q72 55 82 50', 2.2) + fang(74, 51.8, 3) +
        // arm
        P('M58 60 Q68 56 73 63 Q70 69 63 67 Z', red) + P('M72 61 l3 -1.5 M73 64 l3.4 0.4 M71.5 67 l2.8 1.6', 'none', { w: 1.8 })
      );
    },
  };

  /* =====================================================================
     PETS (cute, sitting) and the cute critter kit
     ===================================================================== */
  // Generic cute critter head: ears type, colours, extras.
  function critterHead(o) {
    const c = o.c, x = o.x || 50, y = o.y || 44, r = o.r || 22;
    let s = '';
    const inner = o.inner || lt(c, 0.45);
    if (o.ears === 'point') {
      s += P(`M${x - r * 0.95} ${y - r * 0.3} L${x - r * 0.75} ${y - r * 1.3} L${x - r * 0.15} ${y - r * 0.85} Z`, o.earC || c) + P(`M${x + r * 0.95} ${y - r * 0.3} L${x + r * 0.75} ${y - r * 1.3} L${x + r * 0.15} ${y - r * 0.85} Z`, o.earC || c);
      s += P(`M${x - r * 0.78} ${y - r * 0.55} L${x - r * 0.7} ${y - r * 1.08} L${x - r * 0.35} ${y - r * 0.82} Z`, '=' + inner, { w: 0 }) + P(`M${x + r * 0.78} ${y - r * 0.55} L${x + r * 0.7} ${y - r * 1.08} L${x + r * 0.35} ${y - r * 0.82} Z`, '=' + inner, { w: 0 });
    } else if (o.ears === 'round') {
      s += C(x - r * 0.72, y - r * 0.78, r * 0.38, o.earC || c) + C(x + r * 0.72, y - r * 0.78, r * 0.38, o.earC || c);
      s += C(x - r * 0.72, y - r * 0.78, r * 0.2, '=' + inner, { w: 0 }) + C(x + r * 0.72, y - r * 0.78, r * 0.2, '=' + inner, { w: 0 });
    } else if (o.ears === 'long') {
      s += E(x - r * 0.4, y - r * 1.25, r * 0.26, r * 0.75, o.earC || c, { x: `transform="rotate(-12 ${x - r * 0.4} ${y - r * 1.25})"` }) + E(x + r * 0.42, y - r * 1.25, r * 0.26, r * 0.75, o.earC || c, { x: `transform="rotate(14 ${x + r * 0.42} ${y - r * 1.25})"` });
      s += E(x - r * 0.4, y - r * 1.22, r * 0.12, r * 0.55, '=#ffb3c6', { w: 0, x: `transform="rotate(-12 ${x - r * 0.4} ${y - r * 1.22})"` }) + E(x + r * 0.42, y - r * 1.22, r * 0.12, r * 0.55, '=#ffb3c6', { w: 0, x: `transform="rotate(14 ${x + r * 0.42} ${y - r * 1.22})"` });
    } else if (o.ears === 'flop') {
      s += E(x - r * 0.95, y - r * 0.05, r * 0.3, r * 0.62, o.earC || dk(c, 0.3), { x: `transform="rotate(18 ${x - r * 0.95} ${y})"` }) + E(x + r * 0.95, y - r * 0.05, r * 0.3, r * 0.62, o.earC || dk(c, 0.3), { x: `transform="rotate(-18 ${x + r * 0.95} ${y})"` });
    }
    if (o.mane) s = C(x, y + 2, r * 1.42, o.mane) + s;
    s += E(x, y, r, r * 0.92, c);
    if (o.patches) s += E(x - r * 0.4, y - r * 0.02, r * 0.27, r * 0.33, '=' + o.patches, { w: 0, x: `transform="rotate(25 ${x - r * 0.4} ${y})"` }) + E(x + r * 0.4, y - r * 0.02, r * 0.27, r * 0.33, '=' + o.patches, { w: 0, x: `transform="rotate(-25 ${x + r * 0.4} ${y})"` });
    if (o.stripes) s += ln(`M${x - r * 0.25} ${y - r * 0.9} L${x - r * 0.15} ${y - r * 0.55} M${x + r * 0.25} ${y - r * 0.9} L${x + r * 0.15} ${y - r * 0.55} M${x} ${y - r * 0.92} L${x} ${y - r * 0.6} M${x - r * 0.95} ${y + r * 0.05} L${x - r * 0.62} ${y + r * 0.1} M${x + r * 0.95} ${y + r * 0.05} L${x + r * 0.62} ${y + r * 0.1}`, 2.6, o.stripes);
    s += hl(x - r * 0.42, y - r * 0.5, r * 0.3, r * 0.14, -30, 0.5);
    if (o.muzzle) s += E(x, y + r * 0.42, r * 0.5, r * 0.36, '=' + o.muzzle, { w: 0 });
    s += eye(x - r * 0.38, y + 0.02 * r, r * 0.2, { lx: 0, ly: 0, r2: 0.7, w: 1.4 });
    s += eye(x + r * 0.38, y + 0.02 * r, r * 0.2, { lx: 0, ly: 0, r2: 0.7, w: 1.4 });
    s += E(x, y + r * 0.3, r * 0.12, r * 0.08, '=' + (o.nose || '#3a2a2a'), { w: 0 });
    s += ln(`M${x - r * 0.16} ${y + r * 0.45} Q${x} ${y + r * 0.6} ${x + r * 0.16} ${y + r * 0.45}`, 1.8);
    s += blush(x - r * 0.62, y + r * 0.35, r * 0.13) + blush(x + r * 0.62, y + r * 0.35, r * 0.13);
    return s;
  }
  function critter(o) {
    const c = o.c;
    let s = '';
    if (o.tail) s += o.tail;
    s += E(50, 76, 17, 15, c);
    if (o.belly) s += E(50, 79, 10, 10, '=' + o.belly, { w: 0 });
    s += E(41, 90, 6, 4, c, { w: 2 }) + E(59, 90, 6, 4, c, { w: 2 });
    s += critterHead(Object.assign({ x: 50, y: 46, r: 22 }, o));
    if (o.extra) s += o.extra;
    return fig(20, s);
  }

  const PET_ART = {
    puppy: () => critter({ c: '#e0a96d', ears: 'flop', earC: '#9a6232', muzzle: '#fff1dc', belly: '#fff1dc', tail: tube('M64 80 Q76 76 74 64', 4, '#e0a96d') }),
    kitty: () => critter({ c: '#a7b0bd', ears: 'point', stripes: '#6f7885', muzzle: '#f2f2f2', belly: '#f2f2f2', nose: '#ff8fa8', tail: tube('M64 84 Q82 84 78 64', 4, '#a7b0bd') }),
    owl() {
      return fig(20,
        P('M30 70 Q28 40 50 30 Q72 40 70 70 Q66 90 50 91 Q34 90 30 70 Z', '#9a6a3f') +
        P('M34 48 L28 26 L44 38 Z', '#9a6a3f') + P('M66 48 L72 26 L56 38 Z', '#9a6a3f') +
        E(50, 74, 12, 14, '=#f1dcb4', { w: 0 }) + ln('M44 70 l3 3 l3 -3 M50 76 l3 3 l3 -3 M44 82 l3 3 l3 -3', 1.4, '#b48a5a') +
        C(41, 50, 9, '=#fff4dc', { w: 1.8 }) + C(59, 50, 9, '=#fff4dc', { w: 1.8 }) +
        eye(41, 50, 5.5, { lx: 0, ly: 0, iris: '#f4a300', white: false }) + eye(59, 50, 5.5, { lx: 0, ly: 0, iris: '#f4a300', white: false }) +
        P('M47 57 L53 57 L50 63 Z', '=#f4a300', { w: 1.6 }) +
        P('M30 62 Q22 74 34 84 Z', '#7a5230') + P('M70 62 Q78 74 66 84 Z', '#7a5230') + hl(42, 38, 6, 2.5, -20, 0.4) +
        E(44, 91, 4, 2.5, '=#f4a300', { w: 1.4 }) + E(56, 91, 4, 2.5, '=#f4a300', { w: 1.4 })
      );
    },
    turtle() {
      return fig(26,
        E(30, 88, 6, 5, '#7dcf6a') + E(70, 88, 6, 5, '#7dcf6a') +
        C(76, 62, 13, '#7dcf6a') + hl(72, 56, 4, 2, -30, 0.5) +
        eye(74, 60, 4.2, { lx: 1, ly: 0, r2: 0.7 }) + eye(83, 60, 3.6, { lx: 1, ly: 0, r2: 0.7 }) + smile(80, 68, 3) + blush(72, 67, 2.4) +
        P('M18 82 Q18 50 46 48 Q72 50 70 82 Z', '#3f9e5a') +
        P('M30 78 L34 62 L46 58 L58 62 L62 78 Z', '=#2f7f45', { w: 1.6 }) + ln('M34 62 L28 54 M58 62 L64 54 M46 58 L46 50', 1.6) +
        Rc(16, 78, 56, 8, 4, '#c9e88a') + hl(36, 55, 8, 3, -15, 0.45)
      );
    },
    fox: () => critter({ c: '#f08a2c', ears: 'point', earC: '#f08a2c', inner: '#3a2a2a', muzzle: '#fff4e4', belly: '#fff4e4', tail: tube('M64 82 Q86 82 80 60', 7, '#f08a2c') + C(80, 59, 4.5, '=#fff4e4', { w: 1.6 }) }),
    bunny: () => critter({ c: '#f6f1ee', ears: 'long', muzzle: '#ffffff', belly: '#ffffff', nose: '#ff8fa8', tail: C(68, 84, 6, '#ffffff') }),
    panda: () => critter({ c: '#f7f7f4', ears: 'round', earC: '#2e2e36', inner: '#2e2e36', patches: '#2e2e36', belly: '#ffffff', extra: E(36, 72, 6, 9, '=#2e2e36', { w: 0 }) + E(64, 72, 6, 9, '=#2e2e36', { w: 0 }) }),
    unicorn() {
      const mane = (x) => x;
      return fig(22, mane(
        P('M34 30 Q20 50 26 70 Q34 56 40 44 Z', '#c17dff') + P('M36 40 Q26 58 34 76 Q40 60 44 50 Z', '#ff86c8') +
        E(50, 77, 17, 14, '#fbf7ff') + E(41, 90, 6, 4, '#fbf7ff', { w: 2 }) + E(59, 90, 6, 4, '#fbf7ff', { w: 2 }) +
        P('M38 30 L42 16 L48 28 Z', '#fbf7ff') + P('M58 28 L64 16 L66 31 Z', '#fbf7ff') +
        E(52, 44, 20, 18, '#fbf7ff') + E(60, 54, 13, 10, '#fbf7ff') + C(60, 52, 3, '=#ffd0e6', { w: 0 }) +
        P('M48 28 L54 4 L60 27 Z', M('#ffd84a')) + ln('M50 22 L58 19 M51 15 L57 13', 1.2, '#c79a10') +
        P('M40 28 Q50 20 60 30 Q50 30 44 38 Z', '#7fd8ff') +
        hl(44, 34, 5, 2.5, -30, 0.5) +
        eye(46, 44, 4.2, { lx: 0.5, ly: 0, iris: '#a05bd6', r2: 0.72 }) + eye(60, 43, 3.8, { lx: 0.5, ly: 0, iris: '#a05bd6', r2: 0.72 }) +
        C(57, 56, 1, '=' + OL, { w: 0 }) + C(64, 56, 1, '=' + OL, { w: 0 }) + blush(44, 52, 2.6)
      ));
    },
    lion: () => critter({ c: '#f4b942', ears: 'round', earC: '#f4b942', inner: '#c77d1a', mane: '#c4621f', muzzle: '#fff1d0', belly: '#fff1d0', tail: tube('M64 82 Q82 84 80 66', 3, '#f4b942') + C(80, 64, 4.5, '#c4621f', { w: 1.6 }) }),
  };

  /* =====================================================================
     PORTRAITS: player avatars and quest givers (busts in a 100 box)
     ===================================================================== */
  function bust(o) {
    const skin = o.skin || '#ffd2a8';
    let s = '';
    s += P('M18 100 Q20 74 50 72 Q80 74 82 100 Z', o.shirt || '#4a7bd1');
    if (o.collar) s += o.collar;
    if (o.hairBack) s += o.hairBack;
    s += Rc(43, 62, 14, 12, 5, skin, { w: 2 });
    s += C(50, 46, 22, skin);
    s += C(28.5, 48, 4.5, skin, { w: 2 }) + C(71.5, 48, 4.5, skin, { w: 2 });
    if (o.ears) s += o.ears;
    if (o.hair) s += o.hair;
    s += eye(41, 47, 4.4, { lx: 0.4, ly: 0.4, iris: o.iris }) + eye(59, 47, 4.4, { lx: 0.4, ly: 0.4, iris: o.iris });
    s += o.brows || (brow(36, 40, 45, 39, 2.6) + brow(55, 39, 64, 40, 2.6));
    s += E(50, 53, 3.4, 2.6, dk(skin, 0.12), { w: 0 });
    s += o.mouth || smile(50, 59, 5);
    s += blush(36, 56, 3.2) + blush(64, 56, 3.2);
    if (o.beard) s += o.beard;
    if (o.hat) s += o.hat;
    if (o.extra) s += o.extra;
    return svg(s, { cls: 'bust' });
  }
  const NPC_ART = {
    'Baker Bo': () => bust({ shirt: '#f7f2ea', hair: P('M30 40 Q32 26 50 26 Q68 26 70 40 Q60 32 50 34 Q40 32 30 40 Z', '#7a4a22'), hat: P('M30 32 Q24 14 38 14 Q42 2 52 8 Q62 2 66 14 Q78 14 70 32 Z', '=#ffffff') + Rc(30, 27, 40, 8, 3, '=#f2ece0'), mouth: grin(50, 58, 6, 3, { teeth: false, c: '#b03040' }) }),
    'Farmer Fern': () => bust({ skin: '#f6c49a', shirt: '#5c8fd6', collar: P('M36 74 L40 100 L46 100 L44 76 Z M64 74 L60 100 L54 100 L56 76 Z', '#8a5a2b', { w: 1.8 }), hairBack: P('M27 46 Q24 76 34 82 L40 60 Z M73 46 Q76 76 66 82 L60 60 Z', '#c4552b'), hat: E(50, 30, 32, 8, '#f2cf6b') + P('M33 30 Q34 12 50 12 Q66 12 67 30 Z', '#f2cf6b') + Rc(34, 24, 32, 5, 2, '=#e8463c', { w: 1.6 }) }),
    'Wizard Wren': () => bust({ shirt: '#3f8fd6', hairBack: P('M27 44 Q22 78 36 84 L40 58 Z M73 44 Q78 78 64 84 L60 58 Z', '#2e2e36'), hat: P('M24 32 Q50 22 76 32 Q72 37 50 33 Q30 37 24 32 Z', '#3f8fd6') + P('M35 31 Q42 10 38 -2 Q60 6 65 30 Q50 26 35 31 Z', '#3f8fd6') + star(52, 18, 3.5, '=#ffe066', { w: 1.2 }), iris: '#3aa152' }),
    'Captain Kale': () => bust({ skin: '#e8b48a', shirt: '#7a2a2a', beard: P('M32 54 Q34 76 50 78 Q66 76 68 54 Q58 64 50 62 Q42 64 32 54 Z', '#3a2418'), mouth: '', hat: P('M20 34 Q50 4 80 34 Q50 26 20 34 Z', '#2e2e36') + ln('M42 22 l8 6 M50 22 l-8 6', 2, '#ffffff'), extra: Rc(55, 42, 11, 9, 4, '=#1d1424', { w: 0 }) + ln('M28 40 L72 38', 1.8) }),
    'Princess Pip': () => bust({ skin: '#ffd9c2', shirt: '#ff7fbf', hairBack: P('M26 44 Q20 84 38 86 L40 56 Z M74 44 Q80 84 62 86 L60 56 Z', '#ffcf3f'), hair: P('M28 44 Q30 22 50 22 Q70 22 72 44 Q62 32 50 34 Q38 32 28 44 Z', '#ffcf3f'), hat: P('M36 26 L38 12 L44 20 L50 8 L56 20 L62 12 L64 26 Z', M('#ffd84a')) + C(50, 18, 2.2, '=#ff5fa2', { w: 1 }), iris: '#5aa0ff' }),
    'Gnome Gus': () => bust({ shirt: '#3aa152', beard: P('M30 54 Q32 84 50 88 Q68 84 70 54 Q60 64 50 62 Q40 64 30 54 Z', '#f4f1ea'), mouth: '', hat: P('M27 38 Q32 4 66 -2 Q58 14 73 38 Q50 32 27 38 Z', '#e8463c') }),
    'Blacksmith Bruno': () => bust({ skin: '#d9a07a', shirt: '#5d4a3c', beard: P('M32 56 Q36 72 50 72 Q64 72 68 56 Q60 62 50 61 Q40 62 32 56 Z', '#2e2e36'), mouth: '', hat: Rc(28, 30, 44, 6, 3, '#e8463c'), brows: brow(35, 39, 46, 41, 3.4) + brow(54, 41, 65, 39, 3.4), extra: hl(42, 32, 6, 2.5, -10, 0.5) }),
    'Queen Quin': () => bust({ skin: '#f2c3a0', shirt: '#8a4fd1', hairBack: P('M26 44 Q22 80 36 84 L40 56 Z M74 44 Q78 80 64 84 L60 56 Z', '#8a4a2b'), hair: P('M28 44 Q30 22 50 22 Q70 22 72 44 Q62 32 50 34 Q38 32 28 44 Z', '#8a4a2b'), hat: P('M32 28 L30 8 L40 18 L50 4 L60 18 L70 8 L68 28 Z', M('#ffd84a')) + C(50, 18, 3, '=#4ccaff', { w: 1 }) + C(39, 21, 2, '=#e8463c', { w: 1 }) + C(61, 21, 2, '=#e8463c', { w: 1 }) }),
    'Robo Rex': () => svg(
      P('M18 100 Q20 74 50 72 Q80 74 82 100 Z', '#8a96a8') + Rc(43, 62, 14, 12, 3, '#b8c2d0', { w: 2 }) +
      tube('M50 20 L50 8', 2, '#8a96a8') + C(50, 7, 4, '#e8463c') +
      Rc(26, 20, 48, 44, 10, '#c3ccd8') + Rc(32, 34, 36, 16, 6, '=#1d2a3a') +
      C(42, 42, 4.5, GL('#5af0ff'), { w: 0 }) + C(42, 42, 3, '=#5af0ff', { w: 0 }) + C(58, 42, 4.5, GL('#5af0ff'), { w: 0 }) + C(58, 42, 3, '=#5af0ff', { w: 0 }) +
      Rc(40, 54, 20, 5, 2, '=#5d6a7a', { w: 1.6 }) + ln('M45 54 L45 59 M50 54 L50 59 M55 54 L55 59', 1.2) + hl(36, 26, 7, 2.5, -15, 0.6) +
      C(24, 42, 5, '#8a96a8') + C(76, 42, 5, '#8a96a8'), { cls: 'bust' }),
    'Elf Ella': () => bust({ skin: '#f8d3b0', shirt: '#2c7d3b', ears: P('M28 46 L14 34 L30 54 Z M72 46 L86 34 L70 54 Z', '#f8d3b0', { w: 2 }), hairBack: P('M26 42 Q20 82 36 86 L40 56 Z M74 42 Q80 82 64 86 L60 56 Z', '#f6e08a'), hair: P('M28 42 Q30 22 50 22 Q70 22 72 42 Q60 30 48 34 Q38 32 28 42 Z', '#f6e08a'), iris: '#3aa152', extra: C(66, 30, 3, '=#ff86c8', { w: 1.2 }) }),
    'Chef Chip': () => bust({ shirt: '#ffffff', hair: '', hat: P('M30 32 Q20 12 36 12 Q40 -2 50 6 Q62 -2 66 12 Q80 12 70 32 Z', '=#ffffff') + Rc(30, 26, 40, 9, 3, '=#f2ece0'), beard: P('M38 58 Q44 52 50 56 Q56 52 62 58 Q56 60 50 58 Q44 60 38 58 Z', '#3a2418', { w: 1.6 }), mouth: smile(50, 63, 4), collar: P('M42 74 L50 84 L58 74', '=#e8463c', { w: 1.6 }) }),
    'Sailor Sam': () => bust({ skin: '#e8b48a', shirt: '#ffffff', collar: P('M30 76 L50 92 L70 76 L66 100 L34 100 Z', '#2f62cf', { w: 1.8 }) + P('M46 86 L50 94 L54 86 Z', '=#e8463c', { w: 1.2 }), hair: P('M30 40 Q32 26 50 26 Q68 26 70 40 Q60 34 50 35 Q40 34 30 40 Z', '#2e2e36'), hat: P('M30 30 Q50 16 70 30 L68 34 Q50 28 32 34 Z', '=#ffffff') + Rc(32, 30, 36, 5, 2.5, '#2f62cf', { w: 1.6 }) }),
  };

  // Player avatars (profiles store the emoji; we draw a portrait for it).
  const AVATAR_ART = {
    '🦸': () => bust({ shirt: '#e8463c', hair: P('M28 40 Q30 22 50 22 Q70 22 72 40 Q62 28 54 32 Q46 26 28 40 Z', '#3a2418'), extra: Rc(29, 40, 42, 10, 5, '=#2f62cf', { w: 1.8 }) + eye(41, 45, 3.6, { lx: 0.3, ly: 0 }) + eye(59, 45, 3.6, { lx: 0.3, ly: 0 }) + P('M44 82 L50 76 L56 82 L50 90 Z', '=#ffd84a', { w: 1.6 }) }),
    '🧑‍🚀': () => svg(
      P('M18 100 Q20 74 50 72 Q80 74 82 100 Z', '#f2f2f2') + Rc(36, 80, 12, 8, 2, '=#e8463c', { w: 1.4 }) +
      C(50, 46, 30, '#f2f2f2') + C(50, 47, 22, '=#ffd2a8', { w: 1.8 }) +
      eye(42, 47, 4.2, { lx: 0.3, ly: 0.3 }) + eye(58, 47, 4.2, { lx: 0.3, ly: 0.3 }) + smile(50, 57, 5) + blush(36, 55, 3) + blush(64, 55, 3) +
      P('M30 40 Q34 24 50 24 Q66 24 70 40 Q60 30 50 32 Q40 30 30 40 Z', '#7a4a22', { w: 1.6 }) +
      C(50, 46, 24, 'none', { w: 2.6, s: '#7fb0d6' }) + hl(36, 30, 8, 4, -35, 0.7) + hl(66, 64, 3, 1.5, -35, 0.6), { cls: 'bust' }),
    '🦊': () => svg(critterHead({ c: '#f08a2c', ears: 'point', inner: '#3a2a2a', muzzle: '#fff4e4', x: 50, y: 56, r: 30 }), { cls: 'bust' }),
    '🐯': () => svg(critterHead({ c: '#f4a034', ears: 'round', inner: '#fff4e4', stripes: '#3a2418', muzzle: '#fff4e4', x: 50, y: 56, r: 30 }), { cls: 'bust' }),
    '🦄': () => PET_ART.unicorn(),
    '🐼': () => svg(critterHead({ c: '#f7f7f4', ears: 'round', earC: '#2e2e36', inner: '#2e2e36', patches: '#2e2e36', x: 50, y: 56, r: 30 }), { cls: 'bust' }),
    '🐸': () => svg(
      E(34, 34, 12, 12, '#6cc24a') + E(66, 34, 12, 12, '#6cc24a') + E(50, 60, 36, 28, '#6cc24a') + E(50, 70, 22, 14, '=#c9f0a0', { w: 0 }) +
      eye(34, 33, 8, { lx: 0, ly: 0.5, r2: 0.6 }) + eye(66, 33, 8, { lx: 0, ly: 0.5, r2: 0.6 }) + ln('M34 62 Q50 74 66 62', 2.6) + blush(28, 58, 4) + blush(72, 58, 4) + hl(36, 46, 8, 3, -20, 0.4), { cls: 'bust' }),
    '🐙': () => svg(
      tube('M30 70 Q22 86 30 94', 6, '#ff7a9c') + tube('M42 74 Q38 90 44 96', 6, '#ff7a9c') + tube('M58 74 Q62 90 56 96', 6, '#ff7a9c') + tube('M70 70 Q78 86 70 94', 6, '#ff7a9c') +
      P('M22 60 Q20 18 50 16 Q80 18 78 60 Q72 76 50 76 Q28 76 22 60 Z', '#ff7a9c') + hl(36, 28, 9, 4, -30, 0.5) +
      eye(40, 50, 6, { lx: 0.5, ly: 0.5 }) + eye(60, 50, 6, { lx: 0.5, ly: 0.5 }) + smile(50, 62, 5) + blush(32, 60, 3.5) + blush(68, 60, 3.5), { cls: 'bust' }),
    '🦖': () => svg(
      P('M18 100 Q22 70 40 66 L64 66 Q80 72 82 100 Z', '#5cc46a') +
      P('M26 58 Q22 26 50 22 Q84 20 86 50 Q86 66 66 68 L38 70 Q28 68 26 58 Z', '#5cc46a') + E(60, 62, 22, 6, '=#c9f0a0', { w: 0 }) +
      P('M30 30 L34 16 L40 26 L46 12 L52 24 Z', '=#ffb347', { w: 1.6 }) + hl(40, 30, 8, 3, -20, 0.45) +
      eye(48, 40, 6, { lx: 1, ly: 0.5 }) + eye(66, 38, 5, { lx: 1, ly: 0.5 }) + ln('M50 56 Q66 62 80 54', 2.4) + C(80, 46, 1.4, '=' + OL, { w: 0 }) + blush(44, 52, 3.5), { cls: 'bust' }),
    '🐧': () => svg(
      P('M20 100 Q16 30 50 18 Q84 30 80 100 Z', '#2e3550') + P('M30 100 Q28 52 50 42 Q72 52 70 100 Z', '=#ffffff', { w: 0 }) +
      E(38, 44, 9, 10, '=#ffffff', { w: 0 }) + E(62, 44, 9, 10, '=#ffffff', { w: 0 }) +
      eye(40, 44, 5, { lx: 0.4, ly: 0.4, white: false }) + eye(60, 44, 5, { lx: 0.4, ly: 0.4, white: false }) +
      P('M42 54 Q50 50 58 54 Q50 62 42 54 Z', '=#ffa53a', { w: 1.8 }) + blush(32, 56, 3.5) + blush(68, 56, 3.5) + hl(36, 28, 8, 3, -25, 0.4), { cls: 'bust' }),
    '🌟': () => svg(C(50, 52, 44, GL('#ffe066'), { w: 0 }) + star(50, 54, 40, '#ffd23f', { w: 3 }, 5, 0.5) + hl(38, 36, 8, 4, -30, 0.6) +
      eye(42, 52, 5, { lx: 0, ly: 0.5 }) + eye(58, 52, 5, { lx: 0, ly: 0.5 }) + smile(50, 62, 5) + blush(36, 62, 3) + blush(64, 62, 3), { cls: 'bust' }),
    '🚀': () => svg(
      P('M36 70 Q50 100 64 70 Z', GL('#ffb347'), { w: 0 }) + P('M40 72 Q50 92 60 72 Z', '=#ffd84a', { w: 1.6 }) +
      P('M34 62 L22 78 L36 74 Z', '#e8463c') + P('M66 62 L78 78 L64 74 Z', '#e8463c') +
      P('M34 72 Q30 26 50 6 Q70 26 66 72 Z', '#f2f2f2') + P('M40 20 Q50 4 60 20 Q50 16 40 20 Z', '=#e8463c', { w: 1.6 }) +
      C(50, 40, 9, '#5ab8ff', { w: 3 }) + hl(47, 37, 3, 1.6, -30, 0.8) + hl(40, 40, 3, 12, 0, 0.5), { cls: 'bust' }),
  };

  /* =====================================================================
     ICONS (UI symbols) – 32-unit box
     ===================================================================== */
  const icon = (inner) => `<svg class="ic" viewBox="0 0 32 32" aria-hidden="true">${inner}</svg>`;
  const o2 = { w: 1.8 };
  const ICONS = {
    coin: () => icon(C(16, 16, 13, M('#ffcf33'), o2) + C(16, 16, 9, 'none', { w: 1.4, s: '#c78a00' }) + P('M13.5 10.5 L18 10.5 L18 21.5', 'none', { w: 2.6, s: '#c78a00' }) + hl(11, 9, 3.4, 1.6, -35, 0.8)),
    heart: () => icon(P('M16 28 Q3 19 3 11 Q3 4 9.5 4 Q14 4 16 9 Q18 4 22.5 4 Q29 4 29 11 Q29 19 16 28 Z', '#ff4d5e', o2) + hl(9, 9, 3, 1.8, -35, 0.8)),
    sword: () => icon(P('M23 3 L29 3 L29 9 L14 24 L8 18 Z', M('#e5ebf2'), o2) + P('M5 15 L17 27 L14.5 29.5 L2.5 17.5 Z', M('#f4b934'), o2) + P('M5.5 24 L8 26.5 L4 30.5 L1.5 28 Z', '#8a5a2b', o2)),
    shield: () => icon(P('M16 2 L28 6 Q29 21 16 30 Q3 21 4 6 Z', M('#5b8fe0'), o2) + P('M16 6 L24 8.6 Q24.5 19 16 25 Z', '=#ffffff', { w: 0, x: 'opacity=".35"' })),
    speed: () => icon(P('M4 9 L14 9 M2 16 L12 16 M5 23 L13 23', 'none', { w: 2.4, s: '#7fd8ff' }) + P('M12 6 L30 16 L12 26 L17 16 Z', '#5ec6ff', o2)),
    power: () => icon(P('M9 30 L9 18 Q4 16 5 10 Q7 6 11 8 L11 4 Q15 1 17 4 Q21 2 23 6 Q27 6 27 11 L27 19 Q27 26 21 30 Z', '#ffb36b', o2) + ln('M11 8 L11 14 M17 4 L17 13 M23 6 L23 13', 1.6)),
    star: () => icon(star(16, 17, 14, '#ffd23f', o2, 5, 0.48) + hl(12, 11, 3, 1.6, -30, 0.7)),
    starEmpty: () => icon(star(16, 17, 14, '=#5a4a3a', { w: 1.8, x: 'opacity=".55"' }, 5, 0.48)),
    lock: () => icon(P('M10 14 L10 10 Q10 4 16 4 Q22 4 22 10 L22 14', 'none', { w: 5, s: OL }) + P('M10 14 L10 10 Q10 4 16 4 Q22 4 22 10 L22 14', 'none', { w: 2.4, s: '#c9d3de' }) + Rc(6, 13, 20, 16, 4, M('#f4b934'), o2) + C(16, 20, 2.4, '=' + OL, { w: 0 }) + Rc(15, 21, 2, 5, 1, '=' + OL, { w: 0 })),
    check: () => icon(C(16, 16, 13, '#38c060', o2) + ln('M9 16.5 L14 21.5 L23 11', 3.6, '#ffffff')),
    scroll: () => icon(Rc(6, 5, 20, 22, 2, '#f6e2b0', o2) + E(6, 7, 3, 3.4, '#e5c88a', { w: 1.6 }) + E(26, 25, 3, 3.4, '#e5c88a', { w: 1.6 }) + ln('M11 11 L21 11 M11 15.5 L21 15.5 M11 20 L18 20', 1.8, '#9a6a3f')),
    map: () => icon(P('M3 7 L11 4 L21 7 L29 4 L29 25 L21 28 L11 25 L3 28 Z', '#f6e2b0', o2) + P('M11 4 L11 25 M21 7 L21 28', 'none', { w: 1.4 }) + P('M7 20 Q12 14 16 17 Q20 20 24 12', 'none', { w: 1.8, s: '#e8463c', x: 'stroke-dasharray="2.5 2"' }) + ln('M22 9.5 L26 13.5 M26 9.5 L22 13.5', 2, '#e8463c')),
    shop: () => icon(P('M5 11 L27 11 L25 29 L7 29 Z', '#ffb347', o2) + P('M11 11 Q11 3 16 3 Q21 3 21 11', 'none', { w: 2.4 }) + C(16, 19, 4, M('#ffcf33'), { w: 1.4 }) + hl(10, 15, 2, 4, 0, 0.5)),
    helmet: () => icon(P('M5 23 Q4 6 16 5 Q28 6 27 23 L22 23 L22 15 L10 15 L10 23 Z', M('#c9d3de'), o2) + Rc(14.5, 4.5, 3, 12, 1.5, '=#f4b934', { w: 1.4 }) + P('M16 5 Q8 -1 2 4 Q9 4 13 9 Z', '#e8463c', { w: 1.4 })),
    trophy: () => icon(P('M8 4 L24 4 L23 14 Q22 20 16 21 Q10 20 9 14 Z', M('#ffcf33'), o2) + P('M8 7 Q2 7 3 11 Q4 15 9 15 M24 7 Q30 7 29 11 Q28 15 23 15', 'none', { w: 2 }) + Rc(13.5, 20, 5, 4, 1, '#d9a10a', { w: 1.4 }) + Rc(9, 24, 14, 5, 2, '#8a5a2b', o2) + hl(12, 8, 1.6, 3.6, 0, 0.7)),
    cog: () => icon(P('M13.5 2 L18.5 2 L19.3 6 L22.6 7.4 L26 5 L29.5 8.6 L27 12 L28.4 15.2 L32 16 L32 16 L28.4 16.8 L27 20 L29.5 23.4 L26 27 L22.6 24.6 L19.3 26 L18.5 30 L13.5 30 L12.7 26 L9.4 24.6 L6 27 L2.5 23.4 L5 20 L3.6 16.8 L0 16 L3.6 15.2 L5 12 L2.5 8.6 L6 5 L9.4 7.4 L12.7 6 Z', M('#b8c2d0'), { w: 1.6, x: 'transform="translate(1.2 1.2) scale(.925)"' }) + C(16, 16, 4.5, '=#5d6a7a', o2)),
    help: () => icon(C(16, 16, 13, '#5ab8ff', o2) + P('M11.5 12 Q11.5 7 16 7 Q21 7 21 11.5 Q21 14.5 17.5 15.8 L17.3 19', 'none', { w: 3.2, s: '#ffffff' }) + C(17.2, 23.6, 2, '=#ffffff', { w: 0 })),
    fire: () => icon(P('M16 30 Q5 29 6 19 Q7 12 12 8 Q12 14 15 15 Q14 7 20 2 Q20 10 25 14 Q29 19 26 25 Q23 30 16 30 Z', '#ff7a1a', o2) + P('M16 28 Q11 27 11.5 22 Q12 18 15 16 Q15 20 18 21 Q21 23 20 26 Q19 28 16 28 Z', '=#ffd84a', { w: 0 })),
    bulb: () => icon(P('M16 3 Q26 3 26 12 Q26 17 21 21 L21 24 L11 24 L11 21 Q6 17 6 12 Q6 3 16 3 Z', '#ffe066', o2) + Rc(11, 24, 10, 5, 2, '#b8c2d0', { w: 1.6 }) + hl(12, 9, 2, 3.6, 20, 0.8)),
    xp: () => icon(star(16, 16, 14, '#b58cff', o2, 4, 0.4) + hl(13, 11, 2, 1.2, -30, 0.8)),
    flag: () => icon(ln('M7 3 L7 30', 3.4, '#8a5a2b') + P('M8 4 Q16 1 20 5 Q24 9 29 6 L29 18 Q24 21 20 17 Q16 13 8 16 Z', '#f6f1ee', o2)),
    sword2: () => icon(P('M3 3 L9 3 L23 17 L17 23 L3 9 Z', M('#e5ebf2'), o2) + P('M29 3 L23 3 L9 17 L15 23 L29 9 Z', M('#e5ebf2'), o2) + P('M20 20 L27 27 M12 20 L5 27', 'none', { w: 3.4, s: '#8a5a2b' })),
    crown: () => icon(P('M4 25 L3 9 L10 15 L16 5 L22 15 L29 9 L28 25 Z', M('#ffcf33'), o2) + C(16, 18, 2.4, '=#e8463c', { w: 1.2 }) + C(9, 20, 1.6, '=#4ccaff', { w: 1 }) + C(23, 20, 1.6, '=#4ccaff', { w: 1 })),
    paw: () => icon(E(16, 21, 7.5, 6.5, '#e0a96d', o2) + C(7, 13, 3.4, '#e0a96d', o2) + C(12.5, 7, 3.4, '#e0a96d', o2) + C(19.5, 7, 3.4, '#e0a96d', o2) + C(25, 13, 3.4, '#e0a96d', o2)),
    book: () => icon(P('M3 6 Q9 3 16 7 Q23 3 29 6 L29 27 Q23 24 16 28 Q9 24 3 27 Z', '#8a4fd1', o2) + P('M16 7 L16 28', 'none', { w: 1.6 }) + ln('M6 10 Q10 9 13 11 M19 11 Q22 9 26 10', 1.4, '#ffffff')),
    team: () => icon(C(10, 12, 5, '#ffcfa0', o2) + C(22, 12, 5, '#ffcfa0', o2) + P('M2 28 Q3 18 10 18 Q17 18 18 28 Z', '#3b6fd6', o2) + P('M14 28 Q15 18 22 18 Q29 18 30 28 Z', '#3aa152', o2)),
    sound: () => icon(P('M4 12 L10 12 L17 5 L17 27 L10 20 L4 20 Z', '#f6f1ee', o2) + ln('M21 11 Q24 16 21 21 M24.5 8 Q30 16 24.5 24', 2.2, '#f6f1ee')),
    brain: () => icon(P('M16 6 Q12 2 8 5 Q3 6 4 12 Q1 16 4 20 Q4 26 10 26 Q13 30 16 27 Q19 30 22 26 Q28 26 28 20 Q31 16 28 12 Q29 6 24 5 Q20 2 16 6 Z', '#ff9ccf', o2) + ln('M16 6 L16 27 M9 12 Q12 13 12 16 M23 12 Q20 13 20 16 M9 20 Q12 19 13 22 M23 20 Q20 19 19 22', 1.4)),
    gem: () => icon(P('M8 4 L24 4 L30 12 L16 29 L2 12 Z', '#4ccaff', o2) + P('M2 12 L30 12 M8 4 L12 12 L16 29 L20 12 L24 4', 'none', { w: 1.2 }) + hl(11, 8, 2, 1.2, -20, 0.8)),
    potion: () => icon(Rc(12, 3, 8, 6, 2, '#b8875a', { w: 1.6 }) + P('M13 9 L19 9 L19 13 Q27 16 27 23 Q27 30 16 30 Q5 30 5 23 Q5 16 13 13 Z', '#e8f6ff', o2) + P('M7 21 Q16 18 25 21 Q26 28 16 28.5 Q6 28 7 21 Z', '=#ff5fa2', { w: 0 }) + hl(10, 18, 1.6, 3, 20, 0.8)),
    hourglass: () => icon(P('M7 3 L25 3 M7 29 L25 29', 'none', { w: 3 }) + P('M9 4 L23 4 Q23 12 16 16 Q23 20 23 28 L9 28 Q9 20 16 16 Q9 12 9 4 Z', '#e8f6ff', o2) + P('M11 27 Q16 21 21 27 Z M13 9 L19 9 Q18 12 16 13 Q14 12 13 9 Z', '=#f4b934', { w: 0 })),
    bolt: () => icon(P('M18 2 L6 18 L14 18 L11 30 L26 12 L18 12 L21 2 Z', '#ffd84a', o2)),
    play: () => icon(P('M8 4 L27 16 L8 28 Z', '#ffffff', o2)),
    pause: () => icon(Rc(7, 5, 6, 22, 2, '=#ffffff', o2) + Rc(19, 5, 6, 22, 2, '=#ffffff', o2)),
    close: () => icon(ln('M8 8 L24 24 M24 8 L8 24', 4.5, '#ffffff')),
    plus: () => icon(ln('M16 6 L16 26 M6 16 L26 16', 5, '#ffffff')),
    back: () => icon(P('M20 5 L8 16 L20 27', 'none', { w: 4.5, s: '#ffffff' })),
    users: () => icon(C(16, 11, 6, '#ffcfa0', o2) + P('M5 29 Q6 18 16 18 Q26 18 27 29 Z', '#5ab8ff', o2)),
    trash: () => icon(Rc(7, 9, 18, 20, 3, '#ff6b6b', o2) + Rc(4, 5, 24, 5, 2, '#ff6b6b', o2) + Rc(12, 2, 8, 4, 1.5, '#ff6b6b', { w: 1.6 }) + ln('M12 14 L12 24 M16 14 L16 24 M20 14 L20 24', 1.6)),
    chest: () => icon(P('M3 14 Q3 5 16 5 Q29 5 29 14 Z', '#b8763a', o2) + Rc(3, 14, 26, 14, 2, '#9a6232', o2) + Rc(13, 11, 6, 8, 1.5, M('#ffcf33'), { w: 1.4 }) + ln('M3 14 L29 14', 1.8)),
    tower: () => icon(Rc(9, 9, 14, 21, 1, '#9aa3b5', o2) + P('M7 4 L11 4 L11 7 L14 7 L14 4 L18 4 L18 7 L21 7 L21 4 L25 4 L25 10 L7 10 Z', '#b8c2d0', o2) + P('M13 30 L13 23 Q16 19 19 23 L19 30 Z', '=#3a2a2a', { w: 1.4 }) + Rc(14, 13, 4, 5, 1.5, '=#ffd84a', { w: 1.2 })),
  };

  /* =====================================================================
     GEAR ITEMS (tier colour tints the metal/gem parts)
     ===================================================================== */
  function itemIcon(heroId, slot, tierColor) {
    const t = tierColor || '#a0703c';
    const metal = M(t);
    let s = '';
    if (slot === 'armor') {
      s = P('M14 12 L24 8 Q32 14 40 8 L50 12 L54 26 L46 30 L46 54 Q32 60 18 54 L18 30 L10 26 Z', metal, { w: 2.2 }) +
        P('M24 8 Q32 18 40 8 L38 7 Q32 13 26 7 Z', '=' + dk(t, 0.35), { w: 1.4 }) +
        ln('M32 20 L32 52', 1.8, dk(t, 0.35)) + C(32, 36, 5, '#ffd84a', { w: 1.6 }) + hl(22, 22, 3, 7, 10, 0.5);
    } else if (slot === 'charm') {
      s = ln('M18 6 Q32 26 46 6', 2.4, '#c9a26b') + C(32, 38, 17, M('#ffcf33'), { w: 2.2 }) + C(32, 38, 11, R(t), { w: 1.8 }) +
        hl(28, 33, 4, 2.4, -35, 0.8) + star(32, 38, 5, '=#ffffff', { w: 0, x: 'opacity=".55"' });
    } else {
      const W = {
        knight: () => P('M44 6 L54 6 L54 16 L26 44 L18 36 Z', metal, { w: 2.2 }) + ln('M50 10 L24 37', 1.2, '#fff', { x: 'opacity=".7"' }) + P('M12 32 L30 50 L26 54 L8 36 Z', M('#f4b934'), { w: 2 }) + P('M14 46 L18 50 L10 58 L6 54 Z', '#7a4a22', { w: 2 }) + C(7, 57, 3, M('#f4b934'), { w: 1.6 }),
        archer: () => tube('M18 6 Q52 30 18 58', 4.5, t) + ln('M18 6 L18 58', 1.2, '#f3ead2') + tube('M10 32 L50 32', 2, '#9a6232') + P('M50 32 L42 27 L44 32 L42 37 Z', M('#c9d3de'), { w: 1.6 }) + P('M10 32 L4 27 L8 32 L4 37 Z', '=#e8463c', { w: 1.2 }),
        mage: () => tube('M18 58 L42 18', 4, '#8a5a2b') + C(45, 14, 14, GL(t), { w: 0 }) + C(45, 14, 8, R(t), { w: 2 }) + hl(42, 11, 2.4, 1.5, -30, 0.8),
        healer: () => tube('M16 58 L38 24', 3, '#f6e7ff') + C(42, 18, 15, GL(t), { w: 0 }) + star(42, 18, 11, R(t), { w: 2 }) + hl(39, 14, 2, 1.2, -30, 0.8),
        ninja: () => P('M32 4 L37 24 L58 30 L37 36 L32 58 L27 36 L6 30 L27 24 Z', metal, { w: 2.2 }) + C(32, 30, 4, '=' + OL, { w: 0 }),
        dragon: () => P('M14 50 Q16 24 30 8 Q28 28 22 50 Z M26 52 Q30 26 44 12 Q42 32 34 52 Z M38 54 Q44 32 56 20 Q54 38 46 54 Z', metal, { w: 2 }),
      };
      s = (W[heroId] || W.knight)();
    }
    return `<svg class="ic item-ic" viewBox="0 0 64 64" aria-hidden="true">${s}</svg>`;
  }

  /* ---------- public API ---------- */
  const unknown = () => fig(22, P('M30 70 Q28 30 50 26 Q72 30 70 70 Q68 90 50 90 Q32 90 30 70 Z', '=#3d3557') + `<text x="50" y="70" text-anchor="middle" font-size="34" font-family="Lilita One, sans-serif" fill="#a49cc7">?</text>`);
  const Art = {
    OL, lt, dk, mix, R, V, M, GL, P, C, E, Rc, ln, tube, hl, g, op, star, eye, glowEye, brow, angry, smile, frown, grin, fang, blush, svg, fig, shadow, critter, critterHead, flush,
    hero: (id) => (HERO_ART[id] || unknown)(),
    pet: (id) => (PET_ART[id] || unknown)(),
    npc: (name) => (NPC_ART[name] || NPC_ART['Baker Bo'])(),
    avatar: (emoji) => (AVATAR_ART[emoji] || AVATAR_ART['🦸'])(),
    avatarIds: Object.keys(AVATAR_ART),
    icon: (n) => (ICONS[n] || ICONS.star)(),
    item: itemIcon,
    unknown,
    monster: (name) => ((Art.MONSTERS && Art.MONSTERS[name]) || unknown)(),
    monsterInfo: (name) => (Art.MONSTER_INFO && Art.MONSTER_INFO[name]) || {},
  };
  root.Art = Art;
})();
