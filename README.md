# 🌲 Eco-Grid Sentinel
### A Bio-Spatial, Non-Euclidean Approach to Real-Time Forest Conservation
**Submission for Wangari Maathai Hackathon 2025 - Track 1**

![Project Banner](https://img.shields.io/badge/Status-Production_Ready-success) ![Stack](https://img.shields.io/badge/Tech-IoT_AI_Blockchain-blue)

---

## 🌍 Project Overview
**Eco-Grid Sentinel** is a closed-loop Cyber-Physical System designed to protect Kenya's forests. Unlike traditional systems that place sensors randomly, we use **Satellite Intelligence (Sentinel-2)** to mathematically optimize sensor placement based on terrain and risk vectors. 

The system detects **Illegal Logging (Chainsaws)** and **Theft Attempts (Climbing)** using Edge AI, transmits data via **LoRa Mesh**, and logs evidence to an **Immutable Blockchain Ledger**.

---

## 🏗️ System Architecture

The repository is divided into three core modules:

1.  **`/firmware` (The Nervous System):** C++ code for ESP32 LoRa nodes.
    *   *Sensor Node:* Deep sleeping, AI-powered audio/vibration detector.
    *   *Gateway Node:* USB bridge that connects the LoRa mesh to the laptop.
2.  **`/backend` (The Brain):** Python Flask Server.
    *   Handles Satellite Optimization logic.
    *   Listens to Hardware via Serial (USB).
    *   Manages the Blockchain Ledger (ECDSA/SHA256).
3.  **`/frontend` (The Face):** React + Tailwind Dashboard.
    *   Visualizes the "Bio-Spatial" grid.
    *   Real-time "Sci-Fi" command center for Rangers.

---

## 🛠️ Hardware Requirements & Setup

To run the physical demo, you need the following:

| Component | Quantity | Pin Configuration (ESP32) |
| :--- | :--- | :--- |
| **ESP32 Dev Module** | 2 | Standard |
| **LoRa Module (SX1278)** | 2 | SCK:18, MISO:19, MOSI:23, SS:5, RST:14, DIO0:26 |
| **Piezo Sensor** | 1 | GPIO 33 (Input Pulldown) |
| **Microphone (MAX9814)** | 1 | GPIO 35 (Analog) |
| **LED (Status)** | 1 | GPIO 2 (Built-in) |

---

## 🚀 Installation Guide

Follow these steps to launch the full stack locally.

### Step 1: Set up the Backend (Python)
This handles the logic, blockchain, and hardware connection.

1.  Navigate to the root directory.
2.  Install dependencies:
    ```bash
    pip install -r requirements.txt
    ```
3.  Connect your **Gateway ESP32** to the USB port.
4.  Check which COM port it is using (e.g., `COM3` on Windows or `/dev/ttyUSB0` on Linux).
5.  Open `backend.py` and update the `SERIAL_PORT` line if necessary.
6.  Run the server:
    ```bash
    python backend.py
    ```
    *Output should say: `🚀 PRODUCTION BACKEND ONLINE`*

### Step 2: Set up the Frontend (React)
This launches the Command Center Dashboard.

1.  Open a new terminal.
2.  Navigate to the frontend folder (if applicable) or root:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Open your browser to `http://localhost:5173`.

### Step 3: Flash the Firmware (Arduino IDE)
You need to flash two different ESP32s.

1.  **Device A (The Sensor):**
    *   Open `firmware/Production_Sensor_Node.ino`.
    *   Upload to the ESP32 connected to the Battery/Sensors.
2.  **Device B (The Gateway):**
    *   Open `firmware/Production_Gateway_Node.ino`.
    *   Upload to the ESP32 connected to your Laptop.

---

## 🎮 How to Use (The Demo Flow)

Once everything is running, follow this script to demonstrate the system capabilities:

### 1. Strategic Deployment (Satellite Logic)
*   Go to the Dashboard Sidebar.
*   Select **"Karura Forest"** from the dropdown.
*   **Observation:** The map flies to Nairobi. You will see sensors placed in a specific line (mimicking a road/risk zone) rather than a random circle. This proves our **Bio-Spatial Optimization**.

### 2. Hardware Verification (The "Heartbeat")
*   Turn on the **Sensor Node**.
*   **Observation:** The Dashboard log will show `BOOT_ONLINE`. The Battery stats on the sidebar will update.

### 3. Threat Simulation (IoT Trigger)
*   **Scenario:** A poacher climbs the tree.
*   **Action:** Tap the Piezo sensor continuously.
*   **Result:** The Sensor sends a LoRa packet. The Dashboard Map flashes **RED**. The Blockchain log updates with a new Hash.

### 4. Community Verification (Human-in-the-loop)
*   **Scenario:** A villager sends a tip via SMS.
*   **Action:** Use the "Community Tip Line" box on the sidebar. Type *"Logging near Gate C"* and click Send.
*   **Result:** The system logs the SMS to the blockchain, geocodes "Gate C", and highlights the nearest sensor on the map in **Yellow** (Verifying Mode).

---

## 🧩 API Reference

The Backend exposes these endpoints for integration:

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/deploy_forest` | Triggers Satellite Optimization logic. |
| `GET` | `/api/status` | Stream for Map Markers, Alerts, and Blockchain. |
| `POST` | `/api/sms_webhook` | Webhook for Africa's Talking/GSM gateways. |

---

## 👥 Team Forest Guardians

*   **Allan Iteba** - Lead Developer (AI & Astrophysics)
*   **Alvin Kigondu** - Instrumentation & Hardware Engineering
*   **Cliff Mwendwa** - Instrumentation & Hardware Engineering

---

> *"When we plant trees, we plant the seeds of peace and hope."* — **Prof. Wangari Maathai**
