// =========================================================
// SUSHI MASTER: AI CHOPSTICK PINCH & SERVE
// MediaPipe Hand Pinch Chopstick Tracking & Conveyor Belt Physics
// =========================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const modeToggleBtn = document.getElementById('modeToggleBtn');

const orderIcon = document.getElementById('orderIcon');
const orderName = document.getElementById('orderName');
const orderProgress = document.getElementById('orderProgress');

const scoreVal = document.getElementById('scoreVal');
const timerVal = document.getElementById('timerVal');
const servedVal = document.getElementById('servedVal');

const startScreen = document.getElementById('startScreen');
const btnStartGame = document.getElementById('btnStartGame');

const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const finalServed = document.getElementById('finalServed');
const finalAccuracy = document.getElementById('finalAccuracy');
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
// AUDIO SYNTHESIZER (Chopstick Grab, Serve & Splat FX)
// =========================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playGrabSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(480, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(720, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.08);
  } catch(e) {}
}

function playServeSuccessSound() {
  if (!audioCtx) return;
  try {
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C, E, G, High C
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.06);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime + idx * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.06 + 0.18);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + idx * 0.06);
      osc.stop(audioCtx.currentTime + idx * 0.06 + 0.2);
    });
  } catch(e) {}
}

function playWrongSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(90, audioCtx.currentTime + 0.2);
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch(e) {}
}

// =========================================================
// SUSHI RECIPES & DATA
// =========================================================
const SUSHI_TYPES = [
  { id: 'SALMON', name: 'แซลมอนนิกิริ (Salmon)', icon: '🍣', color: '#ff6b6b', points: 150 },
  { id: 'TUNA', name: 'ทูน่านิกิริ (Maguro Tuna)', icon: '🍣', color: '#e63946', points: 160 },
  { id: 'EBI', name: 'กุ้งหวานนิกิริ (Ebi Shrimp)', icon: '🍤', color: '#f4a261', points: 140 },
  { id: 'TAMAGO', name: 'ไข่หวานนิกิริ (Tamago)', icon: '🧈', color: '#ffd166', points: 120 },
  { id: 'MAKI', name: 'แซลมอนโรล (Maki Roll)', icon: '🍱', color: '#06d6a0', points: 150 },
  { id: 'ONIGIRI', name: 'ข้าวปั้นสาหร่าย (Onigiri)', icon: '🍙', color: '#f8f9fa', points: 110 },
  { id: 'IKURA', name: 'ไข่ปลาแซลมอน (Ikura Gunkan)', icon: '🍥', color: '#ff4d6d', points: 200 }
];

// Game State
const TOTAL_GAME_TIME = 60; // seconds
let isPlaying = false;
let score = 0;
let timeLeft = TOTAL_GAME_TIME;
let totalServed = 0;
let totalAttempts = 0;
let gameTimerInterval = null;

let currentTargetOrder = null;
let currentTargetNeeded = 1;
let currentTargetCollected = 0;

let conveyorSushis = [];
let particles = [];
let floatingTexts = [];

// Chopstick / Hand state
let pinchX = -100, pinchY = -100;
let thumbX = -100, thumbY = -100;
let indexX = -100, indexY = -100;
let isPinching = false;
let grabbedSushi = null;
let grabOffsetX = 0, grabOffsetY = 0;

let isMouseMode = false;
let cameraInstance = null;
let handsInstance = null;
let handDetected = false;

// =========================================================
// CONVEYOR BELT SUSHI CLASS
// =========================================================
class ConveyorSushi {
  constructor(x, y, speed, typeDef) {
    this.x = x;
    this.y = y;
    this.speed = speed;
    this.def = typeDef;
    this.radius = 42;
    this.isGrabbed = false;
    this.isServed = false;
    this.plateRotation = Math.random() * Math.PI * 2;
  }

  update() {
    if (!this.isGrabbed && !this.isServed) {
      this.x += this.speed;
      this.plateRotation += 0.015;
    }
  }

  draw() {
    if (this.isServed) return;

    ctx.save();
    ctx.translate(this.x, this.y);

    // Draw Ceramic Plate
    ctx.beginPath();
    ctx.arc(0, 0, this.radius + 6, 0, Math.PI * 2);
    ctx.fillStyle = '#1e293b';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = this.isGrabbed ? '#00f0ff' : '#475569';
    ctx.stroke();

    // Plate Inner Ring
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.stroke();

    // Draw Sushi Icon / Emoji
    ctx.font = `${this.radius * 1.3}px Kanit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.def.icon, 0, 0);

    // Name label
    ctx.font = '600 11px Kanit, sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(this.def.id, 0, this.radius + 18);

    ctx.restore();
  }
}

// Particle Effect Class
class SparkParticle {
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = 3 + Math.random() * 5;
    this.alpha = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.025;
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
// ORDER SYSTEM & SPAWN LOGIC
// =========================================================
function generateNewOrder() {
  const randomType = SUSHI_TYPES[Math.floor(Math.random() * SUSHI_TYPES.length)];
  currentTargetOrder = randomType;
  currentTargetNeeded = 1;
  currentTargetCollected = 0;

  orderIcon.innerText = currentTargetOrder.icon;
  orderName.innerText = currentTargetOrder.name;
  orderProgress.innerText = `เป้าหมาย: ${currentTargetCollected} / ${currentTargetNeeded} ชิ้น`;
}

let lastSpawnTime = 0;
const SPAWN_INTERVAL = 1400; // ms

function updateConveyorBelt(now) {
  const beltY = CANVAS_HEIGHT * 0.42;

  // Spawn new sushi
  if (now - lastSpawnTime > SPAWN_INTERVAL) {
    lastSpawnTime = now;
    // 40% chance of spawning current order target
    let typeDef;
    if (Math.random() < 0.45 && currentTargetOrder) {
      typeDef = currentTargetOrder;
    } else {
      typeDef = SUSHI_TYPES[Math.floor(Math.random() * SUSHI_TYPES.length)];
    }

    const sushi = new ConveyorSushi(-60, beltY, 3.2, typeDef);
    conveyorSushis.push(sushi);
  }

  // Update position & garbage collect
  for (let i = conveyorSushis.length - 1; i >= 0; i--) {
    const s = conveyorSushis[i];
    s.update();
    if (s.x > CANVAS_WIDTH + 100 && !s.isGrabbed) {
      conveyorSushis.splice(i, 1);
    }
  }
}

// =========================================================
// CHOPSTICK PINCH & SERVING COLLISION
// =========================================================
function getServingPlateRect() {
  // Gold Customer Serving Plate at bottom center
  const w = Math.min(380, CANVAS_WIDTH * 0.45);
  const h = 130;
  const x = (CANVAS_WIDTH - w) / 2;
  const y = CANVAS_HEIGHT - h - 24;
  return { x, y, w, h, centerX: x + w / 2, centerY: y + h / 2 };
}

function handlePinchGrabbing() {
  if (isPinching) {
    if (!grabbedSushi) {
      // Find closest ungrabbed sushi near pinch point
      for (let s of conveyorSushis) {
        const dist = Math.hypot(pinchX - s.x, pinchY - s.y);
        if (dist <= s.radius + 20) {
          grabbedSushi = s;
          s.isGrabbed = true;
          grabOffsetX = pinchX - s.x;
          grabOffsetY = pinchY - s.y;
          playGrabSound();
          break;
        }
      }
    } else {
      // Drag with chopsticks
      grabbedSushi.x = pinchX - grabOffsetX;
      grabbedSushi.y = pinchY - grabOffsetY;
    }
  } else {
    // Release sushi
    if (grabbedSushi) {
      const plate = getServingPlateRect();
      const distToPlate = Math.hypot(grabbedSushi.x - plate.centerX, grabbedSushi.y - plate.centerY);

      if (distToPlate < plate.w / 2) {
        // Dropped on customer plate!
        totalAttempts++;
        if (grabbedSushi.def.id === currentTargetOrder.id) {
          // Correct Order!
          playServeSuccessSound();
          score += grabbedSushi.def.points;
          totalServed++;
          currentTargetCollected++;

          // Particles
          for (let i = 0; i < 25; i++) {
            particles.push(new SparkParticle(plate.centerX, plate.centerY, '#00ff88'));
          }

          floatingTexts.push({
            text: `+${grabbedSushi.def.points} อร่อยมาก! 🎉`,
            x: plate.centerX,
            y: plate.centerY - 40,
            alpha: 1,
            color: '#00ff88'
          });

          // Remove sushi
          const idx = conveyorSushis.indexOf(grabbedSushi);
          if (idx !== -1) conveyorSushis.splice(idx, 1);

          generateNewOrder();
        } else {
          // Wrong Order!
          playWrongSound();
          score = Math.max(0, score - 50);

          for (let i = 0; i < 20; i++) {
            particles.push(new SparkParticle(plate.centerX, plate.centerY, '#ff0055'));
          }

          floatingTexts.push({
            text: `-50 ผิดเมนู! ❌`,
            x: plate.centerX,
            y: plate.centerY - 40,
            alpha: 1,
            color: '#ff0055'
          });

          // Return to conveyor belt
          grabbedSushi.y = CANVAS_HEIGHT * 0.42;
          grabbedSushi.isGrabbed = false;
        }
        updateHUD();
      } else {
        // Dropped outside -> snap back to conveyor
        grabbedSushi.y = CANVAS_HEIGHT * 0.42;
        grabbedSushi.isGrabbed = false;
      }
      grabbedSushi = null;
    }
  }
}

// =========================================================
// HUD & GAME LIFECYCLE
// =========================================================
function updateHUD() {
  scoreVal.innerText = score;
  timerVal.innerText = Math.max(0, Math.ceil(timeLeft));
  servedVal.innerText = `${totalServed} จาน`;
}

function startGame() {
  initAudio();
  isPlaying = true;
  score = 0;
  timeLeft = TOTAL_GAME_TIME;
  totalServed = 0;
  totalAttempts = 0;
  conveyorSushis = [];
  particles = [];
  floatingTexts = [];
  grabbedSushi = null;

  generateNewOrder();
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
  finalServed.innerText = `${totalServed} จาน`;
  const accuracy = totalAttempts > 0 ? Math.round((totalServed / totalAttempts) * 100) : 100;
  finalAccuracy.innerText = `${accuracy}%`;

  if (score > 1200) {
    confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 } });
  }

  gameOverScreen.classList.remove('hidden');
}

btnStartGame.addEventListener('click', startGame);
btnRestartGame.addEventListener('click', startGame);

// =========================================================
// DRAW CHOPSTICKS & SKELETON (Cyber Chopstick Overlay)
// =========================================================
function drawChopsticks() {
  if (pinchX < 0 || pinchY < 0) return;

  ctx.save();
  // Draw 2 Wooden/Cyber Chopsticks aiming at the pinch point
  const baseOffset = 140;

  // Left Chopstick (from top-left of hand to pinch tip)
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f59e0b';

  // Chopstick 1
  ctx.beginPath();
  ctx.moveTo(pinchX - (isPinching ? 18 : 34), pinchY - baseOffset);
  ctx.lineTo(pinchX, pinchY);
  ctx.stroke();

  // Chopstick 2
  ctx.beginPath();
  ctx.moveTo(pinchX + (isPinching ? 18 : 34), pinchY - baseOffset);
  ctx.lineTo(pinchX, pinchY);
  ctx.stroke();

  // Chopstick Tips Grip Effect
  ctx.beginPath();
  ctx.arc(pinchX, pinchY, isPinching ? 8 : 5, 0, Math.PI * 2);
  ctx.fillStyle = isPinching ? '#00ff88' : '#00f0ff';
  ctx.fill();

  ctx.restore();
}

// Draw Conveyor Belt & Customer Plate in Environment
function drawEnvironment() {
  const beltY = CANVAS_HEIGHT * 0.42;
  const beltHeight = 110;

  // 1. Conveyor Belt Background Track
  ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
  ctx.fillRect(0, beltY - beltHeight / 2, CANVAS_WIDTH, beltHeight);

  // Conveyor Belt Metal Rails
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#334155';
  ctx.beginPath();
  ctx.moveTo(0, beltY - beltHeight / 2);
  ctx.lineTo(CANVAS_WIDTH, beltY - beltHeight / 2);
  ctx.moveTo(0, beltY + beltHeight / 2);
  ctx.lineTo(CANVAS_WIDTH, beltY + beltHeight / 2);
  ctx.stroke();

  // Moving Belt Lines
  const timeOffset = (Date.now() * 0.12) % 40;
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.5)';
  for (let x = -timeOffset; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, beltY - beltHeight / 2);
    ctx.lineTo(x, beltY + beltHeight / 2);
    ctx.stroke();
  }

  // 2. Customer Serving Plate (Gold Dish at bottom)
  const plate = getServingPlateRect();
  ctx.save();
  // Glow under plate
  ctx.shadowColor = 'rgba(245, 158, 11, 0.4)';
  ctx.shadowBlur = 30;

  // Plate Base
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(plate.x, plate.y, plate.w, plate.h, [24]);
  ctx.fill();

  // Gold Plate Rim
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = '#f59e0b';
  ctx.stroke();

  // Plate Text Label
  ctx.font = '800 14px Kanit, sans-serif';
  ctx.fillStyle = '#f59e0b';
  ctx.textAlign = 'center';
  ctx.fillText('🥢 วางซูชิลงที่นี่เพื่อเสิร์ฟลูกค้า (DROP HERE TO SERVE)', plate.centerX, plate.centerY - 24);

  ctx.font = '600 12px Kanit, sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('จานเสิร์ฟทองคำ IT MAEJO CHEF', plate.centerX, plate.centerY + 24);

  ctx.restore();
}

// =========================================================
// MOUSE & TOUCH CONTROLS
// =========================================================
canvas.addEventListener('mousedown', (e) => {
  pinchX = e.clientX;
  pinchY = e.clientY;
  isPinching = true;
  handlePinchGrabbing();
});

window.addEventListener('mousemove', (e) => {
  pinchX = e.clientX;
  pinchY = e.clientY;
  if (isPinching) {
    handlePinchGrabbing();
  }
});

window.addEventListener('mouseup', () => {
  isPinching = false;
  handlePinchGrabbing();
});

// Touch
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  pinchX = touch.clientX;
  pinchY = touch.clientY;
  isPinching = true;
  handlePinchGrabbing();
}, { passive: false });

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    pinchX = touch.clientX;
    pinchY = touch.clientY;
    if (isPinching) handlePinchGrabbing();
  }
}, { passive: false });

window.addEventListener('touchend', () => {
  isPinching = false;
  handlePinchGrabbing();
});

// =========================================================
// MEDIAPIPE HANDS TRACKING (Pinch Gesture to Grip Sushi)
// =========================================================
function onHandResults(results) {
  if (isMouseMode) return;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    statusDot.classList.add('active');
    statusText.innerText = '🖐️ ตะเกียบพร้อมทำงาน (จีบนิ้วเพื่อคีบซูชิ)';

    const landmarks = results.multiHandLandmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const indexMcp = landmarks[5];
    const wrist = landmarks[0];

    // Compute scale
    const handScale = Math.hypot(indexMcp.x - wrist.x, indexMcp.y - wrist.y) || 0.3;

    // Mirrored Coordinates
    const rawThumbX = (1.0 - thumbTip.x) * CANVAS_WIDTH;
    const rawThumbY = thumbTip.y * CANVAS_HEIGHT;
    const rawIndexX = (1.0 - indexTip.x) * CANVAS_WIDTH;
    const rawIndexY = indexTip.y * CANVAS_HEIGHT;

    // Pinch Midpoint
    pinchX = (rawThumbX + rawIndexX) / 2;
    pinchY = (rawThumbY + rawIndexY) / 2;

    // Relative Pinch distance ratio
    const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) / handScale;

    // Hysteresis
    if (!isPinching) {
      if (pinchDist < 0.45) {
        isPinching = true;
      }
    } else {
      if (pinchDist > 0.65) {
        isPinching = false;
      }
    }

    handlePinchGrabbing();
  } else {
    handDetected = false;
    statusDot.classList.remove('active');
    statusText.innerText = '📷 ไม่พบมือหน้ากล้อง (หรือใช้เมาส์คลิกลากคีบ)';
    if (!isMouseMode && isPinching) {
      isPinching = false;
      handlePinchGrabbing();
    }
  }
}

let isProcessingHandFrame = false;

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
          if (isProcessingHandFrame) return;
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
      statusText.innerText = '📷 กล้อง AI พร้อมใช้งาน (จีบนิ้วคีบซูชิ)';
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
  statusText.innerText = '🖱️ โหมดเมาส์ / จอสัมผัส (คลิกลากซูชิมาวางบนจาน)';
}

function switchToCameraMode() {
  isMouseMode = false;
  modeToggleBtn.classList.remove('mouse-mode');
  modeToggleBtn.innerText = '🖐️ โหมด: ตะเกียบมือ AI';
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
// MAIN GAME LOOP
// =========================================================
function gameLoop(now) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background Webcam Feed (AR Mode)
  if (!isMouseMode && video && video.readyState >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.translate(CANVAS_WIDTH, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }

  // Draw Conveyor Belt & Dish Table
  drawEnvironment();

  // Spawner & Belt Updates
  if (isPlaying) {
    updateConveyorBelt(now);
  }

  // Draw Sushis on belt (ungrabbed first, grabbed on top)
  conveyorSushis.forEach(s => {
    if (!s.isGrabbed) s.draw();
  });
  if (grabbedSushi) {
    grabbedSushi.draw();
  }

  // Draw Floating Score Texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = '800 20px Kanit, sans-serif';
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();

    ft.y -= 1.2;
    ft.alpha -= 0.02;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }

  // Draw Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.update();
    p.draw();
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // Draw Chopsticks Cursor
  drawChopsticks();

  requestAnimationFrame(gameLoop);
}

// Start on launch
initCamera();
requestAnimationFrame(gameLoop);
