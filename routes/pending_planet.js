const express = require('express');
const router = express.Router();
const PendingPlanet = require('../models/PendingPlanet'); // Adjust the path as needed
const Planet = require('../models/Planet'); // Adjust the path as needed

// Route to render planets index
router.get('/planets', (req, res) => {
  res.render('planets/index', { planets: Planet.list(), errors: req.query.errors, message: req.query.message });
});

// Route to render pending planets index

module.exports = router;