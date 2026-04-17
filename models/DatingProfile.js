const mongoose = require('mongoose');

const datingProfileSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  nickname: { type: String, required: true },
  facebook: { type: String, default: '-' },
  instagram: { type: String, default: '-' },
  province: { type: String, required: true },
  extraInfo: { type: String, default: '' },
  likesReceived: [{ type: String }],
  likesGiven: [{ type: String }],
  matches: [{ type: String }],
  gender: { type: String, default: 'ไม่ระบุ' },
  lookingFor: { type: String, default: 'ไม่ระบุ' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Middleware เพื่ออัปเดตเวลา updatedAt อัตโนมัติ
datingProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('DatingProfile', datingProfileSchema);
