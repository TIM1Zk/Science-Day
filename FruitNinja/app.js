// =========================================================
// CYBER FRUIT NINJA — IT MAEJO OPEN HOUSE 2570
// MediaPipe Hand Blade Slicing & Mouse Real-Time Physics
// =========================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const modeToggleBtn = document.getElementById('modeToggleBtn');

const scoreVal = document.getElementById('scoreVal');
const timerVal = document.getElementById('timerVal');
const comboVal = document.getElementById('comboVal');
const livesHearts = document.getElementById('livesHearts');

const startScreen = document.getElementById('startScreen');
const btnStartGame = document.getElementById('btnStartGame');

const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const finalSliced = document.getElementById('finalSliced');
const finalMaxCombo = document.getElementById('finalMaxCombo');
const btnRestartGame = document.getElementById('btnRestartGame');

// Canvas dimensions
let CANVAS_WIDTH = window.innerWidth;
let CANVAS_HEIGHT = window.innerHeight;

function resizeCanvas() {
  CANVAS_WIDTH = window.innerWidth;
  CANVAS_HEIGHT = window.innerHeight;
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// =========================================================
// AUDIO SYNTHESIZER (Cyber Sword Slice & Splat FX)
// =========================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

let lastSliceSoundTime = 0;

function playSliceSound() {
  if (!audioCtx) return;
  const now = performance.now();
  if (now - lastSliceSoundTime < 60) return; // Throttle to prevent Web Audio thread choking
  lastSliceSoundTime = now;

  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, audioCtx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.12);
  } catch(e) {}
}

function playBombSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(160, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.4);
  } catch(e) {}
}

// =========================================================
// GAME CONFIGURATIONS & STATE
// =========================================================
const TOTAL_GAME_TIME = 45; // seconds
let isPlaying = false;
let score = 0;
let timeLeft = TOTAL_GAME_TIME;
let lives = 3;
let currentCombo = 0;
let maxCombo = 0;
let totalSliced = 0;
let gameTimerInterval = null;

let isMouseMode = false;
let cameraInstance = null;
let handsInstance = null;
let handDetected = false;

// Blade Trails (Hand & Mouse)
let bladeTrail = []; // Array of points {x, y, age}
const MAX_TRAIL_LENGTH = 12;

// Fruits / Items & Particles
let activeItems = [];
let particles = [];
let sliceEffects = [];

const FRUIT_TYPES = [
  { name: 'Watermelon', icon: '🍉', color: '#00ff88', points: 100, radius: 44, juiceColor: 'rgba(255, 30, 80, 0.9)' },
  { name: 'Strawberry', icon: '🍓', color: '#ff0055', points: 150, radius: 36, juiceColor: 'rgba(255, 0, 85, 0.9)' },
  { name: 'Orange', icon: '🍊', color: '#ffb703', points: 120, radius: 38, juiceColor: 'rgba(255, 183, 3, 0.9)' },
  { name: 'Pineapple', icon: '🍍', color: '#ffd60a', points: 200, radius: 46, juiceColor: 'rgba(255, 214, 10, 0.9)' },
  { name: 'GreenApple', icon: '🍏', color: '#55ff55', points: 140, radius: 38, juiceColor: 'rgba(100, 255, 100, 0.9)' },
  { name: 'Banana', icon: '🍌', color: '#ffe600', points: 130, radius: 40, juiceColor: 'rgba(255, 230, 0, 0.9)' },
  { name: 'CyberBomb', icon: '💣', color: '#ff0033', isBomb: true, points: -200, radius: 40, juiceColor: 'rgba(255, 0, 0, 1)' }
];

// =========================================================
// ITEM & PARTICLE CLASSES
// =========================================================
class FlyingFruit {
  constructor() {
    // Pick fruit or bomb (15% chance bomb)
    const isBomb = Math.random() < 0.16;
    if (isBomb) {
      this.def = FRUIT_TYPES.find(f => f.isBomb);
    } else {
      const normalFruits = FRUIT_TYPES.filter(f => !f.isBomb);
      this.def = normalFruits[Math.floor(Math.random() * normalFruits.length)];
    }

    this.radius = this.def.radius;
    // Launch from bottom
    this.x = CANVAS_WIDTH * 0.15 + Math.random() * (CANVAS_WIDTH * 0.7);
    this.y = CANVAS_HEIGHT + this.radius;

    // Physics (Adjusted to be slower & easier to slice)
    const targetApexX = CANVAS_WIDTH * 0.25 + Math.random() * (CANVAS_WIDTH * 0.5);
    this.vx = (targetApexX - this.x) * (0.010 + Math.random() * 0.008);
    this.vy = -(10.5 + Math.random() * 3.5); // Slower upward launch (from -14~-20 to -10.5~-14)
    this.gravity = 0.19; // Lower gravity for floatier, slower flight (from 0.32 to 0.19)
    this.rotation = Math.random() * Math.PI * 2;
    this.vRot = (Math.random() - 0.5) * 0.04;

    this.isSliced = false;
    this.splitParts = [];
  }

  update() {
    if (!this.isSliced) {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.rotation += this.vRot;
    } else {
      // Sliced parts falling apart
      this.splitParts.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += this.gravity;
        p.rotation += p.vRot;
        p.alpha -= 0.015;
      });
    }
  }

  slice(sliceAngle) {
    if (this.isSliced) return;
    this.isSliced = true;

    // Create 2 half fruit splinters
    const spreadVx = Math.cos(sliceAngle + Math.PI / 2) * 4;
    const spreadVy = Math.sin(sliceAngle + Math.PI / 2) * 4;

    this.splitParts = [
      { x: this.x, y: this.y, vx: this.vx - spreadVx, vy: this.vy - spreadVy - 2, rotation: this.rotation, vRot: -0.1, alpha: 1 },
      { x: this.x, y: this.y, vx: this.vx + spreadVx, vy: this.vy + spreadVy - 2, rotation: this.rotation, vRot: 0.1, alpha: 1 }
    ];

    // Spawn lightweight splash juice particles (capped to 10 for low-spec performance)
    const splashCount = particles.length > 25 ? 4 : 10;
    for (let i = 0; i < splashCount; i++) {
      particles.push(new SplashParticle(this.x, this.y, this.def.juiceColor));
    }
  }

  draw() {
    ctx.save();
    if (!this.isSliced) {
      ctx.translate(this.x, this.y);
      ctx.rotate(this.rotation);

      ctx.font = `${this.radius * 1.8}px Kanit, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.def.icon, 0, 0);
    } else {
      // Draw 2 half splinters
      this.splitParts.forEach(p => {
        if (p.alpha <= 0) return;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.font = `${this.radius * 1.6}px Kanit, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.def.icon, 0, 0);
        ctx.restore();
      });
    }
    ctx.restore();
  }
}

class SplashParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2.5 + Math.random() * 6;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = 0.28;
    this.size = 4 + Math.random() * 4;
    this.alpha = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vy += this.gravity;
    this.alpha -= 0.038;
  }

  draw() {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// =========================================================
// SLICING COLLISION DETECTION (Line segment vs Circle)
// =========================================================
function distToSegmentSquared(px, py, x1, y1, x2, y2) {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * (x2 - x1);
  const projY = y1 + t * (y2 - y1);
  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

function checkBladeSlices() {
  if (bladeTrail.length < 2) return;

  const p2 = bladeTrail[bladeTrail.length - 1];
  const p1 = bladeTrail[bladeTrail.length - 2];

  let slicedInThisFrame = 0;

  activeItems.forEach(item => {
    if (item.isSliced) return;

    const distSq = distToSegmentSquared(item.x, item.y, p1.x, p1.y, p2.x, p2.y);
    if (distSq <= (item.radius + 15) * (item.radius + 15)) {
      // Calculate slice angle
      const sliceAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      item.slice(sliceAngle);

      if (item.def.isBomb) {
        // Bomb Hit!
        playBombSound();
        lives--;
        score = Math.max(0, score - 200);
        updateHUD();
        if (lives <= 0) {
          endGame();
        }
      } else {
        // Fruit Sliced!
        playSliceSound();
        slicedInThisFrame++;
        totalSliced++;
        score += item.def.points;
      }
    }
  });

  if (slicedInThisFrame > 0) {
    if (slicedInThisFrame >= 2) {
      currentCombo += slicedInThisFrame;
      if (currentCombo > maxCombo) maxCombo = currentCombo;
      score += slicedInThisFrame * 50; // Combo bonus
    }
    updateHUD();
  }
}

// =========================================================
// SPAWNING SYSTEM (Relaxed & Floatier Pacing)
// =========================================================
let spawnInterval = 1450; // ปรับให้ผลไม้เกิดเว้นช่วงพอเหมาะ ไม่เร็วหรือถี่เกินไป
let lastSpawnTime = 0;

function updateSpawner(now) {
  if (now - lastSpawnTime > spawnInterval) {
    lastSpawnTime = now;
    // Launch 1 to 2 fruits
    const count = 1 + Math.floor(Math.random() * (timeLeft < 15 ? 2 : 1.6));
    for (let i = 0; i < count; i++) {
      activeItems.push(new FlyingFruit());
    }
  }
}

// =========================================================
// HUD & GAME LIFECYCLE
// =========================================================
function updateHUD() {
  scoreVal.innerText = score;
  timerVal.innerText = Math.max(0, Math.ceil(timeLeft));
  comboVal.innerText = `x${currentCombo}`;

  let heartsStr = '';
  for (let i = 0; i < lives; i++) heartsStr += '❤️';
  for (let i = lives; i < 3; i++) heartsStr += '🖤';
  livesHearts.innerText = heartsStr;
}

function startGame() {
  initAudio();
  isPlaying = true;
  score = 0;
  timeLeft = TOTAL_GAME_TIME;
  lives = 3;
  currentCombo = 0;
  maxCombo = 0;
  totalSliced = 0;
  activeItems = [];
  particles = [];
  bladeTrail = [];

  updateHUD();

  startScreen.classList.add('hidden');
  gameOverScreen.classList.add('hidden');

  if (gameTimerInterval) clearInterval(gameTimerInterval);
  gameTimerInterval = setInterval(() => {
    if (!isPlaying) return;
    timeLeft--;
    updateHUD();
    if (timeLeft <= 0) {
      endGame();
    }
  }, 1000);
}

function endGame() {
  isPlaying = false;
  clearInterval(gameTimerInterval);

  finalScore.innerText = score;
  finalSliced.innerText = totalSliced;
  finalMaxCombo.innerText = `x${maxCombo}`;

  if (score > 1000) {
    confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
  }

  gameOverScreen.classList.remove('hidden');
}

btnStartGame.addEventListener('click', startGame);
btnRestartGame.addEventListener('click', startGame);

// =========================================================
// DRAW BLADE TRAIL (Cyber Glowing Neon Saber)
// =========================================================
function drawBladeTrail() {
  if (bladeTrail.length < 2) return;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < bladeTrail.length; i++) {
    const p1 = bladeTrail[i - 1];
    const p2 = bladeTrail[i];
    const progress = i / bladeTrail.length;

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);

    ctx.lineWidth = progress * 14;
    ctx.strokeStyle = `rgba(0, 240, 255, ${progress * 0.85})`;
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 6;
    ctx.stroke();

    // Inner bright core
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineWidth = progress * 5;
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 0;
    ctx.stroke();
  }

  ctx.restore();
}

// =========================================================
// MOUSE & TOUCH CONTROLS
// =========================================================
let isPointerActive = false;

function addBladePoint(x, y) {
  bladeTrail.push({ x, y });
  if (bladeTrail.length > MAX_TRAIL_LENGTH) {
    bladeTrail.shift();
  }
}

canvas.addEventListener('mousedown', (e) => {
  isPointerActive = true;
  bladeTrail = [];
  addBladePoint(e.clientX, e.clientY);
});

window.addEventListener('mousemove', (e) => {
  if (isMouseMode || isPointerActive) {
    addBladePoint(e.clientX, e.clientY);
    if (isPlaying) checkBladeSlices();
  }
});

window.addEventListener('mouseup', () => {
  isPointerActive = false;
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  isPointerActive = true;
  bladeTrail = [];
  const touch = e.touches[0];
  addBladePoint(touch.clientX, touch.clientY);
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    addBladePoint(touch.clientX, touch.clientY);
    if (isPlaying) checkBladeSlices();
  }
}, { passive: false });

window.addEventListener('touchend', () => {
  isPointerActive = false;
});

// =========================================================
// MEDIAPIPE HANDS TRACKING (Blade on Index Fingertip)
// =========================================================
let isProcessingHandFrame = false;

function onHandResults(results) {
  if (isMouseMode) return;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    statusDot.classList.add('active');
    statusText.innerText = '🖐️ ดาบมือพร้อมใช้งาน (ตวัดฟันผลไม้ได้เลย!)';

    const landmarks = results.multiHandLandmarks[0];
    const indexTip = landmarks[8]; // Fingertip as the sharp blade!

    // Mirrored coordinates
    const bladeX = (1.0 - indexTip.x) * CANVAS_WIDTH;
    const bladeY = indexTip.y * CANVAS_HEIGHT;

    addBladePoint(bladeX, bladeY);
  } else {
    handDetected = false;
    statusDot.classList.remove('active');
    statusText.innerText = '📷 ไม่พบมือหน้ากล้อง (หรือใช้เมาส์ลากฟัน)';
  }
}

function initCamera() {
  if (isMouseMode) return;

  if (!handsInstance && window.Hands) {
    handsInstance = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsInstance.setOptions({
      maxNumHands: 1,
      modelComplexity: 0,
      minDetectionConfidence: 0.55,
      minTrackingConfidence: 0.55
    });

    handsInstance.onResults(onHandResults);
  }

  if (window.Camera && video) {
    if (!cameraInstance) {
      cameraInstance = new Camera(video, {
        onFrame: async () => {
          if (isMouseMode || !handsInstance) return;
          if (isProcessingHandFrame) return; // Drop frame if still processing to prevent GPU/CPU choke
          isProcessingHandFrame = true;
          try {
            await handsInstance.send({ image: video });
          } catch(e) {
            console.warn(e);
          } finally {
            isProcessingHandFrame = false;
          }
        },
        width: 640,
        height: 480
      });
    }

    cameraInstance.start().then(() => {
      statusDot.classList.add('active');
      statusText.innerText = '📷 กล้อง AI พร้อมใช้งาน (ตวัดนิ้วชี้ฟันผลไม้)';
    }).catch(err => {
      console.warn('Camera failed:', err);
      switchToMouseMode();
    });
  } else {
    switchToMouseMode();
  }
}

function stopCamera() {
  if (cameraInstance) {
    try { cameraInstance.stop(); } catch(e) {}
  }
  if (video && video.srcObject) {
    try {
      video.srcObject.getTracks().forEach(t => t.stop());
    } catch(e) {}
    video.srcObject = null;
  }
  handDetected = false;
}

function switchToMouseMode() {
  isMouseMode = true;
  stopCamera();
  modeToggleBtn.classList.add('mouse-mode');
  modeToggleBtn.innerText = '🖱️ โหมด: เมาส์ / สัมผัส (ปิดกล้อง)';
  statusDot.classList.add('active');
  statusText.innerText = '🖱️ โหมดเมาส์ / จอสัมผัส (ลากเมาส์ตวัดฟันผลไม้)';
}

function switchToCameraMode() {
  isMouseMode = false;
  modeToggleBtn.classList.remove('mouse-mode');
  modeToggleBtn.innerText = '🖐️ โหมด: กล้อง AI (ดาบมือ)';
  statusDot.classList.remove('active');
  statusText.innerText = 'กำลังเปิดกล้อง AI Hands...';
  initCamera();
}

modeToggleBtn.addEventListener('click', () => {
  if (isMouseMode) {
    switchToCameraMode();
  } else {
    switchToMouseMode();
  }
});

// =========================================================
// MAIN RENDER LOOP (High Performance)
// =========================================================
function gameLoop(now) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background Webcam Feed (AR Mode)
  if (!isMouseMode && video && video.readyState >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.25;
    ctx.translate(CANVAS_WIDTH, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }

  // Spawner & Physics
  if (isPlaying) {
    updateSpawner(now);
    checkBladeSlices();
  }

  // Update & Draw Fruits
  for (let i = activeItems.length - 1; i >= 0; i--) {
    const item = activeItems[i];
    item.update();
    item.draw();

    // Remove if off-screen
    if (item.y > CANVAS_HEIGHT + 100 && item.vy > 0) {
      activeItems.splice(i, 1);
    }
  }

  // Update & Draw Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    if (p.alpha <= 0) {
      particles.splice(i, 1);
    }
  }

  // Fade blade trail gradually
  if (bladeTrail.length > 0) {
    drawBladeTrail();
    if (!isPointerActive && !handDetected) {
      bladeTrail.shift();
    }
  }

  requestAnimationFrame(gameLoop);
}

// Start on launch
initCamera();
requestAnimationFrame(gameLoop);
