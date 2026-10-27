(() => {
  'use strict';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const main = document.querySelector('main');
  const empty = document.querySelector('.empty');
  const report = document.querySelector('.report');
  const live = document.querySelector('#announcement');
  const bugs = [...document.querySelectorAll('.issue')].map((card, i) => ({
    card, el: card.querySelector('.bug'), bearing: card.querySelector('.bearing'),
    button: card.querySelector('.fix'), status: card.querySelector('.status'),
    x: 20 + i * 69, y: 5, angle: 90, version: 0, state: 'open', cooldown: 0,
    animations: new Set(), index: i, width: 0, height: 0
  }));
  // Every choreography step is a pausable Web Animation, including the rests.
  function animate(b, node, frames, duration) {
    const moves = frames.some(frame => 'transform' in frame);
    if (moves && reduced.matches) duration = 0;
    const a = node.animate(frames, { duration, fill: 'forwards', easing: 'linear' });
    b.animations.add(a);
    if (document.hidden) a.pause();
    return a.finished.then(() => true, () => false).finally(() => b.animations.delete(a));
  }
  function measure(b) { b.width = b.card.clientWidth; b.height = b.card.clientHeight; }
  function place(b, x, y) { b.x = x; b.y = y; b.el.style.transform = `translate(${x}px,${y}px)`; }
  function stop(b) {
    const m = new DOMMatrixReadOnly(getComputedStyle(b.el).transform);
    const rotation = getComputedStyle(b.bearing).transform;
    b.version++;
    b.animations.forEach(a => a.cancel());
    // Finished fill effects must also be removed before writing the next position.
    b.el.getAnimations().forEach(a => a.cancel());
    b.bearing.getAnimations().forEach(a => a.cancel());
    place(b, m.m41, m.m42);
    b.bearing.style.transform = rotation;
    b.el.classList.remove('walking', 'noticing', 'waving');
  }
  async function turn(b, angle, duration = 180) {
    const from = getComputedStyle(b.bearing).transform;
    b.angle = angle;
    const ok = await animate(b, b.bearing, [{ transform: from }, { transform: `rotate(${angle}deg)` }], duration);
    if (ok) { b.bearing.style.transform = `rotate(${angle}deg)`; b.bearing.getAnimations().forEach(a => a.cancel()); }
    return ok;
  }
  async function move(b, x, y, duration) {
    const ok = await animate(b, b.el, [
      { transform: `translate(${b.x}px,${b.y}px)` }, { transform: `translate(${x}px,${y}px)` }
    ], duration);
    if (ok) { place(b, x, y); b.el.getAnimations().forEach(a => a.cancel()); }
    return ok;
  }
  async function rest(b, duration) {
    const ok = await animate(b, b.el, [{ opacity: 1 }, { opacity: 1 }], duration);
    if (ok) b.el.getAnimations().forEach(a => a.cancel());
    return ok;
  }
  async function wander(b) {
    if (reduced.matches || b.state !== 'open') return;
    const version = b.version;
    if (!await rest(b, 300 + b.index * 530)) return;
    let corner = b.y < 20 ? 0 : b.x > b.width - 50 ? 1 : b.y > b.height - 55 ? 2 : 3;
    while (b.state === 'open' && version === b.version && !reduced.matches) {
      measure(b);
      const points = [[b.width - 39, 4], [b.width - 35, b.height - 38], [6, b.height - 38], [6, 4]];
      const [x, y] = points[corner];
      const distance = Math.hypot(x - b.x, y - b.y);
      if (!await turn(b, Math.atan2(y - b.y, x - b.x) * 180 / Math.PI + 90)) return;
      b.el.classList.add('walking');
      if (!await move(b, x, y, Math.max(300, distance / 12 * 1000))) return;
      b.el.classList.remove('walking');
      if (!await rest(b, 900 + b.index * 190)) return;
      corner = (corner + 1) % 4;
    }
  }
  async function shy(b, px, py) {
    if (b.state !== 'open' || reduced.matches || Date.now() < b.cooldown) return;
    b.cooldown = Date.now() + 3500;
    stop(b);
    const version = b.version;
    const dx = px - b.x - 14, dy = py - b.y - 17;
    b.el.classList.add('noticing');
    b.el.style.setProperty('--look', `${Math.max(-28, Math.min(28, dx / 3))}deg`);
    if (!await turn(b, Math.atan2(dy, dx) * 180 / Math.PI + 90, 160)) return;
    if (!await rest(b, 420)) return;
    b.el.classList.remove('noticing');
    measure(b);
    // Stay on the current border lane rather than running across the copy.
    const horizontal = b.y < 20 || b.y > b.height - 55;
    const x = horizontal ? Math.max(6, Math.min(b.width - 36, b.x + (dx > 0 ? -48 : 48))) : b.x;
    const y = horizontal ? b.y : Math.max(4, Math.min(b.height - 38, b.y + (dy > 0 ? -48 : 48)));
    if (!await turn(b, Math.atan2(y - b.y, x - b.x) * 180 / Math.PI + 90)) return;
    b.el.classList.add('walking');
    if (!await move(b, x, y, 440)) return;
    b.el.classList.remove('walking');
    if (version === b.version) wander(b);
  }
  function announce(message) { live.textContent = message; }
  function showEmpty() {
    if (!bugs.every(b => b.state === 'gone')) return;
    main.classList.add('all-left'); empty.inert = false; empty.removeAttribute('aria-hidden');
    announce('Fixed. The bug packed up and left. No bugs live here anymore.');
    // Keep keyboard users at a useful next action when the last button disappears.
    if (bugs.some(b => b.button === document.activeElement)) report.focus({ preventScroll: true });
  }
  function track(b) {
    if (!document.hidden && !reduced.matches && b.state === 'leaving') {
      const m = new DOMMatrixReadOnly(getComputedStyle(b.el).transform);
      const dot = document.createElement('i');
      dot.className = 'footprint'; dot.setAttribute('aria-hidden', 'true');
      dot.style.transform = `translate(${m.m41 + 12}px,${m.m42 + 22}px) rotate(${b.angle}deg)`;
      b.card.append(dot); dot.addEventListener('animationend', () => dot.remove(), { once: true });
    }
  }
  async function fix(b) {
    if (b.state !== 'open') return;
    stop(b); b.state = 'packing'; b.button.setAttribute('aria-disabled', 'true');
    b.status.textContent = `✓ Fixed by ${b.card.dataset.agent}`;
    b.button.innerHTML = 'Fixed <span aria-hidden="true">✓</span>';
    announce(`Fixed by ${b.card.dataset.agent}. The bug is packing up.`);
    b.el.classList.add('packed');
    if (reduced.matches) {
      await animate(b, b.el, [{ opacity: 1 }, { opacity: 0 }], 450);
    } else {
      b.el.classList.add('waving');
      if (!await rest(b, 1100)) return;
      b.el.classList.remove('waving'); measure(b);
      const exits = [[-40, b.y], [b.width + 15, b.y], [b.x, -48], [b.x, b.height + 15]];
      const [x, y] = exits.sort((a, c) => Math.hypot(a[0] - b.x, a[1] - b.y) - Math.hypot(c[0] - b.x, c[1] - b.y))[0];
      if (!await turn(b, Math.atan2(y - b.y, x - b.x) * 180 / Math.PI + 90)) return;
      b.state = 'leaving'; b.el.classList.add('walking');
      const tracks = setInterval(() => track(b), 140);
      await move(b, x, y, Math.max(900, Math.hypot(x - b.x, y - b.y) / 45 * 1000));
      clearInterval(tracks);
    }
    b.state = 'gone'; b.el.style.opacity = '0'; b.el.classList.remove('walking');
    b.card.classList.add('resolved');
    announce(`Fixed by ${b.card.dataset.agent}. The bug packed up and left.`); showEmpty();
  }
  report.addEventListener('click', async () => {
    const b = bugs[0];
    if (b.state !== 'gone') return;
    main.classList.remove('all-left'); empty.inert = true; empty.setAttribute('aria-hidden', 'true');
    stop(b); b.state = 'entering'; b.el.classList.remove('packed'); b.el.style.opacity = '1';
    b.card.classList.remove('resolved'); b.status.textContent = 'Open';
    b.button.innerHTML = 'Mark as fixed <span class="arrow" aria-hidden="true"></span>'; b.button.removeAttribute('aria-disabled');
    b.button.focus({ preventScroll: true });
    b.card.querySelectorAll('.footprint').forEach(dot => dot.remove());
    measure(b); place(b, -35, 4); b.bearing.style.transform = 'rotate(90deg)';
    if (!reduced.matches) { b.el.classList.add('walking'); await move(b, 25, 4, 1300); }
    else place(b, 25, 4);
    b.el.classList.remove('walking'); b.state = 'open'; b.cooldown = Date.now() + 2500;
    announce('A new bug moved in. Assigned to Nova.'); wander(b);
  });
  // At most one pointer calculation per 80ms; no animation render loop.
  let pointer = null, frame = 0, lastPointer = 0;
  function notice(time) {
    frame = 0;
    if (!pointer || document.hidden || time - lastPointer < 80) return;
    lastPointer = time;
    bugs.forEach(b => {
      if (b.state !== 'open' || Date.now() < b.cooldown) return;
      const rect = b.el.getBoundingClientRect();
      if (Math.hypot(pointer.x - rect.x - 14, pointer.y - rect.y - 17) < 100) {
        const card = b.card.getBoundingClientRect(); shy(b, pointer.x - card.x, pointer.y - card.y);
      }
    });
  }
  function pointerEvent(event) {
    if (reduced.matches || document.hidden) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(notice);
  }
  document.addEventListener('pointermove', pointerEvent, { passive: true });
  document.addEventListener('pointerdown', pointerEvent, { passive: true });
  const hiddenAnimations = new Set();
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('paused', document.hidden);
    if (document.hidden) {
      if (frame) cancelAnimationFrame(frame); frame = 0;
      document.getAnimations().forEach(a => { if (a.playState === 'running') { hiddenAnimations.add(a); a.pause(); } });
    } else {
      hiddenAnimations.forEach(a => { if (a.playState === 'paused') a.play(); }); hiddenAnimations.clear();
      bugs.forEach(b => b.animations.forEach(a => { if (a.playState === 'paused') a.play(); }));
    }
  });
  reduced.addEventListener('change', () => bugs.forEach(b => {
    if (b.state === 'open') { stop(b); if (!reduced.matches) wander(b); }
    else if (reduced.matches) b.animations.forEach(a => a.finish());
  }));
  // Observe the cards individually so their edge lanes follow responsive wrapping.
  const resize = new ResizeObserver(entries => entries.forEach(({ target }) => {
    const b = bugs.find(bug => bug.card === target);
    if (b.state !== 'open') return;
    stop(b); measure(b); place(b, Math.max(6, Math.min(b.x, b.width - 36)), 4); wander(b);
  }));
  bugs.forEach(b => {
    measure(b); place(b, Math.min(b.x, b.width - 36), 4);
    b.button.disabled = false; b.button.addEventListener('click', () => fix(b)); resize.observe(b.card);
  });
})();
