const express = require('express');
const router = express.Router();
const { getDb } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.get('/stats', authenticate, (req, res) => {
  const { queryAll, queryGet } = getDb();
  const userId = req.user.id;

  const projectRows = queryAll(`
    SELECT p.id FROM projects p
    LEFT JOIN project_members pm ON pm.project_id=p.id AND pm.user_id=?
    WHERE p.owner_id=? OR pm.user_id=?
  `, [userId, userId, userId]);

  const projectIds = projectRows.map(r => r.id);

  if (projectIds.length === 0) {
    return res.json({
      stats: { totalProjects: 0, totalTasks: 0, completedTasks: 0, overdueTasks: 0, myTasks: 0 },
      recentTasks: [], tasksByStatus: {}, tasksByPriority: {}, upcomingDeadlines: [], myTasks: []
    });
  }

  const ph = projectIds.map(() => '?').join(',');

  const taskStats = queryGet(`
    SELECT COUNT(*) as total,
      SUM(CASE WHEN status='done' THEN 1 ELSE 0 END) as completed,
      SUM(CASE WHEN due_date < date('now') AND status!='done' THEN 1 ELSE 0 END) as overdue,
      SUM(CASE WHEN assignee_id=? THEN 1 ELSE 0 END) as my_tasks
    FROM tasks WHERE project_id IN (${ph})
  `, [userId, ...projectIds]);

  const statusRows = queryAll(`SELECT status, COUNT(*) as count FROM tasks WHERE project_id IN (${ph}) GROUP BY status`, projectIds);
  const tasksByStatus = statusRows.reduce((a, r) => ({ ...a, [r.status]: r.count }), {});

  const priorityRows = queryAll(`SELECT priority, COUNT(*) as count FROM tasks WHERE project_id IN (${ph}) GROUP BY priority`, projectIds);
  const tasksByPriority = priorityRows.reduce((a, r) => ({ ...a, [r.priority]: r.count }), {});

  const recentTasks = queryAll(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name, u.avatar as assignee_avatar
    FROM tasks t JOIN projects p ON p.id=t.project_id
    LEFT JOIN users u ON u.id=t.assignee_id
    WHERE t.project_id IN (${ph})
    ORDER BY t.updated_at DESC LIMIT 10
  `, projectIds).map(t => ({ ...t, tags: JSON.parse(t.tags||'[]') }));

  const upcomingDeadlines = queryAll(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t JOIN projects p ON p.id=t.project_id
    WHERE t.project_id IN (${ph}) AND t.due_date IS NOT NULL
      AND t.status!='done' AND t.due_date >= date('now')
    ORDER BY t.due_date ASC LIMIT 5
  `, projectIds).map(t => ({ ...t, tags: JSON.parse(t.tags||'[]') }));

  const myTasks = queryAll(`
    SELECT t.*, p.name as project_name, p.color as project_color
    FROM tasks t JOIN projects p ON p.id=t.project_id
    WHERE t.assignee_id=? AND t.status!='done'
    ORDER BY t.due_date ASC, t.priority DESC LIMIT 8
  `, [userId]).map(t => ({ ...t, tags: JSON.parse(t.tags||'[]') }));

  res.json({
    stats: {
      totalProjects: projectIds.length,
      totalTasks: taskStats?.total || 0,
      completedTasks: taskStats?.completed || 0,
      overdueTasks: taskStats?.overdue || 0,
      myTasks: taskStats?.my_tasks || 0,
    },
    recentTasks, tasksByStatus, tasksByPriority, upcomingDeadlines, myTasks
  });
});

router.get('/users/search', authenticate, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });
  const { queryAll } = getDb();
  const users = queryAll(
    'SELECT id, name, email, avatar FROM users WHERE (name LIKE ? OR email LIKE ?) AND id != ? LIMIT 10',
    [`%${q}%`, `%${q}%`, req.user.id]
  );
  res.json({ users });
});

module.exports = router;
