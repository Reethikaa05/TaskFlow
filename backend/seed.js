const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = path.join(__dirname, 'taskmanager.db');

// Delete existing DB if it exists to start fresh
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
  console.log('🗑️ Deleted existing database.');
}

const { initDb, getDb } = require('./config/database');

async function seed() {
  await initDb();
  const { queryRun } = getDb();
  
  console.log('🌱 Seeding database...');

  // 1. Create Users
  const passwordHash = await bcrypt.hash('password123', 12);
  
  const adminId = uuidv4();
  const bobId = uuidv4();
  const charlieId = uuidv4();
  const dianaId = uuidv4();

  const users = [
    { id: adminId, name: 'Alice Admin', email: 'admin@demo.com', role: 'admin' },
    { id: bobId, name: 'Bob Engineer', email: 'bob@demo.com', role: 'member' },
    { id: charlieId, name: 'Charlie Designer', email: 'charlie@demo.com', role: 'member' },
    { id: dianaId, name: 'Diana Manager', email: 'diana@demo.com', role: 'member' }
  ];

  for (const u of users) {
    const avatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=random&color=fff&size=128`;
    queryRun(
      'INSERT INTO users (id, name, email, password, avatar, role) VALUES (?, ?, ?, ?, ?, ?)', 
      [u.id, u.name, u.email, passwordHash, avatar, u.role]
    );
  }
  console.log('✅ Created 4 users (including Admin).');

  // 2. Create Projects
  const project1Id = uuidv4();
  const project2Id = uuidv4();

  queryRun(
    "INSERT INTO projects (id, name, description, color, owner_id, due_date) VALUES (?, ?, ?, ?, ?, datetime('now', '+30 days'))",
    [project1Id, 'Website Redesign', 'Revamping the main corporate website for Q3', '#3b82f6', adminId]
  );
  queryRun(
    "INSERT INTO projects (id, name, description, color, owner_id, due_date) VALUES (?, ?, ?, ?, ?, datetime('now', '+60 days'))",
    [project2Id, 'Mobile App Launch', 'Releasing the new iOS and Android app versions', '#10b981', adminId]
  );
  console.log('✅ Created 2 projects.');

  // 3. Add Members to Projects
  queryRun("INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, 'admin')", [uuidv4(), project1Id, adminId]);
  queryRun("INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, 'member')", [uuidv4(), project1Id, bobId]);
  queryRun("INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, 'member')", [uuidv4(), project1Id, charlieId]);

  queryRun("INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, 'admin')", [uuidv4(), project2Id, adminId]);
  queryRun("INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, 'member')", [uuidv4(), project2Id, dianaId]);
  queryRun("INSERT INTO project_members (id, project_id, user_id, role) VALUES (?, ?, ?, 'member')", [uuidv4(), project2Id, bobId]);
  console.log('✅ Assigned members to projects.');

  // 4. Create Tasks
  const tasksP1 = [
    { title: 'Create wireframes', status: 'done', priority: 'high', assignee: charlieId },
    { title: 'Setup database schema', status: 'done', priority: 'high', assignee: bobId },
    { title: 'Implement login page', status: 'review', priority: 'medium', assignee: bobId },
    { title: 'Write unit tests', status: 'in-progress', priority: 'medium', assignee: bobId },
    { title: 'Design landing page', status: 'todo', priority: 'medium', assignee: charlieId }
  ];

  for (let i = 0; i < tasksP1.length; i++) {
    const t = tasksP1[i];
    queryRun(
      "INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, created_by, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), t.title, `Details for ${t.title}`, t.status, t.priority, project1Id, t.assignee, adminId, i]
    );
  }

  const tasksP2 = [
    { title: 'Setup React Native', status: 'done', priority: 'high', assignee: bobId },
    { title: 'App Store approval', status: 'todo', priority: 'high', assignee: dianaId },
    { title: 'Push notifications', status: 'in-progress', priority: 'low', assignee: bobId }
  ];

  for (let i = 0; i < tasksP2.length; i++) {
    const t = tasksP2[i];
    queryRun(
      "INSERT INTO tasks (id, title, description, status, priority, project_id, assignee_id, created_by, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [uuidv4(), t.title, `Details for ${t.title}`, t.status, t.priority, project2Id, t.assignee, adminId, i]
    );
  }
  console.log('✅ Created sample tasks.');

  console.log('🎉 Seeding complete! You can now log in with demo accounts.');
}

seed().catch(err => {
  console.error('Seeding failed:', err);
});
