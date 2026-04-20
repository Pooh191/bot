const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// สร้างโมเดลแบบยืดหยุ่นสำหรับเก็บไฟล์ JSON ทั้งก้อนลงใน 1 Document ของ MongoDB
const JSONFileSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // เช่น 'users', 'config', 'history_logs', 'resources'
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  arrayData: { type: Array, default: [] }
}, { strict: false });

const JSONFileModel = mongoose.model('JSONFile', JSONFileSchema);

// ปิดการ Buffer คำสั่ง (ถ้า DB ไม่ติด ให้ Error ทันที ไม่ต้องรอจน Discord ค้าง)
mongoose.set('bufferCommands', false);

// Cache หน่วยความจำหลักให้บอทวิ่งทำงานได้ไวปรี๊ดเหมือนเดิม
const memoryCache = {
  users: null,
  config: null,
  resources: null,
  history_logs: null,
  role_salaries: null,
  scheduled_messages: null,
  uid_roles: null,
  counter: null,
  shop: null,
  market: null,
  ticket_config: null,
  request_config: null,
  citizenship_config: null
};

async function connectAndSyncAll() {
  // 1. โหลดข้อมูลจากไฟล์ Local เข้า RAM ก่อนเสมอ เพื่อเป็นก๊อกสอง (Offline Fallback)
  console.log("💾 ระบบก๊อก 1: กำลังโหลดข้อมูลสำรองจากไฟล์ในเครื่อง...");
  const filesToLoad = [
    { name: 'users', type: 'object', path: 'data/users.json' },
    { name: 'history_logs', type: 'array', path: 'data/history_logs.json' },
    { name: 'config', type: 'object', path: 'config.json' },
    { name: 'resources', type: 'object', path: 'data/resources.json' },
    { name: 'role_salaries', type: 'object', path: 'data/role_salaries.json' },
    { name: 'scheduled_messages', type: 'array', path: 'data/scheduled_messages.json' },
    { name: 'uid_roles', type: 'object', path: 'data/uid_roles.json' },
    { name: 'counter', type: 'object', path: 'data/counter.json' },
    { name: 'shop', type: 'object', path: 'data/shop.json' },
    { name: 'market', type: 'object', path: 'data/market.json' },
    { name: 'ticket_config', type: 'object', path: 'data/ticket_config.json' },
    { name: 'request_config', type: 'object', path: 'data/request_config.json' },
    { name: 'citizenship_config', type: 'object', path: 'data/citizenship_config.json' }
  ];

  for (const entry of filesToLoad) {
    const fullPath = path.join(__dirname, '..', entry.path);
    if (fs.existsSync(fullPath)) {
      try {
        const fileContent = fs.readFileSync(fullPath, 'utf8');
        if (fileContent && fileContent.trim() !== '') {
          memoryCache[entry.name] = JSON.parse(fileContent);
        } else {
          memoryCache[entry.name] = entry.type === 'array' ? [] : {};
        }
      } catch (e) {
        console.error(`❌ ไม่สามารถอ่านไฟล์ ${entry.path} ได้:`, e);
        memoryCache[entry.name] = entry.type === 'array' ? [] : {};
      }
    } else {
      memoryCache[entry.name] = entry.type === 'array' ? [] : {};
    }
  }

  // 2. พยายามเชื่อมต่อ MongoDB (ระบบออนไลน์)
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ ไม่พบ MONGO_URI บอทจะทำงานในโหมด OFFLINE เท่านั้น (ระวัง! ข้อมูลใน Render อาจหายได้)");
    return;
  }

  try {
    console.log("⏳ ระบบก๊อก 2: กำลังเชื่อมต่อเข้าตู้เซฟคลาวด์ MongoDB...");
    
    // ตรวจสอบว่า MONGO_URI มีรหัสผ่านในตัวหรือใช้ placeholder
    let connUrl = process.env.MONGO_URI;
    if (connUrl.includes('<password>')) {
      if (!process.env.MONGO_PASS) {
        throw new Error("❌ พบ <password> ใน MONGO_URI แต่ไม่พบ MONGO_PASS ใน Environment Variables");
      }
      connUrl = connUrl.replace('<password>', process.env.MONGO_PASS);
    }

    await mongoose.connect(connUrl, {
      serverSelectionTimeoutMS: 5000
    });
    console.log("✅ เชื่อมต่อ MongoDB สำเร็จ! บอทกำลังออนไลน์และซิงค์ข้อมูล...");

    await Promise.all(filesToLoad.map(async (entry) => {
      try {
        const doc = await JSONFileModel.findById(entry.name).lean();
        
        if (doc) {
          if (entry.type === 'array') {
            memoryCache[entry.name] = doc.arrayData || [];
          } else {
            memoryCache[entry.name] = doc.data || {};
          }
          console.log(`🌐 [Online] โหลดไฟล์ "${entry.name}" จาก Cloud สำเร็จ`);
        } else {
          const localData = memoryCache[entry.name];
          const isEmpty = entry.type === 'array' ? localData.length === 0 : Object.keys(localData).length === 0;
          
          if (!isEmpty) {
            console.log(`📡 [Migrate] อัปโหลด "${entry.name}" ขึ้น Cloud...`);
            const update = entry.type === 'array' ? { arrayData: localData } : { data: localData };
            await JSONFileModel.findOneAndUpdate({ _id: entry.name }, { $set: update }, { upsert: true });
          } else {
            console.log(`🆕 [New] ไฟล์ "${entry.name}" เริ่มต้นใหม่...`);
            const update = entry.type === 'array' ? { arrayData: [] } : { data: {} };
            await JSONFileModel.findOneAndUpdate({ _id: entry.name }, { $set: update }, { upsert: true });
          }
        }
      } catch (err) {
        console.error(`❌ ผิดพลาดที่ไฟล์ ${entry.name}:`, err.message);
      }
    }));
    console.log("🎉 ทุกอย่างพร้อมแล้ว! ข้อมูลออนไลน์ 100% บอทมีแต่รวยไม่มีรีเซ็ตแน่นอน!");

  } catch (err) {
    console.error("❌ การเชื่อมต่อ MongoDB ล้มเหลว โปรดเช็กพาสเวิร์ดใน .env หรือ Firewall", err);
  }
}

function getCache(key) {
  return memoryCache[key];
}

function setCacheAndSave(key, newData, isArray = false) {
  // สั่งเซฟลง RAM ใช้งานแบบไวๆ
  memoryCache[key] = newData;

  // ส่งบันทึกเข้าตู้เซฟคลาวด์ผ่านเน็ตเป็นพื้นหลัง (Background Async Sync) ไม่ทำให้บอทสะดุด!
  if (mongoose.connection.readyState === 1) {
    if (isArray) {
      JSONFileModel.updateOne({ _id: key }, { $set: { arrayData: newData } }, { upsert: true }).catch(err => console.error(err));
    } else {
      JSONFileModel.updateOne({ _id: key }, { $set: { data: newData } }, { upsert: true }).catch(err => console.error(err));
    }
  }

  // เซฟลงไฟล์ในเครื่องตามเดิมเผื่อเอาไว้ดู (Render จะลบทิ้งก็ช่างมัน เพราะเราเซฟคลาวด์ไว้แล้ว)
  let localPath;
  if (key === 'config') localPath = 'config.json';
  else localPath = `data/${key}.json`;
  
  const fullPath = path.join(__dirname, '..', localPath);
  if (!fs.existsSync(path.dirname(fullPath))) {
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  }
  fs.writeFileSync(fullPath, JSON.stringify(newData, null, 2), 'utf8');
}

module.exports = {
  connectAndSyncAll,
  getCache,
  setCacheAndSave
};
