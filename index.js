const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET = 'your_jwt_secret'; // Change this in production

app.use(bodyParser.json());
// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Initialize SQLite DB
const db = new sqlite3.Database('./wellness.db', (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to SQLite database.');
});

// Create tables if not exist
const userTable = `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT UNIQUE,
  password_hash TEXT,
  goals TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`;
db.run(userTable);

const entryTable = `CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  mood TEXT,
  screen_time_in_minutes INTEGER,
  reflection TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  entry_date DATE NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id)
);`;
db.run(entryTable);

// Table for user goals and baseline assessment
const goalsTable = `CREATE TABLE IF NOT EXISTS user_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  awareness TEXT,
  achieve TEXT,
  reminder_type TEXT,
  weekly_screen_time TEXT,
  priority_area TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
);`;
db.run(goalsTable);

// Create daily_entries table if not exist
const dailyEntriesTable = `CREATE TABLE IF NOT EXISTS daily_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  reflection_text TEXT NOT NULL,
  photo_path TEXT,
  entry_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NULL,
  UNIQUE (user_id, entry_date),
  FOREIGN KEY(user_id) REFERENCES users(id)
);`;
db.run(dailyEntriesTable);

// Register endpoint
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body; // Removed 'goals' from destructuring
  if (!name || !email || !password) {
    console.error('Missing required fields:', { name, email, password });
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  const password_hash = bcrypt.hashSync(password, 10);
  db.run(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', // Removed 'goals' from query
    [name, email, password_hash], // Removed 'goals' from values
    function (err) {
      if (err) {
        console.error('Database error:', err.message);
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Email already registered.' });
        }
        return res.status(500).json({ error: 'Database error.' });
      }
      console.log('User registered successfully:', { id: this.lastID, name, email });
      res.json({ id: this.lastID, name, email });
    }
  );
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    console.error('Login Error: Missing email or password'); // Debugging log
    return res.status(400).json({ error: 'Missing email or password.' });
  }
  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) {
      console.error('Database Error:', err.message); // Debugging log
      return res.status(500).json({ error: 'Database error.' });
    }
    console.log('Login Attempt:', { email, user }); // Debugging log
    if (!user) {
      console.error('Login Error: User does not exist'); // Debugging log
      return res.status(404).json({ error: 'User does not exist.' });
    }
    if (!bcrypt.compareSync(password, user.password_hash)) {
      console.error('Login Error: Invalid credentials'); // Debugging log
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const token = jwt.sign({ id: user.id, email: user.email }, SECRET, { expiresIn: '7d' });
    console.log('Login Successful:', { userId: user.id }); // Debugging log
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, goals: user.goals }, redirect: '/checkin.html' });
  });
});

// Daily check-in endpoint
app.post('/api/checkin', authenticateToken, (req, res) => {
  const { mood, screen_time_in_minutes, entry_date } = req.body;
  const user_id = req.user.id; // Use the user_id from the authenticated user's token

  console.log('Incoming Check-in Payload:', { user_id, mood, screen_time_in_minutes, entry_date }); // Debugging log

  if (!user_id || !mood || !screen_time_in_minutes || !entry_date) {
    console.error('Missing required fields:', { user_id, mood, screen_time_in_minutes, entry_date }); // Debugging log
    return res.status(400).json({ error: 'Missing required fields.' });
  }

  db.run(
    'INSERT INTO entries (user_id, mood, screen_time_in_minutes, entry_date) VALUES (?, ?, ?, ?)',
    [user_id, mood, screen_time_in_minutes, entry_date],
    function (err) {
      if (err) {
        console.error('Database error:', err.message); // Debugging log
        return res.status(500).json({ error: 'Database error.' });
      }
      console.log('Check-in saved successfully:', { id: this.lastID, user_id, mood, screen_time_in_minutes, entry_date }); // Debugging log
      res.json({ id: this.lastID, user_id, mood, screen_time_in_minutes, entry_date });
    }
  );
});

// Save user goals and baseline assessment
app.post('/api/goals', (req, res) => {
  const { user_id, awareness, achieve, reminder_type, weekly_screen_time, priority_area } = req.body;
  if (!user_id || !awareness || !achieve || !reminder_type || !weekly_screen_time || !priority_area) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  // Check if user already has a goals entry
  db.get('SELECT id FROM user_goals WHERE user_id = ?', [user_id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error.' });
    }
    if (row) {
      // User already completed goals
      return res.status(409).json({ error: 'Goals already completed for this user.' });
    }
    // Store arrays as JSON strings
    db.run(
      'INSERT INTO user_goals (user_id, awareness, achieve, reminder_type, weekly_screen_time, priority_area) VALUES (?, ?, ?, ?, ?, ?)',
      [
        user_id,
        awareness,
        JSON.stringify(achieve),
        JSON.stringify(reminder_type),
        parseInt(weekly_screen_time, 10),
        JSON.stringify(priority_area)
      ],
      function (err) {
        if (err) {
          return res.status(500).json({ error: 'Database error.' });
        }
        res.json({ id: this.lastID, user_id });
      }
    );
  });
});

// Check if user has completed goals
app.get('/api/goals', (req, res) => {
  const user_id = req.query.user_id;
  if (!user_id) return res.status(400).json({ error: 'Missing user_id' });

  db.get(
    'SELECT awareness, weekly_screen_time, achieve, reminder_type, priority_area FROM user_goals WHERE user_id = ?',
    [user_id],
    (err, row) => {
      if (err) {
        console.error('Database error:', err); // Debugging log
        return res.status(500).json({ error: 'Database error' });
      }

      console.log('Database row retrieved:', row); // Debugging log

      if (!row) {
        return res.json({ completed: false }); // Explicitly return completed: false if no goals are found
      }

      res.json({
        completed: true, // Explicitly return completed: true if goals are found
        awareness: row.awareness,
        weekly_screen_time: row.weekly_screen_time,
        achieve: row.achieve ? JSON.parse(row.achieve) : [],
        reminder_type: row.reminder_type ? JSON.parse(row.reminder_type) : [],
        priority_area: row.priority_area ? JSON.parse(row.priority_area) : []
      });
    }
  );
});

// Route to render daily entry form
app.get('/daily-entry', (req, res) => {
  res.render('daily-entry', {
    title: 'Daily Reflection',
    validationErrors: null,
    previousInput: null,
    duplicateEntryMessage: null
  });
});

// Route to render daily check-in form
app.get('/daily-entry', (req, res) => {
  res.render('checkin', {
    title: 'Daily Check-in',
    validationErrors: null,
    previousInput: null,
    duplicateEntryMessage: null
  });
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      const dir = `uploads/photos/${new Date().getFullYear()}/${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, `${uniqueSuffix}-${file.originalname}`);
    }
  }),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG and PNG are allowed.'));
    }
  }
});

// Route to handle daily entry submission
app.post('/daily-entry', upload.single('photo'), (req, res) => {
  const { reflection_text } = req.body;
  const user_id = req.user.id; // Assume user is authenticated
  const entry_date = new Date().toISOString().split('T')[0]; // Local date

  console.log('Raw request body:', req.body); // Debugging log

  if (!reflection_text || reflection_text.trim().length === 0) {
    return res.status(400).render('checkin', {
      title: 'Daily Check-in',
      validationErrors: 'Reflection text is required.',
      previousInput: { reflection_text },
      duplicateEntryMessage: null
    });
  }

  const photo_path = req.file ? req.file.path : null;

  db.get('SELECT id FROM daily_entries WHERE user_id = ? AND entry_date = ?', [user_id, entry_date], (err, row) => {
    if (err) {
      return res.status(500).send('Database error.');
    }
    if (row) {
      return res.status(409).render('checkin', {
        title: 'Daily Check-in',
        validationErrors: null,
        previousInput: { reflection_text },
        duplicateEntryMessage: 'You’ve already saved a check-in today. Overwrite or cancel?'
      });
    }
    db.run(
      'INSERT INTO daily_entries (user_id, reflection_text, photo_path, entry_date) VALUES (?, ?, ?, ?)',
      [user_id, reflection_text.trim(), photo_path, entry_date],
      function (err) {
        if (err) {
          return res.status(500).send('Database error.');
        }
        res.redirect('/mood');
      }
    );
  });
});

// Reflection submission endpoint
app.post('/api/reflection', authenticateToken, upload.none(), (req, res) => {
  console.log('req.user:', req.user); // Debugging log

  if (!req.user) {
    console.error('req.user is undefined. Authorization might be missing or invalid.');
    return res.status(401).json({ error: 'Unauthorized. Please log in again.' });
  }

  console.log('Request Body:', req.body); // Debugging log
  console.log('Request Headers:', req.headers); // Debugging log

  const reflectionText = req.body.reflectionText || req.body['reflectionText']; // Handle potential parsing issues
  console.log('Parsed Reflection Text:', reflectionText); // Debugging log

  const userId = req.user.id; // Ensure `req.user` is populated by `authenticateToken`

  if (!reflectionText) {
    return res.status(400).json({ error: 'Reflection text is required.' });
  }

  db.run(
    'INSERT INTO reflections (user_id, reflection_text, timestamp) VALUES (?, ?, ?)',
    [userId, reflectionText, new Date().toISOString()],
    function (err) {
      if (err) {
        console.error('Database Error:', err.message);
        return res.status(500).json({ error: 'Failed to save reflection.' });
      }
      res.json({ id: this.lastID, userId, reflectionText });
    }
  );
});

// Get reflections for the logged-in user
app.get('/api/reflections', authenticateToken, (req, res) => {
  const userId = req.user.id;
  db.all('SELECT * FROM reflections WHERE user_id = ?', [userId], (err, rows) => {
    if (err) {
      console.error('Database Error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch reflections.' });
    }
    res.json(rows);
  });
});

// Endpoint to fetch today's summary for the logged-in user
app.get('/api/today', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const today = new Date().toISOString().split('T')[0]; // Get today's date in YYYY-MM-DD format
  console.log(`[API] /api/today called for userId:`, userId, 'date:', today);
  const query = `
    SELECT mood, screen_time_in_minutes, reflection
    FROM entries
    WHERE user_id = ? AND entry_date = ?
  `;
  db.get(query, [userId, today], (err, row) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch today\'s summary.' });
    }
    if (!row) {
      console.log('[API] /api/today: No entry found for today for user', userId);
      return res.status(404).json({ error: 'No entry found for today.' });
    }
    console.log('[API] /api/today: Entry found:', row);
    res.json({
      mood: row.mood,
      screenTime: row.screen_time_in_minutes,
      reflection: row.reflection
    });
  });
});

// Endpoint to fetch mood and screen time for the past 7 days
app.get('/api/overview-7days', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const query = `
    SELECT entry_date, mood, screen_time_in_minutes
    FROM entries
    WHERE user_id = ?
    ORDER BY entry_date DESC
    LIMIT 7
  `;
  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch 7-day overview.' });
    }
    // Sort ascending by date for chart display
    const sorted = rows.sort((a, b) => new Date(a.entry_date) - new Date(b.entry_date));
    const result = sorted.map(r => ({
      date: r.entry_date,
      mood: r.mood,
      screenTime: r.screen_time_in_minutes
    }));
    res.json(result);
  });
});

// Endpoint to fetch history log for the logged-in user
app.get('/api/history-log', authenticateToken, (req, res) => {
  const userId = req.user.id;
  const { startDate, endDate } = req.query;

  // Updated query to fetch reflection_text and timestamp from the reflections table
  let query = 'SELECT timestamp, reflection_text FROM reflections WHERE user_id = ?';
  const params = [userId];

  if (startDate && endDate) {
    query += ' AND timestamp BETWEEN ? AND ?';
    params.push(startDate, endDate);
  }

  query += ' ORDER BY timestamp DESC';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err.message);
      return res.status(500).json({ error: 'Failed to fetch history log.' });
    }

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No history found.' });
    }

    res.json(rows);
  });
});

// Middleware to authenticate user based on JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  console.log('Authorization Header:', authHeader); // Debugging log

  const token = authHeader && authHeader.split(' ')[1];
  if (!token) {
    console.error('No token provided in Authorization header'); // Debugging log
    return res.status(401).json({ error: 'Unauthorized' });
  }

  jwt.verify(token, SECRET, (err, user) => {
    if (err) {
      console.error('JWT verification failed:', err.message); // Debugging log
      return res.status(403).json({ error: 'Forbidden' });
    }
    console.log('JWT verified successfully, user:', user); // Debugging log
    req.user = user;
    next();
  });
}

// Endpoint to get logged-in user's details
app.get('/api/user', authenticateToken, (req, res) => {
  const userId = req.user.id;
  console.log(`[API] /api/user called for userId:`, userId);
  db.get('SELECT id, name, email FROM users WHERE id = ?', [userId], (err, user) => {
    if (err || !user) {
      console.log('[API] /api/user: User not found for id', userId);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('[API] /api/user: User found:', user);
    res.json(user);
  });
});

// Middleware to log request details
app.use((req, res, next) => {
  console.log('Request Headers:', req.headers);
  console.log('Raw Request Body:', req.body);
  next();
});

// Serve mood-entry.html
app.get('/mood-entry', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'mood-entry.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
