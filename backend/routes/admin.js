const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// Middleware to check if user is a global admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

router.use(authenticate);
router.use(requireAdmin);

// Get all users
router.get('/users', (req, res) => {
  const { queryAll } = getDb();
  try {
    const users = queryAll('SELECT id, name, email, avatar, role, created_at FROM users ORDER BY created_at DESC');
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user role
router.put('/users/:id/role', (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }
  
  if (id === req.user.id && role !== 'admin') {
    return res.status(400).json({ error: 'Cannot demote yourself' });
  }

  const { queryRun, queryGet } = getDb();
  try {
    const user = queryGet('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    queryRun("UPDATE users SET role = ?, updated_at = datetime('now') WHERE id = ?", [role, id]);
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a user
router.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  
  if (id === req.user.id) {
    return res.status(400).json({ error: 'Cannot delete yourself' });
  }

  const { queryRun, queryGet } = getDb();
  try {
    const user = queryGet('SELECT id FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'User not found' });

    queryRun('DELETE FROM users WHERE id = ?', [id]);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get raw database content for viewing
router.get('/db', (req, res) => {
  const { queryAll } = getDb();
  try {
    const tables = queryAll("SELECT name FROM sqlite_master WHERE type='table'");
    const dbData = {};
    for (let table of tables) {
      if (table.name !== 'sqlite_sequence') {
        dbData[table.name] = queryAll(`SELECT * FROM ${table.name}`);
      }
    }
    res.json({ db: dbData });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
