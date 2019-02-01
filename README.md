🚧🔬 **Work in progress. Not yet functional.**

# Salesforce streams with Node.js

**This example app displays a feed of changes happening within a Salesforce org.**

🤐🚫🙅‍♀️ *Do not connect this app with a production Salesforce org without proper security review. This app receives potentially confidental data from the Salesforce org via Streaming API.*

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy)

This example app uses the Change Data Capture (CDC) stream, which must be enabled for each desired object in Salesforce Setup:

![Navigate to Salesforce Setup, then Integrations, then Change Data Capture](doc/Salesforce-setup-CDC.png "Salesforce Setup: Change Data Capture")

### Local development

```bash
git clone https://github.com/mars/salesforce-streams-nodejs
cd salesforce-streams-nodejs
```

Copy the local dev environment variables template, and then open `.env` in your editor to set the Salesforce username & password+securitytoken values:

```
cp .env.sample .env
```

Install Node packages and run in dev mode:

```bash
npm install
npm run dev
```

Then, visit [http://localhost:3000/](http://localhost:3000/) in your web browser.

Run tests:

```bash
npm test
```

### Configure Authentication

Performed based on environment variables. Either of the following authentication methods may be used:

* Username + password
  * `SALESFORCE_USERNAME`
  * `SALESFORCE_PASSWORD` (password+securitytoken)
  * `SALESFORCE_LOGIN_URL` (optional; defaults to **login.salesforce.com**)
* Existing OAuth token
  * `SALESFORCE_INSTANCE_URL`
  * `SALESFORCE_ACCESS_TOKEN`
  * Retrieve from an [sfdx](https://developer.salesforce.com/docs/atlas.en-us.212.0.sfdx_dev.meta/sfdx_dev/sfdx_dev_intro.htm) scratch org with:

    ```bash
    sfdx force:org:create -s -f config/project-scratch-def.json -a EventDrivenFunctions
    sfdx force:org:display
    ```
* OAuth client
  * `SALESFORCE_URL`
    * *Must include oAuth client ID, secret, & refresh token*
    * Example: `force://{client-id}:{secret}:{refresh-token}@{instance-name}.salesforce.com`

### Configure Runtime Behavior

* `FORCE_API_VERSION`
  * Salesforce API version
* `OBSERVE_SALESFORCE_TOPIC_NAMES`
  * **required**
  * the path part of a Streaming API URL
  * a comma-delimited list
  * example: `OBSERVE_SALESFORCE_TOPIC_NAMES=/event/Heroku_Function_Generate_UUID_Invoke__e`
* `REDIS_URL`
  * **required**
  * connection config to Redis datastore
  * example: `REDIS_URL=redis://localhost:6379`
  * default: should be set from Heroku Redis add-on
* `REPLAY_ID`
  * force a specific replayId for Salesforce Streaming API
  * ensure to unset this after usage to prevent the stream from sticking
  * example: `REPLAY_ID=5678` (or `-2` for all possible events)
  * default: unset, receive all new events

