// Constellation: tiny gilded triangles that gather into a symbol for each section.
// Each section names its symbol in data-shape; the particles fly between symbols
// on a spring as the reader scrolls. Shapes are rasterised once, then sampled.
(() => {
  const canvas = document.querySelector("[data-stars]");
  if (!canvas) return;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ctx = canvas.getContext("2d");

  const COLORS = [
    ["#d9b77a", 0.5], ["#cc9166", 0.22], ["#fff0cc", 0.2], ["#c0141f", 0.04], ["#8a8f9c", 0.04],
  ];
  const pickColor = () => {
    let r = Math.random();
    for (const [c, w] of COLORS) { if ((r -= w) <= 0) return c; }
    return COLORS[0][0];
  };

  // ── symbols, drawn into a 200×200 box ──
  const S = 200;
  const draw = {
    table(g) { // a round table with guests around it — the room as one
      g.lineWidth = 7; g.beginPath(); g.arc(100, 100, 40, 0, Math.PI * 2); g.stroke();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        g.beginPath(); g.arc(100 + Math.cos(a) * 74, 100 + Math.sin(a) * 74, 11, 0, Math.PI * 2); g.fill();
      }
    },
    glass(g) { // champagne flute with rising bubbles
      g.beginPath();
      g.moveTo(78, 22); g.lineTo(122, 22); g.lineTo(116, 92);
      g.quadraticCurveTo(112, 112, 104, 116); g.lineTo(104, 160); g.lineTo(126, 166); g.lineTo(126, 174);
      g.lineTo(74, 174); g.lineTo(74, 166); g.lineTo(96, 160); g.lineTo(96, 116);
      g.quadraticCurveTo(88, 112, 84, 92); g.closePath(); g.fill();
      for (const [x, y, r] of [[138, 34, 5], [150, 16, 4], [134, 6, 3], [62, 30, 4], [52, 12, 3]]) {
        g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
      }
    },
    mic(g) {
      g.beginPath(); g.roundRect(78, 14, 44, 80, 22); g.fill();
      g.lineWidth = 8; g.beginPath(); g.arc(100, 78, 38, 0.05 * Math.PI, 0.95 * Math.PI); g.stroke();
      g.fillRect(96, 116, 8, 40); g.fillRect(70, 154, 60, 8);
    },
    star(g) {
      g.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = -Math.PI / 2 + (k * Math.PI) / 5, r = k % 2 ? 36 : 88;
        g.lineTo(100 + Math.cos(a) * r, 104 + Math.sin(a) * r);
      }
      g.closePath(); g.fill();
    },
    infinity(g) {
      g.lineWidth = 15; g.beginPath();
      for (let t = 0; t <= Math.PI * 2 + 0.01; t += 0.02) {
        const d = 1 + Math.sin(t) ** 2;
        g.lineTo(100 + (84 * Math.cos(t)) / d, 100 + (84 * Math.sin(t) * Math.cos(t)) / d);
      }
      g.stroke();
    },
    bulb(g) { // outlined glass, a lit filament inside, screw base below
      g.lineWidth = 8; g.lineJoin = "round";
      g.beginPath(); g.arc(100, 76, 48, Math.PI * 0.8, Math.PI * 2.2);
      g.quadraticCurveTo(122, 112, 118, 132); g.lineTo(82, 132); g.quadraticCurveTo(78, 112, 63, 104);
      g.stroke();
      g.lineWidth = 5; g.beginPath();
      g.moveTo(90, 130); g.lineTo(90, 96); g.lineTo(96, 84); g.lineTo(100, 96); g.lineTo(104, 84); g.lineTo(110, 96); g.lineTo(110, 130);
      g.stroke();
      g.fillRect(80, 140, 40, 8); g.fillRect(82, 152, 36, 8); g.fillRect(90, 164, 20, 7);
    },
    play(g) {
      g.lineWidth = 7; g.beginPath(); g.arc(100, 100, 80, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(82, 62); g.lineTo(140, 100); g.lineTo(82, 138); g.closePath(); g.fill();
    },
    quote(g) { g.font = `400 260px Prata, Georgia, serif`; g.textAlign = "center"; g.fillText("«»", 100, 200); },
    question(g) { g.font = `400 220px Prata, Georgia, serif`; g.textAlign = "center"; g.fillText("?", 100, 178); },
    pin(g) {
      g.beginPath(); g.arc(100, 74, 52, Math.PI * 0.85, Math.PI * 2.15); g.lineTo(100, 184); g.closePath(); g.fill();
      g.globalCompositeOperation = "destination-out"; g.beginPath(); g.arc(100, 74, 20, 0, Math.PI * 2); g.fill();
      g.globalCompositeOperation = "source-over";
    },
    monogram(g) { g.font = `400 150px Prata, Georgia, serif`; g.textAlign = "center"; g.fillText("АВ", 100, 152); },
  };

  // rasterise a symbol and pick n random filled points (normalised -0.5…0.5)
  const off = document.createElement("canvas"); off.width = off.height = S;
  const og = off.getContext("2d", { willReadFrequently: true });
  const cache = {};
  function sample(name, n) {
    const key = name + n;
    if (cache[key]) return cache[key];
    og.clearRect(0, 0, S, S); og.fillStyle = og.strokeStyle = "#fff"; og.lineCap = "round";
    draw[name](og);
    const data = og.getImageData(0, 0, S, S).data, pts = [];
    for (let y = 0; y < S; y += 2) for (let x = 0; x < S; x += 2) if (data[(y * S + x) * 4 + 3] > 128) pts.push([x / S - 0.5, y / S - 0.5]);
    const out = [];
    for (let k = 0; k < n; k++) {
      const p = pts[(Math.random() * pts.length) | 0];
      out.push([p[0] + (Math.random() - 0.5) * 0.008, p[1] + (Math.random() - 0.5) * 0.008]);
    }
    // shuffle so particles cross the screen between symbols, not just slide
    for (let k = out.length - 1; k > 0; k--) { const j = (Math.random() * (k + 1)) | 0; [out[k], out[j]] = [out[j], out[k]]; }
    return (cache[key] = out);
  }

  let W = 0, H = 0, dpr = 1, N = 0, parts = [];
  let shape = "none";

  function layout() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const want = W < 700 ? 420 : 900;
    if (want !== N) {
      N = want;
      parts = Array.from({ length: N }, () => ({
        x: Math.random() * W, y: Math.random() * H, vx: 0, vy: 0,
        tx: Math.random() * W, ty: Math.random() * H,
        s: 1.6 + Math.random() * 2.6, r: Math.random() * Math.PI * 2, vr: (Math.random() - 0.5) * 0.02,
        c: pickColor(), a: 0, ta: 0, ph: Math.random() * Math.PI * 2,
      }));
    }
    retarget(shape, true);
  }

  // where the symbol sits: right half on wide screens, centred and faint on phones
  const box = () => {
    const narrow = W < 900;
    const size = narrow ? Math.min(W * 0.78, 360) : Math.min(W * 0.34, H * 0.62, 480);
    return { cx: narrow ? W / 2 : W * 0.74, cy: H * 0.5, size, alpha: narrow ? 0.16 : 0.95 };
  };

  function retarget(name, instant) {
    shape = name;
    if (name === "none" || name === "dust" || name === "field") {
      // loose field: everywhere for "field", thin dust for cases, gone in the hero
      for (const p of parts) {
        p.tx = Math.random() * W; p.ty = Math.random() * H;
        p.ta = name === "field" ? 0.55 : name === "dust" ? 0.18 : 0;
      }
    } else {
      const b = box(), pts = sample(name, N);
      parts.forEach((p, k) => {
        // a few strays keep drifting around the symbol, like dust in a beam
        const stray = k % 9 === 0;
        p.tx = stray ? b.cx + (Math.random() - 0.5) * b.size * 2.2 : b.cx + pts[k][0] * b.size;
        p.ty = stray ? b.cy + (Math.random() - 0.5) * b.size * 1.6 : b.cy + pts[k][1] * b.size;
        p.ta = b.alpha * (stray ? 0.35 : 1);
      });
    }
    if (instant) for (const p of parts) { p.x = p.tx; p.y = p.ty; p.a = p.ta; }
  }

  let t = 0, running = true;
  function frame() {
    if (!running) return;
    t += 1;
    ctx.clearRect(0, 0, W, H);
    for (const p of parts) {
      // critically-damped-ish spring with a little per-particle variance
      const k = 0.018 + (p.s % 1) * 0.01;
      p.vx = (p.vx + (p.tx - p.x) * k) * 0.82;
      p.vy = (p.vy + (p.ty - p.y) * k) * 0.82;
      p.x += p.vx; p.y += p.vy;
      p.a += (p.ta - p.a) * 0.06;
      p.r += p.vr;
      if (p.a < 0.01) continue;
      const tw = 0.75 + 0.25 * Math.sin(t * 0.03 + p.ph); // gentle twinkle
      const jx = Math.sin(t * 0.01 + p.ph) * 0.6, jy = Math.cos(t * 0.012 + p.ph) * 0.6;
      ctx.globalAlpha = p.a * tw;
      ctx.strokeStyle = p.c;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let v = 0; v < 3; v++) {
        const a = p.r + (v * Math.PI * 2) / 3;
        const x = p.x + jx + Math.cos(a) * p.s, y = p.y + jy + Math.sin(a) * p.s;
        v ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  // the section nearest the middle of the screen decides the symbol
  const sections = [...document.querySelectorAll("[data-shape]")];
  let current = null;
  function pick() {
    const mid = innerHeight * 0.5;
    let best = null;
    for (const el of sections) {
      const r = el.getBoundingClientRect();
      if (r.top <= mid && r.bottom >= mid) best = el; // innermost wins (dir inside directions)
    }
    const name = best ? best.dataset.shape : "field";
    if (name !== current) { current = name; retarget(name, false); }
  }

  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running && !reduced) requestAnimationFrame(frame);
  });

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    layout();
    pick();
    addEventListener("scroll", pick, { passive: true });
    addEventListener("resize", () => { Object.keys(cache).forEach((k) => delete cache[k]); layout(); current = null; pick(); });
    if (reduced) { for (const p of parts) { p.x = p.tx; p.y = p.ty; p.a = p.ta; } frame(); running = false; }
    else requestAnimationFrame(frame);
  });
})();
