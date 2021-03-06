var express = require('express');
var router = express.Router();
require('../config/passport');

const config = require('../config/config');
const passport = require('passport');
const mongo = require('../utils/mongoDBCalls');

var token = require('../utils/token');

/**
 * @api {GET} /user Request the user information
 * @apiName Get_User_Information
 * @apiGroup User
 *
 * @apiHeader {String} JWT JWT token of the user.
 *
 * @apiSuccess {JSON} JWT Returns the updated JWT token of the current user.
*/
router.get('/',
  // This request must be authenticated using a JWT, or else we will fail
  passport.authenticate(['jwt'], { session: false }),
  (req, res) => {
    mongo.getUserViaID(req.user._id, function(error, result) {
      if (error || !result) {
        res.send(400, { "message" : "Error finding the user!" });
      } else {
        res.send({ 'jwt' : token.generateAccessToken(result) });
      }
    });
  }
);

/**
 * @api {PUT} /user Request to update the user's information
 * @apiName Update_User_Information
 * @apiGroup User
 *
 * @apiParam {User_Object} User User object with updated information.
 * @apiHeader {String} JWT JWT token of the user.
 *
 * @apiSuccess {JSON} JWT Returns the updated JWT token of the current user.
*/
router.put('/',
  passport.authenticate(['jwt'], { session: false }),
  (req, res) => {
    mongo.getUserViaID(req.user._id, function(error, result) {
      if (error || !result) {
        res.send(400, { "message" : "Error finding the user!" });
      } else {
        if (req.body.email) result.email = req.body.email;
        if (req.body.profilePicture) result.profilePicture = req.body.profilePicture;
        if (req.body.email_notification != undefined) result.email_notification = req.body.email_notification;

        if (req.body.username) {
          mongo.getUserViaUsername(req.body.username, function(error, response) {
            if (error) {
              res.send(400, {"message" : error});
            } else {
              if (!response) {
                result.username = req.body.username;
              }

              if (result.username.toString() === 'null_out' || result.username.toString() === 'search' || result.username.toString() === 'send_tokens') {
                return res.send(400, { "message" : "The provided username can not be set!" });
              }

              mongo.updateUser(result, function(error, token) {
                if (error) {
                  res.send(400, { "message" : "Error updating the user profile!" });
                } else {
                  res.send({ 'jwt' : token });
                }
              });
            }
          });
        } else {
          mongo.updateUser(result, function(error, token) {
            if (error) {
              res.send(400, { "message" : "Error updating the user profile!" });
            } else {
              res.send({ 'jwt' : token });
            }
          });
        }
      }
    });
  }
);

/**
 * @api {GET} /user/null_out Request the null out the current league
 * @apiName Get_And_Update_User_Information
 * @apiGroup User
 *
 * @apiHeader {String} JWT JWT token of the user.
 *
 * @apiSuccess {JSON} JWT Returns the updated JWT token of the current user.
*/
router.get('/null_out', passport.authenticate(['jwt'], { session: false }), (req, res) => {
  if (req.user.currentLeague_id) {
    mongo.getLeague(req.user.currentLeague_id, req.user._id, function(error, response) {
      if (error) {
        res.send(400, {"message" : error });
      } else {
        if(response.status == 4) {
          req.user.past_leagues.push(req.user.currentLeague_id);
          req.user.currentLeague_id = null;
          mongo.updateUserLeagueForNullLeague(req.user, function(error, result) {
            if (error) {
              res.send(400, {"message" : error });
            } else {
              res.send({ 'jwt' : result });
            }
          });
        } else {
          res.send(400, {'message' : "League has not ended yet, hence can not leave the league!"});
        }
      }
    });
  } else {
    res.send(400, {'message' : "Invalid request! Currently not in a league!"});
  }
});

/**
 * @api {GET} /user/search Request to get all the users username
 * @apiName Get_All_Usernames
 * @apiGroup User
 *
 * @apiHeader {String} JWT JWT token of the user.
 *
 * @apiSuccess {JSON} Usernames Returns all of the username's of the current users.
*/
router.get('/search', (req, res) => {
  var username = ".*";
  var search_username = req.param('username');
  if (search_username) {
    username = search_username + ".*";
  }
  mongo.getUserViaPartialUsername(username, function(error, result) {
    if (error) {
      res.send(400, { "message" : error });
    } else {
      res.send(JSON.parse(JSON.stringify(result)));
    }
  });
});


/** 
 * @api {GET} /user/:username Request to get the user's profile with the given username 
 * @apiName Get_User_Via_Username 
 * @apiGroup User 
 * 
 * @apiHeader {String} JWT JWT token of the user. 
 * @apiParam {String} Username Username of the user for look up. 
 * 
 * @apiSuccess {JSON} User_Profile Returns the profile of the user is the username exists 
*/ 
router.put('/send_tokens', passport.authenticate(['jwt'], { session: false }), (req, res) => {
  var username = req.param('to');
  var tokens = req.param('tokens');
  console.log("send to user "+username);
  mongo.sendTokens(req.user._id, username.toString(), parseInt(tokens, 10), function(error, response) {
    if (error || !response) {
      res.send(400, {"message" : error});
    } else {
      //res.send({"message": "Success"});

      res.send({"jwt": response});
    }
  });
});

/** 
 * @api {GET} /user/:username Request to get the user's profile with the given username 
 * @apiName Get_User_Via_Username 
 * @apiGroup User 
 * 
 * @apiHeader {String} JWT JWT token of the user. 
 * @apiParam {String} Username Username of the user for look up. 
 * 
 * @apiSuccess {JSON} User_Profile Returns the profile of the user is the username exists 
*/ 
router.get('/:username', (req, res) => {
  var username = req.params.username;
  console.log("in username "+username);
  mongo.getUserObjectViaUsername(username, function(error, response) {
    if (error || !response) {
      res.send(400, {"message" : error});
    } else {
      response.email = null;
      response.firstname = null;
      response.lastname = null;
      response.id = null;

      res.send(JSON.parse(JSON.stringify(response)));
    }
  });
});

module.exports = router;