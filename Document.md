# 📖 เอกสารสรุปข้อมูลเกมและระบบอินเตอร์แอคทีฟ (Interactive Games Documentation)
**โครงการประชาสัมพันธ์หลักสูตร วท.บ. สาขาวิชาเทคโนโลยีสารสนเทศ มหาวิทยาลัยแม่โจ้ (ฉบับปรับปรุง พ.ศ. 2570)**

---

## 🌟 ภาพรวมระบบ (System Overview)

ชุดเกมอินเตอร์แอคทีฟถูกออกแบบขึ้นเพื่อถ่ายทอด **4 เสาหลักทางกลยุทธ์ (4 Strategic Pillars)** และ **เส้นทางการเรียนรู้ 4 ปี (4-Year Learning Journey)** ของหลักสูตร IT แม่โจ้ 2570 ให้แก่นักเรียนและผู้สนใจ ผ่านการเล่นเกมที่สนุก เข้าใจง่าย และล้ำสมัยด้วยเทคโนโลยี **Dual-Control System (เล่นได้ทั้งเมาส์/สัมผัส และ AI Hand & Pose Tracking ผ่านกล้องเว็บแคม)**

---

## 🎮 สารบัญเกมทั้งหมด (Game Catalog)

1. [🛡️ Sector 01: Bug Buster & Automated Tester](#1-🛡️-sector-01-bug-buster--automated-tester)
2. [🤖 Sector 02: AI Prompt & Logic Match](#2-🤖-sector-02-ai-prompt--logic-match)
3. [🧩 Sector 03: Code Block Collector](#3-🧩-sector-03-code-block-collector)
4. [📝 Sector 04: IT Curriculum Quiz Challenge](#4-📝-sector-04-it-curriculum-quiz-challenge)
5. [⚡ Sector 05: CodeFlow · Logic Animator](#5-⚡-sector-05-codeflow--logic-animator)
6. [🛰️ Sector 06: Packet Hero · Firewall Defense](#6-🛰️-sector-06-packet-hero--firewall-defense)
7. [🖥️ Sector 07: AR PC Builder](#7-🖥️-sector-07-ar-pc-builder)
8. [🔓 Sector 08: IT AR Code Breaker](#8-🔓-sector-08-it-ar-code-breaker)
9. [⚡ Sector 09: เกมสลัดแขนทะลุขีดจำกัด!](#9-⚡-sector-09-เกมสลัดแขนทะลุขีดจำกัด)

---

## 1. 🛡️ Sector 01: Bug Buster & Automated Tester
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

## 2. 🤖 Sector 02: AI Prompt & Logic Match
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

## 3. 🧩 Sector 03: Code Block Collector
* **ที่ตั้งโฟลเดอร์:** [`CodeBlock/`](file:///Users/tim1zk_/Sci_day/CodeBlock/index.html)
* **เสาหลักที่เกี่ยวข้อง:** เสาหลักที่ 1 & 2 — *Hands-on & Agile Methodology (การเขียนโค้ดและตรรกะโปรแกรมมิ่ง)*

### 🎯 คอนเซ็ปต์ของเกม
ฝึกทักษะการคิดเชิงคำนวณ (Computational Thinking) และตรรกะโปรแกรมมิ่ง (Sequence, Decision, Loop) ผ่านการคีบบล็อกคำสั่งช่วยนำทางหุ่นยนต์สู่อาชีพสายไอที

### 🕹️ ระบบเกม (Game Mechanics)
* **ระดับความยาก 3 ขั้น:** ด่านที่ 1 (ง่าย), ด่านที่ 2 (ปานกลาง - บล็อกเริ่มเคลื่อนไหว), ด่านที่ 3 (ท้าทาย - มีเวลากำหนด)
* **ภารกิจย่อยแบบสุ่ม:** แต่ละด่านมีภารกิจจำลองย่อย (Variant A, B, C) ที่สุ่มเปลี่ยนโจทย์ เช่น การต่อเน็ตเวิร์ก, การเขียนคำสั่ง Loop, การแก้ปัญหา Logic

### 🖐️ วิธีการเล่น
* เลื่อนมือหรือเมาส์ไปที่บล็อกคำสั่งที่ถูกต้อง ทำการคีบ/ลากบล็อกไปหยอดลงใน Slot คำสั่งของโปรแกรม เพื่อนำหุ่นยนต์เข้าสู่จุดหมาย

---

## 4. 📝 Sector 04: IT Curriculum Quiz Challenge
* **ที่ตั้งโฟลเดอร์:** [`Qustion/`](file:///Users/tim1zk_/Sci_day/Qustion/index.html)
* **เนื้อหาที่เกี่ยวข้อง:** ข้อมูลโครงสร้างหลักสูตร 120 หน่วยกิต แผนการเรียน 4 ปี และมาตรฐานสากล ISCED 0613

### 🎯 คอนเซ็ปต์ของเกม
เกมทดสอบความรู้และประชาสัมพันธ์จุดเด่นของหลักสูตร IT แม่โจ้ 2570 ในรูปแบบ Quiz แบบตอบคำถามชิงรางวัล

### 🕹️ ระบบเกม (Game Mechanics)
* รวมคำถามเกี่ยวกับ 4 เสาหลัก, วุฒิปริญญา (วท.บ.), ทุนการศึกษา, การฝึกงานต่างประเทศ และอัตลักษณ์ Green IT
* สรุปผลคะแนนและให้คำแนะนำเส้นทางอาชีพเมื่อตอบเสร็จสิ้น

---

## 5. ⚡ Sector 05: CodeFlow · Logic Animator
* **ที่ตั้งโฟลเดอร์:** [`CodeFlow/`](file:///Users/tim1zk_/Sci_day/CodeFlow/index.html)
* **เสาหลักที่เกี่ยวข้อง:** เสาหลักที่ 1 & 3 — *Computational Logic & Industrial Simulation*

### 🎯 คอนเซ็ปต์ของเกม
Industrial SCADA Terminal Simulator จำลองการวาง Logic Flowchart ในระบบจริง 5 โลกภารกิจ:
1. **Smart Farm IoT:** ตรรกะตรวจวัดความชื้น ควบคุมสปริงเกอร์ และโซลินอยด์วาล์ว
2. **Delivery Drone:** การนำทางโดรนหลบสิ่งกีดขวางและคำนวณแบตเตอรี่
3. **Cyber Security:** ระบบ 2FA Verification และ Firewall Rule Evaluation
4. **Robo Kitchen:** อัลกอริทึมขั้นตอนการประกอบอาหารของหุ่นยนต์
5. **Route Finder:** Pathfinding นำทางรถส่งของไปยังจุดหมายที่สั้นที่สุด

### 🕹️ ระบบเกม (Game Mechanics)
* ผู้เล่นจัดเรียงบล็อกอัลกอริทึมลงบน Rail แล้วกด **RUN** เพื่อรันทีละขั้นตอน
* มีระบบ Live Canvas Simulation แสดงผลการทำงานจริงแบบเรียลไทม์
* มีบล็อกลวง (Decoy Blocks) เพื่อฝึกทักษะการวิเคราะห์

---

## 6. 🛰️ Sector 06: Packet Hero · Firewall Defense
* **ที่ตั้งโฟลเดอร์:** [`PacketHero/`](file:///Users/tim1zk_/Sci_day/PacketHero/index.html)
* **เสาหลักที่เกี่ยวข้อง:** เสาหลักที่ 3 — *Cyber Security, Threat Intelligence & SOC Defense*

### 🎯 คอนเซ็ปต์ของเกม
สวมบทเป็นผู้เชี่ยวชาญ Cyber Security ประจำศูนย์ SOC (Security Operations Center) ดูแล Gateway Network และคัดกรอง Packet ข้อมูลที่วิ่งเข้าสู่ระบบ

### 🕹️ ระบบเกม (Game Mechanics)
* คัดแยก Packet ข้อมูล: ยิงทำลายภัยคุกคาม (Malware, DDoS SYN Flood, SQL Injection) และปล่อย Packet ปลอดภัย (HTTPS, DNS, SSH Auth) ให้ผ่านเข้าสู่ Gateway
* มีระดับความยากแบบคลื่น (Wave System) พร้อม Boss Threat ในแต่ละรอบ
* ระบบสะสมคะแนน Combo และตรวจวัดความแม่นยำ (Accuracy Rate)

---

## 7. 🖥️ Sector 07: AR PC Builder
* **ที่ตั้งโฟลเดอร์:** [`PcBuilding/`](file:///Users/tim1zk_/Sci_day/PcBuilding/index.html)
* **เสาหลักที่เกี่ยวข้อง:** เสาหลักที่ 1 & 2 — *Computer Hardware & System Architecture*

### 🎯 คอนเซ็ปต์ของเกม
เกมประกอบเครื่องคอมพิวเตอร์เสมือนจริงบนเมนบอร์ดด้วยระบบ AR Hand Tracking ผู้เล่นจะได้เรียนรู้โครงสร้างภายในคอมพิวเตอร์และลำดับการติดตั้งที่ถูกต้อง

### 🕹️ ระบบเกม (Game Mechanics)
* ติดตั้ง 6 ชิ้นส่วนสำคัญ: `CPU`, `CPU Cooler`, `RAM`, `GPU`, `SSD`, `PSU`
* **Dependency Rule:** ระบบบังคับลำดับที่ถูกต้อง (เช่น ต้องติดตั้ง CPU ก่อนติดตั้ง CPU Cooler)
* แสดงเกร็ดความรู้ (Hardware Fact Cards) ทุกครั้งที่ติดตั้งแต่ละชิ้นส่วนสำเร็จ
* ระบบตรวจจับท่าทาง: **กำมือ (Fist) = หยิบชิ้นส่วน**, **แบมือ (Open Palm) = วางลงช่อง** พร้อมระบบ Hysteresis กันมือสั่น

---

## 8. 🔓 Sector 08: IT AR Code Breaker
* **ที่ตั้งโฟลเดอร์:** [`ITcodebreaker/`](file:///Users/tim1zk_/Sci_day/ITcodebreaker/index.html)
* **เสาหลักที่เกี่ยวข้อง:** เสาหลักที่ 1 & 3 — *Cryptography, Algorithms & Interactive Hologram*

### 🎯 คอนเซ็ปต์ของเกม
ท้าทายสมองด้วยการถอดรหัสลับและตอบคำถามโปรแกรมมิ่งแบบ Hologram AR ผ่านการชี้เป้าด้วยปลายนิ้ว

### 🕹️ ระบบเกม (Game Mechanics)
* สุ่มคำถามตรรกะโปรแกรมมิ่ง, การแปลงเลขฐาน, และ Binary Logic
* มีระบบเลือกระดับความยาก (Easy, Medium, Hard)
* รองรับการควบคุมด้วย **นิ้วชี้เล็งเป้า** และ **Pinch Gesture (จีบนิ้วชี้+นิ้วโป้ง) เพื่อสั่งคลิก** พร้อมระบบแตะหน้าจอสำรอง

---

## 9. ⚡ Sector 09: เกมสลัดแขนทะลุขีดจำกัด!
* **ที่ตั้งโฟลเดอร์:** [`67game/`](file:///Users/tim1zk_/Sci_day/67game/index.html)
* **เสาหลักที่เกี่ยวข้อง:** *AI Computer Vision & Interactive Pose Gaming*

### 🎯 คอนเซ็ปต์ของเกม
เกม Action ความเร็วสูง วัดปฏิกิริยาและความว่องไวในเวลา 20 วินาที ผ่านการตรวจจับตำแหน่งร่างกายด้วย **MediaPipe Pose**

### 🕹️ ระบบเกม (Game Mechanics)
* ผู้เล่นยืนหน้ากล้องแล้วทำการสลัดแขนซ้าย-ขวาตัดผ่านเส้น Target Line กลางจอ
* มีระบบ **Dead Zone Hysteresis** แถบกันสั่น เพื่อความแม่นยำและป้องกันการนับซ้ำจากมือสั่น
* ระบบเสียงบันไดเสียงดนตรีตาม Combo ยิ่งสลัดเร็วยิ่งตื่นเต้น พร้อมเอฟเฟกต์เฉลิมฉลอง Confetti เมื่อหมดเวลา

---

## 💻 เทคโนโลยีที่ใช้ในการพัฒนา (Tech Stack)

* **Frontend Core:** HTML5, Vanilla CSS3 (Industrial Glassmorphism & Cyberpunk HMI System), JavaScript (ES6+)
* **Computer Vision & AI Tracking:** 
  * Google MediaPipe Hands (Hand Landmarks & Gesture Recognition)
  * Google MediaPipe Pose (Full Body Keypoints & Motion Tracking)
  * CameraUtils & DrawingUtils CDN
* **Audio Synthesis:** Web Audio API (สร้างเสียงเอฟเฟกต์แบบเรียลไทม์ผ่าน Oscillator และ Gain Nodes)
* **Responsive Architecture:** CSS Grid & Flexbox รองรับทั้งจอแสดงผลในงานนิทรรศการ, PC/Notebook, และ iPad/Tablet

---

## 🚀 วิธีการเปิดใช้งาน
เปิดไฟล์ **[`index.html`](file:///Users/tim1zk_/Sci_day/index.html)** บนเว็บเบราว์เซอร์ (Google Chrome หรือ Microsoft Edge แนะนำ) เพื่อเข้าสู่ **Game Hub Portal** แล้วเลือกเล่นเกมที่ต้องการได้ทันที
