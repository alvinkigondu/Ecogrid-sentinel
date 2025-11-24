import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, CircleMarker, useMap, Polygon } from 'react-leaflet';
import L from 'leaflet';
import { SensorNode, VerificationZone } from '../types';
import { INITIAL_VIEWPORT, MESH_LINE_STYLE } from '../constants';

interface SentinelMapProps {
  activeAlertNodeId: string | null;
  onNodeSelect: (node: SensorNode) => void;
  nodes: SensorNode[];
  center?: [number, number];
  zoom?: number;
  verificationZones?: VerificationZone[];
}

// --- Custom Map Controller to handle "Pan to Alert" & "FlyTo Forest" ---
const MapController = ({ activeNodeId, nodes, center, zoom }: { activeNodeId: string | null, nodes: SensorNode[], center?: [number, number], zoom?: number }) => {
  const map = useMap();

  // Handle "FlyTo" for Forest Deployment
  useEffect(() => {
    if (center && zoom) {
      map.flyTo(center, zoom, {
        animate: true,
        duration: 2.5 // Cinematic FlyTo
      });
    }
  }, [center, zoom, map]);

  // Handle "Pan to Alert"
  useEffect(() => {
    if (activeNodeId) {
      const node = nodes.find(s => s.id === activeNodeId);
      if (node) {
        map.flyTo([node.lat, node.lon], 14, {
          animate: true,
          duration: 1.5
        });
      }
    }
  }, [activeNodeId, nodes, map]);

  return null;
};

// --- Custom Icons ---
const createCustomIcon = (type: string | undefined, isAlert: boolean) => {
  const colorClass = isAlert ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : (type === 'RELAY' ? 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.6)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.6)]');
  const shapeClass = type === 'RELAY' ? 'clip-triangle' : 'rounded-full';

  return L.divIcon({
    className: 'custom-icon',
    html: `<div class="w-4 h-4 ${colorClass} ${shapeClass} border-2 border-white/20 animate-pulse"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8]
  });
};

// --- Hexagon Generator (Simplified visual grid) ---
const generateHexGrid = (centerLat: number, centerLng: number) => {
  const hexes: [number, number][][] = [];
  const size = 0.015;
  for (let i = -2; i <= 2; i++) {
    for (let j = -2; j <= 2; j++) {
      const lat = centerLat + (i * size);
      const lng = centerLng + (j * size);
      hexes.push([
        [lat + size / 2, lng],
        [lat + size / 4, lng + size / 2],
        [lat - size / 4, lng + size / 2],
        [lat - size / 2, lng],
        [lat - size / 4, lng - size / 2],
        [lat + size / 4, lng - size / 2],
      ]);
    }
  }
  return hexes;
};

const SentinelMap: React.FC<SentinelMapProps> = ({ activeAlertNodeId, onNodeSelect, nodes, center, zoom, verificationZones }) => {
  const [hexGrid, setHexGrid] = useState<[number, number][][]>([]);

  useEffect(() => {
    // Regenerate hex grid when center changes (optional, but looks cool)
    if (center) {
      setHexGrid(generateHexGrid(center[0], center[1]));
    } else {
      setHexGrid(generateHexGrid(INITIAL_VIEWPORT.lat, INITIAL_VIEWPORT.lng));
    }
  }, [center]);

  // Calculate mesh connections (connect all to Relay nodes)
  const connections = nodes.filter(s => s.type === 'SENSOR').flatMap(sensor => {
    return nodes.filter(r => r.type === 'RELAY').map(relay => ({
      from: [sensor.lat, sensor.lon] as [number, number],
      to: [relay.lat, relay.lon] as [number, number]
    }));
  });

  return (
    <div className="relative w-full h-full z-0">
      <MapContainer
        center={[INITIAL_VIEWPORT.lat, INITIAL_VIEWPORT.lng]}
        zoom={INITIAL_VIEWPORT.zoom}
        zoomControl={false}
        className="w-full h-full bg-slate-900"
        style={{ background: '#0f172a' }}
      >
        {/* Esri World Imagery */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri"
        />

        <MapController activeNodeId={activeAlertNodeId} nodes={nodes} center={center} zoom={zoom} />

        {/* Decorative Hex Grid */}
        {hexGrid.map((hex, idx) => (
          <Polygon
            key={`hex - ${idx} `}
            positions={hex}
            pathOptions={{ color: '#0ea5e9', weight: 1, opacity: 0.1, fillOpacity: 0.02 }}
          />
        ))}

        {/* Mesh Connections */}
        {connections.map((conn, i) => (
          <Polyline
            key={`conn - ${i} `}
            positions={[conn.from, conn.to]}
            pathOptions={MESH_LINE_STYLE}
          />
        ))}

        {/* Verification Zones (Community Tips) */}
        {verificationZones?.map((zone) => (
          <React.Fragment key={zone.id}>
            <CircleMarker
              center={[zone.lat, zone.lon]}
              radius={40} // Visual size
              pathOptions={{
                color: zone.status === 'CONFIRMED' ? '#ef4444' : '#eab308', // Red or Yellow
                fillColor: zone.status === 'CONFIRMED' ? '#ef4444' : '#eab308',
                fillOpacity: 0.2,
                dashArray: '5, 10'
              }}
            >
              <Popup className="scifi-popup">
                <div className="font-mono text-xs">
                  <h3 className="font-bold text-yellow-500">COMMUNITY TIP</h3>
                  <p>Status: {zone.status}</p>
                  <p>ID: {zone.tip_id}</p>
                </div>
              </Popup>
            </CircleMarker>
            {/* Pulsing Animation for Zone */}
            <CircleMarker
              center={[zone.lat, zone.lon]}
              radius={60}
              pathOptions={{ color: zone.status === 'CONFIRMED' ? 'red' : 'yellow', opacity: 0.5, fill: false }}
              className="animate-ping"
            />
          </React.Fragment>
        ))}

        {/* Nodes */}
        {nodes.map((sensor) => {
          const isAlert = sensor.id === activeAlertNodeId;
          return (
            <React.Fragment key={sensor.id}>
              <Marker
                position={[sensor.lat, sensor.lon]}
                icon={createCustomIcon(sensor.type, isAlert)}
                eventHandlers={{
                  click: () => onNodeSelect(sensor)
                }}
              >
                <Popup className="scifi-popup">
                  <div className="font-mono text-xs">
                    <h3 className="font-bold text-cyan-600">{sensor.id}</h3>
                    <p>Type: {sensor.type}</p>
                    <p>Role: {sensor.risk === 'HIGH' ? 'Perimeter Defense' : 'Backbone Mesh'}</p>
                    <p>Status: <span className={isAlert ? "text-red-500" : "text-green-500"}>{isAlert ? "ALERT" : sensor.status}</span></p>
                  </div>
                </Popup>
              </Marker>

              {/* Pulsing Effect Ring for Alerts */}
              {isAlert && (
                <CircleMarker
                  center={[sensor.lat, sensor.lon]}
                  radius={30}
                  pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2, opacity: 0.0 }}
                >
                  <Popup>THREAT DETECTED: CHAINSAW VIBRATION</Popup>
                </CircleMarker>
              )}
            </React.Fragment>
          );
        })}
      </MapContainer>

      {/* Overlay Gradient for "Dark Mode" look over tiles */}
      <div className="absolute inset-0 pointer-events-none bg-slate-900/30 z-[400] mix-blend-multiply"></div>
    </div>
  );
};

export default SentinelMap;