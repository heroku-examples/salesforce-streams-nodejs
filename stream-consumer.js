const Episode7 = require('episode-7');
const redis = require('redis');

const salesforceStreams = require('./lib/salesforce-streams');
const fetchSalesforceDetails = require('./lib/fetch-salesforce-details');

console.log('-----> Initializing worker');

require('dotenv').config()
const dev = process.env.NODE_ENV !== 'production';

// Setup Redis datastore to publish incoming messages from Salesforce
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL == null) {
  throw new Error('Requires REDIS_URL env var.');
}
const redisClient = redis.createClient(REDIS_URL);
redisClient.on("error", function (err) {
  logger(`redis stream error: ${err.stack}`);
  process.exit(1);
});

// For each incoming message:
const messageCallback = (message, salesforceApi) => {
  // Populate more details of the message (like User name & Account name)
  return fetchSalesforceDetails(message, salesforceApi)
    .then( decoratedMessage => {
      const data = JSON.stringify(decoratedMessage);
      console.error(`       👁‍🗨  Salesforce message ${data}`);
      // publish it to Redis "salesforce" channel
      redisClient.publish('salesforce', data);
      // add it to the limited-length Redis "salesforce-recent" list
      redisClient.lpush('salesforce-recent', data);
      redisClient.ltrim('salesforce-recent', 0, 99);
    })
    .catch( err => {
      console.error(`Salesforce streams message callback error: ${err.stack}`);
    });
};

// Subscribe to Salesforce Streaming API topics (OBSERVE_SALESFORCE_TOPIC_NAMES)
Episode7.run(salesforceStreams, process.env, messageCallback)
  .catch( err => {
    console.error(err);
    process.exit(1);
  });
