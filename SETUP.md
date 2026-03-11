# FlameAlert Setup Guide

Complete setup instructions for deploying FlameAlert on any laptop/PC.

---

## 📋 Prerequisites

- **Node.js** v16 or higher ([Download](https://nodejs.org/))
- **Arduino IDE** or PlatformIO for ESP32 programming
- **ESP32 Development Board** (x2 for dual-node setup)
- **Flame Sensors** (x2)
- **Buzzers** (x2 - passive buzzers recommended)
- **WiFi Network** (2.4GHz for ESP32 compatibility)

---

## 🖥️ Backend & Frontend Setup

### 1. Clone Repository
```bash
git clone https://github.com/0xJape/fire_alert.git
cd fire_alert
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 4. Configure Server Hostname (Optional)
If your PC has a different hostname than `jaypee`, you'll need to update it:

**Find Your Hostname:**
- **Windows:** Open PowerShell and run `hostname`
- **Mac/Linux:** Open Terminal and run `hostname`

**Update ESP32 Code:**
Edit both `esp32/node1/node1.ino` and `esp32/node2/node2.ino`:
```cpp
// Line 10 - Change "jaypee" to your hostname
const char* serverHostname = "http://YOUR_HOSTNAME.local:5000";
```

**Update Fallback IP:**
1. Find your PC's local IP address:
   - **Windows:** `ipconfig` (look for IPv4 Address)
   - **Mac/Linux:** `ifconfig` or `ip addr`

2. Update both node files:
```cpp
// Line 11 - Change to your IP
const char* serverFallbackIP = "http://YOUR_IP_ADDRESS:5000";
```

### 5. Start the Servers

**Option A: Single Command (Windows)**
```powershell
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
npm run dev
```

**Option B: Separate Terminals**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend (in root directory)
npm run dev
```

**Access the Dashboard:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

### 6. Configure Windows Firewall (Windows Only)
Allow ESP32 devices to communicate with your PC:

```powershell
New-NetFirewallRule -DisplayName "FlameAlert Backend Port 5000" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow

New-NetFirewallRule -DisplayName "FlameAlert mDNS" -Direction Inbound -Protocol UDP -LocalPort 5353 -Action Allow
```

---

## 🔧 ESP32 Hardware Setup

### Node 1 (DEV001) - With SMS
**Pin Configuration:**
- Flame Sensor: GPIO 13
- Buzzer: GPIO 5
- LED: GPIO 18
- SIM800L TX: GPIO 17
- SIM800L RX: GPIO 16

### Node 2 (DEV002) - No SMS
**Pin Configuration:**
- Flame Sensor: GPIO 27
- Buzzer: GPIO 5
- LED: GPIO 18

**Wiring:**
```
Flame Sensor:
  VCC → 3.3V
  GND → GND
  DO  → GPIO (13 for Node1, 27 for Node2)

Buzzer:
  Positive → GPIO 5
  Negative → GND

LED:
  Anode (+) → GPIO 18 (with 220Ω resistor)
  Cathode (-) → GND
```

---

## 📱 ESP32 Software Setup

### 1. Configure WiFi
Edit **both** `node1.ino` and `node2.ino`:

```cpp
// Lines 5-6
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Configure Server URLs
Update the hostname/IP as described in section "Backend & Frontend Setup - Step 4"

### 3. Upload to ESP32
1. Open Arduino IDE
2. Install ESP32 board support:
   - Go to **File → Preferences**
   - Add to Additional Board Manager URLs:
     ```
     https://dl.espressif.com/dl/package_esp32_index.json
     ```
   - Go to **Tools → Board → Boards Manager**
   - Search "ESP32" and install

3. Select your board:
   - **Tools → Board → ESP32 Arduino → ESP32 Dev Module**

4. Select COM port:
   - **Tools → Port → COMx** (check Device Manager on Windows)

5. Upload:
   - Open `esp32/node1/node1.ino`
   - Click **Upload** (→ button)
   - Repeat for `esp32/node2/node2.ino`

### 4. Monitor Serial Output
- **Tools → Serial Monitor**
- Set baud rate to **115200**
- Watch connection status and heartbeat messages

---

## 🧪 Testing the System

### 1. Verify Backend Connection
Watch ESP32 Serial Monitor for:
```
✅ WiFi Connected!
IP Address: 192.168.x.x
✅ Backend resolved via hostname: http://jaypee.local:5000/api
System Ready - Monitoring for fire...
```

### 2. Test Fire Detection
**Simulate Fire (Software):**
```bash
curl -X POST http://localhost:5000/api/simulate-fire/DEV001
```

**Test Hardware:**
- Block the flame sensor with your hand (triggers LOW signal)
- Buzzer should beep
- LED should turn on
- Dashboard should show alert

### 3. Clear Fire Alert
**Software:**
```bash
curl -X POST http://localhost:5000/api/clear-fire/DEV001
```

**Hardware:**
- Remove hand from sensor (returns to HIGH)
- Buzzer stops
- LED turns off

---

## 🔍 Troubleshooting

### ESP32 Can't Connect to Backend
1. Check firewall rules (Windows)
2. Verify hostname with `ping YOUR_HOSTNAME.local`
3. Try direct IP fallback
4. Ensure backend server is running (`npm start` in backend folder)

### Frontend Can't Connect to Backend
1. Verify backend is running on port 5000
2. Check browser console for CORS errors
3. Restart both servers

### Devices Show as Offline
1. Check WiFi connection on ESP32 (Serial Monitor)
2. Verify heartbeat is being sent (should see in Serial Monitor every 30s)
3. Check if `last_seen` column exists in database

### Buzzer Not Working
1. Check pin connections
2. For passive buzzer, code uses `tone()` function
3. For active buzzer, you may need to use `digitalWrite()` instead

---

## 📝 Device Configuration

Access **Devices** tab in dashboard to configure:
- Device name
- Location description
- Latitude/Longitude (for map display)

**Default Locations:**
- DEV001: Tupi Public Market (6.3316, 124.9515)
- DEV002: Santo Niño School Area (6.3298, 124.9502)

---

## 🚀 Production Deployment

### Network Requirements
- Stable WiFi connection
- Router with 2.4GHz band enabled
- Static IP or reliable mDNS resolution

### PC Requirements
- Windows/Mac/Linux PC as server
- Always-on or scheduled startup
- Firewall configured for port 5000

### Optional Enhancements
- Set up PM2 for backend auto-restart
- Use nginx for production frontend serving
- Add SSL/TLS with self-signed certificates
- Create Windows Service for backend

---

## 📧 Support

For issues or questions:
- GitHub: https://github.com/0xJape/fire_alert
- Check Serial Monitor for ESP32 debugging
- Review browser console for frontend errors
- Check backend terminal for API errors

---

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite
- **Backend:** Node.js + Express + SQLite
- **ESP32:** Arduino Framework
- **Icons:** react-icons library
- **Map:** Leaflet.js
- **Fonts:** Plus Jakarta Sans
