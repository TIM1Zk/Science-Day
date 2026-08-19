/* ==================================================================
   0. UTILITIES
   ================================================================== */
const $=(s,r=document)=>r.querySelector(s);
const clamp=(v,a,b)=>v<a?a:v>b?b:v;
const lerp=(a,b,t)=>a+(b-a)*t;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
class RNG{
  constructor(seed){this.f=mulberry32(seed>>>0);}
  r(){return this.f();}
  int(a,b){return Math.floor(this.r()*(b-a+1))+a;}
  pick(a){return a[Math.floor(this.r()*a.length)];}
  shuffle(a){const x=a.slice();for(let i=x.length-1;i>0;i--){const j=Math.floor(this.r()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;}
  pickN(a,n){return this.shuffle(a).slice(0,Math.min(n,a.length));}
}
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function b36(n,len){return (n>>>0).toString(36).toUpperCase().padStart(len,'0').slice(-len);}

/* ==================================================================
   1. AUDIO (Web Audio API — synth only, no files)
   ================================================================== */
const SFX={
  ctx:null,muted:false,
  init(){if(!this.ctx){try{this.ctx=new (window.AudioContext||window.webkitAudioContext)();}catch(e){}}if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume();},
  tone(f,d,type='sine',vol=.16,slide=0,delay=0){
    if(!this.ctx||this.muted)return;const t=this.ctx.currentTime+delay;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(f,t);
    if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(40,f*slide),t+d);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.012);
    g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(this.ctx.destination);o.start(t);o.stop(t+d+.03);
  },
  noise(d=.3,vol=.12){
    if(!this.ctx||this.muted)return;const sr=this.ctx.sampleRate,buf=this.ctx.createBuffer(1,sr*d,sr),ch=buf.getChannelData(0);
    for(let i=0;i<ch.length;i++)ch[i]=(Math.random()*2-1)*(1-i/ch.length);
    const s=this.ctx.createBufferSource();s.buffer=buf;
    const f=this.ctx.createBiquadFilter();f.type='bandpass';f.frequency.value=780;
    const g=this.ctx.createGain();g.gain.value=vol;
    s.connect(f);f.connect(g);g.connect(this.ctx.destination);s.start();
  },
  click(){this.tone(660,.05,'square',.06);},
  grab(){this.tone(340,.07,'triangle',.09,1.6);},
  drop(){this.tone(240,.1,'triangle',.1,.7);},
  chime(step=0){const base=523.25*Math.pow(1.0595,Math.min(step,10)*2);
    this.tone(base,.22,'sine',.14);this.tone(base*1.5,.3,'sine',.09,1,.04);this.tone(base*2,.4,'sine',.05,1,.08);},
  err(){this.tone(180,.4,'sawtooth',.14,.35);this.noise(.35,.1);},
  win(){[0,4,7,12,16,19].forEach((s,i)=>this.tone(523.25*Math.pow(2,s/12),.42,'triangle',.11,1,i*.075));},
  lose(){[0,-3,-7,-12].forEach((s,i)=>this.tone(392*Math.pow(2,s/12),.6,'sawtooth',.11,.85,i*.16));this.noise(1,.07);},
  run(){this.tone(120,.5,'sawtooth',.07,3.4);}
};

/* ==================================================================
   2. MISSION CONTENT — procedural generators
   ================================================================== */
function S(key,label,icon,kind,fx,data,opt){return{key,label,icon,kind,fx,data:data||{},opt:opt||null};}
/* คำอธิบายสั้น ๆ ว่าบล็อกนั้น "ทำอะไร" — แสดงใต้ชื่อบล็อกทุกใบ (รวมบล็อกลวง) */
const FXDESC={
 sense_moist:'อ่านตัวเลขความชื้นจากเซนเซอร์ในดิน เก็บไว้ใช้เทียบเงื่อนไข',
 sense_temp:'อ่านอุณหภูมิในโรงเรือน ณ ขณะนั้น',
 sense_light:'อ่านความเข้มแสงจากเซนเซอร์ LDR',
 sense_ec:'อ่านค่าความเข้มข้นสารอาหารในน้ำ',
 sense_tank:'ตรวจของเหลวคงเหลือในถัง ป้องกันปั๊มดูดอากาศ',
 cond:'เงื่อนไขจริง → ทำคำสั่งถัดไป · เงื่อนไขเท็จ → จบโปรแกรม',
 valve_on:'สั่งวาล์วเปิด น้ำเริ่มไหลลงแปลงทันที',
 valve_off:'สั่งวาล์วปิด หยุดจ่ายน้ำ',
 valve_stuck:'เปิดวาล์วค้างไว้โดยไม่มีคำสั่งปิด',
 pump_on:'สั่งปั๊มเดินเครื่อง เริ่มจ่ายปุ๋ยลงถัง',
 pump_off:'สั่งปั๊มหยุดทำงาน',
 wait:'หยุดรอตามเวลา อุปกรณ์ที่เปิดอยู่ยังทำงานต่อระหว่างนี้',
 led_on:'เปิดหลอดไฟปลูกพืชเหนือแปลง',led_off:'ปิดหลอดไฟปลูกพืช',
 fan_on:'เปิดพัดลมดูดอากาศร้อนออกจากโรงเรือน',
 cloud:'ส่งค่าที่วัดได้ขึ้นเซิร์ฟเวอร์เพื่อเก็บสถิติ',
 alert:'ส่งแจ้งเตือนไปยังแอปของผู้ดูแล',
 log:'บันทึกเหตุการณ์ที่เกิดขึ้นลงระบบ',
 harvest:'สั่งชุดเก็บเกี่ยวผลผลิตในแปลง',reboot:'รีสตาร์ทบอร์ดควบคุมทั้งระบบ',
 roof:'สั่งปิดหลังคาโรงเรือน',spray:'พ่นสารกำจัดแมลงทั่วโรงเรือน',
 scan:'ระบุพิกัดปลายทางลงระบบนำทางของโดรน',
 battery:'ตรวจพลังงานคงเหลือก่อนออกบิน',
 takeoff:'ไต่ระดับจากพื้นขึ้นสู่ความสูงที่กำหนด',
 fly:'เคลื่อนที่ไปข้างหน้าตามเส้นทางที่วางไว้',
 fly2:'บินต่อไปยังจุดหมายถัดไป',
 detect:'ยิงเลเซอร์วัดระยะ หาสิ่งกีดขวางข้างหน้า',
 avoid_up:'ไต่ระดับขึ้นเพื่อข้ามสิ่งกีดขวางที่อยู่ด้านล่าง',
 avoid_down:'ลดระดับลงเพื่อลอดใต้สิ่งกีดขวางที่อยู่ด้านบน',
 hover:'ลอยนิ่งอยู่กับที่ ให้กล้องและสัญญาณคงที่',
 capture:'ถ่ายภาพความละเอียดสูงเก็บไว้',
 descend:'ลดระดับลงใกล้พื้นเหนือจุดวางของ',
 drop:'ปลดล็อกพัสดุลงสู่จุดวาง',
 grab:'ใช้แขนกลคีบพัสดุขึ้นมาไว้กับตัวโดรน',
 rtl:'บินกลับสู่ฐานปล่อยโดยอัตโนมัติ',
 emergency_drop:'ปลดพัสดุทิ้งทันทีจากตำแหน่งปัจจุบัน',
 motor_off:'ตัดกำลังมอเตอร์ใบพัดทั้งหมด',boost:'เร่งความเร็วขึ้นสูงสุด',
 manual:'สลับไปโหมดบังคับด้วยมือคน',light_on:'เปิดไฟสัญญาณของตัวโดรน',
 recv_cred:'รับข้อมูลที่ผู้ใช้กรอกเข้ามาในระบบ',
 ratelimit:'จำกัดจำนวนครั้งที่ลองล็อกอินได้ต่อช่วงเวลา',
 hash:'แปลงรหัสผ่านเป็นค่าที่ย้อนกลับไม่ได้ก่อนนำไปเทียบ',
 db_check:'ค้นฐานข้อมูลว่ามีผู้ใช้นี้และค่าตรงกันหรือไม่',
 otp_gen:'สุ่มรหัสใช้ครั้งเดียวขึ้นมาใหม่',
 otp_send:'ส่งรหัสที่สร้างไว้ไปยังมือถือของผู้ใช้',
 otp_verify:'เทียบรหัสที่ผู้ใช้กรอกกับรหัสที่ระบบออกให้',
 grant:'เปิดสิทธิ์ให้เข้าใช้งานระบบได้จริง',
 grant_now:'เปิดสิทธิ์เข้าใช้งานทันทีโดยไม่รอผลอื่น',
 plaintext:'บันทึกรหัสผ่านลงฐานข้อมูลตามที่รับมา',
 fw_off:'ปิดการทำงานของไฟร์วอลล์ชั่วคราว',
 mail_pw:'ส่งรหัสผ่านไปยังอีเมลของผู้ใช้',
 skip_otp:'ข้ามการยืนยันตัวตนขั้นที่สอง',
 admin:'กำหนดสิทธิ์ระดับผู้ดูแลระบบให้ผู้ใช้',
 wipe_log:'ลบบันทึกเหตุการณ์ทั้งหมดออกจากระบบ',
 open_port:'เปิดพอร์ตสำหรับเข้าถึงเครื่องจากระยะไกล',
 deny:'ปฏิเสธคำขอเข้าถึงระบบ',
 detect_anom:'ระบบ IDS จับทราฟฟิกที่ผิดปกติไปจากค่าปกติ',
 check_ip:'เทียบ IP กับบัญชีดำเพื่อให้คะแนนความเสี่ยง',
 snapshot:'บันทึกสภาพระบบและทราฟฟิกไว้เป็นหลักฐาน',
 block_ip:'ตัดการเชื่อมต่อจาก IP ต้นทางทั้งหมด',
 isolate:'ถอดเครื่องที่ติดเชื้อออกจากเครือข่าย',
 alert_soc:'แจ้งทีมเฝ้าระวังความปลอดภัยให้เข้ามาดู',
 scan_mal:'สแกนหามัลแวร์ที่ตกค้างทั้งระบบ',
 report:'สรุปเหตุการณ์ทั้งหมดเป็นรายงาน',
 req_cert:'ขอใบรับรองตัวตนจากเซิร์ฟเวอร์ปลายทาง',
 verify_cert:'ตรวจลายเซ็นดิจิทัลว่าใบรับรองของจริงหรือไม่',
 keygen:'สร้างกุญแจเข้ารหัสสำหรับใช้ในรอบนี้',
 encrypt:'แปลงข้อมูลเป็นรหัสลับด้วยกุญแจที่สร้างไว้',
 transmit:'ส่งข้อมูลออกไปตามช่องทางที่เตรียมไว้',
 checksum:'ตรวจว่าข้อมูลปลายทางตรงกับต้นทางทุกบิต',
 ack:'รอปลายทางยืนยันว่าได้รับข้อมูลครบ',
 close:'ปิดการเชื่อมต่อและล้างกุญแจทิ้ง',
 prep:'ล้างมือและจัดวัตถุดิบให้พร้อมหยิบ',
 measure:'ชั่งตวงส่วนผสมตามที่สูตรกำหนด',
 heat_on:'จุดเตาให้ความร้อน ต้องมีคำสั่งปิดเสมอ',
 heat_off:'ดับไฟเตา หยุดให้ความร้อน',
 heat_max:'เปิดความร้อนไปที่ระดับสูงสุด',
 oil:'เทน้ำมันลงกระทะเพื่อกันติดและกระจายความร้อน',
 add:'ใส่วัตถุดิบลงกระทะตามลำดับของสูตร',
 stir:'ผัดคลุกให้ความร้อนและเครื่องปรุงกระจายทั่ว',
 season:'เติมเครื่องปรุงรสลงในอาหาร',
 plate:'ตักอาหารจากกระทะลงจานเสิร์ฟ',
 water:'เติมน้ำเปล่าลงในภาชนะที่ตั้งไฟอยู่',
 ice:'ใส่น้ำแข็งลงในภาชนะ',sugar:'เติมน้ำตาลลงในส่วนผสม',
 taste:'ชิมรสอาหารด้วยช้อน',wash_now:'ล้างภาชนะทันทีในขั้นนี้',
 micro:'อุ่นด้วยไมโครเวฟตามเวลาที่ตั้ง',
 mix:'ผสมยีสต์กับน้ำอุ่นเพื่อปลุกยีสต์ให้ทำงาน',
 knead:'นวดโดว์ให้กลูเตนเรียงตัวจนเนื้อเนียน',
 rest:'ปล่อยแป้งพักให้ยีสต์ทำงานจนขึ้นฟู',
 oven_on:'อุ่นเตาอบล่วงหน้าให้ถึงอุณหภูมิที่ตั้งไว้',
 bake:'อบด้วยความร้อนตามเวลาที่กำหนด',
 check:'ตรวจสีและความสุกด้วยสายตาก่อนตัดสินใจ',
 oven_off:'เปิดเตาแล้วนำถาดออกจากเตาอบ',
 cool:'พักให้คลายความร้อนก่อนนำไปตัด',
 open_oven:'เปิดฝาเตาอบขณะที่กำลังอบอยู่',
 clean:'ล้างหัวชงและไล่น้ำเก่าออกจากระบบ',
 clean2:'ล้างอุปกรณ์แล้วเก็บเข้าที่',
 grind:'บดเมล็ดกาแฟให้ละเอียดลงในด้ามชง',
 tamp:'อัดผงกาแฟให้แน่นเรียบเสมอกันทั้งหน้า',
 lock:'ล็อกด้ามชงเข้ากับหัวชงของเครื่อง',
 extract:'ปล่อยน้ำร้อนแรงดันสูงผ่านผงกาแฟ',
 steam_milk:'พ่นไอน้ำเข้านมจนได้โฟมเนียน',
 pour:'เทนมลงบนเอสเพรสโซเป็นลวดลาย',
 serve:'ยกเสิร์ฟให้ลูกค้า',
 map_scan:'โหลดแผนที่และเส้นทางลงระบบนำทาง',
 engine:'สตาร์ทเครื่องยนต์ให้รถพร้อมออกตัว',
 forward:'เดินหน้าตามทิศที่หัวรถหันอยู่ ทีละช่อง',
 turn_left:'หมุนหัวรถไปทางซ้าย 90° — รถยังไม่เคลื่อนที่',
 turn_right:'หมุนหัวรถไปทางขวา 90° — รถยังไม่เคลื่อนที่',
 wait_light:'จอดรอจนสัญญาณไฟเปลี่ยนเป็นเขียว',
 park:'จอดรถที่จุดหมาย จบภารกิจ',
 reverse:'ถอยหลังจากตำแหน่งปัจจุบัน 1 ช่อง',
 run_red:'ขับผ่านสี่แยกโดยไม่หยุดรอสัญญาณ',
 speeding:'เพิ่มความเร็วเกินที่กฎหมายกำหนด',
 uturn:'กลับรถ 180° กลางถนน',
 park_side:'จอดชิดขอบทางระหว่างเส้นทาง',
 hazard:'เปิดไฟฉุกเฉินแล้วขับต่อไป',
 manual_drive:'สลับให้คนขับควบคุมรถแทนระบบ'
};
const KINDLAB={cond:'บล็อกเงื่อนไข',io:'บล็อกอ่านค่า / ตรวจสอบ',act:'บล็อกสั่งงาน'};
const WORLD_RULE={
 1:'กฎของระบบ IoT: ต้องอ่านค่าเซนเซอร์ก่อนตรวจเงื่อนไขเสมอ และทุกอุปกรณ์ที่สั่ง "เปิด" ต้องมีคำสั่ง "ปิด" ก่อนจบโปรแกรม',
 2:'กฎการบิน: โดรนต้องบินขึ้นก่อนจึงเคลื่อนที่ได้ และต้องอยู่เหนือจุดวางแล้วเท่านั้นจึงปล่อยพัสดุได้',
 3:'กฎความปลอดภัย: ห้ามให้สิทธิ์ก่อนยืนยันตัวตนครบทุกชั้น และห้ามเก็บหรือส่งข้อมูลลับแบบไม่เข้ารหัส',
 4:'กฎในครัว: ต้องเตรียมอุปกรณ์ให้พร้อมก่อนใส่วัตถุดิบ และต้องดับความร้อนก่อนจัดเสิร์ฟทุกครั้ง',
 5:'กฎจราจร: ซ้าย-ขวาอิงจากทิศที่หัวรถหันอยู่ ไม่ใช่ทิศบนจอ · คำสั่งเลี้ยวไม่ทำให้รถเคลื่อนที่'
};


const WORLD_NAME={1:'IoT SMART FARM',2:'DELIVERY DRONE',3:'CYBER SECURITY',4:'ROBO KITCHEN',5:'ROUTE FINDER'};
const DIFF=[
  {name:'ง่าย',tag:'EASY',len:5,dec:2,time:210,hints:3,mult:1.0},
  {name:'ปกติ',tag:'NORMAL',len:7,dec:3,time:170,hints:2,mult:1.35},
  {name:'ยาก',tag:'HARD',len:9,dec:5,time:135,hints:1,mult:1.75},
  {name:'โหด',tag:'EXPERT',len:11,dec:7,time:105,hints:0,mult:2.3}
];

/* ---------- WORLD 1 : SMART FARM ---------- */
const GEN1=[
 r=>{ const th=r.pick([26,28,30,32,35,38,40,42,45,48]),sec=r.pick([3,4,5,6,8,10,12,15]),
      crop=r.pick(['เมล่อนญี่ปุ่น','ผักสลัดกรีนโอ๊ค','สตรอว์เบอร์รี','มะเขือเทศเชอร์รี','โหระพาอินทรีย์','พริกหวานฮอลแลนด์','คะน้าเคล']),
      cur=r.int(9,th-5);
  return{title:'ระบบรดน้ำอัตโนมัติ',
   story:`โรงเรือน${crop} 4 แปลง ใช้บอร์ด ESP32 ต่อกับเซนเซอร์ความชื้นในดินและวาล์วโซลินอยด์ ตอนนี้ดินแห้งจนใบเริ่มเหี่ยว`,
   goals:[`[g3]เริ่มจากตรวจสอบระดับน้ำในถังสำรองก่อน ถ้าถังแห้งแล้วสั่งเปิดวาล์วจะได้แค่ลม`,
    `ต้องอ่านค่าจากเซนเซอร์ก่อนเสมอ ระบบจึงจะมีตัวเลขไปเทียบกับเงื่อนไขได้`,
    `เงื่อนไขที่ใช้คือ ความชื้นในดิน < ${th}% เท่านั้น (ในคลังมีบล็อกเงื่อนไขค่าอื่นปนอยู่)`,
    `เมื่อเงื่อนไขเป็นจริงจึงสั่งเปิดวาล์วน้ำ`,
    `[g0]รดน้ำค้างไว้ ${sec} วินาที ก่อนจะสั่งปิดวาล์ว`,
    `ห้ามจบโปรแกรมโดยที่วาล์วยังเปิดค้าง ไม่งั้นน้ำท่วมแปลง${crop}`,
    `[g2]อ่านค่าความชื้นซ้ำเพื่อยืนยันว่ารดน้ำได้ผลจริง`,
    `[g1]ปิดท้ายด้วยการส่งข้อมูลขึ้น Cloud`],
   sim:{moist:cur,temp:r.int(29,36),light:r.int(400,900),th},
   all:[
    S('f_tank','ตรวจสอบระดับน้ำในถังสำรอง','🛢','io','sense_tank',{},'g3'),
    S('f_read','อ่านค่าความชื้นดิน (Soil Sensor)','📡','io','sense_moist'),
    S('f_cond',`ถ้า ความชื้น < ${th}%`,'◆','cond','cond',{th}),
    S('f_von','เปิดวาล์วน้ำ','💧','act','valve_on'),
    S('f_wait',`หน่วงเวลา ${sec} วินาที`,'⏱','act','wait',{sec},'g0'),
    S('f_voff','ปิดวาล์วน้ำ','🚰','act','valve_off'),
    S('f_re','อ่านค่าความชื้นซ้ำเพื่อยืนยัน','🔁','io','sense_moist',{},'g2'),
    S('f_cloud','ส่งข้อมูลขึ้น Cloud','☁','act','cloud',{},'g1'),
    S('f_alert','แจ้งเตือนเกษตรกรผ่านแอป','🔔','act','alert',{},'g4')
   ]};
 },
 r=>{ const lux=r.pick([120,150,180,200,240,280,320,350,420,500]),tp=r.pick([30,32,33,34,35,36,38,40]),hr=r.pick([2,3,4,5,6,8]);
  return{title:'ระบบไฟปลูกพืชและควบคุมอุณหภูมิ',
   story:`โรงเรือนปิดปลูกผักไฮโดรโปนิกส์ ต้องเสริมแสงเมื่อฟ้าครึ้ม และระบายความร้อนไม่ให้ผักช็อกแดด`,
   goals:[`อ่านค่าจากเซนเซอร์วัดแสง (LDR) ก่อน แล้วจึงนำค่าไปเทียบเงื่อนไข`,
    `เงื่อนไขคือ ความเข้มแสง < ${lux} lux จึงจะเปิดไฟ LED ปลูกพืช`,
    `เปิดไฟค้างไว้ ${hr} ชั่วโมง แล้วต้องสั่งปิดไฟ ห้ามเปิดค้างตลอดคืน ผักจะยืดจนล้ม`,
    `[g1]เรื่องแสงเสร็จแล้วจึงมาดูความร้อน: อ่านอุณหภูมิ ถ้า > ${tp}°C จึงเปิดพัดลม`,
    `[g2]ส่งข้อมูลขึ้น Cloud เป็นขั้นสุดท้าย`],
   sim:{moist:r.int(45,70),temp:tp+r.int(1,4),light:r.int(60,lux-30),th:0},
   all:[
    S('l_read','อ่านค่าความเข้มแสง (LDR)','📶','io','sense_light'),
    S('l_cond',`ถ้า แสง < ${lux} lux`,'◆','cond','cond',{lux}),
    S('l_on','เปิดไฟ LED ปลูกพืช','💡','act','led_on'),
    S('l_wait',`หน่วงเวลา ${hr} ชั่วโมง`,'⏱','act','wait',{sec:hr}),
    S('l_off','ปิดไฟ LED','🌙','act','led_off'),
    S('t_read','อ่านค่าอุณหภูมิในโรงเรือน','🌡','io','sense_temp',{},'g1'),
    S('t_cond',`ถ้า อุณหภูมิ > ${tp}°C`,'◆','cond','cond',{tp},'g1'),
    S('t_fan','เปิดพัดลมระบายอากาศ','🌀','act','fan_on',{},'g1'),
    S('l_cloud','ส่งข้อมูลขึ้น Cloud','☁','act','cloud',{},'g2'),
    S('l_log','บันทึก Log การทำงาน','📝','act','log',{},'g3')
   ]};
 },
 r=>{ const ec=r.pick([1.0,1.2,1.4,1.5,1.6,1.8,2.0,2.2,2.4]),sec=r.pick([10,15,20,25,30,45,60]);
  return{title:'ระบบผสมปุ๋ยอัตโนมัติ (Fertigation)',
   story:`ถังสารละลายธาตุอาหารเจือจางลงหลังเติมน้ำ ระบบต้องเติมปุ๋ย A/B แล้วกวนผสมให้ค่า EC กลับมาตามเกณฑ์`,
   goals:[`[g3]ตรวจปริมาณปุ๋ยคงเหลือในถังก่อน ปั๊มที่ดูดอากาศจะเสียหาย`,
    `อ่านค่า EC ของสารละลายก่อน แล้วจึงนำไปเทียบเงื่อนไข`,
    `เงื่อนไขคือ EC < ${ec.toFixed(1)} mS/cm จึงจะเปิดปั๊มปุ๋ย`,
    `[g0]เปิดปั๊มแล้วต้องกวนผสม ${sec} วินาที ให้สารละลายเข้ากันก่อน`,
    `ห้ามจบโปรแกรมโดยที่ปั๊มปุ๋ยยังทำงานอยู่ ปุ๋ยจะเข้มข้นจนรากไหม้`,
    `[g2]อ่านค่า EC ซ้ำเพื่อยืนยันผลก่อนบันทึก`,
    `[g1]ส่งข้อมูลขึ้น Cloud เป็นขั้นสุดท้าย`],
   sim:{moist:r.int(55,80),temp:r.int(27,32),light:r.int(300,700),th:0},
   all:[
    S('e_tank','ตรวจสอบปริมาณปุ๋ยคงเหลือ','🛢','io','sense_tank',{},'g3'),
    S('e_read','อ่านค่า EC ของสารละลาย','🧪','io','sense_ec'),
    S('e_cond',`ถ้า EC < ${ec.toFixed(1)} mS/cm`,'◆','cond','cond',{ec}),
    S('e_pon','เปิดปั๊มปุ๋ย A/B','⚗','act','pump_on'),
    S('e_wait',`กวนผสม ${sec} วินาที`,'⏱','act','wait',{sec},'g0'),
    S('e_poff','ปิดปั๊มปุ๋ย','🛑','act','pump_off'),
    S('e_re','อ่านค่า EC ซ้ำเพื่อยืนยัน','🔁','io','sense_ec',{},'g2'),
    S('e_cloud','ส่งข้อมูลขึ้น Cloud','☁','act','cloud',{},'g1'),
    S('e_alert','แจ้งเตือนเกษตรกรผ่านแอป','🔔','act','alert',{},'g4')
   ]};
 }
];
const DEC1=[
 ['เปิดพัดลมระบายอากาศ','🌀','act','fan_on'],['เปิดไฟ LED ปลูกพืช','💡','act','led_on'],
 ['เปิดปั๊มปุ๋ย A/B','⚗','act','pump_on'],['สั่งเก็บเกี่ยวผลผลิต','🧺','act','harvest'],
 ['รีสตาร์ทบอร์ด ESP32','🔌','act','reboot'],['ปิดหลังคาโรงเรือน','🏠','act','roof'],
 ['พ่นสารกำจัดแมลง','🧴','act','spray'],['เปิดวาล์วน้ำค้างไว้ตลอด','💦','act','valve_stuck'],
 ['อ่านค่า pH ของน้ำ','🧫','io','sense_ec'],['แจ้งเตือนเกษตรกรผ่านแอป','🔔','act','alert']
];

/* ---------- WORLD 2 : DELIVERY DRONE ---------- */
function obsPick(r){
  return r.pick([
    {label:'แขนเครนก่อสร้างยื่นจากด้านบน',avoid:'down',fx:'avoid_down',txt:'ลดระดับลอดใต้สิ่งกีดขวาง',ic:'⬇',type:'crane'},
    {label:'รถบรรทุกตู้สูงจอดขวางด้านล่าง',avoid:'up',fx:'avoid_up',txt:'ไต่ระดับข้ามสิ่งกีดขวาง',ic:'⬆',type:'truck'},
    {label:'สายไฟแรงสูงพาดขวางด้านบน',avoid:'down',fx:'avoid_down',txt:'ลดระดับลอดใต้สิ่งกีดขวาง',ic:'⬇',type:'wire'},
    {label:'กำแพงตึกร้างสูงด้านล่าง',avoid:'up',fx:'avoid_up',txt:'ไต่ระดับข้ามสิ่งกีดขวาง',ic:'⬆',type:'wall'}
  ]);
}
const GEN2=[
 r=>{ const alt=r.pick([6,8,10,12,15,18,20,25,30]),dist=r.pick([120,180,240,300,350,420,480,600,750]),o=obsPick(r),bat=r.pick([15,20,25,30,35]);
  return{title:'ภารกิจส่งพัสดุด่วน',
   story:`โดรนขนส่งต้องนำพัสดุการแพทย์ไปส่งที่ลานจอดปลายทาง ระหว่างทางมี${o.label}`,
   goals:[`[g1]สแกนพิกัดปลายทางก่อน โดรนจึงจะรู้ว่าต้องบินไป ${dist} เมตร`,
    `[g2]ตรวจแบตเตอรี่ให้เหลือมากกว่า ${bat}% ก่อนออกบิน`,
    `ต้องบินขึ้นให้ถึง ${alt} เมตรก่อน จึงจะเคลื่อนที่ไปข้างหน้าได้ ไม่งั้นชนของบนพื้น`,
    `[g3]ใช้ LiDAR ตรวจจับสิ่งกีดขวางก่อนตัดสินใจหลบ`,
    `สิ่งกีดขวางคือ${o.label} → ในคลังมีทั้งบล็อกไต่ขึ้นและลอดใต้ ต้องเลือกให้ตรงกับภาพจำลอง`,
    `[g0]ต้องลดระดับลงจุดวางก่อน จึงจะปล่อยพัสดุได้ ปล่อยจากที่สูง = ของแตก`,
    `[g4]ส่งของเสร็จแล้วบินกลับฐาน`],
   sim:{obs:o.type,alt,dist,battery:r.int(bat+25,96)},
   all:[
    S('d_scan',`สแกนพิกัดปลายทาง (${dist} ม.)`,'🛰','io','scan',{dist},'g1'),
    S('d_bat',`ตรวจสอบแบตเตอรี่ > ${bat}%`,'🔋','io','battery',{bat},'g2'),
    S('d_up',`บินขึ้น ${alt} เมตร`,'🚁','act','takeoff',{alt}),
    S('d_fly',`บินไปข้างหน้า ${dist} เมตร`,'➡','act','fly',{dist}),
    S('d_det','ตรวจจับสิ่งกีดขวางด้วย LiDAR','📡','io','detect',{},'g3'),
    S('d_av',o.txt,o.ic,'act',o.fx),
    S('d_desc','ลดระดับลงจุดวางพัสดุ','⬇','act','descend',{},'g0'),
    S('d_drop','ปล่อยพัสดุ','📦','act','drop'),
    S('d_rtl','บินกลับฐาน (Return To Launch)','🏠','act','rtl',{},'g4'),
    S('d_log','บันทึกผลการจัดส่ง','📝','act','log',{},'g5')
   ],obs:o};
 },
 r=>{ const alt=r.pick([10,14,18,22]),o=obsPick(r),wh=r.pick(['คลัง A-7','ศูนย์กระจายสินค้าเหนือ','โกดัง B-2']);
  return{title:'ภารกิจรับ-ส่งสองจุด',
   story:`โดรนต้องบินไป${wh}เพื่อคีบพัสดุก่อน แล้วจึงบินต่อไปส่งลูกค้า ระหว่างเส้นทางมี${o.label}`,
   goals:[`ภารกิจนี้มี 2 ช่วง: ไปรับของที่${wh} แล้วจึงนำไปส่งลูกค้า`,
    `[g0]สแกนพิกัดคลังสินค้าก่อนออกเดินทาง`,
    `[g1]ตรวจแบตเตอรี่ให้พอสำหรับทั้งสองช่วงก่อนบินขึ้น`,
    `บินขึ้น ${alt} เมตรก่อน แล้วจึงบินไปยัง${wh} เพื่อคีบพัสดุ`,
    `ต้องมีพัสดุอยู่บนโดรนแล้วเท่านั้น จึงจะบินต่อไปหาลูกค้าได้`,
    `ระหว่างทางมี${o.label} ต้องเลือกทิศหลบให้ตรงกับภาพจำลอง`,
    `[g3]ลดระดับลงจุดวางก่อนปล่อยพัสดุทุกครั้ง`],
   sim:{obs:o.type,alt,dist:400,battery:r.int(60,98)},
   all:[
    S('p_scan','สแกนพิกัดคลังสินค้า','🛰','io','scan',{},'g0'),
    S('p_bat','ตรวจสอบแบตเตอรี่','🔋','io','battery',{},'g1'),
    S('p_up',`บินขึ้น ${alt} เมตร`,'🚁','act','takeoff',{alt}),
    S('p_fly1',`บินไปยัง${wh}`,'➡','act','fly'),
    S('p_grab','คีบพัสดุขึ้นโดรน','🪝','act','grab'),
    S('p_det','ตรวจจับสิ่งกีดขวางด้วย LiDAR','📡','io','detect',{},'g2'),
    S('p_av',o.txt,o.ic,'act',o.fx),
    S('p_fly2','บินต่อไปยังบ้านลูกค้า','➡','act','fly2'),
    S('p_desc','ลดระดับลงจุดวาง','⬇','act','descend',{},'g3'),
    S('p_drop','ปล่อยพัสดุ','📦','act','drop'),
    S('p_rtl','บินกลับฐาน (RTL)','🏠','act','rtl',{},'g4')
   ],obs:o};
 },
 r=>{ const alt=r.pick([25,30,40,50]),o=obsPick(r),tg=r.pick(['เสาส่งสัญญาณ','แผงโซลาร์ฟาร์ม','สะพานข้ามแม่น้ำ']);
  return{title:'ภารกิจบินสำรวจโครงสร้าง',
   story:`ทีมวิศวกรต้องการภาพถ่ายความละเอียดสูงของ${tg} โดรนต้องบินสำรวจแล้วกลับฐานอย่างปลอดภัย`,
   goals:[`เป้าหมายคือได้ภาพ${tg}ที่คมชัด แล้วนำโดรนกลับฐานอย่างปลอดภัย`,
    `[g0]สแกนพิกัดเป้าหมายก่อนออกบิน`,
    `[g1]ตรวจแบตเตอรี่ก่อนบินขึ้น`,
    `บินขึ้น ${alt} เมตร แล้วจึงบินไปยัง${tg}`,
    `[g3]ระหว่างทางมี${o.label} ต้องเลือกทิศหลบให้ถูก`,
    `ต้องลอยนิ่ง (hover) ให้สัญญาณคงที่ก่อน จึงจะถ่ายภาพได้ ถ่ายตอนบินอยู่ภาพจะเบลอ`,
    `จบภารกิจต้องบินกลับฐานเสมอ ห้ามทิ้งโดรนไว้กลางทาง`],
   sim:{obs:o.type,alt,dist:500,battery:r.int(55,95)},
   all:[
    S('s_scan',`สแกนพิกัด${tg}`,'🛰','io','scan',{},'g0'),
    S('s_bat','ตรวจสอบแบตเตอรี่','🔋','io','battery',{},'g1'),
    S('s_up',`บินขึ้น ${alt} เมตร`,'🚁','act','takeoff',{alt}),
    S('s_fly',`บินไปยัง${tg}`,'➡','act','fly'),
    S('s_det','ตรวจจับสิ่งกีดขวางด้วย LiDAR','📡','io','detect',{},'g2'),
    S('s_av',o.txt,o.ic,'act',o.fx,{},'g3'),
    S('s_hov','ลอยนิ่งเพื่อสแกนโครงสร้าง','🛸','act','hover'),
    S('s_cap','ถ่ายภาพความละเอียดสูง','📸','act','capture'),
    S('s_cloud','อัปโหลดภาพขึ้น Cloud','☁','act','cloud',{},'g4'),
    S('s_rtl','บินกลับฐาน (RTL)','🏠','act','rtl')
   ],obs:o};
 }
];
const DEC2=[
 ['ทิ้งพัสดุฉุกเฉินกลางอากาศ','🪂','act','emergency_drop'],['ดับมอเตอร์กลางอากาศ','🔻','act','motor_off'],
 ['เร่งความเร็วสูงสุด','⚡','act','boost'],['ปลดล็อกโหมดบังคับมือ','🕹','act','manual'],
 ['เปิดไฟสัญญาณกลางคืน','🔦','act','light_on'],['ถ่ายภาพความละเอียดสูง','📸','act','capture'],
 ['คีบพัสดุขึ้นโดรน','🪝','act','grab'],['ลอยนิ่งรอสัญญาณ','🛸','act','hover'],
 ['บินกลับฐาน (RTL)','🏠','act','rtl']
];

/* ---------- WORLD 3 : CYBER SECURITY ---------- */
const GEN3=[
 r=>{ const dg=r.pick([4,5,6,8]),exp=r.pick([30,45,60,90,120,180]),tries=r.pick([3,4,5,6]);
  return{title:'ระบบล็อกอินสองชั้น (2FA)',
   story:`ระบบธนาคารออนไลน์ถูกโจมตีแบบเดารหัสผ่าน ทีมความปลอดภัยสั่งให้เพิ่มการยืนยันตัวตนสองชั้นทันที`,
   goals:[`ผู้ใช้จะเข้าระบบได้ก็ต่อเมื่อผ่านการยืนยันครบทั้ง 2 ชั้นเท่านั้น`,
    `[g3]กันการเดารหัสด้วยการจำกัดจำนวนครั้งที่ล็อกอิน (${tries} ครั้ง) ตั้งแต่ต้น`,
    `รับ Username/Password เข้ามาก่อนเป็นขั้นแรก`,
    `[g0]ห้ามนำรหัสผ่านดิบไปใช้ต่อ ต้อง Hash + Salt ก่อนเสมอ`,
    `นำค่าที่ได้ไปตรวจสอบกับฐานข้อมูลผู้ใช้`,
    `[g1]ตรวจเงื่อนไขว่ารหัสผ่านถูกต้องหรือไม่ ถ้าไม่ถูกต้องให้จบการทำงาน`,
    `[g2]สร้างรหัส OTP ${dg} หลักก่อน จึงจะมีรหัสให้ส่ง`,
    `ส่ง OTP ไปมือถือ แล้วต้องรอตรวจสอบ OTP (อายุ ${exp} วินาที) ให้ผ่านก่อน`,
    `อนุมัติเข้าสู่ระบบเป็นขั้นสุดท้ายเท่านั้น — อนุมัติก่อนตรวจเสร็จ = เปิดประตูให้แฮกเกอร์`],
   sim:{dg,exp},
   all:[
    S('c_recv','รับ Username / Password','⌨','io','recv_cred'),
    S('c_rate',`จำกัดจำนวนครั้งที่ล็อกอิน (${tries} ครั้ง)`,'🚧','act','ratelimit',{},'g3'),
    S('c_hash','เข้ารหัสรหัสผ่าน (Hash + Salt)','#️⃣','act','hash',{},'g0'),
    S('c_db','ตรวจสอบกับฐานข้อมูลผู้ใช้','🗄','io','db_check'),
    S('c_cond','ถ้า รหัสผ่านถูกต้อง','◆','cond','cond',{},'g1'),
    S('c_gen',`สร้างรหัส OTP ${dg} หลัก`,'🎲','act','otp_gen',{dg},'g2'),
    S('c_send','ส่ง OTP ไปยังมือถือผู้ใช้','📲','act','otp_send'),
    S('c_ver',`ตรวจสอบ OTP (หมดอายุ ${exp} วินาที)`,'✅','io','otp_verify',{exp}),
    S('c_grant','อนุมัติเข้าสู่ระบบ','🔓','act','grant'),
    S('c_log','บันทึก Log การเข้าใช้งาน','📝','act','log',{},'g4')
   ]};
 },
 r=>{ const sc=r.pick([60,65,70,75,80,85,90,95]),ip=`${r.int(101,223)}.${r.int(0,255)}.${r.int(0,255)}.${r.int(2,254)}`;
  return{title:'ตอบสนองการบุกรุกระบบ',
   story:`IDS แจ้งเตือนพฤติกรรมผิดปกติจาก IP ${ip} มีการยิงคำขอเข้าเซิร์ฟเวอร์ถี่ผิดปกติกลางดึก`,
   goals:[`เป้าหมายคือหยุดการบุกรุกจาก ${ip} และเก็บหลักฐานให้ครบถ้วน`,
    `ต้องให้ IDS ตรวจจับพฤติกรรมผิดปกติก่อน ระบบจึงจะรู้ว่าควรสืบต่อที่ IP ใด`,
    `นำ IP ไปตรวจกับบัญชีดำ เพื่อให้ได้คะแนนความเสี่ยงมาใช้ตัดสินใจ`,
    `[g0]เงื่อนไขสั่งบล็อกคือ คะแนนความเสี่ยง > ${sc}`,
    `[g1]เก็บ Snapshot หลักฐานก่อนบล็อก เพราะบล็อกแล้วข้อมูลการโจมตีจะขาดตอน`,
    `[g2]แยกเครื่องที่ติดเชื้อออกจากเครือข่ายเพื่อกันการลุกลาม`,
    `บล็อก IP แล้วต้องแจ้งทีม SOC และบันทึก Log ไว้เสมอ`],
   sim:{ip,sc},
   all:[
    S('i_det','ตรวจจับพฤติกรรมผิดปกติ (IDS)','🚨','io','detect_anom'),
    S('i_ip',`ตรวจสอบ ${ip} กับบัญชีดำ`,'🗄','io','check_ip',{ip}),
    S('i_cond',`ถ้า คะแนนความเสี่ยง > ${sc}`,'◆','cond','cond',{sc},'g0'),
    S('i_snap','เก็บ Snapshot หลักฐานการโจมตี','📸','act','snapshot',{},'g1'),
    S('i_block','บล็อก IP ต้นทาง','⛔','act','block_ip'),
    S('i_iso','แยกเครื่องที่ติดเชื้อออกจากเครือข่าย','🔌','act','isolate',{},'g2'),
    S('i_soc','แจ้งเตือนทีม SOC','📢','act','alert_soc'),
    S('i_scan','สแกนมัลแวร์ทั้งระบบ','🔍','io','scan_mal',{},'g3'),
    S('i_log','บันทึก Log เหตุการณ์','📝','act','log'),
    S('i_rep','สร้างรายงานเหตุการณ์','🧾','act','report',{},'g4')
   ]};
 },
 r=>{ const bit=r.pick([128,192,256]),alg=r.pick(['AES','ChaCha20']);
  return{title:'สร้างช่องทางสื่อสารเข้ารหัส',
   story:`แอปพลิเคชันต้องส่งข้อมูลผู้ป่วยข้ามเครือข่ายสาธารณะ จึงต้องตั้งช่องทางเข้ารหัสก่อนส่งทุกครั้ง`,
   goals:[`ห้ามส่งข้อมูลผู้ป่วยออกจากระบบโดยไม่เข้ารหัสเด็ดขาด`,
    `ขอใบรับรองจากเซิร์ฟเวอร์ก่อน แล้วต้องตรวจลายเซ็นดิจิทัลก่อนจะเชื่อถือ`,
    `[g0]ตรวจเงื่อนไขว่าใบรับรองยังไม่หมดอายุ ถ้าหมดอายุให้หยุด`,
    `สร้าง Session Key ${alg}-${bit} bit ก่อน จึงจะมีกุญแจไปเข้ารหัสข้อมูลได้`,
    `เข้ารหัสข้อมูลเสร็จแล้วจึงส่งออกผ่านช่องทางที่ปลอดภัย`,
    `[g1]ตรวจ Checksum ปลายทางเพื่อยืนยันว่าข้อมูลไม่ถูกแก้ระหว่างทาง`,
    `[g3]ปิดการเชื่อมต่อและล้าง Key ทิ้งเมื่อจบงาน`],
   sim:{bit,alg},
   all:[
    S('k_req','ขอใบรับรองจากเซิร์ฟเวอร์','📜','io','req_cert'),
    S('k_ver','ตรวจสอบลายเซ็นดิจิทัล','🔎','io','verify_cert'),
    S('k_cond','ถ้า ใบรับรองยังไม่หมดอายุ','◆','cond','cond',{},'g0'),
    S('k_gen',`สร้าง Session Key ${alg}-${bit}`,'🔑','act','keygen',{bit}),
    S('k_enc','เข้ารหัสข้อมูลผู้ป่วย','🔐','act','encrypt'),
    S('k_send','ส่งข้อมูลผ่านช่องทางที่เข้ารหัส','📡','act','transmit'),
    S('k_sum','ตรวจสอบ Checksum ปลายทาง','🧮','io','checksum',{},'g1'),
    S('k_ack','ยืนยันการรับข้อมูล (ACK)','✅','act','ack',{},'g2'),
    S('k_close','ปิดการเชื่อมต่อและล้าง Key','🚪','act','close',{},'g3'),
    S('k_log','บันทึก Log การส่งข้อมูล','📝','act','log',{},'g4')
   ]};
 }
];
const DEC3=[
 ['อนุมัติเข้าสู่ระบบทันที','🔓','act','grant_now'],['เก็บรหัสผ่านเป็นข้อความธรรมดา','📄','act','plaintext'],
 ['ปิดไฟร์วอลล์ชั่วคราว','🔥','act','fw_off'],['ส่งรหัสผ่านทางอีเมล','📧','act','mail_pw'],
 ['ข้ามขั้นตอน OTP','⏭','act','skip_otp'],['ให้สิทธิ์ Admin แก่ผู้ใช้','👑','act','admin'],
 ['ล้าง Log ทั้งหมด','🗑','act','wipe_log'],['เปิดพอร์ต Remote Desktop','🖥','act','open_port'],
 ['ปฏิเสธการเข้าถึง','⛔','act','deny'],['รีสตาร์ทเซิร์ฟเวอร์','🔌','act','reboot']
];


/* ---------- WORLD 4 : ROBO KITCHEN ---------- */
const GEN4=[
 r=>{ const min=r.pick([1,2,3,4]),lvl=r.pick(['กลาง','แรง']),
      meat=r.pick(['ไก่สับ','หมูสับ','เนื้อสับ','เต้าหู้แข็ง','กุ้งสับ']),
      chili=r.pick([3,5,7,10]);
  return{title:'หุ่นยนต์เชฟ: ผัดกะเพรา',
   story:`ครัวกลางอัตโนมัติรับออร์เดอร์ผัดกะเพรา${meat} หุ่นยนต์ต้องทำตามลำดับให้ถูก ไม่งั้นไฟลุกท่วมกระทะ`,
   goals:[`เป้าหมายคือผัดกะเพรา${meat}ให้สุกหอม โดยไม่ทำครัวไหม้`,
    `[g2]เตรียมวัตถุดิบและล้างมือให้เรียบร้อยก่อนเริ่มลงมือ`,
    `ต้องเปิดเตาไฟ${lvl}ก่อน แล้วจึงใส่น้ำมัน — เทน้ำมันลงกระทะเย็นอาหารจะอมน้ำมันจนเละ`,
    `ผัดกระเทียมกับพริก ${chili} เม็ดให้หอมก่อน แล้วจึงใส่${meat}ผัด ${min} นาที`,
    `[g0]ปรุงรสหลังจากเนื้อสุกแล้วเท่านั้น`,
    `[g1]ผัดคลุกให้เครื่องปรุงเข้ากันทั่วกระทะ`,
    `ใบกะเพราใส่เป็นอย่างสุดท้ายก่อนปิดเตา ใส่เร็วเกินไปใบจะดำไหม้`,
    `[g3]ปิดเตาให้เรียบร้อยก่อน จึงตักใส่จานเสิร์ฟ`],
   sim:{mode:'pan'},
   all:[
    S('k_prep','เตรียมวัตถุดิบและล้างมือ','🧼','act','prep',{},'g2'),
    S('k_heat',`เปิดเตาไฟ${lvl}`,'🔥','act','heat_on'),
    S('k_oil','ใส่น้ำมันลงกระทะ','🫗','act','oil'),
    S('k_garlic',`ผัดกระเทียมและพริก ${chili} เม็ดให้หอม`,'🌶','act','add',{c:'#e0c060'}),
    S('k_meat',`ใส่${meat} ผัด ${min} นาที`,'🍗','act','add',{c:'#c08050'}),
    S('k_season','ปรุงรสด้วยซีอิ๊วและน้ำปลา','🧂','act','season',{},'g0'),
    S('k_stir','ผัดให้เข้ากันทั่วกระทะ','🥄','act','stir',{},'g1'),
    S('k_basil','ใส่ใบกะเพราแล้วคลุกเร็ว ๆ','🌿','act','add',{c:'#3fbf6a'}),
    S('k_off','ปิดเตาไฟ','🛑','act','heat_off'),
    S('k_plate','ตักใส่จานเสิร์ฟ','🍽','act','plate',{},'g3')
   ]};
 },
 r=>{ const gm=r.pick([250,300,350,400,450,500]),kn=r.pick([8,10,12,15,20]),
      rs=r.pick([30,45,60,90,120]),tp=r.pick([160,170,180,190,200,220]),bk=r.pick([15,18,20,25,30,35]);
  return{title:'เบเกอรี่อัตโนมัติ: อบขนมปัง',
   story:`สายพานเบเกอรี่ต้องอบขนมปังล็อตเช้า ถ้าลำดับผิดแป้งจะไม่ขึ้นฟูหรือไหม้เป็นถ่าน`,
   goals:[`เป้าหมายคือขนมปังที่ขึ้นฟูและสุกทั่วถึงทั้งก้อน`,
    `ตวงแป้ง ${gm} กรัมก่อน แล้วผสมยีสต์กับน้ำอุ่นเพื่อปลุกยีสต์ให้ทำงาน`,
    `นวดโดว์ ${kn} นาทีให้เนื้อแป้งเนียน`,
    `[g0]พักแป้งให้ขึ้นฟู ${rs} นาที ข้ามขั้นนี้ขนมจะแน่นเป็นก้อนหิน`,
    `ต้องอุ่นเตาอบให้ถึง ${tp}°C ก่อนนำเข้าอบเสมอ ไม่งั้นขนมจะดิบกลางใน`,
    `อบ ${bk} นาที และห้ามเปิดฝาเตาระหว่างอบ ขนมจะยุบแฟบ`,
    `[g1]ตรวจสีและความสุกก่อนตัดสินใจนำออก`,
    `[g2]นำออกจากเตาแล้วต้องพักให้เย็นก่อนตัด`],
   sim:{mode:'oven'},
   all:[
    S('b_meas',`ตวงแป้ง ${gm} กรัม`,'⚖','io','measure'),
    S('b_yeast','ผสมยีสต์กับน้ำอุ่น','🧫','act','mix'),
    S('b_knead',`นวดโดว์ ${kn} นาที`,'🤲','act','knead'),
    S('b_rest',`พักแป้งให้ขึ้นฟู ${rs} นาที`,'⏱','act','rest',{},'g0'),
    S('b_pre',`อุ่นเตาอบที่ ${tp}°C`,'🔥','act','oven_on',{tp}),
    S('b_bake',`อบ ${bk} นาที`,'🍞','act','bake'),
    S('b_check','ตรวจสอบสีและความสุก','🔍','io','check',{},'g1'),
    S('b_out','นำออกจากเตาอบ','🧤','act','oven_off'),
    S('b_cool','พักให้เย็นก่อนตัด','❄','act','cool',{},'g2'),
    S('b_serve','จัดใส่ถาดเสิร์ฟ','🍽','act','plate',{},'g3')
   ]};
 },
 r=>{ const gr=r.pick([15,16,18,20,21,22]),sc=r.pick([22,25,27,30,32]),tp=r.pick([55,60,65,70]);
  return{title:'บาริสต้าหุ่นยนต์: ลาเต้',
   story:`เครื่องชงอัตโนมัติรับออร์เดอร์ลาเต้ร้อน ต้องอัดผงก่อนล็อกด้ามชงเสมอ ไม่งั้นน้ำจะทะลุเป็นรู`,
   goals:[`เป้าหมายคือลาเต้ร้อนหนึ่งแก้วที่ได้มาตรฐานร้าน`,
    `[g0]ล้างหัวชงและไล่น้ำก่อนเริ่มทุกครั้ง เพื่อล้างกากเก่าและปรับอุณหภูมิ`,
    `บดเมล็ดกาแฟ ${gr} กรัมลงด้ามชงก่อน`,
    `อัดผงให้แน่นเรียบ แล้วจึงล็อกด้ามชงเข้าเครื่อง — ลำดับนี้ห้ามสลับ ถ้าล็อกก่อนอัด น้ำร้อนจะทะลุผงเป็นรู กาแฟจืดทันที`,
    `สกัดเอสเพรสโซ ${sc} วินาที`,
    `[g1]สตีมนมที่ ${tp}°C ให้ได้โฟมเนียน`,
    `[g2]เทนมทำลาเต้อาร์ตลงบนเอสเพรสโซ`,
    `เสิร์ฟลูกค้าเมื่อทุกอย่างพร้อมแล้ว`],
   sim:{mode:'coffee'},
   all:[
    S('a_clean','ล้างหัวชงและไล่น้ำ','🚿','act','clean',{},'g0'),
    S('a_grind',`บดเมล็ดกาแฟ ${gr} กรัม`,'⚙','act','grind'),
    S('a_tamp','อัดผงกาแฟให้แน่นเรียบ','🔩','act','tamp'),
    S('a_lock','ล็อกด้ามชงเข้าเครื่อง','🔒','act','lock'),
    S('a_ext',`สกัดเอสเพรสโซ ${sc} วินาที`,'☕','act','extract',{sc}),
    S('a_milk',`สตีมนมที่ ${tp}°C`,'🥛','act','steam_milk',{},'g1'),
    S('a_pour','เทนมทำลาเต้อาร์ต','🎨','act','pour',{},'g2'),
    S('a_serve','เสิร์ฟลูกค้า','🍽','act','serve'),
    S('a_wash','ล้างด้ามชงเก็บเข้าที่','🧽','act','clean2',{},'g3')
   ]};
 }
];
const DEC4=[
 ['เปิดเตาไฟแรงสุด','🔥','act','heat_max'],['ใส่น้ำเปล่าลงกระทะร้อน','💧','act','water'],
 ['ใส่น้ำแข็งลงกระทะ','🧊','act','ice'],['เปิดฝาเตาอบระหว่างอบ','🚪','act','open_oven'],
 ['ใส่น้ำตาลทรายหนึ่งถ้วย','🍬','act','sugar'],['ชิมรสด้วยช้อนเดิมซ้ำ','🥄','act','taste'],
 ['ล้างกระทะระหว่างผัด','🧽','act','wash_now'],['ตักใส่จานเสิร์ฟ','🍽','act','plate'],
 ['ปิดเตาไฟ','🛑','act','heat_off'],['อุ่นไมโครเวฟ 5 นาที','📻','act','micro']
];

/* ---------- WORLD 5 : ROUTE FINDER ---------- */
const GEN5=[
 (r,di)=>{
  const cols=7,rows=5;
  const vLegs=[1,1,2,2][di],eLegs=vLegs+1;
  let gx=0,gy=r.int(1,rows-2),startY=gy;
  const cells=[[0,gy]];const steps=[];let idx=0;
  let rem=(cols-1)-eLegs;const parts=new Array(eLegs).fill(1);
  for(let i=0;i<rem;i++)parts[r.int(0,eLegs-1)]++;
  const P=(k,l,ic,fx,data)=>steps.push(S('r'+(idx++)+k,l,ic,'act',fx,data||{}));
  for(let e=0;e<eLegs;e++){
    const n=parts[e];
    P('m',`ขับตรงไป ${n} ช่อง`,'⬆','forward',{n});
    for(let s=0;s<n;s++){gx++;cells.push([gx,gy]);}
    if(e<eLegs-1){
      const canUp=gy>=1,canDn=gy<=rows-2;
      const up=canUp&&(!canDn||r.r()<.5);
      const vn=r.int(1,Math.max(1,Math.min(2,up?gy:rows-1-gy)));
      P('t',up?'เลี้ยวซ้าย':'เลี้ยวขวา',up?'⬅':'➡',up?'turn_left':'turn_right');
      P('m',`ขับตรงไป ${vn} ช่อง`,'⬆','forward',{n:vn});
      for(let s=0;s<vn;s++){gy+=up?-1:1;cells.push([gx,gy]);}
      P('t',up?'เลี้ยวขวา':'เลี้ยวซ้าย',up?'➡':'⬅',up?'turn_right':'turn_left');
    }
  }
  const dest=r.pick(['โรงพยาบาลศูนย์','คลังสินค้าปลายทาง','ท่าเรือขนส่ง','ศูนย์กระจายพัสดุ','สนามบิน']);
  const all=[];
  if(di>=2)all.push(S('r_scan',`สแกนแผนที่เส้นทางไป${dest}`,'🗺','io','map_scan'));
  if(di>=1)all.push(S('r_start','สตาร์ทเครื่องยนต์และคาดเข็มขัด','🔑','act','engine'));
  let lightAt=-1;
  if(di>=1){lightAt=1;}
  steps.forEach((s,i)=>{
    all.push(s);
    if(i===0&&lightAt>=0)all.push(S('r_light','หยุดรอสัญญาณไฟแดง','🚦','act','wait_light'));
  });
  all.push(S('r_park',`จอดที่${dest}อย่างปลอดภัย`,'🏁','act','park'));
  if(di>=3)all.push(S('r_log','บันทึกระยะทางและเวลาเดินทาง','📝','act','log'));
  // obstacles
  const inPath=new Set(cells.map(c=>c[0]+','+c[1]));
  const obst=[];
  for(let i=0;i<9;i++){const ox=r.int(0,cols-1),oy=r.int(0,rows-1);
    if(!inPath.has(ox+','+oy)&&!obst.some(o=>o[0]===ox&&o[1]===oy))obst.push([ox,oy,r.int(0,2)]);}
  return{title:`นำรถส่งของถึง${dest}`,
   story:`รถขนส่งอัตโนมัติต้องวิ่งจากจุดสตาร์ทไป${dest} เรียงคำสั่งเลี้ยวและระยะให้ตรงกับถนนบนแผนที่ ถ้าพลาดคือชนตึก`,
   goals:(()=>{const gg=[`เป้าหมาย: นำรถจากช่อง START ไปถึงธง 🏁 ที่${dest} โดยไม่ชนอะไรเลย`,
    `เส้นถนนสีเขียวบนแผนที่คือเส้นทางที่ถูกต้อง ให้ไล่ดูแล้วนับจำนวนช่องของแต่ละช่วง`,
    `"เลี้ยวซ้าย/ขวา" อิงจากทิศที่หัวรถหันอยู่ ไม่ใช่ทิศบนจอ — พอเลี้ยวขึ้นด้านบนแล้ว ซ้ายขวาจะกลับด้านทันที`,
    `คำสั่งเลี้ยวจะหมุนหัวรถอย่างเดียว รถยังไม่ขยับ ต้องตามด้วยคำสั่ง "ขับตรงไป" เสมอ`];
    if(di>=1)gg.push(`สตาร์ทเครื่องยนต์ก่อนออกรถ และต้องหยุดรอไฟแดงตรงแยกก่อนไปต่อ`);
    gg.push(`ขั้นสุดท้ายต้องจอดที่${dest} ห้ามจอดกลางทาง`);return gg;})(),
   sim:{cells,cols,rows,obst,dest,startY,lightIdx:lightAt>=0?1:-1},
   all};
 }
];
const DEC5=[
 ['เลี้ยวซ้าย','⬅','act','turn_left'],['เลี้ยวขวา','➡','act','turn_right'],
 ['ถอยหลัง 1 ช่อง','⬇','act','reverse'],['ฝ่าสัญญาณไฟแดง','🚨','act','run_red'],
 ['เร่งความเร็วเกินกำหนด','💨','act','speeding'],['กลับรถกลางถนน (U-turn)','🔄','act','uturn'],
 ['จอดข้างทางรอสัญญาณ','🅿','act','park_side'],['เปิดไฟฉุกเฉินแล้วขับต่อ','🔶','act','hazard'],
 ['เปลี่ยนเป็นโหมดขับเอง','🕹','act','manual_drive']
];

const GENS={1:GEN1,2:GEN2,3:GEN3,4:GEN4,5:GEN5},DECS={1:DEC1,2:DEC2,3:DEC3,4:DEC4,5:DEC5};

/* ---------- นักสร้างภารกิจ ---------- */
function buildMission(world,diffIdx,seed){
  const r=new RNG(seed),d=DIFF[diffIdx];
  const tpl=r.pick(GENS[world])(r,diffIdx,d);
  // เลือกขั้นตอน: required + optional group ตามงบความยาว
  const req=tpl.all.filter(s=>!s.opt);
  const groups=[];tpl.all.forEach(s=>{if(s.opt&&!groups.includes(s.opt))groups.push(s.opt);});groups.sort();
  const inc=new Set();let len=req.length;
  for(const g of groups){const add=tpl.all.filter(s=>s.opt===g).length;if(len+add<=d.len){inc.add(g);len+=add;}}
  const solution=tpl.all.filter(s=>!s.opt||inc.has(s.opt));
  const used=new Set(solution.map(s=>s.key));

  // บล็อกลวง
  const decoys=[];
  // 1) กับดักค่าพารามิเตอร์ใกล้เคียง (สำคัญที่สุด — บังคับให้อ่านโจทย์)
  const numbered=solution.filter(s=>/\d/.test(s.label)&&!/\d+\.\d+\.\d+/.test(s.label));
  r.shuffle(numbered).slice(0,Math.min(2,Math.ceil(d.dec/2))).forEach((s,i)=>{
    const lab=s.label.replace(/\d+(\.\d+)?/,m=>{
      const n=parseFloat(m);const off=r.pick([-1,1])*(n>60?r.int(8,25):n>10?r.int(3,9):(r.int(2,6)/10));
      const v=Math.max(1,Math.round((n+off)*(n%1?10:1))/(n%1?10:1));return String(v===n?n+2:v);
    });
    if(lab!==s.label&&!solution.some(q=>q.label===lab)&&!decoys.some(q=>q.label===lab))
      decoys.push(S('dp'+i,lab,s.icon,s.kind,'trap_param',{d:FXDESC[s.fx]||''}));
  });
  // 2) ทิศหลบตรงข้าม (โลก 2)
  if(world===2&&tpl.obs){
    const opp=tpl.obs.avoid==='up'?{t:'ลดระดับลอดใต้สิ่งกีดขวาง',i:'⬇',f:'avoid_down'}:{t:'ไต่ระดับข้ามสิ่งกีดขวาง',i:'⬆',f:'avoid_up'};
    decoys.push(S('dopp',opp.t,opp.i,'act',opp.f));
  }
  // 3) บล็อกลวงจากคลังโลก
  const pool=DECS[world].filter(x=>!solution.some(s=>s.label===x[0])&&!decoys.some(s=>s.label===x[0]));
  r.pickN(pool,Math.max(0,d.dec-decoys.length)).forEach((x,i)=>decoys.push(S('dw'+i,x[0],x[1],x[2],x[3])));

  const blocks=r.shuffle(solution.concat(decoys));
  const map={};blocks.forEach(b=>map[b.key]=b);
  const goals=(tpl.goals||[]).filter(g=>{const m=/^\[(g\d)\]/.exec(g);return !m||inc.has(m[1]);})
                              .map(g=>g.replace(/^\[g\d\]\s*/,''));
  return{
    world,diff:diffIdx,seed,
    id:`CF-${world}${b36(seed,4)}-${b36(hashStr(tpl.title+len),3)}`,
    title:tpl.title,story:tpl.story,goals,rule:WORLD_RULE[world],sim:tpl.sim||{},
    solution,blocks,map,timeLimit:d.time+Math.max(0,solution.length-d.len)*14,hints:d.hints
  };
}

/* ==================================================================
   3. SIMULATION ENGINE (canvas)
   ================================================================== */
const cv=$('#sim'),cx=cv.getContext('2d');
let CW=0,CH=0;
function resize(){const dpr=Math.min(devicePixelRatio||1,2),r=cv.getBoundingClientRect();
  CW=r.width;CH=r.height;cv.width=r.width*dpr;cv.height=r.height*dpr;cx.setTransform(dpr,0,0,dpr,0,0);}
addEventListener('resize',resize);

function rr(c,x,y,w,h,r){r=Math.min(r,w/2,h/2);c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();}

const Sim={
  world:1,t:0,shake:0,flash:0,flashCol:'#ff3d5f',parts:[],floats:[],st:{},status:'STANDBY',
  init(world,cfg){
    this.world=world;this.t=0;this.parts=[];this.floats=[];this.shake=0;this.flash=0;this.status='STANDBY';
    if(world===1)this.st={moist:cfg.moist||20,moistD:cfg.moist||20,temp:cfg.temp||32,light:cfg.light||500,
      valve:0,led:0,fan:0,fanR:0,pump:0,flood:0,health:1,cloud:0,ping:0,tank:0,growth:.45,th:cfg.th||0};
    if(world===2)this.st={x:.1,xD:.1,y:.86,yD:.86,rot:0,pkg:1,pkgFall:null,crash:0,delivered:0,
      battery:(cfg.battery||90)/100,scan:0,obs:cfg.obs||'crane',obsX:.55,alt:cfg.alt||10,carry:0,smoke:0,shot:0};
    if(world===3)this.st={stage:0,shields:[0,0,0],otp:'',otpT:0,granted:0,breach:0,glitch:0,packets:[],
      lock:0,ip:cfg.ip||'',hash:0,rain:[],dg:cfg.dg||6};
    if(world===3)for(let i=0;i<26;i++)this.st.rain.push({x:Math.random(),y:Math.random(),s:.15+Math.random()*.5});
    if(world===4)this.st={mode:cfg.mode||'pan',heat:0,heatD:0,oil:0,items:[],stir:0,season:0,plated:0,
      burnt:0,oven:0,ovenT:20,ovenTD:20,dough:0,baked:0,cup:0,foam:0,extract:0,grind:0,tamp:0,locked:0,steam:0,fire:0};
    if(world===5)this.st={cells:cfg.cells||[[0,2]],cols:cfg.cols||7,rows:cfg.rows||5,obst:cfg.obst||[],
      i:0,gx:(cfg.cells||[[0,2]])[0][0],gy:(cfg.cells||[[0,2]])[0][1],
      gxD:(cfg.cells||[[0,2]])[0][0],gyD:(cfg.cells||[[0,2]])[0][1],
      dir:0,ang:0,angD:0,crash:0,arrived:0,light:0,engine:0,scan:0,smoke:0,lightIdx:cfg.lightIdx};
  },
  float(txt,col){this.floats.push({txt,col:col||'#26ff9c',life:1.9,y:0,x:.5});},
  burst(x,y,col,n,sp){for(let i=0;i<(n||16);i++){const a=Math.random()*Math.PI*2,v=(sp||2)*(.3+Math.random());
    this.parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-.7,life:1,col});}},
  hit(col){this.shake=13;this.flash=1;this.flashCol=col||'#ff3d5f';},

  good(fx,d){
    const s=this.st;this.status='RUNNING';
    if(this.world===1){
      switch(fx){
        case 'sense_moist':s.ping=1;this.float(`READ → ความชื้น ${Math.round(s.moist)}%`,'#a06bff');break;
        case 'sense_temp':s.ping=1;this.float(`READ → อุณหภูมิ ${s.temp}°C`,'#a06bff');break;
        case 'sense_light':s.ping=1;this.float(`READ → แสง ${s.light} lux`,'#a06bff');break;
        case 'sense_ec':s.ping=1;this.float('READ → EC สารละลาย','#a06bff');break;
        case 'sense_tank':s.tank=1;this.float('ระดับน้ำ/ปุ๋ยในถัง: พร้อมใช้งาน','#3ad9ff');break;
        case 'cond':this.float('เงื่อนไขเป็นจริง → ทำงานต่อ','#ffb627');break;
        case 'valve_on':s.valve=1;this.float('วาล์วน้ำเปิด 💧','#3ad9ff');break;
        case 'valve_off':s.valve=0;this.float('ปิดวาล์วเรียบร้อย','#26ff9c');break;
        case 'pump_on':s.pump=1;this.float('ปั๊มปุ๋ยทำงาน','#3ad9ff');break;
        case 'pump_off':s.pump=0;this.float('ปิดปั๊มปุ๋ย','#26ff9c');break;
        case 'wait':s.wait=1;this.float(`รอ ${d.sec||5} หน่วยเวลา…`,'#ffb627');break;
        case 'led_on':s.led=1;this.float('ไฟปลูกพืชเปิด','#ffb627');break;
        case 'led_off':s.led=0;this.float('ปิดไฟ LED','#26ff9c');break;
        case 'fan_on':s.fan=1;this.float('พัดลมระบายอากาศทำงาน','#3ad9ff');break;
        case 'cloud':s.cloud=1.6;this.float('อัปโหลดข้อมูลขึ้น Cloud ✓','#26ff9c');break;
        case 'alert':this.float('แจ้งเตือนถึงเกษตรกรแล้ว 🔔','#26ff9c');break;
        default:this.float('OK','#26ff9c');
      }
      s.health=Math.min(1,s.health+.08);
    }
    if(this.world===2){
      switch(fx){
        case 'scan':s.scan=1.4;this.float('ล็อกพิกัดปลายทางแล้ว 🛰','#a06bff');break;
        case 'battery':this.float(`แบตเตอรี่ ${Math.round(s.battery*100)}% — เพียงพอ`,'#26ff9c');break;
        case 'takeoff':s.y=.34;this.float(`ไต่ระดับ ${s.alt} เมตร`,'#3ad9ff');break;
        case 'fly':s.x=.46;this.float('กำลังบินตามเส้นทาง…','#3ad9ff');break;
        case 'fly2':s.x=.78;this.float('เข้าใกล้จุดหมายปลายทาง','#3ad9ff');break;
        case 'grab':s.carry=1;s.pkg=1;this.float('คีบพัสดุสำเร็จ 🪝','#26ff9c');break;
        case 'detect':s.scan=1.4;this.float('LiDAR พบสิ่งกีดขวางข้างหน้า','#ffb627');break;
        case 'avoid_up':s.y=.16;s.x=.68;this.float('ไต่ระดับข้ามสำเร็จ ⬆','#26ff9c');break;
        case 'avoid_down':s.y=.6;s.x=.68;this.float('ลอดใต้สิ่งกีดขวางสำเร็จ ⬇','#26ff9c');break;
        case 'hover':this.float('ลอยนิ่ง — สัญญาณคงที่','#3ad9ff');break;
        case 'capture':s.shot=1;this.burst(CW*.8,CH*.4,'#ffffff',18,3);this.float('บันทึกภาพแล้ว 📸','#26ff9c');break;
        case 'descend':s.x=.84;s.y=.62;this.float('ลดระดับลงจุดวาง','#3ad9ff');break;
        case 'drop':s.pkg=0;s.pkgFall={x:s.xD,y:s.yD,v:0};s.delivered=1;this.float('ส่งพัสดุสำเร็จ! 📦','#26ff9c');break;
        case 'rtl':s.x=.1;s.y=.5;this.float('กำลังบินกลับฐาน 🏠','#26ff9c');break;
        case 'cloud':this.float('อัปโหลดข้อมูลขึ้น Cloud ✓','#26ff9c');break;
        default:this.float('OK','#26ff9c');
      }
      s.battery=Math.max(.05,s.battery-.035);
    }
    if(this.world===3){
      switch(fx){
        case 'recv_cred':s.stage=1;s.packets.push({p:0,c:'#a06bff'});this.float('รับข้อมูลเข้าสู่ระบบ','#a06bff');break;
        case 'ratelimit':this.float('จำกัดจำนวนครั้งล็อกอินแล้ว 🚧','#26ff9c');break;
        case 'hash':s.hash=1;s.shields[0]=1;this.float('รหัสผ่านถูก Hash + Salt ✓','#26ff9c');break;
        case 'db_check':s.stage=2;s.packets.push({p:0,c:'#3ad9ff'});this.float('ตรวจสอบกับฐานข้อมูล…','#3ad9ff');break;
        case 'cond':this.float('เงื่อนไขเป็นจริง → ผ่าน','#ffb627');break;
        case 'otp_gen':s.otp=Array.from({length:s.dg},()=>Math.floor(Math.random()*10)).join('');s.otpT=1;
          s.shields[1]=1;this.float('สร้างรหัส OTP แล้ว','#ffb627');break;
        case 'otp_send':if(!s.otp)s.otp=Array.from({length:s.dg},()=>Math.floor(Math.random()*10)).join('');
          s.otpT=1;s.packets.push({p:0,c:'#ffb627'});this.float('ส่ง OTP ไปยังมือถือ 📲','#3ad9ff');break;
        case 'otp_verify':s.shields[1]=1;s.stage=3;this.float('OTP ถูกต้อง ✓','#26ff9c');break;
        case 'grant':s.granted=1;s.shields[2]=1;s.lock=1;this.burst(CW/2,CH/2,'#26ff9c',26,3);this.float('อนุมัติเข้าสู่ระบบอย่างปลอดภัย 🔓','#26ff9c');break;
        case 'detect_anom':s.stage=1;this.float('IDS จับพฤติกรรมผิดปกติ 🚨','#ffb627');break;
        case 'check_ip':s.stage=2;s.packets.push({p:0,c:'#ffb627'});this.float(`ตรวจสอบ ${s.ip} กับบัญชีดำ`,'#3ad9ff');break;
        case 'snapshot':this.float('เก็บหลักฐานเรียบร้อย 📸','#26ff9c');break;
        case 'block_ip':s.shields[0]=1;s.shields[1]=1;this.float('บล็อก IP ต้นทางแล้ว ⛔','#26ff9c');break;
        case 'isolate':this.float('แยกเครื่องออกจากเครือข่าย','#26ff9c');break;
        case 'alert_soc':s.stage=3;this.float('แจ้งทีม SOC แล้ว 📢','#26ff9c');break;
        case 'scan_mal':this.float('สแกนมัลแวร์ทั้งระบบ…','#3ad9ff');break;
        case 'report':s.shields[2]=1;s.lock=1;this.float('สรุปรายงานเหตุการณ์ ✓','#26ff9c');break;
        case 'req_cert':s.stage=1;s.packets.push({p:0,c:'#a06bff'});this.float('ขอใบรับรองจากเซิร์ฟเวอร์','#a06bff');break;
        case 'verify_cert':s.shields[0]=1;s.stage=2;this.float('ลายเซ็นดิจิทัลถูกต้อง ✓','#26ff9c');break;
        case 'keygen':s.shields[1]=1;this.float('สร้าง Session Key สำเร็จ 🔑','#26ff9c');break;
        case 'encrypt':s.hash=1;this.float('ข้อมูลถูกเข้ารหัสแล้ว 🔐','#26ff9c');break;
        case 'transmit':s.packets.push({p:0,c:'#26ff9c'});s.stage=3;this.float('ส่งข้อมูลผ่านช่องทางเข้ารหัส','#3ad9ff');break;
        case 'checksum':this.float('Checksum ตรงกัน ✓','#26ff9c');break;
        case 'ack':this.float('ปลายทางยืนยันการรับข้อมูล','#26ff9c');break;
        case 'close':s.shields[2]=1;s.lock=1;this.float('ปิดการเชื่อมต่อและล้าง Key','#26ff9c');break;
        case 'log':this.float('บันทึก Log เรียบร้อย 📝','#26ff9c');break;
        default:this.float('OK','#26ff9c');
      }
    }
    if(this.world===4){
      switch(fx){
        case 'prep':this.float('เตรียมวัตถุดิบเรียบร้อย 🧼','#3ad9ff');break;
        case 'measure':this.float('ตวงส่วนผสมตามสูตร ⚖','#a06bff');break;
        case 'heat_on':s.heat=.75;this.float('เตาติดไฟแล้ว 🔥','#ffb627');break;
        case 'oil':s.oil=1;this.float('น้ำมันเริ่มร้อนพอดี','#ffb627');break;
        case 'add':s.items.push({c:(d&&d.c)||'#d0a060',x:(Math.random()-.5)*.6,y:(Math.random()-.5)*.4});
          this.burst(CW*.28,CH*.55,(d&&d.c)||'#d0a060',10,1.6);this.float('ใส่วัตถุดิบลงกระทะ','#26ff9c');break;
        case 'stir':s.stir=1;this.float('ผัดคลุกให้เข้ากัน 🥄','#26ff9c');break;
        case 'season':s.season=1;this.float('ปรุงรสได้ที่ 🧂','#26ff9c');break;
        case 'heat_off':s.heat=0;this.float('ปิดเตาเรียบร้อย','#26ff9c');break;
        case 'plate':s.plated=1;this.burst(CW*.78,CH*.6,'#26ff9c',18,2);this.float('จัดจานเสิร์ฟสวยงาม 🍽','#26ff9c');break;
        case 'mix':s.dough=.4;this.float('ยีสต์เริ่มทำงาน 🧫','#3ad9ff');break;
        case 'knead':s.dough=.7;this.float('นวดจนโดว์เนียน 🤲','#26ff9c');break;
        case 'rest':s.dough=1;this.float('แป้งขึ้นฟูเป็นสองเท่า','#26ff9c');break;
        case 'oven_on':s.oven=1;s.ovenT=(d&&d.tp)||180;this.float(`อุ่นเตาอบถึง ${(d&&d.tp)||180}°C 🔥`,'#ffb627');break;
        case 'bake':s.baked=1;this.float('ขนมปังกำลังพองสวย 🍞','#26ff9c');break;
        case 'check':this.float('สีเหลืองทอง สุกกำลังดี 🔍','#3ad9ff');break;
        case 'oven_off':s.oven=0;this.float('นำออกจากเตาอบ 🧤','#26ff9c');break;
        case 'cool':this.float('พักให้เย็นก่อนตัด ❄','#26ff9c');break;
        case 'clean':case 'clean2':this.float('ล้างอุปกรณ์สะอาดเอี่ยม 🚿','#3ad9ff');break;
        case 'grind':s.grind=1;this.float('บดเมล็ดละเอียดพอดี ⚙','#26ff9c');break;
        case 'tamp':s.tamp=1;this.float('อัดผงแน่นเรียบ 🔩','#26ff9c');break;
        case 'lock':s.locked=1;this.float('ล็อกด้ามชงเข้าเครื่องแล้ว 🔒','#26ff9c');break;
        case 'extract':s.extract=1;s.cup=.5;this.float('เอสเพรสโซไหลเป็นสายน้ำผึ้ง ☕','#26ff9c');break;
        case 'steam_milk':s.foam=1;this.float('โฟมนมเนียนเป็นเงา 🥛','#26ff9c');break;
        case 'pour':s.cup=.95;this.float('ลาเต้อาร์ตสวยมาก 🎨','#26ff9c');break;
        case 'serve':s.plated=1;this.burst(CW*.78,CH*.5,'#26ff9c',18,2);this.float('เสิร์ฟลูกค้าเรียบร้อย 🍽','#26ff9c');break;
        default:this.float('OK','#26ff9c');
      }
      s.steam=Math.max(s.steam,s.heat>0||s.extract?1:0);
    }
    if(this.world===5){
      switch(fx){
        case 'map_scan':s.scan=1.5;this.float('โหลดแผนที่เส้นทางแล้ว 🗺','#a06bff');break;
        case 'engine':s.engine=1;this.float('เครื่องยนต์ติด พร้อมออกเดินทาง 🔑','#26ff9c');break;
        case 'forward':{const n=(d&&d.n)||1;s.i=Math.min(s.cells.length-1,s.i+n);
          s.gx=s.cells[s.i][0];s.gy=s.cells[s.i][1];this.float(`ขับตรงไป ${n} ช่อง`,'#3ad9ff');break;}
        case 'turn_left':s.dir=(s.dir+3)%4;s.ang-=Math.PI/2;this.float('เลี้ยวซ้าย ⬅','#26ff9c');break;
        case 'turn_right':s.dir=(s.dir+1)%4;s.ang+=Math.PI/2;this.float('เลี้ยวขวา ➡','#26ff9c');break;
        case 'wait_light':s.light=1;this.float('หยุดรอไฟแดง… ไฟเขียวแล้ว 🚦','#ffb627');break;
        case 'park':s.arrived=1;this.burst(CW*.5,CH*.5,'#26ff9c',30,3);this.float('ถึงที่หมายอย่างปลอดภัย! 🏁','#26ff9c');break;
        default:this.float('OK','#26ff9c');
      }
    }
    if(fx==='log'&&this.world!==3)this.float('บันทึก Log เรียบร้อย 📝','#26ff9c');
  },

  bad(fx){
    const s=this.st;this.hit();this.status='ERROR';
    const M={
      valve_on:'น้ำท่วมแปลง! 🌊 ผักลอยไปกับสายน้ำ',valve_stuck:'ลืมปิดวาล์ว! น้ำท่วมทั้งโรงเรือน 🌊',
      valve_off:'ปิดวาล์วก่อนน้ำจะไหล — ดินยังแห้งผาก 🥀',pump_on:'ปุ๋ยเข้มข้นเกิน! รากผักไหม้ 🔥',
      led_on:'เปิดไฟผิดจังหวะ ผักยืดจนล้ม 🌱',fan_on:'พัดลมเป่าต้นกล้าปลิวหมดแปลง 🍃',
      harvest:'เก็บเกี่ยวก่อนกำหนด ได้ผักจิ๋ว 🥬',reboot:'บอร์ดรีบูตกลางคัน ข้อมูลหาย ⚡',
      spray:'พ่นยาโดนเซนเซอร์ ค่าเพี้ยนทั้งระบบ 🧴',roof:'ปิดหลังคาตอนกลางวัน ผักขาดแสง 🌑',
      cloud:'ส่งข้อมูลว่างเปล่าขึ้นคลาวด์ ☁',sense_moist:'อ่านค่าซ้ำโดยไม่ทำอะไรต่อ ระบบค้าง ⏳',
      takeoff:'ใบพัดหมุนตอนยังไม่พร้อม โดรนล้มคว่ำ 🚁',fly:'พุ่งชนสิ่งกีดขวางเต็มแรง! 💥',
      fly2:'บินเลยจุดหมายไปไกลลิบ 🌫',avoid_up:'ไต่ขึ้นชนสายไฟแรงสูง! ⚡',
      avoid_down:'ลดระดับลงชนหลังคารถบรรทุก! 💥',drop:'พัสดุร่วงจากฟ้า แตกกระจาย! 📦💥',
      emergency_drop:'ทิ้งพัสดุกลางอากาศ ลูกค้าโวยลั่น 🪂',motor_off:'ดับมอเตอร์กลางอากาศ — ตกฟรีฟอลล์ 🔻',
      boost:'เร่งจนแบตหมดกลางทาง โดรนดับ ⚡',manual:'สลับโหมดมือกลางอากาศ เสียการควบคุม 🕹',
      descend:'ลงจอดผิดจุด กลางสระน้ำ 💦',grab:'คีบอากาศเปล่า แขนกลหักคาที่ 🪝',
      rtl:'บินกลับฐานทั้งที่พัสดุยังอยู่ 🏠',capture:'ถ่ายได้แต่ภาพเบลอ ๆ ของท้องฟ้า 📸',
      grant:'อนุมัติก่อนตรวจสอบ — แฮกเกอร์เดินเข้าประตูหน้า 💀',grant_now:'เปิดประตูให้ทุกคนเข้าระบบ! 💀',
      plaintext:'เก็บรหัสผ่านเป็นข้อความธรรมดา ข้อมูลหลุดทันที 📄',skip_otp:'ข้าม OTP — บัญชีถูกยึดใน 3 วินาที ⏱',
      fw_off:'ปิดไฟร์วอลล์ = เปิดประตูให้บอตเน็ต 🔥',mail_pw:'ส่งรหัสผ่านทางอีเมล ถูกดักกลางทาง 📧',
      admin:'ให้สิทธิ์ Admin มั่ว ระบบถูกยึดทั้งเซิร์ฟเวอร์ 👑',wipe_log:'ล้าง Log ทิ้ง สืบสวนต่อไม่ได้เลย 🗑',
      open_port:'เปิดพอร์ต RDP ทิ้งไว้ โดนสแกนเจอใน 1 นาที 🖥',otp_send:'ส่ง OTP ก่อนตรวจตัวตน โดนสแปมทั้งระบบ 📲',
      otp_verify:'ยืนยัน OTP ที่ยังไม่ได้สร้าง ระบบพัง ❌',db_check:'ค้นฐานข้อมูลด้วยข้อมูลดิบ SQL Injection! 💉',
      deny:'ปฏิเสธผู้ใช้ที่ถูกต้อง ลูกค้าร้องเรียน ⛔',trap_param:'ค่าพารามิเตอร์ไม่ตรงกับที่โจทย์กำหนด ❌',
      heat_on:'เปิดไฟทิ้งไว้เฉย ๆ กระทะไหม้เปล่า 🔥',heat_max:'ไฟลุกท่วมกระทะ! ควันเต็มครัว 🔥',
      oil:'เทน้ำมันลงกระทะเย็น อาหารอมน้ำมันจนเละ 🫗',water:'น้ำเจอน้ำมันร้อน กระเด็นทั่วครัว 💦',
      ice:'น้ำแข็งลงกระทะร้อน ไอน้ำระเบิดตูม! 💥',add:'ใส่วัตถุดิบผิดจังหวะ ไหม้เกรียมติดกระทะ 🥘',
      stir:'ผัดกระทะเปล่า เสียงดังทั้งครัว 🥄',season:'ปรุงรสก่อนมีอะไรในกระทะ เค็มปี๋ 🧂',
      heat_off:'ปิดเตาก่อนอาหารสุก ดิบทั้งจาน ❄',plate:'ตักเสิร์ฟทั้งที่ยังไม่สุก ลูกค้าส่งคืน 🍽',
      sugar:'เทน้ำตาลทั้งถ้วย หวานจนกินไม่ได้ 🍬',taste:'ชิมด้วยช้อนเดิมซ้ำ ผิดสุขอนามัย 🥄',
      wash_now:'ล้างกระทะกลางคัน อาหารเย็นชืด 🧽',micro:'เข้าไมโครเวฟ 5 นาที ไหม้เป็นถ่าน 📻',
      open_oven:'เปิดฝาเตากลางคัน ขนมปังยุบแฟบ 🚪',bake:'เข้าอบทั้งที่เตายังไม่ร้อน ดิบกลางใน 🍞',
      oven_on:'อุ่นเตาผิดจังหวะ พลังงานสูญเปล่า 🔥',knead:'นวดโดว์ที่ยังไม่ผสมน้ำ แป้งฟุ้งทั้งครัว 🤲',
      rest:'พักแป้งผิดขั้น โดว์แข็งเป็นก้อนหิน ⏱',oven_off:'เปิดเตาเอาของออกก่อนเวลา ดิบทั้งก้อน 🧤',
      grind:'บดเมล็ดซ้ำจนผงละเอียดเกิน กาแฟขม ⚙',tamp:'อัดผงที่ยังไม่ได้บด ด้ามชงว่างเปล่า 🔩',
      lock:'ล็อกด้ามชงที่ยังไม่ได้อัดผง น้ำทะลุเป็นรู 🔒',extract:'สกัดก่อนล็อกด้าม น้ำร้อนพุ่งทั่วเครื่อง ☕',
      steam_milk:'สตีมนมจนเดือด โฟมแตกเป็นฟองใหญ่ 🥛',pour:'เทนมลงแก้วเปล่า ไม่มีกาแฟสักหยด 🎨',
      serve:'เสิร์ฟแก้วเปล่าให้ลูกค้า 🍽',
      forward:'พุ่งชนตึกเต็มแรง! เศษกระจกกระจาย 💥',turn_left:'เลี้ยวผิดทาง หลุดเข้าซอยตัน ↩',
      turn_right:'เลี้ยวผิดทาง หลุดเข้าซอยตัน ↪',reverse:'ถอยชนเสาไฟฟ้า ไฟดับทั้งซอย ⚡',
      run_red:'ฝ่าไฟแดง! เกือบชนกลางสี่แยก 🚨',speeding:'เร่งเกินกำหนด เสียหลักตกข้างทาง 💨',
      uturn:'กลับรถกลางถนน รถติดยาวเป็นกิโล 🔄',park_side:'จอดผิดจุด ของยังส่งไม่ถึงมือ 🅿',
      hazard:'เปิดไฟฉุกเฉินแล้วขับต่อ ผิดกฎจราจร 🔶',manual_drive:'สลับโหมดขับเอง ระบบอัตโนมัติหลุด 🕹',
      wait_light:'หยุดกลางถนนที่ไม่มีไฟแดง โดนบีบแตรลั่น 📢',engine:'สตาร์ทซ้ำขณะเครื่องติดอยู่ เสียงเอี๊ยดลั่น 🔑',
      park:'จอดทั้งที่ยังไม่ถึงที่หมาย 🏁'
    };
    this.float(M[fx]||'ลำดับคำสั่งไม่ถูกต้อง ระบบหยุดทำงาน ❌','#ff3d5f');
    if(this.world===1){
      if(fx==='valve_on'||fx==='valve_stuck'){s.flood=1;s.valve=1;}
      s.health=Math.max(.12,s.health-.42);
      this.burst(CW/2,CH*.7,'#ff3d5f',22,2.6);
    }
    if(this.world===2){
      s.crash=1;s.smoke=1;this.burst(CW*s.xD,CH*s.yD,'#ff6a3d',26,3.4);
      if(fx==='drop'||fx==='emergency_drop'){s.pkg=0;s.pkgFall={x:s.xD,y:s.yD,v:0,broken:1};}
    }
    if(this.world===3){s.breach=1;s.glitch=1;s.granted=0;this.burst(CW/2,CH/2,'#ff3d5f',26,3);}
    if(this.world===4){s.burnt=1;s.fire=1;this.burst(CW*.28,CH*.5,'#ff6a3d',24,3);}
    if(this.world===5){s.crash=1;s.smoke=1;this.burst(CW*.5,CH*.5,'#ff6a3d',26,3.2);}
  },
  recover(){
    const s=this.st;this.status='RUNNING';
    if(this.world===1){s.flood=0;s.valve=0;}
    if(this.world===2){s.crash=0;s.smoke=0;}
    if(this.world===3){s.breach=0;s.glitch=0;}
    if(this.world===4){s.burnt=0;s.fire=0;}
    if(this.world===5){s.crash=0;s.smoke=0;}
  },

  update(dt){
    const s=this.st;this.t+=dt;
    this.shake=Math.max(0,this.shake-dt*36);this.flash=Math.max(0,this.flash-dt*2.2);
    this.parts.forEach(p=>{p.x+=p.vx;p.y+=p.vy;p.vy+=.14;p.life-=dt*1.25;});
    this.parts=this.parts.filter(p=>p.life>0);
    this.floats.forEach(f=>{f.life-=dt;f.y+=dt*16;});
    this.floats=this.floats.filter(f=>f.life>0);
    if(this.world===1){
      if(s.valve&&!s.flood)s.moist=Math.min(96,s.moist+dt*14);
      if(s.flood)s.moist=Math.min(100,s.moist+dt*36);
      if(!s.valve)s.moist=Math.max(4,s.moist-dt*.7);
      s.moistD=lerp(s.moistD,s.moist,dt*3.2);
      s.growth=lerp(s.growth,clamp(s.moist/70,.25,1)*s.health,dt*1.6);
      s.fanR+=dt*(s.fan?14:0);s.ping=Math.max(0,s.ping-dt*1.4);s.cloud=Math.max(0,s.cloud-dt);
    }
    if(this.world===2){
      s.xD=lerp(s.xD,s.x,dt*2.1);s.yD=lerp(s.yD,s.y,dt*2.3);
      s.rot+=dt*(s.crash?4:26);s.scan=Math.max(0,s.scan-dt);s.shot=Math.max(0,s.shot-dt*2);
      if(s.pkgFall){s.pkgFall.v+=dt*1.6;s.pkgFall.y+=s.pkgFall.v*dt*2.4;if(s.pkgFall.y>.9){s.pkgFall.y=.9;
        if(!s.pkgFall.done){s.pkgFall.done=1;this.burst(CW*s.pkgFall.x,CH*.9,s.pkgFall.broken?'#ff3d5f':'#26ff9c',14,2);}}}
    }
    if(this.world===3){
      s.packets.forEach(p=>p.p+=dt*.75);s.packets=s.packets.filter(p=>p.p<1);
      s.otpT=Math.max(0,s.otpT-dt*.35);s.glitch=Math.max(0,s.glitch-dt*.6);
      s.rain.forEach(d=>{d.y+=dt*d.s;if(d.y>1)d.y=-.1;});
    }
    if(this.world===4){
      s.heatD=lerp(s.heatD,s.heat,dt*4);s.ovenTD=lerp(s.ovenTD,s.oven?s.ovenT:20,dt*1.6);
      if(s.steam>0&&Math.random()<.35)this.parts.push({x:CW*(s.mode==='coffee'?.74:.28)+(Math.random()-.5)*26,
        y:CH*.5,vx:(Math.random()-.5)*.4,vy:-1.1-Math.random(),life:.9,col:s.burnt?'#8a99a8':'rgba(200,225,240,.8)'});
    }
    if(this.world===5){
      s.gxD=lerp(s.gxD,s.gx,dt*3.4);s.gyD=lerp(s.gyD,s.gy,dt*3.4);
      s.angD=lerp(s.angD,s.ang,dt*7);s.scan=Math.max(0,s.scan-dt);
      if(s.crash)s.angD+=dt*7;
    }
  },

  draw(){
    const w=CW,h=CH,s=this.st;if(!w||!h)return;
    cx.save();
    if(this.shake>.4){cx.translate((Math.random()-.5)*this.shake,(Math.random()-.5)*this.shake);}
    cx.clearRect(-30,-30,w+60,h+60);
    if(this.world===1)this.drawFarm(w,h,s);
    else if(this.world===2)this.drawDrone(w,h,s);
    else if(this.world===4)this.drawKitchen(w,h,s);
    else if(this.world===5)this.drawRoute(w,h,s);
    else this.drawCyber(w,h,s);
    // particles
    this.parts.forEach(p=>{cx.globalAlpha=Math.max(0,p.life);cx.fillStyle=p.col;cx.fillRect(p.x,p.y,3,3);});
    cx.globalAlpha=1;
    // floats
    this.floats.forEach((f,i)=>{const a=Math.min(1,f.life);cx.globalAlpha=a;
      cx.font='600 13px "Kanit",system-ui,sans-serif';cx.textAlign='center';
      const y=h-18-i*22-f.y;
      cx.fillStyle='rgba(4,9,15,.8)';const tw=cx.measureText(f.txt).width;
      rr(cx,w/2-tw/2-10,y-15,tw+20,22,4);cx.fill();
      cx.fillStyle=f.col;cx.fillText(f.txt,w/2,y);});
    cx.globalAlpha=1;cx.textAlign='left';
    if(this.flash>0){cx.globalAlpha=this.flash*.32;cx.fillStyle=this.flashCol;cx.fillRect(-30,-30,w+60,h+60);cx.globalAlpha=1;}
    cx.restore();
  },

  gauge(x,y,lab,val,max,col,unit){
    cx.font='9px "SFMono-Regular",monospace';cx.fillStyle='#6d8ba3';cx.fillText(lab,x,y);
    cx.fillStyle='rgba(4,9,15,.75)';rr(cx,x,y+5,86,7,3);cx.fill();
    cx.fillStyle=col;rr(cx,x,y+5,86*clamp(val/max,0,1),7,3);cx.fill();
    cx.fillStyle='#cfe3f2';cx.font='600 10px "SFMono-Regular",monospace';
    cx.fillText(Math.round(val)+(unit||''),x+92,y+12);
  },

  /* ---------- WORLD 1 ---------- */
  drawFarm(w,h,s){
    const sky=cx.createLinearGradient(0,0,0,h);
    const night=s.light<260;
    sky.addColorStop(0,night?'#0a1424':'#0d2436');sky.addColorStop(.62,night?'#0d1b28':'#123244');sky.addColorStop(1,'#0a1119');
    cx.fillStyle=sky;cx.fillRect(0,0,w,h);
    // sun / moon
    cx.globalAlpha=.7;cx.fillStyle=night?'#8fa6c0':'#ffb627';cx.beginPath();cx.arc(w*.84,h*.16,night?12:16,0,7);cx.fill();
    cx.globalAlpha=.13;cx.beginPath();cx.arc(w*.84,h*.16,34,0,7);cx.fill();cx.globalAlpha=1;
    // greenhouse frame
    cx.strokeStyle='rgba(58,217,255,.22)';cx.lineWidth=1.5;
    cx.beginPath();cx.moveTo(w*.04,h*.92);cx.lineTo(w*.04,h*.42);cx.quadraticCurveTo(w*.5,h*.1,w*.96,h*.42);cx.lineTo(w*.96,h*.92);cx.stroke();
    for(let i=1;i<5;i++){const t=i/5,x=w*.04+(w*.92)*t;cx.globalAlpha=.13;cx.beginPath();cx.moveTo(x,h*.92);
      cx.lineTo(x,h*.42-Math.sin(t*Math.PI)*h*.28);cx.stroke();cx.globalAlpha=1;}
    // LED lamp
    if(s.led){const lg=cx.createRadialGradient(w*.5,h*.3,4,w*.5,h*.3,w*.34);
      lg.addColorStop(0,'rgba(255,182,39,.36)');lg.addColorStop(1,'rgba(255,182,39,0)');
      cx.fillStyle=lg;cx.fillRect(0,0,w,h);}
    cx.fillStyle=s.led?'#ffb627':'#24384c';rr(cx,w*.44,h*.26,w*.12,7,3);cx.fill();
    // soil
    const soilY=h*.74;
    const wet=clamp(s.moistD/100,0,1);
    cx.fillStyle=`rgb(${Math.round(74-wet*30)},${Math.round(52-wet*22)},${Math.round(34-wet*8)})`;
    cx.fillRect(0,soilY,w,h-soilY);
    cx.fillStyle='rgba(0,0,0,.35)';cx.fillRect(0,soilY,w,3);
    // plants
    const n=4;
    for(let i=0;i<n;i++){
      const px=w*(.17+i*.22),g=clamp(s.growth,.15,1),ph=h*.2*g,wilt=(1-s.health)*.6;
      cx.strokeStyle=s.health>.5?'#3fbf6a':'#8a7a3a';cx.lineWidth=3;cx.lineCap='round';
      cx.beginPath();cx.moveTo(px,soilY);
      cx.quadraticCurveTo(px+wilt*24,soilY-ph*.6,px+wilt*40,soilY-ph);cx.stroke();
      const tipX=px+wilt*40,tipY=soilY-ph;
      cx.fillStyle=s.health>.5?'#4ddc86':'#9c8a44';
      for(let k=0;k<3;k++){const a=-.6+k*.85+wilt;
        cx.beginPath();cx.ellipse(tipX+Math.cos(a)*13,tipY+Math.sin(a)*7,13,6,a,0,7);cx.fill();}
      cx.globalAlpha=.5;cx.fillStyle='#26ff9c';cx.beginPath();cx.arc(tipX,tipY-3,2,0,7);cx.fill();cx.globalAlpha=1;
    }
    // water
    if(s.valve){for(let i=0;i<16;i++){const t=(this.t*2.4+i*.31)%1,px=w*(.17+(i%4)*.22)+((i*7)%9-4);
      cx.fillStyle='rgba(58,217,255,.75)';cx.fillRect(px,h*.36+t*(soilY-h*.36),1.6,7);}}
    if(s.flood){const lv=h*.16;cx.fillStyle='rgba(58,217,255,.35)';cx.fillRect(0,soilY-lv,w,lv+ (h-soilY));
      cx.strokeStyle='rgba(120,230,255,.8)';cx.lineWidth=2;cx.beginPath();
      for(let x=0;x<=w;x+=8)cx.lineTo(x,soilY-lv+Math.sin(x*.05+this.t*4)*3);cx.stroke();}
    // fan
    if(s.fan){const fx0=w*.9,fy=h*.5;cx.strokeStyle='#3ad9ff';cx.lineWidth=2;
      for(let k=0;k<3;k++){const a=s.fanR+k*2.09;cx.beginPath();cx.moveTo(fx0,fy);cx.lineTo(fx0+Math.cos(a)*13,fy+Math.sin(a)*13);cx.stroke();}
      cx.strokeStyle='rgba(58,217,255,.35)';cx.beginPath();cx.arc(fx0,fy,16,0,7);cx.stroke();}
    // valve icon
    cx.fillStyle=s.valve?'#3ad9ff':'#24384c';rr(cx,w*.06,h*.62,20,10,3);cx.fill();
    cx.fillStyle='#6d8ba3';cx.font='8px monospace';cx.fillText('VALVE',w*.06,h*.62-4);
    // sensor ping
    if(s.ping>0){cx.strokeStyle=`rgba(160,107,255,${s.ping})`;cx.lineWidth=2;
      cx.beginPath();cx.arc(w*.17,soilY-4,(1-s.ping)*46+8,0,7);cx.stroke();}
    // cloud
    if(s.cloud>0){cx.globalAlpha=Math.min(1,s.cloud);cx.fillStyle='#26ff9c';cx.font='18px sans-serif';
      cx.fillText('☁',w*.9,h*.2-s.cloud*10);cx.globalAlpha=1;}
    // HUD
    cx.fillStyle='rgba(4,9,15,.62)';rr(cx,10,10,150,74,4);cx.fill();
    this.gauge(20,24,'SOIL MOISTURE',s.moistD,100,s.flood?'#ff3d5f':'#3ad9ff','%');
    this.gauge(20,46,'TEMPERATURE',s.temp,50,'#ffb627','°C');
    this.gauge(20,68,'CROP HEALTH',s.health*100,100,s.health>.5?'#26ff9c':'#ff3d5f','%');
  },

  /* ---------- WORLD 2 ---------- */
  drawDrone(w,h,s){
    const g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#081726');g.addColorStop(.7,'#0c2233');g.addColorStop(1,'#06101a');
    cx.fillStyle=g;cx.fillRect(0,0,w,h);
    // skyline
    cx.fillStyle='rgba(12,32,48,.9)';
    for(let i=0;i<14;i++){const bw=w/13,bx=i*bw,bh=h*(.12+((i*37)%9)/34);
      cx.fillRect(bx,h*.78-bh,bw*.82,bh+h*.2);
      cx.fillStyle='rgba(58,217,255,.13)';
      for(let k=0;k<4;k++)cx.fillRect(bx+6,h*.78-bh+8+k*11,bw*.5,3);
      cx.fillStyle='rgba(12,32,48,.9)';}
    // ground
    cx.fillStyle='#0a1a26';cx.fillRect(0,h*.9,w,h*.1);
    cx.strokeStyle='rgba(58,217,255,.18)';cx.lineWidth=1;
    for(let i=0;i<10;i++){const x=(i*w/9+this.t*22)%(w+60)-30;cx.beginPath();cx.moveTo(x,h*.9);cx.lineTo(x-30,h);cx.stroke();}
    // landing pad
    const padX=w*.86;
    cx.strokeStyle=s.delivered?'#26ff9c':'#ffb627';cx.lineWidth=2;
    cx.beginPath();cx.ellipse(padX,h*.9,30,8,0,0,7);cx.stroke();
    cx.globalAlpha=.35+Math.sin(this.t*4)*.25;cx.beginPath();cx.ellipse(padX,h*.9,44,12,0,0,7);cx.stroke();cx.globalAlpha=1;
    cx.font='9px monospace';cx.fillStyle=s.delivered?'#26ff9c':'#ffb627';cx.textAlign='center';
    cx.fillText(s.delivered?'DELIVERED':'TARGET',padX,h*.9+24);cx.textAlign='left';
    // obstacle
    const ox=w*s.obsX;
    cx.fillStyle='#1b3348';cx.strokeStyle='#ff3d5f';cx.lineWidth=1.5;
    if(s.obs==='crane'){cx.fillRect(ox-6,0,12,h*.46);cx.fillRect(ox-60,h*.42,120,10);cx.strokeRect(ox-60,h*.42,120,10);}
    else if(s.obs==='wire'){cx.strokeStyle='rgba(255,61,95,.7)';for(let k=0;k<3;k++){cx.beginPath();
      cx.moveTo(ox-90,h*.3+k*11);cx.quadraticCurveTo(ox,h*.36+k*11,ox+90,h*.3+k*11);cx.stroke();}
      cx.fillRect(ox-92,h*.24,5,h*.5);cx.fillRect(ox+88,h*.24,5,h*.5);}
    else if(s.obs==='truck'){cx.fillRect(ox-46,h*.62,92,h*.28);cx.strokeRect(ox-46,h*.62,92,h*.28);
      cx.fillStyle='#0a1a26';cx.beginPath();cx.arc(ox-26,h*.9,8,0,7);cx.arc(ox+26,h*.9,8,0,7);cx.fill();}
    else{cx.fillRect(ox-32,h*.5,64,h*.4);cx.strokeRect(ox-32,h*.5,64,h*.4);}
    cx.strokeStyle='rgba(255,61,95,.3)';cx.setLineDash([4,5]);cx.beginPath();cx.moveTo(ox,0);cx.lineTo(ox,h);cx.stroke();cx.setLineDash([]);
    // package falling
    if(s.pkgFall){const px=w*s.pkgFall.x,py=h*s.pkgFall.y;
      cx.save();cx.translate(px,py);if(s.pkgFall.broken)cx.rotate(.6);
      cx.fillStyle=s.pkgFall.broken?'#7a2436':'#c68a3e';cx.fillRect(-9,-9,18,18);
      cx.strokeStyle='#e0a95a';cx.lineWidth=1.5;cx.beginPath();cx.moveTo(-9,0);cx.lineTo(9,0);cx.stroke();cx.restore();}
    // drone
    const dx=w*s.xD,dy=h*s.yD;
    cx.save();cx.translate(dx,dy);if(s.crash)cx.rotate(Math.sin(this.t*18)*.5);
    cx.strokeStyle='#3ad9ff';cx.lineWidth=2;
    cx.beginPath();cx.moveTo(-20,-4);cx.lineTo(20,-4);cx.stroke();
    for(const side of [-1,1]){
      cx.fillStyle='#16304a';rr(cx,side*20-7,-8,14,7,3);cx.fill();
      cx.strokeStyle='rgba(58,217,255,.65)';cx.lineWidth=1.5;
      const a=s.rot*(side>0?1:-1);
      cx.beginPath();cx.moveTo(side*20-Math.cos(a)*11,-5-Math.sin(a)*3);cx.lineTo(side*20+Math.cos(a)*11,-5+Math.sin(a)*3);cx.stroke();
    }
    cx.fillStyle=s.crash?'#7a2436':'#1d3c58';rr(cx,-14,-5,28,15,4);cx.fill();
    cx.strokeStyle=s.crash?'#ff3d5f':'#26ff9c';cx.lineWidth=1.5;rr(cx,-14,-5,28,15,4);cx.stroke();
    cx.fillStyle=s.crash?'#ff3d5f':'#26ff9c';cx.beginPath();cx.arc(9,2,2.4,0,7);cx.fill();
    if(s.pkg){cx.fillStyle='#c68a3e';cx.fillRect(-7,11,14,12);cx.strokeStyle='#e0a95a';cx.lineWidth=1;
      cx.beginPath();cx.moveTo(-7,17);cx.lineTo(7,17);cx.stroke();}
    if(s.scan>0){cx.strokeStyle=`rgba(160,107,255,${s.scan/1.4})`;cx.lineWidth=2;
      cx.beginPath();cx.arc(0,0,(1.4-s.scan)*70+10,-.9,.9);cx.stroke();}
    cx.restore();
    if(s.smoke)for(let i=0;i<5;i++){cx.globalAlpha=.3;cx.fillStyle='#8a99a8';
      cx.beginPath();cx.arc(dx-i*7,dy-Math.sin(this.t*3+i)*8,5+i*2,0,7);cx.fill();cx.globalAlpha=1;}
    if(s.shot>0){cx.globalAlpha=s.shot*.55;cx.fillStyle='#fff';cx.fillRect(0,0,w,h);cx.globalAlpha=1;}
    // HUD
    cx.fillStyle='rgba(4,9,15,.62)';rr(cx,10,10,150,52,4);cx.fill();
    this.gauge(20,24,'BATTERY',s.battery*100,100,s.battery>.3?'#26ff9c':'#ff3d5f','%');
    this.gauge(20,46,'ALTITUDE',(1-s.yD)*s.alt*1.25,s.alt*1.3,'#3ad9ff','m');
  },

  /* ---------- WORLD 4 : KITCHEN ---------- */
  drawKitchen(w,h,s){
    const g=cx.createLinearGradient(0,0,0,h);g.addColorStop(0,'#141c26');g.addColorStop(1,'#080d13');
    cx.fillStyle=g;cx.fillRect(0,0,w,h);
    // tiled wall
    cx.strokeStyle='rgba(58,217,255,.07)';cx.lineWidth=1;
    for(let x=0;x<w;x+=34){cx.beginPath();cx.moveTo(x,0);cx.lineTo(x,h*.62);cx.stroke();}
    for(let y=0;y<h*.62;y+=26){cx.beginPath();cx.moveTo(0,y);cx.lineTo(w,y);cx.stroke();}
    // counter
    const cy0=h*.62;
    cx.fillStyle='#1b2a38';cx.fillRect(0,cy0,w,h-cy0);
    cx.fillStyle='#26394b';cx.fillRect(0,cy0,w,5);
    const active=s.mode;
    // ---- STOVE + PAN (left) ----
    const sx=w*.28;
    cx.globalAlpha=active==='pan'?1:.35;
    cx.fillStyle='#0e1720';rr(cx,sx-52,cy0-10,104,14,4);cx.fill();
    if(s.heatD>.05){
      for(let i=0;i<7;i++){const fh=(14+s.heatD*(s.fire?46:24))*(.6+Math.random()*.5);
        cx.fillStyle=s.fire?`rgba(255,${90+Math.random()*80|0},40,.75)`:`rgba(255,${140+Math.random()*70|0},40,.6)`;
        cx.beginPath();cx.moveTo(sx-30+i*10,cy0-10);
        cx.quadraticCurveTo(sx-26+i*10,cy0-10-fh*.6,sx-25+i*10,cy0-10-fh);
        cx.quadraticCurveTo(sx-22+i*10,cy0-10-fh*.5,sx-20+i*10,cy0-10);cx.fill();}
    }
    // pan
    cx.fillStyle=s.burnt?'#2a1512':'#141f2a';
    cx.beginPath();cx.ellipse(sx,cy0-24,54,17,0,0,7);cx.fill();
    cx.strokeStyle=s.burnt?'#ff6a3d':'#3f5f7c';cx.lineWidth=2;cx.stroke();
    cx.strokeStyle='#3f5f7c';cx.beginPath();cx.moveTo(sx+54,cy0-24);cx.lineTo(sx+92,cy0-32);cx.stroke();
    if(s.oil){cx.fillStyle='rgba(255,200,90,.28)';cx.beginPath();cx.ellipse(sx,cy0-22,44,12,0,0,7);cx.fill();}
    s.items.forEach((it,i)=>{cx.fillStyle=s.burnt?'#4a3020':it.c;
      cx.beginPath();cx.ellipse(sx+it.x*70+Math.sin(this.t*3+i)*(s.stir?3:0),cy0-22+it.y*16,6,4,0,0,7);cx.fill();});
    cx.globalAlpha=1;
    // ---- OVEN (center) ----
    const ox=w*.55;
    cx.globalAlpha=active==='oven'?1:.3;
    cx.fillStyle='#101c26';rr(cx,ox-52,cy0+8,104,h-cy0-16,5);cx.fill();
    cx.strokeStyle=s.oven?'#ffb627':'#2a4560';cx.lineWidth=2;rr(cx,ox-52,cy0+8,104,h-cy0-16,5);cx.stroke();
    cx.fillStyle=s.oven?'rgba(255,150,40,.28)':'rgba(10,20,30,.9)';rr(cx,ox-40,cy0+18,80,Math.max(14,h-cy0-40),4);cx.fill();
    if(s.dough>0||s.baked){const bw=26+s.dough*22;
      cx.fillStyle=s.burnt?'#2a1a14':(s.baked?'#c68a3e':'#d8c9a0');
      cx.beginPath();cx.ellipse(ox,cy0+18+Math.max(14,h-cy0-40)/2,bw,10+s.dough*6,0,0,7);cx.fill();}
    cx.fillStyle='#6d8ba3';cx.font='8px monospace';cx.textAlign='center';
    cx.fillText(Math.round(s.ovenTD)+'°C',ox,cy0+2);cx.textAlign='left';
    cx.globalAlpha=1;
    // ---- ESPRESSO (right) ----
    const ex=w*.8;
    cx.globalAlpha=active==='coffee'?1:.3;
    cx.fillStyle='#16232f';rr(cx,ex-40,cy0-78,80,68,5);cx.fill();
    cx.strokeStyle=s.locked?'#26ff9c':'#2a4560';cx.lineWidth=2;rr(cx,ex-40,cy0-78,80,68,5);cx.stroke();
    cx.fillStyle=s.grind?'#8a5a2a':'#22384a';rr(cx,ex-12,cy0-16,24,8,2);cx.fill();
    if(s.extract){cx.strokeStyle='rgba(180,110,50,.85)';cx.lineWidth=2;
      cx.beginPath();cx.moveTo(ex-4,cy0-10);cx.lineTo(ex-4,cy0+2);cx.moveTo(ex+4,cy0-10);cx.lineTo(ex+4,cy0+2);cx.stroke();}
    // cup
    cx.fillStyle='#e8eef4';rr(cx,ex-17,cy0+2,34,26,4);cx.fill();
    if(s.cup>0){cx.fillStyle=s.foam&&s.cup>.9?'#e2c9a0':'#5a3418';
      rr(cx,ex-14,cy0+26-22*s.cup,28,22*s.cup,3);cx.fill();}
    if(s.foam&&s.cup>.9){cx.strokeStyle='#fff';cx.lineWidth=1.5;
      cx.beginPath();cx.arc(ex,cy0+12,6,0,7);cx.stroke();}
    cx.globalAlpha=1;
    // plate
    if(s.plated){cx.fillStyle='#e8eef4';cx.beginPath();cx.ellipse(w*.5,h-22,42,12,0,0,7);cx.fill();
      cx.fillStyle=s.burnt?'#3a2318':'#7db85a';cx.beginPath();cx.ellipse(w*.5,h-24,26,8,0,0,7);cx.fill();}
    // HUD
    cx.fillStyle='rgba(4,9,15,.62)';rr(cx,10,10,150,52,4);cx.fill();
    this.gauge(20,24,'HEAT LEVEL',s.heatD*100,100,s.fire?'#ff3d5f':'#ffb627','%');
    this.gauge(20,46,'DISH QUALITY',s.burnt?12:(s.plated?100:60+s.items.length*6),100,s.burnt?'#ff3d5f':'#26ff9c','%');
  },

  /* ---------- WORLD 5 : ROUTE ---------- */
  drawRoute(w,h,s){
    cx.fillStyle='#070d14';cx.fillRect(0,0,w,h);
    const pad=22,cs=Math.min((w-pad*2)/s.cols,(h-pad*2-14)/s.rows);
    const ox=(w-cs*s.cols)/2,oy=(h-cs*s.rows)/2+6;
    const CX=(gx)=>ox+gx*cs+cs/2, CY=(gy)=>oy+gy*cs+cs/2;
    // grid
    cx.strokeStyle='rgba(30,51,70,.8)';cx.lineWidth=1;
    for(let i=0;i<=s.cols;i++){cx.beginPath();cx.moveTo(ox+i*cs,oy);cx.lineTo(ox+i*cs,oy+cs*s.rows);cx.stroke();}
    for(let j=0;j<=s.rows;j++){cx.beginPath();cx.moveTo(ox,oy+j*cs);cx.lineTo(ox+cs*s.cols,oy+j*cs);cx.stroke();}
    // buildings / obstacles
    s.obst.forEach(([bx,by,t])=>{
      const x=ox+bx*cs+cs*.16,y=oy+by*cs+cs*.16,sz=cs*.68;
      if(t===0){cx.fillStyle='#16242f';rr(cx,x,y,sz,sz,3);cx.fill();
        cx.fillStyle='rgba(58,217,255,.16)';for(let k=0;k<4;k++)cx.fillRect(x+4,y+4+k*(sz/4.6),sz-8,2.5);}
      else if(t===1){cx.fillStyle='#1a3324';cx.beginPath();cx.arc(x+sz/2,y+sz/2,sz*.34,0,7);cx.fill();
        cx.fillStyle='#2a4a33';cx.fillRect(x+sz/2-2,y+sz/2,4,sz*.3);}
      else{cx.fillStyle='#3a2a10';cx.beginPath();cx.moveTo(x+sz/2,y+6);cx.lineTo(x+sz-6,y+sz-6);cx.lineTo(x+6,y+sz-6);cx.closePath();cx.fill();
        cx.strokeStyle='#ffb627';cx.lineWidth=1.5;cx.stroke();}
    });
    // road path
    cx.strokeStyle=s.crash?'rgba(255,61,95,.55)':'rgba(38,255,156,.55)';
    cx.lineWidth=cs*.6;cx.lineJoin='round';cx.lineCap='round';
    cx.beginPath();s.cells.forEach((c,i)=>{i?cx.lineTo(CX(c[0]),CY(c[1])):cx.moveTo(CX(c[0]),CY(c[1]));});
    cx.globalAlpha=.16;cx.stroke();cx.globalAlpha=1;
    cx.strokeStyle=s.crash?'rgba(255,61,95,.8)':'rgba(38,255,156,.75)';
    cx.lineWidth=2;cx.setLineDash([7,7]);cx.lineDashOffset=-this.t*14;cx.stroke();cx.setLineDash([]);cx.lineDashOffset=0;
    // start & goal
    const st=s.cells[0],gl=s.cells[s.cells.length-1];
    cx.fillStyle='rgba(58,217,255,.2)';rr(cx,ox+st[0]*cs+3,oy+st[1]*cs+3,cs-6,cs-6,4);cx.fill();
    cx.fillStyle='#3ad9ff';cx.font='9px monospace';cx.textAlign='center';cx.fillText('START',CX(st[0]),CY(st[1])+cs*.36);
    const gp=Math.sin(this.t*3)*.5+.5;
    cx.fillStyle=`rgba(38,255,156,${.16+gp*.18})`;rr(cx,ox+gl[0]*cs+3,oy+gl[1]*cs+3,cs-6,cs-6,4);cx.fill();
    cx.strokeStyle='#26ff9c';cx.lineWidth=1.5;rr(cx,ox+gl[0]*cs+3,oy+gl[1]*cs+3,cs-6,cs-6,4);cx.stroke();
    cx.font='16px sans-serif';cx.fillText('🏁',CX(gl[0]),CY(gl[1])+6);
    cx.font='9px monospace';cx.fillStyle='#26ff9c';cx.fillText('GOAL',CX(gl[0]),CY(gl[1])+cs*.36);cx.textAlign='left';
    // traffic light
    if(s.lightIdx>=0&&s.cells[s.lightIdx]){const lc=s.cells[s.lightIdx];
      cx.fillStyle='#0e1720';rr(cx,CX(lc[0])+cs*.22,CY(lc[1])-cs*.4,10,24,3);cx.fill();
      cx.fillStyle=s.light?'#26ff9c':'#ff3d5f';cx.beginPath();cx.arc(CX(lc[0])+cs*.22+5,CY(lc[1])-cs*.4+(s.light?17:7),3.6,0,7);cx.fill();}
    // car
    const px=CX(s.gxD),py=CY(s.gyD);
    cx.save();cx.translate(px,py);cx.rotate(s.angD);
    const L=cs*.5,W=cs*.3;
    cx.fillStyle=s.crash?'#7a2436':'#1d4e7a';rr(cx,-L/2,-W/2,L,W,4);cx.fill();
    cx.strokeStyle=s.crash?'#ff3d5f':'#3ad9ff';cx.lineWidth=1.6;rr(cx,-L/2,-W/2,L,W,4);cx.stroke();
    cx.fillStyle='rgba(58,217,255,.5)';rr(cx,-L*.1,-W/2+2,L*.32,W-4,2);cx.fill();
    cx.fillStyle=s.arrived?'#26ff9c':'#ffe9a0';
    cx.beginPath();cx.arc(L/2-2,-W/2+3,2,0,7);cx.arc(L/2-2,W/2-3,2,0,7);cx.fill();
    if(s.engine&&!s.crash){cx.globalAlpha=.25;cx.fillStyle='#ffe9a0';
      cx.beginPath();cx.moveTo(L/2,-W/2+2);cx.lineTo(L/2+cs*.5,-W*.7);cx.lineTo(L/2+cs*.5,W*.7);cx.lineTo(L/2,W/2-2);cx.fill();cx.globalAlpha=1;}
    cx.restore();
    if(s.smoke)for(let i=0;i<5;i++){cx.globalAlpha=.28;cx.fillStyle='#8a99a8';
      cx.beginPath();cx.arc(px-i*6,py-Math.sin(this.t*3+i)*9,5+i*2,0,7);cx.fill();cx.globalAlpha=1;}
    if(s.scan>0){cx.strokeStyle=`rgba(160,107,255,${s.scan/1.5})`;cx.lineWidth=2;
      cx.beginPath();cx.arc(px,py,(1.5-s.scan)*120+10,0,7);cx.stroke();}
    // HUD
    cx.fillStyle='rgba(4,9,15,.66)';rr(cx,10,8,164,34,4);cx.fill();
    cx.font='9px monospace';cx.fillStyle='#6d8ba3';cx.fillText('ROUTE STATUS',20,21);
    cx.font='600 11px monospace';cx.fillStyle=s.crash?'#ff3d5f':(s.arrived?'#26ff9c':'#ffb627');
    cx.fillText(s.crash?'CRASHED — รถชน':(s.arrived?'ARRIVED — ถึงที่หมาย':`ช่องที่ ${s.i+1}/${s.cells.length}`),20,34);
  },

  /* ---------- WORLD 3 ---------- */
  drawCyber(w,h,s){
    cx.fillStyle='#050c14';cx.fillRect(0,0,w,h);
    // code rain
    cx.font='10px monospace';
    s.rain.forEach((d,i)=>{cx.fillStyle=`rgba(38,255,156,${.05+ (i%3)*.03})`;
      for(let k=0;k<6;k++)cx.fillText((i+k)%2?'1':'0',d.x*w,(d.y*h+k*13)%h);});
    // endpoints
    const uy=h*.5,ux=w*.12,sx=w*.88;
    const node=(x,y,lab,col,on)=>{
      cx.strokeStyle=on?col:'#24384c';cx.lineWidth=2;cx.fillStyle='rgba(8,18,28,.9)';
      rr(cx,x-26,y-24,52,48,5);cx.fill();cx.stroke();
      cx.fillStyle=on?col:'#3f5f7c';cx.font='18px sans-serif';cx.textAlign='center';cx.fillText(lab,x,y+6);
      cx.textAlign='left';};
    // link
    cx.strokeStyle='rgba(58,217,255,.2)';cx.lineWidth=1;cx.setLineDash([5,6]);
    cx.beginPath();cx.moveTo(ux+26,uy);cx.lineTo(sx-26,uy);cx.stroke();cx.setLineDash([]);
    // shields
    const cxm=(ux+sx)/2;
    const labs=['AUTH','VERIFY','SESSION'];
    for(let i=0;i<3;i++){
      const rad=34+i*24,on=s.shields[i];
      cx.strokeStyle=s.breach?'rgba(255,61,95,.75)':(on?'rgba(38,255,156,.8)':'rgba(45,73,99,.7)');
      cx.lineWidth=on?2.5:1.2;
      cx.beginPath();cx.arc(cxm,uy,rad,-Math.PI*.8,Math.PI*.8);cx.stroke();
      if(on&&!s.breach){cx.globalAlpha=.12;cx.beginPath();cx.arc(cxm,uy,rad,-Math.PI*.8,Math.PI*.8);
        cx.lineWidth=9;cx.stroke();cx.globalAlpha=1;}
      cx.font='8px monospace';cx.fillStyle=on?'#26ff9c':'#3f5f7c';cx.textAlign='center';
      cx.fillText(labs[i],cxm,uy-rad-6);cx.textAlign='left';
    }
    // center lock
    cx.font='26px sans-serif';cx.textAlign='center';
    cx.fillStyle=s.breach?'#ff3d5f':(s.lock||s.granted?'#26ff9c':'#3f5f7c');
    cx.fillText(s.breach?'💀':(s.lock||s.granted?'🔓':'🔒'),cxm,uy+10);cx.textAlign='left';
    node(ux,uy,'👤','#a06bff',s.stage>=1);
    node(sx,uy,'🗄','#3ad9ff',s.stage>=2);
    // packets
    s.packets.forEach(p=>{const x=lerp(ux+26,sx-26,p.p);
      cx.fillStyle=p.c;cx.fillRect(x-4,uy-2,9,4);
      cx.globalAlpha=.3;cx.fillRect(x-14,uy-1,10,2);cx.globalAlpha=1;});
    // OTP display
    if(s.otp&&s.otpT>0){
      cx.globalAlpha=Math.min(1,s.otpT*1.6);
      cx.fillStyle='rgba(4,9,15,.9)';rr(cx,cxm-72,uy+62,144,34,5);cx.fill();
      cx.strokeStyle='#ffb627';cx.lineWidth=1;rr(cx,cxm-72,uy+62,144,34,5);cx.stroke();
      cx.fillStyle='#ffb627';cx.font='600 17px "SFMono-Regular",monospace';cx.textAlign='center';
      cx.fillText(s.otp,cxm,uy+85);cx.font='8px monospace';cx.fillStyle='#6d8ba3';
      cx.fillText('ONE-TIME PASSCODE',cxm,uy+72);cx.textAlign='left';cx.globalAlpha=1;
    }
    // glitch bars
    if(s.glitch>0){for(let i=0;i<7;i++){const y=Math.random()*h;cx.globalAlpha=s.glitch*.45;
      cx.fillStyle=Math.random()>.5?'#ff3d5f':'#3ad9ff';cx.fillRect(0,y,w,1+Math.random()*4);}cx.globalAlpha=1;}
    // status strip
    cx.fillStyle='rgba(4,9,15,.62)';rr(cx,10,10,168,32,4);cx.fill();
    cx.font='9px monospace';cx.fillStyle='#6d8ba3';cx.fillText('THREAT STATUS',20,24);
    cx.font='600 11px monospace';cx.fillStyle=s.breach?'#ff3d5f':(s.lock?'#26ff9c':'#ffb627');
    cx.fillText(s.breach?'BREACHED — ระบบถูกเจาะ':(s.lock?'SECURED — ปลอดภัย':'IN PROGRESS…'),20,37);
  }
};

/* ==================================================================
   4. GAME STATE
   ================================================================== */
const G={
  world:0,diffSel:4,diff:1,seedBase:0,mIdx:0,
  mission:null,slots:[],locked:0,running:false,abort:false,history:[],paused:false,stepTimer:null,
  score:0,combo:0,integrity:100,timeLeft:0,timer:null,
  hintsLeft:0,errThisMission:0,hintUsed:false,cleared:0,totalSteps:0,totalErr:0,
  started:false
};
const blockEls=new Map();

function toast(msg){const t=$('#toast');t.textContent=msg;t.classList.add('on');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('on'),2300);}
function pop(txt,x,y,col){const e=document.createElement('div');e.className='pop';e.textContent=txt;
  e.style.left=x+'px';e.style.top=y+'px';if(col)e.style.color=col;document.body.appendChild(e);setTimeout(()=>e.remove(),1000);}

function makeBlockEl(b){
  const e=document.createElement('div');
  e.className='block';e.dataset.key=b.key;e.dataset.kind=b.kind;
  const d=b.data.d||FXDESC[b.fx]||KINDLAB[b.kind]||'';
  e.innerHTML=`<span class="ic">${b.icon}</span><span class="tx">${b.label}<small>${d}</small></span>`;
  return e;
}

function renderMission(){
  const m=G.mission;
  $('#bTag').textContent='W'+m.world;
  $('#bTitle').textContent=m.title;
  $('#bStory').textContent=m.story;
  $('#bGoals').innerHTML=m.goals.map((g,i)=>`<li><b>${String(i+1).padStart(2,'0')}</b><span>${g}</span></li>`).join('');
  $('#bRule').textContent=m.rule||'';
  const nDec=m.blocks.length-m.solution.length;
  $('#bMeta').innerHTML=`<span>อัลกอริทึม ${m.solution.length} ขั้น</span>`+
    `<span class="hot">คลัง ${m.blocks.length} บล็อก · มีบล็อกลวง ${nDec} ใบ</span>`+
    `<span>ระดับ ${DIFF[m.diff].name}</span>`;
  $('#hMid').textContent=m.id;
  $('#hWorld').textContent=WORLD_NAME[m.world];
  $('#hDiff').textContent=DIFF[m.diff].tag;
  $('#simTag').textContent='STANDBY';

  const rail=$('#rail');rail.innerHTML='';
  G.slots=new Array(m.solution.length).fill(null);
  m.solution.forEach((_,i)=>{
    const row=document.createElement('div');row.className='slotrow';
    row.innerHTML=`<div class="snum">${String(i+1).padStart(2,'0')}</div><div class="slot" data-i="${i}"></div>`;
    rail.appendChild(row);
    if(i<m.solution.length-1){const l=document.createElement('div');l.className='link';rail.appendChild(l);}
  });

  const pal=$('#palette');pal.innerHTML='';blockEls.clear();
  m.blocks.forEach(b=>{const e=makeBlockEl(b);blockEls.set(b.key,e);pal.appendChild(e);});

  G.locked=0;G.errThisMission=0;G.hintUsed=false;G.hintsLeft=m.hints;G.history=[];
  $('#btnHint').textContent=`💡 HINT (${G.hintsLeft})`;
  $('#btnHint').disabled=G.hintsLeft<=0;
  updateFlowTag();
  Sim.init(m.world,m.sim);
}
function updateFlowTag(){const f=G.slots.filter(Boolean).length;$('#flowTag').textContent=`${f} / ${G.slots.length}`;}

function updateHUD(){
  $('#hScore').textContent=G.score.toLocaleString();
  $('#hCombo').textContent='x'+(1+Math.min(G.combo,12)*.15).toFixed(1);
  $('#hInt').textContent=Math.round(G.integrity)+'%';
  const bar=$('#hBar');bar.firstElementChild.style.width=clamp(G.integrity,0,100)+'%';
  bar.classList.toggle('low',G.integrity<45);
}
function fmtTime(s){const m=Math.floor(s/60);return m+':'+String(Math.floor(s%60)).padStart(2,'0');}

/* ---------- mission lifecycle ---------- */
function nextDifficulty(){
  if(G.diffSel<4)return G.diffSel;
  return clamp(Math.floor(G.cleared/2),0,3); // ADAPTIVE
}
function newMission(){
  if(G.stepTimer){clearTimeout(G.stepTimer);G.stepTimer=null;}
  G.running=false;G.abort=false;
  G.mIdx++;
  G.diff=nextDifficulty();
  const world=G.world===0?(new RNG(G.seedBase+G.mIdx*7919)).int(1,5):G.world;
  const seed=(G.seedBase^ (G.mIdx*2654435761))>>>0;
  G.mission=buildMission(world,G.diff,seed);
  renderMission();
  G.timeLeft=G.mission.timeLimit;
  startTimer();
  updateHUD();
  SFX.tone(300,.3,'sine',.09,2.2);
}
function startTimer(){
  clearInterval(G.timer);
  G.timer=setInterval(()=>{
    if(G.paused)return;
    G.timeLeft--;
    $('#hTime').textContent=fmtTime(Math.max(0,G.timeLeft));
    if(G.timeLeft===10)SFX.tone(880,.2,'square',.09);
    if(G.timeLeft<=0){clearInterval(G.timer);timeUp();}
  },1000);
  $('#hTime').textContent=fmtTime(G.timeLeft);
}
function timeUp(){
  if(G.running)return;
  G.integrity-=30;G.combo=0;updateHUD();
  Sim.bad('timeout');Sim.float('หมดเวลา! ระบบถูกตัดการเชื่อมต่อ ⏱','#ff3d5f');
  SFX.err();
  if(G.integrity<=0){gameOver();return;}
  toast('หมดเวลา — สร้างภารกิจใหม่ (โจทย์จะไม่ซ้ำเดิม)');
  setTimeout(()=>{Sim.recover();newMission();},1400);
}

/* ---------- run engine ---------- */
/* เครื่องรันโปรแกรมแบบขั้นต่อขั้น
   ใช้ setTimeout ต่อกันเป็นทอด ๆ แทนลูปที่มี await ค้างอยู่ข้างใน
   เพราะลูปที่ค้างนานเกิน 400ms จะถูกตัวเฝ้าระวังของเบราว์เซอร์บางตัวมองว่าเป็น infinite loop */
function runProgram(){
  if(G.running||!G.mission)return;
  if(G.slots.some(s=>!s)){toast('เติมบล็อกให้ครบทุกช่องก่อนกด RUN');SFX.err();return;}
  G.running=true;G.abort=false;setCtl(false);SFX.run();$('#simTag').textContent='EXECUTING';
  Sim.recover();
  execStep(G.locked);
}
function stopRun(tag){
  if(G.stepTimer){clearTimeout(G.stepTimer);G.stepTimer=null;}
  G.running=false;G.abort=false;setCtl(true);
  if(tag)$('#simTag').textContent=tag;
}
function execStep(i){
  if(!G.running||!G.mission)return;
  const sol=G.mission.solution;
  if(i>=sol.length){stopRun();missionClear();return;}
  const slot=document.querySelector(`.slot[data-i="${i}"]`);
  if(!slot){stopRun();return;}
  slot.classList.add('exec');
  try{slot.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(e){}
  G.stepTimer=setTimeout(()=>{
    G.stepTimer=null;
    if(!G.running)return;
    if(G.abort){
      slot.classList.remove('exec');stopRun('CANCELLED');SFX.click();
      toast('ยกเลิกการรันแล้ว — ขั้นที่ล็อกไว้ยังอยู่ครบ กด RUN เมื่อพร้อม');return;
    }
    const key=G.slots[i],blk=key?G.mission.map[key]:null;
    if(blk&&blk.label===sol[i].label){
      slot.classList.remove('exec');slot.classList.add('ok');
      const el=blockEls.get(key);if(el)el.classList.add('locked');
      Sim.good(blk.fx,blk.data);SFX.chime(i);
      G.combo++;G.totalSteps++;
      const mult=(1+Math.min(G.combo,12)*.15)*DIFF[G.mission.diff].mult;
      const gain=Math.round(100*mult);
      G.score+=gain;
      const r=slot.getBoundingClientRect();pop('+'+gain,r.right-46,r.top+8);
      G.locked=i+1;updateHUD();
      G.stepTimer=setTimeout(()=>{G.stepTimer=null;execStep(i+1);},blk.fx==='wait'?1050:720);
    }else{
      slot.classList.remove('exec');slot.classList.add('bad');
      const el=key?blockEls.get(key):null;if(el)el.classList.add('wrong');
      Sim.bad(blk?blk.fx:'');SFX.err();
      G.combo=0;G.errThisMission++;G.totalErr++;
      G.integrity-=[9,11,13,16][G.mission.diff];
      G.stepTimer=setTimeout(()=>{
        G.stepTimer=null;
        // รีเซ็ตบล็อกคำตอบที่ยังไม่ถูกล็อกทั้งหมดกลับคืนสู่คลัง
        G.slots.forEach((k, idx)=>{
          if(k && idx >= G.locked){
            const blockEl = blockEls.get(k);
            if(blockEl){
              blockEl.classList.remove('wrong', 'locked');
              $('#palette').appendChild(blockEl);
            }
            G.slots[idx] = null;
            const sEl = document.querySelector(`.slot[data-i="${idx}"]`);
            if(sEl) sEl.classList.remove('bad', 'exec');
          }
        });
        G.history = [];
        updateFlowTag();stopRun('ERROR');
        if(G.integrity<=0){gameOver();return;}
        toast('ลำดับผิดพลาด! เคลียร์คำตอบกลับคลัง — ลองเรียงใหม่อีกครั้ง');
        setTimeout(()=>Sim.recover(),900);
      },1500);
    }
  },380);
}
function setCtl(on){
  const run=$('#btnRun');
  run.disabled=false;
  run.textContent=on?'▶ RUN':'■ ยกเลิกการรัน';
  run.classList.toggle('cancel',!on);
  $('#btnReset').disabled=!on;$('#btnUndo').disabled=!on;
  $('#btnHint').disabled=!on||G.hintsLeft<=0;
}
function undoLast(){
  if(G.running||!G.mission)return;
  while(G.history.length){
    const last=G.history.pop();
    if(last.i<G.locked)continue;                 // ล็อกแล้ว ย้อนไม่ได้
    if(G.slots[last.i]!==last.key)continue;      // ถูกแทนที่ไปแล้ว
    $('#palette').appendChild(blockEls.get(last.key));
    G.slots[last.i]=null;
    if(last.prev&&G.slots.indexOf(last.prev)<0){
      document.querySelector(`.slot[data-i="${last.i}"]`).appendChild(blockEls.get(last.prev));
      G.slots[last.i]=last.prev;
    }
    updateFlowTag();SFX.drop();toast('ยกเลิกการวางบล็อกช่องที่ '+(last.i+1)+' แล้ว');
    return;
  }
  toast('ไม่มีบล็อกที่ย้อนกลับได้ (บล็อกที่ล็อกแล้วแก้ไม่ได้)');
}

function missionClear(){
  clearInterval(G.timer);
  G.running=false;setCtl(true);G.cleared++;
  $('#simTag').textContent='COMPLETE';
  SFX.win();
  const d=DIFF[G.mission.diff];
  const timeB=Math.round(Math.max(0,G.timeLeft)*4*d.mult);
  const perfect=(G.errThisMission===0&&!G.hintUsed)?Math.round(400*d.mult):0;
  const base=Math.round(300*d.mult);
  G.score+=timeB+perfect+base;
  G.integrity=Math.min(100,G.integrity+8);
  updateHUD();
  $('#clearSub').textContent=`${G.mission.id} · ${WORLD_NAME[G.mission.world]} · ${d.tag}`;
  $('#clearLines').innerHTML=`
   <div class="scoreline"><span>โบนัสภารกิจสำเร็จ</span><b>+${base.toLocaleString()}</b></div>
   <div class="scoreline"><span>โบนัสเวลาที่เหลือ (${fmtTime(Math.max(0,G.timeLeft))})</span><b>+${timeB.toLocaleString()}</b></div>
   <div class="scoreline"><span>PERFECT RUN — ไม่ผิดและไม่ใช้คำใบ้</span><b>${perfect?'+'+perfect.toLocaleString():'—'}</b></div>
   <div class="scoreline"><span>ซ่อมแซมระบบ</span><b>+8% INTEGRITY</b></div>
   <div class="scoreline tot"><span>คะแนนรวม</span><b>${G.score.toLocaleString()}</b></div>`;
  $('#ovClear').classList.add('on');
}
function rankOf(sc){
  if(sc>=14000)return'CYBER ARCHITECT · สถาปนิกระบบ';
  if(sc>=9000)return'SENIOR ENGINEER · วิศวกรอาวุโส';
  if(sc>=5000)return'SYSTEM ENGINEER · วิศวกรระบบ';
  if(sc>=2500)return'JUNIOR DEVELOPER · นักพัฒนารุ่นเล็ก';
  return'INTERN · เด็กฝึกงาน';
}
function gameOver(){
  clearInterval(G.timer);G.running=false;G.started=false;SFX.lose();
  const acc=G.totalSteps+G.totalErr?Math.round(G.totalSteps/(G.totalSteps+G.totalErr)*100):0;
  $('#overLines').innerHTML=`
   <div class="scoreline"><span>ภารกิจสำเร็จ</span><b>${G.cleared} ภารกิจ</b></div>
   <div class="scoreline"><span>คำสั่งที่วางถูกต้อง</span><b>${G.totalSteps} บล็อก</b></div>
   <div class="scoreline"><span>ความแม่นยำ</span><b>${acc}%</b></div>
   <div class="scoreline"><span>SEED ของรอบนี้</span><b>${b36(G.seedBase,6)}</b></div>
   <div class="scoreline tot"><span>คะแนนรวม</span><b>${G.score.toLocaleString()}</b></div>`;
  $('#overRank').textContent=rankOf(G.score);
  $('#ovOver').classList.add('on');
}

/* ---------- pause / exit ---------- */
function pauseGame(){
  if(!G.started||G.paused)return;
  if(G.running){G.abort=true;$('#btnRun').textContent='กำลังยกเลิก…';}
  G.paused=true;
  const m=G.mission;
  $('#pauseSub').textContent=m?`${m.id} · ${WORLD_NAME[m.world]} · คะแนนสะสม ${G.score.toLocaleString()}`:'—';
  $('#ovPause').classList.add('on');
  SFX.tone(420,.18,'sine',.09,.7);
}
function resumeGame(){
  G.paused=false;$('#ovPause').classList.remove('on');SFX.click();
}
function backToMenu(){
  G.paused=false;G.started=false;G.running=false;G.abort=false;
  clearInterval(G.timer);
  if(G.stepTimer){clearTimeout(G.stepTimer);G.stepTimer=null;}
  $('#ovPause').classList.remove('on');$('#ovClear').classList.remove('on');$('#ovOver').classList.remove('on');
  $('#ovMenu').classList.add('on');
  $('#hTime').textContent='—';$('#simTag').textContent='STANDBY';
  SFX.click();
}

/* ---------- hint ---------- */
function useHint(){
  if(!G.mission||G.hintsLeft<=0||G.running)return;
  const idx=G.slots.findIndex((s,i)=>i>=G.locked&&(!s||s!==G.mission.solution[i].key));
  const i=idx<0?G.locked:idx;
  if(i>=G.mission.solution.length)return;
  const key=G.mission.solution[i].key,el=blockEls.get(key);
  G.hintsLeft--;G.hintUsed=true;G.score=Math.max(0,G.score-150);updateHUD();
  $('#btnHint').textContent=`💡 HINT (${G.hintsLeft})`;$('#btnHint').disabled=G.hintsLeft<=0;
  el.classList.add('hint');el.scrollIntoView({block:'nearest',behavior:'smooth'});
  const slot=document.querySelector(`.slot[data-i="${i}"]`);slot.classList.add('hot');
  SFX.tone(760,.25,'sine',.1);
  toast(`คำใบ้: ขั้นที่ ${i+1} ต้องใช้บล็อกนี้ (-150 คะแนน)`);
  setTimeout(()=>{el.classList.remove('hint');slot.classList.remove('hot');},2600);
}

/* ==================================================================
   5. INPUT — unified pointer (mouse / touch / hand)
   ================================================================== */
const ghost=$('#ghost');
let drag=null,pickKey=null;

function elAt(x,y){return document.elementFromPoint(x,y);}
function beginDrag(el,x,y){
  if(G.running||el.classList.contains('locked'))return;
  const key=el.dataset.key;
  drag={key,el,fromSlot:el.parentElement.classList.contains('slot')?+el.parentElement.dataset.i:-1};
  if(drag.fromSlot>=0){G.slots[drag.fromSlot]=null;updateFlowTag();}
  el.classList.add('dragging');
  ghost.innerHTML='';ghost.appendChild(makeBlockEl(G.mission.map[key]));
  ghost.style.display='block';moveGhost(x,y);
  SFX.grab();
}
function moveGhost(x,y){ghost.style.left=x+'px';ghost.style.top=y+'px';
  document.querySelectorAll('.slot.hot').forEach(s=>s.classList.remove('hot'));
  $('#palette').classList.remove('hot');
  const t=elAt(x,y);if(!t)return;
  const sl=t.closest('.slot');if(sl&&!sl.classList.contains('ok'))sl.classList.add('hot');
  else if(t.closest('#palette'))$('#palette').classList.add('hot');
}
function endDrag(x,y){
  if(!drag)return;
  ghost.style.display='none';
  document.querySelectorAll('.slot.hot').forEach(s=>s.classList.remove('hot'));
  $('#palette').classList.remove('hot');
  drag.el.classList.remove('dragging');
  const t=elAt(x,y),sl=t&&t.closest('.slot');
  if(sl&&!sl.classList.contains('ok')){placeIn(+sl.dataset.i,drag.key);}
  else{$('#palette').appendChild(drag.el);SFX.drop();}
  updateFlowTag();drag=null;
}
function placeIn(i,key){
  const prev=G.slots[i]||null;
  G.history.push({i,key,prev});
  if(G.slots[i]){const old=blockEls.get(G.slots[i]);$('#palette').appendChild(old);}
  const slot=document.querySelector(`.slot[data-i="${i}"]`);
  slot.appendChild(blockEls.get(key));G.slots[i]=key;SFX.drop();
}
function tapSelect(el){
  const key=el.dataset.key;
  if(pickKey===key){pickKey=null;el.style.outline='';return;}
  document.querySelectorAll('.block').forEach(b=>b.style.outline='');
  pickKey=key;el.style.outline='2px solid var(--cyan)';SFX.click();
}
function tapSlot(i){
  if(pickKey==null)return;
  const el=blockEls.get(pickKey);
  if(el.parentElement.classList.contains('slot')){G.slots[+el.parentElement.dataset.i]=null;}
  placeIn(i,pickKey);
  document.querySelectorAll('.block').forEach(b=>b.style.outline='');
  pickKey=null;updateFlowTag();
}

/* pointer routing */
let downPos=null,moved=false;
function onDown(x,y,fromHand){
  if(!G.started)return;
  const t=elAt(x,y);if(!t)return;
  if(fromHand){const b=t.closest('button');if(b&&!b.disabled){b.click();SFX.click();return;}}
  const blk=t.closest('.block');
  if(blk&&!blk.classList.contains('locked')&&!G.running){downPos={x,y,el:blk};moved=false;return;}
  const sl=t.closest('.slot');
  if(sl&&pickKey!=null){tapSlot(+sl.dataset.i);}
}
function onMove(x,y){
  if(drag){moveGhost(x,y);return;}
  if(downPos&&(Math.abs(x-downPos.x)>7||Math.abs(y-downPos.y)>7)){moved=true;beginDrag(downPos.el,x,y);}
}
function onUp(x,y){
  if(drag){endDrag(x,y);downPos=null;return;}
  if(downPos&&!moved)tapSelect(downPos.el);
  downPos=null;
}
addEventListener('mousedown',e=>{SFX.init();onDown(e.clientX,e.clientY,false);});
addEventListener('mousemove',e=>onMove(e.clientX,e.clientY));
addEventListener('mouseup',e=>onUp(e.clientX,e.clientY));
addEventListener('touchstart',e=>{SFX.init();const t=e.touches[0];onDown(t.clientX,t.clientY,false);},{passive:true});
addEventListener('touchmove',e=>{const t=e.touches[0];onMove(t.clientX,t.clientY);if(drag)e.preventDefault();},{passive:false});
addEventListener('touchend',e=>{const t=e.changedTouches[0];onUp(t.clientX,t.clientY);});

/* ==================================================================
   6. HAND TRACKING (MediaPipe Hands, graceful fallback)
   ================================================================== */
let camDim=2;const CAMOPS=[.1,.15,.22,.34,.5];
function camLayers(on){
  ['#cam','#camCv','#camHud'].forEach(s=>$(s).classList.toggle('on',on));
  $('#handCursor').classList.toggle('on',on);
  if(on)fitCamCanvas();
}
function fitCamCanvas(){
  const c=$('#camCv'),dpr=Math.min(devicePixelRatio||1,2);
  c.width=innerWidth*dpr;c.height=innerHeight*dpr;
  c.style.width=innerWidth+'px';c.style.height=innerHeight+'px';
  const x=c.getContext('2d');x.setTransform(dpr,0,0,dpr,0,0);
}
addEventListener('resize',()=>{if(Hand.on)fitCamCanvas();});
function camMsg(t,bad){const e=$('#camMsg');e.innerHTML=t;
  e.style.borderLeftColor=bad?'var(--red)':'var(--amber)';
  e.style.background=bad?'rgba(255,61,95,.08)':'rgba(255,182,39,.07)';
  e.style.color=bad?'#ffc2ce':'#e0c78a';}
function camRow(state,text){return `<div class="${state}"><b>${state==='ok'?'✔':state==='no'?'✕':'…'}</b><span>${text}</span></div>`;}
async function camDiagnose(){
  const box=$('#camChecks');const secure=window.isSecureContext===true;
  const api=!!(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia);
  let perm='unknown';
  try{if(navigator.permissions){const st=await navigator.permissions.query({name:'camera'});perm=st.state;}}catch(e){}
  let cams=-1;
  try{if(navigator.mediaDevices&&navigator.mediaDevices.enumerateDevices){
    const ds=await navigator.mediaDevices.enumerateDevices();cams=ds.filter(d=>d.kind==='videoinput').length;}}catch(e){}
  box.innerHTML=
    camRow(secure?'ok':'no',secure?'หน้านี้เปิดในโหมดปลอดภัย ใช้กล้องได้':'หน้านี้ไม่ใช่โหมดปลอดภัย เบราว์เซอร์จะไม่ยอมให้ใช้กล้อง')+
    camRow(api?'ok':'no',api?'เบราว์เซอร์รองรับการเข้าถึงกล้อง':'เบราว์เซอร์ปิดกั้น API กล้องในหน้านี้')+
    camRow(cams>0?'ok':cams===0?'no':'wait',cams>0?`พบกล้องในเครื่อง ${cams} ตัว`:cams===0?'ไม่พบกล้องที่ต่ออยู่':'ยังตรวจไม่ได้ ต้องขอสิทธิ์ก่อน')+
    camRow(perm==='granted'?'ok':perm==='denied'?'no':'wait',
      perm==='granted'?'เคยอนุญาตให้ใช้กล้องแล้ว':perm==='denied'?'สิทธิ์กล้องถูกปฏิเสธไว้ ต้องแก้ที่แถบที่อยู่ของเบราว์เซอร์':'ยังไม่ได้ขอสิทธิ์ในรอบนี้');
  if(!secure||!api){
    camMsg('เปิดไฟล์เกมด้วยวิธีที่เบราว์เซอร์ถือว่าปลอดภัยก่อน แล้วกล้องจะใช้ได้:<br>'+
      '• เปิดผ่าน <b>Live Server</b> ใน VS Code<br>'+
      '• หรือรัน <b>python -m http.server</b> ในโฟลเดอร์เกม แล้วเปิด <b>http://localhost:8000</b><br>'+
      '• ถ้าดูอยู่ในหน้าต่างพรีวิว ให้กดดาวน์โหลดไฟล์แล้วเปิดในเบราว์เซอร์โดยตรง<br>'+
      'ระหว่างนี้เล่นด้วยเมาส์หรือจอสัมผัสได้ครบทุกฟีเจอร์',true);
    $('#btnAllowCam').disabled=true;
  }else{$('#btnAllowCam').disabled=false;
    camMsg(perm==='denied'
      ? 'สิทธิ์กล้องถูกปฏิเสธไว้ก่อนหน้านี้ กดไอคอนกล้อง 🎥 หรือรูปแม่กุญแจ 🔒 ที่แถบที่อยู่ด้านบน แล้วเลือก “อนุญาต” จากนั้นกดปุ่มด้านล่างอีกครั้ง'
      : 'กดปุ่มด้านล่าง แล้วเลือก “อนุญาต / Allow” ในกล่องที่เบราว์เซอร์แสดงขึ้นมา');}
}
function openCamPermission(){
  if(Hand.on){Hand.stop();toast('ปิดกล้องแล้ว กลับมาใช้เมาส์ตามปกติ');return;}
  $('#ovCam').classList.add('on');camDiagnose();
}

const Hand={
  on:false,loading:false,hands:null,video:$('#camVid'),cvs:$('#camCv'),ctx:null,
  x:innerWidth/2,y:innerHeight/2,tx:innerWidth/2,ty:innerHeight/2,pinch:false,ratio:1,
  async start(){
    if(this.on||this.loading)return;
    this.loading=true;$('#btnAllowCam').disabled=true;
    // 1) ขอสิทธิ์กล้องก่อนเป็นอันดับแรก เพื่อให้เบราว์เซอร์เด้งกล่องถามทันทีจากการกดปุ่ม
    let stream;
    camMsg('กำลังขออนุญาตใช้กล้อง… ให้เลือก “อนุญาต / Allow” ในกล่องที่เบราว์เซอร์แสดงขึ้นมา');
    try{
      stream=await navigator.mediaDevices.getUserMedia({video:{width:{ideal:480},height:{ideal:360},facingMode:'user'}});
    }catch(e){
      this.loading=false;$('#btnAllowCam').disabled=false;
      const n=e&&e.name,m=((e&&e.message)||'').toLowerCase();
      if(m.includes('permissions policy')||m.includes('disallowed'))
        camMsg('หน้าต่างที่กำลังแสดงเกมอยู่ไม่อนุญาตให้ใช้กล้อง — กดดาวน์โหลดไฟล์เกมแล้วเปิดในเบราว์เซอร์โดยตรง กล้องจะใช้ได้ทันที',true);
      else if(n==='NotAllowedError'||n==='SecurityError')
        camMsg('สิทธิ์กล้องถูกปฏิเสธ — กดไอคอนกล้อง 🎥 หรือแม่กุญแจ 🔒 ที่แถบที่อยู่ด้านบนของเบราว์เซอร์ เลือก “อนุญาต” แล้วกดปุ่มนี้อีกครั้ง',true);
      else if(n==='NotFoundError'||n==='DevicesNotFoundError')
        camMsg('ไม่พบกล้องในเครื่อง ลองเสียบเว็บแคมแล้วกดใหม่อีกครั้ง',true);
      else if(n==='NotReadableError'||n==='TrackStartError')
        camMsg('กล้องกำลังถูกโปรแกรมอื่นใช้งานอยู่ (เช่น Zoom, Meet, OBS) ปิดโปรแกรมนั้นก่อนแล้วลองใหม่',true);
      else camMsg('เปิดกล้องไม่สำเร็จ: '+(n||'ไม่ทราบสาเหตุ')+' — เล่นด้วยเมาส์หรือจอสัมผัสต่อได้ตามปกติ',true);
      camDiagnose();return;
    }
    // 2) ได้สิทธิ์แล้วค่อยโหลดโมเดลตรวจจับมือ
    $('#cam').classList.add('on');$('#camState').textContent='กำลังโหลดโมเดล…';
    document.documentElement.style.setProperty('--camop',CAMOPS[camDim]);
    try{if(document.documentElement.requestFullscreen&&!document.fullscreenElement)
      await document.documentElement.requestFullscreen();}catch(e){}
    camMsg('อนุญาตเรียบร้อย ✔ กำลังโหลดโมเดลตรวจจับมือ…');
    try{
      await loadScript('../libs/mediapipe/hands/hands.js');
      if(!window.Hands)throw new Error('no lib');
      this.video.srcObject=stream;await this.video.play();
      this.ctx=this.cvs.getContext('2d');
      this.hands=new window.Hands({locateFile:f=>`../libs/mediapipe/hands/${f}`});
      this.hands.setOptions({maxNumHands:1,modelComplexity:0,minDetectionConfidence:.6,minTrackingConfidence:.6});
      this.hands.onResults(r=>this.onResults(r));
      this.on=true;this.loading=false;
      camLayers(true);$('#camState').textContent='ยกมือเข้ากล้อง';
      $('#ovCam').classList.remove('on');$('#btnAllowCam').disabled=false;
      toast('เปิดโหมดมือเต็มจอแล้ว — จีบนิ้วโป้งกับนิ้วชี้เพื่อคีบบล็อก คลายนิ้วเพื่อวาง');
      this.loop().catch(()=>{});
    }catch(e){
      this.loading=false;$('#btnAllowCam').disabled=false;
      stream.getTracks().forEach(t=>t.stop());
      camLayers(false);
      camMsg('กล้องเปิดได้แล้ว แต่โหลดโมเดลตรวจจับมือไม่สำเร็จ — โหมดนี้ต้องใช้อินเทอร์เน็ตในการโหลดครั้งแรก ตรวจการเชื่อมต่อแล้วลองใหม่ ระหว่างนี้เล่นด้วยเมาส์ได้ครบทุกฟีเจอร์',true);
    }
  },
  stop(){
    this.on=false;camLayers(false);
    const st=this.video.srcObject;if(st)st.getTracks().forEach(t=>t.stop());
    this.video.srcObject=null;if(this.pinch){onUp(this.x,this.y);this.pinch=false;}
    try{if(document.fullscreenElement)document.exitFullscreen();}catch(e){}
  },
  async loop(){
    if(!this.on)return;
    try{if(this.video.readyState>=2)await this.hands.send({image:this.video});}catch(e){}
    if(this.on)requestAnimationFrame(()=>this.loop().catch(()=>{}));
  },
  onResults(res){
    const c=this.ctx,W=innerWidth,H=innerHeight;
    c.clearRect(0,0,W,H);
    const lm=res.multiHandLandmarks&&res.multiHandLandmarks[0];
    if(!lm){$('#camState').textContent='ไม่พบมือ — ยกมือให้เห็นเต็มฝ่ามือ';$('#camPinch').textContent='';
      $('#handTip').textContent='ยกมือเข้ากล้อง';return;}
    // แปลงพิกัดชุดเดียวกับเคอร์เซอร์ เพื่อให้โครงมือกับปลายนิ้วตรงตำแหน่งกันพอดี
    const P=i=>({x:((1-lm[i].x-.16)/.68)*W,y:((lm[i].y-.14)/.7)*H});
    const bones=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],
      [9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
    c.lineCap='round';c.lineJoin='round';
    c.strokeStyle='rgba(4,9,15,.55)';c.lineWidth=8;
    bones.forEach(([a,b])=>{const p=P(a),q=P(b);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();});
    c.strokeStyle=this.pinch?'rgba(38,255,156,.95)':'rgba(58,217,255,.9)';c.lineWidth=3.4;
    c.shadowBlur=12;c.shadowColor=this.pinch?'#26ff9c':'#3ad9ff';
    bones.forEach(([a,b])=>{const p=P(a),q=P(b);c.beginPath();c.moveTo(p.x,p.y);c.lineTo(q.x,q.y);c.stroke();});
    c.shadowBlur=0;
    c.fillStyle='#cfe3f2';for(let i=0;i<21;i++){const p=P(i);c.beginPath();c.arc(p.x,p.y,3.2,0,7);c.fill();}
    // เน้นนิ้วโป้งกับนิ้วชี้ และเส้นระยะจีบนิ้ว
    const t4=P(4),t8=P(8);
    c.strokeStyle=this.pinch?'#26ff9c':'rgba(255,182,39,.85)';c.lineWidth=2;c.setLineDash([5,5]);
    c.beginPath();c.moveTo(t4.x,t4.y);c.lineTo(t8.x,t8.y);c.stroke();c.setLineDash([]);
    c.fillStyle=this.pinch?'#26ff9c':'#ffb627';
    [t4,t8].forEach(p=>{c.beginPath();c.arc(p.x,p.y,7,0,7);c.fill();});
    // pinch ratio
    const d=(a,b)=>Math.hypot(lm[a].x-lm[b].x,lm[a].y-lm[b].y);
    const span=Math.max(.001,d(0,9));
    this.ratio=d(4,8)/span;
    const wasPinch=this.pinch;
    if(!this.pinch&&this.ratio<.42)this.pinch=true;
    if(this.pinch&&this.ratio>.58)this.pinch=false;
    // cursor position from index tip, mirrored, with margin expansion
    const nx=clamp((1-lm[8].x-.16)/.68,0,1),ny=clamp((lm[8].y-.14)/.7,0,1);
    this.tx=nx*innerWidth;this.ty=ny*innerHeight;
    this.x=lerp(this.x,this.tx,.42);this.y=lerp(this.y,this.ty,.42);
    const cur=$('#handCursor');
    cur.style.left=this.x+'px';cur.style.top=this.y+'px';
    cur.classList.toggle('pinch',this.pinch);
    $('#camState').textContent=this.pinch?'กำลังคีบบล็อก':'พร้อมใช้งาน · จีบนิ้วเพื่อคีบ';
    $('#camPinch').textContent='PINCH '+this.ratio.toFixed(2);
    $('#handTip').textContent=drag?'คลายนิ้วเพื่อวาง':(this.pinch?'คีบอยู่':'จีบนิ้วเพื่อคีบ');
    if(this.pinch&&!wasPinch){SFX.init();onDown(this.x,this.y,true);}
    else if(this.pinch)onMove(this.x,this.y);
    else if(!this.pinch&&wasPinch)onUp(this.x,this.y);
  }
};
function loadScript(src){
  return new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=src;s.crossOrigin='anonymous';
    s.onload=res;s.onerror=()=>rej(new Error('load fail'));
    document.head.appendChild(s);
    setTimeout(()=>rej(new Error('timeout')),12000);
  });
}

/* ==================================================================
   7. MENU / WIRING
   ================================================================== */
function bindOpts(sel,cb){
  document.querySelectorAll(sel+' .opt').forEach(o=>o.addEventListener('click',()=>{
    document.querySelectorAll(sel+' .opt').forEach(x=>x.classList.remove('sel'));
    o.classList.add('sel');cb(+o.dataset.v);SFX.init();SFX.click();
  }));
}
bindOpts('#optWorld',v=>G.world=v);
bindOpts('#optDiff',v=>G.diffSel=v);

$('#btnStart').addEventListener('click',()=>{
  SFX.init();
  const raw=$('#seedIn').value.trim();
  G.seedBase=raw?hashStr(raw):(Date.now()^Math.floor(Math.random()*1e9))>>>0;
  G.mIdx=0;G.score=0;G.combo=0;G.integrity=100;G.cleared=0;G.totalSteps=0;G.totalErr=0;
  G.started=true;
  $('#ovMenu').classList.remove('on');
  resize();newMission();updateHUD();
  toast(raw?`SEED: ${raw} — ชุดโจทย์นี้ทำซ้ำได้เพื่อการตัดสิน`:'สุ่มชุดโจทย์ใหม่ทั้งหมดสำหรับรอบนี้');
});
$('#btnNext').addEventListener('click',()=>{$('#ovClear').classList.remove('on');newMission();});
$('#btnQuit1').addEventListener('click',()=>{$('#ovClear').classList.remove('on');gameOver();});
$('#btnAgain').addEventListener('click',()=>{$('#ovOver').classList.remove('on');$('#ovMenu').classList.add('on');});
$('#btnRun').addEventListener('click',()=>{
  if(G.running){G.abort=true;$('#btnRun').textContent='กำลังยกเลิก…';}
  else runProgram();
});
$('#btnUndo').addEventListener('click',undoLast);
$('#btnExit').addEventListener('click',()=>{SFX.init();G.started?pauseGame():backToMenu();});
$('#btnResume').addEventListener('click',resumeGame);
$('#btnEndNow').addEventListener('click',()=>{$('#ovPause').classList.remove('on');G.paused=false;gameOver();});
$('#btnToMenu').addEventListener('click',backToMenu);
$('#btnReset').addEventListener('click',()=>{
  if(G.running)return;
  G.slots.forEach((k,i)=>{if(k&&i>=G.locked){$('#palette').appendChild(blockEls.get(k));G.slots[i]=null;}});
  G.history=[];updateFlowTag();SFX.click();toast('คืนบล็อกที่ยังไม่ล็อกกลับคลังแล้ว');
});
$('#btnHint').addEventListener('click',useHint);
$('#btnCam').addEventListener('click',()=>{SFX.init();openCamPermission();});
$('#btnAllowCam').addEventListener('click',()=>{SFX.init();Hand.start().catch(()=>{});});
$('#btnNoCam').addEventListener('click',()=>{$('#ovCam').classList.remove('on');SFX.click();});
$('#btnCamDim').addEventListener('click',()=>{camDim=(camDim+1)%CAMOPS.length;
  document.documentElement.style.setProperty('--camop',CAMOPS[camDim]);SFX.click();
  toast('ความสว่างภาพกล้อง: '+Math.round(CAMOPS[camDim]*100)+'%');});
$('#btnMute').addEventListener('click',e=>{SFX.init();SFX.muted=!SFX.muted;e.target.textContent=SFX.muted?'🔇':'🔊';});
addEventListener('keydown',e=>{
  if(e.key==='Enter'&&G.started&&!G.running)runProgram();
  if(e.key.toLowerCase()==='h')useHint();
  if(e.key.toLowerCase()==='z'&&!G.running)undoLast();
  if(e.key==='Escape'){
    if(G.running)G.abort=true;
    else if(G.paused)resumeGame();
    else pauseGame();
  }
});

/* ตาข่ายกันพลาด: ถ้ามี error หลุดมา ให้เกมเล่นต่อได้แทนที่จะค้างทั้งหน้า */
addEventListener('unhandledrejection',e=>{
  console.warn('CodeFlow: promise error',e.reason);e.preventDefault();
  if(G.running)stopRun('ERROR');
});
addEventListener('error',e=>{console.warn('CodeFlow: error',e.message);});

/* render loop */
let last=performance.now();
function frame(now){
  const dt=Math.min(.05,(now-last)/1000);last=now;
  try{Sim.update(dt);Sim.draw();}catch(e){console.warn('CodeFlow: draw',e);}
  requestAnimationFrame(frame);
}
resize();requestAnimationFrame(frame);
setTimeout(resize,120);
