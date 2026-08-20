/* ============================================================
   เสียง
   ============================================================ */
let audioCtx = null;

function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

// เสียง "ติ๊ง" ตอนได้คะแนน — สลับโน้ตขึ้นบันไดตามคอมโบ ทำให้ยิ่งรัวยิ่งสนุก
const SCORE_SCALE = [880.00, 987.77, 1108.73, 1318.51, 1479.98, 1760.00];
let scoreNoteIndex = 0;

function playScoreSound() {
    try {
        const ctx = initAudio();
        const t = ctx.currentTime;
        const freq = SCORE_SCALE[scoreNoteIndex % SCORE_SCALE.length];
        scoreNoteIndex++;

        const osc = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc2.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        osc2.frequency.setValueAtTime(freq * 2, t);

        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.28, t + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

        osc.connect(gain); osc2.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t); osc2.start(t);
        osc.stop(t + 0.18); osc2.stop(t + 0.18);
    } catch (e) { console.log(e); }
}

// ---------- เสียงจบเกม: แฟนแฟร์เมเจอร์สดใส + คอร์ดค้างยาว + เสียงหวีดขึ้นสูง ----------
function playWinSound() {
    try {
        const ctx = initAudio();
        const t0 = ctx.currentTime + 0.03;

        const master = ctx.createGain();
        master.gain.value = 0.85;
        const shimmer = ctx.createBiquadFilter();   // ตัดความแหลมบาดหูออก ให้ฟังสดใสแต่นุ่ม
        shimmer.type = 'lowpass';
        shimmer.frequency.value = 6500;
        master.connect(shimmer);
        shimmer.connect(ctx.destination);

        const note = (freq, start, dur, type, vol) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = type;
            o.frequency.setValueAtTime(freq, start);
            g.gain.setValueAtTime(0.0001, start);
            g.gain.exponentialRampToValueAtTime(vol, start + 0.02);
            g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
            o.connect(g); g.connect(master);
            o.start(start); o.stop(start + dur + 0.05);
        };

        // 1) แฟนแฟร์ไล่บันไดเมเจอร์ C-E-G-C-E-G-C (สดใส ร่าเริง)
        const fanfare = [523.25, 659.25, 783.99, 1046.50, 1318.51, 1567.98, 2093.00];
        fanfare.forEach((f, i) => {
            const st = t0 + i * 0.075;
            note(f, st, 0.20, 'triangle', 0.22);
            note(f * 2, st, 0.14, 'sine', 0.10);   // เติมความ "แวววาว"
        });

        // 2) คอร์ด C เมเจอร์ค้างยาว 3.2 วินาที พร้อมสั่นเสียงเบาๆ ให้ฟังมีชีวิต
        const chordStart = t0 + fanfare.length * 0.075;
        const chord = [523.25, 659.25, 783.99, 1046.50];
        const vibrato = ctx.createOscillator();
        const vibratoGain = ctx.createGain();
        vibrato.frequency.value = 5.5;
        vibratoGain.gain.value = 4;
        vibrato.connect(vibratoGain);
        vibrato.start(chordStart); vibrato.stop(chordStart + 3.4);

        chord.forEach((f, i) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = i === 0 ? 'sawtooth' : 'triangle';
            o.frequency.setValueAtTime(f, chordStart);
            vibratoGain.connect(o.frequency);
            g.gain.setValueAtTime(0.0001, chordStart);
            g.gain.exponentialRampToValueAtTime(0.14, chordStart + 0.05);
            g.gain.setValueAtTime(0.14, chordStart + 1.6);
            g.gain.exponentialRampToValueAtTime(0.0001, chordStart + 3.2);
            o.connect(g); g.connect(master);
            o.start(chordStart); o.stop(chordStart + 3.3);
        });

        // 3) เสียงหวีดพุ่งขึ้น "วี๊ดดด" ซ้อนกับเสียงพูด
        const whoop = ctx.createOscillator(), wg = ctx.createGain();
        whoop.type = 'sine';
        whoop.frequency.setValueAtTime(420, chordStart);
        whoop.frequency.exponentialRampToValueAtTime(1500, chordStart + 0.55);
        whoop.frequency.exponentialRampToValueAtTime(900, chordStart + 1.1);
        wg.gain.setValueAtTime(0.0001, chordStart);
        wg.gain.exponentialRampToValueAtTime(0.16, chordStart + 0.08);
        wg.gain.exponentialRampToValueAtTime(0.0001, chordStart + 1.2);
        whoop.connect(wg); wg.connect(master);
        whoop.start(chordStart); whoop.stop(chordStart + 1.3);

        // 4) เกล็ดประกาย (sparkle) โปรยท้ายเพลง
        for (let i = 0; i < 14; i++) {
            const st = chordStart + 0.3 + i * 0.11;
            const f = 1600 + Math.random() * 1600;
            note(f, st, 0.12, 'sine', 0.06);
        }
    } catch (e) { console.log(e); }
}

function shootConfetti() {
    if (typeof confetti !== 'function') return;
    const colors = ['#00ffcc', '#ff0055', '#ffeb3b', '#ffffff', '#ff9f1c'];
    confetti({ particleCount: 160, spread: 100, startVelocity: 55, origin: { y: 0.6 }, colors });

    const end = Date.now() + 4000;
    (function frame() {
        confetti({ particleCount: 6, angle: 60, spread: 65, origin: { x: 0, y: 0.7 }, colors });
        confetti({ particleCount: 6, angle: 120, spread: 65, origin: { x: 1, y: 0.7 }, colors });
        if (Date.now() < end) requestAnimationFrame(frame);
    }());
}

/* ============================================================
   สถานะเกม
   ============================================================ */
const TIME_LIMIT = 20;
const LINE_Y = 0.62;         // ตำแหน่งเส้นบนหน้าจอ (ปรับให้ต่ำลงมาที่ระดับ 62% ของจอ เพื่อให้สลัดแขนสะดวกขึ้น)
const HYSTERESIS = 0.05;     // ครึ่งความสูงโซนกันสั่น
const UPPER_BOUND = LINE_Y - HYSTERESIS;
const LOWER_BOUND = LINE_Y + HYSTERESIS;

const CONFIRM_FRAMES = 2;    // ต้องพ้นโซนติดกันกี่เฟรมถึงนับ (กันหลุดเฟรมเดียว)
const COOLDOWN_MS = 90;      // เวลาขั้นต่ำระหว่างการนับของมือข้างเดียวกัน
const LOST_GRACE_MS = 350;   // มือหายชั่วขณะ ยังจำสถานะเดิมไว้ได้เท่านี้
const VIS_THRESHOLD = 0.5;   // ความมั่นใจขั้นต่ำของจุดที่ใช้ตัดสิน

let score = 0;
let timeLeft = TIME_LIMIT;
let isPlaying = false;
let gameTimer = null;

function createHand(label) {
    return {
        label, state: null,      // true = อยู่เหนือเส้น, false = อยู่ใต้เส้น, null = ยังไม่รู้
        y: null, cand: null, candCount: 0,
        lastScoreT: 0, lastSeenT: 0, source: null, visible: false
    };
}
let leftHand = createHand('L');
let rightHand = createHand('R');

const scoreVal = document.getElementById('score-val');
const timeVal = document.getElementById('time-val');
const progressBar = document.getElementById('progress-bar');
const scoreContainer = document.getElementById('score-container');
const targetLine = document.getElementById('target-line');
const deadZone = document.getElementById('dead-zone');
const warningBanner = document.getElementById('warning-banner');
const pillLeft = document.getElementById('pill-left');
const pillRight = document.getElementById('pill-right');

// วางแถบโซนกันสั่นให้ตรงกับค่า HYSTERESIS จริง
deadZone.style.top = (LINE_Y * 100) + '%';
deadZone.style.height = (HYSTERESIS * 2 * 100) + '%';
targetLine.style.top = (LINE_Y * 100) + '%';

function startGame() {
    initAudio();

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-ui').classList.remove('hidden');

    score = 0;
    scoreNoteIndex = 0;
    timeLeft = TIME_LIMIT;
    leftHand = createHand('L');
    rightHand = createHand('R');
    warningBanner.style.display = 'none';
    progressBar.style.width = '100%';
    timeVal.innerText = timeLeft.toFixed(1);

    updateUI();
    isPlaying = true;

    gameTimer = setInterval(() => {
        if (!isPlaying) return;
        timeLeft -= 0.1;
        timeVal.innerText = Math.max(timeLeft, 0).toFixed(1);
        progressBar.style.width = Math.max((timeLeft / TIME_LIMIT) * 100, 0) + '%';
        if (timeLeft <= 0) endGame();
    }, 100);
}

function flashLine() {
    targetLine.classList.add('line-flash');
    setTimeout(() => targetLine.classList.remove('line-flash'), 150);
    scoreContainer.classList.remove('score-pop');
    void scoreContainer.offsetWidth;
    scoreContainer.classList.add('score-pop');
}

function updateUI() { scoreVal.innerText = score; }

function updatePill(pill, hand) {
    pill.className = 'pill';
    if (!hand.visible) pill.classList.add('lost');
    else if (hand.state === true) pill.classList.add('up');
    else if (hand.state === false) pill.classList.add('down');
}

function endGame() {
    isPlaying = false;
    clearInterval(gameTimer);
    warningBanner.style.display = 'none';

    playWinSound();
    shootConfetti();

    document.getElementById('game-ui').classList.add('hidden');
    document.getElementById('end-screen').classList.remove('hidden');
    document.getElementById('final-score').innerText = score;
}

function resetGame() {
    document.getElementById('end-screen').classList.add('hidden');
    document.getElementById('start-screen').classList.remove('hidden');
}

/* ============================================================
   ระบบตรวจจับท่าทาง
   ============================================================ */
const videoElement = document.getElementById('webcam');
const outputCanvas = document.getElementById('output_canvas');
const canvasCtx = outputCanvas.getContext('2d');

function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    outputCanvas.width = Math.round(window.innerWidth * dpr);
    outputCanvas.height = Math.round(window.innerHeight * dpr);
}

// คำนวณกรอบภาพแบบ "cover" เพื่อให้ภาพไม่ยืดผิดสัดส่วน
// และใช้กรอบเดียวกันแปลงพิกัดแลนด์มาร์ก -> เส้นบนจอตรงกับตำแหน่งมือจริงที่ผู้เล่นเห็น
function coverRect(iw, ih, cw, ch) {
    const scale = Math.max(cw / iw, ch / ih);
    const w = iw * scale, h = ih * scale;
    return { x: (cw - w) / 2, y: (ch - h) / 2, w, h };
}

// เลือกจุดที่น่าเชื่อถือที่สุดของมือแต่ละข้าง: ข้อมือเป็นหลัก, ถ้าข้อมือไม่ชัดใช้ฐานนิ้วชี้แทน
function pickHandPoint(lm, wristIdx, indexIdx) {
    const wrist = lm[wristIdx];
    const index = lm[indexIdx];
    if (wrist && wrist.visibility > VIS_THRESHOLD) return { y: wrist.y, x: wrist.x, source: 'wrist' };
    if (index && index.visibility > VIS_THRESHOLD + 0.1) return { y: index.y, x: index.x, source: 'index' };
    return null;
}

// กรองสัญญาณแบบปรับตัว: มือขยับเร็ว = ตามทันที (ไม่หน่วง), มือนิ่ง = กรองแรง (กันสั่น)
function smoothY(prev, raw) {
    if (prev === null) return raw;
    const delta = Math.abs(raw - prev);
    const alpha = delta > 0.05 ? 0.92 : 0.45;
    return prev + alpha * (raw - prev);
}

function updateHandState(hand, screenY, now) {
    hand.y = smoothY(hand.y, screenY);
    const y = hand.y;

    if (hand.state === null) {                 // ครั้งแรก: จำสถานะโดยไม่ให้คะแนน
        if (y < UPPER_BOUND) hand.state = true;
        else if (y > LOWER_BOUND) hand.state = false;
        hand.cand = null; hand.candCount = 0;
        return false;
    }

    let target = null;
    if (y < UPPER_BOUND) target = true;
    else if (y > LOWER_BOUND) target = false;

    if (target === null || target === hand.state) {   // ยังอยู่ในโซนกันสั่น หรือฝั่งเดิม
        hand.cand = null; hand.candCount = 0;
        return false;
    }

    if (hand.cand !== target) { hand.cand = target; hand.candCount = 1; }
    else hand.candCount++;

    if (hand.candCount >= CONFIRM_FRAMES && now - hand.lastScoreT > COOLDOWN_MS) {
        hand.state = target;
        hand.lastScoreT = now;
        hand.cand = null; hand.candCount = 0;
        return true;
    }
    return false;
}

function markerColor(hand) {
    if (!hand.visible) return 'rgba(255,255,255,0.3)';
    return hand.state === true ? '#00ffcc' : '#ffeb3b';
}

function onResults(results) {
    const cw = outputCanvas.width, ch = outputCanvas.height;
    const img = results.image;
    const iw = img.width || 640, ih = img.height || 480;
    const r = coverRect(iw, ih, cw, ch);

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, cw, ch);
    canvasCtx.drawImage(img, r.x, r.y, r.w, r.h);

    const now = performance.now();
    const lm = results.poseLandmarks;

    if (lm) {
        // วาดโครงร่างให้ทับกับภาพที่ครอปแล้วพอดี
        canvasCtx.save();
        canvasCtx.translate(r.x, r.y);
        canvasCtx.scale(r.w / cw, r.h / ch);
        drawConnectors(canvasCtx, lm, POSE_CONNECTIONS, { color: 'rgba(0, 255, 204, 0.35)', lineWidth: 3 });
        drawLandmarks(canvasCtx, lm, { color: 'rgba(255, 0, 85, 0.8)', lineWidth: 1, radius: 3 });
        canvasCtx.restore();

        const hands = [
            { hand: leftHand, point: pickHandPoint(lm, 15, 19) },
            { hand: rightHand, point: pickHandPoint(lm, 16, 20) }
        ];

        let scoredThisFrame = 0;

        for (const { hand, point } of hands) {
            if (point) {
                hand.visible = true;
                hand.lastSeenT = now;
                if (hand.source && hand.source !== point.source) { hand.cand = null; hand.candCount = 0; }
                hand.source = point.source;

                // แปลงพิกัดของภาพ -> พิกัดหน้าจอ (0-1) ผ่านกรอบ cover เดียวกับที่วาด
                const screenY = (r.y + point.y * r.h) / ch;

                if (isPlaying && updateHandState(hand, screenY, now)) scoredThisFrame++;
                else if (!isPlaying) hand.y = smoothY(hand.y, screenY);

                // จุดวงกลมใหญ่ตรงมือ เพื่อให้เห็นชัดว่าระบบกำลังจับมือถูกจุด
                const px = r.x + point.x * r.w;
                const py = r.y + point.y * r.h;
                canvasCtx.beginPath();
                canvasCtx.arc(px, py, 14, 0, Math.PI * 2);
                canvasCtx.fillStyle = markerColor(hand);
                canvasCtx.globalAlpha = 0.85;
                canvasCtx.fill();
                canvasCtx.globalAlpha = 1;
                canvasCtx.lineWidth = 3;
                canvasCtx.strokeStyle = '#ffffff';
                canvasCtx.stroke();
            } else {
                hand.visible = false;
                // มือหายนานเกิน grace -> ล้างสถานะ กลับมาใหม่จะไม่นับคะแนนผี
                if (now - hand.lastSeenT > LOST_GRACE_MS) {
                    hand.state = null; hand.y = null; hand.cand = null; hand.candCount = 0;
                }
            }
        }

        if (scoredThisFrame > 0) {
            score += scoredThisFrame;   // ข้ามพร้อมกัน 2 มือในเฟรมเดียว = 2 คะแนน
            updateUI();
            flashLine();
            playScoreSound();
        }
    } else {
        leftHand.visible = false;
        rightHand.visible = false;
        if (now - leftHand.lastSeenT > LOST_GRACE_MS) { leftHand.state = null; leftHand.y = null; }
        if (now - rightHand.lastSeenT > LOST_GRACE_MS) { rightHand.state = null; rightHand.y = null; }
    }

    if (isPlaying) {
        updatePill(pillLeft, leftHand);
        updatePill(pillRight, rightHand);
        const bothLost = !leftHand.visible && !rightHand.visible;
        const oneLost = !leftHand.visible || !rightHand.visible;
        if (bothLost) {
            warningBanner.innerText = '⚠️ ถอยหลังให้กล้องเห็นลำตัวส่วนบน';
            warningBanner.style.display = 'block';
        } else if (oneLost) {
            warningBanner.innerText = '⚠️ ยกมือ' + (!leftHand.visible ? 'ซ้าย' : 'ขวา') + 'ให้กล้องเห็นชัดๆ';
            warningBanner.style.display = 'block';
        } else {
            warningBanner.style.display = 'none';
        }
    }

    canvasCtx.restore();
}

/* ============================================================
   เริ่มระบบ
   ============================================================ */
async function initCamera() {
    sizeCanvas();

    const pose = new Pose({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}` });

    pose.setOptions({
        modelComplexity: 1,            // แม่นขึ้นกว่าเดิมชัดเจนตรงตำแหน่งข้อมือ
        smoothLandmarks: true,
        enableSegmentation: false,
        minDetectionConfidence: 0.6,
        minTrackingConfidence: 0.6
    });
    pose.onResults(onResults);

    const camera = new Camera(videoElement, {
        onFrame: async () => { await pose.send({ image: videoElement }); },
        width: 640,
        height: 480,
        facingMode: 'user'
    });

    try {
        await camera.start();
        document.getElementById('loading-screen').classList.add('hidden');
        document.getElementById('start-screen').classList.remove('hidden');
    } catch (error) {
        console.error(error);
        document.getElementById('loading-screen').innerHTML = `
            <div class="title" style="color:var(--secondary); font-size: 44px;">เปิดกล้องไม่ได้</div>
            <div class="subtitle">เบราว์เซอร์ยังไม่ได้รับสิทธิ์ใช้กล้อง เปิดสิทธิ์กล้องในตั้งค่าเบราว์เซอร์แล้วโหลดหน้านี้ใหม่</div>
        `;
    }
}

window.addEventListener('resize', sizeCanvas);
window.addEventListener('orientationchange', () => setTimeout(sizeCanvas, 300));
window.onload = initCamera;
