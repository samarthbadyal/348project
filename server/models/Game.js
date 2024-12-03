const mongoose = require('mongoose');


const GameSchema = new mongoose.Schema({
  homeTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true
  },
  awayTeam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: true,
    validate: {
      validator: function(value) {
        // Ensure homeTeam and awayTeam are different
        return value.toString() !== this.homeTeam.toString();
      },
      message: 'Home team and away team must be different.'
    }
  },
  date: {
    type: Date,
    required: true,
    validate: {
      validator: function(value) {
        // Ensure the date is not in the past
        return value >= new Date();
      },
      message: 'Game date cannot be in the past.'
    }
  },
  location: {
    type: String,
    required: true
  },
  homeTeamScore: {
    type: Number,
    default: 0
  },
  awayTeamScore: {
    type: Number,
    default: 0
  },
  playerStats: [
    {
      player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player' },
      points: { type: Number, default: 0 },
      assists: { type: Number, default: 0 },
      rebounds: { type: Number, default: 0 },
      steals: { type: Number, default: 0 },
      blocks: { type: Number, default: 0 }
    }
  ],
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-validate hook to ensure date and teams are valid
GameSchema.pre('validate', function(next) {
  if (this.homeTeam.equals(this.awayTeam)) {
    this.invalidate('awayTeam', 'Home team and away team must be different.');
  }
  if (this.date < new Date()) {
    this.invalidate('date', 'Game date cannot be in the past.');
  }
  next();
});

module.exports = mongoose.model('Game', GameSchema);