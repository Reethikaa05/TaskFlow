const jwt = require('jsonwebtoken');
const { getDb } = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'taskmanager_secret_key_2024';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ error: 'Authentication required' });

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const { queryGet } = getDb();
    const user = queryGet('SELECT id, name, email, avatar, role, created_at FROM users WHERE id = ?', [decoded.userId]);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireProjectRole(...roles) {
  return (req, res, next) => {
    const { queryGet } = getDb();
    const projectId = req.params.projectId || req.body.project_id;
    const membership = queryGet('SELECT role FROM project_members WHERE project_id = ? AND user_id = ?', [projectId, req.user.id]);
    const project = queryGet('SELECT owner_id FROM projects WHERE id = ?', [projectId]);

    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (!membership && project.owner_id !== req.user.id)
      return res.status(403).json({ error: 'Access denied to this project' });

    const userRole = project.owner_id === req.user.id ? 'admin' : membership?.role;
    if (roles.length > 0 && !roles.includes(userRole))
      return res.status(403).json({ error: 'Insufficient permissions' });

    req.projectRole = userRole;
    next();
  };
}

module.exports = { authenticate, requireProjectRole, JWT_SECRET };
