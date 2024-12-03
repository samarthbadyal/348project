const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const Team = require('../models/Team');

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