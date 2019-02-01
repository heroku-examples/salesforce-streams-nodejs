const Episode7 = require('episode-7');

const salesforceStreams = require('./lib/salesforce-streams');

require('dotenv').config()
const dev = process.env.NODE_ENV !== 'production';

console.log('-----> Initializing worker');

const messageCallback = data => {
  console.error(`       👁‍🗨  Salesforce message ${JSON.stringify(data)}`);
};

Episode7.run(salesforceStreams, process.env, messageCallback)
  .catch( err => {
    console.error(err);
    process.exit(1);
  });
