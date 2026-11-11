const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const locationRoutes = require('./routes/locations');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/locations', locationRoutes);

// Base route
app.get('/', (req, res) => {
  res.json({ message: '🎓 Campus Nav API is running!' });
});

// Socket.io — real-time crowd density
io.on('connection', async (socket) => {
  console.log('🔌 A user connected:', socket.id);

  // Fetch all location IDs from database
  const pool = require('./config/db');

  const sendCrowdUpdate = async () => {
    try {
      const result = await pool.query('SELECT id FROM locations');
      const densities = result.rows.map((loc) => ({
        locationId: loc.id,
        density: parseFloat(Math.random().toFixed(2)),
      }));

      socket.emit('crowd_update', { timestamp: new Date(), densities });

      // Also save snapshot to database
      const insertPromises = densities.map((d) =>
        pool.query(
          'INSERT INTO crowd_snapshots (location_id, density) VALUES ($1, $2)',
          [d.locationId, d.density]
        )
      );
      await Promise.all(insertPromises);

    } catch (err) {
      console.error('Crowd update error:', err);
    }
  };

  // Send immediately on connection
  await sendCrowdUpdate();

  // Then update every 10 seconds
  const crowdInterval = setInterval(sendCrowdUpdate, 10000);

  socket.on('disconnect', () => {
    console.log('🔌 User disconnected:', socket.id);
    clearInterval(crowdInterval);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});