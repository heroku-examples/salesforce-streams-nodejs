import React from 'react'

class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messageIds: new Set(),
      messages: {}
    };
  }

  componentDidMount() {
    // Server-Sent Events (SSE) handler to receive messages
    // https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
    this.eventSource = new EventSource("/stream/messages");
    this.eventSource.addEventListener("salesforce", event => {
      const message = JSON.parse(event.data);
      const [header, content] = getMessageParts(message);
      const id      = header.transactionKey || 'none';
      // Collect them newest-first
      this.state.messageIds.add(id);
      this.state.messages[id] = message;
      this.setState({
        messageIds: this.state.messageIds,
        messages: this.state.messages
      });
    }, false);
  }

  componentWillUnmount() {
    this.eventSource.close();
  }

  render() {
    return (
      <ul>
        {[...this.state.messageIds].reverse().map( id => {
          const message = this.state.messages[id];
          const [header, content] = getMessageParts(message);
          return <li key={header.transactionKey}>
            {header.entityName || '(Nameless)'} {' / '}
            {header.changeType || '(Typeless)'} {' / '}
            {content.LastModifiedDate || '(Dateless)'}
          </li>;
        })}
      </ul>
    )
  }
}

function getMessageParts(message) {
  const content = message.payload || {};
  const header  = content.ChangeEventHeader || {};
  return [header, content];
}

export default IndexPage;
