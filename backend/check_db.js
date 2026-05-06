const { initDb, getDb } = require('./config/database');
initDb().then(() => {
  const { queryAll } = getDb();
  console.log(queryAll('SELECT email, role FROM users'));
});
