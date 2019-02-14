import React from 'react'
import classNames from 'classnames';

class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messageIds: new Set(),
      messages: {},
      status: {},
      heartbeating: false
    };
  }

  componentDidMount() {
    this.subscribeToSalesforceMessages();
  }

  componentWillUnmount() {
    this.unsubscribeFromSalesforceMessages();
  }

  render() {
    const decendingMessageIds = [...this.state.messageIds].reverse();

    const heartbeating = this.state.heartbeating;
    const heartbeatReason = heartbeating ? 'App is on-line' : 'App is off-line';
    const salesforceStreamIsUp = this.state.status.salesforceStreamingConnectionIsUp;
    const salesforceStreamReason = this.state.status.salesforceStreamingConnectionReason;
    const salesforceReason = heartbeating ? salesforceStreamReason : heartbeatReason;

    return (
      <div>
        <p>

        <span className={classNames({
          "heart": true,
          "heartbeat": heartbeating
          })}
          title={heartbeatReason}>{'💗'}</span>
        <style jsx>{`
          .heart {
            font-size: 2rem;
            opacity: 0.1;
            transition: opacity 2.5s ease-out;
          }
          .heartbeat {
            opacity: 1;
            transition: opacity 2.5s ease-in;
          }
        `}</style>

        <span className={classNames({
          "salesforce-stream": true,
          "salesforce-stream-online": heartbeating && salesforceStreamIsUp
          })}
          title={salesforceReason}>{'☁️'}
        </span>
        <style jsx>{`
          .salesforce-stream {
            font-size: 2rem;
            opacity: 0.1;
            transition: opacity 2.5s ease-out;
          }
          .salesforce-stream-online {
            opacity: 1;
            transition: opacity 2.5s ease-in;
          }
        `}</style>

        </p>
        <ul>
          {decendingMessageIds.map( id => {
            const message = this.state.messages[id];
            const [header, content, context] = getMessageParts(message);
            return <li
              key={header.transactionKey}
              style={header.changeType === 'GAP_UPDATE' ? { display: 'none'} : {}}>
              <p>
                {(header.changeType || '(Typeless)').toLowerCase()} {' '}
                <strong>{context[`${header.entityName}Name`] || (Nameless)}</strong> {' '}
                {(header.entityName || '(nameless)').toLowerCase()}
                <br/>
                by {context.UserName || '(No commit user)'} at {content.LastModifiedDate || '(Dateless)'}
              </p>
            </li>;
          })}
        </ul>
      </div>
    )
  }

  subscribeToSalesforceMessages = () => {
    // Server-Sent Events (SSE) handler to receive messages
    // https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
    this.eventSource = new EventSource("/stream/messages");

    // Drive "App is on-line" indicator from heartbeat events.
    // `heartbeating` will become false if a heartbeat is not 
    // received within 10-sec period.
    let lastBeat;
    this.eventSource.addEventListener("heartbeat", event => {
      if (lastBeat) clearTimeout(lastBeat);
      this.setState({ heartbeating: true });
      lastBeat = setTimeout(() => {
        this.setState({ heartbeating: false });
      }, 10000);
    }, false);

    // Drive "Salesforce Streaming API is on-line" indicator
    // and description from status events.
    this.eventSource.addEventListener("status", event => {
      const status = JSON.parse(event.data);
      this.setState({
        status: {
          salesforceStreamingConnectionReason: null,
          ...status
        }
      });
    }, false);

    // Receive Salesforce change events as they occur.
    this.eventSource.addEventListener("salesforce", event => {
      const message = JSON.parse(event.data);
      const [header] = getMessageParts(message);
      const id = header.transactionKey || 'none';
      // Collect message IDs into a Set to dedupe
      this.state.messageIds.add(id);
      // Collect message contents by ID
      this.state.messages[id] = message;
      this.setState({
        messageIds: this.state.messageIds,
        messages: this.state.messages
      });
    }, false);

    this.eventSource.addEventListener("error", err => {
      console.error('EventSource error', err);
    }, false);
  }

  unsubscribeFromSalesforceMessages = () => {
    this.eventSource.close();
  }
}

function getMessageParts(message) {
  const content = message.payload || {};
  const context = message.context || {};
  const header  = content.ChangeEventHeader || {};
  return [header, content, context];
}

export default IndexPage;
