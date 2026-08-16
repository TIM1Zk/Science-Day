/* =========================================================
   1. AUDIO SYSTEM
========================================================= */
const AudioSys = {
  ctx: null,
  init(){ if(!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },
  tone(freq, dur, type, vol, glideTo){
    if (GameApp.muted || !this.ctx) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    if (glideTo !== undefined) osc.frequency.exponentialRampToValueAtTime(glideTo, this.ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
    osc.connect(gain); gain.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + dur);
  },
  playLaser(){ this.tone(800, 0.1, 'square', 0.25, 100); },
  playExplosion(isBad){ this.tone(isBad ? 150 : 300, 0.3, isBad ? 'sawtooth' : 'sine', isBad ? 0.45 : 0.28, 0.01); },
  playBossHit(){ this.tone(220, 0.18, 'triangle', 0.4, 60); },
  playBossDestroy(){
    this.tone(90, 0.5, 'sawtooth', 0.5, 0.01);
    setTimeout(() => this.tone(180, 0.4, 'square', 0.3, 0.01), 90);
  },
  playPowerup(){ this.tone(500, 0.12, 'sine', 0.3, 900); },
  playCombo(){ this.tone(700, 0.15, 'triangle', 0.3, 1100); },
  playAlert(){ this.tone(440, 0.25, 'square', 0.3, 380); }
};

/* =========================================================
   2. DATA
========================================================= */
const SAFE_TYPES = [
  { name:'HTTP', color:'#00ff9d' },
  { name:'DB-SYNC', color:'#0984e3' },
  { name:'IOT-DATA', color:'#22e6ff' },
  { name:'VPN-TUN', color:'#38bdf8' },
  { name:'API-CALL', color:'#34d399' }
];
const THREAT_TYPES = [
  { name:'DDOS', color:'#ff3b5c' },
  { name:'TROJAN', color:'#ff5fa8' },
  { name:'MALWARE', color:'#ff6b6b' },
  { name:'RANSOMWARE', color:'#e0264f' }
];
const BOSS_NAMES = ['ZERO-DAY','BOTNET-C2','ROOTKIT-X','APT-WORM'];
const POWERUPS = [
  { code:'SHD', color:'#22e6ff', effect:'shield', duration:6, label:'SHIELD ป้องกัน 6s' },
  { code:'SLW', color:'#7fb0ff', effect:'slowmo', duration:6, label:'SLOW-MO ชะลอเวลา' },
  { code:'EMP', color:'#ffcc4d', effect:'emp', duration:0, label:'EMP BLAST' },
  { code:'x2', color:'#b06bff', effect:'multiplier', duration:8, label:'SCORE ×2' }
];
const DIFF = {
  easy:   { spawnBase:1.05, speedMult:0.80, startUptime:100, totalTime:80, label:'ง่าย' },
  normal: { spawnBase:0.82, speedMult:1.00, startUptime:100, totalTime:70, label:'ปกติ' },
  hard:   { spawnBase:0.58, speedMult:1.28, startUptime:90,  totalTime:60, label:'ยาก' }
};

/* =========================================================
   3. ENTITIES
========================================================= */
class Particle {
  constructor(x, y, color){
    this.x = x; this.y = y; this.color = color;
    this.size = Math.random() * 5 + 3;
    this.vx = (Math.random() - 0.5) * 320;
    this.vy = (Math.random() - 0.5) * 320;
    this.life = 1.0;
  }
  update(dt){
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.vy += 180 * dt;
    this.life -= dt * 1.7;
  }
  draw(ctx){
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 10; ctx.shadowColor = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
    ctx.globalAlpha = 1; ctx.shadowBlur = 0;
  }
}

class Packet {
  constructor(laneX, speedMult, progress){
    const isThreat = Math.random() < 0.42;
    const pool = isThreat ? THREAT_TYPES : SAFE_TYPES;
    const t = pool[Math.floor(Math.random() * pool.length)];
    this.kind = isThreat ? 'threat' : 'safe';
    this.name = t.name; this.color = t.color;
    this.x = laneX; this.y = -60; this.radius = 34;
    this.angle = Math.random() * Math.PI * 2;
    this.spin = (Math.random() - 0.5) * 1.4;
    this.speed = (Math.random() * 55 + 68) * speedMult * (1 + progress * 0.55);
  }
  update(effDt){ this.y += this.speed * effDt; this.angle += this.spin * effDt; }
  draw(ctx){
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#060a10';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.color;
    ctx.shadowBlur = 16; ctx.shadowColor = this.color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = this.color; ctx.globalAlpha = 0.5; ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.arc(0, 0, this.radius - 8, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();

    if (this.kind === 'threat') {
      ctx.fillStyle = this.color;
      ctx.beginPath(); ctx.arc(this.x, this.y, 9, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = this.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(this.x - 7, this.y); ctx.lineTo(this.x + 7, this.y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(this.x, this.y - 7); ctx.lineTo(this.x, this.y + 7); ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.font = "bold 13px 'Share Tech Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(this.name, this.x, this.y - 46);
  }
}

class Boss {
  constructor(laneX, speedMult){
    this.kind = 'boss';
    this.name = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)];
    this.color = '#b06bff';
    this.x = laneX; this.y = -90; this.radius = 54;
    this.hp = 3; this.maxHp = 3; this.angle = 0;
    this.speed = (Math.random() * 16 + 32) * speedMult;
  }
  update(effDt){ this.y += this.speed * effDt; this.angle += effDt * 1.1; }
  draw(ctx){
    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#0c0716';
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = this.color;
    ctx.shadowBlur = 26; ctx.shadowColor = this.color;
    ctx.stroke();
    ctx.shadowBlur = 0;

    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = '#ff6bd6'; ctx.lineWidth = 3; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.arc(0, 0, this.radius - 10, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    ctx.restore();

    ctx.fillStyle = this.color;
    ctx.font = "bold 20px 'Share Tech Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText('☠', this.x, this.y + 7);

    for (let i = 0; i < this.maxHp; i++){
      ctx.beginPath();
      ctx.arc(this.x - 16 + i * 16, this.y - this.radius - 16, 5, 0, Math.PI * 2);
      ctx.fillStyle = i < this.hp ? '#ff6bd6' : '#3a2154';
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = "bold 13px 'Share Tech Mono', monospace";
    ctx.fillText(this.name, this.x, this.y - this.radius - 26);
  }
}

class Capsule {
  constructor(laneX){
    const p = POWERUPS[Math.floor(Math.random() * POWERUPS.length)];
    this.kind = 'capsule';
    this.code = p.code; this.color = p.color; this.effect = p.effect;
    this.duration = p.duration; this.label = p.label;
    this.x = laneX; this.y = -50; this.radius = 30; this.angle = 0;
    this.speed = Math.random() * 25 + 52;
  }
  update(effDt){ this.y += this.speed * effDt; this.angle += effDt * 2.4; }
  draw(ctx){
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.beginPath();
    ctx.moveTo(0, -this.radius); ctx.lineTo(this.radius, 0);
    ctx.lineTo(0, this.radius); ctx.lineTo(-this.radius, 0);
    ctx.closePath();
    ctx.fillStyle = '#0c0a06';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = this.color;
    ctx.shadowBlur = 20; ctx.shadowColor = this.color;
    ctx.stroke();
    ctx.restore();
    ctx.shadowBlur = 0;
    ctx.fillStyle = this.color;
    ctx.font = "bold 14px 'Share Tech Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(this.code, this.x, this.y + 5);
  }
}

/* =========================================================
   4. MAIN GAME
========================================================= */
const GameApp = {
  canvas: document.getElementById('gameCanvas'),
  ctx: document.getElementById('gameCanvas').getContext('2d'),
  video: document.getElementById('videoElement'),
  lanes: [270, 540, 810],

  bgCanvas: document.createElement('canvas'),
  matrixDrops: [],

  score: 0, uptime: 100, timeLeft: 60,
  combo: 0, currentWave: 1, difficulty: 'normal',
  bossActive: false, bossSpawnDelay: 0,
  effects: { shield: 0, slowmo: 0, multiplier: 0 },
  stats: { threatsDestroyed: 0, safePassed: 0, mistakes: 0, maxCombo: 0 },
  logLines: [],

  packets: [], particles: [],
  spawnTimer: 0,
  shake: { time: 0, magnitude: 0, duration: 0 },
  flash: { time: 0, color: '#fff', duration: 0 },
  alertPlayed: false,

  lastTime: 0, isRunning: false, paused: false, muted: false,

  useAI: false, cursorX: 540, cursorY: 360, isPinching: false,

  /* ---------- BOOT (runs once, drives idle + game loop) ---------- */
  boot(){
    this.bgCanvas.width = 1080; this.bgCanvas.height = 720;
    const cols = Math.floor(1080 / 26);
    for (let i = 0; i < cols; i++){
      this.matrixDrops.push(this.newDrop(i * 26 + 10, true));
    }

    this.canvas.onmousedown = (e) => { if (this.isRunning && !this.useAI) this.handleInput(e.offsetX, e.offsetY); };
    this.canvas.onmousemove = (e) => { if (!this.useAI) { this.cursorX = e.offsetX; this.cursorY = e.offsetY; } };
    document.getElementById('btn-pause').onclick = () => this.togglePause();
    document.getElementById('btn-mute').onclick = () => this.toggleMute();
    document.getElementById('pause-overlay').onclick = () => this.togglePause();
    window.addEventListener('keydown', (e) => { if (e.key === 'p' || e.key === 'P') this.togglePause(); });

    this.fitToScreen();
    window.addEventListener('resize', () => this.fitToScreen());

    this.lastTime = performance.now();
    requestAnimationFrame(t => this.frameTick(t));
  },

  fitToScreen(){
    const wrapper = document.getElementById('gameWrapper');
    const availW = window.innerWidth - 24;
    const availH = window.innerHeight - 24;
    const scale = Math.min(1, availW / 1080, availH / 720);
    wrapper.style.transform = `scale(${scale})`;
  },

  newDrop(x, randomY){
    const chars = '01ABCDEF0123456789';
    return {
      x, y: randomY ? Math.random() * -720 : -20,
      speed: Math.random() * 55 + 35,
      char: chars[Math.floor(Math.random() * chars.length)] + chars[Math.floor(Math.random() * chars.length)],
      flicker: Math.random()
    };
  },

  /* ---------- START / RESET ---------- */
  async startGame(withAI){
    this.useAI = withAI;
    AudioSys.init();

    if (withAI){
      document.getElementById('loadingMsg').style.display = 'block';
      await this.initMediaPipe();
      this.video.style.display = 'block';
    }

    const diff = DIFF[this.difficulty];
    this.score = 0; this.uptime = diff.startUptime; this.timeLeft = diff.totalTime;
    this.combo = 0; this.currentWave = 1;
    this.bossActive = false; this.bossSpawnDelay = 0;
    this.effects = { shield: 0, slowmo: 0, multiplier: 0 };
    this.stats = { threatsDestroyed: 0, safePassed: 0, mistakes: 0, maxCombo: 0 };
    this.logLines = [];
    document.getElementById('log-feed').innerHTML = '';
    this.packets = []; this.particles = [];
    this.spawnTimer = 0; this.alertPlayed = false;
    this.paused = false;
    document.getElementById('pause-overlay').style.display = 'none';
    document.getElementById('btn-pause').textContent = '⏸';

    document.getElementById('screen-start').style.display = 'none';
    document.getElementById('screen-end').style.display = 'none';

    this.isRunning = true;
    this.updateUI();
    this.pushLog('[BOOT] Firewall engaged — เริ่มภารกิจ', 'ok');
  },

  async initMediaPipe(){
    const hands = new Hands({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}` });
    hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });

    hands.onResults((results) => {
      if (!this.isRunning) return;
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0){
        const landmarks = results.multiHandLandmarks[0];
        const indexTip = landmarks[8];
        const thumbTip = landmarks[4];
        this.cursorX = (1 - indexTip.x) * this.canvas.width;
        this.cursorY = indexTip.y * this.canvas.height;
        const dx = thumbTip.x - indexTip.x, dy = thumbTip.y - indexTip.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 0.05){
          if (!this.isPinching){ this.isPinching = true; this.handleInput(this.cursorX, this.cursorY); }
        } else { this.isPinching = false; }
      }
    });

    const camera = new Camera(this.video, {
      onFrame: async () => { await hands.send({ image: this.video }); },
      width: 320, height: 240
    });
    await camera.start();
  },

  togglePause(){
    if (!this.isRunning) return;
    this.paused = !this.paused;
    document.getElementById('pause-overlay').style.display = this.paused ? 'flex' : 'none';
    document.getElementById('btn-pause').textContent = this.paused ? '▶' : '⏸';
  },
  toggleMute(){
    this.muted = !this.muted;
    document.getElementById('btn-mute').textContent = this.muted ? '🔇' : '🔊';
  },

  /* ---------- INPUT ---------- */
  handleInput(tx, ty){
    if (!this.isRunning || this.paused) return;
    AudioSys.playLaser();
    const HIT_RADIUS = 50;
    let closestIdx = -1, closestDist = Infinity;
    for (let i = 0; i < this.packets.length; i++){
      const p = this.packets[i];
      const d = Math.hypot(p.x - tx, p.y - ty);
      if (d < p.radius + HIT_RADIUS && d < closestDist){ closestDist = d; closestIdx = i; }
    }
    if (closestIdx === -1) return;
    const p = this.packets[closestIdx];

    if (p.kind === 'capsule'){ this.applyPowerup(p); this.packets.splice(closestIdx, 1); return; }
    if (p.kind === 'boss'){ this.hitBoss(p, closestIdx); return; }
    if (p.kind === 'threat'){ this.destroyThreat(p, closestIdx); return; }
    this.mistakeHitSafe(p, closestIdx);
  },

  gainScore(base){
    const comboMult = 1 + Math.min(Math.floor(this.combo / 5), 4) * 0.25;
    const mult = comboMult * (this.effects.multiplier > 0 ? 2 : 1);
    this.score += Math.round(base * mult);
  },
  bumpCombo(){
    this.combo++;
    if (this.combo > this.stats.maxCombo) this.stats.maxCombo = this.combo;
    if (this.combo > 0 && this.combo % 5 === 0){
      this.showToast(`COMBO ×${this.combo}!`, 'combo');
      AudioSys.playCombo();
    }
  },

  destroyThreat(p, idx){
    this.gainScore(50); this.bumpCombo();
    this.stats.threatsDestroyed++;
    this.spawnParticles(p.x, p.y, p.color, 24);
    AudioSys.playExplosion(true);
    this.packets.splice(idx, 1);
    this.pushLog(`[BLOCK] ${p.name} terminated`, 'ok');
  },
  mistakeHitSafe(p, idx){
    if (!(this.effects.shield > 0)){
      this.uptime -= 15;
      this.shakeScreen(6, 0.2); this.flashScreen('#ff3b5c', 0.25);
    }
    this.combo = 0; this.stats.mistakes++;
    this.spawnParticles(p.x, p.y, '#ff3b5c', 14);
    AudioSys.playExplosion(false);
    this.packets.splice(idx, 1);
    this.pushLog(`[ERROR] ${p.name} blocked by mistake`, 'danger');
  },
  hitBoss(p, idx){
    p.hp -= 1;
    this.spawnParticles(p.x, p.y, p.color, 14);
    AudioSys.playBossHit();
    this.shakeScreen(4, 0.15);
    if (p.hp <= 0){
      this.gainScore(250); this.bumpCombo();
      this.stats.threatsDestroyed++;
      this.spawnParticles(p.x, p.y, p.color, 60);
      AudioSys.playBossDestroy();
      this.shakeScreen(14, 0.4);
      this.showToast('BOSS DESTROYED! +250', 'good');
      this.pushLog(`[KILL] ${p.name} neutralized`, 'ok');
      this.bossActive = false;
      this.packets.splice(idx, 1);
    } else {
      this.showToast(`BOSS HIT ${p.hp}/${p.maxHp}`, 'danger');
    }
  },
  applyPowerup(p){
    AudioSys.playPowerup();
    this.spawnParticles(p.x, p.y, p.color, 24);
    if (p.effect === 'emp'){
      let count = 0;
      for (let i = this.packets.length - 1; i >= 0; i--){
        const q = this.packets[i];
        if (q.kind === 'threat' || q.kind === 'boss'){
          this.spawnParticles(q.x, q.y, q.color, 18);
          this.gainScore(20);
          count++;
          if (q.kind === 'boss') this.bossActive = false;
          this.packets.splice(i, 1);
        }
      }
      this.showToast(`EMP BLAST! กำจัด ${count} ภัยคุกคาม`, 'power');
      this.pushLog(`[EMP] Cleared ${count} threats`, 'ok');
    } else {
      this.effects[p.effect] = Math.min((this.effects[p.effect] || 0) + p.duration, 14);
      this.showToast(`${p.label}`, 'power');
      this.pushLog(`[BUFF] ${p.label} online`, 'ok');
    }
  },

  spawnParticles(x, y, color, n){ for (let i = 0; i < n; i++) this.particles.push(new Particle(x, y, color)); },
  shakeScreen(mag, dur){ this.shake.magnitude = mag; this.shake.time = dur; this.shake.duration = dur; },
  flashScreen(color, dur){ this.flash.color = color; this.flash.time = dur; this.flash.duration = dur; },

  /* ---------- SPAWNING & WAVES ---------- */
  getSpawnInterval(){
    const diff = DIFF[this.difficulty];
    const progress = 1 - (this.timeLeft / diff.totalTime);
    return Math.max(0.32, diff.spawnBase - progress * 0.34);
  },
  spawnRandomEntity(){
    const diff = DIFF[this.difficulty];
    const progress = 1 - (this.timeLeft / diff.totalTime);
    const lane = this.lanes[Math.floor(Math.random() * 3)];
    if (Math.random() < 0.13){
      this.packets.push(new Capsule(lane));
    } else {
      this.packets.push(new Packet(lane, diff.speedMult, progress));
    }
  },
  spawnBoss(){
    if (this.bossActive) return;
    this.bossActive = true;
    const lane = this.lanes[Math.floor(Math.random() * 3)];
    const b = new Boss(lane, DIFF[this.difficulty].speedMult);
    this.packets.push(b);
    this.showToast('⚠ BOSS INCOMING!', 'danger');
    AudioSys.playAlert();
    this.pushLog('[ALERT] High-priority threat detected', 'danger');
  },
  updateWave(){
    const diff = DIFF[this.difficulty];
    const elapsed = diff.totalTime - this.timeLeft;
    const newWave = Math.floor(elapsed / 15) + 1;
    if (newWave !== this.currentWave){
      this.currentWave = newWave;
      this.showWaveBanner(newWave);
      if (newWave >= 2 && !this.bossActive) this.bossSpawnDelay = 1.2;
    }
    if (this.bossSpawnDelay > 0){
      this.bossSpawnDelay = Math.max(0, this.bossSpawnDelay - 1 / 60);
      if (this.bossSpawnDelay <= 0.001 && !this.bossActive) this.spawnBoss();
    }
  },

  /* ---------- CORE UPDATE ---------- */
  updateData(dt){
    const globalMult = this.effects.slowmo > 0 ? 0.45 : 1;
    for (let i = this.packets.length - 1; i >= 0; i--){
      const p = this.packets[i];
      p.update(dt * globalMult);
      if (p.y > 600){
        if (p.kind === 'threat'){
          if (!(this.effects.shield > 0)) { this.uptime -= 20; this.shakeScreen(8, 0.25); this.flashScreen('#ff3b5c', 0.3); }
          this.combo = 0; this.stats.mistakes++;
          this.spawnParticles(p.x, 600, '#ff3b5c', 20);
          AudioSys.playExplosion(true);
          this.pushLog(`[BREACH] ${p.name} reached server`, 'danger');
        } else if (p.kind === 'safe'){
          this.gainScore(10); this.bumpCombo();
          this.stats.safePassed++;
          this.spawnParticles(p.x, 600, '#00ff9d', 12);
          this.pushLog(`[OK] ${p.name} routed safely`, 'ok');
        } else if (p.kind === 'boss'){
          if (!(this.effects.shield > 0)) { this.uptime -= 35; this.shakeScreen(16, 0.5); this.flashScreen('#ff3b5c', 0.4); }
          this.combo = 0; this.stats.mistakes++;
          this.bossActive = false;
          this.spawnParticles(p.x, 600, p.color, 40);
          AudioSys.playAlert();
          this.showToast('CRITICAL: BOSS BREACH!', 'danger');
          this.pushLog(`[CRITICAL] ${p.name} breached server`, 'danger');
        }
        this.packets.splice(i, 1);
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--){
      this.particles[i].update(dt);
      if (this.particles[i].life <= 0) this.particles.splice(i, 1);
    }
    for (const key of ['shield', 'slowmo', 'multiplier']){
      if (this.effects[key] > 0) this.effects[key] = Math.max(0, this.effects[key] - dt);
    }
    if (this.uptime < 30 && !this.alertPlayed){ this.alertPlayed = true; AudioSys.playAlert(); }
  },

  /* ---------- MATRIX BACKGROUND ---------- */
  updateMatrixBG(dt){
    const bctx = this.bgCanvas.getContext('2d');
    bctx.fillStyle = 'rgba(3,5,10,0.14)';
    bctx.fillRect(0, 0, 1080, 720);
    bctx.font = "15px 'Share Tech Mono', monospace";
    bctx.textAlign = 'left';
    for (const d of this.matrixDrops){
      d.y += d.speed * dt;
      if (d.y > 730){ d.y = -Math.random() * 200; d.speed = Math.random() * 55 + 35; }
      if (Math.random() < 0.02) d.char = (Math.random() < 0.5 ? '0' : '1') + Math.floor(Math.random() * 16).toString(16).toUpperCase();
      bctx.fillStyle = `rgba(0,255,157,${0.16 + d.flicker * 0.18})`;
      bctx.fillText(d.char, d.x, d.y);
    }
  },

  /* ---------- MAIN LOOP ---------- */
  frameTick(timestamp){
    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.updateMatrixBG(dt);

    if (this.isRunning && !this.paused){
      this.timeLeft -= dt;
      this.uptime = Math.max(0, Math.min(100, this.uptime));
      if (this.timeLeft <= 0 || this.uptime <= 0){
        this.timeLeft = Math.max(0, this.timeLeft);
        this.gameOver();
      } else {
        this.updateWave();
        this.spawnTimer += dt;
        if (this.spawnTimer > this.getSpawnInterval()){ this.spawnTimer = 0; this.spawnRandomEntity(); }
        this.updateData(dt);
      }
    }

    if (this.shake.time > 0) this.shake.time = Math.max(0, this.shake.time - dt);
    if (this.flash.time > 0) this.flash.time = Math.max(0, this.flash.time - dt);

    this.drawScene();
    if (this.isRunning) this.updateUI();

    requestAnimationFrame(t => this.frameTick(t));
  },

  drawScene(){
    const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height;
    ctx.save();
    if (this.shake.time > 0){
      const amt = this.shake.magnitude * (this.shake.time / this.shake.duration);
      ctx.translate((Math.random() - 0.5) * amt, (Math.random() - 0.5) * amt);
    }

    ctx.drawImage(this.bgCanvas, 0, 0);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 2;
    this.lanes.forEach(x => {
      ctx.beginPath();
      ctx.moveTo(x - 70, 0); ctx.lineTo(x - 70, h);
      ctx.moveTo(x + 70, 0); ctx.lineTo(x + 70, h);
      ctx.stroke();

      ctx.fillStyle = '#0d141d';
      ctx.strokeStyle = this.uptime < 30 ? '#ff3b5c' : (this.uptime < 60 ? '#ffcc4d' : '#1c2733');
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - 80, 600, 160, 120);
      ctx.strokeRect(x - 80, 600, 160, 120);

      ctx.fillStyle = '#00ff9d';
      ctx.font = "13px 'Share Tech Mono', monospace";
      ctx.textAlign = 'center';
      ctx.fillText('SERVER NODE', x, 630);
    });

    this.packets.forEach(p => p.draw(ctx));
    this.particles.forEach(pt => pt.draw(ctx));

    if (this.isRunning){
      ctx.beginPath();
      ctx.arc(this.cursorX, this.cursorY, this.isPinching ? 15 : 25, 0, Math.PI * 2);
      ctx.strokeStyle = this.isPinching ? '#ff3b5c' : '#22e6ff';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(this.cursorX, this.cursorY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.fill();
    }
    ctx.restore();

    if (this.flash.time > 0){
      ctx.globalAlpha = (this.flash.time / this.flash.duration) * 0.3;
      ctx.fillStyle = this.flash.color;
      ctx.fillRect(0, 0, w, h);
      ctx.globalAlpha = 1;
    }
  },

  /* ---------- UI ---------- */
  updateUI(){
    document.getElementById('ui-score').textContent = String(this.score).padStart(5, '0');
    document.getElementById('ui-time').textContent = Math.max(0, this.timeLeft).toFixed(1) + 's';
    document.getElementById('ui-wave').textContent = this.currentWave;

    const comboPanel = document.getElementById('combo-panel');
    document.getElementById('ui-combo').textContent = '×' + this.combo;
    comboPanel.classList.toggle('active', this.combo >= 2);

    const uptimeBar = document.getElementById('ui-uptime');
    uptimeBar.style.width = this.uptime + '%';
    const dot = document.getElementById('ui-threatdot');
    const txt = document.getElementById('ui-threattext');
    const wrapper = document.getElementById('gameWrapper');
    wrapper.classList.remove('level-warn', 'level-critical');
    if (this.uptime > 60){ uptimeBar.style.background = 'var(--neon-green)'; dot.className = 'threat-dot'; txt.textContent = 'SAFE'; }
    else if (this.uptime > 30){ uptimeBar.style.background = 'var(--neon-gold)'; dot.className = 'threat-dot warn'; txt.textContent = 'WARNING'; wrapper.classList.add('level-warn'); }
    else { uptimeBar.style.background = 'var(--neon-red)'; dot.className = 'threat-dot critical'; txt.textContent = 'CRITICAL'; wrapper.classList.add('level-critical'); }

    const boss = this.packets.find(p => p.kind === 'boss');
    const bossHud = document.getElementById('boss-hud');
    if (boss){
      bossHud.style.display = 'block';
      document.getElementById('boss-name').textContent = `⚠ ${boss.name} DETECTED`;
      document.getElementById('boss-hp-fill').style.width = (boss.hp / boss.maxHp * 100) + '%';
    } else { bossHud.style.display = 'none'; }

    const puEl = document.getElementById('ui-powerups');
    let html = '';
    if (this.effects.shield > 0) html += `<div class="powerup-badge">🛡 SHIELD ${this.effects.shield.toFixed(1)}s</div>`;
    if (this.effects.slowmo > 0) html += `<div class="powerup-badge">⏳ SLOW-MO ${this.effects.slowmo.toFixed(1)}s</div>`;
    if (this.effects.multiplier > 0) html += `<div class="powerup-badge">✖2 SCORE×2 ${this.effects.multiplier.toFixed(1)}s</div>`;
    puEl.innerHTML = html;
  },

  showToast(text, type){
    const c = document.getElementById('toast-container');
    const d = document.createElement('div');
    d.className = 'toast toast-' + type;
    d.textContent = text;
    c.appendChild(d);
    setTimeout(() => d.remove(), 1900);
  },
  pushLog(text, type){
    this.logLines.unshift({ text, type });
    if (this.logLines.length > 5) this.logLines.pop();
    document.getElementById('log-feed').innerHTML =
      this.logLines.map(l => `<div class="log-line log-${l.type}">${l.text}</div>`).join('');
  },
  showWaveBanner(n){
    const el = document.getElementById('wave-banner');
    el.textContent = n === 1 ? 'WAVE 1 — เริ่มภารกิจ' : `WAVE ${n} — คลื่นภัยคุกคามระลอกใหม่!`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
  },

  /* ---------- GAME OVER ---------- */
  gameOver(){
    this.isRunning = false;
    this.video.style.display = 'none';

    const totalCorrect = this.stats.threatsDestroyed + this.stats.safePassed;
    const totalActions = totalCorrect + this.stats.mistakes;
    const accuracy = totalActions > 0 ? Math.round((totalCorrect / totalActions) * 100) : 100;
    const survived = this.uptime > 0;

    let stars = 0;
    if (survived){
      stars = 1;
      if (this.score >= 600) stars = 2;
      if (this.score >= 1200 && accuracy >= 75) stars = 3;
    }

    document.getElementById('screen-end').style.display = 'flex';
    const titleEl = document.getElementById('end-title');
    const descEl = document.getElementById('end-desc');
    if (survived){
      titleEl.textContent = 'MISSION ACCOMPLISHED';
      titleEl.style.color = 'var(--neon-green)';
      titleEl.style.textShadow = '0 0 20px var(--neon-green)';
      descEl.textContent = 'ปกป้องเครือข่ายแม่โจ้สำเร็จ ยอดเยี่ยมมาก!';
    } else {
      titleEl.textContent = 'SYSTEM COMPROMISED';
      titleEl.style.color = 'var(--neon-red)';
      titleEl.style.textShadow = '0 0 20px var(--neon-red)';
      descEl.textContent = 'เซิร์ฟเวอร์โดนทำลาย ระบบล่ม!';
    }

    document.getElementById('end-accuracy').textContent = accuracy + '%';
    document.getElementById('end-maxcombo').textContent = '×' + this.stats.maxCombo;
    document.getElementById('end-threats').textContent = this.stats.threatsDestroyed;
    document.getElementById('end-wave').textContent = this.currentWave;

    for (let i = 1; i <= 3; i++){
      document.getElementById('star-' + i).classList.toggle('filled', i <= stars);
    }

    const scoreEl = document.getElementById('end-score');
    const target = this.score;
    const start = performance.now();
    const dur = 1000;
    const step = (ts) => {
      const p = Math.min(1, (ts - start) / dur);
      const val = Math.round(target * (1 - Math.pow(1 - p, 3)));
      scoreEl.textContent = val;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);

    this.pushLog('[HALT] Session terminated', 'danger');
  }
};

function selectDifficulty(el, key){
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  GameApp.difficulty = key;
}

window.addEventListener('DOMContentLoaded', () => GameApp.boot());
