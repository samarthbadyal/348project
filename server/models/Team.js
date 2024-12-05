const mongoose = require('mongoose');

const TeamSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  city: { type: String, required: true },
  roster: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Player' }],
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
}, { timestamps: true });

module.exports = mongoose.model('Team', TeamSchema);