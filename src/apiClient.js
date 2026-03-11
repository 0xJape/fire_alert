const API_URL = 'http://localhost:5000/api';
const WS_URL = 'ws://localhost:5000';

// API functions
export const api = {
  // Get all alerts
  async getAllAlerts() {
    const response = await fetch(`${API_URL}/alerts`);
    if (!response.ok) throw new Error('Failed to fetch alerts');
    return response.json();
  },

  // Update alert status
  async updateAlertStatus(id, status) {
    const response = await fetch(`${API_URL}/alerts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!response.ok) throw new Error('Failed to update alert');
    return response.json();
  },

};

// WebSocket connection for real-time updates
export class AlertWebSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.reconnectTimeout = null;
  }

  connect() {
    try {
      this.ws = new WebSocket(WS_URL);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        if (this.reconnectTimeout) {
          clearTimeout(this.reconnectTimeout);
          this.reconnectTimeout = null;
        }
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.listeners.forEach(listener => listener(message));
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected, attempting to reconnect...');
        this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
      this.reconnectTimeout = setTimeout(() => this.connect(), 3000);
    }
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}
