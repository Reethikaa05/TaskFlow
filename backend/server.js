const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDb } = require('./config/database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

initDb().then(() => {
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/projects', require('./routes/projects'));
  app.use('/api/projects/:projectId/tasks', require('./routes/tasks'));
  app.use('/api/dashboard', require('./routes/dashboard'));
  app.use('/api/admin', require('./routes/admin'));
  app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  // Serve built frontend in production
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  const fs = require('fs');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(frontendDist, 'index.html'));
      }
    });
    console.log('📁 Serving built frontend from /frontend/dist');
  }

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Internal server error' });
  });

  app.listen(PORT, () => {
    console.log(`🚀 TaskFlow running on http://localhost:${PORT}`);
    console.log(`📦 SQLite database ready`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
