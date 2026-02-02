'use strict';

import { Router } from 'express';
const router = Router();
import pkg from 'body-parser';
const { urlencoded } = pkg;
import { ObjectId } from 'mongodb';
import { getDb } from '../lib/database.js';

// create application/x-www-form-urlencoded parser
const urlencodedParser = urlencoded({ extended: false });

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date());
  next();
});

// GET /user/id
router.get('/id', async function (req, res, next) {
  console.log('[GET /user/id]');
  try {
    const db = await getDb(req.app);

    // Insert user ID and return back generated ObjectId
    const result = await db.collection('userstats').insertOne(
      { date: Date() },
      { writeConcern: { w: 'majority', j: true, wtimeout: 10000 } }
    );

    const userId = result.insertedId;
    console.log('Successfully inserted new user ID = ', userId);
    // Original behavior: return the raw ObjectId as JSON
    res.json(userId);
  } catch (err) {
    console.log('failed to insert new user ID err =', err);
    next(err);
  }
});

// POST /user/stats
router.post('/stats', urlencodedParser, async function (req, res, next) {
  console.log(
    '[POST /user/stats]\n',
    ' body =', req.body, '\n',
    ' host =', req.headers.host,
    ' user-agent =', req.headers['user-agent'],
    ' referer =', req.headers.referer
  );

  const userScore = parseInt(req.body.score, 10);
  const userLevel = parseInt(req.body.level, 10);
  const userLives = parseInt(req.body.lives, 10);
  const userET = parseInt(req.body.elapsedTime, 10);

  try {
    const db = await getDb(req.app);

    // Update live user stats
    await db.collection('userstats').updateOne(
      { _id: new ObjectId(req.body.userId) },
      {
        $set: {
          cloud: req.body.cloud,
          zone: req.body.zone,
          host: req.body.host,
          score: userScore,
          level: userLevel,
          lives: userLives,
          elapsedTime: userET,
          date: Date(),
          referer: req.headers.referer,
          user_agent: req.headers['user-agent'],
          hostname: req.hostname,
          ip_addr: req.ip
        },
        $inc: { updateCounter: 1 }
      },
      { writeConcern: { w: 'majority', j: true, wtimeout: 10000 } }
    );

    console.log('Successfully updated user stats');
    res.json({ rs: 'success' });
  } catch (err) {
    console.log(err);
    res.json({ rs: 'error' });
  }
});

// GET /user/stats
router.get('/stats', async function (req, res, next) {
  console.log('[GET /user/stats]');
  try {
    const db = await getDb(req.app);

    // Find all elements where the score field exists to avoid undefined values
    const docs = await db
      .collection('userstats')
      .find({ score: { $exists: true } })
      .sort({ _id: 1 })
      .toArray();

    const result = [];
    docs.forEach(function (item) {
      result.push({
        cloud: item['cloud'],
        zone: item['zone'],
        host: item['host'],
        score: item['score'],
        level: item['level'],
        lives: item['lives'],
        et: item['elapsedTime'],
        txncount: item['updateCounter']
      });
    });

    res.json(result);
  } catch (err) {
    console.log(err);
    next(err);
  }
});

export default router;
