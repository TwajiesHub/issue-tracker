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
 const active = new Set(), paused = new Set();
 function pauseMotion(animation) {
  const time = animation.currentTime;
  animation.pause();
  if (time !== null) animation.currentTime = time;
 }
 document.documentElement.classList.add('js');
 // A single pausable clock for the story; no render loop or wall-clock timers.
 async function tween(node, frames, duration, delay = 0, easing = 'ease-in-out') {
  if (reduced.matches && frames.some(frame => 'transform' in frame)) duration = 0;
  const animation = node.animate(frames, { duration, delay, easing, fill:'forwards' });
  active.add(animation); if (document.hidden) pauseMotion(animation);
  const ok = await animation.finished.then(() => true, () => false);
  if (ok) Object.assign(node.style, frames[frames.length - 1]);
  animation.cancel(); active.delete(animation); return ok;
 }
 const rest = duration => tween($('.clock'), [{ opacity:0 }, { opacity:0 }], reduced.matches ? 0 : duration);
 function phase(name) { state = name; stage.dataset.phase = name; stage.classList.toggle('waiting', name === 'waiting'); attention(); }
 function attention() { stage.classList.toggle('noticed', state === 'waiting' && (focused || near)); }
 function position(value) { x = value; bug.style.transform = `translateX(${x}px)`; }
 function waitingX() { return scene.clientWidth < 500 ? 48 : 104; }
 async function turn(angle) {
  await tween(bearing, [{ transform:getComputedStyle(bearing).transform }, { transform:`rotate(${angle}deg)` }], 160);
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
  const endX = x + 30, endY = bug.offsetTop + 24;
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
   await walk(Math.max(waitingX(), scene.clientWidth - 224), 700);
   await handover(); phase('open'); await gate(true);
   await wave(45); await wave(0); phase('leaving');
   await walk(scene.clientWidth + 60, 2100, true);
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
  asking = true; stage.classList.add('asking');
  await tween($('.robot-head'), [0,-4,4,-4,0].map(value => ({ transform:`rotate(${value}deg)` })), 480);
  await rest(200); stage.classList.remove('asking'); asking = false;
 });
 // Pointer work is event-driven, at most once per 80ms. Animation uses no JS render loop.
 let pointer = null, frame = 0, last = -80;
 function notice(time) {
  frame = 0; if (!pointer || document.hidden || time - last < 80) return;
  last = time; const rect = approve.getBoundingClientRect();
  near = Math.hypot(Math.max(rect.left-pointer.x,0,pointer.x-rect.right),Math.max(rect.top-pointer.y,0,pointer.y-rect.bottom)) < 80;
  attention();
 }
 function pointerEvent(event) {
  if (document.hidden) return;
  pointer = { x:event.clientX, y:event.clientY }; if (!frame) frame = requestAnimationFrame(notice);
 }
 document.addEventListener('pointermove',pointerEvent,{ passive:true });
 document.addEventListener('pointerdown',pointerEvent,{ passive:true });
 document.addEventListener('pointerout',event => { if (!event.relatedTarget) { near = false; attention(); } });
 document.addEventListener('visibilitychange',() => {
  if (document.hidden) {
   if (frame) cancelAnimationFrame(frame); frame = 0;
   document.getAnimations().forEach(animation => { if (animation.playState === 'running') { paused.add(animation); pauseMotion(animation); } });
   document.documentElement.classList.add('paused');
  } else {
   document.documentElement.classList.remove('paused');
   paused.forEach(animation => { if (animation.playState === 'paused') animation.play(); }); paused.clear();
   active.forEach(animation => { if (animation.playState === 'paused') animation.play(); });
  }
 });
 reduced.addEventListener('change',() => { if (reduced.matches) active.forEach(animation => animation.finish()); });
 new ResizeObserver(() => { if (state === 'waiting') position(waitingX()); }).observe(scene);
 position(waitingX()); approve.disabled = false;
})();
