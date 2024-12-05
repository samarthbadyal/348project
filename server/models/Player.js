const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team' }, // Reference to team
    position: { type: String, enum: ['PG', 'SG', 'SF', 'PF', 'C'], required: true }, // Position enum
    heightCm: { type: Number, required: true }, // Height in cm
    weightLbs: { type: Number, required: true }, // Weight in lbs
    skill: { type: Number, min: 0, max: 99, required: true }, // Skill level (0-99)
    stats: {
      points: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      rebounds: { type: Number, default: 0 },
      steals: { type: Number, default: 0 },
      blocks: { type: Number, default: 0 },
      gamesPlayed: { type: Number, default: 0 },
    },
  },
  { timestamps: true } 
);

// Indexes for efficient queries
PlayerSchema.index({ firstName: 1, lastName: 1 }, { unique: true }); // Unique player name
PlayerSchema.index({ 'stats.points': -1, 'stats.gamesPlayed': -1 });
PlayerSchema.index({ 'stats.assists': -1, 'stats.gamesPlayed': -1 });
PlayerSchema.index({ 'stats.rebounds': -1, 'stats.gamesPlayed': -1 });
PlayerSchema.index({ 'stats.steals': -1, 'stats.gamesPlayed': -1 });
PlayerSchema.index({ 'stats.blocks': -1, 'stats.gamesPlayed': -1 });

// Text index for searching by name
PlayerSchema.index({ firstName: 'text', lastName: 'text' });

module.exports = mongoose.model('Player', PlayerSchema);