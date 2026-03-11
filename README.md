# 🔥 Fire Alert Monitoring and Mapping System

A complete IoT fire alert monitoring system with ESP32 hardware integration, Node.js backend, and React frontend. Designed for emergency response monitoring with real-time updates and SMS alerts.

## 📖 Project Overview

This complete fire monitoring system includes:
- **ESP32 Hardware**: Flame sensor with buzzer alarm and SMS alerts
- **Backend Server**: Node.js/Express with SQLite database + Bonjour/mDNS
- **Web Dashboard**: React frontend with real-time updates
- **Interactive Map**: Leaflet visualization of fire locations
- **Real-time Notifications**: WebSocket for instant updates
- **Smart Networking**: Bonjour/mDNS support (access as `jaypee.local`)

## 🛠️ Technologies Used

- **Hardware**: ESP32, Flame Sensor, SIM800L GSM, Buzzer
- **Backend**: Node.js, Express, SQLite, WebSocket, Bonjour/mDNS
- **Frontend**: React 18 with Vite
- **Mapping**: Leaflet & React-Leaflet
- **Real-time**: WebSocket for live updates
- **Networking**: mDNS/Bonjour for automatic device discovery

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Arduino IDE (for ESP32)
- ESP32 board with flame sensor (optional, for hardware)

### Quick Setup

#### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

#### 2. Install Frontend Dependencies
```bash
cd ..
npm install
```

#### 3. Start Backend Server
```bash
cd backend
npm start
```
Backend will run on **http://localhost:5000**

#### 4. Start Frontend (in new terminal)
```bash
npm run dev
```
Frontend will run on **http://localhost:5173**

#### 5. Open Browser
Navigate to **http://localhost:5173**

That's it! The system is ready. No cloud setup needed.

## 📁 Project Structure

```
flame_alert/
├── backend/                    # Node.js backend server
│   ├── server.js              # Main server file
│   ├── database.js            # SQLite database
│   ├── fire_alerts.db         # Database file (auto-created)
│   ├── package.json
│   └── README.md
├── esp32/                      # ESP32 Arduino code
│   ├── flame_alert_esp32.ino  # Main Arduino sketch
│   └── README.md              # ESP32 setup guide
├── src/                        # React frontend
│   ├── components/
│   │   ├── Dashboard.jsx      # Alert dashboard
│   │   ├── Dashboard.css
│   │   ├── FireMap.jsx        # Interactive map
│   │   └── FireMap.css
│   ├── App.jsx                # Main app
│   ├── apiClient.js           # API & WebSocket client
│   └── main.jsx
├── package.json               # Frontend dependencies
├── vite.config.js
└── README.md
```

## 📱 Features

### Web Dashboard
- Real-time alert statistics (Active/Responded/Resolved)
- Alert history table with status management
- Color-coded status badges
- Manual status updates (Active → Responded → Resolved)

### Interactive Map
- Real-time fire location markers
- Color-coded markers (🔥 Red=Active, 🔥 Yellow=Responded, 🔥 Green=Resolved)
- Clickable markers with detailed popup information
- Auto-zoom to fit all markers
- Map legend

### Real-time Updates
- WebSocket connection for instant updates
- Automatic dashboard refresh when new alerts arrive
- Map markers update without page reload
- Visual and sound notifications for new alerts
- Live status changes reflected immediately

### ESP32 Hardware Integration
- Flame sensor detection
- Automatic alert creation when fire detected
- Buzzer alarm activation
- SMS alerts via SIM800L GSM module
- Auto-clear when fire extinguished
- WiFi connectivity with reconnection
- Heartbeat monitoring

### Backend API
- RESTful API endpoints
- SQLite database (no cloud needed)
- WebSocket server for real-time push
- Device management
- Alert history tracking

## 🔧 ESP32 Hardware Setup (Optional)

### Required Components
- ESP32 Development Board
- Flame Sensor Module
- Buzzer
- SIM800L GSM Module (for SMS)
- Jumper wires

### Quick Start

1. **Wire the components** (see `esp32/README.md` for detailed pinout)

2. **Configure WiFi and Server**
   - Edit `esp32/flame_alert_esp32.ino`
   - Set your WiFi credentials
   - **Server URL is already configured!** Backend broadcasts as `jaypee.local`:
     ```cpp
     const char* serverUrl = "http://jaypee.local:5000/api";  // Already set!
     ```
   - No IP address needed! See [BONJOUR_SETUP.md](BONJOUR_SETUP.md) for details

3. **Upload to ESP32**
   - Open Arduino IDE
   - Install ESP32 board support
   - Upload the sketch

4. **Test**
   - Place flame near sensor
   - Watch dashboard update automatically
   - Buzzer should sound
   - SMS sent (if SIM800L configured)

Complete ESP32 setup guide: **[esp32/README.md](esp32/README.md)**

## 📂 Project Structure

```
fire-alert-dashboard/
├── public/
├── src/
│   ├── components/
│   │   ├── Dashboard.jsx
│   │   ├── Dashboard.css
│   │   ├── FireMap.jsx
│   │   └── FireMap.css
│   ├── App.jsx
│   ├── App.css
│   ├── main.jsx
│   ├── index.css
│   └── supabaseClient.js
├── .env
├── .env.example
├── .gitignore
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

## 🎨 Color Scheme

- **Active Alerts**: Red (#ff5252)
- **Responded**: Yellow/Orange (#ffa726)
- **Resolved**: Green (#4caf50)
- **Primary Gradient**: Purple (#667eea to #764ba2)

## 🔧 Development

### Available Scripts

**Frontend:**
- `npm run dev` - Start Vite development server (port 5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend:**
- `cd backend && npm start` - Start backend server (port 5000)
- `cd backend && npm run dev` - Start with auto-reload (nodemon)

### Architecture

```
ESP32 Device → WiFi → Backend API → SQLite Database
                           ↓
                     WebSocket Server
                           ↓
                    React Frontend ← User Browser
```

### Testing

#### Test Backend API
```bash
# Get all alerts
curl http://localhost:5000/api/alerts

# Create test alert
curl -X POST http://localhost:5000/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"location":"Test Fire","latitude":14.6,"longitude":121.0,"device_id":"TEST"}'

# Simulate ESP32 fire detection
curl -X POST http://localhost:5000/api/simulate-fire/DEV001
```

#### Test Real-time Updates
1. Open the web app in two browser windows
2. Create an alert via API or ESP32
3. Watch both windows update automatically!

#### Test ESP32 Integration
1. Upload code to ESP32
2. Open Serial Monitor (115200 baud)
3. Place flame near sensor
4. Watch console output and web dashboard

### Database Access

The SQLite database is at `backend/fire_alerts.db`

View/edit with SQLite browser:
```bash
cd backend
sqlite3 fire_alerts.db

# SQL commands:
SELECT * FROM fire_alerts;
UPDATE fire_alerts SET status='Resolved' WHERE id=1;
DELETE FROM fire_alerts WHERE id=1;
```

### API Documentation

See **[backend/README.md](backend/README.md)** for complete API documentation.

## 📝 Notes

- **Local Development**: Everything runs locally - no cloud services needed
- **Real-time Updates**: Uses WebSocket for instant synchronization
- **Hardware Optional**: Works with or without ESP32 hardware
- **Multiple Devices**: Support for multiple ESP32 devices with unique IDs
- **SMS Alerts**: Optional SIM800L integration for SMS notifications
- **Database**: SQLite for simplicity - can migrate to PostgreSQL/MySQL for production

## 🎨 Screenshots

### Dashboard
- Alert statistics cards (Active, Responded, Resolved, Total)
- Comprehensive alert table with status management

### Map View
- Interactive Leaflet map with fire location markers
- Color-coded based on status
- Popup details for each alert

### Notifications
- Real-time toast notifications
- Sound alerts for new fires
- WebSocket status indicator

## 🚨 Troubleshooting

### Frontend won't load alerts
- Check if backend is running on port 5000
- Open browser console for errors
- Verify `http://localhost:5000/api/alerts` returns data

### Real-time updates not working
- Check WebSocket connection in browser DevTools (Network → WS)
- Verify backend server is running
- Check console for connection errors

### ESP32 can't connect
- Verify WiFi credentials
- Check server URL uses your computer's local IP
- Ensure backend is running
- Check Serial Monitor for detailed errors
- Make sure ESP32 and computer are on same network

### Port already in use
- Backend: Change PORT in `backend/server.js`
- Frontend: Change port in `vite.config.js` or use `npm run dev -- --port 3000`

### Database locked
- Close any SQLite browsers accessing the database
- Restart backend server

## 🎓 Project Purpose

This is a complete IoT demonstration system showing:
- Full-stack web development (Frontend + Backend)
- Real-time data synchronization via WebSocket
- Hardware/software integration (ESP32 + Web)
- Interactive map visualization
- Modern React development patterns
- RESTful API design
- SQLite database management
- IoT device communication

Perfect for:
- Capstone projects
- IoT demonstrations
- Learning full-stack development
- Emergency monitoring system prototypes

## 🔐 Security Notes

⚠️ **For Development/Demo Only:**
- No authentication implemented
- CORS allows all origins
- Database has no access control
- Suitable for local network only

**For Production:**
- Add user authentication
- Implement API keys for ESP32 devices
- Restrict CORS to specific origins
- Use environment variables for sensitive data
- Migrate to production database (PostgreSQL/MySQL)
- Add HTTPS/SSL certificates
- Implement rate limiting

## 📄 License

This project is for educational purposes.

## 🤝 Contributing

This is a demonstration/educational project. Feel free to fork and modify!

## 📞 Support

Documentation:
- **Main README**: This file
- **Backend API**: [backend/README.md](backend/README.md)
- **ESP32 Setup**: [esp32/README.md](esp32/README.md)

For questions:
- Check the README files
- Review console/serial monitor output
- Test API endpoints with curl/Postman

## 🙏 Acknowledgments

- React + Vite for modern frontend development
- Leaflet for beautiful maps
- Express.js for robust backend
- SQLite for simple local database
- ESP32 community for excellent documentation

---

**Built with ❤️ for fire safety awareness and IoT education**
