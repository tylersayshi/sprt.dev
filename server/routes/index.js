import express from 'express';

var router = express.Router();

/* GET home page. */
router.get('/', function (_req, res) {
  res.render('index', { title: 'World' });
});

export default router;
