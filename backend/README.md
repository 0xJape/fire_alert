# Backend Server for Fire Alert System

## Overview

Node.js/Express backend server with SQLite database for the Fire Alert Monitoring System. Provides REST API endpoints for the frontend and ESP32 devices, with WebSocket support for real-time updates and Bonjour/mDNS for automatic device discovery.

## Features

- ✅ SQLite database for local data storage
- ✅ REST API for CRUD operations
- ✅ WebSocket server for real-time updates
- ✅ ESP32 device integration
- ✅ Bonjour/mDNS broadcasting (accessible as `jaypee.local`)
- ✅ CORS enabled for frontend communication
- ✅ Automatic database initialization with sample data

## Installation

```bash
cd backend
npm install
```

## Running the Server

### Development mode (with auto-restart):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will start on **http://localhost:5000**

**Also accessible as:** `http://jaypee.local:5000` 🎉

The server automatically broadcasts itself using Bonjour/mDNS, making it discoverable as `jaypee.local` on your local network. This means:
- ESP32 devices can use `http://jaypee.local:5000/api` (no IP needed!)
- Works even if your computer's IP changes
- Easier setup and configuration

See [BONJOUR_SETUP.md](../BONJOUR_SETUP.md) for details.

## API Endpoints

### General Endpoints

#### GET /
Health check and server info
```
Response: { status: 'ok', message: '...', endpoints: {...} }
```

#### GET /api/alerts
Get all fire alerts
```
Response: Array of alert objects
```

#### GET /api/alerts/:id
Get specific alert by ID
```
Response: Single alert object
```

#### POST /api/alerts
Create new alert manually
```json
Request Body:
{
  "location": "Alert Location",
  "latitude": 14.5995,
  "longitude": 120.9842,
  "device_id": "MANUAL"
}

Response: Created alert object
```

#### PUT /api/alerts/:id
Update alert status
```json
Request Body:
{
  "status": "Active" | "Responded" | "Resolved"
}

Response: Updated alert object
```

#### DELETE /api/alerts/:id
Delete an alert
```
Response: { message: 'Alert deleted' }
```

#### GET /api/statistics
Get alert statistics
```json
Response:
{
  "total": 10,
  "active": 2,
  "responded": 3,
  "resolved": 5
}
```

### ESP32 Device Endpoints

#### POST /api/simulate-fire/:deviceId
Signal fire detection from ESP32
```
Example: POST /api/simulate-fire/DEV001

Response: { success: true, alert: {...} }
```

#### POST /api/clear-fire/:deviceId
Signal fire cleared from ESP32
```
Example: POST /api/clear-fire/DEV001

Response: { success: true, alert: {...} }
```

#### GET /api/device/:deviceId/alerts
Get all alerts from specific device
```
Example: GET /api/device/DEV001/alerts

Response: Array of alerts
```

## WebSocket

### Connection
```javascript
const ws = new WebSocket('ws://localhost:5000');
```

### Message Format
```json
{
  "event": "INSERT" | "UPDATE" | "DELETE",
  "data": { ...alert object }
}
```

### Events

- **INSERT**: New alert created
- **UPDATE**: Alert status changed
- **DELETE**: Alert deleted

## Database Schema

### fire_alerts table

| Column | Type | Description |
|--------|------|-------------|
| id | INTEGER | Primary key (auto-increment) |
| location | TEXT | Alert location description |
| latitude | REAL | GPS latitude |
| longitude | REAL | GPS longitude |
| status | TEXT | 'Active', 'Responded', or 'Resolved' |
| device_id | TEXT | Device identifier (e.g., 'DEV001') |
| created_at | DATETIME | Timestamp (auto-generated) |

## Testing the API

### Using curl

```bash
# Get all alerts
curl http://localhost:5000/api/alerts

# Create new alert
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"location":"Test Fire","latitude":14.6,"longitude":121.0}'

# Update alert status
curl -X PUT http://localhost:5000/api/alerts/1 \
  -H "Content-Type: application/json" \
  -d '{"status":"Resolved"}'

# Simulate ESP32 fire detection
curl -X POST http://localhost:5000/api/simulate-fire/DEV001

# Clear fire
curl -X POST http://localhost:5000/api/clear-fire/DEV001
```

### Using Postman

Import these requests or test directly:
- Method: GET/POST/PUT/DELETE
- URL: `http://localhost:5000/api/alerts`
- Headers: `Content-Type: application/json`
- Body: Use JSON format from examples above

## File Structure

```
backend/
├── package.json         # Dependencies and scripts
├── server.js           # Main Express server
├── database.js         # SQLite database functions
├── fire_alerts.db      # SQLite database file (auto-created)
└── README.md          # This file
```

## Environment Configuration

No environment variables needed - everything runs locally!

## ESP32 Integration

The ESP32 devices should point to your computer's local IP:
```cpp
const char* serverUrl = "http://192.168.1.100:5000/api";
```

Find your IP:
- Windows: `ipconfig`
- Mac/Linux: `ifconfig`

## Development Tips

### Viewing the Database

Install SQLite browser:
```bash
npm install -g sqlite3
```

View data:
```bash
cd backend
sqlite3 fire_alerts.db
```

SQL commands:
```sql
-- View all alerts
SELECT * FROM fire_alerts;

-- Count by status
SELECT status, COUNT(*) FROM fire_alerts GROUP BY status;

-- Clear all alerts
DELETE FROM fire_alerts;

-- Reset auto-increment
DELETE FROM sqlite_sequence WHERE name='fire_alerts';
```

### Reset Database

Delete the database file to start fresh:
```bash
rm fire_alerts.db  # Mac/Linux
del fire_alerts.db  # Windows
```

Restart the server - it will recreate with sample data.

## Troubleshooting

### Port 5000 already in use
Change the PORT in server.js:
```javascript
const PORT = 5001;  // Use different port
```
Also update frontend API URL in `src/apiClient.js`

### CORS errors
Make sure CORS is enabled (already configured):
```javascript
app.use(cors());
```

### Database locked
Close any other programs accessing the database file.

### WebSocket won't connect
- Check if server is running
- Verify WebSocket URL in frontend
- Check browser console for errors

## Security Notes

⚠️ This is a local development setup:
- No authentication required
- CORS allows all origins
- Suitable for demo/testing only

For production:
- Add authentication
- Restrict CORS
- Use environment variables
- Consider PostgreSQL/MySQL for production

## Monitoring

Server logs show:
- New alert creation
- Status updates
- ESP32 connections
- WebSocket connections
- Database operations

Watch the console for real-time activity!

## Support

Check main project README for complete setup instructions.
