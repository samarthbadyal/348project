const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Player = require('../models/Player');
const Team = require('../models/Team');

router.get(
  '/stats',
  [
    check('sortBy')
      .optional()
      .isIn(['points', 'assists', 'rebounds', 'steals', 'blocks'])
      .withMessage('Invalid sortBy field.'),
    check('perGame')
      .optional()
      .isIn(['true', 'false'])
      .withMessage('perGame must be "true" or "false".'),
    check('order')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('Order must be "asc" or "desc".'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { sortBy = 'points', perGame = 'false', order = 'desc' } = req.query;

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
              perGameStats: 1,
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
  }
);

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
router.get(
  '/:id',
  [check('id').isMongoId().withMessage('Invalid player ID').trim().escape()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const player = await Player.findById(req.params.id).populate('team', 'name city');
      if (!player) return res.status(404).json({ error: 'Player not found' });
      res.json(player);
    } catch (error) {
      res.status(500).json({ error: 'Error fetching the player' });
    }
  }
);

router.post(
  '/',
  [
    check('firstName').trim().escape().notEmpty().withMessage('First name is required.'),
    check('lastName').trim().escape().notEmpty().withMessage('Last name is required.'),
    check('team').optional().isMongoId().withMessage('Invalid team ID').trim().escape(),
    check('position')
      .trim()
      .escape()
      .isIn(['PG', 'SG', 'SF', 'PF', 'C'])
      .withMessage('Invalid position.'),
    check('heightCm')
      .isNumeric()
      .withMessage('Height must be a number.')
      .toFloat()
      .custom((value) => value > 0)
      .withMessage('Height must be greater than zero.'),
    check('weightLbs')
      .isNumeric()
      .withMessage('Weight must be a number.')
      .toFloat()
      .custom((value) => value > 0)
      .withMessage('Weight must be greater than zero.'),
    check('skill')
      .isInt({ min: 0, max: 99 })
      .withMessage('Skill level must be between 0 and 99.')
      .toInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { firstName, lastName, team, position, heightCm, weightLbs, skill } = req.body;

      if (team) {
        const teamData = await Team.findById(team).populate('roster');
        if (teamData.roster.length >= 5) {
          return res.status(400).json({ error: 'Team roster is full (maximum 5 players allowed).' });
        }
      }

      const newPlayer = new Player({
        firstName,
        lastName,
        team,
        position,
        heightCm,
        weightLbs,
        skill,
      });
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
  }
);

// Update a player
router.put(
  '/:id',
  [
    check('id').isMongoId().withMessage('Invalid player ID').trim().escape(),
    check('firstName').optional().trim().escape(),
    check('lastName').optional().trim().escape(),
    check('team').optional().isMongoId().withMessage('Invalid team ID').trim().escape(),
    check('position')
      .optional()
      .trim()
      .escape()
      .isIn(['PG', 'SG', 'SF', 'PF', 'C'])
      .withMessage('Invalid position.'),
    check('heightCm')
      .optional()
      .isNumeric()
      .withMessage('Height must be a number.')
      .toFloat()
      .custom((value) => value > 0)
      .withMessage('Height must be greater than zero.'),
    check('weightLbs')
      .optional()
      .isNumeric()
      .withMessage('Weight must be a number.')
      .toFloat()
      .custom((value) => value > 0)
      .withMessage('Weight must be greater than zero.'),
    check('skill')
      .optional()
      .isInt({ min: 0, max: 99 })
      .withMessage('Skill level must be between 0 and 99.')
      .toInt(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const updatedPlayer = await Player.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      });
      if (!updatedPlayer) return res.status(404).json({ error: 'Player not found' });
      res.json(updatedPlayer);
    } catch (error) {
      res.status(500).json({ error: 'Error updating the player' });
    }
  }
);

// Delete a player
router.delete(
  '/:id',
  [check('id').isMongoId().withMessage('Invalid player ID').trim().escape()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const deletedPlayer = await Player.findByIdAndDelete(req.params.id);
      if (!deletedPlayer) return res.status(404).json({ error: 'Player not found' });

      // Remove the player from the team's roster
      if (deletedPlayer.team) {
        const team = await Team.findById(deletedPlayer.team);
        if (team) {
          team.roster = team.roster.filter(
            (playerId) => playerId.toString() !== req.params.id
          );
          await team.save();
        }
      }

      res.json({ message: 'Player deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting the player' });
    }
  }
);

module.exports = router;