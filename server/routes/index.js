import express from 'express';
import { default as axios } from 'axios';
import { token } from '../../env.json';

var router = express.Router();

/* GET home page. */
router.get('/', function (_req, res) {
  // TODO get next three teams given an id
  var options = {
    method: 'GET',
    url: 'https://basketball-data.p.rapidapi.com/match/list',
    params: { date: '29/01/2021' },
    headers: {
      'x-rapidapi-key': token,
      'x-rapidapi-host': 'basketball-data.p.rapidapi.com'
    }
  };

  axios
    .request(options)
    .then(function (response) {
      res.json(response.data);
    })
    .catch(function (error) {
      console.error(error);
    });
});

export default router;
