# 🎮 Science Day · Interactive Game Hub (IT Maejo 2027)

> **ชุดนิทรรศการและเกมอินเตอร์แอคทีฟเพื่อการประชาสัมพันธ์หลักสูตร วท.บ. สาขาวิชาเทคโนโลยีสารสนเทศ มหาวิทยาลัยแม่โจ้ (ฉบับปรับปรุง พ.ศ. 2570)**

ศูนย์รวมเกมเพื่อการเรียนรู้และทดลองทักษะด้านเทคโนโลยีสารสนเทศยุคใหม่ รองรับระบบควบคุมแบบสองทาง (**Dual-Control System**) ทั้งผ่านเมาส์/หน้าจอสัมผัส และระบบตรวจจับการเคลื่อนไหวของมือ/ร่างกายด้วย **AI Computer Vision (MediaPipe Hands & Pose Tracking)** ผ่านกล้องเว็บแคมโดยตรงบนเบราว์เซอร์

---

## 🌟 จุดเด่นของระบบ (Key Highlights)

- 🖐️ **AI Hand & Pose Tracking:** ควบคุมเกมด้วยมือเปล่าและการขยับร่างกายแบบเรียลไทม์ โดยประมวลผลบนเครื่องผู้ใช้ 100% ปลอดภัย ไม่มีการบันทึกภาพ
- 💻 **Zero Installation / Client-Side:** รันผ่านเว็บเบราว์เซอร์ได้ทันทีโดยไม่ต้องติดตั้งโปรแกรมหรือพึ่งพาเซิร์ฟเวอร์ Backend
- 🎵 **Real-time Web Audio API:** ระบบสังเคราะห์เสียงดนตรีและซาวด์เอฟเฟกต์เชิงพลวัตด้วยโค้ด JavaScript แบบไม่ต้องโหลดไฟล์เสียงภายนอก
- 🌐 **Modern Cyberpunk UI:** ออกแบบสไตล์ Industrial HMI / Glassmorphism รองรับการแสดงผลทั้งบนจอทัชสกรีนนิทรรศการ, PC, Notebook และ Tablet

---

## 🕹️ รวม 9 เกมอินเตอร์แอคทีฟ (Game Catalog)

| หมวด | ชื่อเกม | เทคโนโลยีที่เกี่ยวข้อง | โหมดควบคุม | ที่ตั้งโฟลเดอร์ |
| :---: | :--- | :--- | :---: | :---: |
| **01** | **🛡️ Bug Buster & Automated Tester** | Software Testing, Clean Code, SDLC, Security | 🖐️ Hand / 🖱️ Mouse | [`BugBuster/`](BugBuster/index.html) |
| **02** | **🤖 AI Prompt & Logic Match** | AI Solution Architecture, Cloud IoT, Smart Agri-Tech | 🖐️ Hand Pinch / 🖱️ Mouse | [`AIMatch/`](AIMatch/index.html) |
| **03** | **🧩 Code Block Collector** | Computational Thinking, Programming Logic | 🖐️ Hand Pinch / 🖱️ Mouse | [`CodeBlock/`](CodeBlock/index.html) |
| **04** | **📝 IT Curriculum Quiz Challenge** | Curriculum Knowledge & Career Pathways | 🖐️ Hand Select / 🖱️ Touch | [`Quiz/`](Quiz/index.html) |
| **05** | **⚡ CodeFlow · Logic Animator** | Algorithm Flowchart & Live Simulation (5 Worlds) | 🖐️ Camera / 🖱️ Drag | [`CodeFlow/`](CodeFlow/index.html) |
| **06** | **🛰️ Packet Hero · Firewall Defense** | Cyber Security, SOC Defense, Packet Routing | 🖐️ Hand Gesture / 🖱️ Click | [`PacketHero/`](PacketHero/index.html) |
| **07** | **🖥️ AR PC Builder** | Computer Hardware, Motherboard Architecture | 🖐️ AR Grab & Drop / 🖱️ Mouse | [`PCBuilder/`](PCBuilder/index.html) |
| **08** | **🔓 IT AR Code Breaker** | Hologram Cryptography, Coding Challenge | 🖐️ Point & Pinch / 🖱️ Tap | [`CodeBreaker/`](CodeBreaker/index.html) |
| **09** | **⚡ เกมสลัดแขนทะลุขีดจำกัด!** | Full Body Pose Tracking, 20s High Speed Rush | 🧍 Full Body Pose Tracking | [`PoseArm/`](PoseArm/index.html) |

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
├── index.html           # หน้า Game Hub Portal หลักสำหรับเข้าสู่ทุกเกม
├── README.md            # เอกสารแนะนำและคู่มือการใช้งานโปรเจกต์
├── Document.md          # เอกสารสรุปข้อมูลหลักสูตรและสาระสำคัญเชิงลึก
├── BugBuster/           # 🛡️ เกมที่ 1: ตรวจจับและทำลายบั๊ก
│   ├── index.html
│   ├── style.css
│   └── app.js
├── AIMatch/             # 🤖 เกมที่ 2: จัดสถาปัตยกรรม AI & Cloud IoT
│   ├── index.html
│   ├── style.css
│   └── app.js
├── CodeBlock/           # 🧩 เกมที่ 3: คีบบล็อกคำสั่งโปรแกรมมิ่ง
│   ├── index.html
│   ├── style.css
│   └── app.js
├── Quiz/                # 📝 เกมที่ 4: ตอบคำถามชิงรางวัลหลักสูตร
│   ├── index.html
│   ├── style.css
│   └── app.js
├── CodeFlow/            # ⚡ เกมที่ 5: จัด Flowchart รันจำลอง 5 โลก
│   ├── index.html
│   ├── style.css
│   └── app.js
├── PacketHero/          # 🛰️ เกมที่ 6: ป้องกัน Gateway ไฟร์วอลล์
│   ├── index.html
│   ├── style.css
│   └── app.js
├── PCBuilder/           # 🖥️ เกมที่ 7: ประกอบคอมพิวเตอร์ในโหมด AR
│   ├── index.html
│   ├── style.css
│   └── app.js
├── CodeBreaker/         # 🔓 เกมที่ 8: ถอดรหัส Hologram AR
│   ├── index.html
│   ├── style.css
│   └── app.js
└── PoseArm/             # ⚡ เกมที่ 9: สลัดแขนทะลุขีดจำกัดด้วย Pose
    ├── index.html
    ├── style.css
    └── app.js
```

---

## 🚀 วิธีการเปิดใช้งาน (Getting Started)

1. ทำการ Clone หรือ Download Repository:
   ```bash
   git clone https://github.com/TIM1Zk/Science-Day-.git
   ```
2. เปิดไฟล์ **`index.html`** ด้วยเว็บเบราว์เซอร์สมัยใหม่ เช่น **Google Chrome**, **Microsoft Edge**, หรือ **Brave**
3. อนุญาตให้เบราว์เซอร์เข้าถึงกล้องเว็บแคม (สำหรับการเล่นในโหมด Hand Tracking / AR) หรือเลือกเล่นด้วยโหมดเมาส์/สัมผัสได้ทันที

---

## 🎓 ข้อมูลหลักสูตร (Academic Curriculum)

**หลักสูตรวิทยาศาสตรบัณฑิต สาขาวิชาเทคโนโลยีสารสนเทศ มหาวิทยาลัยแม่โจ้ (ฉบับปรับปรุง พ.ศ. 2570)**
- **4 เสาหลักทางกลยุทธ์ (4 Strategic Pillars):**
  1. *Software Development & Automated Testing (Quality-First Developer)*
  2. *Hands-on Agile Coding & Modern Engineering*
  3. *AI-Driven Development & Cloud Native Ecosystem*
  4. *Smart Agriculture & Green IT (BCG Model & IWA Framework)*
- อ่านรายละเอียดเพิ่มเติมได้ที่ [`Document.md`](Document.md)

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

- **Frontend:** Semantic HTML5, Vanilla CSS3 (Custom Design System, Glassmorphism, CSS Grid & Flexbox)
- **Programming Logic:** JavaScript (ES6+ Modular Architecture, Canvas 2D Rendering)
- **Computer Vision & AI Tracking:** Google MediaPipe (Hands, Pose, CameraUtils)
- **Audio:** Web Audio API (Synthesizer Oscillators & Gain Nodes)
- **Visual FX:** Canvas Confetti & Vector Drawing Utilitites

---
*จัดทำขึ้นเพื่องานสัปดาห์วิทยาศาสตร์และนิทรรศการเปิดบ้าน (Open House) สาขาวิชาเทคโนโลยีสารสนเทศ มหาวิทยาลัยแม่โจ้*
