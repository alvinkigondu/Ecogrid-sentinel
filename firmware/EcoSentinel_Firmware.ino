/*
 * 🌲 ECO-SENTINEL FIRMWARE V2.0
 * --------------------------------------------------------------------
 * ARCHITECTURE:
 * 1. DEEP SLEEP: Device sleeps until Piezo (Pin 33) detects vibration.
 * 2. EDGE AI: Runs FFT on Audio (Pin 34) to detect Chainsaw frequencies.
 * 3. LORA MESH: Transmits confirmed threats to the Gateway.
 * 
 * HARDWARE MAP:
 * - LoRa Module: SCK=5, MISO=19, MOSI=27, SS=18, RST=14, DIO0=26
 * - Mic (MAX9814): GPIO 34
 * - Piezo: GPIO 33 (Required: 1M Ohm resistor to GND)
 * - LED: GPIO 2
 */

#include <SPI.h>
#include <LoRa.h>       // Library: "LoRa" by Sandeep Mistry
#include <arduinoFFT.h> // Library: "arduinoFFT" by Enrique Condés (v1.9 or v2.x)

// ==========================================
// ⚙️ ROLE CONFIGURATION
// ==========================================
// CHANGE THIS to 'true' for the unit plugged into the Laptop
// CHANGE THIS to 'false' for the units on the trees
#define IS_GATEWAY false 

// IDENTITY (Change for each tree node: NODE_A, NODE_B, etc.)
const String NODE_ID = "NODE_A"; 

// ==========================================
// 🔌 PIN DEFINITIONS
// ==========================================
#define SCK_PIN 5
#define MISO_PIN 19
#define MOSI_PIN 27
#define SS_PIN 18
#define RST_PIN 14
#define DIO0_PIN 26

#define MIC_PIN 34      // Analog Input
#define PIEZO_PIN 33    // RTC GPIO (Works in Deep Sleep)
#define LED_PIN 2       // Onboard LED

// ==========================================
// 🧠 AI CONFIGURATION (FFT)
// ==========================================
#define SAMPLES 512             // Must be a power of 2
#define SAMPLING_FREQ 6000      // 6kHz Sampling (Nyquist = 3kHz)
unsigned int sampling_period_us;
unsigned long microseconds;

double vReal[SAMPLES];
double vImag[SAMPLES];

// FFT Instance
ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, SAMPLES, SAMPLING_FREQ);

// State Variables
bool vibrationTriggered = false;

// ==========================================
// 1. SETUP ROUTINE
// ==========================================
void setup() {
  Serial.begin(115200);
  
  pinMode(MIC_PIN, INPUT);
  pinMode(PIEZO_PIN, INPUT_PULLDOWN); 
  pinMode(LED_PIN, OUTPUT);

  // --- INIT LORA ---
  Serial.println("\n[BOOT] Initializing LoRa Radio...");
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  LoRa.setPins(SS_PIN, RST_PIN, DIO0_PIN);
  
  if (!LoRa.begin(433E6)) { // Adjust frequency (433E6 / 868E6 / 915E6)
    Serial.println("❌ LoRa Init Failed! Check Wiring.");
    while (1); // Halt
  }
  Serial.println("✅ LoRa Online.");

  // --- GATEWAY MODE ---
  if (IS_GATEWAY) {
    Serial.println(">>> MODE: GROUND STATION GATEWAY <<<");
    Serial.println(">>> WAITING FOR PACKETS... <<<");
    return; // Stay in Loop
  }

  // --- SENSOR MODE ---
  Serial.println(">>> MODE: FOREST SENTINEL <<<");

  // Check why we woke up
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();
  if (wakeup_reason == ESP_SLEEP_WAKEUP_EXT0) {
    Serial.println("⚠️ WAKEUP: VIBRATION DETECTED");
    vibrationTriggered = true;
    analyze_environment(); // Run AI
  } else {
    Serial.println("ℹ️ BOOT: Standard Startup");
  }

  // Go back to sleep to save battery
  goToDeepSleep();
}

// ==========================================
// 2. MAIN LOOP (Gateway Only)
// ==========================================
void loop() {
  if (IS_GATEWAY) {
    // Listen for LoRa packets
    int packetSize = LoRa.parsePacket();
    if (packetSize) {
      String incoming = "";
      while (LoRa.available()) {
        incoming += (char)LoRa.read();
      }
      
      // Print to Serial for Python Backend to read
      // Format: DATA:NODE_ID,THREAT
      Serial.print("DATA:"); 
      Serial.println(incoming);
      
      // Blink LED
      digitalWrite(LED_PIN, HIGH);
      delay(50);
      digitalWrite(LED_PIN, LOW);
    }
  }
}

// ==========================================
// 3. EDGE AI ENGINE (Sensor Only)
// ==========================================
void analyze_environment() {
  digitalWrite(LED_PIN, HIGH); // Indicator: AI Running
  
  // --- A. THEFT DETECTION (Vibration Analysis) ---
  if (vibrationTriggered) {
    Serial.println("[AI] Analyzing Vibration Pattern...");
    int hits = 0;
    // Sample Piezo for 1 second to check for rhythmic climbing
    for(int i=0; i<100; i++) {
      if(digitalRead(PIEZO_PIN) == HIGH) hits++;
      delay(10);
    }
    
    // If sustained vibration -> CLIMBING/THEFT
    if (hits > 5) {
      Serial.println(">>> THREAT: CLIMBING DETECTED <<<");
      send_lora_alert("CLIMBING");
      delay(100);
      goToDeepSleep(); // Priority alert sent, save power
    }
  }

  // --- B. CHAINSAW DETECTION (Audio FFT) ---
  Serial.println("[AI] Listening for Audio...");
  
  sampling_period_us = round(1000000 * (1.0 / SAMPLING_FREQ));
  
  // 1. Sample Audio
  for (int i = 0; i < SAMPLES; i++) {
    microseconds = micros();
    vReal[i] = analogRead(MIC_PIN);
    vImag[i] = 0;
    while (micros() < (microseconds + sampling_period_us)) { /* Wait */ }
  }

  // 2. Compute FFT
  FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
  FFT.compute(FFT_FORWARD);
  FFT.complexToMagnitude();

  // 3. Analyze Frequencies
  // Bin Bandwidth = 6000 / 512 = ~11.7 Hz per bin
  // Chainsaw Low Rumble: 100Hz - 600Hz (Bins 8 to 51)
  // Nature Highs: 2000Hz+ (Bins 170+)

  double engine_energy = 0;
  double nature_energy = 0;

  for (int i = 8; i < 51; i++) {
    engine_energy += vReal[i];
  }
  for (int i = 170; i < (SAMPLES/2); i++) {
    nature_energy += vReal[i];
  }

  // 4. Classification
  double ratio = engine_energy / (nature_energy + 1); // Avoid div/0
  
  Serial.print("Engine Energy: "); Serial.println(engine_energy);
  Serial.print("Nature Energy: "); Serial.println(nature_energy);
  Serial.print("Ratio: "); Serial.println(ratio);

  // THRESHOLD LOGIC (Calibrated from Python Simulation)
  if (ratio > 2.0 && engine_energy > 50000) {
    Serial.println(">>> THREAT: CHAINSAW DETECTED <<<");
    send_lora_alert("CHAINSAW");
  } else {
    Serial.println(">>> SAFE: Wind/Background Noise <<<");
  }
  
  digitalWrite(LED_PIN, LOW);
}

// ==========================================
// 4. UTILITIES
// ==========================================
void send_lora_alert(String type) {
  String payload = NODE_ID + "," + type;
  Serial.print("Tx LoRa: "); Serial.println(payload);
  
  LoRa.beginPacket();
  LoRa.print(payload);
  LoRa.endPacket();
  
  // Wait a moment for tx to complete
  delay(500);
}

void goToDeepSleep() {
  Serial.println("💤 Entering Deep Sleep...");
  Serial.flush();
  
  // Wake up if Piezo (Pin 33) goes HIGH
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_33, 1); 
  esp_deep_sleep_start();
}
