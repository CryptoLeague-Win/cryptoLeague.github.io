var MongoClient = require('mongodb').MongoClient
  , assert = require('assert')
  , ObjectId = require('mongodb').ObjectID;

const config = require('../config/config');
const mongodbUrl = config.mongoDBHost;

var token = require('../utils/token');
var asyncLoop = require('node-async-loop');

const league_schema = require('./../models/league');

function findLeagueType(league_Types_id, callback) {
  MongoClient.connect(mongodbUrl, function (err, db) {
    if (err) throw err;
    var dbo = db.db("cryptoleague_database");
    dbo.collection("League_Types").findOne({'league_type_id' : league_Types_id}, function(err, result) {
      if (err) throw err;

      if (result != null) {
        callback(null, JSON.parse(JSON.stringify(result)));
      } else  {
        callback(null, false);
      }

      db.close();
    });
  });
}

function findWaitingLeague(league_type, callback) {
  MongoClient.connect(mongodbUrl, function (err, db) {
    if (err) throw err;
      var dbo = db.db("cryptoleague_database");
      dbo.collection("Leagues").findOne({ $and : [ {'league_type' : league_type},
                                                    { $or : [
                                                        { 'status' : "Waiting" }, { 'status' : "Waiting_Locked" }
                                                      ] }
                                                  ] }, function(err, result) {
        if (err) throw err;

        if (result != null) {
          callback(null, JSON.parse(JSON.stringify(result)));
        } else  {
          callback(null, false);
        }

        db.close();
    });
  });
}

function getNextSequenceValue(callback) {
  MongoClient.connect(mongodbUrl, function (err, db) {
    if (err) throw err;
    var dbo = db.db("cryptoleague_database");
    dbo.collection("League_Counter").findOneAndUpdate({'_id': 'Leagues' }, {$inc: { 'sequence_value': 1 }}, function(error, result) {
      callback(null, result.value.sequence_value);
     });
  });
}

function getRankOfUser(id, callback) {
  MongoClient.connect(mongodbUrl, function (err, db) {
    if (err) throw err;
    var dbo = db.db("cryptoleague_database");
    dbo.collection("Users").find({}).sort( { tokens: -1 } ).toArray(function(err, result) {
      if (err) throw err;

      if (result != null) {
        var resultIndex = 0;
        var counter = 1;
        asyncLoop(result, function (item, next) {
          if (item._id.equals(id)) {
            resultIndex = counter;
          }
          counter++;
          next();
        }, function () {
          var object = { "rank" : resultIndex };
          callback(null, JSON.parse(JSON.stringify(object)));
        });
      } else  {
        callback(null, false);
      }
      db.close();
    });
  });
}

function getUserObject(user_id, callback) {
  MongoClient.connect(mongodbUrl, function (err, db) {
    if (err) throw err;
    var dbo = db.db("cryptoleague_database");
    dbo.collection("Users").findOne({'_id' : ObjectId(user_id)}, function(err, result) {
      if (err) throw err;

      if (result) {
        var object = {
          'username' : result.username,
          'tokens' : result.tokens,
          'profilePicture' : result.profilePicture,
          'user_id' : result._id
        };
        callback(null, JSON.parse(JSON.stringify(object)));
      } else  {
        callback(null, null);
      }

      db.close();
    });
  });
}

module.exports = {
  connectToMongo:
  function connectToMongo(callback) {
    MongoClient.connect(mongodbUrl, function(err, db) {
      assert.equal(null, err);
      console.log("Connected successfully to database");
      db.close();

      callback(null, true);
    });
  },

  checkUserExists:
  function checkUserExists(jwt_payload, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;
      var dbo = db.db("cryptoleague_database");
      dbo.collection("Users").findOne({'id' : jwt_payload.id}, function(err, result) {
        if (err) throw err;

        if (result != null) {
          callback(null, result);
        } else  {
          callback(null, false);
        }

        db.close();
      });
    });
  },

  addUser:
  function addUser(user, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
    if (err) throw err;
      var dbo = db.db("cryptoleague_database");
      dbo.collection("Users").findOne({'id' : user.id}, function(err, result) {
        if (err) throw err;

        if (result != null) {
          callback(null, result);
        } else  {
          dbo.collection("Users").insertOne(user, function(err, res) {
            if (err) throw err;
            db.close();
          });
          callback(null, user);
        }

        db.close();
      });
    });
  },

  getUserViaID:
  function getUserViaID(userID, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;
      var dbo = db.db("cryptoleague_database");
      dbo.collection("Users").findOne({'_id' : userID}, function(err, result) {
        if (err) throw err;

        if (result != null) {
          callback(null, JSON.parse(JSON.stringify(result)));
        } else  {
          callback(null, false);
        }

        db.close();
      });
    });
  },

  getUserViaUsername:
  function getUserViaUsername(username, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;
      var dbo = db.db("cryptoleague_database");
      dbo.collection("Users").findOne({'username' : username}, function(err, result) {
        if (err) throw err;

        if (result != null) {
          callback(null, true);
        } else  {
          callback(null, false);
        }

        db.close();
      });
    });
  },

  updateUser:
  function updateUser(user, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;

      var dbo = db.db("cryptoleague_database");
      dbo.collection("Users").findOneAndUpdate({'_id': user._id}, {$set: {email: user.email, username: user.username, 
        profilePicture: user.profilePicture}}, function(err, res) {
        if (err) {
          throw err;
        }

        callback(null, token.generateAccessToken(user));

        db.close();
      });
    });
  },

  updateUserLeague:
  function updateUserLeague(user, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;

      var dbo = db.db("cryptoleague_database");
      dbo.collection("Users").findOneAndUpdate({'_id': user._id}, {$set: {currentLeague_id: user.currentLeague_id, tokens: user.tokens}}, 
        function(err, res) {
          if (err) {
            throw err;
          }

          callback(null, token.generateAccessToken(user));
          db.close();
      });
    });
  },

  getAllUsers:
  function getAllUsers(page, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;
      var dbo = db.db("cryptoleague_database");
      dbo.collection("Users").find({}).sort( { tokens: -1 } ).limit(25).skip(page).toArray(function(err, result) {
        if (err) throw err;

        if (result != null) {
          callback(null, JSON.parse(JSON.stringify(result)));
        } else  {
          callback(null, false);
        }

        db.close();
      });
    });
  },

  getUserRank:
  function getUserRank(id, callback) {
    getRankOfUser(id, function(error, result) {
      callback(error, result);
    });
  },

  getTotalUsers:
  function getTotalUsers(callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;
      var dbo = db.db("cryptoleague_database");
      dbo.collection("Users").find({}).toArray(function(err, result) {
        if (err) throw err;

        if (result != null) {
          var object = { "totalUsers" : result.length };
          callback(null, JSON.parse(JSON.stringify(object)));
        } else  {
          callback(null, false);
        }
        db.close();
      });
    });
  },

  getLeagueTypes:
  function getLeagueTypes(callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;
      var dbo = db.db("cryptoleague_database");
      dbo.collection("League_Types").find({}).toArray(function(err, result) {
        if (err) throw err;

        if (result != null) {
          callback(null, JSON.parse(JSON.stringify(result)));
        } else  {
          callback(null, false);
        }
        db.close();
      });
    });
  },

  checkLeagueType:
  function checkLeagueType(league_Types_id, user_id, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;
        var dbo = db.db("cryptoleague_database");
        dbo.collection("League_Types").findOne({'league_type_id' : league_Types_id}, function(err, result) {
          if (err) throw err;

          if (result != null) {
            dbo.collection("Users").findOne({'_id' : user_id}, function(err, result_user) {
              if (result_user.tokens < result.buy_in) {
                callback('No enough tokens', null);
              } else {
                callback(null, result);
              }
            });
          } else  {
            callback('League does not exist', null);
          }

          db.close();
      });
    });
  },

  createLeague:
  function createLeague(league_Types_id, user_id, callback) {
    getUserObject(user_id, function(err, user) {
      findLeagueType(league_Types_id, function(err, result) {
        findWaitingLeague(result.title, function(error, league_result) {
          if (error || league_result == false) {

            getNextSequenceValue(function(error, next_number) {
              var league = new league_schema();

              league.league_id = next_number;
              league.league_type =  result.title;
              league.status = "Waiting";
              league.portfolio_ids.push({
                "username": user.username,
                "tokens": user.tokens,
                "profilePicture": user.profilePicture,
                "user_id": user.user_id,
                "portfolio_id" : null
              });
              league.start_time = null;

              MongoClient.connect(mongodbUrl, function (err, db) {
                if (err) throw err;
                var dbo = db.db("cryptoleague_database");
                dbo.collection("Leagues").insertOne(league, function(err, res) {
                  if (err) throw err;

                  callback(null, JSON.parse(JSON.stringify(league)));

                  db.close();
                });
              });
            });

          } else {
            MongoClient.connect(mongodbUrl, function (err, db) {
              if (err) throw err;
              var dbo = db.db("cryptoleague_database");
              user.portfolio_id = null;
              league_result.portfolio_ids.push(user);

              dbo.collection("Leagues").findOneAndUpdate({'league_id': league_result.league_id}, 
                {$push: {'portfolio_ids': user}}, function(err, res) {
                  if (err) throw err;

                  console.log("current users in the league: " + league_result.portfolio_ids.length);

                  if (league_result.portfolio_ids.length == 10 || league_result.portfolio_ids.length >= 100) {
                    if (league_result.portfolio_ids.length >= 100) {
                      league_result.status = "Locked";
                    } else {
                      var date = new Date();
                      var date2 = new Date(date);
                    
                      date2.setMinutes(date.getMinutes() + (24 * 60));
                      league_result.status = "Waiting_Locked";

                      league_result.start_time = date2;

                      // TODO Call the function that will execute when this league starts, so after 24 hours

                    }

                    dbo.collection("Leagues").findOneAndUpdate({'league_id': league_result.league_id}, {$set: {status : league_result.status, 
                      start_time: date2}}, function(err, league_result_final) {
                        callback(null, JSON.parse(JSON.stringify(league_result)));
                    });

                  } else {
                    callback(null, JSON.parse(JSON.stringify(league_result)));
                  }

                  db.close();
              });
            });
          }
        });
      });
    });
  },

  getLeague:
  function getLeague(league_id, user_id, callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) throw err;
        var dbo = db.db("cryptoleague_database");
        dbo.collection("Leagues").findOne({'league_id' : league_id}, function(err, result) {
          if (err) throw err;

          if (result) {
            var foundUser = false;
            asyncLoop(result.portfolio_ids, function (item, next) {
              if (item.user_id == user_id) {
                foundUser = true;
              } else {
                if (result.status != 'Finished') {
                  item.portfolio_id = null;
                }
              }
              next();
            }, function () {
              if (foundUser == false) {
                if (result.status == 'Finished') {
                  callback(null, JSON.parse(JSON.stringify(result)));
                } else {
                  callback(null, {'message' : "Access denied! User not in the league!"});
                }
              } else {
                callback(null, JSON.parse(JSON.stringify(result)));
              }
            });
          } else  {
            callback(null, { 'message' : "League does not exist!" });
          }

          db.close();
      });
    });
  }
};