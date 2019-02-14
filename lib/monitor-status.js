const {promisify} = require('util');

const heartbeatSecs = 5;

function monitorStatus(redisClient, fayeClient) {
  if (redisClient == null) {
    throw new Error('Requires redisClient');
  }
  if (fayeClient == null) {
    throw new Error('Requires fayeClient');
  }
  const getAsync = promisify(redisClient.get).bind(redisClient);

  redisClient.publish('heartbeat', '💗');
  setInterval(() => {
    redisClient.publish('heartbeat', '💗');
  }, heartbeatSecs * 1000)

  function publishStatus(newStatus) {
    return getAsync('status-recent')
      .then( oldStatusData => {
        const oldStatus = JSON.parse(oldStatusData);
        const redisMulti = redisClient.multi();
        const execMultiAsync = promisify(redisMulti.exec).bind(redisMulti);
        const data = JSON.stringify({
          ...oldStatus,
          ...newStatus
        });
        redisMulti.publish('status', data);
        redisMulti.set('status-recent', data);
        return execMultiAsync();
      })
      .catch( err => {
        logger(`!      Status publishing error: ${err.stack}`);
      });
  }

  process.on('SIGINT', function(code) {
    return publishStatus({
        salesforceStreamingConnectionIsUp: false,
        salesforceStreamingConnectionReason: "stream_consumer process interrupted"
      }).
      then(() => process.exit());
  });

  process.on('SIGTERM', function(code) {
    return publishStatus({
        salesforceStreamingConnectionIsUp: false,
        salesforceStreamingConnectionReason: "stream_consumer process terminated"
      }).
      then(() => process.exit());
  });

  process.on('SIGQUIT', function(code) {
    return publishStatus({
        salesforceStreamingConnectionIsUp: false,
        salesforceStreamingConnectionReason: "stream_consumer process quit"
      }).
      then(() => process.exit());;
  });

  fayeClient.on('transport:down', function() {
    return publishStatus({
      salesforceStreamingConnectionIsUp: false,
      salesforceStreamingConnectionReason: "Streaming API connection is down, off-line"
    });
  });

  fayeClient.on('transport:up', function() {
    return publishStatus({
      salesforceStreamingConnectionIsUp: true
    });
  });
}

module.exports = monitorStatus;
