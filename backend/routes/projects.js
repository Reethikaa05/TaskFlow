const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

function logActivity(queryRun, userId, projectId, taskId, action, details) {
  try { queryRun('INSERT INTO activity_log (id,user_id,project_id,task_id,action,details) VALUES (?,?,?,?,?,?)',
    [uuidv4(), userId, projectId, taskId, action, details]); } catch(e) {}
}

// GET all projects for user
router.get('/', authenticate, (req, res) => {
  const { queryAll, queryGet } = getDb();
  const userId = req.user.id;
  const projects = queryAll(`
    SELECT p.*, u.name as owner_name, u.avatar as owner_avatar,
      pm2.role as my_role
    FROM projects p
    JOIN users u ON u.id = p.owner_id
    LEFT JOIN project_members pm2 ON pm2.project_id = p.id AND pm2.user_id = ?
    WHERE p.owner_id = ? OR pm2.user_id = ?
    ORDER BY p.created_at DESC
  `, [userId, userId, userId]);

  const enriched = projects.map(p => {
    const counts = queryGet('SELECT COUNT(*) as total, SUM(CASE WHEN status="done" THEN 1 ELSE 0 END) as done FROM tasks WHERE project_id=?', [p.id]);
    const memberCount = queryGet('SELECT COUNT(*) as cnt FROM project_members WHERE project_id=?', [p.id]);
    const task_count = counts?.total || 0;
    const done_count = counts?.done || 0;
    return {
      ...p,
      task_count, done_count,
      member_count: memberCount?.cnt || 0,
      my_role: p.owner_id === userId ? 'admin' : p.my_role,
      progress: task_count > 0 ? Math.round((done_count / task_count) * 100) : 0
    };
  });
  res.json({ projects: enriched });
});

// GET single project
router.get('/:projectId', authenticate, requireProjectRole(), (req, res) => {
  const { queryGet, queryAll } = getDb();
  const project = queryGet(`
    SELECT p.*, u.name as owner_name, u.avatar as owner_avatar
    FROM projects p JOIN users u ON u.id = p.owner_id WHERE p.id = ?
  `, [req.params.projectId]);

  const counts = queryGet('SELECT COUNT(*) as total, SUM(CASE WHEN status="done" THEN 1 ELSE 0 END) as done FROM tasks WHERE project_id=?', [req.params.projectId]);
  const members = queryAll(`
    SELECT u.id, u.name, u.email, u.avatar, pm.role, pm.joined_at
    FROM project_members pm JOIN users u ON u.id = pm.user_id WHERE pm.project_id = ?
  `, [req.params.projectId]);
  const owner = queryGet('SELECT id, name, email, avatar FROM users WHERE id = ?', [project.owner_id]);
  const allMembers = [{ ...owner, role: 'admin', joined_at: project.created_at }, ...members.filter(m => m.id !== owner.id)];
  const task_count = counts?.total || 0;
  const done_count = counts?.done || 0;

  res.json({ project: {
    ...project, task_count, done_count, members: allMembers, my_role: req.projectRole,
    progress: task_count > 0 ? Math.round((done_count / task_count) * 100) : 0
  }});
});

// POST create project
router.post('/', authenticate, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('description').optional().trim(),
  body('color').optional(),
  body('due_date').optional(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { name, description, color = '#6366f1', due_date } = req.body;
  const { queryGet, queryRun } = getDb();
  try {
    const id = uuidv4();
    queryRun('INSERT INTO projects (id,name,description,color,owner_id,due_date) VALUES (?,?,?,?,?,?)',
      [id, name, description || null, color, req.user.id, due_date || null]);
    queryRun('INSERT INTO project_members (id,project_id,user_id,role) VALUES (?,?,?,?)',
      [uuidv4(), id, req.user.id, 'admin']);
    logActivity(queryRun, req.user.id, id, null, 'project_created', `Created project "${name}"`);
    const project = queryGet('SELECT * FROM projects WHERE id = ?', [id]);
    res.status(201).json({ project: { ...project, my_role: 'admin', task_count: 0, done_count: 0, progress: 0, member_count: 1 } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create project' }); }
});

// PUT update project
router.put('/:projectId', authenticate, requireProjectRole('admin'), [
  body('name').optional().trim().isLength({ min: 1, max: 100 }),
  body('status').optional().isIn(['active', 'completed', 'archived']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { queryGet, queryRun } = getDb();
  const { name, description, status, color, due_date } = req.body;
  try {
    const sets = []; const vals = [];
    if (name !== undefined) { sets.push('name=?'); vals.push(name); }
    if (description !== undefined) { sets.push('description=?'); vals.push(description); }
    if (status !== undefined) { sets.push('status=?'); vals.push(status); }
    if (color !== undefined) { sets.push('color=?'); vals.push(color); }
    if (due_date !== undefined) { sets.push('due_date=?'); vals.push(due_date || null); }
    sets.push("updated_at=datetime('now')");
    vals.push(req.params.projectId);
    queryRun(`UPDATE projects SET ${sets.join(',')} WHERE id=?`, vals);
    logActivity(queryRun, req.user.id, req.params.projectId, null, 'project_updated', 'Updated project');
    const project = queryGet('SELECT * FROM projects WHERE id=?', [req.params.projectId]);
    res.json({ project });
  } catch (err) { res.status(500).json({ error: 'Failed to update project' }); }
});

// DELETE project
router.delete('/:projectId', authenticate, (req, res) => {
  const { queryGet, queryRun } = getDb();
  const project = queryGet('SELECT * FROM projects WHERE id=?', [req.params.projectId]);
  if (!project) return res.status(404).json({ error: 'Project not found' });
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete' });
  queryRun('DELETE FROM projects WHERE id=?', [req.params.projectId]);
  res.json({ message: 'Project deleted' });
});

// POST add member
router.post('/:projectId/members', authenticate, requireProjectRole('admin'), [
  body('email').isEmail().normalizeEmail(),
  body('role').optional().isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, role = 'member' } = req.body;
  const { queryGet, queryRun } = getDb();
  try {
    const user = queryGet('SELECT id, name, email, avatar FROM users WHERE email=?', [email]);
    if (!user) return res.status(404).json({ error: 'User not found with that email' });
    const existing = queryGet('SELECT id FROM project_members WHERE project_id=? AND user_id=?', [req.params.projectId, user.id]);
    if (existing) return res.status(409).json({ error: 'User is already a member' });
    const project = queryGet('SELECT owner_id FROM projects WHERE id=?', [req.params.projectId]);
    if (project.owner_id === user.id) return res.status(409).json({ error: 'User is already the owner' });
    queryRun('INSERT INTO project_members (id,project_id,user_id,role) VALUES (?,?,?,?)', [uuidv4(), req.params.projectId, user.id, role]);
    logActivity(queryRun, req.user.id, req.params.projectId, null, 'member_added', `Added ${user.name} as ${role}`);
    res.status(201).json({ member: { ...user, role } });
  } catch (err) { res.status(500).json({ error: 'Failed to add member' }); }
});

// PUT update member role
router.put('/:projectId/members/:userId', authenticate, requireProjectRole('admin'), [body('role').isIn(['admin','member'])], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { queryRun } = getDb();
  queryRun('UPDATE project_members SET role=? WHERE project_id=? AND user_id=?', [req.body.role, req.params.projectId, req.params.userId]);
  res.json({ message: 'Role updated' });
});

// DELETE remove member
router.delete('/:projectId/members/:userId', authenticate, requireProjectRole('admin'), (req, res) => {
  const { queryRun } = getDb();
  queryRun('DELETE FROM project_members WHERE project_id=? AND user_id=?', [req.params.projectId, req.params.userId]);
  res.json({ message: 'Member removed' });
});

// GET activity
router.get('/:projectId/activity', authenticate, requireProjectRole(), (req, res) => {
  const { queryAll } = getDb();
  const activity = queryAll(`
    SELECT al.*, u.name as user_name, u.avatar as user_avatar
    FROM activity_log al JOIN users u ON u.id = al.user_id
    WHERE al.project_id=? ORDER BY al.created_at DESC LIMIT 50
  `, [req.params.projectId]);
  res.json({ activity });
});

module.exports = router;
