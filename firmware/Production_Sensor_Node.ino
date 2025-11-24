/*
 * 🌲 ECO-GRID SENTINEL: PRODUCTION SENSOR NODE
 * --------------------------------------------
 * ARCHITECTURE:
 * 1. SLEEP: Device remains in Deep Sleep (Micro-Amps).
 * 2. WAKEUP: Triggered by Piezo Vibration (Pin 33).
 * 3. MONITOR: Stays awake for 30 Seconds to listen.
 * 4. AI ENGINE: Runs FFT voting system (Chainsaw vs Wind).
 * 5. LORA: Transmits alert only if threat is confirmed.
 */

#include <SPI.h>
#include <LoRa.h>
#include <arduinoFFT.h> // Make sure to install "arduinoFFT" v1.9 or v2.0

// --- IDENTITY ---
const String NODE_ID = "NODE_A";

// --- HARDWARE PINS (Your Specific Layout) ---
#define SCK_PIN   5
#define MISO_PIN  19
#define MOSI_PIN  27
#define SS_PIN    18
#define RST_PIN   14
#define DIO0_PIN  26

#define MIC_PIN   34      // Analog Microphone
#define PIEZO_PIN 33      // Vibration Sensor (Must allow Pull-Down)
#define BAT_PIN   35      // Voltage Divider for Battery
#define LED_PIN   2

// --- AUDIO AI SETTINGS ---
#define SAMPLES         512     // Power of 2 for FFT
#define SAMPLING_FREQ   6000    // 6kHz range (Nyquist = 3kHz, covers all engines)
unsigned int sampling_period_us;
unsigned long microseconds;

double vReal[SAMPLES];
double vImag[SAMPLES];

// Create FFT Object
ArduinoFFT<double> FFT = ArduinoFFT<double>(vReal, vImag, SAMPLES, SAMPLING_FREQ);

// --- SETUP ---
void setup() {
  Serial.begin(115200);
  
  pinMode(PIEZO_PIN, INPUT_PULLDOWN); // Keeps pin LOW until vibration hits
  pinMode(MIC_PIN, INPUT);
  pinMode(BAT_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);

  sampling_period_us = round(1000000 * (1.0 / SAMPLING_FREQ));

  // 1. INIT LORA
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  LoRa.setPins(SS_PIN, RST_PIN, DIO0_PIN);
  
  if (!LoRa.begin(433E6)) { // Change to 868E6 or 915E6 if using those bands
    Serial.println("❌ LoRa Failed!");
    while (1);
  }
  Serial.println("✅ LoRa Online");

  // 2. CHECK WAKEUP REASON
  esp_sleep_wakeup_cause_t wakeup_reason = esp_sleep_get_wakeup_cause();

  if (wakeup_reason == ESP_SLEEP_WAKEUP_EXT0) {
    Serial.println("\n⚡ WAKEUP: PHYSICAL VIBRATION DETECTED!");
    // Run the 30-second AI Analysis
    run_ai_analysis();
  } else {
    Serial.println("ℹ️ NORMAL BOOT: Sending Heartbeat...");
    send_packet("HEARTBEAT");
  }

  // 3. RETURN TO SLEEP
  go_to_sleep();
}

void loop() {
  // Empty. Sensors never loop. They sleep.
}

// --- THE CORE AI LOGIC ---
void run_ai_analysis() {
  Serial.println("🎤 ENTERING 30-SECOND MONITORING MODE...");
  digitalWrite(LED_PIN, HIGH); // Visual indicator

  unsigned long start_time = millis();
  unsigned long duration = 30000; // 30 Seconds
  
  int chainsaw_votes = 0;
  int wind_votes = 0;
  int total_samples = 0;

  // Loop for 30 seconds
  while (millis() - start_time < duration) {
    
    // A. SAMPLE AUDIO
    for (int i = 0; i < SAMPLES; i++) {
      microseconds = micros();
      vReal[i] = analogRead(MIC_PIN);
      vImag[i] = 0;
      while (micros() < (microseconds + sampling_period_us)) { /* Wait for timing */ }
    }

    // B. COMPUTE FFT
    FFT.windowing(FFT_WIN_TYP_HAMMING, FFT_FORWARD);
    FFT.compute(FFT_FORWARD);
    FFT.complexToMagnitude();

    // C. ENERGY BAND ANALYSIS
    // Chainsaw Engine Rumble: 100Hz to 600Hz (Bins 8 to 51)
    // Nature/Wind Hiss: 2000Hz to 3000Hz (Bins 170 to 256)
    
    double engine_energy = 0;
    double nature_energy = 0;

    for (int i = 8; i < 51; i++) {
      engine_energy += vReal[i];
    }
    for (int i = 170; i < 256; i++) {
      nature_energy += vReal[i];
    }

    // D. VOTE
    // Chainsaws have HIGH low-end energy and LOW high-end energy
    if (engine_energy > 50000 && engine_energy > (nature_energy * 2)) {
      chainsaw_votes++;
      Serial.print("⚠️"); // Log hit
    } else if (nature_energy > engine_energy) {
      wind_votes++;
      Serial.print("."); // Log miss
    }

    total_samples++;
    yield(); // Prevent watchdog crash
  }

  digitalWrite(LED_PIN, LOW);
  Serial.println("\n--- ANALYSIS COMPLETE ---");
  Serial.print("Total Samples: "); Serial.println(total_samples);
  Serial.print("Chainsaw Votes: "); Serial.println(chainsaw_votes);

  // --- E. FINAL VERDICT ---
  // If more than 15% of the time we heard a chainsaw signature:
  if (chainsaw_votes > (total_samples * 0.15)) {
    Serial.println("🔴 RESULT: CHAINSAW CONFIRMED");
    send_packet("CHAINSAW");
  } 
  // If we didn't hear a chainsaw, but we woke up from vibration:
  else {
    Serial.println("🟠 RESULT: TREE FALL / CLIMBING (No Engine Noise)");
    send_packet("TREE_FALL");
  }
}

// --- UTILITIES ---
void send_packet(String type) {
  // Measure Battery
  float battery_volts = (analogRead(BAT_PIN) / 4095.0) * 3.3 * 2; // Assuming 100k/100k divider
  
  // Create Payload: ID,NODE,TYPE,BAT
  String payload = String(millis()) + "," + NODE_ID + "," + type + "," + String(battery_volts, 1) + "V";
  
  Serial.print("📡 SENDING LORA: "); Serial.println(payload);
  
  LoRa.beginPacket();
  LoRa.print(payload);
  LoRa.endPacket();
  
  delay(500); // Allow transmission to finish
}

void go_to_sleep() {
  Serial.println("💤 Entering Deep Sleep. Waiting for Piezo on Pin 33...");
  delay(100); // Allow Serial to finish
  
  // Configure Wakeup: Pin 33 HIGH (1)
  esp_sleep_enable_ext0_wakeup(GPIO_NUM_33, 1); 
  esp_deep_sleep_start();
}