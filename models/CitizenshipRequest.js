const mongoose = require('mongoose');

const citizenshipRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  fullName: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  processedAt: { type: Date },
  processedBy: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CitizenshipRequest', citizenshipRequestSchema);