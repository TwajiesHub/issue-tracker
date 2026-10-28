(() => {
'use strict';
const card = document.querySelector('.decision');
const restore = document.querySelector('.restore');
const replay = document.querySelector('.replay');
const status = document.querySelector('.status');
const announcement = document.querySelector('#announcement');
const pull = document.querySelector('.pull');
const threads = [...document.querySelectorAll('.thread')];
const knots = [...document.querySelectorAll('.knot')];
const stubs = document.querySelector('.stubs');
const shield = document.querySelector('.shield');
const glow = document.querySelector('.shield-glow');
const check = document.querySelector('.shield-check');
const clock = document.querySelector('.clock');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const active = new Set();
const hiddenAnimations = new Set();
let generation = 0;
let hover = false;
let tension = null;
const graph = document.querySelector('.graph');
const label = document.querySelector('.knot-label');
const ends = knots.map(k => k.parentNode.transform.baseVal.getItem(0).matrix);
const lengths = threads.map(t => t.getTotalLength());
const breeze = new Map();
let tremble, timer, point, last = 0, selected = -1, rippled = false, rippleAfter = 0;
const labels = ['forged commit · api.js','build script changed','obfuscated api.js','unsigned commit','unexpected build hook','promise exceeded'];

function bend(i, y, scale) {
 const t = threads[i], from = getComputedStyle(t).transform;
 cancel(breeze.get(i));
 const a = animate(t, [{ transform:from }, { transform:`skewY(${Math.atan(y / (ends[i].e * scale))}rad)` }], { duration:260, easing:'ease-out' });
 breeze.set(i, a);
}
function clearGraph() {
 clearTimeout(timer);
 selected = -1;
 label.style.opacity = '0';
 if (card.dataset.state === 'idle' && !motion.matches && !document.hidden) threads.forEach((t, i) => bend(i, 0, 1));
}
function react() {
 timer = null;
 if (document.hidden) return;
 last = performance.now();
 const r = graph.getBoundingClientRect(), sx = r.width / 600, sy = r.height / 184, a = pull.getScreenCTM().a / sx;
 const x = 64 + ((point.x - r.x) / sx - 64) / a, y = (point.y - r.y) / sy;
 if (card.dataset.state === 'restored') {
  const inside = x > 64 && x < 124 && y > 45 && y < 131;
  if (inside && !rippled && last > rippleAfter && !motion.matches) {
   rippleAfter = last + 1200;
   [...stubs.children].forEach((s, i) => {
    const a = animate(s, [{ transform:'translateY(0)' }, { transform:`translateY(${-2 / sy}px)` }, { transform:'translateY(0)' }], { duration:420, delay:i * 24, easing:'ease-in-out' });
    a.finished.then(() => cancel(a), () => {});
   });
  }
  rippled = inside;
  return;
 }
 if (card.dataset.state !== 'idle') return;
 let near = -1, distance = point.touch ? 18 : 9;
 ends.forEach((p, i) => {
  const d = Math.hypot((x - 64 - p.e) * sx * a, (y - 88 - p.f) * sy);
  if (d < distance) { distance = d; near = i; }
 });
 selected = near;
 label.style.opacity = near < 0 ? '0' : '1';
 if (near >= 0) {
  label.textContent = labels[near % labels.length];
  label.style.transform = `translate(${Math.max(0, Math.min(r.width - label.offsetWidth, (64 + ends[near].e * a) * sx - label.offsetWidth - 10))}px,${Math.max(0, Math.min(r.height - 26, (88 + ends[near].f) * sy - 13))}px)`;
 }
 if (motion.matches) return;
 threads.forEach((t, i) => {
  const p = t.getPointAtLength(lengths[i] * Math.max(0, Math.min(1, (x - 64) / ends[i].e)));
  const d = (y - 88 - p.y) * sy;
  bend(i, i === selected ? -4 : Math.max(-6, Math.min(6, d * .6)) * Math.max(0, 1 - Math.abs(d) / 80), sy);
 });
}
function track(e) {
 point = { x:e.clientX, y:e.clientY, touch:e.pointerType === 'touch' };
 clearTimeout(timer);
 timer = setTimeout(react, Math.max(0, 80 - (performance.now() - last)));
}
graph.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') track(e); });
graph.addEventListener('pointerdown', track);
graph.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') { clearGraph(); rippled = false; } });
document.addEventListener('pointerdown', e => { if (!graph.contains(e.target)) clearGraph(); });

function animate(element, frames, options) {
 const animation = element.animate(frames, { fill:'both', ...options });
 active.add(animation);
 if (document.hidden) {
  animation.pause();
  animation.currentTime = 0;
  hiddenAnimations.add(animation);
 }
 return animation;
}

function cancel(animation) {
 if (!animation) return;
 active.delete(animation);
 hiddenAnimations.delete(animation);
 animation.cancel();
}

function stop() {
 clearTimeout(timer);
 label.style.opacity = '0';
 generation++;
 [...active].forEach(cancel);
 breeze.clear();
 tremble = null;
 tension = null;
}

async function idle(token) {
 try {
  while (token === generation && card.dataset.state === 'idle' && !motion.matches) {
   const wait = animate(clock, [{ opacity:0 }, { opacity:0 }], { duration:3400 + Math.random() * 900 });
   await wait.finished;
   cancel(wait);
   if (token !== generation || motion.matches) return;
   const knot = knots[Math.floor(Math.random() * knots.length)];
   const flicker = animate(knot, [{ opacity:.6 }, { opacity:.28 }, { opacity:.6 }], { duration:620, easing:'ease-in-out' });
   await flicker.finished;
   cancel(flicker);
  }
 } catch { /* Cancelled. */ }
}

function ready() {
 if (card.dataset.state !== 'idle' || motion.matches) return;
 const current = getComputedStyle(pull).transform;
 cancel(tension);
 tension = animate(pull, [
  { transform:current },
  { transform:`translate(64px,88px) scaleX(${hover || document.activeElement === restore ? .975 : 1})` }
 ], { duration:240, easing:'cubic-bezier(.22,.61,.36,1)' });
 const armed = hover || document.activeElement === restore;
 if (armed && !tremble) tremble = animate(document.querySelector('.knots'), [{ transform:'translateX(0)' }, { transform:'translateX(.6px)' }, { transform:'translateX(-.6px)' }, { transform:'translateX(0)' }], { duration:260, iterations:Infinity, easing:'ease-in-out' });
 if (!armed) { cancel(tremble); tremble = null; }
}

function finish() {
 stop();
 reducedFrames();
 card.dataset.state = 'restored';
 status.textContent = 'Stopped. 17 branches restored to f58bb07. Nova is paused.';
 replay.removeAttribute('aria-hidden');
 replay.removeAttribute('tabindex');
 document.querySelector('.card-state').textContent = 'Restored';
 const focused = document.activeElement === restore;
 restore.disabled = true;
 if (focused) replay.focus({ preventScroll:true });
 announcement.textContent = 'Stopped and restored. 17 branches are back at f58bb07. Nothing ran.';
}

function reducedFrames() {
 threads.forEach(thread => { thread.style.opacity = '0'; });
 knots.forEach(knot => { knot.style.opacity = '0'; });
 stubs.style.opacity = '.6';
 check.style.opacity = '1';
}

async function rewind() {
 if (card.dataset.state !== 'idle') return;
 stop();
 const token = generation;
 card.dataset.state = 'rewinding';
 restore.setAttribute('aria-disabled', 'true');
 pull.style.transform = 'translate(64px,88px)';
 try {
  if (motion.matches) {
   [...threads, ...knots].forEach(element => animate(element, [{ opacity:getComputedStyle(element).opacity }, { opacity:0 }], { duration:220 }));
   animate(stubs, [{ opacity:0 }, { opacity:1 }], { duration:220 });
   const fade = animate(clock, [{ opacity:0 }, { opacity:0 }], { duration:240 });
   await fade.finished;
  } else {
   knots.forEach((knot, i) => animate(knot, [
    { transform:'translateY(0)', opacity:.6 },
    { transform:'translateY(9px)', opacity:0 }
   ], { duration:300, delay:i * 7, easing:'cubic-bezier(.4,0,.6,1)' }));
   threads.forEach((thread, i) => animate(thread, [
    { transform:'scale(1)', opacity:.42, offset:0 },
    { transform:'scale(.105,.34)', opacity:.42, offset:.82 },
    { transform:'scale(.105,.34)', opacity:0, offset:1 }
   ], { duration:820, delay:180 + i * 25, easing:'cubic-bezier(.16,1,.3,1)' }));
   animate(stubs, [{ opacity:0 }, { opacity:.6 }], { duration:400, delay:1020 });
   animate(shield, [
    { transform:'scale(1)' }, { transform:'scale(1.06)' }, { transform:'scale(1)' }
   ], { duration:490, delay:1110, easing:'ease-in-out' });
   animate(glow, [{ opacity:0 }, { opacity:.22 }, { opacity:0 }], { duration:490, delay:1110, easing:'ease-in-out' });
   animate(check, [{ opacity:0 }, { opacity:1 }], { duration:300, delay:1240 });
   const end = animate(clock, [{ opacity:0 }, { opacity:0 }], { duration:1600 });
   await end.finished;
  }
  if (token === generation) finish();
 } catch { /* Preference changed. */ }
}

function reset() {
 stop();
 [pull, ...threads, ...knots, stubs, shield, glow, check].forEach(element => element.removeAttribute('style'));
 card.dataset.state = 'idle';
 document.querySelector('.card-state').textContent = 'Paused for you';
 restore.disabled = false;
 rippled = false;
 rippleAfter = 0;
 status.textContent = 'Paused · 17 branches · nothing has run';
 announcement.textContent = '';
 replay.setAttribute('aria-hidden', 'true');
 replay.setAttribute('tabindex', '-1');
 restore.removeAttribute('aria-disabled');
 restore.focus({ preventScroll:true });
 ready();
 idle(generation);
}

restore.addEventListener('click', rewind);
restore.addEventListener('pointerenter', () => { hover = true; ready(); });
restore.addEventListener('pointerleave', () => { hover = false; ready(); });
restore.addEventListener('focus', ready);
restore.addEventListener('blur', ready);
replay.addEventListener('click', reset);

document.addEventListener('visibilitychange', () => {
 if (document.hidden) {
  clearTimeout(timer);
  active.forEach(animation => {
   if (animation.playState !== 'running') return;
   const time = animation.currentTime;
   if (time >= animation.effect.getComputedTiming().endTime) {
    animation.finish();
    return;
   }
   animation.pause();
   animation.currentTime = time;
   hiddenAnimations.add(animation);
  });
 } else {
  hiddenAnimations.forEach(animation => {
   if (!active.has(animation) || animation.playState !== 'paused') return;
   if (animation.currentTime >= animation.effect.getComputedTiming().endTime) animation.finish();
   else animation.play();
  });
  hiddenAnimations.clear();
 }
});

motion.addEventListener('change', () => {
 const state = card.dataset.state;
 stop();
 pull.style.transform = 'translate(64px,88px)';
 if (state === 'rewinding' || state === 'restored') {
  reducedFrames();
  finish();
 } else {
  ready();
  idle(generation);
 }
});

restore.disabled = false;
idle(generation);
})();
