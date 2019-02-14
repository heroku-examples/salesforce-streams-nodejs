const redis = require('redis');

function redisHeartbeat(redisUrl, periodSecs) {
  // Setup Redis datastore to drive heartbeat
  const redisHeartbeat = redis.createClient(redisUrl);
  redisHeartbeat.on("error", function (err) {
    console.error(`redis heartbeat error: ${err.stack}`);
    process.exit(1);
  });
  redisHeartbeat.publish('heartbeat', '💗');
  setInterval(() => {
    redisHeartbeat.publish('heartbeat', '💗');
  }, periodSecs * 1000);
}

module.exports = redisHeartbeat;
