# ESP32 Fire Alert System

## Hardware Requirements

- ESP32 Development Board
- Flame Sensor Module (Digital)
- Buzzer (Active or Passive)
- SIM800L GSM Module (optional for SMS alerts)
- LED (or use built-in LED)
- Jumper wires
- Power supply (5V for ESP32, 4V for SIM800L)

## Pin Connections

### Flame Sensor
- VCC → 3.3V (ESP32)
- GND → GND
- DO (Digital Out) → GPIO 13

### Buzzer
- Positive (+) → GPIO 5
- Negative (-) → GND

### Built-in LED
- GPIO 2 (most ESP32 boards)

### SIM800L (Optional)
- TX → GPIO 16 (ESP32 RX)
- RX → GPIO 17 (ESP32 TX)
- VCC → 4V (use separate power supply with capacitor)
- GND → Common GND with ESP32

**⚠️ IMPORTANT:** SIM800L requires 3.7V-4.2V and can draw 2A during transmission. Use a separate power supply with a large capacitor (1000µF recommended).

## Arduino IDE Setup

1. **Install ESP32 Board Support:**
   - Open Arduino IDE
   - Go to File → Preferences
   - Add to "Additional Board Manager URLs":
     ```
     https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
     ```
   - Go to Tools → Board → Boards Manager
   - Search for "esp32" and install "esp32 by Espressif Systems"

2. **Select Board:**
   - Tools → Board → ESP32 Arduino → ESP32 Dev Module (or your specific board)
   - Tools → Port → Select your COM port

## Configuration

### 1. WiFi Settings
Edit these lines in the code:
```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. Backend Server URL

**Option 1: Use Bonjour/mDNS (Recommended - Already Configured!)**

The backend server broadcasts itself as `jaypee.local`, so you can use:
```cpp
const char* serverUrl = "http://jaypee.local:5000/api";  // Already set!
```

This is already configured in the code! Just make sure:
- Your backend server is running (it advertises as jaypee.local automatically)
- ESP32 and computer are on the same network
- Your router supports mDNS/Bonjour (most do)

**Option 2: Use IP Address (Fallback)**

If .local doesn't work, find your computer's local IP address:

**Windows:**
```bash
ipconfig
```
Look for "IPv4 Address" (e.g., 192.168.1.100)

**Mac/Linux:**
```bash
ifconfig
```

Then update the code:
```cpp
const char* serverUrl = "http://192.168.1.100:5000/api";  // Use YOUR IP
```

### 3. Device ID (Optional)
Change if you have multiple devices:
```cpp
const char* deviceId = "DEV001";  // DEV002, DEV003, etc.
```

### 4. SMS Phone Number (Optional)
If using SIM800L, update:
```cpp
const char* alertPhoneNumber = "+639XXXXXXXXX";  // Your phone number
```

## Upload Instructions

1. Connect ESP32 to computer via USB
2. Open `flame_alert_esp32.ino` in Arduino IDE
3. Configure settings as above
4. Click "Upload" button
5. Open Serial Monitor (Tools → Serial Monitor)
6. Set baud rate to 115200

## Testing

### 1. Test Backend Connection
- Make sure backend server is running (`npm start` in backend folder)
- ESP32 will test connection on startup
- Check Serial Monitor for "Backend connection successful"

### 2. Test Flame Sensor
- ESP32 will show "System Ready - Monitoring for fire..."
- Place flame near sensor (candle, lighter)
- Watch for "🔥 FIRE DETECTED!" message
- Check if alert appears in web dashboard
- Buzzer should sound and LED should light up

### 3. Test Fire Clear
- Remove flame source
- Watch for "✅ FIRE CLEARED" message
- Buzzer and LED should turn off
- Status should update in dashboard

## Troubleshooting

### WiFi won't connect
- Double-check SSID and password
- Make sure you're using 2.4GHz WiFi (ESP32 doesn't support 5GHz)
- Check if ESP32 is within WiFi range

### Backend connection fails
- Verify backend server is running
- Check your computer's IP address (it may change)
- Ping your computer from another device
- Make sure firewall isn't blocking port 5000
- Try using IP instead of .local hostname

### Flame sensor not responding
- Check wiring connections
- Test sensor with multimeter (should output LOW when flame detected)
- Try adjusting sensor sensitivity potentiometer

### SIM800L not working
- Check power supply (needs stable 3.7-4.2V)
- Add large capacitor (1000µF) near power pins
- Verify SIM card is inserted and active
- Check if antenna is connected
- Some SIM cards need PIN disabled

### Serial Monitor shows garbage
- Set baud rate to 115200
- Check if correct board is selected
- Try pressing ESP32 reset button

## Serial Monitor Output Examples

### Normal Operation:
```
💚 System OK - No fire detected
```

### Fire Detected:
```
🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥
🔥  FIRE DETECTED!  🔥
Device: DEV001
📡 Sending fire alert to backend...
   Response code: 200
   ✅ Backend updated successfully
📱 Sending SMS alert...
   ✅ SMS sent successfully!
```

### Fire Cleared:
```
✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅✅
✅  FIRE CLEARED  ✅
📡 Sending fire cleared signal to backend...
   ✅ Backend updated successfully
```

## Advanced Configuration

### Change Update Frequency
```cpp
const unsigned long UPDATE_INTERVAL = 5000;  // milliseconds
```

### Change Heartbeat Interval
```cpp
const unsigned long HEARTBEAT_INTERVAL = 30000;  // milliseconds
```

### Multiple Devices
Upload code to multiple ESP32s with different device IDs:
- Device 1: `deviceId = "DEV001"`
- Device 2: `deviceId = "DEV002"`
- etc.

Each will create separate alerts in the dashboard.

## Safety Notes

⚠️ **IMPORTANT:**
- Do not leave flame sensors unattended
- Test with controlled flame sources only
- Ensure proper ventilation when testing
- Have fire extinguisher nearby during testing
- This is a demonstration system, not certified for commercial fire safety

## Support

If you encounter issues:
1. Check Serial Monitor output
2. Verify backend server is running
3. Test network connectivity
4. Review pin connections
5. Check power supply voltage
