var MongoClient = require('mongodb').MongoClient
, assert = require('assert')
, ObjectId = require('mongodb').ObjectID;

const config = require('../config/config');
const mongodbUrl = config.mongoDBHost;
const portfolio_schema = require('../models/portfolio');
const nodemailer = require('nodemailer');
const mailer = config.smtp;

var token = require('../utils/token');
var market = require('../routes/market');
var asyncLoop = require('node-async-loop');
var schedule = require('node-schedule');

const league_schema = require('../models/league');

var Enum = require('enum');
const myEnum = new Enum({'Waiting' : 0, 'Waiting_Locked' : 1, 'Locked' : 2, 'Started' : 3, 'Finished' : 4}, { freez: true });


// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport({
    host: 'in-v3.mailjet.com',
    port: 587,
    secure: false,
    auth: {
        user: config.smtp.USERNAME,
        pass: config.smtp.PASSWORD
    },
    tls:{
        rejectUnauthorized: false
    }
});

function sendEmailsViaLeague(league, message){
  MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log(err);
        callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
      }
      else {
        var dbo = db.db("cryptoleague_database");
        for(let i = 0; i < league.portfolio_ids.length; i++){
          dbo.collection("Users").findOne({'_id' : ObjectId(league.portfolio_ids[i].user_id)}, function(err, result) {
            if (err) {
              console.log(err);
              callback("Can't find the user!", null);
            } else {
              if (result) {
                if(result.email_notification){
                  //send email heres
                  message.to = result.email;
                  transporter.sendMail(message, (error, info) => {
                          if (error) {
                              return console.log(error);
                          }
                          console.log('Message sent: %s', info);
                          transporter.close();
                      });
                }
              } else  {
                callback(null, null);
              }
            }
            db.close();
          });
        }
      }
  }
)};


function findLeagueType(league_Types_id, callback) {
  if (!league_Types_id) {
    callback("Cannot find the league type!", null);
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log(err);
        callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("League_Types").findOne({'league_type_id' : league_Types_id}, function(err, result) {
          if (err) {
            console.log(err);
            callback("Cannot find the league type!", null);
          } else {
            if (result) {
              callback(null, JSON.parse(JSON.stringify(result)));
            } else  {
              callback(null, null);
            }
          }

          db.close();
        });
      }
    });
  }
}

function findWaitingLeague(league_type, callback) {
  if (!league_type) {
    callback("Cannot find a league with waiting status!", null);
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log(err);
        callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("Leagues").findOne({ $and : [ {'league_type' : league_type},
          { $or : [
            { 'status' : "0" }, { 'status' : "1" }
            ] }
            ] }, function(err, result) {
              if (err) {
                console.log(err);
                callback("Cannot find a league with waiting status!", null);
              } else {
                if (result) {
                  callback(null, JSON.parse(JSON.stringify(result)));
                } else  {
                  callback(null, null);
                }
              }

              db.close();
            });
      }
    });
  }
}

function getNextSequenceValue(callback) {
  MongoClient.connect(mongodbUrl, function (err, db) {
    if (err) {
      console.log(err);
      callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
    } else {
      var dbo = db.db("cryptoleague_database");
      dbo.collection("League_Counter").findOneAndUpdate({'_id': 'Leagues' }, {$inc: { 'sequence_value': 1 }}, function(error, result) {
        if (error) {
          console.log(error);
          callback("Error finding the league type counter!", null);
        } else {
          if (result) {
            callback(null, result.value.sequence_value);
          } else {
            callback(null, null);
          }
        }

        db.close();
      });
    }
  });
}

function getRankOfUser(id, callback) {
  if (!id) {
    callback("Can't find user's rank!", null);
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log(err);
        callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("Users").find({}).sort( { tokens: -1 } ).toArray(function(err, result) {
          if (err) {
            console.log(err);
            callback("Can't find user's rank!", null);
            db.close();
          } else {
            if (result) {
              var resultIndex = 0;
              var counter = 1;
              asyncLoop(result, function (item, next) {
                if (item._id.toString() === id.toString()) {
                  resultIndex = counter;
                }
                counter++;
                next();
              }, function () {
                var object = { "rank" : resultIndex };
                callback(null, JSON.parse(JSON.stringify(object)));
                db.close();
              });
            } else  {
              callback(null, null);
              db.close();
            }
          }
        });
      }
    });
  }
}

function getUserObject(user_id, callback) {
  if (!user_id) {
    callback("Can't find user!", null);
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log(err);
        callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("Users").findOne({'_id' : ObjectId(user_id)}, function(err, result) {
          if (err) {
            console.log(err);
            callback("Can't find the user!", null);
          } else {
            if (result) {
              var object = {
                'username' : result.username,
                'tokens' : result.tokens,
                'profilePicture' : result.profilePicture,
                'currentLeague_id': result.currentLeague_id,
                'past_leagues': result.past_leagues
              };
              callback(null, JSON.parse(JSON.stringify(object)));
            } else  {
              callback(null, null);
            }
          }

          db.close();
        });
      }
    });
  }
}

function updateUserInLeagues(user) {
  if (!user) {
    return;
  }

  var all_leagues = user.past_leagues;
  console.log(all_leagues);
  console.log();
  var object = {
            "league_id": user.currentLeague_id
        };

  if(user.currentLeague_id)
    all_leagues.push(object);

  if(all_leagues.length > 0) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log(err);
        console.log("Can't update user's past league : " + user);
      } else {
        console.log(all_leagues);
        asyncLoop(all_leagues, function (item, next) {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Leagues").findOne({'league_id' : item.league_id}, function(err, result) {
            if (err) throw err;

            console.log(item.league_id);
            console.log(result);

            asyncLoop(result.portfolio_ids, function (portfolio, next_portfolio) {
              if (portfolio.user_id.toString() === user._id.toString()) {
                portfolio.username = user.username;
                portfolio.profilePicture = user.profilePicture;
              }
              next_portfolio();
            }, function () {
              dbo.collection("Leagues").findOneAndUpdate({'league_id': item.league_id}, {$set: {'portfolio_ids': result.portfolio_ids}});
            });
            next();
          });
        }, function () {
          db.close();
        });
      }
    });
  }
}

function makeNewPortfolio(callback) {
  market.top3Coins(function(err, res) {
    if (err) {
      callback(err, res);
    } else {
      var portfolio = new portfolio_schema;

      portfolio.captain_coin = null;
      portfolio.holdings.push({ 'coin_symbol' : res['1'], 'percentage' : 35 });
      portfolio.holdings.push({ 'coin_symbol' : res['2'], 'percentage' : 35 });
      portfolio.holdings.push({ 'coin_symbol' : res['3'], 'percentage' : 30 });

      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          console.log(err);
          callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Portfolios").insertOne(portfolio, function(err, result) {
            if (err) {
              console.log(err);
              callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
            } else {
              callback(null, portfolio);
            }
            db.close();
          });
        }
      });
    }
  });
}

function getPortfolioWithID(portfolio_id, callback) {
  if (!portfolio_id) {
    callback("Portfolio ID does not exist!", null);
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log(err);
        callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("Portfolios").findOne({ '_id' : ObjectId(portfolio_id) }, function(err, result) {
          if (err) {
            callback("Portfolio does not exist!", null);
          } else {
            if (result) {
              callback(null, result);
            } else {
              callback("Can't find the Portfolio", null);
            }
          }

          db.close();
        });
      }
    });
  }
}

function lockLeague(league_id) {
  if (!league_id) {
    console.log("Can't lock the league!");
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log("Error connecting to MongoClient! Could not lock the league : " + league_id + ". Will try again in a minute");
        var lockingDate = new Date();
        var newDate = new Date(lockingDate);
        newDate.setMinutes(lockingDate.getMinutes() + 1);

        schedule.scheduleJob(newDate, lockLeague.bind(null, league_id));
      } else {
        var dbo = db.db("cryptoleague_database");
        let mailLeagueLocked = {
            from: '"CryptoLeague" <noreply@cryptoleague.win>',
            to: '',
            subject: 'Your CryptoLeague League has Locked',
            html: '<p>Hello there, </p>  <br> <p> Your CryptoLeague has locked. Login to edit your portfolio and compete for the highest gains!</p>'
        };
        dbo.collection("Leagues").findOneAndUpdate({'league_id': league_id}, {$set: {status : '2'}}, function(err, result){
          sendEmailsViaLeague(result.value, mailLeagueLocked);
        });
        db.close();
      }
    });
  }
}

function startLeague(league_id) {
  if (!league_id) {
    console.log("Can't start the league!");
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log("Error connecting to MongoClient! Could not start the league : " + league_id + ". Will try again in a minute");
        var lockingDate = new Date();
        var newDate = new Date(lockingDate);
        newDate.setMinutes(lockingDate.getMinutes() + 1);

        schedule.scheduleJob(newDate, startLeague.bind(null, league_id));
      } else {
        var dbo = db.db("cryptoleague_database");
        var coins = market.getCurrentCoinPricesMap();

        if (coins.toString() === "Error retrieving the coin prices") {
          console.log(coins.toString() + "! Could not start the league : " + league_id + ". Will try again in a minute");

          var lockingDate = new Date();
          var newDate = new Date(lockingDate);
          newDate.setMinutes(lockingDate.getMinutes() + 1);

          schedule.scheduleJob(newDate, startLeague.bind(null, league_id));
        } else {
          //mail
          let mailLeagueStarted = {
            from: '"CryptoLeague" <noreply@cryptoleague.win>',
            to: '',
            subject: 'Your CryptoLeague League has started',
            html: '<p>Hello there, </p>  <br> <p> Your CryptoLeague has started. Login to see your current standing and gains from your portfolio!</p>'
          };
          dbo.collection("Leagues").findOneAndUpdate({'league_id': league_id}, {$set: {status : '3', locked_prices: coins }}, function(err, result){
            sendEmailsViaLeague(result.value, mailLeagueStarted);
          });
        db.close();
        }
      };
    });
  }
}

function endLeague(league_id) {
  if (!league_id) {
    console.log("Error ending the league!");
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log("Error connecting to MongoClient! Could not end the league : " + league_id + ". Will try again in a minute");
        var lockingDate = new Date();
        var newDate = new Date(lockingDate);
        newDate.setMinutes(lockingDate.getMinutes() + 1);

        schedule.scheduleJob(endLeague, startLeague.bind(null, league_id));
      } else {
        var dbo = db.db("cryptoleague_database");

        dbo.collection("Leagues").findOne({'league_id' : league_id}, function(err, result) {
          if (err) {
            console.log("League id : " + league_id + " does not exist, hence could not end it!");
          } else {
            if (result) {
              calculatePortfoliosValues(result, function() {
                //Sort portfolios by value
                result.portfolio_ids.sort(function(a, b) {
                  return b.portfolio_value - a.portfolio_value;
                });

                //Set rankings and payouts
                for(let i = 0; i < result.portfolio_ids.length; i++) {
                  // original ranking
                  result.portfolio_ids[i].rank = i + 1;
                  result.portfolio_ids[i].payout = 0;
                }

                let currRank = 1;
                result.portfolio_ids[0].rank = 1;
                for(let i = 1; i < result.portfolio_ids.length; i++){
                  if(result.portfolio_ids[i].portfolio_value === result.portfolio_ids[i - 1].portfolio_value){
                    result.portfolio_ids[i].rank = currRank;
                  } else {
                    result.portfolio_ids[i].rank = ++currRank;
                  }
                }

                let totalCoins = result.league_buy_in * result.portfolio_ids.length;

                //Count number of people
                let numTop25 = 0, numTop50 = 0, numTop75 = 0;
                for(let i = 0; i < result.portfolio_ids.length; i++){
                  if(result.portfolio_ids[i].rank <= 25)
                    numTop25++;
                  if(result.portfolio_ids[i].rank <= 50)
                    numTop50++;
                  if(result.portfolio_ids[i].rank <= 75)
                    numTop75++;
                }

                var a = (0.2 * totalCoins) / numTop25;
                var b = (0.3 * totalCoins) / numTop50;
                var c = (0.5 * totalCoins) / numTop75;

                for(let i = 0; i < result.portfolio_ids.length; i++){
                  if(result.portfolio_ids[i].rank <= 25) {
                    result.portfolio_ids[i].payout += (0.2 * totalCoins) / numTop25;
                  }
                  if(result.portfolio_ids[i].rank <= 50) {
                    result.portfolio_ids[i].payout += (0.3 * totalCoins) / numTop50;
                  }
                  if(result.portfolio_ids[i].rank <= 75) {
                    result.portfolio_ids[i].payout += (0.5 * totalCoins) / numTop75;
                  }
                }

                var finalPayout = [a, b, c];
                var ranks = [];
                for(let i = 0; i < result.portfolio_ids.length; i++){
                  for(let j = 0; j < result.portfolio_ids.length; j++){
                      if(result.portfolio_ids[j].rank == i){
                        ranks.push(i, result.portfolio_ids[j]);
                      }
                  }
                }

                //Update the users tokens
                for(let i = 0; i < result.portfolio_ids.length; i++) {
                  var current_tokens = result.portfolio_ids[i].tokens - result.league_buy_in + result.portfolio_ids[i].payout;
                  if (current_tokens < 5) {
                    result.portfolio_ids[i].payout += 5 - current_tokens;

                    //send emails here
                    let mailTokensReplenish= {
                        from: '"CryptoLeague" <noreply@cryptoleague.win>',
                        to: '',
                        subject: 'We have creditted you with some tokens',
                        html: '<p>Hello there, </p>  <br> <p> After your recent league, you ran out of tokens, and will not be able to join any league. We want you to play and learn. This is why we have creddited your account with 5 free tokens, so that you can participate in another league! Have fun! </p>'
                    };
                    sendMailAboutReplenish(result.portfolio_ids[i].user_id, mailTokensReplenish);

                  }

                  dbo.collection("Users").findOneAndUpdate({'_id': ObjectId(result.portfolio_ids[i].user_id)}, {$inc: {'tokens' : result.portfolio_ids[i].payout}});
                  dbo.collection("Users").findOneAndUpdate({'_id': ObjectId(result.portfolio_ids[i].user_id)}, {$addToSet: {'past_leagues' : {'league_type' : result.league_type, 'league_id' : result.league_id, 'user_payout' : result.portfolio_ids[i].payout,  'user_rank' :result.portfolio_ids[i].rank, 'portfolio_value' : result.portfolio_ids[i].portfolio_value }}});
                }

                let mailLeagueEnded= {
                    from: '"CryptoLeague" <noreply@cryptoleague.win>',
                    to: '',
                    subject: 'Your CryptoLeague League has ended',
                    html: '<p>Hello there, </p>  <br> <p> Your CryptoLeague has ended. Login to see your rank and payout!</p>'
                };

                //Update league
                dbo.collection("Leagues").findOneAndUpdate({'league_id': result.league_id}, {$set: {'portfolio_ids' : result.portfolio_ids, 'status': '4', 'payouts': finalPayout, 'portfolio_ranks': ranks}}, function(err, result){
                  sendEmailsViaLeague(result.value, mailLeagueEnded);
                });
                db.close();

                console.log("done updating league");
              });
            } else {
              console.log("League not found! : " + league_id);
            }
          }
        });
      }
    });
  }
}

function sendMailAboutReplenish(userID, message){
  if (!userID) {
    callback("Cannot find the user", null);
  } else {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        console.log(err);
        callback("We are currently facing some technically difficulties, but code monkeys are on it. Please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("User").findOne({'_id' : ObjectId(userID)}, function(err, result) {
          if (err) {
            console.log(err);
            callback("Cannot find the user", null);
          } else {
            if (result) {
              message.to = result.email;
              transporter.sendMail(message, (error, info) => {
                      if (error) {
                          return console.log(error);
                      }
                      console.log('Message sent: %s', info.messageId);
                      transporter.close();
                  });
            }
          }
          db.close();
        });
      }
    });
  }
}

function calculatePortfoliosValues(league, callback) {
  // All of the validations should be done before calling this function and you have to pass the entire league object to it

  if (!league || !league.portfolio_ids) {
    callback();
    return;
  }

  var current_coin_data = market.getCurrentCoinPricesMap();
  if (current_coin_data.toString() === "Error retrieving the coin prices") {
    console.log(current_coin_data);
    callback();
  } else {
    var league_coins = league.locked_prices;

    asyncLoop(league.portfolio_ids, function (item, next) {
      getPortfolioWithID(item.portfolio_id, function(err, portfolio) {
        if (err) {
          item.portfolio_value = 0;
        } else {
          var overall_percentage_value = 0;
          if (portfolio && portfolio.holdings) {
            for (index in portfolio.holdings) {
              var found_current_market = current_coin_data[portfolio.holdings[index].coin_symbol];
              var found_league_market = league_coins[portfolio.holdings[index].coin_symbol];

              var return_over_period = ((found_current_market - found_league_market) / found_league_market);
              var value = portfolio.holdings[index].percentage * return_over_period;

              if (portfolio.captain_coin && portfolio.captain_coin.toString() === portfolio.holdings[index].coin_symbol.toString()) {
                value *= 2;
              }

              overall_percentage_value += value;
            }
          }

          item.portfolio_value = overall_percentage_value;
        }
        next();
      });
    }, callback);
  }
}

module.exports = {
  connectToMongo:
  function connectToMongo(callback) {
    MongoClient.connect(mongodbUrl, function(err, db) {
      if (err) {
        console.log("Error connecting to mongodb");
      } else {
        console.log("Connected successfully to database");
      }

      callback(err, true);
      db.close();
    });
  },

  checkUserExists:
  function checkUserExists(jwt_payload, callback) {
    if (!jwt_payload || !jwt_payload.id) {
      callback("No user found!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOne({'id' : jwt_payload.id}, function(err, result) {
            if (err) {
              callback("No user found!", null);
            } else {
              if (result) {
                callback(null, result);
              } else  {
                callback(null, null);
              }
            }

            db.close();
          });
        }
      });
    }
  },

  addUser:
  function addUser(user, callback) {
    if (!user || !user.id) {
      callback("Error adding the user!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOne({'id' : user.id}, function(err, result) {
            if (err) {
              callback("Error adding the user!", null);
            } else {
              if (result) {
                callback(null, result);
              } else  {
                dbo.collection("Users").insertOne(user, function(err, res) {
                  if (err) {
                    console.log("Error inserting the user : " + user);
                  }
                  db.close();
                });
                callback(null, user);
              }
            }
          });
        }
      });
    }
  },

  getUserViaID:
  function getUserViaID(userID, callback) {
    if (!userID) {
      callback("Error finding the user!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOne({'_id' : ObjectId(userID)}, function(err, result) {
            if (err) {
              callback("Error finding the user!", null);
            } else {
              if (result) {
                var average_rank = 0;
                var average_gains = 0;
                var total_tokens = 0;
                var number_top_three = 0;

                for (index in result.past_leagues) {
                  average_rank += result.past_leagues[index].user_rank;
                  average_gains += result.past_leagues[index].portfolio_value;
                  total_tokens += result.past_leagues[index].user_payout;

                  if (result.past_leagues[index].user_rank <= 3) {
                    number_top_three += 1;
                  }
                }

                average_rank = average_rank/result.past_leagues.length;
                average_gains = average_gains/result.past_leagues.length;

                result.average_rank = average_rank;
                result.average_gains = average_gains;
                result.total_tokens = total_tokens;
                result.number_top_three = number_top_three;

                callback(null, JSON.parse(JSON.stringify(result)));
              } else  {
                callback(null, null);
              }
            }

            db.close();
          });
        }
      });
    }
  },

  getUserViaUsername:
  function getUserViaUsername(username, callback) {
    if (!username) {
      callback("Error finding the user via username!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOne({'username' : username}, function(err, result) {
            if (err) {
              callback("Error finding the user via username!", null);
            } else {
              if (result) {
                callback(null, true);
              } else  {
                callback(null, false);
              }
            }

            db.close();
          });
        }
      });
    }
  },

  getUserObjectViaUsername:
  function getUserObjectViaUsername(username, callback) {
    if (!username) {
      callback("Error finding the user via username!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOne({'username' : username}, function(err, result) {
            if (err) {
              callback("Error finding the user via username!", null);
            } else {
              if (result) {
                var average_rank = 0;
                var average_gains = 0;
                var total_tokens = 0;
                var number_top_three = 0;

                for (index in result.past_leagues) {
                  average_rank += result.past_leagues[index].user_rank;
                  average_gains += result.past_leagues[index].portfolio_value;
                  total_tokens += result.past_leagues[index].user_payout;

                  if (result.past_leagues[index].user_rank <= 3) {
                    number_top_three += 1;
                  }
                }

                average_rank = average_rank/result.past_leagues.length;
                average_gains = average_gains/result.past_leagues.length;

                result.average_rank = average_rank;
                result.average_gains = average_gains;
                result.total_tokens = total_tokens;
                result.number_top_three = number_top_three;

                callback(null, JSON.parse(JSON.stringify(result)));
              } else  {
                callback("Error finding the user via username!", null);
              }
            }

            db.close();
          });
        }
      });
    }
  },

  getUserViaPartialUsername:
  function getUserViaPartialUsername(username, callback) {
    if (!username) {
      callback("Error finding usernames!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").find({'username' : {'$regex': new RegExp(username, "i") }}).sort( {username : 1} ).toArray(function(err, result) {
            if (err) {
              callback("Error finding the usernames!", null);
            } else {
              if (result) {
                var usernames = [];
                for (user in result) {
                  usernames.push(result[user].username);
                }
                callback(null, usernames);
              } else  {
                callback(null, null);
              }
            }

            db.close();
          });
        }
      });
    }
  },

  updateUser:
  function updateUser(user, callback) {
    if (!user || !user._id) {
      callback("Error updating the user!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOneAndUpdate({'_id': ObjectId(user._id)}, {$set: {email: user.email, username: user.username,
            profilePicture: user.profilePicture, email_notification: user.email_notification}}, function(err, res) {
              if (err) {
                callback("Error updating the user!", null);
              } else {
                if (res) {
                  res.value.email = user.email;
                  res.value.username = user.username;
                  res.value.profilePicture = user.profilePicture;
                  res.value.email_notification = user.email_notification;
                  updateUserInLeagues(res.value);

                  callback(null, token.generateAccessToken(res.value));
                } else {
                  callback("Error finding the user!", null);
                }
              }

              db.close();
            });
        }
      });
    }
  },

  updateUserLeague:
  function updateUserLeague(user, callback) {
    if (!user || !user._id) {
      callback("Error updating the user's league!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOneAndUpdate({'_id': ObjectId(user._id)}, {$set: {currentLeague_id: user.currentLeague_id, tokens: user.tokens}},
            function(err, res) {
              if (err) {
                callback("Error updating the user's league!", null);
              } else {
                if (res) {
                  res.value.currentLeague_id = user.currentLeague_id;
                  res.value.tokens = user.tokens;
                  callback(null, token.generateAccessToken(res.value));
                } else {
                  callback("Error finding the user!", null);
                }
              }
              db.close();
            });
        }
      });
    }
  },

  updateUserLeagueForNullLeague:
  function updateUserLeagueForNullLeague(user, callback) {
    if (!user || !user._id) {
      callback("Error existing the league!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOneAndUpdate({'_id': ObjectId(user._id)}, {$set: {currentLeague_id: user.currentLeague_id}},
            function(err, res) {
              if (err) {
                callback("Error existing the league!", null);
              } else {
                if (res) {
                  res.value.currentLeague_id = user.currentLeague_id;
                  res.value.past_leagues = user.past_leagues;
                  callback(null, token.generateAccessToken(res.value));
                } else {
                  callback("Error finding the user!", null);
                }
              }
              db.close();
            });
        }
      });
    }
  },

  getAllUsers:
  function getAllUsers(page, callback) {
    if (!page) {
      page = 0;
    }

    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        callback("We are currently facing some technically difficulties, please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("Users").find({}).sort( { tokens: -1 } ).limit(25).skip(page).toArray(function(err, result) {
          if (err) {
            callback("Error finding users!", null);
          } else {
            if (result) {
              for (user in result) {
                result[user].id = null;
                result[user].email = null;
                result[user].firstname = null;
                result[user].lastname = null;
              }

              callback(null, JSON.parse(JSON.stringify(result)));
            } else  {
              callback(null, null);
            }
          }

          db.close();
        });
      }
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
      if (err) {
        callback("We are currently facing some technically difficulties, please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("Users").find({}).toArray(function(err, result) {
          if (err) {
            callback("Error finding all users", null);
          } else {
            if (result) {
              var object = { "totalUsers" : result.length };
              callback(null, JSON.parse(JSON.stringify(object)));
            } else  {
              callback(null, null);
            }
          }
          db.close();
        });
      }
    });
  },

  getLeagueTypes:
  function getLeagueTypes(callback) {
    MongoClient.connect(mongodbUrl, function (err, db) {
      if (err) {
        callback("We are currently facing some technically difficulties, please try again later!", null);
      } else {
        var dbo = db.db("cryptoleague_database");
        dbo.collection("League_Types").find({}).toArray(function(err, result) {
          if (err) {
            callback("Error finding the league types!", null);
          } else {
            if (result) {
              callback(null, JSON.parse(JSON.stringify(result)));
            } else  {
              callback(null, null);
            }
          }
          db.close();
        });
      }
    });
  },

  checkLeagueType:
  function checkLeagueType(league_Types_id, user_id, callback) {
    if (!league_Types_id || !user_id) {
      callback("Error finding the user and the league type!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("League_Types").findOne({'league_type_id' : league_Types_id}, function(err, result) {
            if (err) {
              callback("Error finding the league types!", null);
            } else {
              if (result) {
                dbo.collection("Users").findOne({'_id' : ObjectId(user_id)}, function(err, result_user) {
                  if (err || !result_user) {
                    callback("Error finding the user", null);
                  } else {
                    if (result_user.tokens < result.buy_in) {
                      callback('No enough tokens!', null);
                    } else {
                      callback(null, {'league_type' : result, 'user' : result_user});
                    }
                  }

                  db.close();
                });
              } else  {
                callback('League does not exist', null);
              }
            }
          });
        }
      });
    }
  },

  createLeague:
  function createLeague(league_Type, user, callback) {
    if (!league_Type || !league_Type.title || !league_Type.buy_in || !user || !user._id || !user.tokens || !user.username) {
      callback("Error create the league! Please try again later!", null);
    } else {
      makeNewPortfolio(function(err, portfolio) {
        if (err) {
          callback(err, null);
        } else {
          findWaitingLeague(league_Type.title, function(error, league_result) {
            if (error) {
              callback(error, null);
            } else {
              if (!league_result) {
                getNextSequenceValue(function(error, next_number) {
                  if (error || !next_number) {
                    if (error) {
                      callback(error, null);
                    } else {
                      console.log("Did not find the league counter");
                      callback("Error create the league! Please try again later!", null);
                    }
                  } else {
                    var league = new league_schema();

                    league.league_id = next_number;
                    league.league_type =  league_Type.title;
                    league.league_buy_in = league_Type.buy_in;
                    league.status = "0";
                    league.portfolio_ids.push({
                      "username": user.username,
                      "tokens": user.tokens,
                      "profilePicture": user.profilePicture,
                      "user_id": user._id,
                      "portfolio_id" : portfolio._id,
                      "portfolio_value": null
                    });
                    league.start_time = null;

                    MongoClient.connect(mongodbUrl, function (err, db) {
                      if (err) {
                        callback("We are currently facing some technically difficulties, please try again later!", null);
                      } else {
                        var dbo = db.db("cryptoleague_database");
                        dbo.collection("Leagues").insertOne(league, function(err, res) {
                          if (err) {
                            callback("Error creating the league!", null);
                          } else {
                            callback(null, JSON.parse(JSON.stringify(league)));
                          }

                          db.close();
                        });
                      }
                    });
                  }
                });
              } else {
                MongoClient.connect(mongodbUrl, function (err, db) {
                  if (err) {
                    callback("We are currently facing some technically difficulties, please try again later!", null);
                  } else {
                    var dbo = db.db("cryptoleague_database");

                    league_result.portfolio_ids.push({
                      "username": user.username,
                      "tokens": user.tokens,
                      "profilePicture": user.profilePicture,
                      "user_id": user._id,
                      "portfolio_id" : portfolio._id,
                      "portfolio_value": null
                    });

                    dbo.collection("Leagues").findOneAndUpdate({'league_id': league_result.league_id},
                      {$push: {'portfolio_ids': {
                        "username": user.username,
                        "tokens": user.tokens,
                        "profilePicture": user.profilePicture,
                        "user_id": user._id,
                        "portfolio_id" : portfolio._id,
                        "portfolio_value": null
                      }
                    }});

                    if (league_result.portfolio_ids.length == 10 || league_result.portfolio_ids.length >= 100) {
                      if (league_result.portfolio_ids.length >= 100) {
                        league_result.status = "2";
                      } else {
                        var date = new Date();

                        var lockingTime = new Date(date);
                        lockingTime.setMinutes(date.getMinutes() + 1);
                        //lockingTime.setHours(date.getHours() + 12);

                        var startTime = new Date(date);
                        startTime.setMinutes(date.getMinutes() + 2);
                        //startTime.setDate(date.getDate() + 1);

                        var endingDate = new Date(date);
                        endingDate.setMinutes(date.getMinutes() + 3);
                        //endingDate.setDate(date.getDate() + 2);

                        league_result.status = "1";
                        league_result.start_time = startTime;

                        console.log("Scheduled locking at: "+ lockingTime);
                        console.log("Scheduled starting at: "+startTime);
                        console.log("Scheduled ending at: "+endingDate);

                        schedule.scheduleJob(lockingTime, lockLeague.bind(null, league_result.league_id));
                        schedule.scheduleJob(startTime, startLeague.bind(null, league_result.league_id));
                        schedule.scheduleJob(endingDate, endLeague.bind(null, league_result.league_id));
                      }

                      dbo.collection("Leagues").findOneAndUpdate({'league_id': league_result.league_id}, {$set: {status : league_result.status, start_time: league_result.start_time}});

                      callback(null, JSON.parse(JSON.stringify(league_result)));
                    } else {
                      callback(null, JSON.parse(JSON.stringify(league_result)));
                    }

                    db.close();
                  }
                });
              }
            }
          });
        }
      });
    }
  },

  getLeague:
  function getLeague(league_id, user_id, callback) {
    if (!league_id || !user_id) {
      callback("Error getting the league!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Leagues").findOne({'league_id' : league_id}, function(err, result) {
            if (err) {
              callback("Error getting the league!", null);
            } else {
              if (result) {
                if (result.status.toString() === '3') {
                  calculatePortfoliosValues(result, function() {
                    var foundUser = false;
                    asyncLoop(result.portfolio_ids, function (item, next) {
                      if (item) {
                        if (item.user_id.toString() === user_id.toString()) {
                          foundUser = true;
                        } else {
                          item.portfolio_id = null;
                        }
                      }
                      next();
                    }, function () {
                      var response = {
                        _id: result._id,
                        portfolio_ids: result.portfolio_ids,
                        league_id: result.league_id,
                        league_type: result.league_type,
                        status: result.status,
                        start_time: result.start_time,
                        buy_in: result.league_buy_in
                      };

                      if (foundUser == false) {
                        callback("Access denied! User not in the league!", null);
                      } else {
                        callback(null, JSON.parse(JSON.stringify(response)));
                      }
                    });
                  });
                } else {
                  var foundUser = false;
                  asyncLoop(result.portfolio_ids, function (item, next) {
                    if (item) {
                      if (result.status.toString() !== '4') {
                        if (item.user_id.toString() === user_id.toString()) {
                          foundUser = true;
                        } else {
                          item.portfolio_id = null;
                        }
                      }
                    }
                    next();
                  }, function () {
                    var response = {
                      _id: result._id,
                      portfolio_ids: result.portfolio_ids,
                      league_id: result.league_id,
                      league_type: result.league_type,
                      status: result.status,
                      start_time: result.start_time,
                      buy_in: result.league_buy_in
                    };

                    if (foundUser == false) {
                      if (response.status.toString() === '4') {
                        callback(null, JSON.parse(JSON.stringify(response)));
                      } else {
                        callback("Access denied! User not in the league!", null);
                      }
                    } else {
                      callback(null, JSON.parse(JSON.stringify(response)));
                    }
                  });
                }
              } else {
                callback("League does not exist!", null);
              }
            }

            db.close();
          });
        }
      });
    }
  },

  getPortfolio:
  function getPortfolio(league_id, user_id, user_actual_id, callback) {
    if (!league_id || !user_id || !user_actual_id) {
      callback("Error getting the user's portfolio!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Leagues").findOne({'league_id' : league_id}, function(err, result) {
            if (err) {
              callback("Unable to find the league to get the portfolio!", null);
            } else {
              if (result) {
                asyncLoop(result.portfolio_ids, function (item, next) {
                  if (item) {
                    if (item.user_id.toString() === user_id.toString()) {

                      if (user_id.toString() !== user_actual_id.toString()) {

                        if (result.status.toString() === '4') {
                          getPortfolioWithID(item.portfolio_id, function(err, res) {
                            callback(err, res);
                            return;
                          });
                        } else {
                          callback("Can not access the portfolio at this time!", null);
                          return;
                        }

                      } else {
                        getPortfolioWithID(item.portfolio_id, function(err, res) {
                          callback(err, res);
                          return;
                        });
                      }

                    } else {
                      next();
                    }
                  } else {
                    next();
                  }
                }, function () {
                  callback("User not found in the league!", null);
                });
              } else  {
                callback("League does not exist!", null);
              }
            }

            db.close();
          });
        }
      });
    }
  },

  updatePortfolioWithID:
  function updatePortfolioWithID(portfolio_id, holding, captain_coin, callback) {
    if (!portfolio_id || !holding) {
      callback("Error updating the portfolio!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Portfolios").findOneAndUpdate({'_id': ObjectId(portfolio_id)}, {$set: {holdings : holding, captain_coin: captain_coin}}, function(err, result) {
            if (result) {
              result.value.holdings = holding;
              result.value.captain_coin = captain_coin;
            }

            callback(err, result.value);
          });
          db.close();
        }
      });
    }
  },

  sendTokens:
  function sendTokens(from, to, change, callback) {
    if (!from || !to || !change) {
      callback("Error updating the tokens!", null);
    } else {
      MongoClient.connect(mongodbUrl, function (err, db) {
        if (err) {
          callback("We are currently facing some technically difficulties, please try again later!", null);
        } else {
          var dbo = db.db("cryptoleague_database");
          dbo.collection("Users").findOne({'_id' : from}, function(err, result) {
            if (err) {
              callback("Error finding the payee!", null);
            } else {
              if(result) {
                dbo.collection("Users").findOne({'_id' : from}, function(err, result1) {
                  if (err) {
                    callback("Error finding receiver!", null);
                  } else {
                    if(result1) {
                      if(result.tokens - change >= 25) {
                        dbo.collection("Users").findOneAndUpdate({'_id': from}, {$inc: {tokens: -change}}, function(err, res) {
                            if (err) {
                              callback("Error updating the payees tokens!", null);
                            } else {
                              if (res) {
                                dbo.collection("Users").findOneAndUpdate({'username': to}, {$inc: {tokens: change}}, function(err, res1) {
                                  if (err) {
                                    console.log(err);
                                    callback("Error updating the receiver's tokens!", null);
                                  } else {
                                    if (res1) {
                                      // res.value.tokens = result.tokens - change;
                                      callback(null, token.generateAccessToken(res.value));
                                    } else {
                                      callback("Error finding the receiver!", null);
                                    }
                                  }
                                  });
                              } else {
                                callback("Error finding the payee!", null);
                              }
                            }

                            db.close();
                          });
                      } else {
                        callback("You do not have enough tokens to transfer", null);
                      }
                    } else {
                      callback("Receiver does not exist", null);
                    }
                  }
                });
              } else {
                callback("Payee does not exist", null);
              }
            }
          });
        }
      });
    }
  }
};
