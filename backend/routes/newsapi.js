var fetch = require('isomorphic-fetch');
var request = require('request');
var express = require('express');
var router = express.Router();

const config = require('../config/config.js');
const url = config.newsapiURL;

var tempNews = [];

/**
 * @api {GET} /news Request the news data
 * @apiName News
 * @apiGroup News
 *
 * @apiHeader {String} JWT JWT token of the user.
 *
 * @apiSuccess {JSON} News_Data Returns an array of the top 15 news related to cryptocurrency.
*/
router.get('/', function(req, res, next) {
  var req = new Request(url);
  if(tempNews.length <= 0){
    callNewsOrgAPI(res);
  } else {
    res.send(JSON.parse(JSON.stringify(tempNews)));
  }
});

// Gets the new data
function callNewsOrgAPI(res) {
  request({
      url: url,
      json: true
  }, function (error, response, body) {
      if (!error) {
          var data = JSON.parse(JSON.stringify(body));
          tempNews_temp = [];
          var counter = 0;
          while(counter < 16) {
              tempNews_temp.push(response.body.articles[counter]);
              counter++;
          }

          tempNews = [];
          tempNews = tempNews_temp;
          
          if(res)
            res.send(JSON.stringify(tempNews));
      } else {
        console.log("Error updating the news data");

        if(res)
          res.send(400, { "message" : "Error updating the news data!" });
      }

  });
};

// Helps get the new data every 10 mins
setInterval( function() {
  callNewsOrgAPI(null);
}, 600000);

module.exports = router;