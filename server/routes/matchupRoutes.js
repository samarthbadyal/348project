const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Game = require('../models/Game');
const Team = require('../models/Team');
const Player = require('../models/Player');
const mongoose = require('mongoose');

router.get('/', async (req, res) => {
  try {
    const games = await Game.find()
      .populate('homeTeam awayTeam', 'name city')
      .populate({
        path: 'playerStats.player',
        select: 'firstName lastName position',
      })
      .populate({
        path: 'playerStats.team',
        select: 'name',
      });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching games' });
  }
});

// Get a specific game by ID
router.get(
  '/:id',
  [check('id').isMongoId().withMessage('Invalid game ID').trim().escape()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const game = await Game.findById(req.params.id)
        .populate('homeTeam awayTeam', 'name city')
        .populate({
          path: 'playerStats.player',
          select: 'firstName lastName position',
        })
        .populate({
          path: 'playerStats.team',
          select: 'name',
        });
      if (!game) return res.status(404).json({ error: 'Game not found' });
      res.json(game);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching the game' });
    }
  }
);




// Simulate a game
router.post(
  '/:id/simulate', 
  [check('id').isMongoId().withMessage('Invalid game ID').trim().escape()],
  async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Fetch the game
    const game = await Game.findById(req.params.id)
      .populate({
        path: 'homeTeam',
        populate: { path: 'roster', model: 'Player' },
      })
      .populate({
        path: 'awayTeam',
        populate: { path: 'roster', model: 'Player' },
      })
      .session(session);

    if (!game) throw new Error('Game not found');
    if (game.simulated) throw new Error('Game has already been simulated');

    let homeTeamScore = 0;
    let awayTeamScore = 0;
    const playerStats = [];

    // Simulate player stats and calculate scores
    for (const player of game.homeTeam.roster) {
      const stats = simulatePlayerStats(player);
      playerStats.push({ player: player._id, team: game.homeTeam._id, ...stats });
      homeTeamScore += stats.points;
    }

    for (const player of game.awayTeam.roster) {
      const stats = simulatePlayerStats(player);
      playerStats.push({ player: player._id, team: game.awayTeam._id, ...stats });
      awayTeamScore += stats.points;
    }

    // Update the game's stats
    game.homeTeamScore = homeTeamScore;
    game.awayTeamScore = awayTeamScore;
    game.playerStats = playerStats;
    game.simulated = true;
    await game.save({ session });

    // Update team records
    if (homeTeamScore > awayTeamScore) {
      await Team.updateOne(
        { _id: game.homeTeam._id },
        { $inc: { wins: 1 } },
        { session }
      );
      await Team.updateOne(
        { _id: game.awayTeam._id },
        { $inc: { losses: 1 } },
        { session }
      );
    } else if (awayTeamScore > homeTeamScore) {
      await Team.updateOne(
        { _id: game.awayTeam._id },
        { $inc: { wins: 1 } },
        { session }
      );
      await Team.updateOne(
        { _id: game.homeTeam._id },
        { $inc: { losses: 1 } },
        { session }
      );
    }

    // Update player stats
    for (const stat of playerStats) {
      await Player.updateOne(
        { _id: stat.player },
        {
          $inc: {
            'stats.points': stat.points,
            'stats.assists': stat.assists,
            'stats.rebounds': stat.rebounds,
            'stats.steals': stat.steals,
            'stats.blocks': stat.blocks,
            'stats.gamesPlayed': 1,
          },
        },
        { session }
      );
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    res.json(game);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ error: error.message });
  }
});

// Simulation function
function simulatePlayerStats(player) {
  const skillFactor = player.skill / 100; // Normalize skill to [0,1]

  // Position-based weights
  let positionWeights = {
    points: 1,
    assists: 1,
    rebounds: 1,
    steals: 1,
    blocks: 1,
  };

  switch (player.position) {
    case 'PG':
      positionWeights = { points: 1, assists: 1.5, rebounds: 0.5, steals: 1, blocks: 0.5 };
      break;
    case 'SG':
      positionWeights = { points: 1.2, assists: 1, rebounds: 0.6, steals: 1, blocks: 0.6 };
      break;
    case 'SF':
      positionWeights = { points: 1, assists: 0.8, rebounds: 1, steals: 0.8, blocks: 0.8 };
      break;
    case 'PF':
      positionWeights = { points: 0.8, assists: 0.6, rebounds: 1.2, steals: 0.6, blocks: 1 };
      break;
    case 'C':
      positionWeights = { points: 0.7, assists: 0.5, rebounds: 1.5, steals: 0.5, blocks: 1.5 };
      break;
    default:
      positionWeights = { points: 1, assists: 1, rebounds: 1, steals: 1, blocks: 1 };
      break;
  }

  // Height and weight factor for rebounds
  const heightFactor = player.heightCm / 210; // Max height 210cm
  const weightFactor = player.weightLbs / 280; // Max weight 280lbs
  const reboundFactor = (heightFactor + weightFactor) / 2;

  const points = Math.round((skillFactor * 30 + randVariance(10)) * positionWeights.points);
  const assists = Math.round((skillFactor * 10 + randVariance(5)) * positionWeights.assists);
  const rebounds = Math.round(
    (skillFactor * 10 + randVariance(5)) * positionWeights.rebounds * reboundFactor
  );
  const steals = Math.round((skillFactor * 5 + randVariance(2)) * positionWeights.steals);
  const blocks = Math.round(
    (skillFactor * 5 + randVariance(2)) * positionWeights.blocks * heightFactor
  );

  return {
    points: Math.max(0, points),
    assists: Math.max(0, assists),
    rebounds: Math.max(0, rebounds),
    steals: Math.max(0, steals),
    blocks: Math.max(0, blocks),
  };
}

function randVariance(max) {
  return (Math.random() - 0.5) * max;
}

// Create a new game
router.post(
  '/',
  [
    check('homeTeam').isMongoId().withMessage('Invalid home team ID').trim().escape(),
    check('awayTeam').isMongoId().withMessage('Invalid away team ID').trim().escape(),
    check('date').isISO8601().withMessage('Invalid date').toDate(),
    check('location').trim().escape().notEmpty().withMessage('Location is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Extract validation errors and send them in the response
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { homeTeam, awayTeam, date, location } = req.body;
      const newGame = new Game({ homeTeam, awayTeam, date, location });
      await newGame.save();
      res.status(201).json(newGame);
    } catch (error) {
      if (error.name === 'ValidationError') {
        // Extract validation errors and send them in the response
        const errors = {};
        for (const field in error.errors) {
          errors[field] = error.errors[field].message;
        }
        res.status(400).json({ errors });
      } else {
        res.status(500).json({ error: 'Error creating game' });
      }
    }
  }
);

// Update a game
router.put(
  '/:id',
  [
    check('id').isMongoId().withMessage('Invalid game ID').trim().escape(),
    check('homeTeam')
      .optional()
      .isMongoId()
      .withMessage('Invalid home team ID')
      .trim()
      .escape(),
    check('awayTeam')
      .optional()
      .isMongoId()
      .withMessage('Invalid away team ID')
      .trim()
      .escape(),
    check('date').optional().isISO8601().withMessage('Invalid date').toDate(),
    check('location').optional().trim().escape(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Extract validation errors and send them in the response
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      // Check if the game exists and is simulated
      const game = await Game.findById(req.params.id);
      if (!game) return res.status(404).json({ error: 'Game not found' });

      if (game.simulated) {
        return res.status(400).json({ error: 'Simulated games cannot be edited.' });
      }

      // Proceed with the update
      const updatedGame = await Game.findByIdAndUpdate(req.params.id, req.body);
      res.json(updatedGame);
    } catch (error) {
      if (error.name === 'ValidationError') {
        // Extract validation errors and send them in the response
        const errors = {};
        for (const field in error.errors) {
          errors[field] = error.errors[field].message;
        }

        res.status(400).json({ errors });
      } else {
        res.status(500).json({ error: 'Error updating the game' });
      }
    }
  }
);
// Delete a game
router.delete(
  '/:id',
  [check('id').isMongoId().withMessage('Invalid game ID').trim().escape()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      // Extract validation errors and send them in the response
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const game = await Game.findById(req.params.id);
      if (!game) return res.status(404).json({ error: 'Game not found' });

      // Check if the game has been simulated
      if (game.simulated) {
        return res.status(400).json({ error: 'Simulated games cannot be deleted.' });
      }

      await Game.findByIdAndDelete(req.params.id);
      res.json({ message: 'Game deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting the game' });
    }
  }
);

module.exports = router;