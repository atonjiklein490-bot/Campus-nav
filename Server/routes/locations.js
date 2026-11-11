const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// Get all locations (public)
router.get('/', async (req, res) => {
  try {
    const locations = await pool.query(
      'SELECT * FROM locations ORDER BY name ASC'
    );
    res.json(locations.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Get single location by ID (public)
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const location = await pool.query(
      'SELECT * FROM locations WHERE id = $1', [id]
    );

    if (location.rows.length === 0) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    res.json(location.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Add new location (protected)
router.post('/', authMiddleware, async (req, res) => {
  const { name, type, latitude, longitude, capacity, description } = req.body;

  try {
    const newLocation = await pool.query(
      `INSERT INTO locations (name, type, latitude, longitude, capacity, description)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, type, latitude, longitude, capacity, description]
    );

    res.status(201).json(newLocation.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Update location (protected)
router.put('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;
  const { name, type, latitude, longitude, capacity, description } = req.body;

  try {
    const updated = await pool.query(
      `UPDATE locations SET name=$1, type=$2, latitude=$3, longitude=$4,
       capacity=$5, description=$6 WHERE id=$7 RETURNING *`,
      [name, type, latitude, longitude, capacity, description, id]
    );

    if (updated.rows.length === 0) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// Delete location (protected)
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params;

  try {
    const deleted = await pool.query(
      'DELETE FROM locations WHERE id = $1 RETURNING *', [id]
    );

    if (deleted.rows.length === 0) {
      return res.status(404).json({ message: 'Location not found.' });
    }

    res.json({ message: 'Location deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;