// Small page behaviours: solid bar after the hero, one-time light sweeps, video.
(() => {
  const bar = document.querySelector("[data-bar]");
  const hero = document.querySelector(".hero");
  const onScroll = () => {
    const end = hero ? hero.offsetHeight - innerHeight * 0.5 : 80;
    bar.classList.toggle("is-solid", scrollY > end);
  };
  addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  // light passes over gilded numbers and the client list when they first appear
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add("is-lit"); io.unobserve(e.target); }
  }, { threshold: 0.4 });
  document.querySelectorAll("[data-gild], [data-sweep]").forEach((el) => io.observe(el));

  // video: poster + one button, native controls once playing
  document.querySelectorAll("[data-video]").forEach((box) => {
    const v = box.querySelector("video"), b = box.querySelector("button");
    b.addEventListener("click", () => {
      box.classList.add("is-playing");
      v.controls = true;
      v.play();
    });
  });
})();
