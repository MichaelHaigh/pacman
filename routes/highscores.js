'use strict';

import { Router } from 'express';
const router = Router();
import pkg from 'body-parser';
const { urlencoded } = pkg;
import { getDb } from '../lib/database.js';

// create application/x-www-form-urlencoded parser
const urlencodedParser = urlencoded({ extended: false });

// middleware that is specific to this router
router.use(function timeLog(req, res, next) {
  console.log('Time: ', Date());
  next();
});

// GET /highscores/list
router.get('/list', urlencodedParser, async function (req, res, next) {
  console.log('[GET /highscores/list]');
  try {
    const db = await getDb(req.app);

    // Retrieve the top 10 high scores
    const docs = await db
      .collection('highscore')
      .find({})
      .sort({ score: -1 })
      .limit(10)
      .toArray();

    const result = [];
    docs.forEach(function (item) {
      result.push({
        name: item['name'],
        cloud: item['cloud'],
        zone: item['zone'],
        host: item['host'],
        score: item['score']
      });
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

// POST /highscores
router.post('/', urlencodedParser, async function (req, res, next) {
  console.log(
    '[POST /highscores] body =', req.body,
    ' host =', req.headers.host,
    ' user-agent =', req.headers['user-agent'],
    ' referer =', req.headers.referer
  );

  const userScore = parseInt(req.body.score, 10);
  const userLevel = parseInt(req.body.level, 10);

  try {
    const db = await getDb(req.app);

    // Insert high score with extra user data
    await db.collection('highscore').insertOne(
      {
        name: req.body.name,
        cloud: req.body.cloud,
        zone: req.body.zone,
        host: req.body.host,
        score: userScore,
        level: userLevel,
        date: Date(),
        referer: req.headers.referer,
        user_agent: req.headers['user-agent'],
        hostname: req.hostname,
        ip_addr: req.ip
      },
      {
        // Modern write concern shape for v6/v7
        writeConcern: { w: 'majority', j: true, wtimeout: 10000 }
      }
    );

    console.log('Successfully inserted highscore');

    res.json({
      name: req.body.name,
      zone: req.body.zone,
      score: userScore,
      level: userLevel,
      rs: 'success'
    });
  } catch (err) {
    console.log(err);
    res.json({
      name: req.body.name,
      zone: req.body.zone,
      score: userScore,
      level: userLevel,
      rs: 'error'
    });
  }
});

export default router;
