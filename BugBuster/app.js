// ==========================================
// BUG BUSTER & AUTOMATED TESTER (IT แม่โจ้ 2570)
// ==========================================

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const restartBtn = document.getElementById('restartGameBtn');
const toggleControlModeBtn = document.getElementById('toggleControlModeBtn');

const CANVAS_WIDTH = 1100;
const CANVAS_HEIGHT = 680;

// Difficulty Configurations
const DIFFICULTY_CONFIG = {
  EASY: {
    label: '🟢 EASY (ง่าย)',
    time: 60,
    spawnInterval: 1350,
    speedMultiplier: 0.8,
    dmgMultiplier: 0.7,
    color: '#00ff88'
  },
  MEDIUM: {
    label: '🟡 MEDIUM (ปานกลาง)',
    time: 50,
    spawnInterval: 1050,
    speedMultiplier: 1.0,
    dmgMultiplier: 1.0,
    color: '#00f0ff'
  },
  HARD: {
    label: '🔴 HARD (ท้าทาย)',
    time: 45,
    spawnInterval: 750,
    speedMultiplier: 1.35,
    dmgMultiplier: 1.4,
    color: '#ff3366'
  }
};

let currentDifficulty = 'MEDIUM';

// Game State
let gameState = 'START'; // 'START', 'PLAYING', 'GAME_OVER', 'VICTORY'
let score = 0;
let codeQuality = 100; // 0 - 100%
let combo = 0;
let maxCombo = 0;
let timeRemaining = 50; // seconds round
let lastTime = performance.now();
let bugSpawnTimer = 0;
let targetSpawnInterval = 1050; // ms
let currentLevel = 1;

// Particles & Effects
let particles = [];
let floatingTexts = [];
let scanlineY = 0;

// Tracking / Cursor
let cursorX = CANVAS_WIDTH / 2;
let cursorY = CANVAS_HEIGHT / 2;
let isLaserActive = false; // pinch or mouse down
let handDetected = false;
let isMouseMode = false; // false = Camera AI mode, true = Mouse/Touch mode (Camera turned off)

// Item Types (Bugs vs Clean Code Features)
const ITEM_TYPES = [
  // BUGS to DESTROY (Bug Buster)
  { type: 'BUG', name: 'Syntax Error', code: '404: Expected ;', color: '#ff3366', points: 100, dmg: 15, icon: '🐛', testType: 'Unit Test' },
  { type: 'BUG', name: 'Null Pointer', code: 'TypeError: null.val', color: '#ff0055', points: 120, dmg: 20, icon: '💥', testType: 'Integration Test' },
  { type: 'BUG', name: 'Memory Leak', code: 'Out of Memory 99%', color: '#ff7700', points: 150, dmg: 25, icon: '⚠️', testType: 'Performance Test' },
  { type: 'BUG', name: 'SQL Injection', code: "' OR '1'='1 --", color: '#d90429', points: 180, dmg: 30, icon: '🛡️', testType: 'Security Test' },
  { type: 'BUG', name: 'DevOps Build Fail', code: 'CI/CD Pipeline Error', color: '#ef233c', points: 140, dmg: 20, icon: '⚡', testType: 'DevOps / CI-CD' },
  { type: 'BUG', name: 'API Timeout 504', code: 'Gateway Timeout Error', color: '#f72585', points: 130, dmg: 18, icon: '⏱️', testType: 'API Stress Test' },
  { type: 'BUG', name: 'DDoS Flood', code: '10M Syn Packets/sec', color: '#b5179e', points: 190, dmg: 35, icon: '🌊', testType: 'Network Defense' },
  { type: 'BUG', name: 'Hardcoded Secret', code: 'apiKey: "12345"', color: '#e63946', points: 160, dmg: 25, icon: '🔓', testType: 'Static Analysis' },

  // CLEAN CODE & GREEN IT to PROTECT / PASS
  { type: 'CLEAN', name: 'Clean Architecture', code: 'SOLID: Clean Code', color: '#00ff88', points: -100, reward: 8, icon: '✨', testType: 'Quality Pass' },
  { type: 'CLEAN', name: 'Green IT Optimizer', code: 'BCG Low-Carbon Algo', color: '#00f0ff', points: -100, reward: 10, icon: '🌱', testType: 'Green IT Pass' },
  { type: 'CLEAN', name: 'AI Test Passed', code: 'AI-Driven Test: 100%', color: '#a78bfa', points: -100, reward: 10, icon: '🤖', testType: 'AI Unit Passed' },
  { type: 'CLEAN', name: 'Secure JWT Auth', code: 'Bearer Token (Signed)', color: '#4cc9f0', points: -100, reward: 10, icon: '🔐', testType: 'Auth Pass' },
  { type: 'CLEAN', name: 'Automated CI/CD', code: 'Pipeline: Succeeded', color: '#38bdf8', points: -100, reward: 12, icon: '🚀', testType: 'CI/CD Pass' },
  { type: 'CLEAN', name: 'Agri-IoT Sensor', code: 'Smart Farm Telemetry', color: '#80ed99', points: -100, reward: 10, icon: '🌾', testType: 'IWA IoT Pass' }
];

let activeItems = [];

class FallingItem {
  constructor() {
    const diffCfg = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.MEDIUM;
    // 75% chance bug, 25% chance clean code
    const isBug = Math.random() < 0.72;
    const bugPool = ITEM_TYPES.filter(i => i.type === 'BUG');
    const cleanPool = ITEM_TYPES.filter(i => i.type === 'CLEAN');
    const def = isBug ? bugPool[Math.floor(Math.random() * bugPool.length)] : cleanPool[Math.floor(Math.random() * cleanPool.length)];

    this.type = def.type;
    this.name = def.name;
    this.code = def.code;
    this.color = def.color;
    this.points = def.points;
    this.dmg = Math.round((def.dmg || 15) * diffCfg.dmgMultiplier);
    this.reward = def.reward || 10;
    this.icon = def.icon;
    this.testType = def.testType;

    this.w = 170;
    this.h = 75;
    this.x = 80 + Math.random() * (CANVAS_WIDTH - 240);
    this.y = -80;
    this.vx = (Math.random() - 0.5) * 1.2 * diffCfg.speedMultiplier;
    this.vy = (1.6 + Math.random() * 1.8 + (currentLevel * 0.4)) * diffCfg.speedMultiplier;
    this.hp = this.type === 'BUG' ? 1 : 1;
    this.isDead = false;
    this.pulse = 0;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.pulse += 0.08;

    // Bounce horizontally on edges
    if (this.x < 30 || this.x + this.w > CANVAS_WIDTH - 30) {
      this.vx *= -1;
    }

    // Check bottom boundary
    if (this.y > CANVAS_HEIGHT - 30) {
      this.isDead = true;
      if (this.type === 'BUG') {
        // Bug reached production!
        codeQuality = Math.max(0, codeQuality - this.dmg);
        combo = 0;
        addFloatingText(`⚠️ Bug ทะลุสู่ Production! (-${this.dmg}%)`, this.x, CANVAS_HEIGHT - 80, '#ff3366');
        triggerScreenShake();
      } else {
        // Clean code successfully deployed
        score += 80;
        codeQuality = Math.min(100, codeQuality + 5);
        addFloatingText(`🚀 Deploy สำเร็จ! (+80)`, this.x, CANVAS_HEIGHT - 80, '#00ff88');
      }
    }
  }

  draw() {
    ctx.save();
    ctx.translate(this.x + this.w / 2, this.y + this.h / 2);

    const scale = 1 + Math.sin(this.pulse) * 0.03;
    ctx.scale(scale, scale);

    // Card Glow / Shadow
    ctx.shadowColor = this.color;
    ctx.shadowBlur = this.type === 'BUG' ? 18 : 12;

    // Card Background
    ctx.fillStyle = 'rgba(11, 16, 32, 0.92)';
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 2.5;

    roundRect(ctx, -this.w / 2, -this.h / 2, this.w, this.h, 12, true, true);

    // Icon & Header
    ctx.shadowBlur = 0;
    ctx.font = '22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(this.icon, -this.w / 2 + 12, -this.h / 2 + 30);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px "Outfit", "Kanit", sans-serif';
    ctx.fillText(this.name, -this.w / 2 + 42, -this.h / 2 + 26);

    // Code snippet
    ctx.fillStyle = this.color;
    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText(this.code, -this.w / 2 + 14, -this.h / 2 + 48);

    // Badge / Subtext
    ctx.fillStyle = '#94a3b8';
    ctx.font = '10px "Kanit", sans-serif';
    const tag = this.type === 'BUG' ? `[Automated Test: Fix]` : `[Safe Code: Pass]`;
    ctx.fillText(tag, -this.w / 2 + 14, -this.h / 2 + 65);

    ctx.restore();
  }

  contains(px, py) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }
}

// Particle System
function createExplosion(x, y, color, count = 25) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 6;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 3 + Math.random() * 5,
      alpha: 1,
      decay: 0.025 + Math.random() * 0.03
    });
  }
}

function addFloatingText(text, x, y, color = '#ffffff') {
  floatingTexts.push({
    text, x, y, color,
    vy: -1.8,
    alpha: 1,
    scale: 1.2
  });
}

let screenShake = 0;
function triggerScreenShake(amt = 12) {
  screenShake = amt;
}

// Round Rect Helper
function roundRect(context, x, y, w, h, radius, fill, stroke) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + w, y, x + w, y + h, radius);
  context.arcTo(x + w, y + h, x, y + h, radius);
  context.arcTo(x, y + h, x, y, radius);
  context.arcTo(x, y, x + w, y, radius);
  context.closePath();
  if (fill) context.fill();
  if (stroke) context.stroke();
}

// Interaction: Hit Test
function handleZap(x, y) {
  let hit = false;

  for (let i = activeItems.length - 1; i >= 0; i--) {
    const item = activeItems[i];
    if (item.contains(x, y)) {
      hit = true;
      item.isDead = true;

      if (item.type === 'BUG') {
        // Correct target destroyed!
        combo++;
        if (combo > maxCombo) maxCombo = combo;
        const comboBonus = Math.min(combo * 15, 150);
        const gain = item.points + comboBonus;
        score += gain;
        codeQuality = Math.min(100, codeQuality + 4);

        createExplosion(x, y, item.color, 30);
        addFloatingText(`+${gain} [${item.testType} PASSED!]`, x, y - 20, '#00ff88');

        // Play feedback sound synthesis if supported
        playAudioBeep(650 + combo * 40, 0.12, 'sawtooth');
      } else {
        // Hit clean code! (Penalty)
        combo = 0;
        codeQuality = Math.max(0, codeQuality - 20);
        score = Math.max(0, score - 80);
        createExplosion(x, y, '#ff0055', 20);
        addFloatingText(`❌ อย่าทำลาย Clean Code! (-20% Quality)`, x, y - 20, '#ff3366');
        triggerScreenShake(14);
        playAudioBeep(200, 0.25, 'triangle');
      }
      break;
    }
  }

  // Laser zap spark
  createExplosion(x, y, '#00f0ff', 6);
}

// Simple Web Audio API Synthesizer (No external asset dependency)
let audioCtx = null;
function playAudioBeep(freq, duration, type = 'sine') {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // audio policy blocked
  }
}

// Reset Game
function startGame(diffKey) {
  if (diffKey && DIFFICULTY_CONFIG[diffKey]) {
    currentDifficulty = diffKey;
  }
  const diffCfg = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.MEDIUM;

  gameState = 'PLAYING';
  score = 0;
  codeQuality = 100;
  combo = 0;
  maxCombo = 0;
  timeRemaining = diffCfg.time;
  targetSpawnInterval = diffCfg.spawnInterval;
  activeItems = [];
  particles = [];
  floatingTexts = [];
  lastTime = performance.now();
  currentLevel = 1;
}

// Main Game Loop
function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  update(dt, now);
  draw();

  requestAnimationFrame(gameLoop);
}

function update(dt, now) {
  // Screen shake decay
  if (screenShake > 0) screenShake *= 0.88;
  if (screenShake < 0.5) screenShake = 0;

  // Scanline anim
  scanlineY = (scanlineY + 2) % CANVAS_HEIGHT;

  if (gameState === 'PLAYING') {
    // Timer
    timeRemaining -= dt;
    if (timeRemaining <= 0) {
      timeRemaining = 0;
      gameState = codeQuality >= 50 ? 'VICTORY' : 'GAME_OVER';
    }

    if (codeQuality <= 0) {
      codeQuality = 0;
      gameState = 'GAME_OVER';
    }

    // Dynamic difficulty level
    if (timeRemaining < 15) currentLevel = 3;
    else if (timeRemaining < 30) currentLevel = 2;
    else currentLevel = 1;

    // Spawn items
    bugSpawnTimer += dt * 1000;
    const interval = Math.max(380, targetSpawnInterval - currentLevel * 140);
    if (bugSpawnTimer >= interval) {
      bugSpawnTimer = 0;
      activeItems.push(new FallingItem());
    }

    // Update active items
    for (let i = activeItems.length - 1; i >= 0; i--) {
      activeItems[i].update();
      if (activeItems[i].isDead) {
        activeItems.splice(i, 1);
      }
    }
  }

  // Update particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.alpha -= p.decay;
    if (p.alpha <= 0) particles.splice(i, 1);
  }

  // Update floating texts
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i];
    ft.y += ft.vy;
    ft.alpha -= 0.018;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }
}

function draw() {
  ctx.save();

  // Screen shake translation
  if (screenShake > 0) {
    const ox = (Math.random() - 0.5) * screenShake;
    const oy = (Math.random() - 0.5) * screenShake;
    ctx.translate(ox, oy);
  }

  // Clear background
  ctx.fillStyle = '#060913';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw semi-transparent mirrored webcam background when camera is active so player sees themselves
  if (!isMouseMode && video && video.readyState >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.22; // subtle cyberpunk AR overlay
    ctx.translate(CANVAS_WIDTH, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }

  // Draw Hand Skeleton / Hand joints overlay
  drawHandSkeleton();

  // Grid lines
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.04)';
  ctx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y);
    ctx.stroke();
  }

  // Laser Cannon Base Target Area (Production Pipeline at bottom)
  drawProductionPipeline();

  // Draw Falling Bugs & Code
  activeItems.forEach(item => item.draw());

  // Particles
  particles.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // Floating Texts
  floatingTexts.forEach(ft => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, ft.alpha);
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 15px "Kanit", sans-serif';
    ctx.shadowColor = ft.color;
    ctx.shadowBlur = 10;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });

  // Crosshair / Hand Cursor & Laser Beam
  drawCursorAndCrosshair();

  // HUD & UI Overlays
  drawHUD();

  // Screens
  if (gameState === 'START') drawStartScreen();
  else if (gameState === 'GAME_OVER') drawGameOverScreen();
  else if (gameState === 'VICTORY') drawVictoryScreen();

  ctx.restore();
}

function drawProductionPipeline() {
  ctx.save();
  // Bottom safety line
  ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
  ctx.fillRect(0, CANVAS_HEIGHT - 35, CANVAS_WIDTH, 35);

  ctx.strokeStyle = codeQuality > 40 ? '#00f0ff' : '#ff3366';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT - 35);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - 35);
  ctx.stroke();

  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 12px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`🚀 PRODUCTION DEPLOYMENT ZONE (แม่โจ้ Cloud & Server) | ป้องกันไม่ให้ Bug หลุดรอด!`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12);
  ctx.restore();
}

function drawHUD() {
  ctx.save();

  // Top Bar Container
  ctx.fillStyle = 'rgba(11, 15, 25, 0.9)';
  roundRect(ctx, 20, 15, CANVAS_WIDTH - 40, 68, 12, true, false);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  roundRect(ctx, 20, 15, CANVAS_WIDTH - 40, 68, 12, false, true);

  // Score
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Outfit", sans-serif';
  ctx.fillText('SCORE', 40, 36);
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 22px "Outfit", sans-serif';
  ctx.fillText(score.toLocaleString(), 40, 62);

  // Quality First Health Bar
  const barX = 180;
  const barY = 32;
  const barW = 240;
  const barH = 20;

  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px "Kanit", sans-serif';
  ctx.fillText(`CODE QUALITY: ${Math.round(codeQuality)}%`, barX, 25);

  // Bar BG
  ctx.fillStyle = '#1e293b';
  roundRect(ctx, barX, barY, barW, barH, 6, true, false);

  // Bar Fill
  const fillW = Math.max(0, (codeQuality / 100) * barW);
  const barColor = codeQuality > 60 ? '#00ff88' : codeQuality > 30 ? '#ffb703' : '#ff3366';
  ctx.fillStyle = barColor;
  ctx.shadowColor = barColor;
  ctx.shadowBlur = 8;
  roundRect(ctx, barX, barY, fillW, barH, 6, true, false);
  ctx.shadowBlur = 0;

  // Combo
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Outfit", sans-serif';
  ctx.fillText('COMBO', 480, 36);
  ctx.fillStyle = combo > 2 ? '#ff007f' : '#ffffff';
  ctx.font = 'bold 22px "Outfit", sans-serif';
  ctx.fillText(`x${combo}`, 480, 62);

  // Timer
  const timeColor = timeRemaining <= 10 ? '#ff3366' : '#ffffff';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Outfit", sans-serif';
  ctx.fillText('TIME LEFT', 580, 36);
  ctx.fillStyle = timeColor;
  ctx.font = 'bold 22px "Outfit", sans-serif';
  ctx.fillText(`${Math.ceil(timeRemaining)}s`, 580, 62);

  // Level Badge & Control indicator (Far right)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 13px "Kanit", sans-serif';
  ctx.fillText(`⚡ ระดับความเข้มข้น: SDLC ขั้น ${currentLevel}`, CANVAS_WIDTH - 35, 38);
  ctx.fillStyle = '#64748b';
  ctx.font = '11px "Kanit", sans-serif';
  ctx.fillText(handDetected ? '🖐️ กล้อง AI Hand จับการเคลื่อนไหวอยู่' : '🖱️ ควบคุมด้วยเมาส์ / สัมผัส', CANVAS_WIDTH - 35, 60);

  ctx.restore();
}

function drawCursorAndCrosshair() {
  ctx.save();

  // Outer Crosshair Ring
  ctx.strokeStyle = isLaserActive ? '#ff0055' : '#00f0ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = isLaserActive ? '#ff0055' : '#00f0ff';
  ctx.shadowBlur = 12;

  ctx.beginPath();
  ctx.arc(cursorX, cursorY, isLaserActive ? 28 : 22, 0, Math.PI * 2);
  ctx.stroke();

  // Cross lines
  ctx.beginPath();
  ctx.moveTo(cursorX - 32, cursorY);
  ctx.lineTo(cursorX - 10, cursorY);
  ctx.moveTo(cursorX + 10, cursorY);
  ctx.lineTo(cursorX + 32, cursorY);
  ctx.moveTo(cursorX, cursorY - 32);
  ctx.lineTo(cursorX, cursorY - 10);
  ctx.moveTo(cursorX, cursorY + 10);
  ctx.lineTo(cursorX, cursorY + 32);
  ctx.stroke();

  // Center Target Dot
  ctx.fillStyle = isLaserActive ? '#ff0055' : '#ffffff';
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, 4, 0, Math.PI * 2);
  ctx.fill();

  // Laser beam to bottom center cannon when clicking/pinching
  if (isLaserActive) {
    ctx.strokeStyle = 'rgba(255, 0, 85, 0.45)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.lineTo(cursorX, cursorY);
    ctx.stroke();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.lineTo(cursorX, cursorY);
    ctx.stroke();
  }

  ctx.restore();
}

// Modals / Overlays
function drawStartScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.9)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Card Center
  ctx.fillStyle = 'rgba(18, 26, 44, 0.95)';
  ctx.strokeStyle = '#00f0ff';
  ctx.lineWidth = 2;
  roundRect(ctx, 160, 100, CANVAS_WIDTH - 320, 480, 20, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 13px "Outfit", sans-serif';
  ctx.fillText('MAEJO UNIVERSITY • IT CURRICULUM 2027', CANVAS_WIDTH / 2, 145);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Kanit", sans-serif';
  ctx.fillText('🛡️ Bug Buster & Automated Tester', CANVAS_WIDTH / 2, 190);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px "Kanit", sans-serif';
  ctx.fillText('สวมบทเป็น Quality-First Developer ทดสอบระบบอัตโนมัติและกำจัด Bug ก่อนขึ้น Production!', CANVAS_WIDTH / 2, 230);

  // Instructions Box
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, 200, 245, CANVAS_WIDTH - 400, 150, 14, true, false);

  ctx.textAlign = 'left';
  ctx.font = '13px "Kanit", sans-serif';
  ctx.fillStyle = '#ff3366';
  ctx.fillText('🐛 ยิงทำลาย Bug (Syntax Error, Memory Leak, Security) -> ได้คะแนน & Code Quality', 230, 275);
  ctx.fillStyle = '#00ff88';
  ctx.fillText('✨ ปล่อยให้ Clean Code & Green IT ผ่านลงล่าง -> ได้รับโบนัส Deploy สำเร็จ', 230, 310);
  ctx.fillStyle = '#ffb703';
  ctx.fillText('🎮 วิธีเล่น: ใช้เมาส์คลิกยิง หรือ จีบนิ้ว (Pinch Gesture) สั่งยิง Automated Test!', 230, 345);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('⚡ วงรอบทดสอบ: รักษาค่า Code Quality ให้เกิน 50% เพื่อผ่านการประเมิน', 230, 375);

  // Difficulty selection cards on start screen
  const diffCfg = DIFFICULTY_CONFIG[currentDifficulty] || DIFFICULTY_CONFIG.MEDIUM;
  ctx.textAlign = 'center';
  ctx.font = 'bold 13px "Kanit", sans-serif';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('เลือกระดับความยาก (SELECT DIFFICULTY):', CANVAS_WIDTH / 2, 420);

  const diffs = [
    { key: 'EASY', label: '🟢 EASY (ง่าย)', info: '60 วิ · บั๊กตกช้า', x: CANVAS_WIDTH / 2 - 210, col: '#00ff88' },
    { key: 'MEDIUM', label: '🟡 MEDIUM (ปานกลาง)', info: '50 วิ · ความเร็วปกติ', x: CANVAS_WIDTH / 2 - 65, col: '#00f0ff' },
    { key: 'HARD', label: '🔴 HARD (ท้าทาย)', info: '45 วิ · บั๊กดุ/ตกไว', x: CANVAS_WIDTH / 2 + 80, col: '#ff3366' }
  ];

  diffs.forEach(d => {
    const isSelected = currentDifficulty === d.key;
    ctx.fillStyle = isSelected ? 'rgba(18, 40, 60, 0.95)' : 'rgba(11, 16, 32, 0.7)';
    ctx.strokeStyle = isSelected ? d.col : 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = isSelected ? 2.5 : 1;
    if (isSelected) {
      ctx.shadowColor = d.col;
      ctx.shadowBlur = 10;
    }
    roundRect(ctx, d.x, 435, 130, 48, 10, true, true);
    ctx.shadowBlur = 0;

    ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
    ctx.font = 'bold 12px "Kanit", sans-serif';
    ctx.fillText(d.label, d.x + 65, 455);
    ctx.fillStyle = isSelected ? d.col : '#64748b';
    ctx.font = '10px "Kanit", sans-serif';
    ctx.fillText(d.info, d.x + 65, 472);
  });

  // Start Button
  ctx.textAlign = 'center';
  ctx.fillStyle = diffCfg.color;
  ctx.shadowColor = diffCfg.color;
  ctx.shadowBlur = 15;
  roundRect(ctx, CANVAS_WIDTH / 2 - 120, 500, 240, 46, 23, true, false);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#0b0f19';
  ctx.font = 'bold 17px "Kanit", sans-serif';
  ctx.fillText(`🚀 เริ่มภารกิจ [${currentDifficulty}]`, CANVAS_WIDTH / 2, 530);

  ctx.restore();
}

function drawGameOverScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.92)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = 'rgba(28, 16, 24, 0.95)';
  ctx.strokeStyle = '#ff3366';
  ctx.lineWidth = 2;
  roundRect(ctx, 200, 120, CANVAS_WIDTH - 400, 440, 20, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff3366';
  ctx.font = 'bold 32px "Kanit", sans-serif';
  ctx.fillText('💥 Build Failed & Quality Dropped!', CANVAS_WIDTH / 2, 185);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px "Kanit", sans-serif';
  ctx.fillText('ระบบมีบั๊กหลุดรอดมากเกินไป ต้องเสริมทักษะ Automated Testing & DevOps!', CANVAS_WIDTH / 2, 230);

  ctx.font = 'bold 26px "Outfit", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`คะแนนรวม: ${score.toLocaleString()}`, CANVAS_WIDTH / 2, 290);
  ctx.fillStyle = '#ffb703';
  ctx.font = '18px "Kanit", sans-serif';
  ctx.fillText(`Max Combo: x${maxCombo} | Quality สุดท้าย: ${Math.round(codeQuality)}%`, CANVAS_WIDTH / 2, 330);

  // CTA info
  ctx.fillStyle = '#94a3b8';
  ctx.font = '14px "Kanit", sans-serif';
  ctx.fillText('💡 ที่ IT แม่โจ้ เราสอน Unit Test, API Testing และ CI/CD แบบมืออาชีพ!', CANVAS_WIDTH / 2, 380);

  // Restart Button
  ctx.fillStyle = '#ff3366';
  roundRect(ctx, CANVAS_WIDTH / 2 - 110, 430, 220, 48, 24, true, false);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px "Kanit", sans-serif';
  ctx.fillText('🔄 ลองใหม่อีกครั้ง', CANVAS_WIDTH / 2, 460);

  ctx.restore();
}

function drawVictoryScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 9, 19, 0.92)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = 'rgba(14, 30, 24, 0.95)';
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2;
  roundRect(ctx, 200, 100, CANVAS_WIDTH - 400, 480, 20, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 32px "Kanit", sans-serif';
  ctx.fillText('🎉 SDLC & CI/CD Deployment สำเร็จ!', CANVAS_WIDTH / 2, 165);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '16px "Kanit", sans-serif';
  ctx.fillText('ยินดีด้วย! คุณคือ "Quality-First Developer" ตัวจริงของ IT แม่โจ้ 2570', CANVAS_WIDTH / 2, 210);

  ctx.font = 'bold 36px "Outfit", sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText(`${score.toLocaleString()} PTS`, CANVAS_WIDTH / 2, 270);

  ctx.fillStyle = '#00ff88';
  ctx.font = '18px "Kanit", sans-serif';
  ctx.fillText(`Code Quality: ${Math.round(codeQuality)}% (ผ่านเกณฑ์มาตรฐานสากล ISCED 0613)`, CANVAS_WIDTH / 2, 315);
  ctx.fillStyle = '#ffb703';
  ctx.fillText(`Max Combo: x${maxCombo}`, CANVAS_WIDTH / 2, 345);

  // Knowledge highlight
  ctx.fillStyle = 'rgba(0, 240, 255, 0.1)';
  roundRect(ctx, 240, 375, CANVAS_WIDTH - 480, 70, 10, true, false);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px "Kanit", sans-serif';
  ctx.fillText('🌱 หลักสูตร IT แม่โจ้ เน้นทักษะ AI Integration, Cloud Native และ Green IT', CANVAS_WIDTH / 2, 403);
  ctx.fillText('พร้อมก้าวสู่สายงาน Software Tester, DevOps และ Cloud Architect', CANVAS_WIDTH / 2, 425);

  // Restart Button
  ctx.fillStyle = '#00ff88';
  roundRect(ctx, CANVAS_WIDTH / 2 - 110, 475, 220, 48, 24, true, false);
  ctx.fillStyle = '#0b0f19';
  ctx.font = 'bold 16px "Kanit", sans-serif';
  ctx.fillText('🔄 เล่นอีกรอบ (Replay)', CANVAS_WIDTH / 2, 505);

  ctx.restore();
}

// -------------------------------------------------------------
// Mouse & Touch Controls
// -------------------------------------------------------------
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  cursorX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  cursorY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
});

function handleStartScreenClick(x, y) {
  // Check difficulty card clicks
  const diffs = [
    { key: 'EASY', x: CANVAS_WIDTH / 2 - 210 },
    { key: 'MEDIUM', x: CANVAS_WIDTH / 2 - 65 },
    { key: 'HARD', x: CANVAS_WIDTH / 2 + 80 }
  ];

  for (const d of diffs) {
    if (x >= d.x && x <= d.x + 130 && y >= 435 && y <= 483) {
      setDifficulty(d.key);
      playAudioBeep(520, 0.08, 'triangle');
      return true;
    }
  }

  // Check Start Button click
  if (x >= CANVAS_WIDTH / 2 - 120 && x <= CANVAS_WIDTH / 2 + 120 && y >= 500 && y <= 546) {
    startGame();
    return true;
  }

  // Any other click on start screen starts the game
  startGame();
  return true;
}

function setDifficulty(diffKey) {
  if (!DIFFICULTY_CONFIG[diffKey]) return;
  currentDifficulty = diffKey;

  // Update header buttons UI
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.diff === diffKey);
  });
}

// Bind HTML difficulty buttons
document.querySelectorAll('.diff-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const diff = btn.dataset.diff;
    setDifficulty(diff);
    if (gameState === 'PLAYING') {
      startGame(diff);
    }
  });
});

canvas.addEventListener('mousemove', (e) => {
  if (isMouseMode || !handDetected) {
    const rect = canvas.getBoundingClientRect();
    cursorX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    cursorY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  }
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  cursorX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  cursorY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  isLaserActive = true;

  if (gameState === 'START') {
    handleStartScreenClick(cursorX, cursorY);
  } else if (gameState === 'GAME_OVER' || gameState === 'VICTORY') {
    startGame();
  } else if (gameState === 'PLAYING') {
    handleZap(cursorX, cursorY);
  }
});

window.addEventListener('mouseup', () => {
  isLaserActive = false;
});

// Touch event support
canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  cursorX = ((touch.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  cursorY = ((touch.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
}, { passive: false });

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  cursorX = ((touch.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  cursorY = ((touch.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  isLaserActive = true;

  if (gameState === 'START') {
    handleStartScreenClick(cursorX, cursorY);
  } else if (gameState === 'GAME_OVER' || gameState === 'VICTORY') {
    startGame();
  } else if (gameState === 'PLAYING') {
    handleZap(cursorX, cursorY);
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  isLaserActive = false;
}, { passive: false });

restartBtn.addEventListener('click', () => {
  startGame();
});

toggleControlModeBtn.addEventListener('click', () => {
  if (isMouseMode) {
    // Switch to Camera Mode
    switchToCameraMode();
  } else {
    // Switch to Mouse Mode
    switchToMouseMode();
  }
});

function stopCamera() {
  if (cameraInstance) {
    try { cameraInstance.stop(); } catch(e) {}
  }
  if (video && video.srcObject) {
    try {
      video.srcObject.getTracks().forEach(track => track.stop());
    } catch(e) {}
    video.srcObject = null;
  }
  handDetected = false;
  currentHandLandmarks = null;
}

function switchToMouseMode() {
  isMouseMode = true;
  stopCamera();
  toggleControlModeBtn.innerText = '🖱️ โหมด: เมาส์ / สัมผัส (ปิดกล้อง)';
  toggleControlModeBtn.style.color = '#ffb703';
  toggleControlModeBtn.style.borderColor = '#ffb703';
  statusDot.classList.add('active');
  statusText.innerText = '🖱️ โหมดเมาส์ / สัมผัส (ปิดกล้องแล้ว)';
}

function switchToCameraMode() {
  isMouseMode = false;
  toggleControlModeBtn.innerText = '🖐️ โหมด: กล้อง AI Hands';
  toggleControlModeBtn.style.color = '';
  toggleControlModeBtn.style.borderColor = '';
  statusDot.classList.remove('active');
  statusText.innerText = 'กำลังเปิดกล้อง AI Hands...';
  initCamera();
}

// -------------------------------------------------------------
// MediaPipe Hands & Camera Integration
// -------------------------------------------------------------
let lastPinchState = false;
let currentHandLandmarks = null;
let cameraInstance = null;
let handsInstance = null;

// Hand skeleton joint connections
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [0, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [0, 13], [13, 14], [14, 15], [15, 16],// Ring
  [0, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [5, 9], [9, 13], [13, 17]             // Palm base
];

function drawHandSkeleton() {
  if (isMouseMode || !handDetected || !currentHandLandmarks) return;

  ctx.save();

  // Draw bone lines
  ctx.lineWidth = 3;
  ctx.strokeStyle = isLaserActive ? 'rgba(255, 0, 85, 0.65)' : 'rgba(0, 240, 255, 0.55)';
  ctx.shadowColor = isLaserActive ? '#ff0055' : '#00f0ff';
  ctx.shadowBlur = 8;

  for (const [i, j] of HAND_CONNECTIONS) {
    const p1 = currentHandLandmarks[i];
    const p2 = currentHandLandmarks[j];
    if (!p1 || !p2) continue;

    const x1 = (1.0 - p1.x) * CANVAS_WIDTH;
    const y1 = p1.y * CANVAS_HEIGHT;
    const x2 = (1.0 - p2.x) * CANVAS_WIDTH;
    const y2 = p2.y * CANVAS_HEIGHT;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }

  // Draw glowing joint points
  for (let i = 0; i < currentHandLandmarks.length; i++) {
    const p = currentHandLandmarks[i];
    const x = (1.0 - p.x) * CANVAS_WIDTH;
    const y = p.y * CANVAS_HEIGHT;

    ctx.beginPath();
    const isTip = [4, 8, 12, 16, 20].includes(i);
    const radius = isTip ? 5 : 3;

    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = isTip ? (isLaserActive ? '#ffffff' : '#00ff88') : (isLaserActive ? '#ff0055' : '#00f0ff');
    ctx.fill();
  }

  ctx.restore();
}

function onHandResults(results) {
  if (isMouseMode) return;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    currentHandLandmarks = results.multiHandLandmarks[0];
    statusDot.classList.add('active');
    statusText.innerText = '🖐️ จับมือได้แล้ว! (จีบนิ้ว = ยิงบั๊ก)';

    const landmarks = results.multiHandLandmarks[0];
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    // Mirrored coordinates for intuitive interaction
    const rawX = (1.0 - (indexTip.x + thumbTip.x) / 2) * CANVAS_WIDTH;
    const rawY = ((indexTip.y + thumbTip.y) / 2) * CANVAS_HEIGHT;

    // Smooth movement
    cursorX += (rawX - cursorX) * 0.45;
    cursorY += (rawY - cursorY) * 0.45;

    // Calculate pinch distance
    const dx = (landmarks[8].x - landmarks[4].x);
    const dy = (landmarks[8].y - landmarks[4].y);
    const pinchDist = Math.sqrt(dx * dx + dy * dy);

    // Threshold for pinch
    const isPinching = pinchDist < 0.07;
    isLaserActive = isPinching;

    // Trigger hit on pinch down edge
    if (isPinching && !lastPinchState) {
      if (gameState === 'START') {
        handleStartScreenClick(cursorX, cursorY);
      } else if (gameState === 'GAME_OVER' || gameState === 'VICTORY') {
        startGame();
      } else if (gameState === 'PLAYING') {
        handleZap(cursorX, cursorY);
      }
    }
    lastPinchState = isPinching;
  } else {
    handDetected = false;
    currentHandLandmarks = null;
    statusDot.classList.remove('active');
    statusText.innerText = '📷 พร้อมใช้งาน (ใช้มือผ่านกล้อง หรือ คลิกเมาส์เล่นได้ทันที)';
    isLaserActive = false;
  }
}

// Initialize Hands & Camera
function initCamera() {
  if (isMouseMode) return;

  if (!handsInstance && window.Hands) {
    handsInstance = new Hands({
      locateFile: (file) => `../libs/mediapipe/hands/${file}`
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
      statusText.innerText = '📷 กล้องพร้อมใช้งาน (จีบนิ้ว หรือ คลิกเมาส์)';
    }).catch(err => {
      console.warn('Camera not available or blocked, falling back to mouse:', err);
      switchToMouseMode();
    });
  } else {
    switchToMouseMode();
  }
}

// Start with Camera Mode by default
isMouseMode = false;
initCamera();

// Start Game Loop
requestAnimationFrame(gameLoop);
