/*
 * 🌲 ECO-GRID SENTINEL: GATEWAY NODE
 * ----------------------------------
 * ROLE: USB Bridge to Ground Station
 * 1. Always On (No Sleep).
 * 2. Receives LoRa Packets.
 * 3. Forwards to Serial for Python Logic.
 */

#include <SPI.h>
#include <LoRa.h>

// --- PINS (Same as Sensor) ---
#define SCK_PIN   5
#define MISO_PIN  19
#define MOSI_PIN  27
#define SS_PIN    18
#define RST_PIN   14
#define DIO0_PIN  26
#define LED_PIN   2

void setup() {
  Serial.begin(115200);
  pinMode(LED_PIN, OUTPUT);
  
  // INIT LORA
  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  LoRa.setPins(SS_PIN, RST_PIN, DIO0_PIN);

  if (!LoRa.begin(433E6)) {
    Serial.println("LoRa Error! Check Wiring.");
    while (1);
  }
  Serial.println("GATEWAY_READY");
  
  // Flash LED to indicate boot
  for(int i=0; i<3; i++) {
    digitalWrite(LED_PIN, HIGH); delay(100); digitalWrite(LED_PIN, LOW); delay(100);
  }
}

void loop() {
  // Check for incoming LoRa
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    String incoming = "";
    while (LoRa.available()) {
      incoming += (char)LoRa.read();
    }

    // 1. VISUAL FEEDBACK
    digitalWrite(LED_PIN, HIGH);

    // 2. SEND TO PYTHON BACKEND
    // The Python script looks for the "DATA:" prefix to parse
    Serial.print("DATA:");
    Serial.println(incoming);

    // 3. RELAY LOGIC (Optional Simulation)
    // If you had a 3rd device, this is where you would code it to re-transmit.
    // For this demo, we are the final destination.

    delay(50);
    digitalWrite(LED_PIN, LOW);
  }
}