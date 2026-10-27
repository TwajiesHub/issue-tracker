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
    robot: card.querySelector('.robot'), panel: card.querySelector('.door-panel'),
    parcel: card.querySelector('.robot-bindle'), fly: card.querySelector('.handoff'),
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
  function measure(b) { b.width = b.card.clientWidth; b.height = b.card.clientHeight; b.size = b.el.offsetWidth; b.lane = b.height - b.el.offsetHeight - 5; }
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
    if (!await rest(b, 400 + b.index * 600)) return;
    // The second beetle has a sheltered perch; the others share the bottom lane.
    let right = b.index !== 2;
    while (b.state === 'open' && version === b.version && !reduced.matches) {
      measure(b);
      const perched = b.y < 30;
      const x = perched ? b.width - b.size - (right ? 5 : 20) : (right ? b.width - b.size - 100 : 8);
      const y = perched ? 6 : b.lane;
      if (!await turn(b, x > b.x ? 90 : -90)) return;
      b.el.classList.add('walking');
      if (!await move(b, x, y, Math.max(500, Math.abs(x - b.x) / 12 * 1000))) return;
      b.el.classList.remove('walking');
      if (!await rest(b, 1100 + b.index * 170)) return;
      right = !right;
    }
  }
  async function shy(b, px, py) {
    if (b.state !== 'open' || reduced.matches || Date.now() < b.cooldown) return;
    b.cooldown = Date.now() + 3500;
    stop(b);
    const version = b.version;
    const dx = px - b.x - b.size / 2, dy = py - b.y - b.el.offsetHeight / 2;
    b.el.classList.add('noticing');
    b.el.style.setProperty('--look', `${Math.max(-28, Math.min(28, dx / 3))}deg`);
    if (!await turn(b, Math.atan2(dy, dx) * 180 / Math.PI + 90, 160)) return;
    if (!await rest(b, 420)) return;
    b.el.classList.remove('noticing');
    measure(b);
    const perched = b.y < 30;
    const x = perched
      ? Math.max(b.width - b.size - 22, Math.min(b.width - b.size - 4, b.x + (dx > 0 ? -16 : 16)))
      : Math.max(6, Math.min(b.width - b.size - 100, b.x + (dx > 0 ? -44 : 44)));
    const y = perched ? 6 : b.lane;
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
    announce('All fixes approved. The bugs packed up and left. No bugs live here anymore.');
    // Keep keyboard users at a useful next action when the last button disappears.
    if (bugs.some(b => b.button === document.activeElement)) report.focus({ preventScroll: true });
  }
  function footprints(b, x, y, duration) {
    if (reduced.matches) return;
    const distance = Math.abs(x - b.x), direction = x > b.x ? 1 : -1;
    // Place pairs by distance, not frame rate. Delayed opacity animations share
    // the walk's clock, so a hidden tab freezes both the beetle and its tracks.
    for (let d = 12; d < distance; d += 14) {
      const dot = document.createElement('i');
      dot.className = 'footprint'; dot.setAttribute('aria-hidden', 'true');
      dot.style.opacity = '0';
      dot.style.transform = `translate(${b.x + direction * d + b.size / 2}px,${y + b.el.offsetHeight / 2 + 4}px) rotate(${direction > 0 ? 0 : 180}deg)`;
      b.card.append(dot);
      const a = dot.animate([{ opacity: .55 }, { opacity: 0 }], {
        duration: 2000, delay: d / distance * duration, fill: 'forwards'
      });
      b.animations.add(a); if (document.hidden) a.pause();
      a.finished.catch(() => {}).finally(() => { b.animations.delete(a); dot.remove(); });
    }
  }
  async function walk(b, x, y, duration, tracks = false) {
    if (!await turn(b, Math.atan2(y - b.y, x - b.x) * 180 / Math.PI + 90)) return false;
    b.el.classList.add('walking');
    if (tracks) footprints(b, x, y, duration);
    const ok = await move(b, x, y, duration);
    b.el.classList.remove('walking'); return ok;
  }
  function attention(b) {
    b.card.classList.toggle('agent-noticed', b.state === 'open' && (b.focused || b.near));
  }
  async function gate(b, open) {
    const transform = open ? 'scaleX(.12)' : 'scaleX(1)';
    b.card.classList.toggle('door-open', open);
    await animate(b, b.panel, [{ transform: getComputedStyle(b.panel).transform }, { transform }], 320);
    b.panel.style.transform = transform;
    b.panel.getAnimations().forEach(a => a.cancel());
  }
  async function handOver(b) {
    const card = b.card.getBoundingClientRect(), arm = b.parcel.getBoundingClientRect();
    const x = arm.left - card.left, y = arm.top - card.top;
    const endX = b.x + b.size * .65, endY = b.y + 19;
    b.card.classList.add('handing'); b.fly.hidden = false; b.fly.style.opacity = '1';
    b.parcel.style.opacity = '0';
    await animate(b, b.fly, [
      { transform: `translate(${x}px,${y}px)` },
      { transform: `translate(${(x + endX) / 2}px,${Math.min(y, endY) - 10}px)` },
      { transform: `translate(${endX}px,${endY}px)` }
    ], 650);
    b.fly.hidden = true; b.fly.style.opacity = '0';
    b.fly.getAnimations().forEach(a => a.cancel());
    b.card.classList.remove('handing'); b.el.classList.add('packed');
  }
  async function wave(b, angle) {
    await turn(b, angle); b.el.classList.add('waving');
    await rest(b, 460); b.el.classList.remove('waving');
  }
  async function fix(b) {
    if (b.state !== 'open') return;
    b.hadFocus = b.button === document.activeElement;
    stop(b); b.state = 'packing'; b.button.setAttribute('aria-disabled', 'true');
    b.status.textContent = `Fixed by ${b.card.dataset.agent}`;
    b.card.classList.add('approving', 'agent-busy'); attention(b);
    b.button.setAttribute('aria-label', 'Approved just now');
    const message = `Approved. ${b.card.dataset.agent} opened the door and the bug packed up and left.`;
    announce(message); measure(b);
    if (reduced.matches) {
      b.parcel.style.opacity = '0'; b.el.classList.add('packed');
      await gate(b, true);
      await animate(b, b.el, [{ opacity: 1 }, { opacity: 0 }], 450);
    } else {
      // The sheltered beetle descends the clear rail to meet the waiting agent.
      if (b.y < 30 && !await walk(b, b.width - b.size - 4, b.lane, 650)) return;
      if (!await walk(b, b.width - b.size - 96, b.lane, 600)) return;
      await handOver(b);
      b.card.classList.add('holding-door'); await gate(b, true);
      await wave(b, 45); await wave(b, 0);
      b.state = 'leaving';
      if (!await walk(b, b.width + b.size, b.lane, 1900 + b.index * 120, true)) return;
    }
    // Remove the exiting body before closing the panel across the lane.
    b.el.hidden = true;
    // A completed goodbye leaves a clean card, including delayed final steps.
    b.card.querySelectorAll('.footprint').forEach(dot => {
      dot.getAnimations().forEach(a => a.cancel());
      dot.remove();
    });
    await gate(b, false); b.card.classList.remove('holding-door');
    if (!reduced.matches) {
      const head = b.robot.querySelector('.robot-head');
      await animate(b, head, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(9deg)' }, { transform: 'rotate(0deg)' }], 420);
      head.getAnimations().forEach(a => a.cancel());
    }
    b.state = 'gone'; b.el.style.opacity = '0'; b.el.hidden = true;
    b.el.classList.remove('walking');
    b.card.classList.add('resolved');
    const wasFocused = b.hadFocus;
    b.button.disabled = true;
    if (wasFocused) {
      const next = bugs.find(bug => bug.state === 'open');
      if (next) next.button.focus({ preventScroll: true });
    }
    announce(message);
    showEmpty();
    if (wasFocused && bugs.every(bug => bug.state === 'gone')) report.focus({ preventScroll: true });
  }
  report.addEventListener('click', async () => {
    const b = bugs[0];
    if (b.state !== 'gone') return;
    main.classList.remove('all-left'); empty.inert = true; empty.setAttribute('aria-hidden', 'true');
    b.el.hidden = false; stop(b); b.state = 'entering'; b.el.classList.remove('packed'); b.el.style.opacity = '1';
    b.card.classList.remove('resolved', 'approving', 'agent-busy', 'holding-door', 'door-open');
    b.parcel.style.opacity = '1'; b.panel.style.transform = 'scaleX(1)'; b.status.textContent = 'Fix ready · Nova';
    b.button.textContent = 'Approve fix'; b.button.disabled = false; b.button.removeAttribute('aria-disabled'); b.button.removeAttribute('aria-label');
    b.button.focus({ preventScroll: true });
    b.card.querySelectorAll('.footprint').forEach(dot => dot.remove());
    measure(b); place(b, -b.size * 2, b.lane); b.bearing.style.transform = 'rotate(90deg)';
    if (!reduced.matches) { b.el.classList.add('walking'); await move(b, 65, b.lane, 1300); }
    else place(b, 65, b.lane);
    b.el.classList.remove('walking'); b.state = 'open'; b.cooldown = Date.now() + 2500;
    announce('A new bug moved in. Nova’s fix is ready for your approval.'); wander(b);
  });
  // At most one pointer calculation per 80ms; no animation render loop.
  let pointer = null, frame = 0, lastPointer = 0;
  function notice(time) {
    frame = 0;
    if (!pointer || document.hidden || time - lastPointer < 80) return;
    lastPointer = time;
    bugs.forEach(b => {
      if (b.state !== 'open') return;
      const button = b.button.getBoundingClientRect();
      const dx = Math.max(button.left - pointer.x, 0, pointer.x - button.right);
      const dy = Math.max(button.top - pointer.y, 0, pointer.y - button.bottom);
      b.near = Math.hypot(dx, dy) < 80; attention(b);
      if (Date.now() < b.cooldown) return;
      const rect = b.el.getBoundingClientRect();
      if (Math.hypot(pointer.x - rect.x - rect.width / 2, pointer.y - rect.y - rect.height / 2) < 100) {
        const card = b.card.getBoundingClientRect(); shy(b, pointer.x - card.x, pointer.y - card.y);
      }
    });
  }
  function pointerEvent(event) {
    if (document.hidden) return;
    pointer = { x: event.clientX, y: event.clientY };
    if (!frame) frame = requestAnimationFrame(notice);
  }
  document.addEventListener('pointermove', pointerEvent, { passive: true });
  document.addEventListener('pointerdown', pointerEvent, { passive: true });
  document.addEventListener('pointerout', event => {
    if (!event.relatedTarget) bugs.forEach(b => { b.near = false; attention(b); });
  });
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
    stop(b); measure(b); startPosition(b); wander(b);
  }));
  function startPosition(b) {
    b.el.style.left = '0'; b.el.style.right = 'auto'; b.el.style.top = '0';
    place(b, b.index === 1 ? b.width - b.size - 8 : b.width * (b.index === 0 ? .42 : .18), b.index === 1 ? 6 : b.lane);
  }
  bugs.forEach(b => {
    measure(b); startPosition(b);
    b.button.disabled = false; b.button.addEventListener('click', () => fix(b));
    b.button.addEventListener('focus', () => { b.focused = true; attention(b); });
    b.button.addEventListener('blur', () => { b.focused = false; attention(b); });
    b.card.querySelector('.door-zone').addEventListener('click', async () => {
      if (b.state !== 'open' || b.asking) return;
      b.asking = true; b.card.classList.add('agent-asking');
      const head = b.robot.querySelector('.robot-head');
      await animate(b, head, [0, -2, 2, -2, 0].map(x => ({ transform: `translateX(${x}px)` })), 440);
      head.getAnimations().forEach(a => a.cancel());
      b.card.classList.remove('agent-asking'); b.asking = false;
    });
    resize.observe(b.card);
  });
})();
