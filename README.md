# Discord Nickname Scheduler

บอท Discord สำหรับเซิร์ฟที่ต้องการให้ชื่อบอทในเซิร์ฟเปลี่ยนตามเวลาไทย และถ้าต้องการก็ให้บอทเข้าไปนั่งในห้องเสียงแบบปิดไมค์ปิดหูได้ โดยตั้งค่าทั้งหมดในไฟล์ config.json ไม่ใช้ไฟล์ .env

## การทำงานของโปรแกรม

ลำดับการทำงานจริงตามโค้ดมีประมาณนี้

1. ไฟล์ index.js เรียก loadConfig จาก src/config.js เพื่ออ่าน config.json ที่โฟลเดอร์ root ของโปรเจกต์ ถ้า token หรือรูปแบบ config ผิด โปรแกรมจะหยุดทันทีและพิมพ์ Config error

2. สร้าง Client ของ discord.js แล้ว login ด้วย token ใน config

3. เมื่อ Discord ส่งเหตุการณ์ ClientReady โปรแกรมจะทำสองอย่างหลัก
   - เรียก syncAllGuilds ใน src/sync.js เพื่อตั้ง nickname ของบอทในแต่ละ guild ให้ตรงกับช่วงเวลาปัจจุบัน
   - เรียก startVoiceJoinInBackground ใน src/voice.js ถ้าใน config มี voiceChannelId บอทจะ join ห้องเสียงด้วย selfMute และ selfDeaf แล้วปล่อยให้ไลบรารี voice ดูแลต่อ

4. การเลือกชื่อที่จะใช้ทำใน src/schedule.js ฟังก์ชัน resolveDisplayName จะดูเวลาปัจจุบันในโซน Asia/Bangkok แล้วหาว่าอยู่ในช่วง from ถึง to ของ schedule ข้อไหน ถ้าอยู่ในช่วงก็ใช้ name ของช่วงนั้น ชื่อ nickname ต้องไม่เกิน 32 ตัวอักษรตามข้อจำกัดของ Discord

5. syncGuild ใน src/sync.js เปรียบเทียบ nickname ปัจจุบันกับชื่อที่ควรใช้ ถ้าไม่ตรงจึงเรียก guild.members.editMe เพื่อเปลี่ยนชื่อ ถ้าตรงแล้วจะไม่เรียก API ซ้ำ

6. node-cron ใน index.js ตั้งให้ทุกนาทีเรียก syncAllGuilds อีกครั้ง โดยใช้ timezone Asia/Bangkok เพื่อให้พอข้ามช่วงเวลาใน schedule ชื่อจะอัปเดต

7. กด Ctrl+C หรือส่ง SIGTERM โปรแกรมจะหยุด cron ทำลาย voice connection แล้ว logout

## ฟีเจอร์

- เปลี่ยน nickname ของบอทในแต่ละ Discord guild ตามช่วงเวลา HH:mm แบบเวลาไทย
- รองรับหลาย guild ใน config เดียว
- ตั้งชื่อเป็นช่วง from ถึง to ไม่ใช่จุดเวลาเดียว
- ช่วงข้ามเที่ยงคืนได้ เช่น from 10:00 to 00:59
- เข้าห้องเสียงแบบปิดไมค์ปิดหูได้ถ้าใส่ voiceChannelId
- ตรวจ config ก่อน login ลด error ตอนรันกลางคืน

## เทคโนโลยีที่ใช้

- Node.js 18 ขึ้นไป
- discord.js 14
- @discordjs/voice และ @snazzah/davey สำหรับ voice
- luxon สำหรับเวลา Asia/Bangkok
- node-cron สำหรับเช็กทุกนาที

## สิ่งที่ต้องมีก่อนติดตั้ง

- Node.js เวอร์ชัน 18 ขึ้นไป ตรวจด้วยคำสั่ง node -v
- npm มากับ Node.js อยู่แล้ว
- บัญชี Discord Developer สำหรับสร้าง bot และ copy token
- บอทถูกเชิญเข้าเซิร์ฟที่จะใช้แล้ว และมีสิทธิ Change Nickname
- ถ้าใช้ voice ต้องมีสิทธิ Connect ในเซิร์ฟนั้นด้วย และเครื่องหรือ VPS ต้องให้ UDP ออกไปหา Discord ได้ ถ้าโฮสต์บล็อก UDP voice จะ join ไม่คงที่

## วิธีติดตั้ง

1. เอาโปรเจกต์ไปไว้ในเครื่องหรือ VPS แล้วเข้าโฟลเดอร์โปรเจกต์

```bash
cd path/to/rjbot
```

2. ติดตั้งแพ็กเกจ

```bash
npm install
```

3. สร้างไฟล์ config.json ที่โฟลเดอร์เดียวกับ index.js ถ้ายังไม่มี โครงสร้างตัวอย่างดูในหัวข้อวิธีใช้งาน อย่า commit token จริงขึ้น git ไฟล์ config.json อยู่ใน .gitignore แล้ว

4. ทดสอบ logic ช่วงเวลาได้ด้วย

```bash
npm test
```

## วิธีใช้งาน

### ขั้นที่ 1 สร้าง bot ใน Discord Developer Portal

1. เปิด https://discord.com/developers/applications แล้วสร้าง Application ใหม่
2. ไปที่เมนู Bot แล้วกด Reset Token หรือ Copy token เก็บไว้ใส่ใน config.json
3. ไปที่ OAuth2 แล้ว URL Generator เลือก scope bot
4. เลือก permission อย่างน้อย Change Nickname และ View Channels ถ้าจะใช้ voice เพิ่ม Connect
5. เปิดลิงก์ที่ได้แล้วเชิญบอทเข้าเซิร์ฟที่ต้องการ

### ขั้นที่ 2 หา guild id และ channel id

1. ใน Discord เปิด Settings แล้ว Advanced เปิด Developer Mode
2. คลิกขวาที่ชื่อเซิร์ฟ แล้ว Copy Server ID ได้ guildId
3. ถ้าจะใช้ voice คลิกขวาที่ห้องเสียง แล้ว Copy Channel ID ได้ voiceChannelId

### ขั้นที่ 3 แก้ config.json

ไฟล์อยู่ข้าง index.js ตัวอย่างแบบร้านปิด 01:00 ถึง 09:59 นอกนั้นเปิด

```json
{
  "token": "ใส่_bot_token_ที่นี่",
  "guilds": [
    {
      "guildId": "1492798311839699056",
      "voiceChannelId": "1495776741984178387",
      "schedule": [
        {
          "from": "01:00",
          "to": "09:59",
          "name": "ข้อความตอนปิด ไม่เกิน 32 ตัว"
        },
        {
          "from": "10:00",
          "to": "00:59",
          "name": "ข้อความตอนเปิด ไม่เกิน 32 ตัว"
        }
      ]
    }
  ]
}
```

คำอธิบายฟิลด์

- token คือ token ของ bot จาก Developer Portal
- guildId คือ id เซิร์ฟที่บอทอยู่
- voiceChannelId ใส่เมื่อต้องการให้บอทเข้าห้องเสียง ถ้าไม่ต้องการลบทั้งบรรทัดออก
- schedule เป็น array ของช่วงเวลา แต่ละช่วงมี from to name เป็นเวลาไทย
- defaultName ใส่ได้ถ้ามีช่วงเวลาที่ไม่ถูกครอบด้วย schedule ไม่ใส่ก็ได้ถ้าครอบทั้งวันแล้ว

กฎช่วงเวลา

- ช่วงใน schedule ห้ามทับกัน โปรแกรมจะ error ตอนเปิด config
- ถ้า from มากกว่า to แปลว่าข้ามเที่ยงคืน เช่น 10:00 ถึง 00:59

### ขั้นที่ 4 รันบอท

```bash
npm start
```

หรือ

```bash
node index.js
```

สิ่งที่ควรเห็นบน terminal ประมาณนี้

- Logged in as ชื่อบอท (Asia/Bangkok schedule)
- บรรทัด schedule แล้วชื่อที่ sync
- ถ้ามี voice จะมี voice: อยู่ใน ชื่อห้อง (ปิดไมค์+ปิดหู)
- Minute scheduler started (Asia/Bangkok)

### ขั้นที่ 5 ตรวจใน Discord

1. เปิดเซิร์ฟแล้วดูรายชมาชิกหรือห้องเสียง ชื่อที่แสดงคือ nickname ในเซิร์ฟ ไม่ใช่ชื่อแอป global ของ bot
2. รอข้ามช่วงเวลาใน schedule หรือแก้ from to ชั่วคราวเพื่อทดสอบ บอทจะเปลี่ยนชื่อเมื่อ cron รอบถัดไปหรือตอน restart หลัง login

### ขั้นที่ 6 หยุดบอท

กด Ctrl+C ใน terminal ที่รันอยู่ หรือกด Stop ใน panel โฮสต์ ควรเห็น Shutting down

### ข้อควรระวัง

- รันบอทด้วย token เดียวแค่ที่เดียว ถ้าเปิดสอง process พร้อมกัน voice และ session จะรบกวนกัน
- ชื่อใน name ยาวเกิน 32 ตัวอักษร config จะ error ตอน start
- ถ้า voice ขึ้น IP discovery หรือ socket closed ซ้ำ ๆ มักเป็นเรื่อง UDP ที่โฮสต์ ไม่ใช่แค่แก้ config ลบ voiceChannelId ออกได้ถ้าแค่เปลี่ยนชื่อก็พอ

## โครงสร้างโฟลเดอร์

```
rjbot
  index.js           จุดเริ่ม login cron และเรียก sync กับ voice
  config.json        token guild schedule ไม่ควร commit
  package.json       รายการแพ็กเกจและคำสั่ง npm start
  src
    config.js        อ่านและ validate config.json
    schedule.js      เลือกชื่อจากช่วงเวลา Bangkok
    sync.js          เปลี่ยน nickname ผ่าน Discord API
    voice.js         join ห้องเสียงแบบ mute deaf
    schedule.test.js ทดสอบ logic ช่วงเวลา
```
