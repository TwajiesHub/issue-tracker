(() => {
 'use strict';
 const $ = selector => document.querySelector(selector);
 const stage = $('.stage'), scene = $('.scene'), meta = $('.issue-meta');
 const bug = $('.bug'), bearing = $('.bearing');
 const panel = $('.door-panel'), glow = $('.warm-light'), parcel = $('.held-bindle');
 const fly = $('.flying-bindle'), approve = $('.approve'), report = $('.report');
 const finalCopy = $('.final-copy'), live = $('#announcement'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
 const initial = [
  { id:'ZK-041', title:'The save button needs a second click', agent:'Nova' },
  { id:'ZK-042', title:'Wednesday shows up twice', agent:'Kite' },
  { id:'ZK-043', title:'The last checkbox won’t stay checked', agent:'Moss' }
 ];
 let issues = initial.slice(), index = 0, state = 'waiting', x = 0, focused = false, near = false, asking = false;
 let nextId = 44, approvedCount = 0;
 const active = new Set(), paused = new Set(), idleAnimations = new Set();
 let lifeVersion = 0, shyUntil = 0, robotDue = 0, doorHover = false;
 let hiddenAt = document.hidden ? performance.now() : null, hiddenTime = 0;
 const now = () => performance.now() - hiddenTime - (hiddenAt === null ? 0 : performance.now() - hiddenAt);
 function pauseMotion(animation) {
  const time = animation.currentTime;
  animation.pause();
  if (time !== null) animation.currentTime = time;
 }
 document.documentElement.classList.add('js');
 // A single pausable clock for the story; no render loop or wall-clock timers.
 async function tween(node, frames, duration, delay = 0, easing = 'ease-in-out', pool = null) {
  if (reduced.matches && frames.some(frame => 'transform' in frame)) duration = 0;
  const version = lifeVersion;
  const animation = node.animate(frames, { duration, delay, easing, fill:'forwards' });
  active.add(animation); if (pool) pool.add(animation); if (document.hidden) pauseMotion(animation);
  let ok = await animation.finished.then(() => true, () => false);
  if (pool && version !== lifeVersion) ok = false;
  if (ok) Object.assign(node.style, frames[frames.length - 1]);
  animation.cancel(); active.delete(animation); if (pool) pool.delete(animation); return ok;
 }
 const rest = duration => tween($('.clock'), [{ opacity:0 }, { opacity:0 }], reduced.matches ? 0 : duration);
 function phase(name) {
  if (state === 'waiting' && name !== 'waiting') stopLife();
  state = name; stage.dataset.phase = name; stage.classList.toggle('waiting', name === 'waiting');
  if (name !== 'waiting') { doorHover = false; stage.classList.remove('door-hover','tracking'); }
  if (name === 'waiting') startLife();
  attention();
 }
 function attention() {
  const show = state === 'waiting' && (focused || near);
  const changed = stage.classList.contains('noticed') !== show;
  if (changed && state === 'waiting' && !reduced.matches) pauseLife(show ? 450 : 330, 'ready');
  stage.classList.toggle('noticed', show);
 }
 function position(value) { x = value; bug.style.transform = `translateX(${x}px)`; }
 function waitingX() { return scene.clientWidth < 500 ? 48 : 104; }
 async function turn(angle) {
  await tween(bearing, [{ transform:getComputedStyle(bearing).transform }, { transform:`rotate(${angle}deg)` }], 160);
 }
 // All large waiting motions share this cancellable lane. A reaction takes
 // ownership before moving either character; story animations use a separate pool.
 const idleTween = (node, frames, duration) => tween(node, frames, duration, 0, 'ease-in-out', idleAnimations);
 const idleRest = duration => idleTween($('.clock'), [{ opacity:0 }, { opacity:0 }], duration);
 const validLife = version => version === lifeVersion && state === 'waiting' && !reduced.matches;
 function life(name) { stage.dataset.life = name; }
 function bounds() { return { min:6, max:Math.max(48,Math.min(scene.clientWidth * .6 - bug.offsetWidth,$('.robot').offsetLeft - bug.offsetWidth - 20)) }; }
 function stopLife() {
  const matrix = new DOMMatrixReadOnly(getComputedStyle(bug).transform);
  lifeVersion++; idleAnimations.forEach(animation => animation.cancel());
  position(matrix.m41); bug.classList.remove('walking','perked'); stage.classList.remove('bug-reacting');
  $('.robot-head').style.transform = 'rotate(0deg)'; $('.tap-foot').style.transform = 'rotate(0deg)';
  $('.eyes').style.transform = 'scaleY(1)'; life('rest');
 }
 function pauseLife(duration, label) {
  stopLife(); const version = lifeVersion; life(label);
  idleRest(duration).then(ok => { if (ok && validLife(version)) startLife(450); });
 }
 function startLife(delay = 650) {
  if (state !== 'waiting' || reduced.matches) return;
  stopLife(); const version = lifeVersion;
  if (!robotDue) robotDue = now() + 4000 + Math.random() * 2000;
  runLife(version, delay);
 }
 async function runLife(version, delay) {
  if (!await idleRest(delay) || !validLife(version)) return;
  while (validLife(version)) {
   if (doorHover) { if (!await idleRest(350)) return; continue; }
   if (!focused && !near && robotDue > now() && robotDue-now() < 2200) {
    if (!await idleRest(robotDue-now()) || !validLife(version)) return;
   }
   if (now() >= robotDue && !focused && !near) {
    const nextDue = now() + 4000 + Math.random() * 2000;
    const choice = Math.floor(Math.random() * 3);
    if (choice === 0) {
     life('robot-tap');
     if (!await idleTween($('.tap-foot'), [0,-12,0,-12,0,-12,0].map(a => ({ transform:`translateY(${a === 0 ? 0 : -2.5}px) rotate(${a}deg)` })), 1100)) return;
    } else if (choice === 1) {
     life('robot-tilt');
     if (!await idleTween($('.robot-head'), [0,8,8,0].map(a => ({ transform:`rotate(${a}deg)` })), 1000)) return;
    } else {
     life('robot-blink');
     if (!await idleTween($('.eyes'), [1,.1,1].map(scale => ({ transform:`scaleY(${scale})` })), 300)) return;
    }
    robotDue = nextDue;
    if (!await idleRest(350) || !validLife(version)) return;
   }
   const { min, max } = bounds();
   const direction = x > max - 24 ? -1 : x < min + 24 ? 1 : (Math.random() < .5 ? 1 : -1);
   const to = Math.max(min,Math.min(max,x + direction * (28 + Math.random() * 28)));
   life('wander');
   if (!await idleTween(bearing,[{ transform:getComputedStyle(bearing).transform },{ transform:`rotate(${direction * 90}deg)` }],220)) return;
   bug.classList.add('walking');
   if (!await idleTween(bug,[{ transform:`translateX(${x}px)` },{ transform:`translateX(${to}px)` }],1000 + Math.random() * 400)) return;
   position(to); bug.classList.remove('walking'); life('look');
   if (!focused && !near && robotDue-now() < 1500) continue;
   for (const angle of [direction * 78,direction * 102,direction * 90]) {
    if (!await idleTween(bearing,[{ transform:getComputedStyle(bearing).transform },{ transform:`rotate(${angle}deg)` }],240)) return;
    if (!await idleRest(180)) return;
   }
   const pause = 600 + Math.random() * 500;
   if (!await idleRest(!focused && !near ? Math.min(pause,Math.max(0,robotDue-now())) : pause) || !validLife(version)) return;
  }
 }
 async function shy(px,py) {
  if (state !== 'waiting' || reduced.matches || now() < shyUntil) return;
  shyUntil = now() + 2500; stopLife(); const version = lifeVersion;
  stage.classList.add('bug-reacting'); bug.classList.add('perked'); life('shy-look');
  const rect = bug.getBoundingClientRect(), dx = px - rect.left - rect.width / 2, dy = py - rect.top - rect.height / 2;
  if (!await idleTween(bearing,[{ transform:getComputedStyle(bearing).transform },{ transform:`rotate(${Math.atan2(dy,dx)*180/Math.PI+90}deg)` }],220)) return;
  if (!await idleRest(280) || !validLife(version)) return;
  const { min,max } = bounds(), distance = 40 + Math.random() * 20;
  let to = Math.max(min,Math.min(max,x + (dx >= 0 ? -distance : distance)));
  if (Math.abs(to-x) < 16) to = Math.max(min,Math.min(max,x + (dx >= 0 ? distance : -distance)));
  if (!await idleTween(bearing,[{ transform:getComputedStyle(bearing).transform },{ transform:`rotate(${to>x?90:-90}deg)` }],150)) return;
  life('shy-run'); bug.classList.add('walking');
  if (!await idleTween(bug,[{ transform:`translateX(${x}px)` },{ transform:`translateX(${to}px)` }],520)) return;
  position(to); bug.classList.remove('walking','perked'); stage.classList.remove('bug-reacting');
  if (validLife(version)) startLife(650);
 }
 function clearTracks() {
  scene.querySelectorAll('.footprint').forEach(dot => { dot.getAnimations().forEach(a => a.cancel()); dot.remove(); });
 }
 function tracks(to, duration) {
  if (reduced.matches) return;
  const distance = to - x;
  // Each pair has a distance-based delay, so spacing survives a slow phone or hidden tab.
  for (let d = 12; d < distance; d += 14) {
   const dot = document.createElement('i'); dot.className = 'footprint';
   dot.style.transform = `translateX(${x + d + 24}px)`;
   $('.illustration').append(dot);
   tween(dot, [{ opacity:.5 }, { opacity:0 }], 2000, d / distance * duration).then(() => dot.remove());
  }
 }
 async function walk(to, duration, footprints = false) {
  await turn(90); bug.classList.add('walking');
  if (footprints) tracks(to, duration);
  await tween(bug, [{ transform:`translateX(${x}px)` }, { transform:`translateX(${to}px)` }], duration, 0, 'linear');
  position(to); bug.classList.remove('walking');
 }
 async function gate(open) {
  stage.classList.toggle('holding', open);
  await Promise.all([
   tween(panel, [{ transform:getComputedStyle(panel).transform }, { transform:open ? 'scaleX(.08)' : 'scaleX(1)' }], 360),
   tween(glow, [{ opacity:getComputedStyle(glow).opacity }, { opacity:open ? .85 : 0 }], reduced.matches ? 0 : 360)
  ]);
 }
 async function handover() {
  phase('handover');
  const base = scene.getBoundingClientRect(), from = parcel.getBoundingClientRect();
  const startX = from.left - base.left, startY = from.top - base.top;
  const endX = x + bug.offsetWidth * .63, endY = bug.offsetTop + bug.offsetHeight * .41;
  fly.hidden = false; fly.style.opacity = '1'; parcel.style.opacity = '0';
  await tween(fly, [
   { transform:`translate(${startX}px,${startY}px)` },
   { transform:`translate(${(startX + endX) / 2}px,${Math.min(startY,endY) - 12}px)` },
   { transform:`translate(${endX}px,${endY}px)` }
  ], 720);
  fly.hidden = true; fly.style.opacity = '0'; bug.classList.add('packed');
 }
 async function wave(angle) {
  await turn(angle); bug.classList.add('waving'); await rest(460); bug.classList.remove('waving');
 }
 function updateQueue() {
  const remaining = issues.slice(index + 1);
  document.querySelectorAll('.queue-row').forEach((row, i) => {
   const issue = remaining[i]; row.style.visibility = issue ? 'visible' : 'hidden';
   row.setAttribute('aria-hidden', issue ? 'false' : 'true');
   if (issue) {
    row.querySelector('.queue-id').textContent = issue.id;
    row.querySelector('.queue-title').textContent = issue.title;
    row.querySelector('.queue-agent').textContent = issue.agent;
   }
  });
  $('.queue-clear').hidden = remaining.length !== 0;
 }
 function renderIssue() {
  const issue = issues[index];
  $('#issue-id').textContent = issue.id; $('#issue-title').textContent = issue.title;
  $('.status').textContent = `Fix ready · ${issue.agent}`;
  $('#agent-name').textContent = issue.agent; $('.avatar').textContent = issue.agent[0];
  $('.counter').textContent = `${index + 1} of ${issues.length}`;
  updateQueue();
 }
 function addDone(issue) {
  const list = $('.done-list');
  let line = list.children[approvedCount];
  if (!line) { line = document.createElement('li'); list.append(line); }
  line.textContent = `${issue.id} · Fixed by ${issue.agent} · approved by you`;
  line.removeAttribute('aria-hidden'); line.classList.add('complete');
  approvedCount++; $('.done-count').textContent = `${approvedCount} approved`; $('.done-clear').hidden = true;
 }
 async function arrive() {
  phase('next');
  await tween(meta, [{ opacity:1, transform:'translateY(0)' }, { opacity:0, transform:'translateY(-5px)' }], reduced.matches ? 0 : 140);
  $('.door-arm').style.removeProperty('transform');
  renderIssue(); approve.textContent = 'Approve fix'; stage.classList.remove('approved-issue', 'fix-approved'); parcel.style.opacity = '1';
  bug.classList.remove('packed'); bug.hidden = false; bug.style.opacity = '1'; position(-80);
  await Promise.all([
   tween(meta, [{ opacity:0, transform:'translateY(5px)' }, { opacity:1, transform:'translateY(0)' }], reduced.matches ? 0 : 220),
   walk(waitingX(), 900)
  ]);
  approve.removeAttribute('aria-disabled'); approve.removeAttribute('aria-label');
  phase('waiting'); live.textContent = `Next issue: ${issues[index].title}. ${issues[index].agent}’s fix is ready. Your approval opens the door.`;
 }
 approve.addEventListener('click', async () => {
  if (state !== 'waiting') return;
  const issue = issues[index], keepFocus = document.activeElement === approve;
  phase('approaching'); approve.textContent = 'Approving…'; approve.setAttribute('aria-disabled','true');
  live.textContent = `Approved. ${issue.agent} opened the door and the bug left.`;
  $('.status').textContent = `Fixed by ${issue.agent}`; stage.classList.add('fix-approved');
  if (reduced.matches) {
   parcel.style.opacity = '0'; bug.classList.add('packed'); phase('open');
   await gate(true); await tween(bug, [{ opacity:1 }, { opacity:0 }], 450);
  } else {
   await walk(Math.max(waitingX(), $('.robot').offsetLeft - bug.offsetWidth - 20), 700);
   await handover(); phase('open'); await gate(true);
   await wave(45); await wave(0); phase('leaving');
   await walk(scene.clientWidth + bug.offsetWidth, 2100, true);
  }
  bug.hidden = true; clearTracks(); phase('closed'); await gate(false);
  if (!reduced.matches) await tween($('.robot-head'), [{ transform:'rotate(0deg)' }, { transform:'rotate(8deg)' }, { transform:'rotate(0deg)' }], 400);
  await addDone(issue);
  index++;
  if (index < issues.length) { await arrive(); return; }
  phase('final'); stage.classList.add('approved-issue'); approve.disabled = true;
  finalCopy.hidden = false;
  if (keepFocus) report.focus({ preventScroll:true });
  live.textContent = 'No bugs live here anymore. Every fix was approved by you.';
  if (!reduced.matches) await tween($('.door-arm'), [{ transform:'rotate(0deg)' }, { transform:'rotate(-35deg)' }, { transform:'rotate(0deg)' }], 520);
 });
 report.addEventListener('click', async () => {
  if (state !== 'final') return;
  phase('next'); finalCopy.hidden = true; approve.disabled = false; approve.setAttribute('aria-disabled','true');
  issues = [{ id:`ZK-${String(nextId++).padStart(3,'0')}`, title:'The cursor keeps its loading coat on', agent:'Nova' }];
  index = 0; await arrive(); approve.focus({ preventScroll:true });
 });
 approve.addEventListener('focus', () => { focused = true; attention(); });
 approve.addEventListener('blur', () => { focused = false; attention(); });
 $('.door').addEventListener('click', async () => {
  if (state !== 'waiting' || asking) return;
  asking = true; stopLife(); const version = lifeVersion; life('asking'); stage.classList.add('asking');
  const ok = await idleTween($('.robot-head'), [0,-8,8,-8,0].map(value => ({ transform:`rotate(${value}deg)` })), 480);
  if (ok) await idleRest(200); stage.classList.remove('asking'); asking = false;
  if (validLife(version)) startLife(500);
 });
 // Pointer work is event-driven, at most once per 80ms. Animation uses no JS render loop.
 function hoverDoor(show) {
  doorHover = show && state === 'waiting';
  if (state === 'waiting' && !reduced.matches) pauseLife(380,'door-hover');
  stage.classList.toggle('door-hover',doorHover);
 }
 $('.door').addEventListener('pointerenter',event => { if (event.pointerType !== 'touch') hoverDoor(true); });
 $('.door').addEventListener('pointerleave',() => hoverDoor(false));
 let pointer = null, frame = 0, pointerTimer = 0, last = -80;
 function notice(time) {
  frame = 0; if (!pointer || document.hidden) return;
  const remaining = 80 - (time-last);
  if (remaining > 0) {
   pointerTimer = setTimeout(() => { pointerTimer = 0; if (!document.hidden && !frame) frame = requestAnimationFrame(notice); },remaining);
   return;
  }
  last = time; const rect = approve.getBoundingClientRect();
  near = Math.hypot(Math.max(rect.left-pointer.x,0,pointer.x-rect.right),Math.max(rect.top-pointer.y,0,pointer.y-rect.bottom)) < 80;
  attention();
  const area = stage.getBoundingClientRect();
  const over = state === 'waiting' && !reduced.matches && pointer.x >= area.left && pointer.x <= area.right && pointer.y >= area.top && pointer.y <= area.bottom;
  stage.classList.toggle('tracking',over);
  if (over) {
   const eyes = $('.eye-aim'), robot = $('.robot').getBoundingClientRect(), scale = robot.width / 44;
   const eyeX = Math.max(-3,Math.min(3,(pointer.x-(robot.left+robot.width*.52))/65))/scale;
   const eyeY = Math.max(-3,Math.min(3,(pointer.y-(robot.top+robot.height*.38))/65))/scale;
   eyes.style.setProperty('--eye-x',`${eyeX}px`); eyes.style.setProperty('--eye-y',`${eyeY}px`);
   const beetle = bug.getBoundingClientRect();
   if (Math.hypot(pointer.x-beetle.left-beetle.width/2,pointer.y-beetle.top-beetle.height/2) < 120) shy(pointer.x,pointer.y);
  }
 }
 function pointerEvent(event) {
  if (document.hidden) return;
  pointer = { x:event.clientX, y:event.clientY }; if (!frame && !pointerTimer) frame = requestAnimationFrame(notice);
 }
 document.addEventListener('pointermove',pointerEvent,{ passive:true });
 document.addEventListener('pointerdown',pointerEvent,{ passive:true });
 document.addEventListener('pointerout',event => { if (!event.relatedTarget) { pointer = null; clearTimeout(pointerTimer); pointerTimer = 0; if (frame) cancelAnimationFrame(frame); frame = 0; near = false; stage.classList.remove('tracking'); attention(); } });
 document.addEventListener('visibilitychange',() => {
  if (document.hidden) {
   hiddenAt = performance.now();
   clearTimeout(pointerTimer); pointerTimer = 0;
   if (frame) cancelAnimationFrame(frame); frame = 0;
   document.getAnimations().forEach(animation => { if (animation.playState === 'running') { paused.add(animation); pauseMotion(animation); } });
   document.documentElement.classList.add('paused');
  } else {
   if (hiddenAt !== null) { hiddenTime += performance.now()-hiddenAt; hiddenAt = null; }
   document.documentElement.classList.remove('paused');
   paused.forEach(animation => { if (animation.playState === 'paused') animation.play(); }); paused.clear();
   active.forEach(animation => { if (animation.playState === 'paused') animation.play(); });
  }
 });
 reduced.addEventListener('change',() => {
  if (reduced.matches) {
   stopLife(); stage.classList.remove('tracking');
   active.forEach(animation => { if (animation.playState === 'running' || animation.playState === 'paused') animation.finish(); });
  } else if (state === 'waiting') startLife();
 });
 new ResizeObserver(() => { if (state === 'waiting') { stopLife(); position(waitingX()); startLife(); } }).observe(scene);
 position(waitingX()); approve.disabled = false; startLife();
})();
