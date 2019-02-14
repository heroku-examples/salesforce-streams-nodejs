import React from 'react'
import classNames from 'classnames';

class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messageIds: new Set(),
      messages: {},
      status: {},
      heartbeat: false
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
    const connectionIsUp = this.state.status.salesforceStreamingConnectionIsUp;
    const connectionReason = this.state.status.salesforceStreamingConnectionReason;
    return (
      <div>
        <p>

        <span className={classNames({
          "heart": true,
          "heartbeat": this.state.heartbeat
        })}>{'💗'}</span>
        <style jsx>{`
          .heart {
            opacity: 0.1;
            transition: opacity 2.5s ease-out;
          }
          .heartbeat {
            opacity: 1;
            transition: opacity 2.5s ease-in;
          }
        `}</style>

        {connectionIsUp ?
          '✅' :
          `❌ ${connectionReason}`}

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

    this.eventSource.addEventListener("heartbeat", event => {
      this.setState({ heartbeat: true });
      setTimeout(() => {
        this.setState({ heartbeat: false });
      }, 2500);
    }, false);

    this.eventSource.addEventListener("status", event => {
      const status = JSON.parse(event.data);
      this.setState({ status });
    }, false);

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
