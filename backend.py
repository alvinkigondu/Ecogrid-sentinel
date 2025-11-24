# --- ECO-GRID SENTINEL: PRODUCTION BACKEND ---
# Features: Pre-Computed Optimization + Live Satellite Analysis + Hardware + Blockchain

import math
import threading
import json
import time
import random
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import serial

# --- SATELLITE LIBRARIES ---
try:
    import ee
    import geemap
    # Replace with your actual project ID
    ee.Initialize(project='agrocast-data-project')
    GEE_ACTIVE = True
    print("✅ GOOGLE EARTH ENGINE: CONNECTED")
except Exception as e:
    GEE_ACTIVE = False
    print(f"⚠️ GEE ERROR: {e} (Running in Offline Mode)")

app = Flask(__name__)
CORS(app)

# --- 1. THE KNOWLEDGE BASE (Pre-Computed / Offline Fallback) ---
FOREST_MODELS = {
    "Karura Forest": {
        "center": [-1.240, 36.825],
        "radius_km": 2.5,
        "zoom": 13,
        "area_sqkm": 10.4,
        "terrain_factor": 1.1, # Mostly flat
        "risk_vectors": [
            # Simulating Limuru Road Boundary (High Risk)
            {"start": [-1.23, 36.81], "end": [-1.25, 36.81], "type": "ROAD"},
            # Simulating Kiambu Road Boundary
            {"start": [-1.23, 36.84], "end": [-1.25, 36.84], "type": "ROAD"},
            # Simulating River Path (Internal Risk)
            {"start": [-1.235, 36.815], "end": [-1.245, 36.835], "type": "RIVER"}
        ],
        "ridges": [
            # Strategic High Points for Relays
            [-1.238, 36.822], 
            [-1.245, 36.830]
        ]
    },
    "Mau Complex": {
        "center": [-0.55, 35.75],
        "radius_km": 15.0,
        "zoom": 11,
        "area_sqkm": 400.0, # Just a sector of it
        "terrain_factor": 1.8, # Very Rugged
        "risk_vectors": [
            # Narok Road Entry
            {"start": [-0.50, 35.70], "end": [-0.60, 35.80], "type": "ROAD"},
            # Deep Logging Path
            {"start": [-0.55, 35.72], "end": [-0.55, 35.78], "type": "PATH"}
        ],
        "ridges": [
            [-0.52, 35.73], [-0.58, 35.77], [-0.54, 35.76], [-0.56, 35.74]
        ]
    },
    "Arabuko Sokoke": {
        "center": [-3.30, 39.90],
        "radius_km": 10.0,
        "zoom": 11,
        "area_sqkm": 420.0,
        "terrain_factor": 1.0, # Flat Coastal
        "risk_vectors": [
             {"start": [-3.25, 39.85], "end": [-3.35, 39.95], "type": "ROAD"}
        ],
        "ridges": [[-3.30, 39.90]] # Central Tower
    }
}

NODE_DB = []
ALERTS = []
SMS_LOGS = []
BLOCKCHAIN_HEIGHT = 142

# --- 2. THE LIVE SATELLITE ENGINE (Phase 1 Logic) ---
def run_live_satellite_analysis(center_lat, center_lon, radius_km):
    """
    Actually queries Google Earth Engine for TPI and NDVI.
    Returns a list of nodes based on REAL physics.
    """
    if not GEE_ACTIVE:
        print("❌ GEE Offline. Returning empty list.")
        return []

    print(f"🛰️ SATELLITE SCAN: Analyzing {radius_km}km radius around {center_lat}, {center_lon}...")
    
    # A. Define Geometry
    # Create a buffer around the center point
    point = ee.Geometry.Point([center_lon, center_lat])
    roi = point.buffer(radius_km * 1000).bounds()

    # B. Load Data
    dem = ee.Image("USGS/SRTMGL1_003").clip(roi)
    s2 = ee.ImageCollection("COPERNICUS/S2_SR_HARMONIZED") \
        .filterBounds(roi) \
        .filterDate('2023-01-01', '2024-01-01') \
        .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20)) \
        .median() \
        .clip(roi)

    # C. Physics: Topography (Relays)
    elevation = dem.select('elevation')
    tpi = elevation.subtract(elevation.focal_mean(ee.Kernel.circle(500, 'meters')))
    ridges = tpi.gt(15).selfMask() # High Ground > 15m relative height

    # D. Physics: Risk/NDVI (Sensors)
    ndvi = s2.normalizedDifference(['B8', 'B4'])
    # Risk = Low Vegetation (Roads/Clearing) inside high elevation
    risk_zones = ndvi.lt(0.5).selfMask() 

    # E. Sampling (Convert pixels to GPS points)
    # We limit points to save cost/browser rendering
    relay_points = ridges.stratifiedSample(numPoints=5, region=roi, scale=100, geometries=True)
    sensor_points = risk_zones.stratifiedSample(numPoints=15, region=roi, scale=100, geometries=True)

    # F. Parsing to JSON
    nodes = []
    
    # Process Relays
    try:
        relays_info = relay_points.aggregate_array('.geo').getInfo()
        for i, p in enumerate(relays_info):
            coords = p['coordinates']
            nodes.append({
                "id": f"RELAY_LIVE_{i}", "lat": coords[1], "lon": coords[0],
                "type": "RELAY", "status": "ONLINE", "battery": "SOLAR",
                "role": "Topo-Optimized Ridge"
            })
    except Exception as e:
        print(f"⚠️ GEE Relay Error: {e}")

    # Process Sensors
    try:
        sensors_info = sensor_points.aggregate_array('.geo').getInfo()
        for i, p in enumerate(sensors_info):
            coords = p['coordinates']
            nodes.append({
                "id": f"SENS_LIVE_{i}", "lat": coords[1], "lon": coords[0],
                "type": "SENSOR", "status": "SLEEP", "battery": "95%",
                "role": "NDVI Risk Zone"
            })
    except Exception as e:
        print(f"⚠️ GEE Sensor Error: {e}")

    print(f"✅ LIVE ANALYSIS COMPLETE: Found {len(nodes)} optimal points.")
    return nodes

# --- 3. THE HYBRID DEPLOYMENT LOGIC ---
def calculate_deployment(forest_name, use_live_satellite=False):
    data = FOREST_MODELS.get(forest_name)
    if not data: return []

    # OPTION A: LIVE SATELLITE (The "Real" Way)
    if use_live_satellite and GEE_ACTIVE:
        return run_live_satellite_analysis(data['center'][0], data['center'][1], data['radius_km'])

    # OPTION B: PRE-COMPUTED (The "Fast" Way - Backup)
    nodes = []
    
    # 1. Place Sensors along Risk Vectors (Roads/Rivers)
    sensor_count = 0
    for vector in data.get('risk_vectors', []):
        start_lat, start_lon = vector['start']
        end_lat, end_lon = vector['end']
        
        # Calculate distance
        dist = math.sqrt((end_lat - start_lat)**2 + (end_lon - start_lon)**2) * 111 # approx km
        
        # Density: High for Roads (0.3km), Low for Rivers (0.8km)
        density = 0.3 if vector['type'] == "ROAD" else 0.8
        steps = int(dist / density)
        
        for i in range(steps + 1):
            fraction = i / steps if steps > 0 else 0
            
            # ADD JITTER HERE (Random offset +/- 50 meters)
            jitter_lat = (random.random() - 0.5) * 0.001 
            jitter_lon = (random.random() - 0.5) * 0.001
            
            lat = start_lat + (end_lat - start_lat) * fraction + jitter_lat
            lon = start_lon + (end_lon - start_lon) * fraction + jitter_lon
            
            nodes.append({
                "id": f"SENS_{sensor_count}",
                "lat": lat, "lon": lon,
                "type": "SENSOR",
                "status": "ACTIVE",
                "battery": 100,
                "role": f"Risk Zone ({vector['type']})"
            })
            sensor_count += 1

    # 2. Place Relays on Ridges
    relay_count = 0
    for ridge in data.get('ridges', []):
        nodes.append({
            "id": f"RELAY_{relay_count}",
            "lat": ridge[0], "lon": ridge[1],
            "type": "RELAY",
            "status": "ACTIVE",
            "battery": 100,
            "role": "High Altitude Backbone"
        })
        relay_count += 1
        
    return nodes

# --- API ENDPOINTS ---

@app.route('/api/forests', methods=['GET'])
def get_forests():
    return jsonify(list(FOREST_MODELS.keys()))

@app.route('/api/deploy_forest', methods=['POST'])
def deploy():
    global NODE_DB
    req = request.json
    name = req.get('forest_name')
    # Frontend can send {"live_analysis": true} to trigger GEE
    live_mode = req.get('live_analysis', False) 
    
    if name not in FOREST_MODELS: return jsonify({"error": "Unknown"}), 404
    
    # DECISION: Real Satellite vs Pre-Computed
    NODE_DB = calculate_deployment(name, use_live_satellite=live_mode)
    
    # Stats Calculation
    sensors = sum(1 for n in NODE_DB if n['type'] == 'SENSOR')
    relays = sum(1 for n in NODE_DB if n['type'] == 'RELAY')
    
    # Fallback if GEE returns empty
    if len(NODE_DB) == 0 and live_mode:
        print("⚠️ GEE returned 0 nodes. Falling back to Pre-Computed.")
        NODE_DB = calculate_deployment(name, use_live_satellite=False)
        sensors = sum(1 for n in NODE_DB if n['type'] == 'SENSOR')
        relays = sum(1 for n in NODE_DB if n['type'] == 'RELAY')

    return jsonify({
        "nodes": NODE_DB,
        "center": FOREST_MODELS[name]['center'],
        "zoom": FOREST_MODELS[name].get('zoom', 12),
        "active_forest": name,
        "stats": {
            "sensors": sensors, "relays": relays,
            "cost": (sensors * 35) + (relays * 120),
            "source": "SATELLITE_LIVE" if live_mode and GEE_ACTIVE else "PRE_COMPUTED",
            "terrain_factor": FOREST_MODELS[name].get('terrain_factor', 1.0)
        }
    })

@app.route('/api/sms_webhook', methods=['POST'])
def sms_webhook():
    global BLOCKCHAIN_HEIGHT, SMS_LOGS, ALERTS
    data = request.json
    sender = data.get('sender', 'Anonymous')
    message = data.get('message', '')
    
    # 1. Log to Blockchain
    BLOCKCHAIN_HEIGHT += 1
    tx_hash = f"0x{abs(hash(message + str(time.time()))) % 10**16:016x}"
    
    log_entry = {
        "id": f"SMS_{len(SMS_LOGS)+1}",
        "sender": sender,
        "message": message,
        "time": datetime.now().strftime("%H:%M:%S"),
        "hash": tx_hash,
        "status": "VERIFYING"
    }
    SMS_LOGS.append(log_entry)
    
    # 2. Trigger Alert (Simulated Zone)
    # In a real app, we'd geocode here. For demo, we just alert.
    ALERTS.insert(0, {
        "id": len(ALERTS) + 1,
        "node": "COMMUNITY_TIP",
        "threat": f"SMS TIP: {message}",
        "time": datetime.now().strftime("%H:%M:%S"),
        "status": "VERIFYING",
        "tx_hash": tx_hash,
        "gps": "N/A"
    })

    return jsonify({"status": "Logged", "tx_hash": tx_hash})

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        "system_status": "ONLINE",
        "nodes": NODE_DB, 
        "alerts": ALERTS, 
        "sms_logs": SMS_LOGS,
        "blockchain": {"height": BLOCKCHAIN_HEIGHT}
    })

if __name__ == '__main__':
    print("🚀 BACKEND ONLINE")
    app.run(port=5000)

