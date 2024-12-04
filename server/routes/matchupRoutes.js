const express = require('express');
const router = express.Router();
const Game = require('../models/Game');
const Team = require('../models/Team');
const Player = require('../models/Player');

router.get('/', async (req, res) => {
  try {
    const games = await Game.find()
      .populate('homeTeam awayTeam', 'name city')
      .populate({
        path: 'playerStats.player',
        select: 'firstName lastName position'
      })
      .populate({
        path: 'playerStats.team',
        select: 'name'
      });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching games' });
  }
});

// Get a specific game by ID
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate('homeTeam awayTeam', 'name city')
      .populate({
        path: 'playerStats.player',
        select: 'firstName lastName position'
      })
      .populate({
        path: 'playerStats.team',
        select: 'name'
      });
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching the game' });
  }
});

// Simulate a game
router.post('/:id/simulate', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id)
      .populate({
        path: 'homeTeam',
        populate: {
          path: 'roster',
          model: 'Player'
        }
      })
      .populate({
        path: 'awayTeam',
        populate: {
          path: 'roster',
          model: 'Player'
        }
      });

    if (!game) return res.status(404).json({ error: 'Game not found' });

    if (game.simulated) {
      return res.status(400).json({ error: 'Game has already been simulated' });
    }

    const homeTeamPlayers = game.homeTeam.roster;
    const awayTeamPlayers = game.awayTeam.roster;

    let homeTeamScore = 0;
    let awayTeamScore = 0;

    let playerStats = [];

    // Simulate stats for home team players
    for (const player of homeTeamPlayers) {
      const stats = simulatePlayerStats(player);
      playerStats.push({
        player: player._id,
        team: game.homeTeam._id,
        ...stats
      });
      homeTeamScore += stats.points;
    }

    // Simulate stats for away team players
    for (const player of awayTeamPlayers) {
      const stats = simulatePlayerStats(player);
      playerStats.push({
        player: player._id,
        team: game.awayTeam._id,
        ...stats
      });
      awayTeamScore += stats.points;
    }

    // Update game with stats
    game.homeTeamScore = homeTeamScore;
    game.awayTeamScore = awayTeamScore;
    game.playerStats = playerStats;
    game.simulated = true;

    // Update team records
    const homeTeam = await Team.findById(game.homeTeam._id);
    const awayTeam = await Team.findById(game.awayTeam._id);

    if (homeTeamScore > awayTeamScore) {
      homeTeam.wins += 1;
      awayTeam.losses += 1;
    } else if (awayTeamScore > homeTeamScore) {
      awayTeam.wins += 1;
      homeTeam.losses += 1;
    }

    await homeTeam.save();
    await awayTeam.save();

    // Update cumulative player stats
    for (const stat of playerStats) {
      const player = await Player.findById(stat.player);
      if (player) {
        player.stats.points += stat.points;
        player.stats.assists += stat.assists;
        player.stats.rebounds += stat.rebounds;
        player.stats.steals += stat.steals;
        player.stats.blocks += stat.blocks;
        player.stats.gamesPlayed += 1;
        await player.save();
      }
    }

    await game.save();

    res.json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error simulating the game' });
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
    blocks: 1
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
  const rebounds = Math.round((skillFactor * 10 + randVariance(5)) * positionWeights.rebounds * reboundFactor);
  const steals = Math.round((skillFactor * 5 + randVariance(2)) * positionWeights.steals);
  const blocks = Math.round((skillFactor * 5 + randVariance(2)) * positionWeights.blocks * heightFactor);

  return {
    points: Math.max(0, points),
    assists: Math.max(0, assists),
    rebounds: Math.max(0, rebounds),
    steals: Math.max(0, steals),
    blocks: Math.max(0, blocks)
  };
}

function randVariance(max) {
  return (Math.random() - 0.5) * max;
}
// Create a new game
router.post('/', async (req, res) => {
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
});

// Update a game
router.put('/:id', async (req, res) => {
  try {
    const updatedGame = await Game.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedGame) return res.status(404).json({ error: 'Game not found' });
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
});

// Delete a game
router.delete('/:id', async (req, res) => {
  try {
    const deletedGame = await Game.findByIdAndDelete(req.params.id);
    if (!deletedGame) return res.status(404).json({ error: 'Game not found' });
    res.json({ message: 'Game deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting the game' });
  }
});

module.exports = router;