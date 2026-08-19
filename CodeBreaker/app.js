/* ===================== AR Code Breaker - Hand Tracking Engine ===================== */

        // --- Question Bank (grouped by difficulty) ---
        const QUESTION_BANK = {
            easy: [
                { q: "x = 5\ny = 3\n\nx + y = ?", ans: ["7", "8", "9", "15"], correct: 1 },
                { q: "x = 10\ny = 4\n\nx - y = ?", ans: ["14", "4", "6", "40"], correct: 2 },
                { q: "name = \"Maejo\"\n\nlen(name) = ?", ans: ["4", "5", "6", "7"], correct: 1 },
                { q: "x = 2\n\nx * x = ?", ans: ["2", "4", "6", "8"], correct: 1 },
                { q: "score = 40\n\nif score >= 50\n    PASS\nelse\n    FAIL\n\nผลลัพธ์คืออะไร?", ans: ["PASS", "FAIL", "ERROR", "NONE"], correct: 1 },
                { q: "for i = 1 to 4\n    print(\"Hi\")\n\n\"Hi\" ถูกแสดงกี่ครั้ง?", ans: ["2 ครั้ง", "3 ครั้ง", "4 ครั้ง", "5 ครั้ง"], correct: 2 },
                { q: "x = True\ny = False\n\nx and y = ?", ans: ["True", "False", "Error", "None"], correct: 1 },
                { q: "x = True\ny = False\n\nx or y = ?", ans: ["True", "False", "Error", "None"], correct: 0 },
                { q: "list = [1, 2, 3]\n\nlist[0] = ?", ans: ["0", "1", "2", "3"], correct: 1 },
                { q: "x = 7\n\nx % 2 = ?", ans: ["0", "1", "2", "3"], correct: 1 },
            ],
            medium: [
                { q: "x = 10\ny = 5\n\nx + y = ?", ans: ["10", "15", "20", "5"], correct: 1 },
                { q: "x = 10\ny = 3\n\nx - y = ?", ans: ["7", "13", "30", "3"], correct: 0 },
                { q: "score = 80\n\nif score >= 50\n    PASS\nelse\n    FAIL\n\nผลลัพธ์คืออะไร?", ans: ["PASS", "FAIL", "ERROR", "NONE"], correct: 0 },
                { q: "for i = 1 to 3\n    print(\"IT\")\n\nIT ถูกแสดงกี่ครั้ง?", ans: ["1 ครั้ง", "2 ครั้ง", "3 ครั้ง", "4 ครั้ง"], correct: 2 },
                { q: "x = 10\n\nif x > 5\n    OPEN\nelse\n    CLOSE\n\nประตูจะเป็นสถานะอะไร?", ans: ["OPEN", "CLOSE", "ERROR", "LOCK"], correct: 0 },
                { q: "x = 5\ny = 2\n\nx ** y = ?", ans: ["10", "7", "25", "32"], correct: 2 },
                { q: "arr = [3, 1, 4, 1, 5]\n\nlen(arr) = ?", ans: ["3", "4", "5", "6"], correct: 2 },
                { q: "x = \"10\"\ny = 10\n\nx == y = ?", ans: ["True", "False", "Error", "None"], correct: 1 },
                { q: "i = 0\nwhile i < 3:\n    i += 1\n\ni สุดท้าย = ?", ans: ["2", "3", "4", "0"], correct: 1 },
                { q: "def add(a, b):\n    return a + b\n\nadd(3, 4) = ?", ans: ["6", "7", "12", "34"], correct: 1 },
                { q: "x = 5 > 3 and 2 < 1\n\nx = ?", ans: ["True", "False", "Error", "None"], correct: 1 },
                { q: "x = [1, 2, 3]\nx.append(4)\n\nlen(x) = ?", ans: ["3", "4", "5", "Error"], correct: 1 },
            ],
            hard: [
                { q: "fact(0) = 1\nfact(n) = n * fact(n-1)\n\nfact(3) = ?", ans: ["3", "6", "9", "1"], correct: 1 },
                { q: "sum = 0\nfor i in range(1, 5):\n    sum += i\n\nsum = ?", ans: ["8", "9", "10", "15"], correct: 2 },
                { q: "x = 2\nfor i in range(3):\n    x = x * 2\n\nx = ?", ans: ["8", "12", "16", "6"], correct: 2 },
                { q: "เลขฐานสอง 1010\n\nคือเลขฐานสิบเท่าไร?", ans: ["8", "9", "10", "12"], correct: 2 },
                { q: "arr = [5, 3, 8, 1]\nsorted(arr)[1] = ?", ans: ["1", "3", "5", "8"], correct: 1 },
                { q: "x = 7 // 2\n\nx = ?", ans: ["3.5", "3", "4", "1"], correct: 1 },
                { q: "0, 1, 1, 2, 3, ?\n\n(Fibonacci) ตัวถัดไปคือ?", ans: ["4", "5", "6", "8"], correct: 1 },
                { q: "x = True\ny = not x\n\ny = ?", ans: ["True", "False", "Error", "None"], correct: 1 },
                { q: "def f(n):\n    if n <= 1: return n\n    return f(n-1) + f(n-2)\n\nf(5) = ?", ans: ["3", "5", "8", "13"], correct: 1 },
                { q: "while True:\n    x = x + 1\n\n(ไม่มี break)\n\nผลลัพธ์คืออะไร?", ans: ["x = 0", "x = 1", "Infinite Loop", "Syntax Error"], correct: 2 },
            ],
        };

        const DIFFICULTY_CONFIG = {
            easy:   { count: 8,  time: 12, label: "EASY" },
            medium: { count: 10, time: 10, label: "MEDIUM" },
            hard:   { count: 10, time: 7,  label: "HARD" },
        };

        function shuffle(arr) {
            const a = arr.slice();
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }

        // Shuffle answer order per question while tracking the new correct index
        function shuffleAnswers(level) {
            const idxs = shuffle([0, 1, 2, 3]);
            const ans = idxs.map(i => level.ans[i]);
            const correct = idxs.indexOf(level.correct);
            return { q: level.q, ans, correct };
        }

        // --- State ---
        let difficulty = "medium";
        let levels = [];
        let currentLevel = 0;
        let score = 0;
        let combo = 0;
        let sessionLeaderboard = []; // in-memory only (no persistence across reloads)
        let soundOn = true;

        let gameState = 'init'; // init, start, difficulty, playing, result
        let isClickLocked = false;

        let timeRemaining = 10;
        let timerTotal = 10;
        let timerInterval;
        let timerTicks = 0;

        // Hand tracking / cursor
        let smoothX = window.innerWidth / 2;
        let smoothY = window.innerHeight / 2;
        let targetX = smoothX;
        let targetY = smoothY;
        let isHandVisible = false;
        let handLostAt = 0;
        const HAND_LOST_GRACE = 350; // ms of tolerance before treating hand as gone
        let isPinching = false;

        let currentHoverElement = null;
        let hoverStartTime = 0;
        const DWELL_TIME = 500; // ลดเวลาโหลดจาก 0.75 เป็น 0.5 วินาทีเพื่อให้ไวขึ้น

        // DOM refs
        const videoElement = document.getElementById('webcam');
        const cursorElement = document.getElementById('hand-cursor');
        const cursorRing = document.querySelector('#cursor-ring circle');
        const statusText = document.getElementById('status-text');
        const statusDot = document.getElementById('status-dot');
        const notifElement = document.getElementById('notification');
        const particleLayer = document.getElementById('particle-layer');
        const muteBtn = document.getElementById('mute-btn');
        const modeToggleBtn = document.getElementById('mode-toggle-btn');
        let isMouseMode = false; // false = Camera AI mode, true = Mouse/Touch mode

        // --- Mode Toggle Handler ---
        if (modeToggleBtn) {
            modeToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                isMouseMode = !isMouseMode;
                if (isMouseMode) {
                    modeToggleBtn.classList.add('mouse-mode');
                    modeToggleBtn.innerText = "🖱️ โหมด: เมาส์ / สัมผัส";
                    statusDot.classList.add('active');
                    statusText.innerText = "MOUSE MODE ACTIVE";
                    
                    // Enable start button immediately if in init state
                    const btnStart = document.getElementById('btn-start');
                    if (btnStart) {
                        btnStart.style.opacity = "1";
                        btnStart.style.pointerEvents = "auto";
                        btnStart.innerHTML = "[ START GAME (MOUSE) ]";
                    }
                    if (gameState === 'init') {
                        gameState = 'start';
                    }
                    // Hide AR hand cursor
                    if (cursorElement) cursorElement.style.display = 'none';
                    resetDwell();
                } else {
                    modeToggleBtn.classList.remove('mouse-mode');
                    modeToggleBtn.innerText = "🖐️ โหมด: กล้อง AI";
                    if (isHandVisible) {
                        statusDot.classList.add('active');
                        statusText.innerText = "HAND DETECTED";
                    } else {
                        statusDot.classList.remove('active');
                        statusText.innerText = "SHOW YOUR HAND";
                    }
                    const btnStart = document.getElementById('btn-start');
                    if (btnStart && !isHandVisible) {
                        btnStart.style.opacity = "0.5";
                        btnStart.style.pointerEvents = "none";
                        btnStart.innerHTML = "[ START AR EXPERIENCE ]<br><small style=\"font-size: 0.7rem; color: #aaa;\">Waiting for Hand Detection...</small>";
                    }
                }
            });
        }

        // --- Audio (synthesized, no external assets) ---
        let audioCtx = null;
        function ensureAudio() {
            if (!audioCtx) {
                try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
                catch (e) { audioCtx = null; }
            }
            if (audioCtx && audioCtx.state === 'suspended') {
                audioCtx.resume().catch(() => {});
            }
        }

        // Unlock audio on first real touch/click to comply with browser autoplay policies
        document.body.addEventListener('click', () => {
            if (soundOn) ensureAudio();
        }, { once: true });

        function beep(freq, duration, type = 'sine', vol = 0.15, delay = 0) {
            if (!soundOn) return;
            ensureAudio();
            if (!audioCtx) return;
            const t0 = audioCtx.currentTime + delay;
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, t0);
            gain.gain.setValueAtTime(vol, t0);
            gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
            osc.connect(gain).connect(audioCtx.destination);
            osc.start(t0);
            osc.stop(t0 + duration);
        }
        function sfxHover() { beep(880, 0.05, 'sine', 0.05); }
        function sfxClick() { beep(1200, 0.08, 'square', 0.08); }
        function sfxCorrect() { beep(660, 0.12, 'sine', 0.15); beep(990, 0.15, 'sine', 0.15, 0.1); }
        function sfxWrong() { beep(180, 0.25, 'sawtooth', 0.12); }
        function sfxTick() { beep(440, 0.04, 'sine', 0.04); }
        function sfxWin() { [523, 659, 784, 1046].forEach((f, i) => beep(f, 0.18, 'sine', 0.12, i * 0.12)); }

        muteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // prevent triggering other clicks
            soundOn = !soundOn;
            muteBtn.textContent = soundOn ? '🔊' : '🔇';
        });

        // --- Camera / Hand Tracking Init ---
        async function initCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }
                });
                videoElement.srcObject = stream;
                statusText.innerText = "LOADING AI MODEL...";
                initHandTracking();
            } catch (err) {
                statusText.innerText = "NO CAMERA - TAP MODE";
                statusDot.classList.remove('active');
                document.getElementById('fallback-hint').style.display = 'block';
                isMouseMode = true;
                if (modeToggleBtn) {
                    modeToggleBtn.classList.add('mouse-mode');
                    modeToggleBtn.innerText = "🖱️ โหมด: เมาส์ / สัมผัส";
                }
                enableFallbackClicks();
                
                // still allow starting via touch/mouse even without a camera
                const btnStart = document.getElementById('btn-start');
                btnStart.style.opacity = "1";
                btnStart.style.pointerEvents = "auto";
                btnStart.innerHTML = "[ START GAME (MOUSE) ]";
                gameState = 'start';
                requestAnimationFrame(gameLoop);
            }
        }

        function initHandTracking() {
            let hands;
            try {
                hands = new Hands({
                    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
                });
            } catch (e) {
                statusText.innerText = "AI MODEL FAILED - TAP MODE";
                isMouseMode = true;
                if (modeToggleBtn) {
                    modeToggleBtn.classList.add('mouse-mode');
                    modeToggleBtn.innerText = "🖱️ โหมด: เมาส์ / สัมผัส";
                }
                enableFallbackClicks();
                return;
            }

            hands.setOptions({
                maxNumHands: 1,
                modelComplexity: 1,
                minDetectionConfidence: 0.7,
                minTrackingConfidence: 0.7
            });

            hands.onResults(processHandResults);

            const camera = new Camera(videoElement, {
                onFrame: async () => { await hands.send({ image: videoElement }); },
                width: 1280,
                height: 720
            });
            camera.start().catch(() => {
                statusText.innerText = "CAMERA FAILED - TAP MODE";
                isMouseMode = true;
                if (modeToggleBtn) {
                    modeToggleBtn.classList.add('mouse-mode');
                    modeToggleBtn.innerText = "🖱️ โหมด: เมาส์ / สัมผัส";
                }
                enableFallbackClicks();
            });

            enableFallbackClicks(); // Always enable fallback clicks
            requestAnimationFrame(gameLoop);
        }

        // Always allow real touch/mouse clicks
        function enableFallbackClicks() {
            document.body.addEventListener('click', (e) => {
                if (isClickLocked) return; // Prevent double clicking
                const target = e.target.closest('.hoverable');
                if (!target || target.style.pointerEvents === 'none') return;
                sfxClick();
                handleAction(target);
            });
        }

        // --- Hand Tracking Core ---
        function processHandResults(results) {
            if (isMouseMode) return; // Ignore hand tracking when in mouse mode

            if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
                isHandVisible = true;
                handLostAt = 0;
                const landmarks = results.multiHandLandmarks[0];
                getIndexFingerPosition(landmarks);
                updatePinchState(landmarks);

                if (gameState === 'init') {
                    gameState = 'start';
                    statusText.innerText = "HAND DETECTED";
                    statusDot.classList.add('active');
                    const btnStart = document.getElementById('btn-start');
                    btnStart.style.opacity = "1";
                    btnStart.style.pointerEvents = "auto";
                    btnStart.innerHTML = "[ START AR EXPERIENCE ]";
                } else {
                    statusText.innerText = "HAND DETECTED";
                    statusDot.classList.add('active');
                }
            } else {
                // Debounce hand loss so brief tracking flicker doesn't cancel dwell
                if (isHandVisible && handLostAt === 0) {
                    handLostAt = Date.now();
                } else if (handLostAt && Date.now() - handLostAt > HAND_LOST_GRACE) {
                    isHandVisible = false;
                    statusText.innerText = "SHOW YOUR HAND";
                    statusDot.classList.remove('active');
                }
            }
        }

        function getIndexFingerPosition(landmarks) {
            const indexFinger = landmarks[8]; // index tip
            targetX = (1 - indexFinger.x) * window.innerWidth;
            targetY = indexFinger.y * window.innerHeight;
        }

        function updatePinchState(landmarks) {
            const thumbTip = landmarks[4];
            const indexTip = landmarks[8];
            const dx = thumbTip.x - indexTip.x;
            const dy = thumbTip.y - indexTip.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            isPinching = dist < 0.075; // ปรับระยะ pinch ให้พอดี ตั้งใจจีบถึงติด ไม่ลั่นเองเวลาแค่ชี้
        }

        function updateHandCursor() {
            if (isMouseMode) {
                cursorElement.style.display = 'none';
                return;
            }

            if (isHandVisible) {
                cursorElement.style.display = 'block';
                smoothX += (targetX - smoothX) * 0.35;
                smoothY += (targetY - smoothY) * 0.35;
                cursorElement.style.left = `${smoothX}px`;
                cursorElement.style.top = `${smoothY}px`;
                cursorElement.classList.toggle('pinch', isPinching);
            } else {
                cursorElement.style.display = 'none';
                resetDwell();
            }
        }

        // --- Hover & Dwell / Pinch Logic ---
        const HOVER_BUFFER = 50; // เพิ่มระยะกันมือสั่นจาก 28 เป็น 50 px 

        function isPointNearElement(el, x, y, margin) {
            const r = el.getBoundingClientRect();
            return x >= r.left - margin && x <= r.right + margin &&
                   y >= r.top - margin && y <= r.bottom + margin;
        }

        function checkFingerHover() {
            if (isMouseMode || !isHandVisible || isClickLocked) {
                resetDwell();
                return;
            }

            if (currentHoverElement && isPointNearElement(currentHoverElement, smoothX, smoothY, HOVER_BUFFER)) {
                const isAnswer = currentHoverElement.classList.contains('answer-btn');

                if (isPinching) {
                    currentHoverElement.style.setProperty('--dwell', '100%');
                    triggerVirtualClick();
                } else if (!isAnswer) {
                    // For menu buttons (Start / Difficulty / Restart), allow dwell hover
                    updateDwellProgress();
                } else {
                    // For answer buttons: STRICTLY PINCH ONLY!
                    // No dwell progress, show subtle hover state until player pinches
                    cursorRing.style.strokeDashoffset = 157;
                    currentHoverElement.style.setProperty('--dwell', '0%');
                }
                return;
            }

            const elementUnderFinger = document.elementFromPoint(smoothX, smoothY);
            const target = elementUnderFinger && elementUnderFinger.closest('.hoverable');
            const validTarget = target && target.style.pointerEvents !== 'none';

            if (validTarget) {
                resetDwell();
                currentHoverElement = target;
                currentHoverElement.classList.add('hovering');
                hoverStartTime = Date.now();
                sfxHover();
            } else {
                resetDwell();
            }
        }

        function updateDwellProgress() {
            const elapsed = Date.now() - hoverStartTime;
            const progress = Math.min(elapsed / DWELL_TIME, 1);
            const offset = 157 - (157 * progress);
            cursorRing.style.strokeDashoffset = offset;
            currentHoverElement.style.setProperty('--dwell', `${progress * 100}%`);
            if (progress >= 1.0) triggerVirtualClick();
        }

        function triggerVirtualClick() {
            if (currentHoverElement && !isClickLocked) {
                isClickLocked = true;
                sfxClick();
                cursorRing.style.strokeDashoffset = 157;
                cursorElement.style.transform = "translate(-50%, -50%) scale(1.5)";
                setTimeout(() => { cursorElement.style.transform = "translate(-50%, -50%) scale(1)"; }, 150);
                handleAction(currentHoverElement);
                resetDwell();
            }
        }

        // Central action handler
        function handleAction(el) {
            if (el.id === 'btn-start') {
                showDifficultyScreen();
            } else if (el.classList.contains('diff-btn')) {
                difficulty = el.dataset.diff;
                startGame();
            } else if (el.id === 'btn-restart') {
                resetGame();
            } else if (el.classList.contains('answer-btn')) {
                const ansIndex = parseInt(el.dataset.index);
                checkAnswer(ansIndex, el);
            }
        }

        function resetDwell() {
            if (currentHoverElement) {
                currentHoverElement.classList.remove('hovering');
                currentHoverElement.style.removeProperty('--dwell');
            }
            currentHoverElement = null;
            hoverStartTime = 0;
            cursorRing.style.strokeDashoffset = 157;
        }

        // --- Game Flow ---
        function showDifficultyScreen() {
            document.getElementById('start-screen').classList.remove('active');
            document.getElementById('difficulty-screen').classList.add('active');
            gameState = 'difficulty';
            
            // ✨ ทำการปลดล็อคการคลิกหลังจากเปลี่ยนหน้า
            setTimeout(() => { isClickLocked = false; }, 400);
        }

        function startGame() {
            document.getElementById('difficulty-screen').classList.remove('active');
            document.getElementById('start-screen').classList.remove('active');
            document.getElementById('game-screen').classList.add('active');
            document.getElementById('hud').style.display = 'flex';

            const cfg = DIFFICULTY_CONFIG[difficulty];
            const pool = shuffle(QUESTION_BANK[difficulty]).slice(0, cfg.count);
            levels = pool.map(shuffleAnswers);
            timerTotal = cfg.time;

            gameState = 'playing';
            currentLevel = 0;
            score = 0;
            combo = 0;
            updateScoreUI();
            buildLevelDots();
            loadQuestion();
        }

        function buildLevelDots() {
            const dotsEl = document.getElementById('level-dots');
            dotsEl.innerHTML = '';
            levels.forEach(() => {
                const d = document.createElement('div');
                d.className = 'level-dot';
                dotsEl.appendChild(d);
            });
        }

        function updateLevelDots() {
            const dots = document.querySelectorAll('.level-dot');
            dots.forEach((d, i) => {
                d.classList.toggle('done', i < currentLevel);
                d.classList.toggle('current', i === currentLevel);
            });
        }

        function loadQuestion() {
            if (currentLevel >= levels.length) {
                showResult();
                return;
            }

            document.getElementById('level-label').innerText =
                `🔐 LEVEL ${currentLevel + 1} / ${levels.length} — ${DIFFICULTY_CONFIG[difficulty].label}`;
            updateLevelDots();

            const levelData = levels[currentLevel];
            document.getElementById('question-text').innerText = levelData.q;

            const answersGrid = document.getElementById('answers-container');
            answersGrid.innerHTML = '';
            levelData.ans.forEach((text, index) => {
                const btn = document.createElement('div');
                btn.className = 'hoverable answer-btn';
                btn.dataset.index = index;
                btn.innerHTML = text;
                answersGrid.appendChild(btn);
            });

            isClickLocked = false;
            startTimer();
        }

        function checkAnswer(selectedIndex, btnElement) {
            isClickLocked = true; // Lock immediately to prevent double clicks
            clearInterval(timerInterval);
            const levelData = levels[currentLevel];
            const isCorrect = (selectedIndex === levelData.correct);

            if (isCorrect) {
                btnElement.classList.add('correct-answer');
                combo++;
                const points = 100 * (combo > 1 ? combo : 1);
                score += points;
                showNotification("✓ CORRECT!", "var(--success)");
                spawnParticles(btnElement);
                sfxCorrect();
            } else {
                btnElement.classList.add('wrong-answer');
                combo = 0;
                score = Math.max(0, score - 50);
                showNotification("✕ TRY AGAIN", "var(--danger)");
                sfxWrong();
                const allBtns = document.querySelectorAll('.answer-btn');
                allBtns[levelData.correct].classList.add('correct-answer');
            }

            updateScoreUI();

            setTimeout(() => {
                currentLevel++;
                loadQuestion();
            }, 1800);
        }

        function updateScoreUI() {
            document.getElementById('score-display').innerText = score;
            const comboEl = document.getElementById('combo-text');
            const comboNum = document.getElementById('combo-display');
            if (combo >= 2) {
                comboEl.classList.add('show');
                comboNum.innerText = combo;
            } else {
                comboEl.classList.remove('show');
            }
        }

        function spawnParticles(fromEl) {
            const rect = fromEl.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            for (let i = 0; i < 14; i++) {
                const p = document.createElement('div');
                p.className = 'particle';
                const angle = (Math.PI * 2 * i) / 14;
                const dist = 60 + Math.random() * 40;
                p.style.setProperty('--px', `${Math.cos(angle) * dist}px`);
                p.style.setProperty('--py', `${Math.sin(angle) * dist}px`);
                p.style.left = `${cx}px`;
                p.style.top = `${cy}px`;
                particleLayer.appendChild(p);
                setTimeout(() => p.remove(), 850);
            }
        }

        // --- Timer ---
        function startTimer() {
            timerTicks = 0;
            timeRemaining = timerTotal;
            updateTimerUI();

            clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                timerTicks++;
                timeRemaining = Math.max(0, timerTotal - timerTicks * 0.1);
                
                // Fixed: Check ticks directly to avoid floating point math errors
                if (timeRemaining <= 3 && timeRemaining > 0) {
                    if (timerTicks % 10 === 0) sfxTick();
                }
                
                updateTimerUI();
                if (timeRemaining <= 0) {
                    clearInterval(timerInterval);
                    handleTimeOut();
                }
            }, 100);
        }

        function updateTimerUI() {
            document.getElementById('time-display').innerText = timeRemaining.toFixed(1);
            const percentage = (timeRemaining / timerTotal) * 100;
            const bar = document.getElementById('timer-bar');
            bar.style.width = `${percentage}%`;
            const warning = timeRemaining <= 3;
            bar.classList.toggle('timer-warning', warning);
            document.getElementById('time-display').style.color = warning ? 'var(--danger)' : 'white';
        }

        function handleTimeOut() {
            isClickLocked = true;
            combo = 0;
            updateScoreUI();
            showNotification("TIME OUT", "var(--danger)");
            sfxWrong();
            const allBtns = document.querySelectorAll('.answer-btn');
            if (allBtns[levels[currentLevel].correct]) {
                allBtns[levels[currentLevel].correct].classList.add('correct-answer');
            }
            setTimeout(() => {
                currentLevel++;
                loadQuestion();
            }, 1800);
        }

        // --- Result / Leaderboard ---
        function showNotification(text, color) {
            notifElement.innerText = text;
            notifElement.style.color = color;
            notifElement.classList.add('show');
            setTimeout(() => notifElement.classList.remove('show'), 1300);
        }

        function showResult() {
            gameState = 'result';
            document.getElementById('game-screen').classList.remove('active');
            document.getElementById('hud').style.display = 'none';
            document.getElementById('result-screen').classList.add('active');

            document.getElementById('final-score').innerText = score;
            sfxWin();

            let stars = "★☆☆☆☆";
            if (score >= 500) stars = "★★★★★";
            else if (score >= 300) stars = "★★★★☆";
            else if (score >= 100) stars = "★★★☆☆";
            document.getElementById('star-rating').innerText = stars;

            sessionLeaderboard.push({ score, difficulty });
            sessionLeaderboard.sort((a, b) => b.score - a.score);
            sessionLeaderboard = sessionLeaderboard.slice(0, 5);
            renderLeaderboard();

            setTimeout(() => { isClickLocked = false; }, 800);
        }

        function renderLeaderboard() {
            const list = document.getElementById('leaderboard-list');
            list.innerHTML = '';
            sessionLeaderboard.forEach((entry, i) => {
                const li = document.createElement('li');
                const isThisRun = entry.score === score && i === sessionLeaderboard.findIndex(e => e.score === score);
                if (isThisRun) li.classList.add('me');
                li.innerHTML = `<span>#${i + 1} · ${entry.difficulty.toUpperCase()}</span><span>${entry.score}</span>`;
                list.appendChild(li);
            });
        }

        function resetGame() {
            document.getElementById('result-screen').classList.remove('active');
            document.getElementById('start-screen').classList.add('active');
            gameState = 'start';
            setTimeout(() => { isClickLocked = false; }, 400);
        }

        // --- Main Loop ---
        function gameLoop() {
            updateHandCursor();
            checkFingerHover();
            requestAnimationFrame(gameLoop);
        }

        window.onload = initCamera;
