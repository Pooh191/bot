const mongoose = require('mongoose');

const lottoDrawSchema = new mongoose.Schema({
  drawDate: { type: String, required: true, unique: true }, // YYYY-MM-DD
  results: { 
    type: Map, 
    of: [String] 
  }, // { 'รางวัลที่ 1': ['1234'], 'รางวัลเลขหน้า 2 ตัว': ['12'], ... }
  announced: { type: Boolean, default: false },
  announcedBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('LottoDraw', lottoDrawSchema);
