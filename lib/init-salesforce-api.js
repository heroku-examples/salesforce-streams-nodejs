const url = require('url');
const jsforce = require('jsforce');
const jsforceConnection = require('jsforce-connection').connectionFromUrl;
const Episode7 = require('episode-7');
const loggers = require('./loggers');

/*
Accepts Salesforce auth via env vars:
  * `SALESFORCE_URL`
  * `SALESFORCE_INSTANCE_URL` + `SALESFORCE_ACCESS_TOKEN`
  * `SALESFORCE_USERNAME` + `SALESFORCE_PASSWORD` + (optional) `SALESFORCE_LOGIN_URL`

Returns the jsforce Salesforce connection adapter.
*/
function* initSalesforceApi(env, forceComVersion, logger = loggers.default) {
  if (env.SALESFORCE_URL != null) {
    // Use OAuth client
    const salesforceApi = jsforceConnection(env.SALESFORCE_URL, forceComVersion);
    
    const identity = yield Episode7.call([salesforceApi, salesforceApi.identity]);
    logger(`-----> Identity via Salesforce URL: ${identity.username}`);

    return salesforceApi;

  } else if (env.SALESFORCE_INSTANCE_URL != null && env.SALESFORCE_ACCESS_TOKEN != null) {
    // Use existing access token
    const salesforceApi = new jsforce.Connection({
      instanceUrl: env.SALESFORCE_INSTANCE_URL,
      accessToken : env.SALESFORCE_ACCESS_TOKEN,
      version: forceComVersion
    });
    
    const identity = yield Episode7.call([salesforceApi, salesforceApi.identity]);
    logger(`-----> Identity via access token: ${identity.username}`);

    return salesforceApi;

  } else if (env.SALESFORCE_USERNAME != null && env.SALESFORCE_PASSWORD != null) {
    // Use plain jsforce with username/password
    const salesforceApi = new jsforce.Connection({
      loginUrl: env.SALESFORCE_LOGIN_URL,
      version: forceComVersion
    });

    yield Episode7.call(
      [salesforceApi, salesforceApi.login],
      env.SALESFORCE_USERNAME,
      env.SALESFORCE_PASSWORD
    );
    
    const identity = yield Episode7.call([salesforceApi, salesforceApi.identity]);
    logger(`-----> Identity via username & password: ${identity.username}`);

    return salesforceApi;

  } else {
    throw new Error('Requires either `SALESFORCE_URL` (containing auth) or `SALESFORCE_INSTANCE_URL`+`SALESFORCE_ACCESS_TOKEN` or `SALESFORCE_USERNAME`+`SALESFORCE_PASSWORD` environment vars.');
  }
}

module.exports = initSalesforceApi;
