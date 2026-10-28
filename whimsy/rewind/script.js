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
  generation++;
  [...active].forEach(cancel);
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
  } catch { /* A new decision, preference change or replay cancels the idle clock. */ }
 }

 function ready() {
  if (card.dataset.state !== 'idle' || motion.matches) return;
  const current = getComputedStyle(pull).transform;
  cancel(tension);
  tension = animate(pull, [
   { transform:current },
   { transform:`translate(64px,88px) scaleX(${hover || document.activeElement === restore ? .975 : 1})` }
  ], { duration:240, easing:'cubic-bezier(.22,.61,.36,1)' });
 }

 function finish() {
  stop();
  reducedFrames();
  card.dataset.state = 'restored';
  status.textContent = 'Stopped. 17 branches restored to f58bb07. Nova is paused.';
  replay.removeAttribute('aria-hidden');
  replay.removeAttribute('tabindex');
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
  } catch { /* Switching to reduced motion safely completes the current rewind. */ }
 }

 function reset() {
  stop();
  [pull, ...threads, ...knots, stubs, shield, glow, check].forEach(element => element.removeAttribute('style'));
  card.dataset.state = 'idle';
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
