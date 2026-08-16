// --- Constants & Config ---
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 650;

// --- DOM Elements ---
const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('gameCanvas');
const canvasCtx = canvasElement.getContext('2d');
const resetBtn = document.getElementById('resetBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const levelSelector = document.getElementById('levelSelector');

// --- Hand Tracking & Smoothing State ---
let pointerX = -100, pointerY = -100; // Pinch midpoint / cursor position
let indexX = -100, indexY = -100;
let thumbX = -100, thumbY = -100;
const SMOOTH_ALPHA = 0.68; // Increased for snappy, responsive tracking (no lag)

let pinchDistance = 999;
let normalizedPinchDist = 999;
let isPinching = false;
let handDetected = false;
let handLostGraceFrames = 0; // Buffer to prevent accidental drops when hand briefly glitches
const MAX_GRACE_FRAMES = 6;


// --- Multilevel Game Configuration & Difficulty Tuning with 3 Variations Each ---
const LEVEL_DEFINITIONS = [
  {
    levelNumber: 1,
    difficulty: 'EASY',
    difficultyBadge: '🟢 ง่าย (Easy)',
    timerSeconds: 0,
    movingBlocks: false,
    variants: [
      {
        variantName: 'ภารกิจ A: สู่แผนก IT',
        title: 'LEVEL 1 (A): IT Rookie (เริ่มต้นสายงาน IT)',
        step1Text: 'STEP 1: FORWARD',
        step1Sub: 'เดินหน้า 1 ก้าว',
        step1Color: '#3a86ff',
        targetSlotHint: 'ต้องการคำสั่งเลี้ยวขวาไปหาเป้าหมาย',
        goalText: 'GOAL: แผนก IT',
        blocks: [
          { id: 'FORWARD', text: 'FORWARD', subtext: 'เดินหน้า 1 ก้าว', color: '#3a86ff' },
          { id: 'TURN_RIGHT', text: 'TURN RIGHT', subtext: 'เลี้ยวขวา หาเป้าหมาย', color: '#ff007f', isCorrect: true },
          { id: 'JUMP', text: 'JUMP', subtext: 'กระโดดข้าม', color: '#8338ec' }
        ],
        successTitle: '🎉 ยินดีต้อนรับสู่สาขา IT! 🎉',
        successSub: 'ยอดเยี่ยม! คุณช่วยหุ่นยนต์เลี้ยวขวาเข้าแผนก IT สำเร็จ!'
      },
      {
        variantName: 'ภารกิจ B: ตรวจสอบ Network',
        title: 'LEVEL 1 (B): Network Link (เชื่อมต่อเน็ตเวิร์ก)',
        step1Text: 'STEP 1: CONNECT LAN',
        step1Sub: 'เสียบสายสัญญาณ LAN',
        step1Color: '#3a86ff',
        targetSlotHint: 'ต้องการคำสั่งส่งสัญญาณ PING',
        goalText: 'GOAL: Router Gateway',
        blocks: [
          { id: 'POWER_OFF', text: 'POWER OFF', subtext: 'ปิดเครื่อง', color: '#e63946' },
          { id: 'PING_IP', text: 'PING IP', subtext: 'ส่งสัญญาณทดสอบ', color: '#ff007f', isCorrect: true },
          { id: 'LOGOUT', text: 'LOGOUT', subtext: 'ออกจากระบบ', color: '#8338ec' }
        ],
        successTitle: '⚡ เครือข่ายออนไลน์สมบูรณ์! ⚡',
        successSub: 'ส่งคำสั่ง PING เชื่อมต่อ Gateway ได้รวดเร็วมาก!'
      },
      {
        variantName: 'ภารกิจ C: เปิดใช้งาน AI',
        title: 'LEVEL 1 (C): AI Activation (เปิดระบบปัญญาประดิษฐ์)',
        step1Text: 'STEP 1: LOAD MODEL',
        step1Sub: 'โหลดฐานข้อมูล AI',
        step1Color: '#3a86ff',
        targetSlotHint: 'ต้องการคำสั่งประมวลผล RUN AI',
        goalText: 'GOAL: AI Assistant',
        blocks: [
          { id: 'SLEEP', text: 'SLEEP', subtext: 'พักการทำงาน', color: '#4a4e69' },
          { id: 'RUN_AI', text: 'RUN AI', subtext: 'ประมวลผลโมเดล', color: '#ff007f', isCorrect: true },
          { id: 'FORMAT_DISK', text: 'FORMAT DISK', subtext: 'ล้างฮาร์ดดิสก์', color: '#e63946' }
        ],
        successTitle: '🤖 AI พร้อมตอบสนองคำสั่ง! 🤖',
        successSub: 'ยอดเยี่ยมมาก! เปิดใช้งานระบบ AI สำเร็จเรียบร้อย!'
      }
    ]
  },
  {
    levelNumber: 2,
    difficulty: 'MEDIUM',
    difficultyBadge: '🟡 ปานกลาง (Medium)',
    timerSeconds: 45,
    movingBlocks: true,
    moveSpeed: 1.3,
    variants: [
      {
        variantName: 'ภารกิจ A: หลบ BUG ในโค้ด',
        title: 'LEVEL 2 (A): Bug Avoidance (หลบสิ่งกีดขวาง & เคลื่อนที่)',
        obstacleType: 'BUG',
        obstacleLabel: 'BUG!',
        step1Text: 'STEP 1: FORWARD',
        step1Sub: 'เดินหน้าเข้าใกล้สิ่งกีดขวาง',
        step1Color: '#3a86ff',
        targetSlotHint: 'พบบั๊ก! ต้องกระโดดข้ามสิ่งกีดขวาง',
        goalText: 'GOAL: เซิร์ฟเวอร์หลัก',
        blocks: [
          { id: 'TURN_LEFT', text: 'TURN LEFT', subtext: 'เลี้ยวซ้าย', color: '#ffb703' },
          { id: 'JUMP', text: 'JUMP', subtext: 'กระโดดข้าม บั๊ก', color: '#8338ec', isCorrect: true },
          { id: 'BACKWARD', text: 'BACKWARD', subtext: 'ถอยหลัง', color: '#e63946' },
          { id: 'WAIT', text: 'WAIT', subtext: 'หยุดรอ 1 วิ', color: '#4a4e69' }
        ],
        successTitle: '⚡ เลื่อนตำแหน่งเป็น IT Specialist! ⚡',
        successSub: 'ยอดเยี่ยม! จับบล็อกลอยและหลบ Bug สำเร็จภายในเวลา!'
      },
      {
        variantName: 'ภารกิจ B: จัดการ Database Crash',
        title: 'LEVEL 2 (B): Database Recovery (กู้คืนฐานข้อมูล)',
        obstacleType: 'DB_ERROR',
        obstacleLabel: 'DATA CORRUPT!',
        step1Text: 'STEP 1: FETCH DATA',
        step1Sub: 'ดึงข้อมูลจาก Backup',
        step1Color: '#3a86ff',
        targetSlotHint: 'พบข้อมูลชนกัน! ต้องสั่ง MERGE SYNC',
        goalText: 'GOAL: Production DB',
        blocks: [
          { id: 'DROP_TABLE', text: 'DROP TABLE', subtext: 'ลบตารางทิ้ง', color: '#d90429' },
          { id: 'MERGE_SYNC', text: 'MERGE SYNC', subtext: 'ผสานข้อมูลสำรอง', color: '#8338ec', isCorrect: true },
          { id: 'CANCEL', text: 'CANCEL', subtext: 'ยกเลิกคำสั่ง', color: '#4a4e69' },
          { id: 'CLOSE_PORT', text: 'CLOSE PORT', subtext: 'ปิดพอร์ต', color: '#ffb703' }
        ],
        successTitle: '💾 กู้คืนฐานข้อมูลสำเร็จ 100%! 💾',
        successSub: 'เฉียบคมมาก! ซิงก์ข้อมูลกู้ระบบ Database ได้ทันท่วงที!'
      },
      {
        variantName: 'ภารกิจ C: ตรวจจับมัลแวร์ในเครือข่าย',
        title: 'LEVEL 2 (C): Malware Isolation (กักกันไฟล์อันตราย)',
        obstacleType: 'MALWARE',
        obstacleLabel: 'MALWARE!',
        step1Text: 'STEP 1: SCAN PACKET',
        step1Sub: 'ตรวจสอบแพ็กเก็ตข้อมูล',
        step1Color: '#3a86ff',
        targetSlotHint: 'พบไฟล์ต้องสงสัย! ต้องสั่ง ISOLATE',
        goalText: 'GOAL: Sandbox Safe Zone',
        blocks: [
          { id: 'EXECUTE', text: 'EXECUTE', subtext: 'เปิดไฟล์ทันที (อันตราย)', color: '#d90429' },
          { id: 'ISOLATE', text: 'ISOLATE', subtext: 'กักกันเข้า Sandbox', color: '#8338ec', isCorrect: true },
          { id: 'FORWARD_ALL', text: 'FORWARD ALL', subtext: 'ส่งต่อให้ทุกคน', color: '#ffb703' },
          { id: 'IGNORE', text: 'IGNORE', subtext: 'เพิกเฉย', color: '#4a4e69' }
        ],
        successTitle: '🛡️ กักกันภัยคุกคามปลอดภัย! 🛡️',
        successSub: 'สุดยอดการรับมือ! กักกัน Malware ป้องกันระบบล่มได้ทันเวลา!'
      }
    ]
  },
  {
    levelNumber: 3,
    difficulty: 'HARD',
    difficultyBadge: '🔴 ยากขั้นสูง (Hard Challenge)',
    isTwoStep: true,
    timerSeconds: 35,
    movingBlocks: true,
    moveSpeed: 2.0,
    variants: [
      {
        variantName: 'ภารกิจ A: ป้องกัน Security Breach',
        title: 'LEVEL 3 (A): Security Breach (แก้วิกฤตระบบ 2 ขั้นตอน)',
        obstacle1Label: 'VIRUS!',
        obstacle2Label: 'FIREWALL!',
        step1Text: 'STEP 1: SCAN VIRUS',
        step1Sub: 'สแกนตรวจจับไวรัส',
        step1Color: '#ffb703',
        target1Hint: 'ขั้น 1: คำสั่งดีบักโค้ด',
        target2Hint: 'ขั้น 2: ปลดล็อก Cloud',
        goalText: 'GOAL: Mainframe Cloud',
        blocks: [
          { id: 'REBOOT', text: 'REBOOT', subtext: 'รีบูตเครื่อง', color: '#3a86ff' },
          { id: 'DEBUG_CODE', text: 'DEBUG CODE', subtext: 'แก้ไขโค้ดบั๊ก (ขั้น 1)', color: '#9d4edd', isCorrectStep1: true },
          { id: 'SHUTDOWN', text: 'SHUTDOWN', subtext: 'ปิดระบบทั้งหมด', color: '#e63946' },
          { id: 'UNLOCK_CLOUD', text: 'UNLOCK CLOUD', subtext: 'ปลดล็อก Cloud (ขั้น 2)', color: '#00ff88', isCorrectStep2: true },
          { id: 'DELETE_ALL', text: 'DELETE ALL', subtext: 'ลบข้อมูลทั้งหมด', color: '#d90429' }
        ],
        successTitle: '👑 IT DIRECTOR PROMOTED! (พิชิตทุกด่าน!) 👑',
        successSub: 'สุดยอดอัจฉริยะ! คุณต่อบล็อก 2 ขั้นตอนสำเร็จและคว้าตำแหน่ง IT Director!'
      },
      {
        variantName: 'ภารกิจ B: กู้ระบบ Cloud Cluster ล่ม',
        title: 'LEVEL 3 (B): Cloud Cluster Failover (กู้ระบบคลาวด์ 2 ขั้นตอน)',
        obstacle1Label: 'SERVER DOWN!',
        obstacle2Label: 'OVERLOAD!',
        step1Text: 'STEP 1: ALERT ADMIN',
        step1Sub: 'แจ้งเตือนสถานะเซิร์ฟเวอร์',
        step1Color: '#ffb703',
        target1Hint: 'ขั้น 1: สลับโหมด FAILOVER',
        target2Hint: 'ขั้น 2: ปรับ SCALE PODS',
        goalText: 'GOAL: Cloud Cluster',
        blocks: [
          { id: 'FAILOVER', text: 'FAILOVER', subtext: 'สลับเซิร์ฟเวอร์สำรอง (ขั้น 1)', color: '#9d4edd', isCorrectStep1: true },
          { id: 'DRAIN_NODE', text: 'DRAIN NODE', subtext: 'ตัดการเชื่อมต่อโหนด', color: '#3a86ff' },
          { id: 'FORCE_STOP', text: 'FORCE STOP', subtext: 'บังคับหยุดทำงาน', color: '#e63946' },
          { id: 'SCALE_PODS', text: 'SCALE PODS', subtext: 'ขยายเครื่องประมวลผล (ขั้น 2)', color: '#00ff88', isCorrectStep2: true },
          { id: 'FACTORY_RESET', text: 'RESET ALL', subtext: 'ล้างค่าโรงงาน', color: '#d90429' }
        ],
        successTitle: '☁️ CLOUD ARCHITECT MASTER! ☁️',
        successSub: 'ระบบกลับมาออนไลน์ 100%! สลับ Failover และ Scale Pods สำเร็จไร้ที่ติ!'
      },
      {
        variantName: 'ภารกิจ C: ต้านการโจมตี Cyber Attack',
        title: 'LEVEL 3 (C): Cyber Defense (รับมือแฮกเกอร์ 2 ขั้นตอน)',
        obstacle1Label: 'DDOS FLOOD!',
        obstacle2Label: 'INTRUSION!',
        step1Text: 'STEP 1: DETECT ATTACK',
        step1Sub: 'ตรวจจับทราฟฟิกผิดปกติ',
        step1Color: '#ffb703',
        target1Hint: 'ขั้น 1: บล็อกไอพี FILTER IP',
        target2Hint: 'ขั้น 2: เข้ารหัส ENCRYPT SSL',
        goalText: 'GOAL: Secure Fortress',
        blocks: [
          { id: 'FILTER_IP', text: 'FILTER IP', subtext: 'กรองและบล็อก IP คนร้าย (ขั้น 1)', color: '#9d4edd', isCorrectStep1: true },
          { id: 'OPEN_ALL_PORTS', text: 'OPEN PORTS', subtext: 'เปิดทุกพอร์ต', color: '#d90429' },
          { id: 'DISCONNECT', text: 'DISCONNECT', subtext: 'ตัดสายเน็ต', color: '#4a4e69' },
          { id: 'CLEAR_LOGS', text: 'CLEAR LOGS', subtext: 'ลบประวัติ Log', color: '#e63946' },
          { id: 'ENCRYPT_SSL', text: 'ENCRYPT SSL', subtext: 'เปิดระบบเข้ารหัสขั้นสูง (ขั้น 2)', color: '#00ff88', isCorrectStep2: true }
        ],
        successTitle: '🛡️ CHIEF SECURITY OFFICER! 🛡️',
        successSub: 'ปกป้องระบบจากแฮกเกอร์ได้สมบูรณ์แบบ! ความปลอดภัยระดับเกรด AAA!'
      }
    ]
  }
];

let currentLevelIndex = 0;
let currentVariantIndex = 0;
let currentLevel = null;


// --- Game Logic State ---
let gameState = 'PLAYING'; // 'PLAYING' | 'WIN' | 'GAMEOVER'
let draggedBlock = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let levelTimeRemaining = 0;
let timerInterval = null;

// --- Animation State ---
let botX = 140;
let botY = 325;
const botTargetX = 860;
let celebrationParticles = [];

// Blocks & Target Slots Data
let blocks = [];
const targetSlot1 = {
  x: 350,
  y: 75,
  w: 160,
  h: 70,
  filledBlock: null
};

const targetSlot2 = {
  x: 530,
  y: 75,
  w: 160,
  h: 70,
  filledBlock: null
};

// DOM Elements Extra
const shuffleBtn = document.getElementById('shuffleBtn');

// Helper to shuffle array
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// --- Level Setup & Switcher ---
function loadLevel(levelIdx, variantIdx = null, randomizeBlocks = true) {
  currentLevelIndex = levelIdx;
  const levelDef = LEVEL_DEFINITIONS[levelIdx];

  // Pick variant: specified or random (different from current if possible)
  if (variantIdx !== null && variantIdx >= 0 && variantIdx < levelDef.variants.length) {
    currentVariantIndex = variantIdx;
  } else {
    // Pick random variant from 3 variants
    const availableIndices = [0, 1, 2];
    currentVariantIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
  }

  const variant = levelDef.variants[currentVariantIndex];

  // Merge level definitions with variant
  currentLevel = {
    ...levelDef,
    ...variant
  };

  gameState = 'PLAYING';
  botX = 140;
  botY = 325;
  draggedBlock = null;
  targetSlot1.filledBlock = null;
  targetSlot2.filledBlock = null;
  celebrationParticles = [];

  // Reset timer
  if (timerInterval) clearInterval(timerInterval);
  if (currentLevel.timerSeconds > 0) {
    levelTimeRemaining = currentLevel.timerSeconds;
    timerInterval = setInterval(() => {
      if (gameState === 'PLAYING') {
        levelTimeRemaining--;
        if (levelTimeRemaining <= 0) {
          gameState = 'GAMEOVER';
          clearInterval(timerInterval);
        }
      }
    }, 1000);
  } else {
    levelTimeRemaining = 0;
  }

  // Setup blocks coordinates & drifting attributes (with shuffled order so answer position changes!)
  const rawBlocks = randomizeBlocks ? shuffleArray(currentLevel.blocks) : currentLevel.blocks;
  const blockCount = rawBlocks.length;
  const cardWidth = blockCount >= 5 ? 150 : 170;
  const spacing = blockCount >= 5 ? 170 : 210;
  const startOffset = Math.max(150, (CANVAS_WIDTH - (blockCount * spacing)) / 2 + 50);

  blocks = rawBlocks.map((b, i) => {
    const startX = startOffset + i * spacing;
    return {
      ...b,
      origX: startX,
      origY: 550,
      x: startX,
      y: 550,
      w: cardWidth,
      h: 70,
      dirX: i % 2 === 0 ? 1 : -1,
      rangeX: 35
    };
  });

  // Update level pills UI
  const pills = levelSelector.querySelectorAll('.level-pill');
  pills.forEach((p, idx) => {
    p.classList.toggle('active', idx === levelIdx);
  });
}

function switchLevel(idx) {
  loadLevel(idx);
}

function shuffleCurrentMission() {
  // Pick a new variant different from current
  const totalVariants = LEVEL_DEFINITIONS[currentLevelIndex].variants.length;
  let nextVariant = (currentVariantIndex + 1) % totalVariants;
  loadLevel(currentLevelIndex, nextVariant, true);
}

function resetGame() {
  // On reset, pick a random variant so children queuing up get fresh puzzles!
  shuffleCurrentMission();
}

resetBtn.addEventListener('click', resetGame);
if (shuffleBtn) {
  shuffleBtn.addEventListener('click', shuffleCurrentMission);
}

// Initial Load Level 0 with random variant
loadLevel(0);

// --- Victory Particles ---
function createCelebrationParticles() {
  celebrationParticles = [];
  for (let i = 0; i < 85; i++) {
    celebrationParticles.push({
      x: CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 350,
      y: CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 120,
      vx: (Math.random() - 0.5) * 14,
      vy: Math.random() * -14 - 4,
      size: Math.random() * 8 + 4,
      color: ['#00f0ff', '#ff007f', '#ffb703', '#00ff88', '#9d4edd'][Math.floor(Math.random() * 5)],
      gravity: 0.35,
      alpha: 1
    });
  }
}

function updateParticles() {
  for (let p of celebrationParticles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += p.gravity;
    p.alpha -= 0.01;
  }
  celebrationParticles = celebrationParticles.filter(p => p.alpha > 0);
}

function drawParticles() {
  for (let p of celebrationParticles) {
    canvasCtx.save();
    canvasCtx.globalAlpha = Math.max(0, p.alpha);
    canvasCtx.fillStyle = p.color;
    canvasCtx.beginPath();
    canvasCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.restore();
  }
}

// --- MediaPipe Hands Setup ---
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});

hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.65,
  minTrackingConfidence: 0.65
});

hands.onResults(onResults);

// Camera setup
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});

camera.start().then(() => {
  statusDot.classList.add('active');
  statusText.textContent = 'กล้องพร้อมทำงาน! ใช้มือหนีบ (Pinch) เพื่อลากบล็อกคำสั่ง';
}).catch(err => {
  statusText.textContent = 'ไม่สามารถเข้าถึงกล้องได้: ' + err.message;
});

// --- Process MediaPipe Results ---
function onResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    handLostGraceFrames = 0;
    const landmarks = results.multiHandLandmarks[0];

    // Key hand landmarks
    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexMcp = landmarks[5]; // Index knuckle (scale baseline)
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];

    // Compute hand scale reference (Distance between Wrist and Middle Knuckle)
    // Scale-invariant reference that works for kids & adults, near & far
    const handSizeRef = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y, (middleMcp.z || 0) - (wrist.z || 0)) || 0.3;

    // Direct 3D distance between thumb tip and index tip
    const raw3DDist = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y,
      (thumbTip.z || 0) - (indexTip.z || 0)
    );

    // Relative pinch ratio (Independent of screen resolution / camera distance)
    normalizedPinchDist = raw3DDist / handSizeRef;

    // Convert mirrored normalized coords to canvas pixels
    const rawIndexX = (1 - indexTip.x) * CANVAS_WIDTH;
    const rawIndexY = indexTip.y * CANVAS_HEIGHT;
    const rawThumbX = (1 - thumbTip.x) * CANVAS_WIDTH;
    const rawThumbY = thumbTip.y * CANVAS_HEIGHT;

    // Cursor position is the MIDPOINT between thumb and index (feels 100% natural when grabbing!)
    const rawMidX = (rawIndexX + rawThumbX) / 2;
    const rawMidY = (rawIndexY + rawThumbY) / 2;

    // Smooth positions with responsive alpha
    if (pointerX < 0) {
      pointerX = rawMidX;
      pointerY = rawMidY;
      indexX = rawIndexX;
      indexY = rawIndexY;
      thumbX = rawThumbX;
      thumbY = rawThumbY;
    } else {
      pointerX += (rawMidX - pointerX) * SMOOTH_ALPHA;
      pointerY += (rawMidY - pointerY) * SMOOTH_ALPHA;
      indexX += (rawIndexX - indexX) * SMOOTH_ALPHA;
      indexY += (rawIndexY - indexY) * SMOOTH_ALPHA;
      thumbX += (rawThumbX - thumbX) * SMOOTH_ALPHA;
      thumbY += (rawThumbY - thumbY) * SMOOTH_ALPHA;
    }

    pinchDistance = Math.hypot(indexX - thumbX, indexY - thumbY);

    // Dynamic Pinch Hysteresis based on normalized ratio
    // Easy to pinch (<= 0.42 of palm size), reliable to hold, easy to release (>= 0.65)
    if (!isPinching) {
      if (normalizedPinchDist < 0.45 || pinchDistance < 55) {
        isPinching = true;
      }
    } else {
      if (normalizedPinchDist > 0.68 && pinchDistance > 75) {
        isPinching = false;
      }
    }

    handleDragAndDrop();
  } else {
    // If hand is lost momentarily, use grace buffer so dragged block doesn't drop instantly
    if (handLostGraceFrames < MAX_GRACE_FRAMES) {
      handLostGraceFrames++;
    } else {
      handDetected = false;
      isPinching = false;
      if (draggedBlock) {
        dropBlock(draggedBlock);
        draggedBlock = null;
      }
    }
  }
}

// --- Drag and Drop Logic ---
function handleDragAndDrop() {
  if (gameState !== 'PLAYING') return;

  // Generous hit padding (35px) so kids don't have to be pixel-perfect
  const HIT_PADDING = 35;

  if (isPinching) {
    if (!draggedBlock) {
      // Find block closest to pointer
      let bestBlock = null;
      let minDistance = 9999;

      for (let b of blocks) {
        // Skip blocks already locked into target slots
        if (targetSlot1.filledBlock === b || targetSlot2.filledBlock === b) continue;

        if (
          pointerX >= b.x - HIT_PADDING &&
          pointerX <= b.x + b.w + HIT_PADDING &&
          pointerY >= b.y - HIT_PADDING &&
          pointerY <= b.y + b.h + HIT_PADDING
        ) {
          const bCenterX = b.x + b.w / 2;
          const bCenterY = b.y + b.h / 2;
          const dist = Math.hypot(pointerX - bCenterX, pointerY - bCenterY);
          if (dist < minDistance) {
            minDistance = dist;
            bestBlock = b;
          }
        }
      }

      if (bestBlock) {
        draggedBlock = bestBlock;
        dragOffsetX = pointerX - bestBlock.x;
        dragOffsetY = pointerY - bestBlock.y;
      }
    } else {
      draggedBlock.x = pointerX - dragOffsetX;
      draggedBlock.y = pointerY - dragOffsetY;
    }
  } else {
    if (draggedBlock) {
      dropBlock(draggedBlock);
      draggedBlock = null;
    }
  }
}

function dropBlock(block) {
  const blockCenterX = block.x + block.w / 2;
  const blockCenterY = block.y + block.h / 2;

  // Single-Step Level (Level 1 & 2)
  if (!currentLevel.isTwoStep) {
    const slotBounds = {
      left: targetSlot1.x - 25,
      right: targetSlot1.x + targetSlot1.w + 25,
      top: targetSlot1.y - 25,
      bottom: targetSlot1.y + targetSlot1.h + 25
    };

    if (
      blockCenterX >= slotBounds.left &&
      blockCenterX <= slotBounds.right &&
      blockCenterY >= slotBounds.top &&
      blockCenterY <= slotBounds.bottom
    ) {
      if (block.isCorrect) {
        block.x = targetSlot1.x;
        block.y = targetSlot1.y;
        targetSlot1.filledBlock = block;
        gameState = 'WIN';
        if (timerInterval) clearInterval(timerInterval);
        createCelebrationParticles();
      } else {
        block.x = block.origX;
        block.y = block.origY;
      }
    } else {
      block.x = block.origX;
      block.y = block.origY;
    }
    return;
  }

  // Two-Step Level (Level 3)
  const slot1Bounds = {
    left: targetSlot1.x - 20,
    right: targetSlot1.x + targetSlot1.w + 20,
    top: targetSlot1.y - 20,
    bottom: targetSlot1.y + targetSlot1.h + 20
  };

  const slot2Bounds = {
    left: targetSlot2.x - 20,
    right: targetSlot2.x + targetSlot2.w + 20,
    top: targetSlot2.y - 20,
    bottom: targetSlot2.y + targetSlot2.h + 20
  };

  if (
    blockCenterX >= slot1Bounds.left &&
    blockCenterX <= slot1Bounds.right &&
    blockCenterY >= slot1Bounds.top &&
    blockCenterY <= slot1Bounds.bottom
  ) {
    if (block.isCorrectStep1) {
      block.x = targetSlot1.x;
      block.y = targetSlot1.y;
      targetSlot1.filledBlock = block;
    } else {
      block.x = block.origX;
      block.y = block.origY;
    }
  } else if (
    blockCenterX >= slot2Bounds.left &&
    blockCenterX <= slot2Bounds.right &&
    blockCenterY >= slot2Bounds.top &&
    blockCenterY <= slot2Bounds.bottom
  ) {
    if (block.isCorrectStep2) {
      block.x = targetSlot2.x;
      block.y = targetSlot2.y;
      targetSlot2.filledBlock = block;
    } else {
      block.x = block.origX;
      block.y = block.origY;
    }
  } else {
    block.x = block.origX;
    block.y = block.origY;
  }

  // Check Level 3 Win condition (both slots filled)
  if (targetSlot1.filledBlock && targetSlot2.filledBlock) {
    gameState = 'WIN';
    if (timerInterval) clearInterval(timerInterval);
    createCelebrationParticles();
  }
}

// Fallback Mouse Control
canvasElement.addEventListener('mousedown', (e) => {
  if (handDetected) return;
  const rect = canvasElement.getBoundingClientRect();
  pointerX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  pointerY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
  isPinching = true;
  handleDragAndDrop();
});

canvasElement.addEventListener('mousemove', (e) => {
  if (handDetected) return;
  const rect = canvasElement.getBoundingClientRect();
  pointerX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  pointerY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
  if (isPinching) {
    handleDragAndDrop();
  }
});

canvasElement.addEventListener('mouseup', () => {
  if (handDetected) return;
  isPinching = false;
  if (draggedBlock) {
    dropBlock(draggedBlock);
    draggedBlock = null;
  }
});

// --- Main Render Loop ---
function render() {
  canvasCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Render Background Grid / Gradient
  const bgGradient = canvasCtx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bgGradient.addColorStop(0, '#13131d');
  bgGradient.addColorStop(1, '#1a1a29');
  canvasCtx.fillStyle = bgGradient;
  canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawBackgroundGrid();

  // Update Moving Blocks Logic for Level 2 & 3
  if (currentLevel.movingBlocks && gameState === 'PLAYING') {
    for (let b of blocks) {
      if (b === draggedBlock || targetSlot1.filledBlock === b || targetSlot2.filledBlock === b) continue;
      b.x += b.dirX * currentLevel.moveSpeed;
      if (b.x > b.origX + b.rangeX) {
        b.x = b.origX + b.rangeX;
        b.dirX = -1;
      } else if (b.x < b.origX - b.rangeX) {
        b.x = b.origX - b.rangeX;
        b.dirX = 1;
      }
    }
  }

  // Top Header / Sequence Bar
  drawSequenceBar();

  // Middle Path, BOT mascot, obstacles/bugs & Goal Flag
  drawPathAndMascot();

  // Bottom Dock Container
  drawBottomDock();

  // Command Blocks
  drawBlocks();

  // Victory Animations
  if (gameState === 'WIN') {
    if (botX < botTargetX - 60) {
      botX += 6;
    }
    updateParticles();
    drawParticles();
    drawVictoryBanner();
  } else if (gameState === 'GAMEOVER') {
    drawGameOverBanner();
  }

  // Cursor Indicators
  drawPointerIndicator();

  requestAnimationFrame(render);
}

// --- Canvas Drawing Helpers ---
function drawRoundedRect(ctx, x, y, width, height, radius, fillStyle, strokeStyle, lineWidth = 1) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();

  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
  ctx.restore();
}

function drawBackgroundGrid() {
  canvasCtx.save();
  canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  canvasCtx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, 0);
    canvasCtx.lineTo(x, CANVAS_HEIGHT);
    canvasCtx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, y);
    canvasCtx.lineTo(CANVAS_WIDTH, y);
    canvasCtx.stroke();
  }
  canvasCtx.restore();
}

function drawSequenceBar() {
  // Container
  drawRoundedRect(canvasCtx, 20, 15, 960, 175, 16, 'rgba(30, 30, 46, 0.85)', 'rgba(0, 240, 255, 0.2)', 1.5);

  // Level Title
  canvasCtx.fillStyle = '#f8f9fa';
  canvasCtx.font = '700 15px "Outfit", "Kanit", sans-serif';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText(currentLevel.title.toUpperCase(), 38, 42);

  // Render Difficulty Badge
  canvasCtx.fillStyle = currentLevel.difficulty === 'EASY' ? '#00ff88' : currentLevel.difficulty === 'MEDIUM' ? '#ffb703' : '#ff007f';
  canvasCtx.font = 'bold 13px "Kanit", sans-serif';
  canvasCtx.fillText(currentLevel.difficultyBadge, 580, 42);

  // Render Countdown Timer if enabled
  if (currentLevel.timerSeconds > 0) {
    const timerColor = levelTimeRemaining <= 10 ? '#e63946' : '#00f0ff';
    drawRoundedRect(canvasCtx, 810, 24, 145, 28, 14, 'rgba(15, 15, 23, 0.85)', timerColor, 1.5);
    canvasCtx.fillStyle = timerColor;
    canvasCtx.font = 'bold 13px "Kanit", sans-serif';
    canvasCtx.fillText(`⏱️ เวลา: ${levelTimeRemaining} วิ`, 828, 43);
  }

  // Single Step UI Layout
  if (!currentLevel.isTwoStep) {
    // STEP 1
    drawRoundedRect(canvasCtx, 120, 68, 180, 70, 12, currentLevel.step1Color, '#00f0ff', 2);
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 15px "Outfit", sans-serif';
    canvasCtx.fillText(currentLevel.step1Text, 135, 98);
    canvasCtx.font = '12px "Kanit", sans-serif';
    canvasCtx.fillText(currentLevel.step1Sub, 135, 120);

    // Arrow 1
    drawArrow(315, 103, 375, 103);

    // STEP 2: Target Slot 1
    const slotBorder = targetSlot1.filledBlock ? '#00ff88' : '#ff007f';
    const slotBg = targetSlot1.filledBlock ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 0, 127, 0.1)';
    drawRoundedRect(canvasCtx, 390, 68, 200, 70, 12, slotBg, slotBorder, 2);

    if (!targetSlot1.filledBlock) {
      canvasCtx.setLineDash([6, 4]);
      drawRoundedRect(canvasCtx, 393, 71, 194, 64, 10, null, '#ff007f', 2);
      canvasCtx.setLineDash([]);
      
      canvasCtx.fillStyle = '#ff007f';
      canvasCtx.font = 'bold 15px "Outfit", sans-serif';
      canvasCtx.fillText('STEP 2: ? [TARGET]', 415, 101);
      canvasCtx.font = '11px "Kanit", sans-serif';
      canvasCtx.fillText(currentLevel.targetSlotHint, 402, 123);
    }

    // Arrow 2
    drawArrow(605, 110, 665, 110);

    // STEP 3: REACH GOAL
    drawRoundedRect(canvasCtx, 680, 75, 180, 70, 12, '#00b4d8', '#00f0ff', 2);
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 15px "Outfit", sans-serif';
    canvasCtx.fillText('STEP 3: GOAL', 705, 105);
    canvasCtx.font = '12px "Kanit", sans-serif';
    canvasCtx.fillText(currentLevel.goalText, 705, 127);

  } else {
    // Two-Step UI Layout for Level 3
    // STEP 1
    drawRoundedRect(canvasCtx, 40, 75, 150, 70, 12, currentLevel.step1Color, '#00f0ff', 2);
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 14px "Outfit", sans-serif';
    canvasCtx.fillText(currentLevel.step1Text, 52, 105);
    canvasCtx.font = '11px "Kanit", sans-serif';
    canvasCtx.fillText(currentLevel.step1Sub, 52, 127);

    drawArrow(200, 110, 235, 110);

    // STEP 2: Target Slot 1
    const border1 = targetSlot1.filledBlock ? '#00ff88' : '#9d4edd';
    const bg1 = targetSlot1.filledBlock ? 'rgba(0, 255, 136, 0.15)' : 'rgba(157, 78, 221, 0.1)';
    drawRoundedRect(canvasCtx, 245, 75, 200, 70, 12, bg1, border1, 2);

    if (!targetSlot1.filledBlock) {
      canvasCtx.setLineDash([6, 4]);
      drawRoundedRect(canvasCtx, 248, 78, 194, 64, 10, null, '#9d4edd', 2);
      canvasCtx.setLineDash([]);
      canvasCtx.fillStyle = '#9d4edd';
      canvasCtx.font = 'bold 14px "Outfit", sans-serif';
      canvasCtx.fillText('STEP 2: ? [ขั้นที่ 1]', 265, 105);
      canvasCtx.font = '11px "Kanit", sans-serif';
      canvasCtx.fillText(currentLevel.target1Hint, 260, 127);
    }

    drawArrow(455, 110, 490, 110);

    // STEP 3: Target Slot 2
    const border2 = targetSlot2.filledBlock ? '#00ff88' : '#ff007f';
    const bg2 = targetSlot2.filledBlock ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 0, 127, 0.1)';
    drawRoundedRect(canvasCtx, 500, 75, 200, 70, 12, bg2, border2, 2);

    if (!targetSlot2.filledBlock) {
      canvasCtx.setLineDash([6, 4]);
      drawRoundedRect(canvasCtx, 503, 78, 194, 64, 10, null, '#ff007f', 2);
      canvasCtx.setLineDash([]);
      canvasCtx.fillStyle = '#ff007f';
      canvasCtx.font = 'bold 14px "Outfit", sans-serif';
      canvasCtx.fillText('STEP 3: ? [ขั้นที่ 2]', 520, 105);
      canvasCtx.font = '11px "Kanit", sans-serif';
      canvasCtx.fillText(currentLevel.target2Hint, 515, 127);
    }

    drawArrow(710, 110, 745, 110);

    // STEP 4: GOAL
    drawRoundedRect(canvasCtx, 755, 75, 150, 70, 12, '#00b4d8', '#00f0ff', 2);
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 14px "Outfit", sans-serif';
    canvasCtx.fillText('GOAL', 790, 105);
    canvasCtx.font = '11px "Kanit", sans-serif';
    canvasCtx.fillText('Mainframe', 785, 127);
  }
}

function drawArrow(fromX, fromY, toX, toY) {
  canvasCtx.save();
  canvasCtx.strokeStyle = '#00f0ff';
  canvasCtx.lineWidth = 4;
  canvasCtx.beginPath();
  canvasCtx.moveTo(fromX, fromY);
  canvasCtx.lineTo(toX, toY);
  canvasCtx.stroke();

  canvasCtx.fillStyle = '#00f0ff';
  canvasCtx.beginPath();
  canvasCtx.moveTo(toX, toY - 8);
  canvasCtx.lineTo(toX + 12, toY);
  canvasCtx.lineTo(toX, toY + 8);
  canvasCtx.fill();
  canvasCtx.restore();
}

function drawPathAndMascot() {
  const pathY = 325;
  drawRoundedRect(canvasCtx, 50, pathY - 25, 900, 50, 25, 'rgba(255, 255, 255, 0.05)', 'rgba(255, 255, 255, 0.1)', 1);

  canvasCtx.save();
  canvasCtx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  canvasCtx.lineWidth = 3;
  canvasCtx.setLineDash([12, 12]);
  canvasCtx.beginPath();
  canvasCtx.moveTo(80, pathY);
  canvasCtx.lineTo(920, pathY);
  canvasCtx.stroke();
  canvasCtx.restore();

  // Draw obstacles based on level
  if (currentLevelIndex === 1) {
    const label = currentLevel.obstacleLabel || 'BUG!';
    drawBugObstacle(500, pathY, label);
  } else if (currentLevelIndex === 2) {
    const label1 = currentLevel.obstacle1Label || 'VIRUS!';
    const label2 = currentLevel.obstacle2Label || 'FIREWALL!';
    drawBugObstacle(380, pathY, label1);
    drawBugObstacle(620, pathY, label2);
  }

  // Draw Mascot BOT & Goal Flag
  drawBotMascot(botX, botY);
  drawITFlag(botTargetX, botY);
}

function drawBugObstacle(x, y, label = 'BUG!') {
  canvasCtx.save();
  canvasCtx.translate(x, y);
  canvasCtx.fillStyle = '#e63946';
  canvasCtx.shadowColor = '#e63946';
  canvasCtx.shadowBlur = 15;
  
  canvasCtx.beginPath();
  canvasCtx.arc(0, -5, 16, 0, Math.PI * 2);
  canvasCtx.fill();

  canvasCtx.strokeStyle = '#e63946';
  canvasCtx.lineWidth = 3;
  canvasCtx.beginPath();
  canvasCtx.moveTo(-6, -20);
  canvasCtx.lineTo(-14, -30);
  canvasCtx.moveTo(6, -20);
  canvasCtx.lineTo(14, -30);
  canvasCtx.stroke();

  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = 'bold 11px "Outfit", sans-serif';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText(label, 0, 24);
  canvasCtx.restore();
}

function drawBotMascot(x, y) {
  canvasCtx.save();
  canvasCtx.translate(x, y);

  canvasCtx.shadowColor = '#00f0ff';
  canvasCtx.shadowBlur = 15;

  canvasCtx.strokeStyle = '#00f0ff';
  canvasCtx.lineWidth = 3;
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, -30);
  canvasCtx.lineTo(0, -42);
  canvasCtx.stroke();

  canvasCtx.fillStyle = '#ff007f';
  canvasCtx.beginPath();
  canvasCtx.arc(0, -44, 6, 0, Math.PI * 2);
  canvasCtx.fill();

  drawRoundedRect(canvasCtx, -30, -30, 60, 55, 12, '#2a2a40', '#00f0ff', 2);
  drawRoundedRect(canvasCtx, -22, -22, 44, 30, 6, '#0f0f17', '#00f0ff', 1);

  canvasCtx.fillStyle = '#00ff88';
  if (gameState === 'WIN') {
    canvasCtx.lineWidth = 3;
    canvasCtx.strokeStyle = '#00ff88';
    canvasCtx.beginPath();
    canvasCtx.arc(-10, -8, 5, Math.PI, 0);
    canvasCtx.stroke();
    canvasCtx.beginPath();
    canvasCtx.arc(10, -8, 5, Math.PI, 0);
    canvasCtx.stroke();
  } else if (gameState === 'GAMEOVER') {
    canvasCtx.strokeStyle = '#e63946';
    canvasCtx.lineWidth = 2;
    canvasCtx.beginPath();
    canvasCtx.moveTo(-14, -12); canvasCtx.lineTo(-6, -4);
    canvasCtx.moveTo(-6, -12); canvasCtx.lineTo(-14, -4);
    canvasCtx.moveTo(6, -12); canvasCtx.lineTo(14, -4);
    canvasCtx.moveTo(14, -12); canvasCtx.lineTo(6, -4);
    canvasCtx.stroke();
  } else {
    canvasCtx.beginPath();
    canvasCtx.arc(-10, -8, 4, 0, Math.PI * 2);
    canvasCtx.arc(10, -8, 4, 0, Math.PI * 2);
    canvasCtx.fill();
  }

  canvasCtx.fillStyle = '#4a4e69';
  canvasCtx.beginPath();
  canvasCtx.ellipse(-20, 27, 10, 6, 0, 0, Math.PI * 2);
  canvasCtx.ellipse(20, 27, 10, 6, 0, 0, Math.PI * 2);
  canvasCtx.fill();

  canvasCtx.shadowBlur = 0;
  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = 'bold 12px "Outfit", sans-serif';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText('BOT-01', 0, 48);

  canvasCtx.restore();
}

function drawITFlag(x, y) {
  canvasCtx.save();
  canvasCtx.translate(x, y);

  canvasCtx.strokeStyle = '#e0e1dd';
  canvasCtx.lineWidth = 4;
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, 30);
  canvasCtx.lineTo(0, -45);
  canvasCtx.stroke();

  const flagGradient = canvasCtx.createLinearGradient(0, -45, 45, -20);
  flagGradient.addColorStop(0, '#ff007f');
  flagGradient.addColorStop(1, '#7000ff');

  canvasCtx.fillStyle = flagGradient;
  canvasCtx.shadowColor = '#ff007f';
  canvasCtx.shadowBlur = 10;
  canvasCtx.beginPath();
  canvasCtx.moveTo(0, -45);
  canvasCtx.lineTo(45, -30);
  canvasCtx.lineTo(0, -15);
  canvasCtx.closePath();
  canvasCtx.fill();

  canvasCtx.shadowBlur = 0;
  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = 'bold 13px "Outfit", sans-serif';
  canvasCtx.fillText('IT', 10, -26);

  canvasCtx.fillStyle = '#4a4e69';
  canvasCtx.beginPath();
  canvasCtx.ellipse(0, 30, 15, 6, 0, 0, Math.PI * 2);
  canvasCtx.fill();

  canvasCtx.restore();
}

function drawBottomDock() {
  drawRoundedRect(canvasCtx, 120, 490, 760, 140, 20, 'rgba(30, 30, 46, 0.9)', 'rgba(255, 255, 255, 0.1)', 1.5);

  canvasCtx.fillStyle = '#a0a0b8';
  canvasCtx.font = '700 15px "Kanit", sans-serif';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText(`🎯 คลังคำสั่ง (${currentLevel.difficultyBadge}) - [${currentLevel.variantName}]: ลากคำสั่งไปวาง`, 145, 520);
}

function drawBlocks() {
  for (let b of blocks) {
    if ((targetSlot1.filledBlock === b || targetSlot2.filledBlock === b) && gameState === 'WIN' && draggedBlock !== b) {
      continue;
    }

    const isBeingDragged = (draggedBlock === b);

    canvasCtx.save();
    if (isBeingDragged) {
      canvasCtx.shadowColor = b.color;
      canvasCtx.shadowBlur = 25;
    }

    drawRoundedRect(canvasCtx, b.x, b.y, b.w, b.h, 12, b.color, isBeingDragged ? '#ffffff' : 'rgba(255, 255, 255, 0.3)', isBeingDragged ? 3 : 1);

    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 14px "Outfit", sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(b.text, b.x + b.w / 2, b.y + 32);

    canvasCtx.font = '11px "Kanit", sans-serif';
    canvasCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    canvasCtx.fillText(b.subtext, b.x + b.w / 2, b.y + 53);

    canvasCtx.restore();
  }
}

function drawVictoryBanner() {
  canvasCtx.save();

  const bannerX = 160;
  const bannerY = 220;
  const bannerW = 680;
  const bannerH = 150;

  drawRoundedRect(canvasCtx, bannerX, bannerY, bannerW, bannerH, 20, 'rgba(15, 15, 23, 0.95)', '#00ff88', 3);

  canvasCtx.shadowColor = '#00ff88';
  canvasCtx.shadowBlur = 20;

  canvasCtx.fillStyle = '#00ff88';
  canvasCtx.font = 'bold 26px "Kanit", sans-serif';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText(currentLevel.successTitle, CANVAS_WIDTH / 2, bannerY + 48);

  canvasCtx.shadowBlur = 0;
  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = '16px "Kanit", sans-serif';
  canvasCtx.fillText(currentLevel.successSub, CANVAS_WIDTH / 2, bannerY + 84);

  // Render Next Level button if not last level
  if (currentLevelIndex < LEVEL_DEFINITIONS.length - 1) {
    drawRoundedRect(canvasCtx, CANVAS_WIDTH / 2 - 80, bannerY + 102, 160, 36, 10, '#00ff88', '#ffffff', 1);
    canvasCtx.fillStyle = '#0f0f17';
    canvasCtx.font = 'bold 15px "Kanit", sans-serif';
    canvasCtx.fillText('ไปด่านถัดไป ➔', CANVAS_WIDTH / 2, bannerY + 125);
  }

  canvasCtx.restore();
}

function drawGameOverBanner() {
  canvasCtx.save();

  const bannerX = 200;
  const bannerY = 230;
  const bannerW = 600;
  const bannerH = 140;

  drawRoundedRect(canvasCtx, bannerX, bannerY, bannerW, bannerH, 20, 'rgba(15, 15, 23, 0.95)', '#e63946', 3);

  canvasCtx.shadowColor = '#e63946';
  canvasCtx.shadowBlur = 20;

  canvasCtx.fillStyle = '#e63946';
  canvasCtx.font = 'bold 26px "Kanit", sans-serif';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText('⏳ หมดเวลา! (TIME UP) ⏳', CANVAS_WIDTH / 2, bannerY + 48);

  canvasCtx.shadowBlur = 0;
  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = '15px "Kanit", sans-serif';
  canvasCtx.fillText('เวลาในด่านนี้หมดลงก่อนที่คุณจะต่อบล็อกสำเร็จ กดรีเซ็ตเพื่อลองใหม่อีกครั้ง!', CANVAS_WIDTH / 2, bannerY + 82);

  drawRoundedRect(canvasCtx, CANVAS_WIDTH / 2 - 70, bannerY + 98, 140, 32, 10, '#e63946', '#ffffff', 1);
  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = 'bold 14px "Kanit", sans-serif';
  canvasCtx.fillText('ลองใหม่อีกครั้ง 🔄', CANVAS_WIDTH / 2, bannerY + 119);

  canvasCtx.restore();
}

// Click handler for Canvas Buttons
canvasElement.addEventListener('click', (e) => {
  const rect = canvasElement.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const clickY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  if (gameState === 'WIN' && currentLevelIndex < LEVEL_DEFINITIONS.length - 1) {
    const btnX = CANVAS_WIDTH / 2 - 80;
    const btnY = 322;
    if (clickX >= btnX && clickX <= btnX + 160 && clickY >= btnY && clickY <= btnY + 36) {
      switchLevel(currentLevelIndex + 1);
    }
  } else if (gameState === 'GAMEOVER') {
    const btnX = CANVAS_WIDTH / 2 - 70;
    const btnY = 328;
    if (clickX >= btnX && clickX <= btnX + 140 && clickY >= btnY && clickY <= btnY + 32) {
      resetGame();
    }
  }
});

function drawPointerIndicator() {
  if (!handDetected && pointerX < 0) return;

  canvasCtx.save();

  if (isPinching) {
    // Glowing line connecting pinch
    canvasCtx.shadowColor = '#ff007f';
    canvasCtx.shadowBlur = 18;

    canvasCtx.strokeStyle = '#ff007f';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.moveTo(indexX > 0 ? indexX : pointerX, indexY > 0 ? indexY : pointerY);
    canvasCtx.lineTo(thumbX > 0 ? thumbX : pointerX, thumbY > 0 ? thumbY : pointerY);
    canvasCtx.stroke();

    // Central Grab Dot (Midpoint)
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.beginPath();
    canvasCtx.arc(pointerX, pointerY, 14, 0, Math.PI * 2);
    canvasCtx.fill();

    canvasCtx.fillStyle = '#ff007f';
    canvasCtx.beginPath();
    canvasCtx.arc(pointerX, pointerY, 9, 0, Math.PI * 2);
    canvasCtx.fill();

    // Finger Tips
    if (indexX > 0) {
      canvasCtx.beginPath();
      canvasCtx.arc(indexX, indexY, 6, 0, Math.PI * 2);
      canvasCtx.fill();
    }
    if (thumbX > 0) {
      canvasCtx.beginPath();
      canvasCtx.arc(thumbX, thumbY, 6, 0, Math.PI * 2);
      canvasCtx.fill();
    }

    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 12px "Outfit", sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('GRAB', pointerX, pointerY - 20);
  } else {
    canvasCtx.shadowColor = '#00ff88';
    canvasCtx.shadowBlur = 12;

    // Hover Indicator
    canvasCtx.fillStyle = 'rgba(0, 255, 136, 0.25)';
    canvasCtx.strokeStyle = '#00ff88';
    canvasCtx.lineWidth = 2.5;

    canvasCtx.beginPath();
    canvasCtx.arc(pointerX, pointerY, 18, 0, Math.PI * 2);
    canvasCtx.fill();
    canvasCtx.stroke();

    canvasCtx.fillStyle = '#00ff88';
    canvasCtx.beginPath();
    canvasCtx.arc(pointerX, pointerY, 5, 0, Math.PI * 2);
    canvasCtx.fill();

    // Dynamic pinch progress ring: shows when finger gets close
    if (normalizedPinchDist < 0.9) {
      const progress = Math.max(0, Math.min(1, (0.9 - normalizedPinchDist) / 0.45));
      canvasCtx.strokeStyle = '#ff007f';
      canvasCtx.lineWidth = 3;
      canvasCtx.beginPath();
      canvasCtx.arc(pointerX, pointerY, 22, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      canvasCtx.stroke();
    }
  }

  canvasCtx.restore();
}

requestAnimationFrame(render);

