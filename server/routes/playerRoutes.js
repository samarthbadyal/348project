const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Team = require('../models/Team');

router.get('/stats', async (req, res) => {
  try {
    const { sortBy = 'points', perGame = 'false', order = 'desc' } = req.query;

    const validFields = ['points', 'assists', 'rebounds', 'steals', 'blocks'];
    if (!validFields.includes(sortBy)) {
      return res.status(400).json({ error: 'Invalid sortBy field.' });
    }

    const sortOrder = order === 'asc' ? 1 : -1;

    if (perGame === 'true') {
      const players = await Player.aggregate([
        {
          $addFields: {
            perGameStats: {
              points: {
                $divide: [
                  { $ifNull: ['$stats.points', 0] },
                  {
                    $cond: [
                      { $gt: ['$stats.gamesPlayed', 0] },
                      '$stats.gamesPlayed',
                      1,
                    ],
                  },
                ],
              },
              assists: {
                $divide: [
                  { $ifNull: ['$stats.assists', 0] },
                  {
                    $cond: [
                      { $gt: ['$stats.gamesPlayed', 0] },
                      '$stats.gamesPlayed',
                      1,
                    ],
                  },
                ],
              },
              rebounds: {
                $divide: [
                  { $ifNull: ['$stats.rebounds', 0] },
                  {
                    $cond: [
                      { $gt: ['$stats.gamesPlayed', 0] },
                      '$stats.gamesPlayed',
                      1,
                    ],
                  },
                ],
              },
              steals: {
                $divide: [
                  { $ifNull: ['$stats.steals', 0] },
                  {
                    $cond: [
                      { $gt: ['$stats.gamesPlayed', 0] },
                      '$stats.gamesPlayed',
                      1,
                    ],
                  },
                ],
              },
              blocks: {
                $divide: [
                  { $ifNull: ['$stats.blocks', 0] },
                  {
                    $cond: [
                      { $gt: ['$stats.gamesPlayed', 0] },
                      '$stats.gamesPlayed',
                      1,
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $sort: { [`perGameStats.${sortBy}`]: sortOrder },
        },
        {
          $lookup: {
            from: 'teams',
            localField: 'team',
            foreignField: '_id',
            as: 'team',
          },
        },
        {
          $unwind: {
            path: '$team',
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            firstName: 1,
            lastName: 1,
            team: { name: 1, city: 1 },
            stats: 1,
            perGameStats: 1, // Ensure perGameStats is included
          },
        },
      ]);
    
      return res.json(players);
    } else {
      const players = await Player.find()
        .populate('team', 'name city')
        .sort({ [`stats.${sortBy}`]: sortOrder });

      return res.json(players);
    }
  } catch (error) {
    console.error('Error fetching player stats:', {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ error: 'Error fetching player stats' });
  }
});

// Get all players
router.get('/', async (req, res) => {
  try {
    const players = await Player.find().populate('team', 'name city');
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching players' });
  }
});

// Get a specific player by ID
router.get('/:id', async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).populate('team', 'name city');
    if (!player) return res.status(404).json({ error: 'Player not found' });
    res.json(player);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching the player' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { firstName, lastName, team, position, heightCm, weightLbs, skill } = req.body;

    if (team) {
      const teamData = await Team.findById(team).populate('roster');
      if (teamData.roster.length >= 5) {
        return res.status(400).json({ error: 'Team roster is full (maximum 5 players allowed).' });
      }
    }

    const newPlayer = new Player({ firstName, lastName, team, position, heightCm, weightLbs, skill });
    await newPlayer.save();

    if (team) {
      const teamData = await Team.findById(team);
      teamData.roster.push(newPlayer._id);
      await teamData.save();
    }

    res.status(201).json(newPlayer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error creating player.' });
  }
});

// Update a player
router.put('/:id', async (req, res) => {
  try {
    const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPlayer) return res.status(404).json({ error: 'Player not found' });
    res.json(updatedPlayer);
  } catch (error) {
    res.status(500).json({ error: 'Error updating the player' });
  }
});

// Delete a player
router.delete('/:id', async (req, res) => {
  try {
    const deletedPlayer = await Player.findByIdAndDelete(req.params.id);
    if (!deletedPlayer) return res.status(404).json({ error: 'Player not found' });

    // Remove the player from the team's roster
    if (deletedPlayer.team) {
      const team = await Team.findById(deletedPlayer.team);
      if (team) {
        team.roster = team.roster.filter(playerId => playerId.toString() !== req.params.id);
        await team.save();
      }
    }

    res.json({ message: 'Player deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting the player' });
  }
});



module.exports = router;