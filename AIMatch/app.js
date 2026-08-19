// ==========================================
// AI PROMPT & LOGIC MATCH (IT แม่โจ้ 2570)
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

// Game State
let gameState = 'START'; // 'START', 'PLAYING', 'ROUND_SUCCESS', 'VICTORY'
let currentRound = 0;
let score = 0;
let totalScore = 0;
let roundTimer = 35; // 35s per scenario
let lastTime = performance.now();
let handDetected = false;

// Motion / Tracking State
let cursorX = CANVAS_WIDTH / 2;
let cursorY = CANVAS_HEIGHT / 2;
let isGrabbing = false;
let draggedCard = null;

// Audio & FX
let particles = [];
let floatingTexts = [];

// Large Pool of Diverse Scenarios (IT แม่โจ้ 2570)
const ALL_SCENARIO_POOL = [
  {
    title: 'ภารกิจ: ระบบ AI ตรวจจับโรคพืช & พ่นชีวภัณฑ์',
    category: 'Smart Agri-Tech (IWA & BCG Model)',
    story: 'เกษตรกรต้องการระบบตรวจจับศัตรูพืชบนแปลงผัก และสั่งการโดรนบินพ่นสารชีวภาพเฉพาะจุดอัตโนมัติ!',
    targetSlots: [
      { id: 'AI_MODEL', title: '1. โมเดล AI ตรวจสอบภาพ', hint: 'ต้องการ AI Computer Vision', matched: null, requiredTag: 'CV' },
      { id: 'INFRA', title: '2. คลาวด์รับ-ส่งสัญญาณ IoT', hint: 'ต้องการระบบ Edge / Cloud Node', matched: null, requiredTag: 'CLOUD' },
      { id: 'ACTION', title: '3. อุปกรณ์สั่งการภาคสนาม', hint: 'ต้องการหุ่นยนต์/โดรนพ่นยา', matched: null, requiredTag: 'IOT' }
    ],
    cards: [
      { id: 'c1', text: 'Computer Vision (YOLOv11)', tag: 'CV', icon: '👁️', color: '#00f0ff', desc: 'โมเดลตรวจจับใบพืชและวิเคราะห์โรค' },
      { id: 'c2', text: 'Cloud IoT Edge Node', tag: 'CLOUD', icon: '☁️', color: '#8338ec', desc: 'ส่งคำสั่ง Real-time ผ่านแม่โจ้ Cloud' },
      { id: 'c3', text: 'Agri-Drone Sprayer (IoT)', tag: 'IOT', icon: '🛸', color: '#00ff88', desc: 'โดรนเกษตรอัจฉริยะบินพ่นเฉพาะจุด' },
      { id: 'c4', text: 'NFT Digital Artwork', tag: 'MISC', icon: '🎨', color: '#ff007f', desc: 'เหรียญสะสมงานศิลป์ (ไม่ตรงโจทย์)' },
      { id: 'c5', text: 'Legacy FTP Protocol', tag: 'MISC', icon: '💾', color: '#ffb703', desc: 'โปรโตคอลโอนไฟล์แบบเก่า (ไม่ตรงโจทย์)' }
    ]
  },
  {
    title: 'ภารกิจ: สกัดกั้นแฮกเกอร์ & Cyber Defense',
    category: 'Cyber Security & Automated Pen-Testing',
    story: 'เซิร์ฟเวอร์ระบบถูกโจมตีด้วย SQL Injection และพยายามขโมยข้อมูลลับ! ต้องวางระบบป้องกันทันที',
    targetSlots: [
      { id: 'SEC_AI', title: '1. AI ตรวจจับพฤติกรรมผิดปกติ', hint: 'ต้องการ AI Anomaly Defense', matched: null, requiredTag: 'SEC_AI' },
      { id: 'FIREWALL', title: '2. ปราการกั้น Web Traffic', hint: 'ต้องการ Firewall สกัด Injection', matched: null, requiredTag: 'FIREWALL' },
      { id: 'TESTER', title: '3. ระบบทดสอบความปลอดภัย', hint: 'ต้องการ Security Pen-Test Scanner', matched: null, requiredTag: 'PEN_TEST' }
    ],
    cards: [
      { id: 'c1', text: 'AI Threat Detector', tag: 'SEC_AI', icon: '🛡️', color: '#00f0ff', desc: 'AI วิเคราะห์ Log ตรวจจับพฤติกรรมบุกรุก' },
      { id: 'c2', text: 'Web App Firewall (WAF)', tag: 'FIREWALL', icon: '🧱', color: '#ff007f', desc: 'กรองและบล็อกการโจมตี SQL/XSS ทันที' },
      { id: 'c3', text: 'Automated Pen-Tester', tag: 'PEN_TEST', icon: '🔍', color: '#00ff88', desc: 'ทดสอบเจาะช่องโหว่อัตโนมัติทุก 24 ชม.' },
      { id: 'c4', text: 'Simple Password Book', tag: 'MISC', icon: '🔑', color: '#ffb703', desc: 'สมุดจดรหัสผ่าน (เสี่ยงข้อมูลรั่ว)' },
      { id: 'c5', text: 'Banner Popup Ad', tag: 'MISC', icon: '📢', color: '#8338ec', desc: 'ป๊อปอัปโฆษณา (ไม่ตรงโจทย์)' }
    ]
  },
  {
    title: 'ภารกิจ: ท่อส่งมอบโค้ดอัตโนมัติ AI DevOps',
    category: 'Quality-First Developer & CI/CD',
    story: 'ทีมนักพัฒนากว่า 20 คนต้องการระบบที่ Push โค้ดปุ๊บ มี AI ตรวจสอบ Unit Test และขึ้น Production ทันที!',
    targetSlots: [
      { id: 'AI_DEV', title: '1. AI Unit Test & Linting', hint: 'ต้องการ AI ตรวจสอบโค้ด', matched: null, requiredTag: 'AI_DEV' },
      { id: 'PIPELINE', title: '2. ท่อส่งอัตโนมัติ CI/CD', hint: 'ต้องการระบบ CI/CD Automation', matched: null, requiredTag: 'CICD' },
      { id: 'CONTAINER', title: '3. โครงสร้าง Cloud Native', hint: 'ต้องการ Kubernetes / Container', matched: null, requiredTag: 'CLOUD_NATIVE' }
    ],
    cards: [
      { id: 'c1', text: 'AI Test Automation', tag: 'AI_DEV', icon: '🤖', color: '#00f0ff', desc: 'AI เขียนและรัน Unit Test ครบ 100%' },
      { id: 'c2', text: 'CI/CD Pipeline Engine', tag: 'CICD', icon: '⚡', color: '#ffb703', desc: 'ทดสอบและ Build ระบบอัตโนมัติเมื่อ Merge' },
      { id: 'c3', text: 'Kubernetes Cluster', tag: 'CLOUD_NATIVE', icon: '☸️', color: '#00ff88', desc: 'จัดสรร Container ทำงานบน Cloud แบบ Auto-scale' },
      { id: 'c4', text: 'Manual USB Flash Drive', tag: 'MISC', icon: '💾', color: '#ff007f', desc: 'ก๊อปปี้โค้ดผ่านแฟลชไดรฟ์ (เสี่ยงบั๊ก)' },
      { id: 'c5', text: 'Word Document Log', tag: 'MISC', icon: '📄', color: '#8338ec', desc: 'จดบันทึกเวอร์ชันด้วยมือ (ล้าสมัย)' }
    ]
  },
  {
    title: 'ภารกิจ: Green IT ศูนย์ดาต้าเซ็นเตอร์ประหยัดพลังงาน',
    category: 'Green IT & Low Carbon Architecture',
    story: 'องค์กรต้องการลดการปล่อยคาร์บอนและประหยัดพลังงาน Data Center ด้วยอัลกอริทึมจัดการทรัพยากรสีเขียว!',
    targetSlots: [
      { id: 'ALGO', title: '1. อัลกอริทึม Green Compute', hint: 'ต้องการระบบคำนวณคาร์บอนต่ำ', matched: null, requiredTag: 'GREEN_ALGO' },
      { id: 'POWER', title: '2. แหล่งพลังงานหมุนเวียน', hint: 'ต้องการระบบ Solar Smart Grid', matched: null, requiredTag: 'SOLAR' },
      { id: 'MONITOR', title: '3. Dashboard ติดตาม ESG', hint: 'ต้องการระบบแสดงผล Carbon Footprint', matched: null, requiredTag: 'ESG_DASH' }
    ],
    cards: [
      { id: 'c1', text: 'Eco-Cloud Optimizer', tag: 'GREEN_ALGO', icon: '🌱', color: '#00ff88', desc: 'ลดการใช้ CPU เกินจำเป็นเพื่อประหยัดไฟ' },
      { id: 'c2', text: 'Smart Solar Grid IoT', tag: 'SOLAR', icon: '☀️', color: '#ffb703', desc: 'จ่ายไฟพลังงานแสงอาทิตย์เข้า Server Node' },
      { id: 'c3', text: 'Carbon ESG Dashboard', tag: 'ESG_DASH', icon: '📊', color: '#00f0ff', desc: 'รายงานการลดคาร์บอนตามมาตรฐาน BCG' },
      { id: 'c4', text: 'Diesel Generator', tag: 'MISC', icon: '⛽', color: '#ff007f', desc: 'เครื่องปั่นไฟดีเซลควันดำ (สร้างมลพิษ)' },
      { id: 'c5', text: 'Bitcoin Proof-of-Work', tag: 'MISC', icon: '⛏️', color: '#8338ec', desc: 'ขุดเหรียญผลาญพลังงานสูง (ขัดกับ Green IT)' }
    ]
  },
  {
    title: 'ภารกิจ: ระบบผู้ช่วยแพทย์ตรวจเอกซเรย์ด้วย AI',
    category: 'Intelligent Well-being (IWA) & Health-Tech',
    story: 'โรงพยาบาลต้องการระบบตรวจจับความผิดปกติของปอดจากภาพ X-Ray และแจ้งเตือนหมออย่างแม่นยำและปลอดภัย',
    targetSlots: [
      { id: 'VISION', title: '1. โมเดล Deep Learning ทางแพทย์', hint: 'ต้องการ AI วิเคราะห์ภาพ X-Ray', matched: null, requiredTag: 'MED_AI' },
      { id: 'SECURITY', title: '2. ระบบคุ้มครองข้อมูลคนไข้ PDPA', hint: 'ต้องการระบบเข้ารหัส Data Encryption', matched: null, requiredTag: 'PDPA_SEC' },
      { id: 'APP', title: '3. แอปพลิเคชันหมอ & พยาบาล', hint: 'ต้องการระบบแจ้งเตือน Real-time', matched: null, requiredTag: 'MED_APP' }
    ],
    cards: [
      { id: 'c1', text: 'Medical Vision AI', tag: 'MED_AI', icon: '🩻', color: '#00f0ff', desc: 'ตรวจจับรอยโรคในปอดแม่นยำ 99%' },
      { id: 'c2', text: 'End-to-End PDPA Encrypt', tag: 'PDPA_SEC', icon: '🔒', color: '#8338ec', desc: 'เข้ารหัสข้อมูลคนไข้ตามกฎหมาย PDPA' },
      { id: 'c3', text: 'Doctor Real-time Alert', tag: 'MED_APP', icon: '📱', color: '#00ff88', desc: 'แจ้งเตือนผลวิเคราะห์ด่วนถึงมือถือแพทย์' },
      { id: 'c4', text: 'Public Social Media Post', tag: 'MISC', icon: '🌐', color: '#ff007f', desc: 'โพสต์รูปคนไข้ลงโซเชียล (ผิดกฎหมาย PDPA)' },
      { id: 'c5', text: 'Unsecured Bluetooth', tag: 'MISC', icon: '📶', color: '#ffb703', desc: 'บลูทูธไม่เข้ารหัส (เสี่ยงโดนดักฟัง)' }
    ]
  },
  {
    title: 'ภารกิจ: ระบบ Smart Logistic รถขนส่งผลผลิตไร้คนขับ',
    category: 'Autonomous Systems & Edge AI',
    story: 'ฟาร์มแม่โจ้ต้องการรถลำเลียงผลผลิตเกษตรอัตโนมัติ วิ่งตามเส้นทางหลบสิ่งกีดขวางและรายงานผลเข้าส่วนกลาง',
    targetSlots: [
      { id: 'LIDAR', title: '1. เซนเซอร์ระบุตำแหน่ง & LiDAR', hint: 'ต้องการระบบสแกนสิ่งกีดขวาง', matched: null, requiredTag: 'LIDAR' },
      { id: 'NAV_AI', title: '2. อัลกอริทึมนำทางหลบหลีก', hint: 'ต้องการ AI วางเส้นทาง Pathfinding', matched: null, requiredTag: 'PATH_AI' },
      { id: 'FLEET', title: '3. แดชบอร์ดติดตามยานพาหนะ', hint: 'ต้องการ Fleet Management GPS', matched: null, requiredTag: 'FLEET_SYS' }
    ],
    cards: [
      { id: 'c1', text: 'LiDAR 3D Sensor', tag: 'LIDAR', icon: '📡', color: '#00f0ff', desc: 'ตรวจจับวัตถุรอบคัน 360 องศาแบบ Real-time' },
      { id: 'c2', text: 'Autonomous Pathfinding AI', tag: 'PATH_AI', icon: '🧠', color: '#8338ec', desc: 'คำนวณเส้นทางหลบคนและสิ่งกีดขวาง' },
      { id: 'c3', text: 'IoT Fleet Cloud Portal', tag: 'FLEET_SYS', icon: '🚚', color: '#00ff88', desc: 'ติดตามพิกัดและสถานะแบตเตอรี่รถทุกคัน' },
      { id: 'c4', text: 'Paper Map Guide', tag: 'MISC', icon: '🗺️', color: '#ffb703', desc: 'แผนที่กระดาษพับ (ใช้กับรถไร้คนขับไม่ได้)' },
      { id: 'c5', text: 'Toy Car Remote', tag: 'MISC', icon: '🎮', color: '#ff007f', desc: 'รีโมทของเล่นสัญญาณสั้น (ไม่เสถียร)' }
    ]
  }
];

// Active game scenarios for current playthrough (Randomly chosen)
let activeGameScenarios = [];
const ROUNDS_PER_GAME = 3;

// Layout Calculations for Slots & Cards with Shuffling
function initScenarioLayout(roundIdx) {
  const scenario = activeGameScenarios[roundIdx];
  if (!scenario) return;

  // Randomize slot order horizontally to prevent memorization!
  const slots = [...scenario.targetSlots];
  slots.sort(() => Math.random() - 0.5);

  slots.forEach((slot, i) => {
    slot.x = 80 + i * 320;
    slot.y = 200;
    slot.w = 300;
    slot.h = 150;
    slot.matched = null;
  });
  scenario.targetSlots = slots;

  // Shuffle cards order and randomize positions
  const cards = [...scenario.cards];
  cards.sort(() => Math.random() - 0.5);

  cards.forEach((card, i) => {
    card.w = 180;
    card.h = 140;
    card.origX = 60 + i * 200;
    card.origY = 480;
    card.x = card.origX;
    card.y = card.origY;
    card.isPlaced = false;
  });

  scenario.placedCards = cards;
}

// Particle & Sound
function createSparkles(x, y, color, count = 20) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4.5;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      color,
      size: 3 + Math.random() * 4,
      alpha: 1,
      decay: 0.025
    });
  }
}

function addFloatingText(text, x, y, color = '#ffffff') {
  floatingTexts.push({ text, x, y, color, vy: -1.5, alpha: 1 });
}

let audioCtx = null;
function playTone(freq, duration, type = 'sine') {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {}
}

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

// -------------------------------------------------------------
// Drag & Drop Mechanics
// -------------------------------------------------------------
function handleGrabStart(x, y) {
  const scenario = activeGameScenarios[currentRound];
  if (!scenario || !scenario.placedCards) return;

  // Check cards from top to bottom
  for (let i = scenario.placedCards.length - 1; i >= 0; i--) {
    const card = scenario.placedCards[i];
    if (x >= card.x && x <= card.x + card.w && y >= card.y && y <= card.y + card.h) {
      draggedCard = card;
      draggedCard.offsetX = x - card.x;
      draggedCard.offsetY = y - card.y;

      // If card was in a slot, unbind
      scenario.targetSlots.forEach(s => {
        if (s.matched === card) s.matched = null;
      });

      // Move to top of render array
      scenario.placedCards.splice(i, 1);
      scenario.placedCards.push(card);
      playTone(520, 0.08, 'triangle');
      break;
    }
  }
}

function handleGrabMove(x, y) {
  if (draggedCard) {
    draggedCard.x = x - (draggedCard.offsetX || draggedCard.w / 2);
    draggedCard.y = y - (draggedCard.offsetY || draggedCard.h / 2);
  }
}

function handleGrabEnd() {
  if (!draggedCard) return;

  const scenario = activeGameScenarios[currentRound];
  let droppedInSlot = false;

  // Check intersection with target slots
  for (const slot of scenario.targetSlots) {
    const cardCenterX = draggedCard.x + draggedCard.w / 2;
    const cardCenterY = draggedCard.y + draggedCard.h / 2;

    if (
      cardCenterX >= slot.x && cardCenterX <= slot.x + slot.w &&
      cardCenterY >= slot.y && cardCenterY <= slot.y + slot.h
    ) {
      if (draggedCard.tag === slot.requiredTag) {
        // Correct match!
        slot.matched = draggedCard;
        draggedCard.x = slot.x + (slot.w - draggedCard.w) / 2;
        draggedCard.y = slot.y + 10;
        droppedInSlot = true;

        createSparkles(cardCenterX, cardCenterY, '#00ff88', 25);
        addFloatingText('✨ จับคู่โมดูลสำเร็จ! (+150 PTS)', cardCenterX - 60, slot.y - 15, '#00ff88');
        score += 150;
        playTone(784, 0.18, 'sine');

        // Check if all 3 slots filled
        checkRoundCompletion();
      } else {
        // Incorrect match!
        droppedInSlot = false;
        createSparkles(cardCenterX, cardCenterY, '#ff3366', 15);
        addFloatingText('❌ โมดูลไม่ตรงกับความต้องการของสถาปัตยกรรม', cardCenterX - 90, slot.y - 15, '#ff3366');
        playTone(220, 0.2, 'sawtooth');
      }
      break;
    }
  }

  if (!droppedInSlot) {
    // Snap back to initial deck
    draggedCard.x = draggedCard.origX;
    draggedCard.y = draggedCard.origY;
  }

  draggedCard = null;
}

function checkRoundCompletion() {
  const scenario = activeGameScenarios[currentRound];
  const allMatched = scenario.targetSlots.every(s => s.matched !== null);

  if (allMatched) {
    const timeBonus = Math.round(roundTimer * 10);
    score += timeBonus;
    totalScore += score;

    createSparkles(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#00f0ff', 60);
    playTone(987, 0.3, 'sine');

    setTimeout(() => {
      if (currentRound + 1 < activeGameScenarios.length) {
        currentRound++;
        initScenarioLayout(currentRound);
        roundTimer = 35;
        gameState = 'PLAYING';
      } else {
        gameState = 'VICTORY';
      }
    }, 1200);
  }
}

let isTimeoutProcessing = false;
function handleRoundTimeout() {
  if (isTimeoutProcessing || gameState !== 'PLAYING') return;
  isTimeoutProcessing = true;
  gameState = 'ROUND_TIMEOUT';

  // Release any currently dragged card
  if (draggedCard) {
    draggedCard.x = draggedCard.origX;
    draggedCard.y = draggedCard.origY;
    draggedCard = null;
  }
  isGrabbing = false;

  const scenario = activeGameScenarios[currentRound];
  if (scenario) {
    // Auto-reveal and snap remaining matching cards into empty slots
    scenario.targetSlots.forEach(slot => {
      if (!slot.matched && scenario.placedCards) {
        const correctCard = scenario.placedCards.find(c => c.tag === slot.requiredTag && !c.isPlaced);
        if (correctCard) {
          slot.matched = correctCard;
          correctCard.x = slot.x + (slot.w - correctCard.w) / 2;
          correctCard.y = slot.y + 10;
          correctCard.isPlaced = true;
        }
      }
    });
  }

  createSparkles(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, '#ff3366', 40);
  addFloatingText('⏰ หมดเวลาในภารกิจนี้!', CANVAS_WIDTH / 2 - 80, 220, '#ff3366');
  playTone(220, 0.4, 'sawtooth');

  setTimeout(() => {
    isTimeoutProcessing = false;
    if (currentRound + 1 < activeGameScenarios.length) {
      currentRound++;
      initScenarioLayout(currentRound);
      roundTimer = 35;
      gameState = 'PLAYING';
    } else {
      gameState = 'VICTORY';
    }
  }, 2200);
}

function startMatchGame() {
  gameState = 'PLAYING';
  currentRound = 0;
  score = 0;
  totalScore = 0;
  roundTimer = 35;
  particles = [];
  floatingTexts = [];

  // Randomly select ROUNDS_PER_GAME scenarios from pool on each playthrough
  const poolClone = JSON.parse(JSON.stringify(ALL_SCENARIO_POOL));
  poolClone.sort(() => Math.random() - 0.5);
  activeGameScenarios = poolClone.slice(0, ROUNDS_PER_GAME);

  initScenarioLayout(0);
}

// -------------------------------------------------------------
// Render & Game Loop
// -------------------------------------------------------------
function gameLoop(now) {
  const dt = (now - lastTime) / 1000;
  lastTime = now;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

function update(dt) {
  if (gameState === 'PLAYING') {
    roundTimer -= dt;
    if (roundTimer <= 0) {
      roundTimer = 0;
      handleRoundTimeout();
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
    ft.alpha -= 0.02;
    if (ft.alpha <= 0) floatingTexts.splice(i, 1);
  }
}

function draw() {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background
  ctx.fillStyle = '#060814';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Draw semi-transparent mirrored webcam background when camera is active so player sees themselves
  if (video && video.readyState >= 2) {
    ctx.save();
    ctx.globalAlpha = 0.22; // subtle cyberpunk AR overlay
    ctx.translate(CANVAS_WIDTH, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }

  // Draw Hand Skeleton / Hand joints overlay
  drawHandSkeleton();

  // Tech Grid lines
  ctx.strokeStyle = 'rgba(131, 56, 236, 0.05)';
  ctx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, CANVAS_HEIGHT);
    ctx.stroke();
  }

  if (gameState === 'PLAYING' || gameState === 'ROUND_TIMEOUT') {
    drawHUD();
    drawScenarioBoard();
  }

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
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  });

  // Hand / Pointer Cursor
  drawCursor();

  // Screens
  if (gameState === 'START') drawStartScreen();
  else if (gameState === 'VICTORY') drawVictoryScreen();
}

function drawHUD() {
  ctx.save();
  const scenario = activeGameScenarios[currentRound];
  if (!scenario) {
    ctx.restore();
    return;
  }

  // Header Box
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  roundRect(ctx, 20, 15, CANVAS_WIDTH - 40, 68, 12, true, false);
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.25)';
  roundRect(ctx, 20, 15, CANVAS_WIDTH - 40, 68, 12, false, true);

  // Left Section: Scenario & Mission Title
  ctx.textAlign = 'left';
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 11px "Outfit", sans-serif';
  ctx.fillText(`SCENARIO ${currentRound + 1} / ${activeGameScenarios.length}`, 35, 36);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 17px "Kanit", sans-serif';
  ctx.fillText(scenario.title, 35, 62);

  // Middle-Right: Score
  ctx.textAlign = 'center';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Outfit", sans-serif';
  ctx.fillText('SCORE', 570, 36);
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 22px "Outfit", sans-serif';
  ctx.fillText(score.toLocaleString(), 570, 62);

  // Middle-Right: Timer
  const timeColor = roundTimer <= 10 ? '#ff3366' : '#00ff88';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Outfit", sans-serif';
  ctx.fillText('TIME LEFT', 670, 36);
  ctx.fillStyle = timeColor;
  ctx.font = 'bold 22px "Outfit", sans-serif';
  ctx.fillText(`${Math.ceil(roundTimer)}s`, 670, 62);

  // Far Right: Pillar Category (Clean multi-line / right-aligned box)
  ctx.textAlign = 'right';
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px "Kanit", sans-serif';
  ctx.fillText('STRATEGIC PILLAR', CANVAS_WIDTH - 35, 36);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 13px "Kanit", sans-serif';
  ctx.fillText(scenario.category, CANVAS_WIDTH - 35, 60);

  ctx.restore();
}

function drawScenarioBoard() {
  const scenario = activeGameScenarios[currentRound];
  if (!scenario) return;

  ctx.save();

  // Story / Requirement Banner
  ctx.fillStyle = 'rgba(24, 30, 56, 0.75)';
  roundRect(ctx, 40, 95, CANVAS_WIDTH - 80, 75, 12, true, false);
  ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
  roundRect(ctx, 40, 95, CANVAS_WIDTH - 80, 75, 12, false, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#00f0ff';
  ctx.font = 'bold 13px "Outfit", sans-serif';
  ctx.fillText('📋 USER REQUIREMENT & PROBLEM STATEMENT:', 60, 120);

  ctx.fillStyle = '#f8fafc';
  ctx.font = '15px "Kanit", sans-serif';
  ctx.fillText(scenario.story, 60, 148);

  // 3 Target Architecture Slots
  scenario.targetSlots.forEach((slot, i) => {
    const isMatched = slot.matched !== null;
    ctx.fillStyle = isMatched ? 'rgba(0, 255, 136, 0.08)' : 'rgba(30, 41, 59, 0.5)';
    ctx.strokeStyle = isMatched ? '#00ff88' : 'rgba(148, 163, 184, 0.4)';
    ctx.lineWidth = isMatched ? 2 : 1.5;

    roundRect(ctx, slot.x, slot.y, slot.w, slot.h, 14, true, true);

    ctx.textAlign = 'center';
    ctx.fillStyle = isMatched ? '#00ff88' : '#94a3b8';
    ctx.font = 'bold 13px "Kanit", sans-serif';
    ctx.fillText(slot.title, slot.x + slot.w / 2, slot.y + 28);

    if (!isMatched) {
      ctx.fillStyle = '#64748b';
      ctx.font = '12px "Kanit", sans-serif';
      ctx.fillText(slot.hint, slot.x + slot.w / 2, slot.y + 80);

      // Dash outline icon
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.25)';
      ctx.strokeRect(slot.x + slot.w / 2 - 40, slot.y + 50, 80, 50);
    }
  });

  // Bottom Deck Area
  ctx.fillStyle = 'rgba(11, 16, 32, 0.8)';
  roundRect(ctx, 40, 440, CANVAS_WIDTH - 80, 215, 16, true, false);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  roundRect(ctx, 40, 440, CANVAS_WIDTH - 80, 215, 16, false, true);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'bold 12px "Outfit", sans-serif';
  ctx.fillText('AVAILABLE AI & TECH MODULES (ลากการ์ดที่ตรงกับโจทย์ขึ้นไปวางในช่องสถาปัตยกรรม):', 60, 465);

  // Draw Cards
  if (scenario.placedCards) {
    scenario.placedCards.forEach(card => {
      ctx.save();
      const isThisDragged = card === draggedCard;

      ctx.translate(card.x + card.w / 2, card.y + card.h / 2);
      if (isThisDragged) {
        ctx.scale(1.06, 1.06);
        ctx.shadowColor = card.color;
        ctx.shadowBlur = 20;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 8;
      }

      // Card Body
      ctx.fillStyle = 'rgba(18, 26, 44, 0.95)';
      ctx.strokeStyle = card.color;
      ctx.lineWidth = isThisDragged ? 2.5 : 1.5;
      roundRect(ctx, -card.w / 2, -card.h / 2, card.w, card.h, 10, true, true);

      // Icon & Name
      ctx.shadowBlur = 0;
      ctx.textAlign = 'center';
      ctx.font = '24px sans-serif';
      ctx.fillText(card.icon, 0, -card.h / 2 + 35);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 12px "Kanit", sans-serif';
      ctx.fillText(card.text, 0, -card.h / 2 + 65);

      // Description
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px "Kanit", sans-serif';
      ctx.fillText(card.desc.substring(0, 24), 0, -card.h / 2 + 95);
      if (card.desc.length > 24) {
        ctx.fillText(card.desc.substring(24, 48), 0, -card.h / 2 + 112);
      }

      ctx.restore();
    });
  }

  ctx.restore();
}

function drawCursor() {
  ctx.save();
  ctx.fillStyle = isGrabbing ? '#ff007f' : '#00f0ff';
  ctx.shadowColor = isGrabbing ? '#ff007f' : '#00f0ff';
  ctx.shadowBlur = 10;

  ctx.beginPath();
  ctx.arc(cursorX, cursorY, isGrabbing ? 14 : 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cursorX, cursorY, isGrabbing ? 18 : 14, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawStartScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 20, 0.92)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = 'rgba(20, 24, 48, 0.95)';
  ctx.strokeStyle = '#8338ec';
  ctx.lineWidth = 2;
  roundRect(ctx, 160, 100, CANVAS_WIDTH - 320, 480, 20, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 13px "Outfit", sans-serif';
  ctx.fillText('MAEJO UNIVERSITY • IT 2027 CURRICULUM', CANVAS_WIDTH / 2, 145);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px "Kanit", sans-serif';
  ctx.fillText('🤖 AI Prompt & Logic Match', CANVAS_WIDTH / 2, 190);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '16px "Kanit", sans-serif';
  ctx.fillText('จับคู่การ์ดโซลูชัน AI, Cloud, IoT และ Security ให้ตรงกับโจทย์ความต้องการทางธุรกิจ!', CANVAS_WIDTH / 2, 230);

  // Instructions
  ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
  roundRect(ctx, 200, 260, CANVAS_WIDTH - 400, 180, 14, true, false);

  ctx.textAlign = 'left';
  ctx.font = '14px "Kanit", sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('🎯 อ่านโจทย์ Requirement ของแต่ละภารกิจด้านบน', 230, 295);
  ctx.fillStyle = '#a78bfa';
  ctx.fillText('📦 ลากการ์ดเทคโนโลยี 3 ใบที่สอดคล้องที่สุดขึ้นไปวางในช่องสถาปัตยกรรม', 230, 335);
  ctx.fillStyle = '#00ff88';
  ctx.fillText('🖐️ ควบคุมได้ทั้งเมาส์คลิกลาก (Drag & Drop) หรือใช้จีบนิ้วจับผ่านกล้อง', 230, 375);
  ctx.fillStyle = '#ffb703';
  ctx.fillText('🏆 ค้นพบเส้นทางอาชีพและทักษะแห่งอนาคตหลังทำภารกิจสำเร็จครบ 3 ด่าน', 230, 415);

  // Start Button
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8338ec';
  ctx.shadowColor = '#8338ec';
  ctx.shadowBlur = 15;
  roundRect(ctx, CANVAS_WIDTH / 2 - 120, 470, 240, 50, 25, true, false);
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Kanit", sans-serif';
  ctx.fillText('🚀 เริ่มต้นภารกิจ AI Match', CANVAS_WIDTH / 2, 502);

  ctx.restore();
}

function drawVictoryScreen() {
  ctx.save();
  ctx.fillStyle = 'rgba(6, 8, 20, 0.94)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = 'rgba(18, 28, 50, 0.95)';
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 2;
  roundRect(ctx, 160, 80, CANVAS_WIDTH - 320, 520, 20, true, true);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 30px "Kanit", sans-serif';
  ctx.fillText('🎉 ภารกิจสถาปัตยกรรมนวัตกร AI สำเร็จครบทุกด่าน!', CANVAS_WIDTH / 2, 140);

  ctx.font = 'bold 36px "Outfit", sans-serif';
  ctx.fillStyle = '#00f0ff';
  ctx.fillText(`${score.toLocaleString()} PTS`, CANVAS_WIDTH / 2, 195);

  // Career Summary
  ctx.fillStyle = 'rgba(0, 240, 255, 0.08)';
  roundRect(ctx, 200, 220, CANVAS_WIDTH - 400, 220, 14, true, false);

  ctx.fillStyle = '#ffb703';
  ctx.font = 'bold 16px "Kanit", sans-serif';
  ctx.fillText('🎓 เส้นทางอาชีพที่คุณเหมาะสมตามผลงานในเกม:', CANVAS_WIDTH / 2, 255);

  ctx.fillStyle = '#ffffff';
  ctx.font = '14px "Kanit", sans-serif';
  ctx.fillText('• Quality-First Software Developer & Automated Tester', CANVAS_WIDTH / 2, 290);
  ctx.fillText('• Smart Agri-Tech / IoT Solutions Architect (BCG Model แม่โจ้)', CANVAS_WIDTH / 2, 320);
  ctx.fillText('• Cloud-Native DevOps & Cyber Security Specialist', CANVAS_WIDTH / 2, 350);
  ctx.fillText('• Digital Innovation Startup Founder & Tech Entrepreneur', CANVAS_WIDTH / 2, 380);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '12px "Kanit", sans-serif';
  ctx.fillText('หลักสูตร วท.บ. เทคโนโลยีสารสนเทศ ม.แม่โจ้ (ฉบับปรับปรุง 2570) 120 หน่วยกิต 4 ปีการศึกษา', CANVAS_WIDTH / 2, 420);

  // Replay
  ctx.fillStyle = '#00ff88';
  roundRect(ctx, CANVAS_WIDTH / 2 - 110, 465, 220, 48, 24, true, false);
  ctx.fillStyle = '#0b0f19';
  ctx.font = 'bold 16px "Kanit", sans-serif';
  ctx.fillText('🔄 เล่นอีกรอบ (Replay)', CANVAS_WIDTH / 2, 495);

  ctx.restore();
}

// -------------------------------------------------------------
// Mouse / Touch Event Listeners
// -------------------------------------------------------------
canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  cursorX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  cursorY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  if (isGrabbing) handleGrabMove(cursorX, cursorY);
});

canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  cursorX = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  cursorY = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

  if (gameState === 'START' || gameState === 'VICTORY') {
    startMatchGame();
  } else if (gameState === 'PLAYING') {
    isGrabbing = true;
    handleGrabStart(cursorX, cursorY);
  }
});

window.addEventListener('mouseup', () => {
  if (isGrabbing) {
    isGrabbing = false;
    handleGrabEnd();
  }
});

// Touch Events
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];
  cursorX = ((t.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  cursorY = ((t.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;

  if (gameState === 'START' || gameState === 'VICTORY') {
    startMatchGame();
  } else if (gameState === 'PLAYING') {
    isGrabbing = true;
    handleGrabStart(cursorX, cursorY);
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const t = e.touches[0];
  cursorX = ((t.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
  cursorY = ((t.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
  if (isGrabbing) handleGrabMove(cursorX, cursorY);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (isGrabbing) {
    isGrabbing = false;
    handleGrabEnd();
  }
}, { passive: false });

restartBtn.addEventListener('click', () => {
  startMatchGame();
});

// -------------------------------------------------------------
// MediaPipe Hands & Camera Integration
// -------------------------------------------------------------
let lastPinchState = false;
let currentHandLandmarks = null;

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
  if (!handDetected || !currentHandLandmarks) return;

  ctx.save();

  // Draw bone lines
  ctx.lineWidth = 3;
  ctx.strokeStyle = isGrabbing ? 'rgba(255, 0, 127, 0.65)' : 'rgba(131, 56, 236, 0.55)';
  ctx.shadowColor = isGrabbing ? '#ff007f' : '#8338ec';
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
    ctx.fillStyle = isTip ? (isGrabbing ? '#ffffff' : '#00ff88') : (isGrabbing ? '#ff007f' : '#00f0ff');
    ctx.fill();
  }

  ctx.restore();
}

function onHandResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    currentHandLandmarks = results.multiHandLandmarks[0];
    statusDot.classList.add('active');
    statusText.innerText = '🖐️ จับมือได้แล้ว! (จีบนิ้ว = หยิบการ์ด)';

    const landmarks = results.multiHandLandmarks[0];
    const indexTip = landmarks[8];
    const thumbTip = landmarks[4];

    // Mirrored coordinates
    const rawX = (1.0 - (indexTip.x + thumbTip.x) / 2) * CANVAS_WIDTH;
    const rawY = ((indexTip.y + thumbTip.y) / 2) * CANVAS_HEIGHT;

    // Smooth movement
    cursorX += (rawX - cursorX) * 0.45;
    cursorY += (rawY - cursorY) * 0.45;

    // Calculate pinch distance
    const dx = (landmarks[8].x - landmarks[4].x);
    const dy = (landmarks[8].y - landmarks[4].y);
    const pinchDist = Math.sqrt(dx * dx + dy * dy);

    const isPinching = pinchDist < 0.07;

    if (isPinching && !lastPinchState) {
      if (gameState === 'START' || gameState === 'VICTORY') {
        startMatchGame();
      } else if (gameState === 'PLAYING') {
        isGrabbing = true;
        handleGrabStart(cursorX, cursorY);
      }
    } else if (!isPinching && lastPinchState) {
      if (isGrabbing) {
        isGrabbing = false;
        handleGrabEnd();
      }
    } else if (isPinching && isGrabbing) {
      handleGrabMove(cursorX, cursorY);
    }

    lastPinchState = isPinching;
  } else {
    handDetected = false;
    currentHandLandmarks = null;
    statusDot.classList.remove('active');
    statusText.innerText = '📷 พร้อมใช้งาน (ใช้มือผ่านกล้อง หรือ ลากเมาส์ได้ทันที)';
  }
}

if (window.Hands) {
  const hands = new Hands({
    locateFile: (file) => `../libs/mediapipe/hands/${file}`
  });

  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.55,
    minTrackingConfidence: 0.55
  });

  hands.onResults(onHandResults);

  if (window.Camera && video) {
    const camera = new Camera(video, {
      onFrame: async () => {
        await hands.send({ image: video });
      },
      width: 640,
      height: 480
    });

    camera.start().then(() => {
      statusText.innerText = '📷 กล้องพร้อมใช้งาน (จีบนิ้ว หรือ ลากเมาส์)';
    }).catch(err => {
      console.warn('Camera not available or blocked, falling back to mouse:', err);
      statusText.innerText = '🖱️ โหมดเมาส์ / สัมผัส (พร้อมเล่น)';
    });
  }
} else {
  statusText.innerText = '🖱️ โหมดเมาส์ / สัมผัส (พร้อมเล่น)';
}

requestAnimationFrame(gameLoop);
