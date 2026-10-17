# QuizSuite — คู่มือใช้งานและติดตั้งฉบับละเอียด

เอกสารนี้อธิบายการเปิดใช้งาน QuizSuite ผ่าน Google Apps Script หรือ GitHub + Vercel พร้อมเชื่อม Google Sheets และ Google Drive

## 1. ไฟล์สำคัญ

- `index.html`, `styles.css`, `app.js` คือหน้าเว็บหลัก
- `api/quizsuite.js` คือ Vercel Function สำหรับส่งคำขอจากเว็บไป Apps Script โดยเก็บ secret ไว้ฝั่ง server
- `GoogleAppsScript/Code.gs` คือ API และตัวจัดการข้อมูล Google Sheets/Drive
- `GoogleAppsScript/Index.html` คือชุดหน้าเว็บที่รวม CSS/JavaScript เพื่อใช้เมื่อโฮสต์บน Apps Script
- `GoogleAppsScript/appsscript.json` กำหนดสิทธิ์ Sheets/Drive และเขตเวลา

## 2. เลือกวิธีโฮสต์

| วิธีเปิด | Sheets/Drive | กล้องมือถือ | หมายเหตุ |
|---|---|---|---|
| ดับเบิลคลิก `index.html` (`file://`) | ไม่เชื่อม Google; เก็บเฉพาะ Local Storage | อาจถูกเบราว์เซอร์ปิดกั้น | ใช้ดูหน้าตา/ทดลองในเครื่องเท่านั้น |
| Apps Script `/exec` | เชื่อมโดยตรงผ่าน `google.script.run` | ใช้ได้เมื่ออนุญาตกล้อง | วิธีที่ตั้งค่าน้อยที่สุด |
| GitHub + Vercel พร้อม Function | ผ่าน `/api/quizsuite` ไป Apps Script | ใช้ได้ผ่าน HTTPS | ต้องตั้งค่า URL และ secret ตามหัวข้อ 4 |

ข้อมูลใน Local Storage อยู่เฉพาะเบราว์เซอร์และเครื่องนั้น การล้างข้อมูลเว็บไซต์หรือเปลี่ยนอุปกรณ์จะไม่ย้ายข้อมูลส่วนนี้ไปด้วย

## 3. เตรียม Google Sheets และ Drive

1. ใช้บัญชี Google ที่มีสิทธิ์แก้ไข Spreadsheet ID `1oCnwp408va_iLJiwjkJwzCGki6wrult2fKVROLXHKfQ` และโฟลเดอร์ Drive ID `1rhtYMneVI-MSVLNGk1Xz445sLk8Phq97` หากเป็นทรัพยากรของโรงเรียน ให้แชร์ให้บัญชีที่จะ Deploy Apps Script ด้วยสิทธิ์ Editor
2. เข้า Apps Script แล้วสร้าง project ใหม่ (หรือใช้ project ที่มีอยู่)
3. เพิ่มไฟล์ `Code.gs` จากโฟลเดอร์ `GoogleAppsScript` และวางเนื้อหาไฟล์ลงไป
4. เลือก `authorizeQuizSuiteResources` แล้วกด Run จากนั้นอนุญาตสิทธิ์ Sheets และ Drive เมื่อ Google แสดงหน้าขอสิทธิ์
5. ตรวจ Spreadsheet จะมีแท็บ `Users`, `Exams`, `Classes`, `Students`, `Folders`, `Settings`, `Metadata` สร้างให้อัตโนมัติ หัวตารางของแท็บข้อมูลคือ `ID`, `JSON data`, `Updated at` โดยเก็บ record แบบ JSON ต่อหนึ่งแถว
6. หากเห็น `Access denied` ที่ Drive ให้ตรวจว่าบัญชีที่รัน Apps Script เป็น Editor ของโฟลเดอร์ ตรวจ ID และรัน `authorizeQuizSuiteResources` ซ้ำด้วยบัญชีเดียวกับที่ใช้ Deploy

### 3.1 Deploy Apps Script เป็น API

1. ใน Apps Script เปิด **Project Settings → Script properties → Add script property**
2. เพิ่ม `QUIZ_BRIDGE_SECRET` และกำหนดค่าเป็น secret แบบสุ่มยาวอย่างน้อย 32 ตัวอักษร เก็บค่านี้ใน password manager ห้ามใส่ใน `app.js`, HTML หรือ GitHub
3. เลือก **Deploy → New deployment → Web app**
4. เลือก Execute as: **Me** เพื่อให้ Apps Script ใช้สิทธิ์ของเจ้าของที่อนุญาต Sheets/Drive
5. สำหรับการเชื่อมจาก Vercel ต้องตั้ง access ให้ผู้เรียก API เข้าถึง deployment ได้ตามนโยบาย Google Workspace ของโรงเรียน และระวังว่าการตั้ง Everyone ทำให้ URL ถูกเรียกจากภายนอกได้ การตรวจ secret ใน Code.gs ป้องกันการเรียกตรงที่ไม่มี secret แต่ URL สำหรับเว็บแอปยังควรถูกจำกัดตามนโยบายองค์กร
6. กด Deploy และคัดลอก URL ที่ลงท้าย `/exec` เก็บไว้ใช้ใน Vercel
7. เปลี่ยนโค้ด Apps Script เมื่อใด ให้เลือก **Deploy → Manage deployments → Edit → New version → Deploy** เพื่อเผยแพร่โค้ดล่าสุด

การเรียก `authorizeQuizSuiteResources` เป็นการอนุญาต scope ก่อนใช้งานจริง ส่วนการอัปโหลดจะสร้างโฟลเดอร์ปีปัจจุบันภายใน Drive folder ที่ตั้งไว้ และใช้โฟลเดอร์ย่อย `Scans` สำหรับภาพสแกน

## 4. นำขึ้น GitHub และ Vercel ให้บันทึก Google ได้

### 4.1 GitHub

1. สร้าง repository และอัปโหลดไฟล์/โฟลเดอร์ของโปรเจกต์ รวม `api/` และ `GoogleAppsScript/`
2. อย่าใส่ secret, รหัสผ่าน, token, service-account key, ข้อมูลผู้ใช้ หรือไฟล์สำเนา Google Sheet ใน repository
3. ตรวจว่ามีไฟล์ต่อไปนี้ที่ root: `index.html`, `app.js`, `styles.css`, `DEPLOYMENT.md` และโฟลเดอร์ `api/quizsuite.js`

### 4.2 Vercel

1. ใน Vercel เลือก **Add New → Project** แล้ว Import GitHub repository
2. เลือก Framework Preset: **Other**; ไม่ต้องใส่ Build Command; Output Directory ใช้ค่า root/ค่าเริ่มต้น
3. ก่อน Deploy หรือใน **Project → Settings → Environment Variables** เพิ่มตัวแปรสองรายการนี้ให้ครบทุก environment ที่จะใช้ (Production และ Preview ตามต้องการ)

   - `QUIZ_APPS_SCRIPT_URL` = URL `/exec` ของ Apps Script
   - `QUIZ_BRIDGE_SECRET` = ค่าเดียวกับ Script Property ฝั่ง Apps Script

4. กด Redeploy หลังเพิ่มหรือแก้ Environment Variables
5. เปิดเว็บ Vercel แล้วสมัคร/ลงชื่อเข้าใช้ ตรวจสถานะซิงก์ และลองสร้างชั้นเรียนหรือข้อสอบ จากนั้นตรวจแถวข้อมูลใน Google Sheet
6. ลองอัปโหลดโลโก้/รูปสแกนขนาดเล็ก แล้วตรวจไฟล์ใน Drive และลิงก์ในข้อมูลข้อสอบ
7. เปิดด้วย URL `https://...vercel.app` บนมือถือ อนุญาตกล้องจาก site settings และใช้ HTTPS ตลอด (กล้องมักใช้ไม่ได้จาก `file://`)

`api/quizsuite.js` รับเฉพาะ POST และ action ที่กำหนด (`load`, `save`, `uploadLogo`, `uploadProfile`, `uploadScan`) แล้วส่งต่อไป Apps Script; secret อยู่ใน environment ของ Vercel และ Script Properties เท่านั้น ไม่ถูกส่งไป browser JavaScript

### 4.3 ตรวจสอบการเชื่อมต่อเมื่อไม่ซิงก์

1. ตรวจ `QUIZ_APPS_SCRIPT_URL` ว่าลงท้าย `/exec` และไม่มีช่องว่าง/quote เกินมา
2. ตรวจ secret สองฝั่งให้ตรงกันทุกตัวอักษร แล้ว Redeploy Vercel
3. ตรวจ Apps Script deployment ว่า URL เป็น deployment ล่าสุด และ Execute as เป็นเจ้าของที่อนุญาต Sheet/Drive
4. Apps Script → Executions ดู error ล่าสุด; Vercel → Functions → Logs ดู error ของ `/api/quizsuite`
5. ตรวจว่าผู้ Deploy มีสิทธิ์ใน Sheet/Drive และรัน `authorizeQuizSuiteResources` ผ่านแล้ว
6. หาก API แจ้ง `Unauthorized` ให้แก้ Script Property; หากแจ้ง `Could not reach Google Apps Script` ให้ตรวจ URL/deployment/access policy

## 5. วิธีใช้งาน QuizSuite

### 5.1 เข้าสู่ระบบ

- เริ่มต้นมีบัญชีผู้ดูแลระบบ `admin` / `admin123` สำหรับติดตั้งใหม่ ให้เปลี่ยนรหัสผ่านทันทีและไม่เผยแพร่ต่อสาธารณะ
- บัญชีทดลอง `demo` / `demo1234` เปิดดูหน้าต่าง ๆ ได้ แต่ระบบปิดการแก้ไขผ่าน UI
- สมัครสมาชิกด้วยคำนำหน้า ชื่อ-สกุล วันเกิด ชื่อผู้ใช้ และรหัสผ่าน แล้วติ๊กยืนยันข้อมูล ระบบจะเข้า Workspace หลังสมัคร
- ตัวเลือกจดจำการเข้าสู่ระบบเก็บชื่อและสถานะบนอุปกรณ์นั้น ไม่เก็บรหัสผ่าน หลีกเลี่ยงการใช้บนเครื่องสาธารณะ

### 5.2 ลำดับเริ่มต้นใช้งาน

1. **สร้างชั้นเรียน**: เปิดเมนู Class เพิ่มระดับชั้น/ห้อง แล้วบันทึก
2. **เพิ่มนักเรียน**: เปิด Student เพิ่มรายคน หรือนำเข้า CSV โดยมีหัวคอลัมน์ ชื่อจริง, นามสกุล, เลขที่, ชั้นเรียน, ห้อง
3. **สร้างข้อสอบ**: เปิด Exam → สร้างใหม่ ระบุชื่อ จำนวนข้อ ตัวเลือก ชั้นเรียน คะแนนต่อข้อ วัน/เวลา ชุดข้อสอบ และโฟลเดอร์
4. **ตั้งค่ากระดาษ**: เลือกข้อมูลหัวกระดาษ จำนวนหลักของเลขที่ ขนาดและแนวกระดาษ รวมทั้งคำชี้แจง
5. **ดูตัวอย่าง**: ตรวจข้อมูล ขอบกระดาษ จำนวนข้อ และตัวเลือกก่อนบันทึก
6. **กำหนดเฉลย**: เปิดข้อสอบ → ตัวอย่างกระดาษคำตอบ → แตะตัวเลือกในแต่ละข้อ → บันทึกเฉลย
7. **พิมพ์**: เลือกพิมพ์/บันทึก PDF แล้วตรวจขนาดและแนวกระดาษในกล่องพิมพ์ของเบราว์เซอร์ก่อนกด Save
8. **สแกนภาพ**: เปิดสแกนข้อสอบ อนุญาตกล้อง จัดกระดาษให้เห็นจุดมุมทั้งสี่ เลือกว่าจะบันทึกภาพ แล้วถ่ายภาพ

### 5.3 โฟลเดอร์และตัวเลือกข้อสอบ

- สร้างโฟลเดอร์ได้จากแถบเหนือรายการข้อสอบ เปลี่ยนชื่อหรือลบได้จากเมนูของโฟลเดอร์
- เปลี่ยนชื่อโฟลเดอร์แล้วรายการข้อสอบที่ผูกกับโฟลเดอร์จะอัปเดตตาม
- เลือกรูปแบบตัวเลือกภาษาอังกฤษ ตัวเลข หรืออักษรไทยได้ และระบุคำตอบเองโดยคั่นด้วย comma ให้จำนวนรายการตรงกับรูปแบบข้อสอบ
- เวลาเริ่มสอบใช้รูปแบบ 24 ชั่วโมงจากช่องเวลา ไม่ต้องระบุ AM/PM

## 6. ข้อจำกัดที่ต้องทราบก่อนใช้งานจริง

- กล้องและการบันทึกภาพผ่าน Vercel ใช้ได้เมื่อเชื่อมต่อ HTTPS, ผู้ใช้อนุญาตสิทธิ์กล้อง และมี API/สิทธิ์ Drive พร้อม
- โค้ดปัจจุบันถ่ายภาพและจัดเก็บไฟล์ภาพได้ แต่ **ยังไม่มีระบบ OMR ที่ตรวจจุดมุม ปรับแก้ภาพเอียง อ่านเลขที่/รหัส และอ่านวงคำตอบเพื่อคำนวณคะแนนโดยอัตโนมัติ** หน้าสแกนจึงยังไม่ควรใช้ประกาศคะแนนแทนการตรวจคน
- API bridge นี้ส่ง state ทั้งชุดของแอปไปยัง Apps Script และการตรวจ role ส่วนใหญ่ยังเกิดที่หน้าเว็บ จึงยังไม่ใช่ระบบ authorization แบบแยกสิทธิ์/แยกข้อมูลรายบัญชีที่พร้อมเปิดสาธารณะ หากมีข้อมูลนักเรียนจริง ควรจำกัด Vercel ด้วยการยืนยันตัวตนระดับองค์กร และพัฒนาการตรวจ user/session/สิทธิ์ Admin ที่ backend ก่อนเปิดใช้ทั่วไป
- อย่าเก็บข้อมูลอ่อนไหวเกินจำเป็นในระบบต้นแบบ และควรทดสอบบนสำเนา Sheet/Drive ก่อนใช้งานจริง
- `file://` ใช้เป็นตัวอย่างหน้าจอเท่านั้น: ไม่มี `google.script.run`, Vercel Function หรือ secure context สำหรับกล้อง

## 7. ขั้นตอนอัปเดต

1. แก้ไฟล์ใน repository แล้ว Push ไป GitHub
2. Vercel จะ Build/Deploy อัตโนมัติตามการตั้งค่า repository
3. หากแก้ `GoogleAppsScript/Code.gs` ให้คัดลอกไป Apps Script แล้ว Deploy เป็น New version ด้วย
4. ทดสอบ load, save, upload และกล้องบน URL HTTPS หลังเผยแพร่ทุกครั้ง
