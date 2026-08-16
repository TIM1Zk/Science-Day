# 📖 เอกสารสรุปข้อมูลเกมและระบบอินเตอร์แอคทีฟ (Interactive Games Documentation)
**โครงการประชาสัมพันธ์หลักสูตร วท.บ. สาขาวิชาเทคโนโลยีสารสนเทศ มหาวิทยาลัยแม่โจ้ (ฉบับปรับปรุง พ.ศ. 2570)**

---

## 🌟 ภาพรวมระบบ (Overview)
ชุดเกมอินเตอร์แอคทีฟถูกออกแบบขึ้นเพื่อถ่ายทอด **4 เสาหลักทางกลยุทธ์ (4 Strategic Pillars)** และ **เส้นทางการเรียนรู้ 4 ปี (4-Year Learning Journey)** ของหลักสูตร IT แม่โจ้ 2570 ให้แก่นักเรียนและผู้สนใจ ผ่านการเล่นเกมที่สนุก เข้าใจง่าย และล้ำสมัยด้วยเทคโนโลยี **Dual-Control System (เล่นได้ทั้งเมาส์/สัมผัส และ AI Hand Tracking ผ่านกล้อง)**

---

## 🎮 สารบัญเกมทั้งหมด (Game Catalog)

1. [🛡️ เกมที่ 1: Bug Buster & Automated Tester](#1-🛡️-bug-buster--automated-tester)
2. [🤖 เกมที่ 2: AI Prompt & Logic Match](#2-🤖-ai-prompt--logic-match)
3. [🧩 เกมที่ 3: Code Block Collector](#3-🧩-code-block-collector)
4. [📝 เกมที่ 4: IT Curriculum Quiz Challenge](#4-📝-it-curriculum-quiz-challenge)

---

## 1. 🛡️ Bug Buster & Automated Tester
* **ที่ตั้งโฟลเดอร์:** [`BugBuster/`](file:///Users/tim1zk_/Sci_day/BugBuster/index.html)
* **เสาหลักที่เกี่ยวข้อง:** เสาหลักที่ 1 — *Software Development & Automated Testing (Quality-First Developer)*

### 🎯 คอนเซ็ปต์ของเกม
จำลองสถานการณ์จริงของกระบวนการพัฒนาซอฟต์แวร์ (SDLC) และการนำระบบขึ้นเซิร์ฟเวอร์ (Production Deployment) ผู้เล่นจะสวมบทบาทเป็น **Quality-First Developer** ที่ต้องทดสอบระบบและสกัดกั้นบั๊กหรือช่องโหว่ความปลอดภัยไม่ให้หลุดรอดไปถึงผู้ใช้งานจริง

### 🕹️ ระบบเกม (Game Mechanics)
* **ระบบการตกของอ็อบเจกต์ (Dynamic Falling System):** มีก้อนโค้ดและข้อมูล 14 รูปแบบตกลงมาจากด้านบนด้วยความเร็วและทิศทางแบบสุ่ม
* **การจำแนกเป้าหมาย:**
  * **บั๊ก & ภัยคุกคาม (ต้องทำลาย):** `Syntax Error`, `Null Pointer`, `Memory Leak`, `SQL Injection`, `DevOps Build Fail`, `API Timeout`, `DDoS Flood`, `Hardcoded Secret`
  * **Clean Code & Green IT (ต้องปล่อยให้ผ่าน):** `Clean Architecture`, `Green IT Optimizer`, `AI Test Passed`, `Secure JWT Auth`, `Automated CI/CD`, `Agri-IoT Sensor`
* **ตัวชี้วัด & คะแนน:**
  * **Code Quality Bar:** เริ่มต้นที่ 100% หากบั๊กหลุดลงสู่ล่างจะเสียค่า Quality หากยิงโดน Clean Code จะถูกหักแต้ม
  * **Combo System:** ยิงบั๊กต่อเนื่องเพื่อสะสมคะแนนโบนัสและเอฟเฟกต์เสียง Synthesizer
  * **เกณฑ์ชนะ:** รักษาระดับ Code Quality ให้อยู่ในเกณฑ์มาตรฐานสากล (มากกว่า 50%) จนครบเวลา 50 วินาที

### 🖐️ วิธีการเล่น
* **โหมดเมาส์ / จอสัมผัส:** เลื่อนเคอร์เซอร์เป้าเล็งแล้วคลิกซ้าย (หรือแตะหน้าจอ) เพื่อยิงเลเซอร์ทดสอบระบบ
* **โหมด AI Hand Tracking:** หงายมือหน้ากล้องเว็บแคมเพื่อเลื่อนเป้า และ **ทำท่าจีบนิ้ว (Pinch Gesture นิ้วชี้ชิดนิ้วโป้ง)** เพื่อสั่งยิง

---

## 2. 🤖 AI Prompt & Logic Match
* **ที่ตั้งโฟลเดอร์:** [`AIMatch/`](file:///Users/tim1zk_/Sci_day/AIMatch/index.html)
* **เสาหลักที่เกี่ยวข้อง:** เสาหลักที่ 3 & 4 — *Modern Tech Ecosystem (AI, Cloud Native, DevOps) & Green IT / Smart Agriculture (BCG & IWA)*

### 🎯 คอนเซ็ปต์ของเกม
เกมแนววางแผนและจัดสรรสถาปัตยกรรมระบบ (Solution Architect) ผู้เล่นจะต้องวิเคราะห์โจทย์ความต้องการทางธุรกิจจริง (Business Requirements) และเลือกจับคู่โมดูลเทคโนโลยี AI, Cloud, IoT และ Security ให้สอดคล้องกัน

### 🕹️ ระบบเกม (Game Mechanics)
* **คลังโจทย์แบบสุ่ม (Scenario Pool):** สุ่มเลือก 3 ภารกิจจาก 6 สถานการณ์จำลองแห่งอนาคต:
  1. *Smart Agri-Tech:* ระบบตรวจจับโรคพืช & โดรนพ่นชีวภัณฑ์ (BCG & IWA แม่โจ้)
  2. *Cyber Defense:* สกัดกั้นการเจาะฐานข้อมูลและแฮกเกอร์
  3. *AI DevOps Pipeline:* ท่อส่งมอบซอฟต์แวร์อัตโนมัติด้วย Kubernetes
  4. *Green IT Data Center:* ดาต้าเซ็นเตอร์พลังงานสะอาดและลดคาร์บอน
  5. *Health-Tech & PDPA:* AI วิเคราะห์ภาพเอกซเรย์พร้อมการเข้ารหัสข้อมูลคนไข้
  6. *Autonomous Logistics:* รถขนส่งผลผลิตทางการเกษตรไร้คนขับ
* **ระบบป้องกันการจำคำตอบ (Anti-Memorization):** สุ่มสลับตำแหน่งช่องวางสถาปัตยกรรม (3 Slots) และสลับไพ่คำตอบ/ไพ่หลอกทุกครั้งที่เริ่มเล่นใหม่
* **ระบบประเมินผลอาชีพ:** เมื่อเล่นครบ 3 ด่าน ระบบจะวิเคราะห์ทักษะและสรุปผลว่าผู้เล่นเหมาะกับสายอาชีพใดในหลักสูตร 2570

### 🖐️ วิธีการเล่น
* **โหมดเมาส์ / จอสัมผัส:** คลิกลากการ์ดเทคโนโลยี (Drag & Drop) จากด้านล่างขึ้นไปวางในช่องสถาปัตยกรรมด้านบนให้ตรงกับความต้องการ
* **โหมด AI Hand Tracking:** ขยับมือไปยังการ์ดที่ต้องการ **จีบนิ้วเพื่อหยิบการ์ด** ลากไปยังช่องเป้าหมาย แล้ว **คลายนิ้วออกเพื่อวางการ์ด**

---

## 3. 🧩 Code Block Collector
* **ที่ตั้งโฟลเดอร์:** [`Code Block/`](file:///Users/tim1zk_/Sci_day/Code%20Block/index.html)
* **เสาหลักที่เกี่ยวข้อง:** เสาหลักที่ 1 & 2 — *Hands-on & Agile Methodology (การเขียนโค้ดและตรรกะโปรแกรมมิ่ง)*

### 🎯 คอนเซ็ปต์ของเกม
ฝึกทักษะการคิดเชิงคำนวณ (Computational Thinking) และตรรกะโปรแกรมมิ่ง (Sequence, Decision, Loop) ผ่านการคีบบล็อกคำสั่งช่วยนำทางหุ่นยนต์สู่อาชีพสายไอที

### 🕹️ ระบบเกม (Game Mechanics)
* **ระดับความยาก 3 ขั้น:** ด่านที่ 1 (ง่าย), ด่านที่ 2 (ปานกลาง - บล็อกเริ่มเคลื่อนไหว), ด่านที่ 3 (ท้าทาย - มีเวลากำหนด)
* **ภารกิจย่อยแบบสุ่ม:** แต่ละด่านมีภารกิจจำลองย่อย (Variant A, B, C) ที่สุ่มเปลี่ยนโจทย์ เช่น การต่อเน็ตเวิร์ก, การเขียนคำสั่ง Loop, การแก้ปัญหา Logic

### 🖐️ วิธีการเล่น
* เลื่อนมือหรือเมาส์ไปที่บล็อกคำสั่งที่ถูกต้อง ทำการคีบ/ลากบล็อกไปหยอดลงใน Slot คำสั่งของโปรแกรม เพื่อนำหุ่นยนต์เข้าสู่จุดหมาย

---

## 4. 📝 IT Curriculum Quiz Challenge
* **ที่ตั้งโฟลเดอร์:** [`Qustion/`](file:///Users/tim1zk_/Sci_day/Qustion/index.html)
* **เนื้อหาที่เกี่ยวข้อง:** ข้อมูลโครงสร้างหลักสูตร 120 หน่วยกิต แผนการเรียน 4 ปี และมาตรฐานสากล ISCED 0613

### 🎯 คอนเซ็ปต์ของเกม
เกมทดสอบความรู้และประชาสัมพันธ์จุดเด่นของหลักสูตร IT แม่โจ้ 2570 ในรูปแบบ Quiz แบบตอบคำถามชิงรางวัล

### 🕹️ ระบบเกม (Game Mechanics)
* รวมคำถามเกี่ยวกับ 4 เสาหลัก, วุฒิปริญญา (วท.บ.), ทุนการศึกษา, การฝึกงานต่างประเทศ และอัตลักษณ์ Green IT
* สรุปผลคะแนนและให้คำแนะนำเส้นทางอาชีพเมื่อตอบเสร็จสิ้น

---

## 💻 เทคโนโลยีที่ใช้ในการพัฒนา (Tech Stack)
* **Frontend Core:** HTML5, CSS3 (Modern Glassmorphism & Cyberpunk Design System), JavaScript (ES6+)
* **Computer Vision & AI Tracking:** Google MediaPipe Hands & CameraUtils CDN
* **Audio Synthesis:** Web Audio API (สร้างเสียงเอฟเฟกต์แบบเรียลไทม์ ไม่ต้องพึ่งพาไฟล์เสียงภายนอก)
* **Responsive Architecture:** Flexbox / CSS Grid รองรับทั้งจอแสดงผลในงานนิทรรศการ, PC/Notebook, และ iPad/Tablet

---

## 🚀 วิธีการเปิดใช้งาน
เปิดไฟล์ **[`index.html`](file:///Users/tim1zk_/Sci_day/index.html)** บนเว็บเบราว์เซอร์ (Google Chrome หรือ Microsoft Edge แนะนำ) เพื่อเข้าสู่ **Game Hub Portal** แล้วเลือกเล่นเกมที่ต้องการได้ทันที
