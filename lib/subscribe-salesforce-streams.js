const redis = require('redis');
const jsforce = require('jsforce');

const monitorStatus = require('./monitor-status');
const loggers = require('./loggers');

function subscribeSalesforceStreams(salesforceApi, topicNames, messageCallback, env, logger = loggers.default) {
  if (salesforceApi == null) {
    throw new Error('Requires salesforceApi, a jsForce connection.');
  }
  if (! topicNames instanceof Array || topicNames.length < 1) {
    throw new Error('Requires array of topicNames.');
  }
  if (typeof messageCallback !== 'function') {
    throw new Error('Requires messageCallback function to handle each message received.');
  }

  // Setup Redis datastore to save stream checkpoints (Replay IDs)
  if (env == null || env.REDIS_URL == null) {
    throw new Error('Requires REDIS_URL env var.');
  }
  const redisClient = redis.createClient(env.REDIS_URL);
  redisClient.on("error", function (err) {
    logger(`redis error: ${err.stack}`);
    process.exit(1);
  });

  // Handle Salesforce API auth failure by logging and crashing
  const exitCallback = () => {
    logger(`!      Salesforce API authentication became invalid. Exiting failure.`)
    process.exit(1);
  };
  const authFailureExt = new jsforce.StreamingExtension.AuthFailure(exitCallback);

  // To debug all messages, add this extension to the createClient arg array
  const loggingExt = new LoggingExtension(logger);

  // Create the Faye streaming client: https://faye.jcoglan.com/
  const fayeClient = salesforceApi.streaming.createClient([ authFailureExt ]);
  monitorStatus(redisClient, fayeClient);

  // Subscribe to each topic including support for checkpoint persistence
  return Promise.all(topicNames.map( topicName => {
    logger(`-----> Subscribing to Salesforce topic ${topicName}`);

    const replayKey = `replayId:${topicName}`;
    function saveReplayId(v) {
      return new Promise((resolve, reject) => {
        if (v != null) {
          redisClient.set(replayKey, v.toString(), (err, res) => {
            if (err) {
              reject(err);
            } else {
              logger(`       ⏺  Save checkpoint ${v}`);
              resolve(res);
            }
          }); 
        } else {
          resolve();
        }
      });
    }
    function readReplayId() {
      return new Promise((resolve, reject) => {
        if (env.REPLAY_ID != null) {
          resolve(env.REPLAY_ID);
        } else {
          redisClient.get(replayKey, (err, res) => {
            if (err) {
              reject(err);
            } else {
              resolve(res);
            }
          });
        }
      });
    }

    return readReplayId().then( v => {
      const replayId = v == null ? null : parseInt(v, 10);
      return subscribeAndPush(
        salesforceApi,
        fayeClient,
        topicName,
        replayId,
        saveReplayId,
        messageCallback,
        logger);
    })
  }));
}

function subscribeAndPush(
  salesforceApi,
  fayeClient,
  topicName,
  replayId,
  saveReplayId,
  messageCallback,
  logger
) {
  if (replayId != null) {
    logger(`       ⏮  Replaying from ${replayId}`);
    const replayExt = new jsforce.StreamingExtension.Replay(topicName, replayId);
    fayeClient.addExtension(replayExt);
  }
  logger(`       ▶️  Now streaming…`);
  fayeClient.subscribe(topicName, data => {
    // Call user-supplied function with the data and Salesforce API
    return Promise.resolve()
      .then(() => messageCallback(data, salesforceApi))
      .then(() => saveReplayId(data.event.replayId))
      .catch( err => {
        logger(`!      Streaming subscription error: ${err.stack}`);
      });
  });
}

/**
 * Log all incoming CometD messages
 */
const LoggingExtension = function(logger) {
  this.incoming = function(message, callback) {
    logger(`       👁‍🗨 message from Salesforce ${JSON.stringify(message)}`);
    callback(message);
  }
};

module.exports = subscribeSalesforceStreams;
