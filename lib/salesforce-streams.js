const Episode7 = require('episode-7');

const loggers                    = require('./loggers');
const initSalesforceApi          = require('./init-salesforce-api');
const subscribeSalesforceStreams = require('./subscribe-salesforce-streams');

const defaultForceComVersion  = '45.0';
const valueSeparator          = /[,\s]+/;

function* streamsModule(env, messageCallback, logStream) {
  if (typeof env !== 'object') {
    throw new Error('Environment object is required.')
  }
  if (typeof messageCallback !== 'function') {
    throw new Error('Requires messageCallback function to handle each message received.');
  }
  if (logStream != null && typeof logStream.write !== 'function') {
    throw new Error('Log stream (optional) does not appear to be a stream.');
  }

  let logger;
  if (env.VERBOSE === true || env.VERBOSE === 'true' || env.VERBOSE === '1') {
    if (logStream == null) {
      logger = loggers.verbose;
    } else {
      logger = v => logStream.write(v, 'utf8');
    }
  } else {
    logger = loggers.verbose;
  }

  logger('-----> Initializing Salesforce streams ☁️');

  const salesforceTopicNames = env.OBSERVE_SALESFORCE_TOPIC_NAMES
    && env.OBSERVE_SALESFORCE_TOPIC_NAMES.length > 0
      ? env.OBSERVE_SALESFORCE_TOPIC_NAMES.split(valueSeparator)
      : [];
  if (salesforceTopicNames.length === 0) {
    throw new Error('Requires OBSERVE_SALESFORCE_TOPIC_NAMES containing at least one name.');
  }

  const forceComVersion = env.FORCE_API_VERSION || defaultForceComVersion;
  const salesforceApi   = yield Episode7.call(initSalesforceApi, env, forceComVersion, logger);

  // Subscribe to Salesforce Streaming API
  yield Episode7.call(
    subscribeSalesforceStreams,
    salesforceApi,
    salesforceTopicNames,
    messageCallback,
    env,
    logger);
};

module.exports = streamsModule;
