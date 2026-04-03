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

// Cache หน่วยความจำหลักให้บอทวิ่งทำงานได้ไวปรี๊ดเหมือนเดิม
const memoryCache = {
  users: null,
  config: null,
  resources: null,
  history_logs: null,
  role_salaries: null,
  scheduled_messages: null
};

async function connectAndSyncAll() {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ ไม่พบ MONGO_URI ใช้ออฟไลน์โหมด");
    return;
  }

  try {
    console.log("⏳ กำลังเชื่อมต่อเข้าตู้เซฟคลาวด์ MongoDB...");
    const connUrl = process.env.MONGO_URI.replace('<password>', process.env.MONGO_PASS || '');
    await mongoose.connect(connUrl);
    console.log("✅ ว้าวุ่น! เชื่อมต่อ MongoDB ผ่านฉลุยแล้ว!");

    // ดึงข้อมูลทั้งหมดจาก MongoDB มาลงใน Cache RAM แบบเพียวร้อยเปอร์เซ็นต์ (ไม่เอา object wrapper ของ Mongoose)
    const docs = await JSONFileModel.find({}).lean();
    let dbHasData = false;

    for (const doc of docs) {
      if (doc._id === 'history_logs' || doc._id === 'scheduled_messages') {
        memoryCache[doc._id] = doc.arrayData || [];
      } else {
        memoryCache[doc._id] = doc.data || {};
      }
      dbHasData = true;
    }

    // 🔥 ระบบย้ายบ้านอัตโนมัติ (Migration): ถ้าเปิดบอทครั้งแรกและ MongoDB ว่างเปล่า ให้เอาไฟล์ .json ดั้งเดิมโยนเข้าไปโลด!
    if (!dbHasData) {
      console.log("🔄 เปิดตู้เซฟใหม่เอี่ยม... กำลังกวาดเงินจากไฟล์ json ทั้งหมดในคอมย้ายเข้าคลาวด์!");
      const filesToUpload = [
        { name: 'users', type: 'object', path: 'data/users.json' },
        { name: 'history_logs', type: 'array', path: 'data/history_logs.json' },
        { name: 'config', type: 'object', path: 'config.json' },
        { name: 'resources', type: 'object', path: 'data/resources.json' },
        { name: 'role_salaries', type: 'object', path: 'data/role_salaries.json' },
        { name: 'scheduled_messages', type: 'array', path: 'data/scheduled_messages.json' }
      ];

      for (const entry of filesToUpload) {
        const fullPath = path.join(__dirname, '..', entry.path);
        if (fs.existsSync(fullPath)) {
          console.log(`📡 ย้ายไฟล์ ${entry.name}.json...`);
          const fileData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
          memoryCache[entry.name] = fileData;
          if (entry.type === 'array') {
            await JSONFileModel.create({ _id: entry.name, arrayData: fileData });
          } else {
            await JSONFileModel.create({ _id: entry.name, data: fileData });
          }
        }
      }
      console.log("✅ ย้ายสำมะโนครัวเศรษฐกิจไทยเสร็จสิ้น 100%!");
    } else {
        console.log("✅ โหลดข้อมูลจากคลาวด์ลง RAM เสร็จแล้ว! ตัวบอทมีแต่รวยขึ้น ไม่มีรีเซ็ตแน่นอน!");
    }

  } catch (err) {
    console.error("❌ การเชื่อมต่อ MongoDB ล้มเหลว โปรดเช็กพาสเวิร์ดใน .env", err);
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
