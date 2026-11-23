/* Number Knights – illustrated backgrounds for each land (used for battles and the adventure map). */
(function () {
  'use strict';
  const A = window.Art;
  const { lt, dk, V, GL, P, C, E, Rc, ln, star } = A;
  const W = 400; // scenes are drawn in a 400 x 225 box, ground from y ~ 130
  const thin = (c) => ({ w: 1.6, s: c || 'rgba(40,25,20,.55)' });
  const none = { w: 0 };

  function sky(id, top, bottom) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;
  }
  function scene(id, defs, inner) {
    return `<svg class="scene" viewBox="0 0 ${W} 225" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs>${defs}</defs>${inner}</svg>`;
  }
  const cloud = (x, y, s, c) => P(`M${x} ${y} q${-4 * s} ${-12 * s} ${8 * s} ${-12 * s} q${4 * s} ${-12 * s} ${18 * s} ${-6 * s} q${12 * s} ${-6 * s} ${18 * s} ${6 * s} q${12 * s} ${0} ${10 * s} ${12 * s} Z`, '=' + (c || '#ffffff'), thin('rgba(90,120,160,.35)'));
  const tree = (x, y, s, c) => Rc(x - 2.5 * s, y - 14 * s, 5 * s, 15 * s, 2 * s, '=#8a5a2b', thin()) + C(x, y - 22 * s, 13 * s, V(c), thin()) + C(x - 8 * s, y - 16 * s, 8 * s, V(c), thin()) + C(x + 9 * s, y - 15 * s, 8 * s, V(c), thin()) + E(x - 4 * s, y - 28 * s, 5 * s, 2.5 * s, '=#ffffff', { w: 0, x: 'opacity=".25"' });
  const pine = (x, y, s, c, snow) => Rc(x - 2 * s, y - 8 * s, 4 * s, 9 * s, 1, '=#6b4228', thin()) +
    P(`M${x} ${y - 46 * s} L${x + 13 * s} ${y - 22 * s} L${x + 7 * s} ${y - 22 * s} L${x + 17 * s} ${y - 6 * s} L${x - 17 * s} ${y - 6 * s} L${x - 7 * s} ${y - 22 * s} L${x - 13 * s} ${y - 22 * s} Z`, V(c), thin()) +
    (snow ? P(`M${x} ${y - 46 * s} L${x + 7 * s} ${y - 33 * s} Q${x} ${y - 30 * s} ${x - 7 * s} ${y - 33 * s} Z`, '=#ffffff', { w: 0 }) : '');
  const rock = (x, y, s, c) => P(`M${x - 14 * s} ${y} Q${x - 14 * s} ${y - 10 * s} ${x - 4 * s} ${y - 13 * s} Q${x + 8 * s} ${y - 15 * s} ${x + 13 * s} ${y - 4 * s} L${x + 14 * s} ${y} Z`, V(c || '#9aa3b5'), thin());
  const flower = (x, y, c) => C(x - 2.4, y, 2.2, '=' + c, none) + C(x + 2.4, y, 2.2, '=' + c, none) + C(x, y - 2.4, 2.2, '=' + c, none) + C(x, y + 2.4, 2.2, '=' + c, none) + C(x, y, 1.6, '=#ffe066', none);
  const tuft = (x, y, c) => P(`M${x - 6} ${y} Q${x - 5} ${y - 7} ${x - 2} ${y - 9} Q${x - 2} ${y - 4} ${x} ${y - 2} Q${x + 1} ${y - 9} ${x + 5} ${y - 11} Q${x + 3} ${y - 4} ${x + 6} ${y} Z`, '=' + c, none);
  const crystal = (x, y, s, c) => C(x, y - 12 * s, 16 * s, GL(c), none) + P(`M${x - 6 * s} ${y} L${x - 8 * s} ${y - 16 * s} L${x - 2 * s} ${y - 26 * s} L${x + 3 * s} ${y - 15 * s} L${x + 2 * s} ${y} Z M${x + 1 * s} ${y} L${x + 5 * s} ${y - 14 * s} L${x + 10 * s} ${y - 20 * s} L${x + 12 * s} ${y - 8 * s} L${x + 9 * s} ${y} Z`, V(c), thin('rgba(20,10,40,.6)')) + P(`M${x - 6 * s} ${y - 15 * s} L${x - 2 * s} ${y - 24 * s} L${x} ${y - 15 * s} Z`, '=#ffffff', { w: 0, x: 'opacity=".45"' });
  const cactus = (x, y, s) => P(`M${x - 4 * s} ${y} L${x - 4 * s} ${y - 30 * s} Q${x} ${y - 36 * s} ${x + 4 * s} ${y - 30 * s} L${x + 4 * s} ${y} Z M${x - 4 * s} ${y - 14 * s} L${x - 11 * s} ${y - 14 * s} Q${x - 14 * s} ${y - 14 * s} ${x - 14 * s} ${y - 18 * s} L${x - 14 * s} ${y - 24 * s} Q${x - 11 * s} ${y - 27 * s} ${x - 9 * s} ${y - 24 * s} L${x - 9 * s} ${y - 19 * s} L${x - 4 * s} ${y - 19 * s} Z M${x + 4 * s} ${y - 18 * s} L${x + 10 * s} ${y - 18 * s} L${x + 10 * s} ${y - 26 * s} Q${x + 12 * s} ${y - 30 * s} ${x + 15 * s} ${y - 26 * s} L${x + 15 * s} ${y - 17 * s} Q${x + 15 * s} ${y - 13 * s} ${x + 11 * s} ${y - 13 * s} L${x + 4 * s} ${y - 13 * s} Z`, V('#5cb04a'), thin());
  const mushroom = (x, y, s, c) => Rc(x - 3 * s, y - 9 * s, 6 * s, 9 * s, 2 * s, '=#f6ecd0', thin()) + P(`M${x - 11 * s} ${y - 8 * s} Q${x} ${y - 24 * s} ${x + 11 * s} ${y - 8 * s} Z`, V(c), thin()) + C(x - 4 * s, y - 13 * s, 1.8 * s, '=#ffffff', none) + C(x + 4 * s, y - 15 * s, 1.4 * s, '=#ffffff', none);
  const sparkles = (pts, c, r) => pts.map(([x, y]) => C(x, y, (r || 1.6) * 3, GL(c), none) + C(x, y, r || 1.6, '=#ffffff', none)).join('');

  const SCENES = {
    meadow: () => scene('meadow', sky('skM', '#5fb8ff', '#d4f1ff'),
      `<rect width="400" height="225" fill="url(#skM)"/>` +
      C(330, 40, 34, GL('#fff6b0'), none) + C(330, 40, 16, '=#fff2a0', none) +
      cloud(40, 50, 1.6) + cloud(200, 34, 1.2) + cloud(270, 70, 1) +
      P('M0 120 Q60 84 130 108 Q200 80 270 104 Q340 82 400 100 L400 160 L0 160 Z', '=#a6dc84', none) +
      P('M0 138 Q80 108 160 130 Q240 106 320 128 Q370 116 400 124 L400 170 L0 170 Z', '=#86c862', none) +
      tree(36, 136, 1.1, '#4fae3e') + tree(92, 132, 0.8, '#5cbc4a') + tree(352, 132, 1.2, '#4fae3e') + tree(304, 134, 0.75, '#5cbc4a') +
      `<rect y="140" width="400" height="85" fill="${V('#6cc04a')}"/>` +
      P('M150 225 Q180 180 200 140 L214 140 Q214 180 260 225 Z', '=#e7cf8e', none) +
      tuft(30, 176, '#4f9e32') + tuft(120, 200, '#4f9e32') + tuft(300, 186, '#4f9e32') + tuft(370, 210, '#4f9e32') + tuft(70, 214, '#4f9e32') +
      flower(20, 196, '#ff6b8a') + flower(110, 170, '#ffffff') + flower(330, 168, '#ffd23f') + flower(380, 190, '#ff6b8a') + flower(60, 160, '#b58cff') + flower(276, 206, '#ffffff') +
      rock(250, 152, 0.7) + rock(16, 152, 0.6)
    ),
    forest: () => scene('forest', sky('skF', '#1f4a45', '#7fb59a'),
      `<rect width="400" height="225" fill="url(#skF)"/>` +
      C(70, 46, 22, GL('#e8ffd8'), none) + C(70, 46, 10, '=#f2ffe6', none) +
      [20, 60, 100, 150, 190, 240, 280, 330, 370].map((x, i) => pine(x, 130, 1.1 + (i % 3) * 0.2, '#2c5e4a')).join('') +
      P('M0 128 L400 128 L400 150 L0 150 Z', '=#3f7a52', none) +
      [0, 45, 130, 210, 300, 355, 395].map((x, i) => pine(x, 150, 1.4 + (i % 2) * 0.3, '#3f8a50')).join('') +
      `<rect y="146" width="400" height="80" fill="${V('#3d7a3a')}"/>` +
      P('M0 146 Q100 154 200 146 Q300 138 400 148 L400 160 Q300 152 200 158 Q100 164 0 156 Z', '=#ffffff', { w: 0, x: 'opacity=".12"' }) +
      mushroom(40, 196, 1.2, '#e8463c') + mushroom(54, 200, 0.8, '#e8463c') + mushroom(352, 186, 1, '#ff9a3a') + mushroom(300, 214, 0.8, '#e8463c') +
      tuft(120, 190, '#2f6a2c') + tuft(240, 210, '#2f6a2c') + tuft(390, 204, '#2f6a2c') +
      sparkles([[90, 120], [150, 100], [260, 110], [320, 90], [200, 160], [380, 140]], '#d8ff6a', 1.4)
    ),
    caves: () => scene('caves', sky('skC', '#120f28', '#3a2f6c'),
      `<rect width="400" height="225" fill="url(#skC)"/>` +
      P('M0 0 L400 0 L400 26 L384 50 L372 22 L350 40 L334 16 L310 46 L296 18 L270 34 L250 14 L228 44 L210 20 L186 36 L170 12 L150 40 L128 18 L110 46 L90 20 L70 38 L52 14 L32 42 L16 18 L0 34 Z', V('#2a2350'), thin('rgba(0,0,0,.5)')) +
      P('M0 140 Q30 96 60 110 Q90 70 130 104 L140 140 Z M260 140 Q290 90 330 100 Q370 80 400 110 L400 140 Z', '=#2a2350', none) +
      crystal(60, 140, 1.4, '#4ccaff') + crystal(340, 140, 1.6, '#ff6ad5') + crystal(200, 134, 0.8, '#8a7aff') +
      `<rect y="138" width="400" height="87" fill="${V('#4a3f7a')}"/>` +
      P('M0 138 L400 138 L400 146 L0 146 Z', '=#000', { w: 0, x: 'opacity=".2"' }) +
      rock(30, 200, 1.1, '#6a5f9a') + rock(370, 190, 1.3, '#6a5f9a') + rock(250, 220, 0.9, '#6a5f9a') +
      crystal(110, 214, 0.9, '#4ccaff') + crystal(300, 180, 0.7, '#ff6ad5') + crystal(380, 222, 0.8, '#7af6ff') +
      sparkles([[80, 70], [180, 90], [300, 60], [240, 110], [130, 160], [340, 200]], '#a8f0ff', 1.2)
    ),
    desert: () => scene('desert', sky('skD', '#ff9b4a', '#ffe7a8'),
      `<rect width="400" height="225" fill="url(#skD)"/>` +
      C(300, 70, 50, GL('#fff2b0'), none) + C(300, 70, 26, '=#fff0a8', none) +
      P('M180 130 L222 70 L264 130 Z', '=#e8a85a', thin('rgba(120,60,20,.4)')) + P('M222 70 L264 130 L238 130 Z', '=#c98a44', none) +
      P('M250 130 L278 92 L306 130 Z', '=#e8a85a', thin('rgba(120,60,20,.4)')) + P('M278 92 L306 130 L290 130 Z', '=#c98a44', none) +
      P('M0 128 Q60 102 130 122 Q210 98 280 124 Q340 106 400 118 L400 150 L0 150 Z', '=#f2c46d', none) +
      `<rect y="140" width="400" height="85" fill="${V('#f0be62')}"/>` +
      P('M0 160 Q100 150 200 164 Q300 176 400 160', 'none', { w: 2, s: 'rgba(160,100,30,.3)' }) + P('M0 196 Q120 184 240 200 Q320 210 400 196', 'none', { w: 2, s: 'rgba(160,100,30,.3)' }) +
      cactus(40, 160, 1.4) + cactus(360, 154, 1.1) + cactus(120, 140, 0.7) +
      rock(250, 210, 0.9, '#c98a54') + rock(80, 214, 0.6, '#c98a54') +
      P('M326 206 q6 -6 12 0 q6 -6 12 0', 'none', { w: 2, s: '#a8742a' })
    ),
    peaks: () => scene('peaks', sky('skP', '#7ab8f0', '#eaf6ff'),
      `<rect width="400" height="225" fill="url(#skP)"/>` +
      P('M-10 136 L60 46 L110 100 L170 30 L240 110 L300 56 L410 136 Z', V('#9ab4d4'), thin('rgba(40,60,100,.4)')) +
      P('M60 46 L80 72 L68 70 L58 80 L46 64 Z M170 30 L194 62 L180 58 L168 70 L154 52 Z M300 56 L324 84 L310 80 L298 90 L284 74 Z', '=#ffffff', { w: 0 }) +
      cloud(30, 70, 0.9) + cloud(320, 40, 1.1) +
      [30, 80, 330, 380].map((x, i) => pine(x, 146, 1.1 + (i % 2) * 0.3, '#3f7f6a', true)).join('') +
      `<rect y="140" width="400" height="85" fill="${V('#e8f4ff')}"/>` +
      P('M0 140 Q100 132 200 142 Q300 150 400 138 L400 150 Q300 158 200 150 Q100 142 0 150 Z', '=#c8def5', none) +
      rock(250, 200, 1, '#a8b8cc') + P('M236 190 Q250 182 262 190 Z', '=#ffffff', none) + rock(60, 214, 0.8, '#a8b8cc') +
      sparkles([[50, 30], [140, 20], [220, 70], [260, 30], [370, 90], [110, 160], [300, 190]], '#ffffff', 1.4)
    ),
    volcano: () => scene('volcano', sky('skV', '#2a0808', '#a8301a'),
      `<rect width="400" height="225" fill="url(#skV)"/>` +
      C(250, 40, 60, GL('#ff8a3a'), none) +
      P('M150 140 L222 46 L246 46 L330 140 Z', V('#4a1a14'), thin('rgba(0,0,0,.5)')) + P('M222 46 Q234 38 246 46 L240 54 Q234 50 228 54 Z', '=#ffb347', none) +
      P('M232 50 Q226 80 238 100 Q232 120 244 140 L252 140 Q240 120 246 100 Q236 80 240 52 Z', '=#ff7a1a', { w: 0 }) +
      C(226, 26, 6, '=#5a2a20', none) + C(244, 16, 8, '=#5a2a20', none) + C(258, 4, 10, '=#5a2a20', none) +
      P('M0 140 L40 104 L80 130 L120 110 L150 140 Z M320 140 L350 112 L380 128 L400 118 L400 140 Z', '=#2e1210', none) +
      `<rect y="138" width="400" height="87" fill="${V('#3a1a14')}"/>` +
      P('M20 225 Q60 190 100 200 Q150 210 180 180 M260 225 Q290 196 330 200 Q370 204 400 180', 'none', { w: 5, s: '#ff7a1a' }) +
      P('M20 225 Q60 190 100 200 Q150 210 180 180 M260 225 Q290 196 330 200 Q370 204 400 180', 'none', { w: 1.6, s: '#ffe07a' }) +
      rock(60, 170, 1.2, '#5a2a20') + rock(340, 160, 1, '#5a2a20') + rock(200, 214, 0.8, '#5a2a20') +
      sparkles([[100, 60], [180, 90], [300, 70], [360, 110], [40, 120], [280, 180], [130, 160]], '#ff9a3a', 1.4)
    ),
    sky: () => scene('sky', sky('skS', '#5a4ac0', '#e0d6ff'),
      `<rect width="400" height="225" fill="url(#skS)"/>` +
      sparkles([[30, 20], [90, 40], [160, 16], [350, 30], [380, 60]], '#ffffff', 1.2) +
      C(80, 50, 18, '=#fff7d0', none) + C(72, 46, 18, '=#5f50c4', none) +
      cloud(220, 132, 2.2, '#f4f0ff') +
      Rc(240, 54, 70, 62, 2, V('#b8b0d8'), thin()) + Rc(228, 40, 22, 76, 2, V('#c8c0e8'), thin()) + Rc(300, 40, 22, 76, 2, V('#c8c0e8'), thin()) +
      P('M224 40 L239 14 L254 40 Z M296 40 L311 14 L326 40 Z', V('#8a5ad6'), thin()) + P('M262 54 L275 30 L288 54 Z', V('#8a5ad6'), thin()) +
      P('M266 116 L266 96 Q275 86 284 96 L284 116 Z', '=#4a3a7a', thin()) + Rc(234, 56, 10, 12, 5, '=#ffe680', thin()) + Rc(306, 56, 10, 12, 5, '=#ffe680', thin()) +
      ln('M311 14 L311 2', 1.6, '#3a2a5a') + P('M311 2 L324 6 L311 10 Z', '=#e8463c', thin()) +
      cloud(10, 120, 1.5, '#f4f0ff') + cloud(330, 128, 1.4, '#f4f0ff') +
      `<rect y="140" width="400" height="85" fill="${V('#f4f0ff')}"/>` +
      P('M0 146 Q20 132 40 144 Q60 130 84 144 Q106 132 128 146 Q150 132 172 144 Q196 132 218 146 Q240 132 262 144 Q284 132 306 146 Q330 132 352 144 Q376 132 400 144 L400 150 L0 150 Z', '=#ffffff', none) +
      P('M0 190 Q50 180 100 190 Q150 200 200 188 Q260 176 320 190 Q360 198 400 186', 'none', { w: 2, s: 'rgba(140,120,200,.3)' })
    ),
    tower: () => scene('tower', sky('skT', '#0b0b2a', '#3d2a7a'),
      `<rect width="400" height="225" fill="url(#skT)"/>` +
      sparkles([[20, 20], [60, 50], [110, 14], [150, 60], [200, 24], [250, 50], [290, 16], [340, 44], [380, 22]], '#ffffff', 1.1) +
      C(200, 60, 28, GL('#d8d0ff'), none) + C(200, 60, 16, '=#efeaff', none) +
      Rc(20, 30, 34, 120, 2, V('#5a4f8a'), thin()) + Rc(346, 30, 34, 120, 2, V('#5a4f8a'), thin()) +
      ln('M20 60 L54 60 M20 90 L54 90 M20 120 L54 120 M346 60 L380 60 M346 90 L380 90 M346 120 L380 120', 1.4, 'rgba(0,0,0,.35)') +
      Rc(14, 22, 46, 10, 2, V('#6a5f9a'), thin()) + Rc(340, 22, 46, 10, 2, V('#6a5f9a'), thin()) +
      C(37, 52, 8, GL('#ffb347'), none) + C(363, 52, 8, GL('#ffb347'), none) +
      `<rect y="140" width="400" height="85" fill="${V('#4a3f7a')}"/>` +
      ln('M0 160 L400 160 M0 186 L400 186 M0 212 L400 212 M60 140 L50 160 M160 140 L156 160 M260 140 L262 160 M360 140 L366 160 M20 160 L10 186 M120 160 L114 186 M220 160 L220 186 M320 160 L326 186', 1.4, 'rgba(0,0,0,.3)')
    ),
  };

  A.scene = (id) => (SCENES[id] || SCENES.meadow)();
})();
