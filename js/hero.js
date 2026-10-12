// Hero: one continuous shot (Kling take), its frames scrubbed on a canvas by scroll.
(() => {
  // tall screens get the vertical take, wide screens the horizontal one
  const tall = matchMedia("(max-aspect-ratio: 4/5)").matches;
  const FRAMES = tall ? 121 : 121;
  const dir = tall ? "frames-m" : "frames";
  const src = (i) => `${dir}/f_${String(i + 1).padStart(4, "0")}.webp`;

  const hero = document.querySelector(".hero");
  if (!hero || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const stage = hero.querySelector(".hero__stage");
  const canvas = hero.querySelector(".hero__canvas");
  const ctx = canvas.getContext("2d");

  const imgs = new Array(FRAMES);
  let drawn = -1;
  const load = (i) => {
    if (imgs[i]) return imgs[i];
    const im = new Image();
    im.decoding = "async";
    im.src = src(i);
    return (imgs[i] = im);
  };
  // ends first, then fill in order
  load(0); load(FRAMES - 1);
  let next = 1;
  (function pump() {
    for (let k = 0; k < 6 && next < FRAMES - 1; k++) load(next++);
    if (next < FRAMES - 1) setTimeout(pump, 30);
  })();

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(stage.clientWidth * dpr);
    canvas.height = Math.round(stage.clientHeight * dpr);
    drawn = -1;
    tick();
  };

  const draw = (im, focusX) => {
    const cw = canvas.width, ch = canvas.height;
    const s = Math.max(cw / im.naturalWidth, ch / im.naturalHeight);
    const w = im.naturalWidth * s, h = im.naturalHeight * s;
    ctx.drawImage(im, (cw - w) * focusX, (ch - h) * 0.3, w, h);
  };
  const nearest = (i) => {
    for (let d = 0; d < FRAMES; d++) {
      for (const j of [i - d, i + d]) {
        const im = imgs[j];
        if (im && im.complete && im.naturalWidth) return im;
      }
    }
    return null;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const ramp = (p, a, b) => clamp((p - a) / (b - a), 0, 1);

  let raf = 0;
  function tick() {
    raf = 0;
    const r = hero.getBoundingClientRect();
    const total = hero.offsetHeight - stage.clientHeight;
    const p = clamp(-r.top / total, 0, 1);
    const vp = ramp(p, 0.12, 0.88);
    const i = Math.round(vp * (FRAMES - 1));
    const focus = tall ? 0.5 : 0.66 + (0.4 - 0.66) * vp;

    if (i !== drawn) {
      const im = nearest(i);
      if (im) {
        draw(im, focus);
        if (im === imgs[i]) drawn = i;
        hero.classList.add("is-ready");
      }
    }
    const st = hero.style;
    const io = 1 - ramp(p, 0.04, 0.16);
    st.setProperty("--intro-o", io.toFixed(3));
    st.setProperty("--intro-y", `${(-40 * (1 - io)).toFixed(1)}px`);
    const oo = ramp(p, 0.84, 0.95);
    st.setProperty("--outro-o", oo.toFixed(3));
    st.setProperty("--outro-y", `${(24 * (1 - oo)).toFixed(1)}px`);
    st.setProperty("--focus-x", `${(focus * 100).toFixed(1)}%`);
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", resize);
  setInterval(onScroll, 250);
  resize();
})();
