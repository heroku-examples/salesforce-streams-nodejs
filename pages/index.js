import React from 'react'

class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messageIds: new Set(),
      messages: {},
      status: {}
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
    return (
      <div>
        <p>{this.state.status.salesforceStreamingConnectionIsUp ? '✅' : '❌'} Salesforce connection</p>
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
