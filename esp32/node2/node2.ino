#include <WiFi.h>
#include <HTTPClient.h>

// ============== WiFi Configuration ==============
const char* ssid = "PLDTHOMEFIBRxSQ9R";     // Replace with your WiFi name
const char* password = "GayoFamily@2025!";  // Replace with your WiFi password

// ============== Backend API Configuration ==============
const char* serverHostname = "http://jaypee.local:5000";
const char* serverFallbackIP = "http://192.168.1.61:5000";
String serverUrl = "http://192.168.1.61:5000/api";  // default; overwritten by resolveServer()

const char* deviceId = "DEV002";  // Unique device ID for this sensor

// ============== Pin Configuration ==============
#define FLAME_PIN 27
#define BUZZER_PIN 5
#define LED_PIN 18  // Built-in LED for status

// ============== State Variables ==============
bool fireDetected = false;

// Heartbeat for online status
unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000;  // Send heartbeat every 30 seconds

// Buzzer beep control
unsigned long lastBuzzerToggle = 0;
const unsigned long BUZZER_BEEP_INTERVAL = 500;  // Beep every 500ms (on/off)
bool buzzerState = false;
unsigned long buzzerStartTime = 0;
const unsigned long BUZZER_AUTO_OFF_TIME = 30000;  // Auto turn off buzzer after 30 seconds

// ============== Function Declarations ==============
void connectWiFi();
void resolveServer();
void sendHeartbeat();
void updateFireStatus(bool isFire);
void blinkLED(int times, int delayMs);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Initialize pins - set outputs LOW before pinMode to prevent boot glitch on strapping pins
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);
  pinMode(FLAME_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(LED_PIN, LOW);

  Serial.println("\n\n========================================");
  Serial.println("   FLAME ALERT - Fire Detection System - Node 2");
  Serial.println("========================================");
  Serial.println("Device ID: " + String(deviceId));
  Serial.println();

  // Connect to WiFi
  connectWiFi();

  // Resolve backend URL (try jaypee.local, fall back to direct IP)
  if (WiFi.status() == WL_CONNECTED) {
    resolveServer();
  }

  Serial.println("\n========================================");
  Serial.println("System Ready - Monitoring for fire...");
  Serial.println("========================================\n");
  
  blinkLED(3, 200);  // Signal ready
}

void loop() {
  // Check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected! Reconnecting...");
    connectWiFi();
  }

  int flameState = digitalRead(FLAME_PIN);

  // ============== FIRE DETECTED ==============
  if (flameState == LOW && !fireDetected) {
    Serial.println("🔥 FIRE DETECTED!");

    // Start buzzer with tone (for passive buzzer)
    buzzerStartTime = millis();
    tone(BUZZER_PIN, 2000);  // 2000 Hz continuous tone
    buzzerState = true;
    lastBuzzerToggle = millis();
    digitalWrite(LED_PIN, HIGH);

    Serial.println("📡 Sending fire alert to backend...");
    updateFireStatus(true);

    fireDetected = true;
  }

  // ============== FIRE CLEARED ==============
  if (flameState == HIGH) {
    if (fireDetected) {
      Serial.println("✅ Fire cleared.");
      Serial.println("📡 Sending fire cleared signal to backend...");
      updateFireStatus(false);
    }

    noTone(BUZZER_PIN);  // Stop tone
    digitalWrite(LED_PIN, LOW);
    buzzerState = false;
    fireDetected = false;
  }

  // ============== BUZZER BEEP CONTROL WHILE FIRE ACTIVE ==============
  if (fireDetected) {
    unsigned long currentTime = millis();
    
    // Auto turn off buzzer after 30 seconds, but keep LED on and monitoring
    if (currentTime - buzzerStartTime > BUZZER_AUTO_OFF_TIME) {
      if (buzzerState) {
        noTone(BUZZER_PIN);
        buzzerState = false;
        Serial.println("🔕 Buzzer auto-off after 30 seconds (monitoring still active)");
      }
    } 
    // Toggle tone on/off every 500ms for beeping pattern
    else if (currentTime - lastBuzzerToggle > BUZZER_BEEP_INTERVAL) {
      buzzerState = !buzzerState;
      if (buzzerState) {
        tone(BUZZER_PIN, 2000);  // Beep ON
      } else {
        noTone(BUZZER_PIN);  // Beep OFF
      }
      lastBuzzerToggle = currentTime;
    }
  }

  // ============== HEARTBEAT (keep device showing as online) ==============
  if (millis() - lastHeartbeatTime > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeatTime = millis();
  }

  delay(100);
}

void connectWiFi() {
  Serial.println("Connecting to WiFi: " + String(ssid));
  
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  Serial.println();
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\u2705 WiFi Connected!");
    Serial.println("IP Address: " + WiFi.localIP().toString());
  } else {
    Serial.println("❌ WiFi connection failed!");
    Serial.println("   Will retry in next cycle...");
  }
}

void resolveServer() {
  HTTPClient http;

  // Try hostname first
  Serial.println("Trying " + String(serverHostname) + "...");
  http.begin(String(serverHostname));
  http.setTimeout(3000);
  int code = http.GET();
  http.end();

  if (code == 200) {
    serverUrl = String(serverHostname) + "/api";
    Serial.println("✅ Backend resolved via hostname: " + serverUrl);
    return;
  }

  // Hostname failed — fall back to direct IP
  Serial.println("   Hostname unreachable (" + String(code) + "), trying IP fallback...");
  http.begin(String(serverFallbackIP));
  http.setTimeout(3000);
  code = http.GET();
  http.end();

  if (code == 200) {
    serverUrl = String(serverFallbackIP) + "/api";
    Serial.println("✅ Backend resolved via IP fallback: " + serverUrl);
  } else {
    Serial.println("❌ Backend unreachable on both hostname and IP. Will keep retrying on data send.");
  }
}

void updateFireStatus(bool isFire) {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ No WiFi - cannot update backend");
    return;
  }

  HTTPClient http;
  String endpoint;
  
  if (isFire) {
    endpoint = String(serverUrl) + "/simulate-fire/" + deviceId;
  } else {
    endpoint = String(serverUrl) + "/clear-fire/" + deviceId;
  }
  
  Serial.println("   Endpoint: " + endpoint);
  
  http.begin(endpoint);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);  // 10 second timeout
  
  int httpCode = http.POST("");
  
  if (httpCode > 0) {
    Serial.print("   Response code: ");
    Serial.println(httpCode);
    
    if (httpCode == 200) {
      String response = http.getString();
      Serial.println("   ✅ Backend updated successfully");
      Serial.println("   Response: " + response);
    } else {
      Serial.println("   ⚠️ Unexpected response code");
    }
  } else {
    Serial.print("   ❌ HTTP Error: ");
    Serial.println(http.errorToString(httpCode));
    Serial.println("   Check if backend server is running!");
  }
  
  http.end();
}

void sendHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  HTTPClient http;
  String endpoint = String(serverUrl) + "/heartbeat/" + deviceId;
  
  http.begin(endpoint);
  http.setTimeout(5000);
  
  int httpCode = http.POST("");
  http.end();
  
  // Silent heartbeat - only log failures
  if (httpCode < 0) {
    Serial.println("⚠️ Heartbeat failed");
  }
}

void blinkLED(int times, int delayMs) {
  for (int i = 0; i < times; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(delayMs);
    digitalWrite(LED_PIN, LOW);
    delay(delayMs);
  }
} 
