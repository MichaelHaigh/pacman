'use strict';

import { MongoClient } from 'mongodb';
import { database as dbCfg } from './config.js';

const uri   = process.env.MONGODB_URI || dbCfg.url;
const name  = process.env.MONGODB_DB  || dbCfg.name;
const opts  = { serverSelectionTimeoutMS: 5000, ...(dbCfg.options || {}) };

let _client;
let _db;

export async function getDb(app) {
  if (_db) return _db;

  if (!uri) {
    throw new Error('MONGODB_URI (or database.url) is not set');
  }

  _client = new MongoClient(uri, opts);
  try {
    await _client.connect();              // v5+ requires await/promises
    _db = _client.db(name);
    if (app) app.locals.db = _db;
    return _db;
  } catch (err) {
    console.error('MongoDB connect failed:', err?.message, err);
    throw err;
  }
}

export async function closeDb() {
  if (_client) {
    try { await _client.close(); } catch (_) {}
  }
}

// Optional: graceful shutdown for K8s
process.on('SIGTERM', async () => { await closeDb(); process.exit(0); });
