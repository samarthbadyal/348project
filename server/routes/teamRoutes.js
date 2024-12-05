const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
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
router.post(
  '/',
  [
    check('name').trim().escape().notEmpty().withMessage('Team name is required.'),
    check('city').trim().escape().notEmpty().withMessage('City is required.'),
    
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const { name, city } = req.body;
      const newTeam = new Team({ name, city });
      await newTeam.save();
      res.status(201).json(newTeam);
    } catch (error) {
      res.status(500).json({ error: 'Error creating team' });
    }
  }
);

// Update a team
router.put(
  '/:id',
  [
    check('id').isMongoId().withMessage('Invalid team ID').trim().escape(),
    check('name').optional().trim().escape(),
    check('city').optional().trim().escape(),
   
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true,
      });
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
  }
);

// Delete a team
router.delete(
  '/:id',
  [check('id').isMongoId().withMessage('Invalid team ID').trim().escape()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const deletedTeam = await Team.findByIdAndDelete(req.params.id);
      if (!deletedTeam) return res.status(404).json({ error: 'Team not found' });
      res.json({ message: 'Team deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Error deleting the team' });
    }
  }
);

module.exports = router;