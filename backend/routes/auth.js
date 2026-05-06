const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

router.post('/signup', [
  body('name').trim().isLength({ min: 2, max: 50 }),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  const { queryGet, queryRun } = getDb();
  try {
    const existing = queryGet('SELECT id FROM users WHERE email = ?', [email]);
    if (existing) return res.status(409).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 12);
    const id = uuidv4();
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=128`;
    const countRes = queryGet('SELECT COUNT(*) as count FROM users');
    const role = countRes.count === 0 ? 'admin' : 'member';
    queryRun('INSERT INTO users (id, name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?, ?)', [id, name, email, hashed, avatar, role]);
    const token = jwt.sign({ userId: id }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, user: { id, name, email, avatar, role } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  const { queryGet } = getDb();
  try {
    const user = queryGet('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, avatar: user.avatar, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

router.put('/profile', authenticate, [body('name').optional().trim().isLength({ min: 2, max: 50 })], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name } = req.body;
  const { queryGet, queryRun } = getDb();
  try {
    if (name) {
      const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6366f1&color=fff&size=128`;
      queryRun("UPDATE users SET name = ?, avatar = ?, updated_at = datetime('now') WHERE id = ?", [name, avatar, req.user.id]);
    }
    const updated = queryGet('SELECT id, name, email, avatar, role FROM users WHERE id = ?', [req.user.id]);
    res.json({ user: updated });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

router.put('/password', authenticate, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { currentPassword, newPassword } = req.body;
  const { queryGet, queryRun } = getDb();
  try {
    const user = queryGet('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hashed = await bcrypt.hash(newPassword, 12);
    queryRun("UPDATE users SET password = ?, updated_at = datetime('now') WHERE id = ?", [hashed, req.user.id]);
    res.json({ message: 'Password updated' });
  } catch (err) { res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
