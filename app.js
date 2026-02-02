'use strict';

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

// Use the async getDb initializer from lib/database.js
import { getDb } from './lib/database.js';

// Constants for ESM __dirname / __filename
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Routes
import highscores from './routes/highscores.js';
import user from './routes/user.js';
import loc from './routes/location.js';

// App
const app = express();

// View engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// Static files
app.use('/', express.static(path.join(__dirname, 'public')));

// Routes
app.use('/highscores', highscores);
app.use('/user', user);
app.use('/location', loc);

// 404 handler
app.use(function (req, res, next) {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// Error handler
app.use(function (err, req, res, next) {
  if (res.headersSent) return next(err);

  res.locals.title = 'Pac-Man Error';
  res.locals.message = `Error message: ${err.message}`;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  res.status(err.status || 500);
  res.render('error');
});

// --- Initialize Mongo connection on startup (async/await) ---
(async () => {
  try {
    // Connect once and cache; also sets app.locals.db for legacy usage
    await getDb(app);
    console.log('Connected to database server successfully');
  } catch (err) {
    console.error('Failed to connect to database server:', err?.message || err);
    // Optional: exit on startup failure (commented out so K8s readiness can gate traffic)
    // process.exit(1);
  }
})();

export default app;
