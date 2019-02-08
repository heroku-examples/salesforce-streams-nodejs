import React from 'react'

class IndexPage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      messages: []
    };
  }

  componentDidMount() {
    // Server-Sent Events (SSE) handler to receive messages
    // https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
    this.eventSource = new EventSource("/stream/messages");
    this.eventSource.addEventListener("salesforce", event => {
      var message = JSON.parse(event.data);
      // Collect them newest-first
      this.state.messages.unshift(message);
      this.setState({
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
        {this.state.messages.map( m => {
          const content = m.payload || {};
          const header  = content.ChangeEventHeader || {};
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

export default IndexPage;
