// Startar spelet: laddar sparfil, kör tick-loopen och sparar automatiskt.

(function main() {
  const offline = Game.load();
  UI.init();
  if (!Game.state.seenIntro) UI.showIntro();
  else if (offline) UI.showOffline(offline);

  let last = Date.now();
  function step() {
    const now = Date.now();
    const dt = now - last;
    last = now;
    if (dt > 60000) {
      // Fliken har sovit länge (t.ex. datorn i viloläge): räkna ikapp som offline.
      const diff = Game.simulateOffline(dt);
      UI.dirty = true;
      UI.showOffline(diff);
    } else {
      Game.tick(dt);
    }
  }

  setInterval(step, 100);
  setInterval(() => Game.save(), 10000);
  window.addEventListener('beforeunload', () => Game.save());

  function frame(now) {
    UI.frame(now);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
