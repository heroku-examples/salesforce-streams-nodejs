const test = require('ava');
const subscribeSalesforceStreams = require('./subscribe-salesforce-streams');
const loggers = require('./loggers');

test('subscribeSalesforceStreams', t => {
  t.plan(3) // one for each topic name
  t.true(true) // plus this faker to make the test runner wait

  const mockEnv = {
    REDIS_URL: process.env.REDIS_URL
  };
  const topicNames = ['/test/name', '/test/eman'];
  const messageCallback = d => d;
  let mockTopicIndex = 0;
  const mockSalesforceApi = { 
    streaming: {
      createClient: () => {
        return {
          addExtension: () => {},
          on: () => {},
          subscribe: (name) => {
            t.is(name, topicNames[mockTopicIndex])
            mockTopicIndex += 1
          }
        }
      }
    }
  };

  return subscribeSalesforceStreams(mockSalesforceApi, topicNames, messageCallback, mockEnv, loggers.verbose)
})
