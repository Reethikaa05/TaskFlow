const express = require('express');
const router = express.Router({ mergeParams: true });
const { v4: uuidv4 } = require('uuid');
const { body, validationResult } = require('express-validator');
const { getDb } = require('../config/database');
const { authenticate, requireProjectRole } = require('../middleware/auth');

function logActivity(queryRun, userId, projectId, taskId, action, details) {
  try { queryRun('INSERT INTO activity_log (id,user_id,project_id,task_id,action,details) VALUES (?,?,?,?,?,?)',
    [uuidv4(), userId, projectId, taskId, action, details]); } catch(e) {}
}

// GET all tasks
router.get('/', authenticate, requireProjectRole(), (req, res) => {
  const { queryAll } = getDb();
  const { status, priority, assignee, search } = req.query;
  let sql = `
    SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as created_by_name, u2.avatar as created_by_avatar,
      (SELECT COUNT(*) FROM comments c WHERE c.task_id=t.id) as comment_count
    FROM tasks t
    LEFT JOIN users u1 ON u1.id=t.assignee_id
    LEFT JOIN users u2 ON u2.id=t.created_by
    WHERE t.project_id=?`;
  const params = [req.params.projectId];
  if (status) { sql += ' AND t.status=?'; params.push(status); }
  if (priority) { sql += ' AND t.priority=?'; params.push(priority); }
  if (assignee) { sql += ' AND t.assignee_id=?'; params.push(assignee); }
  if (search) { sql += ' AND (t.title LIKE ? OR t.description LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  sql += ' ORDER BY t.position ASC, t.created_at DESC';
  const tasks = queryAll(sql, params).map(t => ({ ...t, tags: JSON.parse(t.tags || '[]') }));
  res.json({ tasks });
});

// POST create task
router.post('/', authenticate, requireProjectRole(), [
  body('title').trim().isLength({ min: 1, max: 200 }),
  body('description').optional().trim(),
  body('status').optional().isIn(['todo','in_progress','review','done']),
  body('priority').optional().isIn(['low','medium','high','urgent']),
  body('tags').optional().isArray(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { title, description, status='todo', priority='medium', assignee_id, due_date, tags=[] } = req.body;
  const { queryGet, queryRun } = getDb();
  try {
    if (assignee_id) {
      const member = queryGet('SELECT 1 as ok FROM project_members WHERE project_id=? AND user_id=?', [req.params.projectId, assignee_id])
        || queryGet('SELECT 1 as ok FROM projects WHERE id=? AND owner_id=?', [req.params.projectId, assignee_id]);
      if (!member) return res.status(400).json({ error: 'Assignee must be a project member' });
    }
    const maxPos = queryGet('SELECT MAX(position) as mx FROM tasks WHERE project_id=? AND status=?', [req.params.projectId, status]);
    const position = (maxPos?.mx || 0) + 1;
    const id = uuidv4();
    queryRun('INSERT INTO tasks (id,title,description,status,priority,project_id,assignee_id,created_by,due_date,tags,position) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, title, description||null, status, priority, req.params.projectId, assignee_id||null, req.user.id, due_date||null, JSON.stringify(tags), position]);
    logActivity(queryRun, req.user.id, req.params.projectId, id, 'task_created', `Created "${title}"`);
    const task = queryGet(`SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as created_by_name, u2.avatar as created_by_avatar
      FROM tasks t LEFT JOIN users u1 ON u1.id=t.assignee_id LEFT JOIN users u2 ON u2.id=t.created_by WHERE t.id=?`, [id]);
    res.status(201).json({ task: { ...task, tags: JSON.parse(task.tags||'[]') } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed to create task' }); }
});

// GET single task
router.get('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const { queryGet, queryAll } = getDb();
  const task = queryGet(`SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar,
    u2.name as created_by_name, u2.avatar as created_by_avatar
    FROM tasks t LEFT JOIN users u1 ON u1.id=t.assignee_id LEFT JOIN users u2 ON u2.id=t.created_by
    WHERE t.id=? AND t.project_id=?`, [req.params.taskId, req.params.projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const comments = queryAll(`SELECT c.*, u.name as user_name, u.avatar as user_avatar
    FROM comments c JOIN users u ON u.id=c.user_id WHERE c.task_id=? ORDER BY c.created_at ASC`, [req.params.taskId]);
  res.json({ task: { ...task, tags: JSON.parse(task.tags||'[]'), comments } });
});

// PUT update task
router.put('/:taskId', authenticate, requireProjectRole(), [
  body('title').optional().trim().isLength({ min:1, max:200 }),
  body('status').optional().isIn(['todo','in_progress','review','done']),
  body('priority').optional().isIn(['low','medium','high','urgent']),
  body('tags').optional().isArray(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { queryGet, queryRun } = getDb();
  const task = queryGet('SELECT * FROM tasks WHERE id=? AND project_id=?', [req.params.taskId, req.params.projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  try {
    const { title, description, status, priority, assignee_id, due_date, tags } = req.body;
    const sets = []; const vals = [];
    if (title !== undefined) { sets.push('title=?'); vals.push(title); }
    if (description !== undefined) { sets.push('description=?'); vals.push(description); }
    if (status !== undefined) { sets.push('status=?'); vals.push(status); }
    if (priority !== undefined) { sets.push('priority=?'); vals.push(priority); }
    if (assignee_id !== undefined) { sets.push('assignee_id=?'); vals.push(assignee_id||null); }
    if (due_date !== undefined) { sets.push('due_date=?'); vals.push(due_date||null); }
    if (tags !== undefined) { sets.push('tags=?'); vals.push(JSON.stringify(tags)); }
    sets.push("updated_at=datetime('now')");
    vals.push(req.params.taskId);
    queryRun(`UPDATE tasks SET ${sets.join(',')} WHERE id=?`, vals);
    if (status && status !== task.status)
      logActivity(queryRun, req.user.id, req.params.projectId, req.params.taskId, 'status_changed', `${task.status}→${status}`);
    const updated = queryGet(`SELECT t.*, u1.name as assignee_name, u1.avatar as assignee_avatar,
      u2.name as created_by_name, u2.avatar as created_by_avatar
      FROM tasks t LEFT JOIN users u1 ON u1.id=t.assignee_id LEFT JOIN users u2 ON u2.id=t.created_by WHERE t.id=?`, [req.params.taskId]);
    res.json({ task: { ...updated, tags: JSON.parse(updated.tags||'[]') } });
  } catch (err) { res.status(500).json({ error: 'Failed to update task' }); }
});

// DELETE task
router.delete('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const { queryGet, queryRun } = getDb();
  const task = queryGet('SELECT * FROM tasks WHERE id=? AND project_id=?', [req.params.taskId, req.params.projectId]);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (req.projectRole !== 'admin' && task.created_by !== req.user.id)
    return res.status(403).json({ error: 'Cannot delete this task' });
  queryRun('DELETE FROM tasks WHERE id=?', [req.params.taskId]);
  logActivity(queryRun, req.user.id, req.params.projectId, null, 'task_deleted', `Deleted "${task.title}"`);
  res.json({ message: 'Task deleted' });
});

// POST add comment
router.post('/:taskId/comments', authenticate, requireProjectRole(), [body('content').trim().isLength({ min:1, max:1000 })], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { queryGet, queryRun } = getDb();
  const id = uuidv4();
  queryRun('INSERT INTO comments (id,task_id,user_id,content) VALUES (?,?,?,?)', [id, req.params.taskId, req.user.id, req.body.content]);
  const comment = queryGet('SELECT c.*, u.name as user_name, u.avatar as user_avatar FROM comments c JOIN users u ON u.id=c.user_id WHERE c.id=?', [id]);
  res.status(201).json({ comment });
});

// DELETE comment
router.delete('/:taskId/comments/:commentId', authenticate, requireProjectRole(), (req, res) => {
  const { queryGet, queryRun } = getDb();
  const comment = queryGet('SELECT * FROM comments WHERE id=?', [req.params.commentId]);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.user_id !== req.user.id && req.projectRole !== 'admin')
    return res.status(403).json({ error: 'Cannot delete this comment' });
  queryRun('DELETE FROM comments WHERE id=?', [req.params.commentId]);
  res.json({ message: 'Comment deleted' });
});

module.exports = router;
