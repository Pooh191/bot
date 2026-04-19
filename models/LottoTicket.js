const mongoose = require('mongoose');

const lottoTicketSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  drawDate: { type: String, required: true }, // YYYY-MM-DD format
  numbers: [{ type: String, required: true }], // array of 4-digit strings
  purchaseDate: { type: Date, default: Date.now },
  claimed: { type: Boolean, default: false },
  status: { type: String, default: 'active' } // active, won, lost
});

module.exports = mongoose.model('LottoTicket', lottoTicketSchema);
