#include <WiFi.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

// ============== WiFi Configuration ==============
const char* ssid = "PLDTHOMEFIBRxSQ9R";     // Replace with your WiFi name
const char* password = "GayoFamily@2025!";  // Replace with your WiFi password

// ============== Backend API Configuration ==============
const char* serverHostname = "http://jaypee.local:5000";
const char* serverFallbackIP = "http://192.168.1.61:5000";
String serverUrl = "http://192.168.1.61:5000/api";  // default; overwritten by resolveServer()

const char* deviceId = "DEV001";  // Unique device ID for this sensor

// ============== Pin Configuration ==============
#define FLAME_PIN 13
#define BUZZER_PIN 5
#define LED_PIN 18  // Built-in LED for status

// ============== SIM800L Configuration ==============
#define SIM800_TX 17
#define SIM800_RX 16
HardwareSerial sim800(1);

// Phone number to send SMS alerts (change this to your number)
const char* alertPhoneNumber = "+639624206885";

// ============== State Variables ==============
bool fireDetected = false;

// Heartbeat for online status
unsigned long lastHeartbeatTime = 0;
const unsigned long HEARTBEAT_INTERVAL = 30000;  // Send heartbeat every 30 seconds

// ============== Function Declarations ==============
void connectWiFi();
void resolveServer();
void sendHeartbeat();
void sendSMS(String message);
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
  Serial.println("   FLAME ALERT - Fire Detection System - Node 1");
  Serial.println("========================================");
  Serial.println("Device ID: " + String(deviceId));
  Serial.println();

  // Connect to WiFi
  connectWiFi();

  // Resolve backend URL (try jaypee.local, fall back to direct IP)
  if (WiFi.status() == WL_CONNECTED) {
    resolveServer();
  }

  // Initialize SIM800L serial
  sim800.begin(9600, SERIAL_8N1, SIM800_RX, SIM800_TX);
  delay(3000);  // Wait for SIM800L to initialize
  
  Serial.println("\nInitializing SIM800L...");
  sim800.println("AT");
  delay(1000);
  
  // Check if SIM800L responds
  if (sim800.available()) {
    Serial.println("✅ SIM800L initialized");
  } else {
    Serial.println("⚠️ WARNING: SIM800L not responding");
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

    digitalWrite(BUZZER_PIN, HIGH);
    digitalWrite(LED_PIN, HIGH);

    Serial.println("📡 Sending fire alert to backend...");
    updateFireStatus(true);

    String smsMessage = "FIRE ALERT - FLAME ALERT SYSTEM\n";
    smsMessage += "Device  : " + String(deviceId) + "\n";
    smsMessage += "Location: Tupi Public Market Area\n";
    smsMessage += "Coords  : 6.3316, 124.9515\n";
    smsMessage += "Maps    : https://maps.google.com/?q=6.3316,124.9515\n";
    smsMessage += "Status  : FIRE DETECTED - Respond immediately!";
    sendSMS(smsMessage);

    fireDetected = true;
  }

  // ============== FIRE CLEARED ==============
  if (flameState == HIGH) {
    if (fireDetected) {
      Serial.println("✅ Fire cleared.");
      Serial.println("📡 Sending fire cleared signal to backend...");
      updateFireStatus(false);
    }

    digitalWrite(BUZZER_PIN, LOW);
    digitalWrite(LED_PIN, LOW);
    fireDetected = false;
  }

  // ============== HEARTBEAT (keep device showing as online) ==============
  if (millis() - lastHeartbeatTime > HEARTBEAT_INTERVAL) {
    sendHeartbeat();
    lastHeartbeatTime = millis();
  }

  delay(500);
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

void sendSMS(String message) {
  Serial.println("📱 Sending SMS alert...");
  Serial.println("   To: " + String(alertPhoneNumber));
  
  // Set SMS to text mode
  sim800.println("AT+CMGF=1");
  delay(1000);

  // Set phone number
  sim800.print("AT+CMGS=\"");
  sim800.print(alertPhoneNumber);
  sim800.println("\"");
  delay(1000);

  // Send message
  sim800.print(message);
  delay(500);

  // Send CTRL+Z to complete SMS
  sim800.write(26);
  delay(5000);
  
  // Read response
  if (sim800.available()) {
    String response = sim800.readString();
    if (response.indexOf("OK") != -1) {
      Serial.println("   ✅ SMS sent successfully!");
    } else {
      Serial.println("   ⚠️ SMS status unknown");
      Serial.println("   Response: " + response);
    }
  } else {
    Serial.println("   ⚠️ No response from SIM800L");
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
