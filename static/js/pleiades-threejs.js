/**
 * Pleiades Three.js Scene
 *
 * Modular single-file structure:
 *   1. CONFIG          — all tuneable parameters
 *   2. STARS_DATA      — constellation positions
 *   3. Textures        — procedural texture generators
 *   4. Layers          — vignette, film grain, background stars
 *   5. Constellation   — main star sprites (halo / core / burst)
 *   6. Animation       — render loop (drift, fade, twinkle)
 *   7. Init            — wiring + responsive resize
 */
(function () {
  'use strict';

  /* =============================================================
     1. CONFIG
     ============================================================= */
  var CONFIG = {
    // Canvas
    size: 600,
    bgColor: 0xf5f5f5,
    borderRadius: '0',

    // Drift animation
    driftDuration: 5000,
    fadeInDuration: 2000,

    // Star rendering multipliers
    haloScale: 4,
    coreScale: 1.4,
    burstScale: 5.5,
    burstRotation: 0.12,

    // Star entry
    entryDistanceMin: 8,
    entryDistanceRange: 4,
    entrySpread: 10,

    // Edge fade (viewport is -5..5)
    edgeFadeInner: 3.5,
    edgeFadeOuter: 5.0,

    // Opacity targets
    haloOpacity: 0.6,
    coreOpacity: 0.85,
    burstOpacity: 0.5,
    burstFadeDelay: 1500,
    burstFadeDuration: 2000,

    // Twinkle
    twinkleStart: 0.7,
    twinkleAmplitude: 0.1,
    burstTwinkleAmplitude: 0.08,
    twinkleSpeedBase: 0.0015,
    twinkleSpeedRange: 0.001,

    // Background stars
    bgStarCount: 300,
    bgSpread: 10,
    bgPointSize: 0.03,
    bgPointColor: 0x444444,
    bgPointOpacity: 0.5,

    // Star label
    labelOffsetX: 35,
    labelOffsetY: -20,
    labelScrambleDuration: 600,
    labelScrambleChars: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    labelScrambleCharsJa: 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン',
    labelHitRadius: 0.6,

    // 3D parallax (drag)
    parallaxScale: 0.12,
    parallaxMedian: 441
  };

  /* =============================================================
     2. STARS_DATA — Pleiades positions from SVG centroids (-4..4)
     ============================================================= */
  var STARS_DATA = [
    { name: 'Atlas',    nameJa: 'アトラス',    tx: -2.82, ty:  2.50, size: 0.40, spikes: true,  dist: 444 },
    { name: 'Pleione',  nameJa: 'プレイオネ',  tx: -2.02, ty:  3.06, size: 0.28, spikes: false, dist: 450 },
    { name: 'Alcyone',  nameJa: 'アルキオネ',  tx: -1.09, ty:  0.52, size: 0.60, spikes: true,  dist: 440 },
    { name: 'Merope',   nameJa: 'メローペ',    tx: -1.10, ty: -1.55, size: 0.40, spikes: true,  dist: 440 },
    { name: 'Electra',  nameJa: 'エレクトラ',  tx:  1.18, ty: -2.83, size: 0.40, spikes: true,  dist: 440 },
    { name: 'Celaeno',  nameJa: 'ケラエノ',    tx:  2.22, ty: -2.19, size: 0.28, spikes: false, dist: 442 },
    { name: 'Maia',     nameJa: 'マイア',      tx:  1.82, ty: -0.54, size: 0.35, spikes: true,  dist: 444 },
    { name: 'Taygeta',  nameJa: 'タイゲタ',    tx:  2.93, ty: -1.03, size: 0.30, spikes: false, dist: 410 },
    { name: 'Asterope', nameJa: 'アステロペ',  tx:  2.55, ty:  0.28, size: 0.18, spikes: false, dist: 431 },
    { name: 'Sterope',  nameJa: 'ステロペ',    tx:  3.07, ty:  0.22, size: 0.22, spikes: false, dist: 444 }
  ];

  /* =============================================================
     3. TEXTURES — procedural canvas texture generators
     ============================================================= */
  var Textures = {
    glow: function (sharpness) {
      var s = sharpness || 0.25;
      var sz = 128, c = document.createElement('canvas');
      c.width = sz; c.height = sz;
      var ctx = c.getContext('2d'), cx = sz / 2;
      var g = ctx.createRadialGradient(cx, cx, 0, cx, cx, cx);
      g.addColorStop(0,       'rgba(0,0,0,1)');
      g.addColorStop(0.04,    'rgba(10,10,15,0.95)');
      g.addColorStop(s * 0.5, 'rgba(55,55,60,0.5)');
      g.addColorStop(s,       'rgba(115,115,120,0.18)');
      g.addColorStop(s * 2,   'rgba(175,175,177,0.04)');
      g.addColorStop(1,       'rgba(245,245,240,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, sz, sz);
      return new THREE.CanvasTexture(c);
    },

    starburst: function () {
      var sz = 256, c = document.createElement('canvas');
      c.width = sz; c.height = sz;
      var ctx = c.getContext('2d'), cx = sz / 2;

      function spike(angle) {
        ctx.save();
        ctx.translate(cx, cx);
        ctx.rotate(angle);
        [1, -1].forEach(function (dir) {
          var g = ctx.createLinearGradient(0, 0, cx * dir, 0);
          g.addColorStop(0,    'rgba(0,0,7,0.7)');
          g.addColorStop(0.15, 'rgba(35,35,40,0.3)');
          g.addColorStop(0.4,  'rgba(95,95,100,0.08)');
          g.addColorStop(1,    'rgba(245,245,240,0)');
          ctx.beginPath();
          ctx.moveTo(0, -1.5);
          ctx.lineTo(cx * dir, -0.3);
          ctx.lineTo(cx * dir, 0.3);
          ctx.lineTo(0, 1.5);
          ctx.closePath();
          ctx.fillStyle = g;
          ctx.fill();
        });
        ctx.restore();
      }

      spike(0);
      spike(Math.PI / 2);
      ctx.globalAlpha = 0.3;
      spike(Math.PI / 4);
      spike(-Math.PI / 4);
      ctx.globalAlpha = 1;
      return new THREE.CanvasTexture(c);
    },

  };

  /* =============================================================
     4. LAYERS — background elements added to the scene
     ============================================================= */
  var Layers = {
    addBackgroundStars: function (scene) {
      var n = CONFIG.bgStarCount;
      var pos = new Float32Array(n * 3);
      var sizes = new Float32Array(n);
      for (var i = 0; i < n; i++) {
        pos[i * 3]     = (Math.random() - 0.5) * CONFIG.bgSpread;
        pos[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.bgSpread;
        pos[i * 3 + 2] = -3;
        sizes[i] = Math.random() * 1.5 + 0.5;
      }
      var geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geom.setAttribute('size', new THREE.BufferAttribute(new Float32Array(sizes), 1));
      var pts = new THREE.Points(geom, new THREE.PointsMaterial({
        size: CONFIG.bgPointSize,
        color: CONFIG.bgPointColor,
        transparent: true,
        opacity: CONFIG.bgPointOpacity,
        sizeAttenuation: true
      }));
      scene.add(pts);
      return { points: pts, baseSizes: sizes };
    }
  };

  /* =============================================================
     5. CONSTELLATION — create star sprites from data
     ============================================================= */
  var glowTex     = Textures.glow(0.25);
  var glowTexCore = Textures.glow(0.15);
  var burstTex    = Textures.starburst();

  function cardinalStart() {
    var dir = Math.floor(Math.random() * 4);
    var d = CONFIG.entryDistanceMin + Math.random() * CONFIG.entryDistanceRange;
    var spread = (Math.random() - 0.5) * CONFIG.entrySpread;
    switch (dir) {
      case 0: return { x: spread, y:  d };
      case 1: return { x:  d, y: spread };
      case 2: return { x: spread, y: -d };
      default: return { x: -d, y: spread };
    }
  }

  function createSprite(tex, color, size, scene) {
    var sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: tex, color: color, transparent: true, depthWrite: false, opacity: 0
    }));
    sprite.scale.set(size, size, 1);
    scene.add(sprite);
    return sprite;
  }

  function buildStarEntry(star, scene) {
    var sizeCorrection = CONFIG.parallaxMedian / star.dist;
    var size = star.size * sizeCorrection;
    var hs = size * CONFIG.haloScale;
    var cs = size * CONFIG.coreScale;
    var bs = star.spikes ? size * CONFIG.burstScale : 0;

    var halo = createSprite(glowTex, 0x333333, hs, scene);
    var core = createSprite(glowTexCore, 0x000000, cs, scene);
    var burst = star.spikes ? createSprite(burstTex, 0x222222, bs, scene) : null;
    if (burst) burst.material.rotation = CONFIG.burstRotation;

    var depth = (star.dist - CONFIG.parallaxMedian) * CONFIG.parallaxScale;
    var start = cardinalStart();
    halo.position.set(start.x, start.y, depth);
    core.position.set(start.x, start.y, depth);
    if (burst) burst.position.set(start.x, start.y, depth);

    return {
      name: star.name, nameJa: star.nameJa,
      halo: halo, core: core, burst: burst,
      startX: start.x, startY: start.y,
      targetX: star.tx, targetY: star.ty, depth: depth,
      haloScale: hs, coreScale: cs, burstScale: bs,
      twinkleOffset: Math.random() * 100,
      twinkleSpeed: CONFIG.twinkleSpeedBase + Math.random() * CONFIG.twinkleSpeedRange
    };
  }

  function buildConstellation(scene) {
    var result = [];
    for (var i = 0; i < STARS_DATA.length; i++) {
      result.push(buildStarEntry(STARS_DATA[i], scene));
    }
    return result;
  }

  /* =============================================================
     6. ANIMATION — render loop
     ============================================================= */
  function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  var driftComplete = false;

  function driftStar(s, eased) {
    var x = s.startX + (s.targetX - s.startX) * eased;
    var y = s.startY + (s.targetY - s.startY) * eased;
    s.halo.position.x = x;  s.halo.position.y = y;
    s.core.position.x = x;  s.core.position.y = y;
    if (s.burst) { s.burst.position.x = x; s.burst.position.y = y; }
    return { x: x, y: y };
  }

  function fadeStar(s, elapsed, x, y) {
    var edgeDist = Math.max(Math.abs(x), Math.abs(y));
    var edgeFade = 1 - Math.max(0, Math.min(
      (edgeDist - CONFIG.edgeFadeInner) / (CONFIG.edgeFadeOuter - CONFIG.edgeFadeInner), 1));
    var fadeIn = Math.min(elapsed / CONFIG.fadeInDuration, 1);
    var opacity = fadeIn * edgeFade;
    s.halo.material.opacity = CONFIG.haloOpacity * opacity;
    s.core.material.opacity = CONFIG.coreOpacity * opacity;
    if (s.burst) {
      var bf = Math.max(0, Math.min((elapsed - CONFIG.burstFadeDelay) / CONFIG.burstFadeDuration, 1));
      s.burst.material.opacity = CONFIG.burstOpacity * bf * edgeFade;
    }
  }

  function twinkleStar(s, now, progress) {
    if (progress < CONFIG.twinkleStart) return;
    var phase = (progress - CONFIG.twinkleStart) / (1 - CONFIG.twinkleStart);
    var tw = 1 + CONFIG.twinkleAmplitude * Math.sin(now * s.twinkleSpeed + s.twinkleOffset) * phase;
    s.halo.scale.set(s.haloScale * tw, s.haloScale * tw, 1);
    s.core.scale.set(s.coreScale * tw, s.coreScale * tw, 1);
    if (s.burst) {
      var btw = 1 + CONFIG.burstTwinkleAmplitude *
        Math.sin(now * s.twinkleSpeed * 1.3 + s.twinkleOffset + 1.5) * phase;
      s.burst.scale.set(s.burstScale * btw, s.burstScale * btw, 1);
    }
  }

  function createLoop(renderer, scene, camera, stars, controls) {
    var startTime = -1;

    function animate(now) {
      requestAnimationFrame(animate);
      if (startTime < 0) startTime = now;
      var elapsed = now - startTime;
      var progress = Math.min(elapsed / CONFIG.driftDuration, 1);
      var eased = easeOutQuart(progress);

      for (var i = 0; i < stars.length; i++) {
        var pos = driftStar(stars[i], eased);
        fadeStar(stars[i], elapsed, pos.x, pos.y);
        twinkleStar(stars[i], now, progress);
      }

      // Background stars fade in during second half of drift
      var bgFade = Math.max(0, (progress - 0.25) * 2); // 0 at 50%, 1 at 100%
      bgStars.points.material.opacity = CONFIG.bgPointOpacity * bgFade;

      if (progress >= 1 && !driftComplete) {
        driftComplete = true;
        controls.enabled = true;
      }

      controls.update();
      renderer.clear();
      renderer.render(bgScene, bgCamera);
      renderer.clearDepth();
      renderer.render(scene, camera);
      LabelDisplay.update(camera, renderer.domElement);
    }

    animate.restart = function () {
      driftComplete = false;
      controls.enabled = false;
      controls.reset();
      startTime = -1;
      bgStars.points.material.opacity = 0;
      for (var i = 0; i < stars.length; i++) {
        var start = cardinalStart();
        stars[i].startX = start.x;
        stars[i].startY = start.y;
      }
      LabelDisplay.hideHover();
      if (LabelDisplay.visible) LabelDisplay.toggleAll();
    };

    return animate;
  }

  /* =============================================================
     7. LABELS — LabelUnit factory + hover / all-labels systems
     ============================================================= */
  var LABEL_CSS = 'position:absolute;pointer-events:none;opacity:0;' +
    'font-family:"Courier New",monospace;font-size:14px;letter-spacing:3px;' +
    'color:#222;text-transform:uppercase;white-space:nowrap;' +
    'padding-bottom:1px';

  /**
   * LabelUnit — manages a label (DOM div), segment (SVG line from star
   * to label), and underline (CSS border-bottom on the label) as one unit.
   */
  function createLabelUnit(container, svg) {
    var el = document.createElement('div');
    el.style.cssText = LABEL_CSS;
    container.appendChild(el);

    var segment = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    segment.setAttribute('stroke', '#222');
    segment.setAttribute('stroke-width', '0.5');
    segment.style.opacity = '0';
    svg.appendChild(segment);

    return {
      el: el,
      segment: segment,

      /** Set label text content */
      setText: function (text) {
        el.textContent = text.toUpperCase();
      },

      /** Position label + segment relative to a star screen point */
      position: function (sx, sy, offsetX, offsetY, leftSide, contW) {
        var lx = sx + offsetX;
        var ly = sy + offsetY;

        if (leftSide) {
          el.style.left = '';
          el.style.right = (contW - lx) + 'px';
        } else {
          el.style.right = '';
          el.style.left = lx + 'px';
        }
        el.style.top = ly + 'px';

        var centerY = ly + el.offsetHeight / 2;
        segment.setAttribute('x1', sx);
        segment.setAttribute('y1', sy);
        segment.setAttribute('x2', lx);
        segment.setAttribute('y2', centerY);
      },

      /** Show label + segment */
      show: function () {
        el.style.opacity = '1';
        segment.style.opacity = '1';
      },

      /** Hide label + segment */
      hide: function () {
        el.style.opacity = '0';
        segment.style.opacity = '0';
      }
    };
  }

  function projectStar(star, camera, rendererDom) {
    var w = rendererDom.width / (window.devicePixelRatio || 1);
    var h = rendererDom.height / (window.devicePixelRatio || 1);
    var proj = star.core.position.clone().project(camera);
    return {
      x: (proj.x * 0.5 + 0.5) * w,
      y: (-proj.y * 0.5 + 0.5) * h
    };
  }

  // --- Unified label display (hover + persistent all-labels) ---

  // Label placement angles: 25°–65° in each quadrant, preference peaks at 45°
  var LABEL_CANDIDATES = [];
  (function () {
    var DEG = Math.PI / 180;
    var bases = [0, 90, 180, 270];
    for (var b = 0; b < bases.length; b++) {
      for (var d = 25; d <= 65; d += 5) {
        var angle = (bases[b] + d) * DEG;
        // Preference: 1.0 at 45°, 0.5 at 25°/65°
        var pref = 0.5 + 0.5 * Math.cos((d - 45) / 20 * Math.PI / 2);
        LABEL_CANDIDATES.push({ angle: angle, pref: pref });
      }
    }
  })();
  var LABEL_DIST = CONFIG.labelOffsetX;

  var LabelDisplay = {
    container: null,
    svg: null,
    lang: 'ja',

    // Hover state
    hover: null,        // LabelUnit
    hoverActive: null,
    hoverStar: null,
    scrambleTimer: null,

    // All-labels state
    entries: [],        // { unit, star }
    visible: false,

    init: function (container, stars) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;pointer-events:none';
      container.appendChild(svg);
      this.svg = svg;
      this.container = container;
      this.hover = createLabelUnit(container, svg);

      for (var i = 0; i < stars.length; i++) {
        this.entries.push({ unit: createLabelUnit(container, svg), star: stars[i] });
      }
    },

    // --- shared helpers ---

    _starName: function (star) {
      return this.lang === 'ja' ? star.nameJa : star.name;
    },

    _scrambleChars: function () {
      return this.lang === 'ja' ? CONFIG.labelScrambleCharsJa : CONFIG.labelScrambleChars;
    },

    _showLabel: function (unit, star) {
      unit.setText(this._starName(star));
      unit.show();
    },

    /** Pick the angle (25°–65° per quadrant, 45° preferred) farthest from other stars */
    _bestPlacement: function (pos, allPositions, skipIdx) {
      var bestOX = LABEL_DIST;
      var bestOY = 0;
      var bestScore = -1;

      for (var a = 0; a < LABEL_CANDIDATES.length; a++) {
        var c = LABEL_CANDIDATES[a];
        var ox = LABEL_DIST * Math.cos(c.angle);
        var oy = -LABEL_DIST * Math.sin(c.angle);
        var cx = pos.x + ox;
        var cy = pos.y + oy;

        var minDist = Infinity;
        for (var j = 0; j < allPositions.length; j++) {
          if (j === skipIdx) continue;
          var dx = cx - allPositions[j].x;
          var dy = cy - allPositions[j].y;
          var d = dx * dx + dy * dy;
          if (d < minDist) minDist = d;
        }

        var score = minDist * c.pref;
        if (score > bestScore) {
          bestScore = score;
          bestOX = ox;
          bestOY = oy;
        }
      }

      return { side: bestOX >= 0 ? 1 : -1, offsetX: bestOX, offsetY: bestOY };
    },

    // --- hover ---

    _scrambleReveal: function (target, chars) {
      var self = this;
      var len = target.length;
      var duration = CONFIG.labelScrambleDuration;
      var startTime = performance.now();
      var display = [];
      for (var i = 0; i < len; i++) {
        display[i] = chars[Math.floor(Math.random() * chars.length)];
      }
      self.hover.el.textContent = display.join('');
      if (self.scrambleTimer) cancelAnimationFrame(self.scrambleTimer);

      function tick() {
        var elapsed = performance.now() - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var revealed = Math.floor(progress * (len + 1));
        for (var i = 0; i < len; i++) {
          display[i] = i < revealed ? target[i] : chars[Math.floor(Math.random() * chars.length)];
        }
        self.hover.el.textContent = display.join('');
        if (progress < 1) self.scrambleTimer = requestAnimationFrame(tick);
      }
      self.scrambleTimer = requestAnimationFrame(tick);
    },

    showHover: function (star) {
      var name = this._starName(star);
      if (this.hoverActive === name) return;
      this.hoverActive = name;
      this.hoverStar = star;
      this._showLabel(this.hover, star);
      this._scrambleReveal(name.toUpperCase(), this._scrambleChars());
    },

    hideHover: function () {
      if (!this.hoverActive) return;
      this.hoverActive = null;
      this.hoverStar = null;
      this.hover.hide();
      if (this.scrambleTimer) {
        cancelAnimationFrame(this.scrambleTimer);
        this.scrambleTimer = null;
      }
    },

    // --- all labels ---

    toggleAll: function () {
      this.visible = !this.visible;
      for (var i = 0; i < this.entries.length; i++) {
        if (this.visible) {
          this._showLabel(this.entries[i].unit, this.entries[i].star);
        } else {
          this.entries[i].unit.hide();
        }
      }
      this.hideHover();
    },

    // --- language ---

    toggleLang: function () {
      this.lang = this.lang === 'en' ? 'ja' : 'en';
      this.hideHover();
      if (this.visible) {
        for (var i = 0; i < this.entries.length; i++) {
          this.entries[i].unit.setText(this._starName(this.entries[i].star));
        }
      }
    },

    // --- per-frame update (call from render loop) ---

    update: function (camera, rendererDom) {
      var contW = this.container.offsetWidth;
      var needsHover = this.hoverActive && this.hoverStar;
      if (!needsHover && !this.visible) return;

      // Project all stars once
      var positions = [];
      for (var i = 0; i < this.entries.length; i++) {
        positions.push(projectStar(this.entries[i].star, camera, rendererDom));
      }

      if (needsHover) {
        // Find hover star index in entries
        var hIdx = -1;
        for (var i = 0; i < this.entries.length; i++) {
          if (this.entries[i].star === this.hoverStar) { hIdx = i; break; }
        }
        var hp = positions[hIdx] || projectStar(this.hoverStar, camera, rendererDom);
        var pl = this._bestPlacement(hp, positions, hIdx);
        this.hover.position(hp.x, hp.y, pl.offsetX, pl.offsetY, pl.side === -1, contW);
      }

      if (!this.visible) return;
      for (var i = 0; i < this.entries.length; i++) {
        var pl = this._bestPlacement(positions[i], positions, i);
        this.entries[i].unit.position(positions[i].x, positions[i].y,
          pl.offsetX, pl.offsetY, pl.side === -1, contW);
      }
    }
  };

  /* =============================================================
     8. INIT — setup scene and start
     ============================================================= */
  var container = document.getElementById('pleiades-container');
  if (!container) return;

  // Background scene (fixed, no orbit)
  var bgScene = new THREE.Scene();
  var bgCamera = new THREE.OrthographicCamera(-5, 5, 5, -5, 0.1, 100);
  bgCamera.position.z = 10;

  // Main scene (orbitable)
  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(0, 0, 14);

  var renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(CONFIG.size, CONFIG.size);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(CONFIG.bgColor);
  renderer.autoClear = false;
  renderer.domElement.style.borderRadius = CONFIG.borderRadius;
  container.appendChild(renderer.domElement);

  container.style.position = 'relative';
  container.style.backgroundColor = '#f5f5f5';

  // OrbitControls — orbit with damping, like three.js galaxy example
  var controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.enabled = false;

  var bgStars = Layers.addBackgroundStars(bgScene);
  bgStars.points.material.opacity = 0;
  var stars = buildConstellation(scene);
  LabelDisplay.init(container, stars);

  var animateLoop = createLoop(renderer, scene, camera, stars, controls);
  requestAnimationFrame(animateLoop);

  function onMouseMove(e) {
    if (!driftComplete || LabelDisplay.visible) return;
    var rect = renderer.domElement.getBoundingClientRect();
    var mx = e.clientX - rect.left;
    var my = e.clientY - rect.top;

    // Hit test in screen space: project each star and compare pixel distance
    var hit = null;
    var hitDist = Infinity;
    var hitRadius = CONFIG.labelHitRadius * rect.width / 10; // convert world units to approx pixels
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      var p = projectStar(s, camera, renderer.domElement);
      var dx = mx - p.x;
      var dy = my - p.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      var radius = Math.max(hitRadius, s.haloScale * 0.5 * rect.width / 10);
      if (dist < radius && dist < hitDist) { hit = s; hitDist = dist; }
    }

    if (hit) {
      LabelDisplay.showHover(hit);
    } else {
      LabelDisplay.hideHover();
    }
  }

  renderer.domElement.addEventListener('mousemove', function (e) {
    if (e.buttons > 0) return;
    onMouseMove(e);
  });
  renderer.domElement.addEventListener('mouseleave', function () { LabelDisplay.hideHover(); });
  window.addEventListener('keydown', function (e) {
    if (e.key === 'j' || e.key === 'J') { LabelDisplay.toggleLang(); }
    if (e.key === 'r' || e.key === 'R') { controls.reset(); LabelDisplay.hideHover(); }
    if (e.key === 'd' || e.key === 'D') { LabelDisplay.toggleAll(); }
    if (e.key === 'f' || e.key === 'F') { toggleFullscreen(); }
  });

  function isFullscreen() {
    return document.fullscreenElement === container;
  }

  function toggleFullscreen() {
    if (!isFullscreen()) {
      container.requestFullscreen().then(function () {
        resize();
        animateLoop.restart();
      });
    } else {
      document.exitFullscreen();
    }
  }

  document.addEventListener('fullscreenchange', function () {
    resize();
    if (!isFullscreen()) animateLoop.restart();
  });

  function resize() {
    var w, h;
    if (isFullscreen()) {
      w = window.innerWidth;
      h = window.innerHeight;
    } else {
      var s = Math.min(container.parentElement.offsetWidth, CONFIG.size);
      w = s;
      h = s;
    }
    renderer.setSize(w, h);
    renderer.domElement.style.width = w + 'px';
    renderer.domElement.style.height = h + 'px';
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  window.addEventListener('resize', resize);
  resize();

})();
