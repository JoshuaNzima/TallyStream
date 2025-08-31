import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface RealTimeAnalytics {
  overview: {
    totalCenters: number;
    resultsReceived: number;
    verified: number;
    flagged: number;
    completionRate: number;
    verificationRate: number;
  };
  recentActivity: any[];
  pendingVerifications: number;
  topCenters: any[];
  submissionTrends: any[];
  lastUpdated: string;
}

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const [analytics, setAnalytics] = useState<RealTimeAnalytics | null>(null);
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.hostname}:${window.location.port || (protocol === "wss:" ? "443" : "80")}/ws`;
    
    const connect = () => {
      try {
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('WebSocket connected');
          setIsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data);
            setLastMessage(message);
            
            // Handle different message types
            switch (message.type) {
              case 'ANALYTICS_UPDATE':
                setAnalytics(message.data);
                break;
              case 'NEW_RESULT':
                setRecentSubmissions(prev => [message.data, ...prev.slice(0, 9)]);
                break;
              case 'RESULT_STATUS_CHANGED':
                // Update recent submissions if the changed result is in the list
                setRecentSubmissions(prev => 
                  prev.map(item => 
                    item.id === message.data.id ? message.data : item
                  )
                );
                break;
              case 'STATS_UPDATE':
                if (analytics) {
                  setAnalytics(prev => prev ? { ...prev, overview: message.data } : null);
                }
                break;
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          setIsConnected(false);
          // Attempt to reconnect after 3 seconds
          setTimeout(connect, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setTimeout(connect, 3000);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  };

  // Request analytics update
  const requestAnalytics = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'REQUEST_ANALYTICS' }));
    }
  }, []);

  return {
    isConnected,
    lastMessage,
    analytics,
    recentSubmissions,
    sendMessage,
    requestAnalytics,
  };
}
