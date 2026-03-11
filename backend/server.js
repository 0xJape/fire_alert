const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const WebSocket = require('ws');
const http = require('http');
const { dbFunctions } = require('./database');

const app = express();
const PORT = 5000;
const HOSTNAME = 'jaypee';  // PC hostname (Windows advertises jaypee.local via mDNS natively)

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });

// Store connected clients
const clients = new Set();

wss.on('connection', (ws) => {
  console.log('🔌 New WebSocket client connected');
  clients.add(ws);

  ws.on('close', () => {
    console.log('🔌 WebSocket client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

// Broadcast to all connected clients
function broadcastUpdate(event, data) {
  const message = JSON.stringify({ event, data });
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ============== API ROUTES ==============

// Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Fire Alert Backend Server',
    endpoints: {
      alerts: '/api/alerts',
      esp32: '/api/simulate-fire/:deviceId',
      websocket: 'ws://localhost:5000'
    }
  });
});

// Get all alerts
app.get('/api/alerts', (req, res) => {
  dbFunctions.getAllAlerts((err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get alert by ID
app.get('/api/alerts/:id', (req, res) => {
  dbFunctions.getAlertById(req.params.id, (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Alert not found' });
    } else {
      res.json(row);
    }
  });
});

// Create new alert (manual)
app.post('/api/alerts', (req, res) => {
  const { location, latitude, longitude, device_id } = req.body;
  
  if (!location || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  dbFunctions.createAlert(location, latitude, longitude, device_id || 'MANUAL', (err, result) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      const newId = result.lastID;
      dbFunctions.getAlertById(newId, (err, newAlert) => {
        if (!err && newAlert) {
          broadcastUpdate('INSERT', newAlert);
          res.status(201).json(newAlert);
        } else {
          res.status(201).json({ id: newId, message: 'Alert created' });
        }
      });
    }
  });
});

// Update alert status
app.put('/api/alerts/:id', (req, res) => {
  const { status } = req.body;
  
  if (!status || !['Active', 'Responded', 'Resolved'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  dbFunctions.updateAlertStatus(req.params.id, status, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      dbFunctions.getAlertById(req.params.id, (err, updatedAlert) => {
        if (!err && updatedAlert) {
          broadcastUpdate('UPDATE', updatedAlert);
          res.json(updatedAlert);
        } else {
          res.json({ message: 'Alert updated' });
        }
      });
    }
  });
});

// Delete alert
app.delete('/api/alerts/:id', (req, res) => {
  const alertId = req.params.id;
  
  dbFunctions.getAlertById(alertId, (err, alert) => {
    if (!err && alert) {
      dbFunctions.deleteAlert(alertId, (err) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          broadcastUpdate('DELETE', { id: alertId });
          res.json({ message: 'Alert deleted' });
        }
      });
    } else {
      res.status(404).json({ error: 'Alert not found' });
    }
  });
});

// Get statistics
app.get('/api/statistics', (req, res) => {
  dbFunctions.getStatistics((err, stats) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(stats);
    }
  });
});

// ============== DEVICE MANAGEMENT ENDPOINTS ==============

// Get all devices
app.get('/api/devices', (req, res) => {
  dbFunctions.getAllDevices((err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get device by ID
app.get('/api/devices/:deviceId', (req, res) => {
  dbFunctions.getDeviceById(req.params.deviceId, (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else if (!row) {
      res.status(404).json({ error: 'Device not found' });
    } else {
      res.json(row);
    }
  });
});

// Create new device
app.post('/api/devices', (req, res) => {
  const { device_id, name, location, latitude, longitude } = req.body;
  
  if (!device_id || !name || !location || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  dbFunctions.createDevice(device_id, name, location, latitude, longitude, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      dbFunctions.getDeviceById(device_id, (err, newDevice) => {
        if (!err && newDevice) {
          res.status(201).json(newDevice);
        } else {
          res.status(201).json({ device_id, message: 'Device created' });
        }
      });
    }
  });
});

// Update device
app.put('/api/devices/:deviceId', (req, res) => {
  const { name, location, latitude, longitude } = req.body;
  
  if (!name || !location || !latitude || !longitude) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  dbFunctions.updateDevice(req.params.deviceId, name, location, latitude, longitude, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      dbFunctions.getDeviceById(req.params.deviceId, (err, updatedDevice) => {
        if (!err && updatedDevice) {
          res.json(updatedDevice);
        } else {
          res.json({ message: 'Device updated' });
        }
      });
    }
  });
});

// Delete device
app.delete('/api/devices/:deviceId', (req, res) => {
  dbFunctions.deleteDevice(req.params.deviceId, (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json({ message: 'Device deleted' });
    }
  });
});

// ============== ESP32 ENDPOINTS ==============

// ESP32 - Heartbeat/Ping (called periodically to show device is online)
app.post('/api/heartbeat/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;
  
  dbFunctions.updateDeviceLastSeen(deviceId, (err) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Heartbeat received', timestamp: new Date().toISOString() });
  });
});

// ESP32 - Simulate fire alert
app.post('/api/simulate-fire/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;
  
  console.log(`🔥 Fire alert received from device: ${deviceId}`);

  // Update device last_seen timestamp
  dbFunctions.updateDeviceLastSeen(deviceId, () => {});

  // Check if there's already an active alert for this device
  dbFunctions.getActiveAlertByDevice(deviceId, (err, existingAlert) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (existingAlert) {
      // Alert already exists - broadcast it so the frontend stays in sync
      console.log(`⚠️ Device ${deviceId} already has an active alert (ID: ${existingAlert.id})`);
      broadcastUpdate('UPDATE', existingAlert);
      return res.json({ 
        message: 'Alert already active', 
        alert: existingAlert 
      });
    }

    // Get device configuration for location
    dbFunctions.getDeviceById(deviceId, (err, device) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      // Use device location if configured, otherwise use default
      let location, latitude, longitude;
      
      if (device) {
        location = device.location;
        latitude = device.latitude;
        longitude = device.longitude;
        console.log(`📍 Using configured location for ${deviceId}: ${location}`);
      } else {
        // Fallback for unconfigured devices
        location = `Fire Alert - ${deviceId}`;
        latitude = 6.3316;  // Default Tupi center
        longitude = 124.9515;
        console.log(`⚠️ Device ${deviceId} not configured, using default Tupi location`);
      }

      dbFunctions.createAlert(location, latitude, longitude, deviceId, (err, result) => {
        if (err) {
          res.status(500).json({ error: err.message });
        } else {
          const newId = result.lastID;
          dbFunctions.getAlertById(newId, (err, newAlert) => {
            if (!err && newAlert) {
              console.log(`✅ New fire alert created: ID ${newId}`);
              broadcastUpdate('INSERT', newAlert);
              res.json({ 
                success: true, 
                message: 'Fire alert created', 
                alert: newAlert 
              });
            } else {
              res.json({ success: true, id: newId });
            }
          });
        }
      });
    });
  });
});

// ESP32 - Clear fire alert
app.post('/api/clear-fire/:deviceId', (req, res) => {
  const deviceId = req.params.deviceId;
  
  console.log(`✅ Fire cleared signal from device: ${deviceId}`);
  console.log(`⚠️ Alert remains ACTIVE until manually resolved by admin`);

  // Update device last_seen timestamp
  dbFunctions.updateDeviceLastSeen(deviceId, () => {});

  // Find active alert for this device
  dbFunctions.getActiveAlertByDevice(deviceId, (err, alert) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (!alert) {
      return res.json({ message: 'No active alert found for this device' });
    }

    // DO NOT auto-resolve - alert stays Active until admin manually resolves it
    // Just acknowledge the clear signal
    res.json({ 
      success: true, 
      message: 'Fire cleared signal received. Alert remains active until admin resolves.', 
      alert: alert 
    });
  });
});

// Get alerts by device
app.get('/api/device/:deviceId/alerts', (req, res) => {
  dbFunctions.getAlertsByDevice(req.params.deviceId, (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// ============== START SERVER ==============

server.listen(PORT, () => {
  console.log('========================================');
  console.log('🔥 Fire Alert Backend Server');
  console.log('========================================');
  console.log(`📡 HTTP Server: http://localhost:${PORT}`);
  console.log(`� HTTP Server: http://${HOSTNAME}.local:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://localhost:${PORT}`);
  console.log(`🔌 WebSocket Server: ws://${HOSTNAME}.local:${PORT}`);
  console.log('========================================');
  console.log('Available endpoints:');
  console.log('  GET  /api/alerts          - Get all alerts');
  console.log('  POST /api/alerts          - Create alert');
  console.log('  PUT  /api/alerts/:id      - Update alert');
  console.log('  POST /api/simulate-fire/:deviceId  - ESP32 fire detection');
  console.log('  POST /api/clear-fire/:deviceId     - ESP32 fire cleared');
  console.log('========================================');
  
  console.log('========================================');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down server...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
