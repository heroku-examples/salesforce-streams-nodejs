const redis = require('redis');
const {promisify} = require('util');

require('dotenv').config()
const dev = process.env.NODE_ENV !== 'production';

const salesforceCacheTTL = 86400; // 24-hours

// Setup Redis datastore to perform queries (separate from publisher)
// to get details that are missing from the CDC messages.
const REDIS_URL = process.env.REDIS_URL;
if (REDIS_URL == null) {
  throw new Error('Requires REDIS_URL env var.');
}
const redisQuery = redis.createClient(REDIS_URL);
const getAsync = promisify(redisQuery.get).bind(redisQuery);
const setAsync = promisify(redisQuery.set).bind(redisQuery);
redisQuery.on("error", function (err) {
  console.error(`redis query error: ${err.stack}`);
  process.exit(1);
});

const fetchSalesforceNameWithCache = (salesforceApi, sfid, type) => {
  if (sfid == null) { throw new Error("Requires `sfid` parameter (arg 0)") }
  if (type == null) { throw new Error("Requires `type` parameter (arg 1)") }
  const cacheKey = `salesforce-cache:${sfid}`;
  const contextKey = `${type}Name`;
  return getAsync(cacheKey)
    .then( cachedValue => {
      if (cachedValue == null) {
        return salesforceApi
          .sobject(type).select('Name').where(`Id = '${sfid}'`).execute()
          .then( records => {
            if (records[0] != null) {
              return setAsync(cacheKey, records[0].Name, 'EX', salesforceCacheTTL)
                .then( () => {
                  return { [contextKey]: records[0].Name };
                });
            }
          })
      } else {
        return { [contextKey]: cachedValue };
      }
    });
}

const fetchSalesforceDetails = (message, salesforceApi) => {
  const content = message.payload || {};
  const header  = content.ChangeEventHeader || {};
  const fetches = [];
  if (header.commitUser != null) {
    fetches.push(fetchSalesforceNameWithCache(salesforceApi, header.commitUser, 'User'));
  }
  if (header.recordIds[0] != null) {
    fetches.push(fetchSalesforceNameWithCache(salesforceApi, header.recordIds[0], header.entityName));
  }
  return Promise.all(fetches)
    .then( results => {
      message.context = {};
      // Merge the returned record details into the message "context" property.
      results.forEach( r => message.context = {...message.context, ...r} );
      return message;
    });
};

module.exports = fetchSalesforceDetails;
