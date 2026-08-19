// =========================================================
// CYBER WIND FAN & FIRE EXTINGUISHER
// Real-time Hand Fanning (พัดมือ) Physics & Wind Gust Simulation
// =========================================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const modeToggleBtn = document.getElementById('modeToggleBtn');

const scoreVal = document.getElementById('scoreVal');
const timerVal = document.getElementById('timerVal');
const extinguishedVal = document.getElementById('extinguishedVal');
const waterStatus = document.getElementById('waterStatus');

const startScreen = document.getElementById('startScreen');
const btnStartGame = document.getElementById('btnStartGame');

const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const finalExtinguished = document.getElementById('finalExtinguished');
const finalRank = document.getElementById('finalRank');
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
// AUDIO SYNTHESIZER (Wind Gust Whoosh & Fire Sizzle FX)
// =========================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playWindWhooshSound(intensity = 1) {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140 + Math.random() * 80, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(380 * intensity, audioCtx.currentTime + 0.12);
    osc.frequency.exponentialRampToValueAtTime(80, audioCtx.currentTime + 0.28);

    gain.gain.setValueAtTime(0.22 * Math.min(intensity, 1.5), audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.28);
  } catch(e) {}
}

function playFireExtinguishedSound() {
  if (!audioCtx) return;
  try {
    const notes = [440, 554.37, 659.25, 880]; // A Major Arpeggio
    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.05);
      gain.gain.setValueAtTime(0.18, audioCtx.currentTime + idx * 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.05 + 0.2);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(audioCtx.currentTime + idx * 0.05);
      osc.stop(audioCtx.currentTime + idx * 0.05 + 0.22);
    });
  } catch(e) {}
}

// =========================================================
// GAME CONFIGURATIONS & STATE
// =========================================================
const TOTAL_GAME_TIME = 45; // seconds
let isPlaying = false;
let score = 0;
let timeLeft = TOTAL_GAME_TIME;
let totalExtinguished = 0;
let gameTimerInterval = null;

let activeFires = [];
let windParticles = [];
let steamParticles = [];
let floatingTexts = [];

// Hand Motion & Fanning State
let handX = CANVAS_WIDTH / 2;
let handY = CANVAS_HEIGHT / 2;
let prevHandX = CANVAS_WIDTH / 2;
let prevHandY = CANVAS_HEIGHT / 2;
let handSpeed = 0; // Magnitude of speed (px/frame)
let fanDirectionX = 0;
let fanDirectionY = 0;
let isFanningHard = false;

let isMouseMode = false;
let cameraInstance = null;
let handsInstance = null;
let handDetected = false;

// =========================================================
// FIRE OBJECT CLASS (With HP & Wind Reaction)
// =========================================================
class BurningFire {
  constructor() {
    this.radius = 48 + Math.random() * 22;
    this.x = this.radius + 60 + Math.random() * (CANVAS_WIDTH - this.radius * 2 - 120);
    this.y = CANVAS_HEIGHT * 0.25 + Math.random() * (CANVAS_HEIGHT * 0.45);
    this.maxHp = 100;
    this.hp = this.maxHp;
    this.tilt = 0;
    this.flicker = Math.random() * Math.PI * 2;
    this.isDead = false;
  }

  takeWindGust(intensity, windDirX) {
    if (this.isDead) return;
    this.hp -= intensity * 4.2; // Damage based on fanning strength!
    this.tilt = windDirX * 0.6; // Flame tilts with wind

    // Spawn Smoke & Sparks
    if (Math.random() < 0.7) {
      steamParticles.push(new SteamParticle(this.x + (Math.random() - 0.5) * this.radius, this.y + (Math.random() - 0.5) * this.radius));
    }

    if (this.hp <= 0) {
      this.isDead = true;
      playFireExtinguishedSound();
      totalExtinguished++;
      score += 150;

      // Extinguished burst
      for (let i = 0; i < 28; i++) {
        steamParticles.push(new SteamParticle(this.x, this.y));
      }

      floatingTexts.push({
        text: '+150 พัดดับไฟสำเร็จ! 💨',
        x: this.x,
        y: this.y - 30,
        alpha: 1,
        color: '#00f0ff'
      });

      updateHUD();
    }
  }

  draw() {
    if (this.isDead) return;
    this.flicker += 0.16;
    this.tilt *= 0.88; // Return to center

    const flameSize = this.radius * (0.8 + Math.sin(this.flicker) * 0.12);
    const hpRatio = Math.max(0, this.hp / this.maxHp);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.tilt);

    // Glowing Flame Aura
    ctx.shadowColor = '#ff5722';
    ctx.shadowBlur = 26 * hpRatio;

    // Fire Emoji Graphic
    ctx.font = `${flameSize * (0.5 + hpRatio * 0.85)}px Kanit, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🔥', 0, 0);

    // Mini Health Bar above fire
    const barW = this.radius * 1.5;
    const barH = 7;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(-barW / 2, -this.radius - 16, barW, barH);
    ctx.fillStyle = hpRatio > 0.4 ? '#ff5722' : '#00f0ff';
    ctx.fillRect(-barW / 2, -this.radius - 16, barW * hpRatio, barH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-barW / 2, -this.radius - 16, barW, barH);

    ctx.restore();
  }
}

// Wind Gust Particle Class
class WindParticle {
  constructor(x, y, vx, vy) {
    this.x = x;
    this.y = y;
    this.vx = vx * 0.8 + (Math.random() - 0.5) * 4;
    this.vy = vy * 0.8 + (Math.random() - 0.5) * 4;
    this.length = 16 + Math.random() * 26;
    this.alpha = 0.9;
    this.color = Math.random() < 0.5 ? 'rgba(0, 240, 255, ' : 'rgba(255, 255, 255, ';
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= 0.035;
  }

  draw() {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.strokeStyle = `${this.color}${this.alpha})`;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 1.5, this.y - this.vy * 1.5);
    ctx.stroke();
    ctx.restore();
  }
}

// Smoke Particle Class
class SteamParticle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 3;
    this.vy = -(1.5 + Math.random() * 3);
    this.size = 10 + Math.random() * 16;
    this.alpha = 0.85;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.size += 0.4;
    this.alpha -= 0.022;
  }

  draw() {
    if (this.alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.alpha);
    ctx.fillStyle = 'rgba(200, 230, 255, 0.6)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

// =========================================================
// FANNING & WIND COLLISION SYSTEM
// =========================================================
function processFanningMotion() {
  const dx = handX - prevHandX;
  const dy = handY - prevHandY;
  handSpeed = Math.hypot(dx, dy);

  // Speed threshold for "Fanning" (สะบัดมือ/พัดลม)
  const FAN_SPEED_THRESHOLD = 14;

  if (handSpeed > FAN_SPEED_THRESHOLD) {
    isFanningHard = true;
    fanDirectionX = dx / handSpeed;
    fanDirectionY = dy / handSpeed;

    waterStatus.innerText = '💨 กำลังสะบัดพัดลมแรงสูง!';
    waterStatus.style.color = '#00f0ff';

    // Play whoosh sound
    playWindWhooshSound(handSpeed / 25);

    // Spawn 6 wind trail particles
    for (let i = 0; i < 6; i++) {
      const offsetX = (Math.random() - 0.5) * 60;
      const offsetY = (Math.random() - 0.5) * 60;
      windParticles.push(new WindParticle(handX + offsetX, handY + offsetY, dx * 0.7, dy * 0.7));
    }

    // Check hit on burning fires within fanning radius
    const GUST_RADIUS = 160;
    activeFires.forEach(fire => {
      const dist = Math.hypot(handX - fire.x, handY - fire.y);
      if (dist < GUST_RADIUS + fire.radius) {
        fire.takeWindGust(handSpeed / 18, fanDirectionX);
      }
    });
  } else {
    isFanningHard = false;
    waterStatus.innerText = '🖐️ โบกสะบัดมือพัดลมได้เลย!';
    waterStatus.style.color = '#00b4d8';
  }

  prevHandX = handX;
  prevHandY = handY;

  // Update Wind Particles
  for (let i = windParticles.length - 1; i >= 0; i--) {
    const wp = windParticles[i];
    wp.update();
    if (wp.alpha <= 0) {
      windParticles.splice(i, 1);
    }
  }

  // Update Smoke Particles
  for (let i = steamParticles.length - 1; i >= 0; i--) {
    const s = steamParticles[i];
    s.update();
    if (s.alpha <= 0) {
      steamParticles.splice(i, 1);
    }
  }
}

// Spawner (Fast & Action-packed)
let lastFireSpawnTime = 0;
const FIRE_SPAWN_INTERVAL = 800; // เกิดไวขึ้นมาก ทุกๆ 0.8 วินาที

function updateFireSpawner(now) {
  // สุ่มเกิดกองไฟได้สูงสุดถึง 5 - 6 กองพร้อมกัน ให้พัดมันส์ต่อเนื่อง
  if (activeFires.length < 6 && now - lastFireSpawnTime > FIRE_SPAWN_INTERVAL) {
    lastFireSpawnTime = now;
    activeFires.push(new BurningFire());
  }

  for (let i = activeFires.length - 1; i >= 0; i--) {
    if (activeFires[i].isDead) {
      activeFires.splice(i, 1);
    }
  }
}

// =========================================================
// HUD & GAME LIFECYCLE
// =========================================================
function updateHUD() {
  scoreVal.innerText = score;
  timerVal.innerText = Math.max(0, Math.ceil(timeLeft));
  extinguishedVal.innerText = `${totalExtinguished} กอง`;
}

function startGame() {
  initAudio();
  isPlaying = true;
  score = 0;
  timeLeft = TOTAL_GAME_TIME;
  totalExtinguished = 0;
  activeFires = [];
  windParticles = [];
  steamParticles = [];
  floatingTexts = [];

  // Spawn initial 4 fires right away
  for (let i = 0; i < 4; i++) {
    activeFires.push(new BurningFire());
  }

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
  finalExtinguished.innerText = `${totalExtinguished} กอง`;

  let rank = 'B';
  if (score >= 1500) rank = 'S+ (จอมยุทธ์พัดดับเพลิง)';
  else if (score >= 1000) rank = 'S (เชี่ยวชาญสายลม)';
  else if (score >= 600) rank = 'A (ยอดเยี่ยม)';
  finalRank.innerText = rank;

  if (score >= 1000) {
    confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 } });
  }

  gameOverScreen.classList.remove('hidden');
}

btnStartGame.addEventListener('click', startGame);
btnRestartGame.addEventListener('click', startGame);

// =========================================================
// DRAW HAND FAN CURSOR (พัดถือในมือ Cyber Hand Fan)
// =========================================================
function drawCyberFan() {
  ctx.save();
  ctx.translate(handX, handY);

  // Rotate fan towards movement direction or natural hand angle
  if (handSpeed > 4) {
    ctx.rotate(Math.atan2(fanDirectionY, fanDirectionX) + Math.PI / 2);
  }

  // 1. Wind Blast Aura (When Fanning Hard)
  if (isFanningHard) {
    ctx.beginPath();
    ctx.arc(0, -50, 75, -Math.PI * 0.75, -Math.PI * 0.25);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#00f0ff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 24;
    ctx.stroke();

    // Wind shockwave ripple
    ctx.beginPath();
    ctx.arc(0, -65, 95, -Math.PI * 0.7, -Math.PI * 0.3);
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.stroke();
  }

  // 2. Draw Fan Handle (ด้ามจับพัด ที่ผู้เล่นกำลังถืออยู่)
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#f59e0b';
  ctx.shadowColor = '#f59e0b';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(0, 35);
  ctx.lineTo(0, -10);
  ctx.stroke();

  // 3. Draw Japanese Folding Fan Blade (ใบพัดคลี่ออกอย่างสง่างาม)
  ctx.beginPath();
  ctx.moveTo(0, -10);
  ctx.arc(0, -10, 68, -Math.PI * 0.82, -Math.PI * 0.18);
  ctx.closePath();
  ctx.fillStyle = isFanningHard ? 'rgba(0, 240, 255, 0.45)' : 'rgba(14, 165, 233, 0.35)';
  ctx.fill();
  ctx.lineWidth = 3.5;
  ctx.strokeStyle = isFanningHard ? '#00ff88' : '#00f0ff';
  ctx.shadowColor = isFanningHard ? '#00ff88' : '#00f0ff';
  ctx.shadowBlur = 18;
  ctx.stroke();

  // Fan rib lines (ซี่โครงพัด)
  const angles = [-0.75, -0.6, -0.5, -0.4, -0.25];
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  angles.forEach(a => {
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.lineTo(Math.cos(a * Math.PI) * 68, -10 + Math.sin(a * Math.PI) * 68);
    ctx.stroke();
  });

  // Hand Grip Ring (ตำแหน่งกำมือจับด้ามพัด)
  ctx.beginPath();
  ctx.arc(0, 20, 12, 0, Math.PI * 2);
  ctx.fillStyle = isFanningHard ? '#00ff88' : '#00b4d8';
  ctx.shadowColor = '#00f0ff';
  ctx.shadowBlur = 14;
  ctx.fill();

  ctx.restore();
}

// =========================================================
// MOUSE & TOUCH CONTROLS
// =========================================================
window.addEventListener('mousemove', (e) => {
  handX = e.clientX;
  handY = e.clientY;
  if (isPlaying) {
    processFanningMotion();
  }
});

canvas.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    handX = touch.clientX;
    handY = touch.clientY;
    if (isPlaying) {
      processFanningMotion();
    }
  }
}, { passive: false });

// =========================================================
// MEDIAPIPE ONE-HAND TRACKING (Hand Grip & Wave Fan)
// =========================================================
function onHandResults(results) {
  if (isMouseMode) return;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    statusDot.classList.add('active');
    statusText.innerText = '🖐️ กำด้ามพัดแน่นแล้ว! (สะบัดมือพัดลมเพื่อดับไฟ)';

    const landmarks = results.multiHandLandmarks[0];
    const wrist = landmarks[0];
    const indexMcp = landmarks[5];
    const pinkyMcp = landmarks[17];

    // Tracking the Hand Grip Center (Knuckles / Grip base) so player can make a fist or hold naturally!
    const targetX = (1.0 - (wrist.x + indexMcp.x + pinkyMcp.x) / 3) * CANVAS_WIDTH;
    const targetY = ((wrist.y + indexMcp.y + pinkyMcp.y) / 3) * CANVAS_HEIGHT;

    // Smooth position tracking
    handX += (targetX - handX) * 0.8;
    handY += (targetY - handY) * 0.8;

    if (isPlaying) {
      processFanningMotion();
    }
  } else {
    handDetected = false;
    statusDot.classList.remove('active');
    statusText.innerText = '📷 ไม่พบมือหน้ากล้อง (หรือใช้เมาส์สะบัดพัด)';
  }
}

function initCamera() {
  if (isMouseMode) return;

  if (!handsInstance && window.Hands) {
    handsInstance = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    handsInstance.setOptions({
      maxNumHands: 1, // STRICTLY ONE-HAND (มือเดียว)
      modelComplexity: 0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    handsInstance.onResults(onHandResults);
  }

  if (window.Camera && video) {
    if (!cameraInstance) {
      cameraInstance = new Camera(video, {
        onFrame: async () => {
          if (!isMouseMode && handsInstance) {
            await handsInstance.send({ image: video });
          }
        },
        width: 640,
        height: 480
      });
    }

    cameraInstance.start().then(() => {
      statusDot.classList.add('active');
      statusText.innerText = '📷 กล้อง AI พร้อมใช้งาน (ใช้มือเดียวโบกพัดลมดับไฟ)';
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
  statusText.innerText = '🖱️ โหมดเมาส์ / จอสัมผัส (สะบัดเมาส์ไปมาเพื่อพัดดับไฟ)';
}

function switchToCameraMode() {
  isMouseMode = false;
  modeToggleBtn.classList.remove('mouse-mode');
  modeToggleBtn.innerText = '🖐️ โหมด: พัดลมมือเดียว AI';
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
// MAIN RENDER LOOP
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

  // Update Game Physics
  if (isPlaying) {
    updateFireSpawner(now);
  }

  // Draw Burning Fires
  activeFires.forEach(f => f.draw());

  // Draw Wind Particles
  windParticles.forEach(p => p.draw());

  // Draw Smoke Particles
  steamParticles.forEach(s => s.draw());

  // Draw Floating Score Texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.font = '800 22px Kanit, sans-serif';
    ctx.fillStyle = ft.color;
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();

    ft.y -= 1.4;
    ft.alpha -= 0.02;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }

  // Draw Cyber Hand Fan
  drawCyberFan();

  requestAnimationFrame(gameLoop);
}

// Start on launch
initCamera();
requestAnimationFrame(gameLoop);
