// WebSocket Durable Object for real-time features
export class WebSocketDurableObject implements DurableObject {
  private sessions: Set<WebSocket> = new Set();
  private state: DurableObjectState;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/websocket') {
      // Upgrade to WebSocket
      const upgradeHeader = request.headers.get('Upgrade');
      if (upgradeHeader !== 'websocket') {
        return new Response('Expected Upgrade: websocket', { status: 426 });
      }

      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      this.handleSession(server);

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response('Not found', { status: 404 });
  }

  private handleSession(webSocket: WebSocket) {
    webSocket.accept();
    this.sessions.add(webSocket);

    webSocket.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data as string);
        this.handleMessage(webSocket, message);
      } catch (error) {
        console.error('Invalid WebSocket message:', error);
      }
    });

    webSocket.addEventListener('close', () => {
      this.sessions.delete(webSocket);
    });

    webSocket.addEventListener('error', (error) => {
      console.error('WebSocket error:', error);
      this.sessions.delete(webSocket);
    });

    // Send welcome message
    webSocket.send(JSON.stringify({
      type: 'connected',
      message: 'Connected to PTC real-time updates',
      timestamp: new Date().toISOString(),
    }));
  }

  private handleMessage(webSocket: WebSocket, message: any) {
    switch (message.type) {
      case 'ping':
        webSocket.send(JSON.stringify({
          type: 'pong',
          timestamp: new Date().toISOString(),
        }));
        break;

      case 'subscribe':
        // Handle subscription to specific channels
        webSocket.send(JSON.stringify({
          type: 'subscribed',
          channel: message.channel,
          timestamp: new Date().toISOString(),
        }));
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Method to broadcast updates to all connected clients
  public broadcast(data: any) {
    const message = JSON.stringify({
      ...data,
      timestamp: new Date().toISOString(),
    });

    this.sessions.forEach((webSocket) => {
      try {
        if (webSocket.readyState === WebSocket.READY_STATE_OPEN) {
          webSocket.send(message);
        }
      } catch (error) {
        console.error('Error broadcasting to WebSocket:', error);
        this.sessions.delete(webSocket);
      }
    });
  }

  // Broadcast real-time election updates
  public broadcastElectionUpdate(type: string, data: any) {
    this.broadcast({
      type: 'election_update',
      updateType: type,
      data,
    });
  }

  // Broadcast result submission updates
  public broadcastResultSubmission(resultData: any) {
    this.broadcast({
      type: 'result_submission',
      data: resultData,
    });
  }

  // Broadcast verification updates
  public broadcastVerificationUpdate(resultId: number, status: string) {
    this.broadcast({
      type: 'verification_update',
      data: { resultId, status },
    });
  }
}