// --- Canvas & Config ---
const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 650;

const videoElement = document.getElementById('webcam');
const canvasElement = document.getElementById('quizCanvas');
const canvasCtx = canvasElement.getContext('2d');
const restartBtn = document.getElementById('restartBtn');
const nextQuizBtn = document.getElementById('nextQuizBtn');
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');

// --- Hand Tracking & Smoothing State ---
let pointerX = -100, pointerY = -100;
let indexX = -100, indexY = -100;
let thumbX = -100, thumbY = -100;
const SMOOTH_ALPHA = 0.68;

let normalizedPinchDist = 999;
let isPinching = false;
let handDetected = false;
let handLostGraceFrames = 0;
const MAX_GRACE_FRAMES = 6;

// Hover timer for hands-free answering (Hold hand over card for 1.2s to select)
let hoveredOptionIndex = -1;
let hoverTimer = 0;
const HOVER_THRESHOLD = 70; // ~1.15 seconds at 60fps

// --- IT Maejo 2027 Curriculum Question Bank ---
const QUIZ_DATABASE = [
  {
    id: 1,
    category: '✨ 4 เสาหลักสู่ความเป็นมืออาชีพ (Strategic Pillars)',
    question: 'หลักสูตร IT แม่โจ้ 2027 ปั้นคุณเป็นอะไรแห่งอนาคต?',
    context: 'มุ่งเน้นสร้างนักพัฒนาที่เหนือกว่าโปรแกรมเมอร์ทั่วไป ด้วยคุณภาพและความแม่นยำ',
    correctExplanation: 'มุ่งเน้นปั้นคุณเป็น "Quality-First Developer" แห่งอนาคต!',
    options: [
      { text: 'A. Quality-First Developer', isCorrect: true, pillar: 'เสาหลัก 1', color: '#00f0ff' },
      { text: 'B. Basic Data Entry Clerk', isCorrect: false, pillar: 'ไม่ใช่เป้าหมาย', color: '#ff007f' },
      { text: 'C. Hardware Repairman', isCorrect: false, pillar: 'ไม่ใช่เป้าหมาย', color: '#ffb703' },
      { text: 'D. Generic Web Designer', isCorrect: false, pillar: 'ไม่ใช่เป้าหมาย', color: '#9d4edd' }
    ]
  },
  {
    id: 2,
    category: '🤖 Modern Tech & AI-Driven',
    question: 'เสาหลัก "Modern Tech & AI-Driven" เน้นการเรียนรู้แบบใด?',
    context: 'ใช้เทคโนโลยี AI และ Cloud ตอบโจทย์ตลาดแรงงานระดับสากล',
    correctExplanation: 'เรียนรู้การทำงานบนระบบ Cloud Native และใช้ AI ช่วยพัฒนาซอฟต์แวร์อย่างชาญฉลาด!',
    options: [
      { text: 'A. ซ่อมประกอบคอมพิวเตอร์ตั้งโต๊ะ', isCorrect: false, pillar: 'Traditional IT', color: '#ff007f' },
      { text: 'B. Cloud Native & ใช้ AI ช่วยพัฒนาซอฟต์แวร์', isCorrect: true, pillar: 'Modern Tech', color: '#00ff88' },
      { text: 'C. เขียนเว็บแบบ Static ธรรมดา', isCorrect: false, pillar: 'Traditional IT', color: '#ffb703' },
      { text: 'D. วาดรูป Vector กราฟิกทั่วไป', isCorrect: false, pillar: 'Graphic Design', color: '#9d4edd' }
    ]
  },
  {
    id: 3,
    category: '🌱 Green IT & Digital Ethics',
    question: 'เสาหลัก "Green IT & Digital Ethics" มุ่งเน้นอะไร?',
    context: 'สร้างเทคโนโลยีที่เป็นมิตรต่อสิ่งแวดล้อมและจริยธรรม',
    correctExplanation: 'สร้างนวัตกรรมที่เป็นมิตรต่อสิ่งแวดล้อม (BCG Model) พร้อมบ่มเพาะจริยธรรมในวิชาชีพไอที!',
    options: [
      { text: 'A. ใช้พลังงานคอมพิวเตอร์ให้มากที่สุด', isCorrect: false, pillar: 'High Power', color: '#ff007f' },
      { text: 'B. เน้นขายอุปกรณ์อิเล็กทรอนิกส์', isCorrect: false, pillar: 'Hardware Store', color: '#ffb703' },
      { text: 'C. นวัตกรรมเป็นมิตรสิ่งแวดล้อม (BCG) & จริยธรรม', isCorrect: true, pillar: 'Green IT', color: '#00ff88' },
      { text: 'D. ปฏิเสธการใช้พลังงานสะอาด', isCorrect: false, pillar: 'Outdated', color: '#9d4edd' }
    ]
  },
  {
    id: 4,
    category: '🎯 Quality-First & Automated Testing',
    question: 'การพัฒนาแบบ "Quality-First" ใช้วิธีการใดสร้างความแม่นยำ?',
    context: 'การประกันคุณภาพซอฟต์แวร์ที่รวดเร็วและมีมาตรฐานสูงสุด',
    correctExplanation: 'เน้นระบบทดสอบอัตโนมัติที่แม่นยำ (Automated Testing) เพื่อซอฟต์แวร์คุณภาพสูงสุด!',
    options: [
      { text: 'A. ระบบทดสอบอัตโนมัติ (Automated Testing)', isCorrect: true, pillar: 'Quality-First', color: '#00f0ff' },
      { text: 'B. ปล่อยให้ผู้ใช้เจอบั๊กเอง', isCorrect: false, pillar: 'No Testing', color: '#ff007f' },
      { text: 'C. ลบโค้ดทั้งหมดทิ้งเมื่อมี Error', isCorrect: false, pillar: 'Wrong Way', color: '#ffb703' },
      { text: 'D. ทดสอบด้วยการพิมพ์สุ่มๆ', isCorrect: false, pillar: 'Manual Guess', color: '#9d4edd' }
    ]
  },
  {
    id: 5,
    category: '🎓 เส้นทางสู่มืออาชีพ (4-Year Learning Journey)',
    question: 'นักศึกษา IT แม่โจ้ ปีที่ 4 (Year 4) จะได้ทำกิจกรรมสำคัญอะไร?',
    context: 'ก้าวสู่การทำงานจริงในระดับสากล',
    correctExplanation: 'ปีที่ 4 คือช่วงฝึกงานระดับสากล (International Internship) เพื่อความพร้อมระดับโลก!',
    options: [
      { text: 'A. ท่องจำทฤษฎีในห้องเรียนอย่างเดียว', isCorrect: false, pillar: 'Classroom', color: '#ff007f' },
      { text: 'B. ฝึกงานระดับสากล (International Internship)', isCorrect: true, pillar: 'Year 4 Goal', color: '#00ff88' },
      { text: 'C. พักการเรียน 1 ปีเต็ม', isCorrect: false, pillar: 'Gap Year', color: '#ffb703' },
      { text: 'D. แข่งขันกีฬาอย่างเดียว', isCorrect: false, pillar: 'Sports', color: '#9d4edd' }
    ]
  },
  {
    id: 6,
    category: '💼 เส้นทางอาชีพในอนาคต (Future Career Paths)',
    question: 'จบจาก IT แม่โจ้ 2027 สามารถประกอบอาชีพใดได้บ้าง?',
    context: 'เปิดกว้างสู่อาชีพยุคดิจิทัลระดับสูง',
    correctExplanation: 'เป็นได้ทั้ง Software Developer, Automated Tester, Cyber Security และเจ้าของ Startup!',
    options: [
      { text: 'A. Software Developer & Automated Tester', isCorrect: false, pillar: 'Career', color: '#00f0ff' },
      { text: 'B. Cyber Security Specialist & Startup Owner', isCorrect: false, pillar: 'Career', color: '#9d4edd' },
      { text: 'C. เป็นได้ทุกสายงานที่กล่าวมาข้างต้น (ถูกทุกข้อ)', isCorrect: true, pillar: 'All Careers', color: '#00ff88' },
      { text: 'D. ไม่สามารถทำงานด้านเทคโนโลยีได้', isCorrect: false, pillar: 'Incorrect', color: '#ff007f' }
    ]
  },
  {
    id: 7,
    category: '📋 ข้อมูลพื้นฐานหลักสูตร (Curriculum Info)',
    question: 'หลักสูตร IT แม่โจ้ 2027 มีจำนวนกี่หน่วยกิต และใช้เวลาเรียนกี่ปี?',
    context: 'โครงสร้างหลักสูตรมาตรฐานสากล ISCED 0613 และระบบ OBE',
    correctExplanation: 'หลักสูตรปริญญาตรี 120 หน่วยกิต (ระยะเวลาเรียน 4 ปี)!',
    options: [
      { text: 'A. 120 หน่วยกิต (เรียน 4 ปี)', isCorrect: true, pillar: '120 Credits', color: '#00f0ff' },
      { text: 'B. 250 หน่วยกิต (เรียน 8 ปี)', isCorrect: false, pillar: 'Too Long', color: '#ff007f' },
      { text: 'C. 60 หน่วยกิต (เรียน 1 ปี)', isCorrect: false, pillar: 'Too Short', color: '#ffb703' },
      { text: 'D. ไม่จำกัดหน่วยกิต', isCorrect: false, pillar: 'No Credit', color: '#9d4edd' }
    ]
  },
  {
    id: 8,
    category: '🚀 กำหนดการเปิดสอน (Milestone)',
    question: 'หลักสูตร IT แม่โจ้ (ฉบับปรับปรุง พ.ศ. 2570) เริ่มเปิดสอนเมื่อใด?',
    context: 'หลักสูตรทันสมัยรองรับปี 2027',
    correctExplanation: 'เริ่มเปิดสอนภาคการศึกษาที่ 1 ปีการศึกษา 2570 (IT แม่โจ้ 2027)!',
    options: [
      { text: 'A. ภาคการศึกษาที่ 1 ปีการศึกษา 2570', isCorrect: true, pillar: 'Semester 1/2570', color: '#00ff88' },
      { text: 'B. ปีการศึกษา 2585', isCorrect: false, pillar: 'Too Far', color: '#ff007f' },
      { text: 'C. เปิดสอนเฉพาะภาคฤดูร้อน', isCorrect: false, pillar: 'Summer Only', color: '#ffb703' },
      { text: 'D. ยังไม่มีกำหนดการเปิดสอน', isCorrect: false, pillar: 'Unknown', color: '#9d4edd' }
    ]
  }
];

// --- Game Logic State ---
let maxQuestionsPerRound = 3; // Default 3 questions per round for quick fun!
let currentQuestionNumber = 1;
let questionPool = [];
let currentQuestion = null;
let score = 0;
let quizState = 'QUESTION'; // 'QUESTION' | 'RESULT_CORRECT' | 'RESULT_WRONG' | 'ROUND_SUMMARY'
let selectedOption = null;
let celebrationParticles = [];

// Layout card positions (4 Option cards in 2x2 grid)
const OPTION_CARDS = [
  { x: 50,  y: 330, w: 435, h: 120 }, // Option 0 (Top Left)
  { x: 515, y: 330, w: 435, h: 120 }, // Option 1 (Top Right)
  { x: 50,  y: 475, w: 435, h: 120 }, // Option 2 (Bottom Left)
  { x: 515, y: 475, w: 435, h: 120 }  // Option 3 (Bottom Right)
];

// Helper to shuffle array
function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Start a fresh round with specific question count
function startNewRound() {
  score = 0;
  currentQuestionNumber = 1;
  // Shuffle all 8 questions and pick required count
  questionPool = shuffleArray(QUIZ_DATABASE).slice(0, maxQuestionsPerRound);
  loadQuestionFromPool();
}

function loadQuestionFromPool() {
  if (currentQuestionNumber > questionPool.length) {
    // Round Finished! Show Summary Screen
    quizState = 'ROUND_SUMMARY';
    createCelebrationParticles();
    return;
  }

  const rawQuiz = questionPool[currentQuestionNumber - 1];
  currentQuestion = {
    ...rawQuiz,
    shuffledOptions: shuffleArray(rawQuiz.options)
  };

  quizState = 'QUESTION';
  selectedOption = null;
  hoveredOptionIndex = -1;
  hoverTimer = 0;
  celebrationParticles = [];
}

function nextQuestion() {
  if (quizState === 'ROUND_SUMMARY') {
    startNewRound();
    return;
  }

  if (currentQuestionNumber >= maxQuestionsPerRound) {
    quizState = 'ROUND_SUMMARY';
    createCelebrationParticles();
  } else {
    currentQuestionNumber++;
    loadQuestionFromPool();
  }
}

function restartQuiz() {
  startNewRound();
}

function setQuestionsPerRound(count) {
  maxQuestionsPerRound = count;
  const pills = document.querySelectorAll('.pill-btn');
  pills.forEach((p, idx) => {
    if ((count === 3 && idx === 0) || (count === 5 && idx === 1) || (count === 8 && idx === 2)) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });
  startNewRound();
}

restartBtn.addEventListener('click', restartQuiz);

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

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 1280,
  height: 720
});

camera.start().then(() => {
  statusDot.classList.add('active');
  statusText.textContent = 'กล้องพร้อม! ใช้มือชี้ค้างไว้ หรือ หนีบนิ้ว เพื่อเลือกคำตอบ';
}).catch(err => {
  statusText.textContent = 'ไม่สามารถเข้าถึงกล้องได้: ' + err.message;
});

// Process Hand Landmark Coordinates
function onResults(results) {
  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    handDetected = true;
    handLostGraceFrames = 0;
    const landmarks = results.multiHandLandmarks[0];

    const wrist = landmarks[0];
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleMcp = landmarks[9];

    // Reference palm scale
    const handSizeRef = Math.hypot(middleMcp.x - wrist.x, middleMcp.y - wrist.y, (middleMcp.z || 0) - (wrist.z || 0)) || 0.3;

    // 3D Pinch Distance
    const raw3DDist = Math.hypot(
      thumbTip.x - indexTip.x,
      thumbTip.y - indexTip.y,
      (thumbTip.z || 0) - (indexTip.z || 0)
    );

    normalizedPinchDist = raw3DDist / handSizeRef;

    const rawIndexX = (1 - indexTip.x) * CANVAS_WIDTH;
    const rawIndexY = indexTip.y * CANVAS_HEIGHT;
    const rawThumbX = (1 - thumbTip.x) * CANVAS_WIDTH;
    const rawThumbY = thumbTip.y * CANVAS_HEIGHT;

    const rawMidX = (rawIndexX + rawThumbX) / 2;
    const rawMidY = (rawIndexY + rawThumbY) / 2;

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

    const pinchDistance = Math.hypot(indexX - thumbX, indexY - thumbY);

    if (!isPinching) {
      if (normalizedPinchDist < 0.45 || pinchDistance < 55) {
        isPinching = true;
        handleSelectAnswer();
      }
    } else {
      if (normalizedPinchDist > 0.68 && pinchDistance > 75) {
        isPinching = false;
      }
    }

    handleHoverDetection();
  } else {
    if (handLostGraceFrames < MAX_GRACE_FRAMES) {
      handLostGraceFrames++;
    } else {
      handDetected = false;
      isPinching = false;
      hoverTimer = 0;
      hoveredOptionIndex = -1;
    }
  }
}

// Detect Hover / Aiming over Options
function handleHoverDetection() {
  if (quizState !== 'QUESTION') return;

  let currentHover = -1;
  for (let i = 0; i < 4; i++) {
    const card = OPTION_CARDS[i];
    if (
      pointerX >= card.x &&
      pointerX <= card.x + card.w &&
      pointerY >= card.y &&
      pointerY <= card.y + card.h
    ) {
      currentHover = i;
      break;
    }
  }

  if (currentHover !== -1) {
    if (hoveredOptionIndex === currentHover) {
      hoverTimer++;
      if (hoverTimer >= HOVER_THRESHOLD) {
        // Auto-select on hover hold
        chooseOption(currentHover);
      }
    } else {
      hoveredOptionIndex = currentHover;
      hoverTimer = 0;
    }
  } else {
    hoveredOptionIndex = -1;
    hoverTimer = 0;
  }
}

// Select by Pinch
function handleSelectAnswer() {
  if (quizState === 'QUESTION') {
    if (hoveredOptionIndex !== -1) {
      chooseOption(hoveredOptionIndex);
    }
  } else if (quizState === 'RESULT_CORRECT' || quizState === 'RESULT_WRONG') {
    // Pinch anywhere to continue
    nextQuestion();
  }
}

function chooseOption(optIdx) {
  if (quizState !== 'QUESTION') return;

  const opt = currentQuestion.shuffledOptions[optIdx];
  selectedOption = opt;

  if (opt.isCorrect) {
    score++;
    quizState = 'RESULT_CORRECT';
    createCelebrationParticles();
  } else {
    quizState = 'RESULT_WRONG';
  }
  hoverTimer = 0;
}

// Fallback Mouse click support
canvasElement.addEventListener('click', (e) => {
  const rect = canvasElement.getBoundingClientRect();
  const clickX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  const clickY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);

  if (quizState === 'QUESTION') {
    for (let i = 0; i < 4; i++) {
      const card = OPTION_CARDS[i];
      if (clickX >= card.x && clickX <= card.x + card.w && clickY >= card.y && clickY <= card.y + card.h) {
        chooseOption(i);
        break;
      }
    }
  } else if (quizState === 'RESULT_CORRECT' || quizState === 'RESULT_WRONG') {
    const btnX = CANVAS_WIDTH / 2 - 100;
    const btnY = (CANVAS_HEIGHT - 340) / 2 + 260;
    if (clickX >= btnX && clickX <= btnX + 200 && clickY >= btnY && clickY <= btnY + 48) {
      nextQuestion();
    }
  } else if (quizState === 'ROUND_SUMMARY') {
    const btnX = CANVAS_WIDTH / 2 - 110;
    const btnY = (CANVAS_HEIGHT - 380) / 2 + 290;
    if (clickX >= btnX && clickX <= btnX + 220 && clickY >= btnY && clickY <= btnY + 50) {
      startNewRound();
    }
  }
});

// Fallback Mouse move
canvasElement.addEventListener('mousemove', (e) => {
  if (handDetected) return;
  const rect = canvasElement.getBoundingClientRect();
  pointerX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width);
  pointerY = (e.clientY - rect.top) * (CANVAS_HEIGHT / rect.height);
  handleHoverDetection();
});

// --- Particles for Correct Answer ---
function createCelebrationParticles() {
  celebrationParticles = [];
  for (let i = 0; i < 90; i++) {
    celebrationParticles.push({
      x: CANVAS_WIDTH / 2 + (Math.random() - 0.5) * 400,
      y: CANVAS_HEIGHT / 2 + (Math.random() - 0.5) * 180,
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
    p.alpha -= 0.012;
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

// --- Main Render Loop ---
function render() {
  canvasCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  // Background
  const bgGrad = canvasCtx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bgGrad.addColorStop(0, '#10111a');
  bgGrad.addColorStop(1, '#181926');
  canvasCtx.fillStyle = bgGrad;
  canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  drawBackgroundGrid();

  // Question Card Area
  drawQuestionArea();

  // 4 Option Cards
  drawOptionCards();

  // Result Overlay if answered
  if (quizState === 'RESULT_CORRECT') {
    updateParticles();
    drawParticles();
    drawResultOverlay(true);
  } else if (quizState === 'RESULT_WRONG') {
    drawResultOverlay(false);
  } else if (quizState === 'ROUND_SUMMARY') {
    updateParticles();
    drawParticles();
    drawRoundSummary();
  }

  // Pointer / Hand Indicator
  drawPointerIndicator();

  requestAnimationFrame(render);
}

// --- Drawing Helper Functions ---
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
  canvasCtx.strokeStyle = 'rgba(255, 255, 255, 0.025)';
  canvasCtx.lineWidth = 1;
  for (let x = 0; x < CANVAS_WIDTH; x += 40) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(x, 0); canvasCtx.lineTo(x, CANVAS_HEIGHT); canvasCtx.stroke();
  }
  for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, y); canvasCtx.lineTo(CANVAS_WIDTH, y); canvasCtx.stroke();
  }
  canvasCtx.restore();
}

function drawQuestionArea() {
  // Top Question Box
  drawRoundedRect(canvasCtx, 30, 20, 940, 280, 18, 'rgba(25, 26, 40, 0.95)', 'rgba(0, 240, 255, 0.25)', 1.5);

  // Category Tag
  drawRoundedRect(canvasCtx, 50, 40, 360, 32, 10, 'rgba(0, 240, 255, 0.12)', '#00f0ff', 1);
  canvasCtx.fillStyle = '#00f0ff';
  canvasCtx.font = 'bold 13px "Kanit", sans-serif';
  canvasCtx.textAlign = 'left';
  canvasCtx.fillText(currentQuestion ? currentQuestion.category : '', 65, 61);

  // Question Progress Badge (ข้อที่ X / Y)
  drawRoundedRect(canvasCtx, 570, 40, 180, 32, 10, 'rgba(157, 78, 221, 0.15)', '#9d4edd', 1);
  canvasCtx.fillStyle = '#9d4edd';
  canvasCtx.font = 'bold 13px "Kanit", sans-serif';
  canvasCtx.fillText(`📌 ข้อที่: ${currentQuestionNumber} / ${maxQuestionsPerRound}`, 585, 61);

  // Score Badge
  drawRoundedRect(canvasCtx, 765, 40, 185, 32, 10, 'rgba(255, 183, 3, 0.12)', '#ffb703', 1);
  canvasCtx.fillStyle = '#ffb703';
  canvasCtx.font = 'bold 14px "Kanit", sans-serif';
  canvasCtx.fillText(`🏆 คะแนน: ${score} แต้ม`, 780, 62);

  // Main Question Text (Multi-line aware)
  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = 'bold 22px "Kanit", sans-serif';
  canvasCtx.fillText(currentQuestion ? currentQuestion.question : '', 50, 120);

  // Context Subtitle
  canvasCtx.fillStyle = '#a0a0b8';
  canvasCtx.font = '15px "Kanit", sans-serif';
  canvasCtx.fillText(`💡 คำใบ้/สาระสำคัญ: ${currentQuestion ? currentQuestion.context : ''}`, 50, 160);

  // Interaction Instruction Banner
  drawRoundedRect(canvasCtx, 50, 195, 900, 75, 12, 'rgba(15, 15, 23, 0.7)', 'rgba(255, 255, 255, 0.08)', 1);
  
  canvasCtx.fillStyle = '#00ff88';
  canvasCtx.font = 'bold 14px "Kanit", sans-serif';
  canvasCtx.fillText('✋ วิธีตอบคำถามด้วยมือ:', 70, 225);

  canvasCtx.fillStyle = '#e0e1dd';
  canvasCtx.font = '13px "Kanit", sans-serif';
  canvasCtx.fillText('1. เลื่อนมือไปชี้ที่การ์ดคำตอบค้างไว้ 1 วินาที (แถบสีฟ้าจะเต็ม)  หรือ  2. หนีบนิ้วชี้+โป้ง (Pinch) เพื่อเลือกทันที', 70, 250);
}

function drawOptionCards() {
  if (!currentQuestion) return;

  for (let i = 0; i < 4; i++) {
    const card = OPTION_CARDS[i];
    const opt = currentQuestion.shuffledOptions[i];
    const isHovered = (hoveredOptionIndex === i);

    canvasCtx.save();

    let bgColor = 'rgba(26, 27, 44, 0.9)';
    let borderColor = 'rgba(255, 255, 255, 0.15)';
    let borderWidth = 1.5;

    if (isHovered && quizState === 'QUESTION') {
      bgColor = 'rgba(38, 40, 68, 0.98)';
      borderColor = opt.color;
      borderWidth = 2.5;
      canvasCtx.shadowColor = opt.color;
      canvasCtx.shadowBlur = 18;
    }

    drawRoundedRect(canvasCtx, card.x, card.y, card.w, card.h, 16, bgColor, borderColor, borderWidth);
    canvasCtx.restore();

    // Option Tag Badge
    drawRoundedRect(canvasCtx, card.x + 18, card.y + 16, 120, 24, 8, 'rgba(255, 255, 255, 0.08)', opt.color, 1);
    canvasCtx.fillStyle = opt.color;
    canvasCtx.font = 'bold 11px "Outfit", "Kanit", sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText(opt.pillar, card.x + 78, card.y + 32);

    // Option Text
    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 16px "Kanit", sans-serif';
    canvasCtx.textAlign = 'left';
    canvasCtx.fillText(opt.text, card.x + 20, card.y + 75);

    // Hover Progress Bar
    if (isHovered && quizState === 'QUESTION') {
      const progress = Math.min(1, hoverTimer / HOVER_THRESHOLD);
      drawRoundedRect(canvasCtx, card.x + 15, card.y + card.h - 14, card.w - 30, 6, 3, 'rgba(255, 255, 255, 0.1)', null);
      drawRoundedRect(canvasCtx, card.x + 15, card.y + card.h - 14, (card.w - 30) * progress, 6, 3, '#00f0ff', null);
      
      canvasCtx.fillStyle = '#00f0ff';
      canvasCtx.font = 'bold 10px "Kanit", sans-serif';
      canvasCtx.textAlign = 'right';
      canvasCtx.fillText(`${Math.round(progress * 100)}%`, card.x + card.w - 18, card.y + card.h - 22);
    }
  }
}

function drawResultOverlay(isCorrect) {
  canvasCtx.save();

  // Dark overlay
  canvasCtx.fillStyle = 'rgba(10, 11, 18, 0.85)';
  canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const bannerW = 740;
  const bannerH = 340;
  const bannerX = (CANVAS_WIDTH - bannerW) / 2;
  const bannerY = (CANVAS_HEIGHT - bannerH) / 2;

  const mainColor = isCorrect ? '#00ff88' : '#e63946';

  drawRoundedRect(canvasCtx, bannerX, bannerY, bannerW, bannerH, 24, 'rgba(20, 22, 34, 0.98)', mainColor, 3);

  canvasCtx.shadowColor = mainColor;
  canvasCtx.shadowBlur = 25;

  // Title
  canvasCtx.fillStyle = mainColor;
  canvasCtx.font = 'bold 30px "Kanit", sans-serif';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText(isCorrect ? '🎉 ถูกต้องยอดเยี่ยม! (CORRECT!) 🎉' : '❌ ยังไม่ถูกต้องนะจ๊ะ (INCORRECT) ❌', CANVAS_WIDTH / 2, bannerY + 55);

  canvasCtx.shadowBlur = 0;

  // Your Choice
  canvasCtx.fillStyle = '#a0a0b8';
  canvasCtx.font = '15px "Kanit", sans-serif';
  canvasCtx.fillText(`คำตอบที่คุณเลือก: "${selectedOption ? selectedOption.text : '-'}"`, CANVAS_WIDTH / 2, bannerY + 95);

  // Explanation Box
  drawRoundedRect(canvasCtx, bannerX + 40, bannerY + 120, bannerW - 80, 110, 14, 'rgba(30, 32, 50, 0.9)', 'rgba(255, 255, 255, 0.1)', 1);

  canvasCtx.fillStyle = '#00f0ff';
  canvasCtx.font = 'bold 15px "Kanit", sans-serif';
  canvasCtx.fillText('📖 คำอธิบายหลักสูตร IT แม่โจ้ 2027:', CANVAS_WIDTH / 2, bannerY + 152);

  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = '16px "Kanit", sans-serif';
  canvasCtx.fillText(currentQuestion ? currentQuestion.correctExplanation : '', CANVAS_WIDTH / 2, bannerY + 190);

  // Continue Button
  const isLastQuestion = (currentQuestionNumber >= maxQuestionsPerRound);
  const btnLabel = isLastQuestion ? 'ดูสรุปผลคะแนน ➔ (หนีบนิ้ว)' : 'ข้อถัดไป ➔ (หนีบนิ้ว)';

  drawRoundedRect(canvasCtx, CANVAS_WIDTH / 2 - 110, bannerY + 260, 220, 48, 14, mainColor, '#ffffff', 1);
  canvasCtx.fillStyle = '#0f0f17';
  canvasCtx.font = 'bold 16px "Kanit", sans-serif';
  canvasCtx.fillText(btnLabel, CANVAS_WIDTH / 2, bannerY + 290);

  canvasCtx.restore();
}

function drawRoundSummary() {
  canvasCtx.save();

  // Dark overlay
  canvasCtx.fillStyle = 'rgba(10, 11, 18, 0.92)';
  canvasCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const bannerW = 760;
  const bannerH = 400;
  const bannerX = (CANVAS_WIDTH - bannerW) / 2;
  const bannerY = (CANVAS_HEIGHT - bannerH) / 2;

  drawRoundedRect(canvasCtx, bannerX, bannerY, bannerW, bannerH, 24, 'rgba(20, 22, 36, 0.98)', '#ffb703', 3);

  canvasCtx.shadowColor = '#ffb703';
  canvasCtx.shadowBlur = 25;

  // Header Title
  canvasCtx.fillStyle = '#ffb703';
  canvasCtx.font = 'bold 32px "Kanit", sans-serif';
  canvasCtx.textAlign = 'center';
  canvasCtx.fillText('🏆 จบรอบการทดสอบความรู้ IT แม่โจ้ 2027! 🏆', CANVAS_WIDTH / 2, bannerY + 60);

  canvasCtx.shadowBlur = 0;

  // Score Box
  drawRoundedRect(canvasCtx, CANVAS_WIDTH / 2 - 180, bannerY + 95, 360, 95, 16, 'rgba(255, 183, 3, 0.12)', '#ffb703', 1.5);
  
  canvasCtx.fillStyle = '#ffffff';
  canvasCtx.font = '16px "Kanit", sans-serif';
  canvasCtx.fillText('คะแนนรวมที่คุณทำได้', CANVAS_WIDTH / 2, bannerY + 130);

  canvasCtx.fillStyle = '#00ff88';
  canvasCtx.font = 'bold 36px "Kanit", sans-serif';
  canvasCtx.fillText(`${score} / ${maxQuestionsPerRound} คะแนน`, CANVAS_WIDTH / 2, bannerY + 172);

  // Motivational message based on score
  let comment = '';
  let badgeTitle = '';
  const percent = (score / maxQuestionsPerRound) * 100;
  if (percent >= 80) {
    badgeTitle = '🌟 ฉายา: "Quality-First Developer ตัวจริง!"';
    comment = 'สุดยอดมาก! คุณเข้าใจโครงสร้างและวิสัยทัศน์หลักสูตร IT แม่โจ้ 2027 อย่างลึกซึ้ง!';
  } else if (percent >= 50) {
    badgeTitle = '⚡ ฉายา: "IT Rookie ผู้มีความพร้อม!"';
    comment = 'เก่งมากครับ! มีพื้นฐานความเข้าใจหลักสูตรไอทีที่ดีเยี่ยม มาเรียนด้วยกันนะ!';
  } else {
    badgeTitle = '🌱 ฉายา: "Tech Explorer ผู้ค้นพบไอที!"';
    comment = 'ลองเล่นอีกรอบเพื่อค้นพบ 4 เสาหลักสู่ความเป็นมืออาชีพของ IT แม่โจ้ 2027 กัน!';
  }

  canvasCtx.fillStyle = '#00f0ff';
  canvasCtx.font = 'bold 18px "Kanit", sans-serif';
  canvasCtx.fillText(badgeTitle, CANVAS_WIDTH / 2, bannerY + 225);

  canvasCtx.fillStyle = '#a0a0b8';
  canvasCtx.font = '14px "Kanit", sans-serif';
  canvasCtx.fillText(comment, CANVAS_WIDTH / 2, bannerY + 255);

  // Restart Button
  drawRoundedRect(canvasCtx, CANVAS_WIDTH / 2 - 110, bannerY + 295, 220, 50, 14, '#00ff88', '#ffffff', 1);
  canvasCtx.fillStyle = '#0f0f17';
  canvasCtx.font = 'bold 17px "Kanit", sans-serif';
  canvasCtx.fillText('🔄 เล่นอีกรอบ (หนีบนิ้ว)', CANVAS_WIDTH / 2, bannerY + 327);

  canvasCtx.restore();
}

function drawPointerIndicator() {
  if (!handDetected && pointerX < 0) return;

  canvasCtx.save();

  if (isPinching) {
    canvasCtx.shadowColor = '#ff007f';
    canvasCtx.shadowBlur = 18;

    canvasCtx.strokeStyle = '#ff007f';
    canvasCtx.lineWidth = 3;
    canvasCtx.beginPath();
    canvasCtx.moveTo(indexX > 0 ? indexX : pointerX, indexY > 0 ? indexY : pointerY);
    canvasCtx.lineTo(thumbX > 0 ? thumbX : pointerX, thumbY > 0 ? thumbY : pointerY);
    canvasCtx.stroke();

    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.beginPath();
    canvasCtx.arc(pointerX, pointerY, 14, 0, Math.PI * 2);
    canvasCtx.fill();

    canvasCtx.fillStyle = '#ff007f';
    canvasCtx.beginPath();
    canvasCtx.arc(pointerX, pointerY, 9, 0, Math.PI * 2);
    canvasCtx.fill();

    canvasCtx.fillStyle = '#ffffff';
    canvasCtx.font = 'bold 12px "Outfit", sans-serif';
    canvasCtx.textAlign = 'center';
    canvasCtx.fillText('CLICK', pointerX, pointerY - 20);
  } else {
    canvasCtx.shadowColor = '#00ff88';
    canvasCtx.shadowBlur = 12;

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

// Initial Load Round
startNewRound();
requestAnimationFrame(render);
