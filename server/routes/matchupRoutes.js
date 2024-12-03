const express = require('express');
const router = express.Router();
const Game = require('../models/Game');

// Get all games
router.get('/', async (req, res) => {
  try {
    const games = await Game.find().populate('homeTeam awayTeam', 'name city');
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching games' });
  }
});

// Get a specific game by ID
router.get('/:id', async (req, res) => {
  try {
    const game = await Game.findById(req.params.id).populate('homeTeam awayTeam', 'name city');
    if (!game) return res.status(404).json({ error: 'Game not found' });
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching the game' });
  }
});

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