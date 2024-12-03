const mongoose = require('mongoose');

const PlayerSchema = new mongoose.Schema({
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
    gamesPlayed: { type: Number, default: 0 }
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  
},
{ 
  indexes: [{ unique: true, fields: ['firstName', 'lastName'] }] 
});

module.exports = mongoose.model('Player', PlayerSchema);