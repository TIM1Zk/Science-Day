/* =========================================================================
   AR PC BUILDER — GAME ENGINE
   ---------------------------------------------------------------------
   ส่วนประกอบหลักของโค้ด:
   1. GAME DATA      -> รายชื่อชิ้นส่วน, เกร็ดความรู้, ลำดับการติดตั้งที่บังคับ
   2. STATE          -> สถานะเกมทั้งหมด (คะแนน, เวลา, ชิ้นที่วางแล้ว ฯลฯ)
   3. DRAG CONTROLLER-> ตัวกลางที่รับอินพุตทั้งจาก "มือ (AR)" และ "เมาส์/ทัช"
                        แล้วแปลงเป็นแอ็กชัน pick() / move() / drop() เดียวกัน
                        ทำให้ Logic การประกอบไม่ต้องรู้เลยว่าอินพุตมาจากไหน
   4. HAND TRACKING  -> เริ่มกล้อง + MediaPipe Hands, ตรวจจับท่ากำมือ/แบมือ
                        พร้อมระบบ Hysteresis กันมือสั่น/กล้องจับภาพคลาดเคลื่อน
   5. UI / FEEDBACK  -> popup, particle, fact card, HUD
   ========================================================================= */

/* -------------------------------------------------------------------
   1) GAME DATA
   ------------------------------------------------------------------- */
const PARTS = [
  { id:'cpu',    name:'CPU',        icon:'🧠', slot:'slotCPU',
    fact:'CPU (หน่วยประมวลผลกลาง) คือสมองของคอมพิวเตอร์ ทำหน้าที่ประมวลผลคำสั่งทุกอย่างในเครื่อง',
    requires:null },
  { id:'cooler', name:'CPU Cooler', icon:'❄️', slot:'slotCOOLER',
    fact:'ฮีตซิงก์และพัดลมช่วยระบายความร้อนออกจาก CPU ป้องกันไม่ให้เครื่องร้อนจนหยุดทำงาน',
    requires:'cpu' },
  { id:'ram',    name:'RAM',        icon:'📶', slot:'slotRAM',
    fact:'RAM เก็บข้อมูลที่กำลังใช้งานชั่วคราว ยิ่งมีมากเครื่องก็ยิ่งทำงานหลายอย่างพร้อมกันได้ลื่นขึ้น',
    requires:null },
  { id:'gpu',    name:'GPU',        icon:'🖥️', slot:'slotGPU',
    fact:'GPU (การ์ดจอ) ประมวลผลภาพและกราฟิก สำคัญมากสำหรับการเล่นเกมและงานตัดต่อวิดีโอ',
    requires:null },
  { id:'ssd',    name:'SSD',        icon:'💾', slot:'slotSSD',
    fact:'SSD เก็บข้อมูลถาวรด้วยความเร็วสูงกว่าฮาร์ดดิสก์จานหมุนแบบเดิมหลายเท่าตัว',
    requires:null },
  { id:'psu',    name:'PSU',        icon:'🔌', slot:'slotPSU',
    fact:'PSU (เพาเวอร์ซัพพลาย) จ่ายกระแสไฟฟ้าให้ทุกชิ้นส่วนทำงานได้อย่างเสถียร',
    requires:null },
];
const TOTAL_TIME = 90;
const HINT_LIMIT = 3;
const SCORE_CORRECT = 100;
const SCORE_WRONG = -20;
const TIME_BONUS_PER_SEC = 5;

/* -------------------------------------------------------------------
   2) STATE
   ------------------------------------------------------------------- */
const state = {
  running:false,
  timeLeft:TOTAL_TIME,
  score:0,
  placed:new Set(),          // part ids already installed correctly
  hintsLeft:HINT_LIMIT,
  timerHandle:null,
  inputMode:null,            // 'camera' | 'mouse'
  cameraReady:false,
};

/* DOM shortcuts */
const $ = (id)=>document.getElementById(id);
const boardEl = $('board');
const trayLeftEl = $('trayLeft');
const trayRightEl = $('trayRight');
const cursorEl = $('cursor');
const toastLayer = $('toastLayer');
const factCard = $('factCard');

/* -------------------------------------------------------------------
   BUILD 2-SIDE TRAY UI (Left: 3 parts, Right: 3 parts)
   ------------------------------------------------------------------- */
function buildTray(){
  if(trayLeftEl) trayLeftEl.innerHTML = '';
  if(trayRightEl) trayRightEl.innerHTML = '';
  
  PARTS.forEach((p, i)=>{
    const el = document.createElement('div');
    el.className = 'part';
    el.id = 'tray-'+p.id;
    el.dataset.partId = p.id;
    el.dataset.order = i; // stable position index
    el.innerHTML = `<div class="icon">${p.icon}</div><div class="name">${p.name}</div>`;
    
    // First 3 parts on the Left Tray (CPU, Cooler, RAM), Next 3 on the Right Tray (GPU, SSD, PSU)
    if(i < 3){
      el.dataset.side = 'left';
      if(trayLeftEl) trayLeftEl.appendChild(el);
    } else {
      el.dataset.side = 'right';
      if(trayRightEl) trayRightEl.appendChild(el);
    }
  });
}

/* Re-insert a returned part at its original stable slot among its container */
function insertPartInOrder(el){
  const order = parseInt(el.dataset.order, 10);
  const targetTray = el.dataset.side === 'left' ? trayLeftEl : trayRightEl;
  if(!targetTray) return;
  
  const next = Array.from(targetTray.children)
    .find(sib => parseInt(sib.dataset.order, 10) > order);
  if(next) targetTray.insertBefore(el, next);
  else targetTray.appendChild(el);
}
buildTray();

/* draw simple animated circuit traces connecting slots (purely decorative,
   reinforces the "motherboard" signature element) */
function drawTraces(){
  const svg = $('traceSvg');
  const pairs = [[38,44,50,50],[50,50,66,50],[50,50,30,74],[30,74,60,74],[17,21,48,44],[18,46,48,50]];
  svg.innerHTML = pairs.map((p,i)=>
    `<path class="trace-line" id="trace${i}" d="M${p[0]},${p[1]} L${p[2]},${p[3]}"/>`
  ).join('');
}
drawTraces();

/* -------------------------------------------------------------------
   3) DRAG CONTROLLER
   A single state machine that both the mouse/touch layer and the hand-
   tracking layer feed into. Neither input source knows about game rules;
   they only call pickUp(), moveCursor(), and releaseDrop().
   ------------------------------------------------------------------- */
const Drag = {
  activeEl:null,     // the tray element currently being dragged
  activePartId:null,
  offsetX:0, offsetY:0,

  pickUp(partId, x, y){
    if(this.activeEl) return; // already holding something
    if(state.placed.has(partId)) return;
    const el = $('tray-'+partId);
    if(!el) return;
    this.activeEl = el;
    this.activePartId = partId;
    el.classList.add('dragging');
    document.body.appendChild(el); // bring to top of stacking context
    this.moveTo(x,y);
  },

  moveTo(x,y){
    if(!this.activeEl) {
      this.updateHoverHighlight(x,y);
      return;
    }
    this.activeEl.style.left = x+'px';
    this.activeEl.style.top = y+'px';
    this.activeEl.style.transform = 'translate(-50%,-50%) scale(1.08)';
    this.updateHoverHighlight(x,y);
  },

  updateHoverHighlight(x,y){
    document.querySelectorAll('.slot').forEach(s=>s.classList.remove('hover-target'));
    if(!this.activeEl) return;
    const target = this.slotUnder(x,y);
    if(target) target.classList.add('hover-target');
  },

  slotUnder(x,y){
    const slots = document.querySelectorAll('.slot');
    for(const s of slots){
      const r = s.getBoundingClientRect();
      if(x>=r.left && x<=r.right && y>=r.top && y<=r.bottom) return s;
    }
    return null;
  },

  release(x,y){
    if(!this.activeEl) return;
    const partId = this.activePartId;
    const el = this.activeEl;
    const target = this.slotUnder(x,y);
    document.querySelectorAll('.slot').forEach(s=>s.classList.remove('hover-target'));

    el.classList.remove('dragging');
    el.style.transform = '';

    if(target && target.dataset.part === partId){
      handleCorrectDrop(partId, target, el);
    } else if(target){
      handleWrongSlotDrop(partId, target, el, x, y);
    } else {
      // dropped on empty space -> snap back to tray
      returnPartToTray(el);
    }

    this.activeEl = null;
    this.activePartId = null;
  },

  cancel(){
    if(!this.activeEl) return;
    returnPartToTray(this.activeEl);
    this.activeEl = null;
    this.activePartId = null;
    document.querySelectorAll('.slot').forEach(s=>s.classList.remove('hover-target'));
  }
};

function returnPartToTray(el){
  el.classList.remove('dragging');
  el.style.position = '';
  el.style.left = '';
  el.style.top = '';
  el.style.transform = '';
  insertPartInOrder(el);
}

/* -------------------------------------------------------------------
   GAME RULES: correct / wrong drop handling
   ------------------------------------------------------------------- */
function handleCorrectDrop(partId, slotEl, trayEl_){
  const part = PARTS.find(p=>p.id===partId);

  // sequence rule: cooler requires cpu installed first
  if(part.requires && !state.placed.has(part.requires)){
    slotEl.classList.add('seq-error');
    setTimeout(()=>slotEl.classList.remove('seq-error'),500);
    showToast('ผิดลำดับ! ต้องติดตั้ง CPU ก่อน','bad');
    returnPartToTray(trayEl_);
    return;
  }

  // success
  state.placed.add(partId);
  state.score += SCORE_CORRECT;
  updateHUD();

  trayEl_.classList.add('placed');
  slotEl.classList.add('filled');
  slotEl.classList.remove('next-required');
  const badge = document.createElement('div');
  badge.className = 'placed-part';
  badge.textContent = part.icon;
  slotEl.appendChild(badge);

  spawnParticles(slotEl, 'good');
  showToast('+100 ติดตั้งสำเร็จ!','good');
  showFact(part);
  refreshNextRequired();

  if(state.placed.size === PARTS.length){
    endGame(true);
  }
}

function handleWrongSlotDrop(partId, slotEl, trayEl_, x, y){
  state.score = Math.max(0, state.score + SCORE_WRONG);
  updateHUD();
  slotEl.classList.add('seq-error');
  setTimeout(()=>slotEl.classList.remove('seq-error'),500);
  spawnParticles(slotEl,'bad');
  showToast('-20 ผิดช่อง!','bad');
  returnPartToTray(trayEl_);
}

function refreshNextRequired(){
  document.querySelectorAll('.slot').forEach(s=>s.classList.remove('next-required'));
  // highlight cpu until placed, then cooler; other independent parts always "available"
  if(!state.placed.has('cpu')) $('slotCPU').classList.add('next-required');
  else if(!state.placed.has('cooler')) $('slotCOOLER').classList.add('next-required');
}

/* -------------------------------------------------------------------
   HINT SYSTEM
   ------------------------------------------------------------------- */
$('hintBtn').addEventListener('click', useHint);
function useHint(){
  if(state.hintsLeft<=0 || !state.running) return;
  state.hintsLeft--;
  $('hintCount').textContent = state.hintsLeft;
  if(state.hintsLeft===0) $('hintBtn').disabled = true;

  const remaining = PARTS.filter(p=>!state.placed.has(p.id));
  if(remaining.length===0) return;
  // prefer showing the part that's next in sequence
  let target = remaining.find(p=>!p.requires || state.placed.has(p.requires)) || remaining[0];
  const slotEl = $(target.slot);
  const trayPart = $('tray-'+target.id);
  [slotEl, trayPart].forEach(el=>{
    if(!el) return;
    el.classList.add('hover-target');
    setTimeout(()=>el.classList.remove('hover-target'), 1400);
  });
  showToast(`คำใบ้: วาง ${target.name} ที่ช่อง ${target.name}`,'info');
}

/* -------------------------------------------------------------------
   4) FEEDBACK: toasts / particles / fact card
   ------------------------------------------------------------------- */
function showToast(msg, kind){
  const t = document.createElement('div');
  t.className = 'toast '+kind;
  t.textContent = msg;
  toastLayer.appendChild(t);
  setTimeout(()=>t.remove(), 1450);
}

function showFact(part){
  $('factHead').textContent = part.name;
  $('factBody').textContent = part.fact;
  factCard.classList.add('show');
  clearTimeout(factCard._t);
  factCard._t = setTimeout(()=>factCard.classList.remove('show'), 3200);
}

function spawnParticles(anchorEl, kind){
  const r = anchorEl.getBoundingClientRect();
  const cx = r.left + r.width/2, cy = r.top + r.height/2;
  const color = kind==='good' ? 'var(--green)' : 'var(--magenta)';
  for(let i=0;i<14;i++){
    const p = document.createElement('div');
    p.className = 'particle';
    const angle = (Math.PI*2*i)/14;
    const dist = 40 + Math.random()*40;
    p.style.setProperty('--dx', Math.cos(angle)*dist+'px');
    p.style.setProperty('--dy', Math.sin(angle)*dist+'px');
    p.style.left = cx+'px'; p.style.top = cy+'px';
    p.style.background = color;
    p.style.boxShadow = `0 0 8px ${color}`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(), 800);
  }
}

/* -------------------------------------------------------------------
   HUD
   ------------------------------------------------------------------- */
function updateHUD(){
  $('scoreValue').textContent = state.score;
  $('timeValue').textContent = Math.max(0,Math.ceil(state.timeLeft));
  $('timeChip').classList.toggle('low', state.timeLeft<=15);
}

/* -------------------------------------------------------------------
   GAME LIFECYCLE
   ------------------------------------------------------------------- */
function startGame(mode){
  state.inputMode = mode;
  state.running = true;
  state.timeLeft = TOTAL_TIME;
  state.score = 0;
  state.hintsLeft = HINT_LIMIT;
  state.placed = new Set();

  $('hintBtn').disabled = false;
  $('hintCount').textContent = HINT_LIMIT;

  document.querySelectorAll('.slot').forEach(s=>{
    s.classList.remove('filled','hover-target','next-required');
    const badge = s.querySelector('.placed-part');
    if(badge) badge.remove();
  });
  buildTray();
  refreshNextRequired();
  updateHUD();

  $('screenStart').classList.add('hidden');
  $('screenSuccess').classList.add('hidden');
  $('screenTimeup').classList.add('hidden');

  clearInterval(state.timerHandle);
  state.timerHandle = setInterval(tick, 1000);

  if(mode==='camera'){
    initCamera();
  } else {
    stopCamera();
    setModeTag(false, 'โหมดลาก-วาง (ไม่ใช้กล้อง)');
    $('bgFallback').classList.add('show');
    enableMouseInput();
  }
  updateModeToggleButton();
}

function tick(){
  if(!state.running) return;
  state.timeLeft -= 1;
  updateHUD();
  if(state.timeLeft<=0){
    endGame(false);
  }
}

function endGame(success){
  state.running = false;
  clearInterval(state.timerHandle);
  Drag.cancel();

  if(success){
    const bonus = Math.max(0, Math.round(state.timeLeft * TIME_BONUS_PER_SEC));
    const total = state.score + bonus;
    $('finalScore').textContent = state.score;
    $('finalBonus').textContent = bonus;
    $('finalTotal').textContent = total;
    $('screenSuccess').classList.remove('hidden');
  } else {
    $('timeupScore').textContent = state.score;
    $('timeupParts').textContent = `${state.placed.size}/${PARTS.length}`;
    $('screenTimeup').classList.remove('hidden');
  }
}

$('btnStartCam').addEventListener('click', ()=>startGame('camera'));
$('btnStartMouse').addEventListener('click', ()=>startGame('mouse'));
$('btnRestart1').addEventListener('click', ()=>{
  stopCamera();
  $('screenSuccess').classList.add('hidden');
  $('screenStart').classList.remove('hidden');
});
$('btnRestart2').addEventListener('click', ()=>{
  stopCamera();
  $('screenTimeup').classList.add('hidden');
  $('screenStart').classList.remove('hidden');
});

/* -------------------------------------------------------------------
   MOUSE / TOUCH FALLBACK INPUT
   Works simultaneously as a safety net even in camera mode is not
   necessary (camera mode has its own picking), so we only bind this
   when explicitly in 'mouse' mode OR camera failed to initialize.
   ------------------------------------------------------------------- */
let mouseInputBound = false;
function enableMouseInput(){
  if(mouseInputBound) return;
  mouseInputBound = true;

  if(trayLeftEl) trayLeftEl.addEventListener('pointerdown', onPointerDown);
  if(trayRightEl) trayRightEl.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
}

function onPointerDown(e){
  if(!state.running || state.inputMode==='camera') return;
  const partEl = e.target.closest('.part');
  if(!partEl) return;
  const partId = partEl.dataset.partId;
  if(state.placed.has(partId)) return;
  partEl.style.position = 'fixed';
  Drag.pickUp(partId, e.clientX, e.clientY);
}
function onPointerMove(e){
  if(!state.running || state.inputMode==='camera') return;
  Drag.moveTo(e.clientX, e.clientY);
}
function onPointerUp(e){
  if(!state.running || state.inputMode==='camera') return;
  Drag.release(e.clientX, e.clientY);
}

/* -------------------------------------------------------------------
   5) HAND TRACKING (MediaPipe Hands)
   ------------------------------------------------------------------- */
const videoEl = $('video');
const handCanvas = $('handCanvas');
const hctx = handCanvas.getContext('2d');

function setModeTag(camOn, text){
  const tag = $('modeTag');
  tag.classList.toggle('cam-off', !camOn);
  $('modeTagText').textContent = text;
}

function resizeCanvas(){
  handCanvas.width = window.innerWidth;
  handCanvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

/* --- gesture detection with hysteresis ---------------------------------
   We measure, for fingers index/middle/ring/pinky, the ratio between
   (tip -> wrist distance) and (pip -> wrist distance). A curled finger's
   tip sits closer to the wrist than its pip joint, so the ratio drops
   below 1. We count curled fingers, then require the count to stay
   above/below thresholds for several consecutive frames (hysteresis)
   before flipping the grabbing state — this absorbs small tracking
   jitter and prevents parts from "dropping" mid-air by accident. */
const GESTURE = {
  isGrabbing:false,
  closeStreak:0,
  openStreak:0,
  CLOSE_FRAMES_NEEDED:4,
  OPEN_FRAMES_NEEDED:4,
};

function dist(a,b){
  return Math.hypot(a.x-b.x, a.y-b.y);
}

function countCurledFingers(lm){
  const wrist = lm[0];
  const fingers = [
    {tip:8,  pip:6},  // index
    {tip:12, pip:10}, // middle
    {tip:16, pip:14}, // ring
    {tip:20, pip:18}, // pinky
  ];
  let curled = 0;
  fingers.forEach(f=>{
    const tipDist = dist(lm[f.tip], wrist);
    const pipDist = dist(lm[f.pip], wrist);
    if(tipDist < pipDist * 0.92) curled++; // margin avoids borderline flicker
  });
  return curled;
}

function updateGestureState(curledCount){
  if(curledCount>=3){
    GESTURE.closeStreak++;
    GESTURE.openStreak = 0;
  } else if(curledCount<=1){
    GESTURE.openStreak++;
    GESTURE.closeStreak = 0;
  } else {
    // ambiguous frame: don't reset streaks aggressively, just pause them
    GESTURE.closeStreak = Math.max(0, GESTURE.closeStreak-1);
    GESTURE.openStreak = Math.max(0, GESTURE.openStreak-1);
  }

  if(!GESTURE.isGrabbing && GESTURE.closeStreak>=GESTURE.CLOSE_FRAMES_NEEDED){
    GESTURE.isGrabbing = true;
    return 'grab';
  }
  if(GESTURE.isGrabbing && GESTURE.openStreak>=GESTURE.OPEN_FRAMES_NEEDED){
    GESTURE.isGrabbing = false;
    return 'release';
  }
  return null;
}

function onHandResults(results){
  hctx.clearRect(0,0,handCanvas.width, handCanvas.height);

  if(!results.multiHandLandmarks || results.multiHandLandmarks.length===0){
    cursorEl.style.display = 'none';
    return;
  }

  const lm = results.multiHandLandmarks[0];
  // landmark 9 = middle finger MCP (base of middle finger) -> stable cursor point
  const base = lm[9];

  // mirror x because the video is CSS-mirrored (scaleX(-1))
  const screenX = (1 - base.x) * window.innerWidth;
  const screenY = base.y * window.innerHeight;

  cursorEl.style.display = 'block';
  cursorEl.style.left = screenX+'px';
  cursorEl.style.top = screenY+'px';

  // draw a light skeleton for AR feedback
  drawHandSkeleton(lm);

  if(!state.running || state.inputMode!=='camera'){
    Drag.updateHoverHighlight(screenX, screenY);
    return;
  }

  const curled = countCurledFingers(lm);
  const action = updateGestureState(curled);
  cursorEl.classList.toggle('grabbing', GESTURE.isGrabbing);

  if(action==='grab'){
    const target = Drag.slotUnder(screenX, screenY) ? null : trayPartUnder(screenX, screenY);
    if(target) Drag.pickUp(target.dataset.partId, screenX, screenY);
  } else if(Drag.activeEl){
    Drag.moveTo(screenX, screenY);
  } else {
    Drag.updateHoverHighlight(screenX, screenY);
  }

  if(action==='release' && Drag.activeEl){
    Drag.release(screenX, screenY);
  }
}

function trayPartUnder(x,y){
  const els = document.elementsFromPoint(x,y);
  return els.find(e=>e.classList && e.classList.contains('part')) || null;
}

function drawHandSkeleton(lm){
  const W = handCanvas.width, H = handCanvas.height;
  const mirroredPts = lm.map(p=>({x:(1-p.x)*W, y:p.y*H}));
  const connections = [
    [0,1],[1,2],[2,3],[3,4],
    [0,5],[5,6],[6,7],[7,8],
    [0,9],[9,10],[10,11],[11,12],
    [0,13],[13,14],[14,15],[15,16],
    [0,17],[17,18],[18,19],[19,20],
    [5,9],[9,13],[13,17]
  ];
  hctx.strokeStyle = 'rgba(52,234,255,0.55)';
  hctx.lineWidth = 2;
  connections.forEach(([a,b])=>{
    hctx.beginPath();
    hctx.moveTo(mirroredPts[a].x, mirroredPts[a].y);
    hctx.lineTo(mirroredPts[b].x, mirroredPts[b].y);
    hctx.stroke();
  });
  mirroredPts.forEach((p,i)=>{
    hctx.beginPath();
    hctx.arc(p.x,p.y, i===9?5:3, 0, Math.PI*2);
    hctx.fillStyle = i===9 ? 'rgba(255,61,154,0.9)' : 'rgba(52,234,255,0.85)';
    hctx.fill();
  });
}

/* --- camera bootstrap with graceful error handling --------------------- */
let handsInstance = null;
let cameraInstance = null;
let isProcessingHandFrame = false;

async function stopCamera(){
  if(cameraInstance){
    try{ await cameraInstance.stop(); }catch(e){}
    cameraInstance = null;
  }
  if(videoEl && videoEl.srcObject){
    try{
      videoEl.srcObject.getTracks().forEach(track => track.stop());
    }catch(e){}
    videoEl.srcObject = null;
  }
  hctx.clearRect(0, 0, handCanvas.width, handCanvas.height);
  cursorEl.style.display = 'none';
  state.cameraReady = false;
}

async function initCamera(){
  setModeTag(false, 'กำลังเปิดกล้อง…');
  try{
    if(typeof Hands === 'undefined' || typeof Camera === 'undefined'){
      throw new Error('MediaPipe library failed to load');
    }

    if(!handsInstance){
      handsInstance = new Hands({
        locateFile:(file)=>`https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
      });
      handsInstance.setOptions({
        maxNumHands:1,
        modelComplexity:0, // ใช้ modelComplexity 0 เพื่อให้ประมวลผลเร็ว ไม่แล็กและไม่ค้าง
        minDetectionConfidence:0.6,
        minTrackingConfidence:0.55,
      });
      handsInstance.onResults(onHandResults);
    }

    // Stop existing camera instance if any
    if(cameraInstance){
      try{ await cameraInstance.stop(); }catch(e){}
      cameraInstance = null;
    }

    cameraInstance = new Camera(videoEl, {
      onFrame: async ()=>{
        if(state.inputMode !== 'camera' || !state.running) return;
        if(isProcessingHandFrame) return; // Drop frame if previous is still processing to prevent freezing
        isProcessingHandFrame = true;
        try{
          await handsInstance.send({image:videoEl});
        }catch(err){
          console.warn('Frame processing error:', err);
        }finally{
          isProcessingHandFrame = false;
        }
      },
      width:640, height:480, // 640x480 ประมวลผลลื่นไหลมาก ลดภาระ CPU/GPU ป้องกันเครื่องค้าง
    });
    await cameraInstance.start();

    state.cameraReady = true;
    $('bgFallback').classList.remove('show');
    setModeTag(true, 'โหมด AR: กำมือ = หยิบ · แบมือ = วาง');
  }catch(err){
    console.warn('Camera unavailable, falling back to mouse/touch:', err);
    handleCameraFailure();
  }
}

function handleCameraFailure(){
  state.cameraReady = false;
  state.inputMode = 'mouse';
  $('bgFallback').classList.add('show');
  setModeTag(false, 'ไม่พบกล้อง — ใช้โหมดลาก-วางแทน');
  showToast('ไม่สามารถเข้าถึงกล้องได้ สลับเป็นโหมดลาก-วาง','info');
  enableMouseInput();
  updateModeToggleButton();
}

function updateModeToggleButton(){
  const btn = $('modeToggleBtn');
  if(!btn) return;
  if(state.inputMode === 'mouse'){
    btn.classList.add('mouse-mode');
    btn.innerText = '🖱️ โหมด: เมาส์ / สัมผัส';
  } else {
    btn.classList.remove('mouse-mode');
    btn.innerText = '🖐️ โหมด: กล้อง AR';
  }
}

// Mode toggle button handler
$('modeToggleBtn')?.addEventListener('click', async ()=>{
  if(!state.running) return;
  if(state.inputMode === 'camera'){
    // Switch to mouse mode
    state.inputMode = 'mouse';
    await stopCamera();
    $('bgFallback').classList.add('show');
    setModeTag(false, 'โหมดลาก-วาง (ปิดกล้อง)');
    enableMouseInput();
    updateModeToggleButton();
    showToast('สลับเป็นโหมดเมาส์ / สัมผัสแล้ว', 'info');
  } else {
    // Switch to camera mode
    state.inputMode = 'camera';
    updateModeToggleButton();
    $('bgFallback').classList.remove('show');
    initCamera();
    showToast('กำลังเปิดกล้อง AR...', 'info');
  }
});

/* If the start screen's camera permission is denied even before pressing
   start (e.g. previously blocked), we still let the ghost button work. */
navigator.mediaDevices?.getUserMedia
  ? null
  : ($('permNote').textContent = 'เบราว์เซอร์นี้ไม่รองรับกล้อง กรุณาใช้โหมดลาก-วาง');

/* initial HUD paint */
updateHUD();
