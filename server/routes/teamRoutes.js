const express = require('express');
const router = express.Router();
const Team = require('../models/Team');

// Fetch all teams
router.get('/', async (req, res) => {
  try {
    const teams = await Team.find();
    res.json(teams);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching teams' });
  }
});

// Create a new team
router.post('/', async (req, res) => {
  try {
    const { name, city, logoUrl } = req.body;
    const newTeam = new Team({ name, city, logoUrl });
    await newTeam.save();
    res.status(201).json(newTeam);
  } catch (error) {
    res.status(500).json({ error: 'Error creating team' });
  }
});

// Update a team
router.put('/:id', async (req, res) => {
  try {
    const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!updatedTeam) return res.status(404).json({ error: 'Team not found' });
    res.json(updatedTeam);
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      res.status(400).json({ error: 'Team name must be unique.' });
    } else if (error.name === 'ValidationError') {
      const errors = {};
      for (const field in error.errors) {
        errors[field] = error.errors[field].message;
      }
      res.status(400).json({ errors });
    } else {
      res.status(500).json({ error: 'Error updating the team' });
    }
  }
});

// Delete a team
router.delete('/:id', async (req, res) => {
  try {
    const deletedTeam = await Team.findByIdAndDelete(req.params.id);
    if (!deletedTeam) return res.status(404).json({ error: 'Team not found' });
    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error deleting the team' });
  }
});


module.exports = router;