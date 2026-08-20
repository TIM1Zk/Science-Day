// =========================================================
// EMOJI HAND MIMIC — IT MAEJO OPEN HOUSE 2570
// MediaPipe Multi-Gesture Hand Classification & Pose Matching
// =========================================================

const canvas = document.getElementById('handCanvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('webcam');

const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const modeToggleBtn = document.getElementById('modeToggleBtn');

const scoreVal = document.getElementById('scoreVal');
const timerVal = document.getElementById('timerVal');
const streakVal = document.getElementById('streakVal');
const matchedVal = document.getElementById('matchedVal');

const targetCard = document.getElementById('targetCard');
const targetEmoji = document.getElementById('targetEmoji');
const targetName = document.getElementById('targetName');
const targetHint = document.getElementById('targetHint');

const playerCard = document.getElementById('playerCard');
const detectedEmoji = document.getElementById('detectedEmoji');
const detectedName = document.getElementById('detectedName');
const accuracyFill = document.getElementById('accuracyFill');

const progressRingFill = document.getElementById('progressRingFill');
const holdPercent = document.getElementById('holdPercent');
const matchIndicator = document.getElementById('matchIndicator');

const emojiGridButtons = document.getElementById('emojiGridButtons');
const mousePanel = document.getElementById('mousePanel');

const startScreen = document.getElementById('startScreen');
const btnStartGame = document.getElementById('btnStartGame');

const gameOverScreen = document.getElementById('gameOverScreen');
const finalScore = document.getElementById('finalScore');
const finalMatched = document.getElementById('finalMatched');
const finalMaxStreak = document.getElementById('finalMaxStreak');
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
// AUDIO SYNTHESIZER (Match Success, Countdown & Fanfare)
// =========================================================
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSuccessDing() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // High A5
    osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.15); // A6
    gain.gain.setValueAtTime(0.22, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch(e) {}
}

function playTickSound() {
  if (!audioCtx) return;
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
  } catch(e) {}
}

// =========================================================
// HAND EMOJI GESTURE DEFINITIONS
// =========================================================
const EMOJI_GESTURES = [
  { id: 'THUMBS_UP', emoji: '👍', name: 'ยกนิ้วโป้ง (Thumbs Up)', hint: 'กำมือแล้วยกนิ้วโป้งขึ้นบน' },
  { id: 'VICTORY', emoji: '✌️', name: 'ชูสองนิ้ว (Victory / Peace)', hint: 'ชูนิ้วชี้และนิ้วกลางเป็นรูปตัว V' },
  { id: 'OPEN_PALM', emoji: '🖐️', name: 'แบมือห้านิ้ว (Open Hand)', hint: 'กางนิ้วมือทั้ง 5 นิ้วออกเต็มที่' },
  { id: 'FIST', emoji: '✊', name: 'กำหมัด (Closed Fist)', hint: 'กำนิ้วมือทุกนิ้วเข้าหาฝ่ามือ' },
  { id: 'OK_SIGN', emoji: '👌', name: 'โอเค (OK Sign)', hint: 'จีบนิ้วชี้ชิดนิ้วโป้ง กาง 3 นิ้วที่เหลือ' },
  { id: 'LOVE', emoji: '🤟', name: 'ไอเลิฟยู (Love Gesture)', hint: 'ชูนิ้วโป้ง นิ้วชี้ และนิ้วก้อย' },
  { id: 'POINT_UP', emoji: '☝️', name: 'ชี้หนึ่งนิ้ว (Point Up)', hint: 'ชูเฉพาะนิ้วชี้ขึ้นฟ้าเพียงนิ้วเดียว' },
  { id: 'CALL_ME', emoji: '🤙', name: 'ชูนิ้วโป้ง-ก้อย (Call Me / Shaka)', hint: 'ชูเฉพาะนิ้วโป้งและนิ้วก้อย' }
];

// Populate Mouse Grid Buttons
EMOJI_GESTURES.forEach(g => {
  const btn = document.createElement('button');
  btn.className = 'emoji-btn';
  btn.innerText = `${g.emoji} ${g.name.split(' ')[0]}`;
  btn.title = g.hint;
  btn.addEventListener('click', () => {
    handleDirectEmojiChoice(g.id);
  });
  emojiGridButtons.appendChild(btn);
});

// =========================================================
// GAME CONFIGURATIONS & STATE
// =========================================================
const TOTAL_GAME_TIME = 45; // seconds
const REQUIRED_HOLD_TIME = 550; // ms to lock match
let isPlaying = false;
let score = 0;
let timeLeft = TOTAL_GAME_TIME;
let currentStreak = 0;
let maxStreak = 0;
let totalMatched = 0;
let gameTimerInterval = null;

let currentTarget = null;
let currentDetectedId = null;
let holdStartTime = 0;
let isHoldingMatch = false;

let isMouseMode = false;
let cameraInstance = null;
let handsInstance = null;
let handDetected = false;

// =========================================================
// GESTURE RECOGNITION ALGORITHM (Rule-based Landmark Classifier)
// =========================================================
function classifyHandGesture(landmarks) {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  const thumbMcp = landmarks[2];

  const indexTip = landmarks[8];
  const indexPip = landmarks[6];
  const indexMcp = landmarks[5];

  const middleTip = landmarks[12];
  const middlePip = landmarks[10];
  const middleMcp = landmarks[9];

  const ringTip = landmarks[16];
  const ringPip = landmarks[14];
  const ringMcp = landmarks[13];

  const pinkyTip = landmarks[20];
  const pinkyPip = landmarks[18];
  const pinkyMcp = landmarks[17];

  // Helper: check if finger is extended upward/outward relative to PIP & MCP
  const isIndexOpen = (indexTip.y < indexPip.y) && (indexTip.y < indexMcp.y);
  const isMiddleOpen = (middleTip.y < middlePip.y) && (middleTip.y < middleMcp.y);
  const isRingOpen = (ringTip.y < ringPip.y) && (ringTip.y < ringMcp.y);
  const isPinkyOpen = (pinkyTip.y < pinkyPip.y) && (pinkyTip.y < pinkyMcp.y);

  // Hand Scale
  const handScale = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y) || 0.3;

  // Thumb extended test
  const isThumbOpen = Math.hypot(thumbTip.x - indexMcp.x, thumbTip.y - indexMcp.y) > 0.35 * handScale && (thumbTip.y < thumbMcp.y || Math.abs(thumbTip.x - wrist.x) > 0.4 * handScale);

  // Pinch distance (Thumb tip to Index tip) for OK_SIGN
  const thumbIndexDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y) / handScale;

  // 1. OK SIGN 👌 (Thumb + Index touching, Middle/Ring/Pinky extended)
  if (thumbIndexDist < 0.28 && isMiddleOpen && isRingOpen) {
    return 'OK_SIGN';
  }

  // 2. OPEN PALM 🖐️ (All 5 extended)
  if (isThumbOpen && isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen) {
    return 'OPEN_PALM';
  }

  // 3. FIST ✊ (All curled in)
  if (!isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen && !isThumbOpen) {
    return 'FIST';
  }

  // 4. VICTORY / PEACE ✌️ (Index + Middle open, Ring + Pinky curled)
  if (isIndexOpen && isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return 'VICTORY';
  }

  // 5. THUMBS UP 👍 (Thumb pointing up, other 4 curled)
  if (thumbTip.y < indexMcp.y && !isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen) {
    return 'THUMBS_UP';
  }

  // 6. LOVE 🤟 (Thumb + Index + Pinky open, Middle + Ring curled)
  if (isThumbOpen && isIndexOpen && isPinkyOpen && !isMiddleOpen && !isRingOpen) {
    return 'LOVE';
  }

  // 7. POINT UP ☝️ (Only Index open)
  if (isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen && !isThumbOpen) {
    return 'POINT_UP';
  }

  // 8. CALL ME / SHAKA 🤙 (Thumb + Pinky open, 3 middle fingers curled)
  if (isThumbOpen && isPinkyOpen && !isIndexOpen && !isMiddleOpen && !isRingOpen) {
    return 'CALL_ME';
  }

  return null;
}

// =========================================================
// GAME LOGIC & MATCHING LOOP
// =========================================================
function pickRandomTarget() {
  let nextTarget;
  do {
    nextTarget = EMOJI_GESTURES[Math.floor(Math.random() * EMOJI_GESTURES.length)];
  } while (currentTarget && nextTarget.id === currentTarget.id);

  currentTarget = nextTarget;
  targetEmoji.innerText = currentTarget.emoji;
  targetName.innerText = currentTarget.name;
  targetHint.innerText = currentTarget.hint;

  targetEmoji.classList.remove('pop');
  void targetEmoji.offsetWidth; // Trigger reflow
  targetEmoji.classList.add('pop');

  isHoldingMatch = false;
  holdStartTime = 0;
  updateProgressRing(0);
}

function updateProgressRing(percent) {
  const circleCircumference = 314.159; // 2 * PI * 50
  const offset = circleCircumference - (percent / 100) * circleCircumference;
  progressRingFill.style.strokeDashoffset = offset;
  holdPercent.innerText = `${Math.round(percent)}%`;
}

function processMatching(detectedId) {
  currentDetectedId = detectedId;

  if (detectedId) {
    const gestureObj = EMOJI_GESTURES.find(g => g.id === detectedId);
    if (gestureObj) {
      detectedEmoji.innerText = gestureObj.emoji;
      detectedName.innerText = gestureObj.name;
      accuracyFill.style.width = '100%';
    }
  } else {
    detectedEmoji.innerText = '❓';
    detectedName.innerText = 'กำลังจับท่าทาง...';
    accuracyFill.style.width = '20%';
  }

  if (!isPlaying || !currentTarget) return;

  // Check if detected matches target
  if (detectedId === currentTarget.id) {
    playerCard.classList.add('matched');
    matchIndicator.innerText = '✅ ท่าตรงแล้ว! ค้างไว้...';
    matchIndicator.style.color = '#00ff88';

    if (!isHoldingMatch) {
      isHoldingMatch = true;
      holdStartTime = performance.now();
    }

    const elapsed = performance.now() - holdStartTime;
    const progress = Math.min(100, (elapsed / REQUIRED_HOLD_TIME) * 100);
    updateProgressRing(progress);

    if (progress >= 100) {
      // Completed matching!
      onMatchSuccess();
    }
  } else {
    playerCard.classList.remove('matched');
    isHoldingMatch = false;
    holdStartTime = 0;
    updateProgressRing(0);
    if (detectedId) {
      matchIndicator.innerText = '⚠️ ยังไม่ตรงโจทย์';
      matchIndicator.style.color = '#ffb703';
    } else {
      matchIndicator.innerText = '⏳ ยกมือขึ้นมาหน้ากล้อง';
      matchIndicator.style.color = '#94a3b8';
    }
  }
}

function onMatchSuccess() {
  playSuccessDing();
  totalMatched++;
  currentStreak++;
  if (currentStreak > maxStreak) maxStreak = currentStreak;

  score += 100 + currentStreak * 20; // Streak bonus
  updateHUD();

  confetti({
    particleCount: 50,
    spread: 60,
    origin: { x: 0.5, y: 0.5 }
  });

  pickRandomTarget();
}

function handleDirectEmojiChoice(gestureId) {
  processMatching(gestureId);
}

// =========================================================
// HUD & LIFECYCLE
// =========================================================
function updateHUD() {
  scoreVal.innerText = score;
  timerVal.innerText = Math.max(0, Math.ceil(timeLeft));
  streakVal.innerText = `🔥 x${currentStreak}`;
  matchedVal.innerText = `${totalMatched} ท่า`;
}

function startGame() {
  initAudio();
  isPlaying = true;
  score = 0;
  timeLeft = TOTAL_GAME_TIME;
  currentStreak = 0;
  maxStreak = 0;
  totalMatched = 0;

  updateHUD();
  pickRandomTarget();

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
  finalMatched.innerText = `${totalMatched} ท่า`;
  finalMaxStreak.innerText = `x${maxStreak}`;

  if (score >= 1000) {
    confetti({ particleCount: 160, spread: 85, origin: { y: 0.6 } });
  }

  gameOverScreen.classList.remove('hidden');
}

btnStartGame.addEventListener('click', startGame);
btnRestartGame.addEventListener('click', startGame);

// =========================================================
// DRAW HAND SKELETON (AR Overlay)
// =========================================================
const HAND_CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],
  [0,17]
];

function drawHandSkeleton(landmarks) {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (!landmarks || isMouseMode) return;

  ctx.save();

  // 1. Draw Bones (Neon Lines)
  ctx.lineWidth = 4;
  ctx.strokeStyle = isHoldingMatch ? '#00ff88' : '#8b5cf6';
  ctx.shadowColor = isHoldingMatch ? '#00ff88' : '#8b5cf6';
  ctx.shadowBlur = 12;

  HAND_CONNECTIONS.forEach(([i, j]) => {
    const p1 = landmarks[i];
    const p2 = landmarks[j];
    const x1 = (1.0 - p1.x) * CANVAS_WIDTH;
    const y1 = p1.y * CANVAS_HEIGHT;
    const x2 = (1.0 - p2.x) * CANVAS_WIDTH;
    const y2 = p2.y * CANVAS_HEIGHT;

    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  });

  // 2. Draw Joints (Glowing Nodes)
  landmarks.forEach((p, idx) => {
    const x = (1.0 - p.x) * CANVAS_WIDTH;
    const y = p.y * CANVAS_HEIGHT;

    ctx.beginPath();
    ctx.arc(x, y, [4,8,12,16,20].includes(idx) ? 7 : 4.5, 0, Math.PI * 2);
    ctx.fillStyle = [4,8,12,16,20].includes(idx) ? '#00f0ff' : '#ffffff';
    ctx.shadowColor = '#00f0ff';
    ctx.shadowBlur = 10;
    ctx.fill();
  });

  ctx.restore();
}

// =========================================================
// MEDIAPIPE HANDS REAL-TIME TRACKING
// =========================================================
function onHandResults(results) {
  if (isMouseMode) return;

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    statusDot.classList.add('active');
    statusText.innerText = '🖐️ กล้อง AI กำลังวิเคราะห์ท่าทาง...';

    const landmarks = results.multiHandLandmarks[0];
    drawHandSkeleton(landmarks);

    const gestureId = classifyHandGesture(landmarks);
    processMatching(gestureId);
  } else {
    handDetected = false;
    statusDot.classList.remove('active');
    statusText.innerText = '📷 ไม่พบมือหน้ากล้อง (ยกมือขึ้นมาเลย!)';
    drawHandSkeleton(null);
    processMatching(null);
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
      statusText.innerText = '📷 กล้อง AI พร้อมใช้งาน (ทำท่าตามอิโมจิ)';
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
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function switchToMouseMode() {
  isMouseMode = true;
  stopCamera();
  modeToggleBtn.classList.add('mouse-mode');
  modeToggleBtn.innerText = '🖱️ โหมด: เมาส์ / สัมผัส (ปิดกล้อง)';
  statusDot.classList.add('active');
  statusText.innerText = '🖱️ โหมดเมาส์ / จอสัมผัส (คลิกเลือกท่าที่ตรงกับโจทย์)';
}

function switchToCameraMode() {
  isMouseMode = false;
  modeToggleBtn.classList.remove('mouse-mode');
  modeToggleBtn.innerText = '🖐️ โหมด: กล้อง AI จับท่ามือ';
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

// Start on launch
initCamera();
