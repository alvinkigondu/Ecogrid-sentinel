import { SensorNode, MapViewport } from './types';

export const INITIAL_VIEWPORT: MapViewport = {
  lat: -0.43,
  lng: 35.78,
  zoom: 13
};

// Expanded sensor list to create a better visual mesh
export const SENSORS: SensorNode[] = [
  { id: "NODE_A", lat: -0.410171, lng: 35.815571, type: "SENSOR", status: "ACTIVE", risk: "HIGH", battery: 82 },
  { id: "NODE_B", lat: -0.447092, lng: 35.765176, type: "RELAY", status: "ACTIVE", risk: "LOW", battery: 95 },
  { id: "NODE_C", lat: -0.405590, lng: 35.702922, type: "RELAY", status: "ACTIVE", risk: "LOW", battery: 100 },
  { id: "NODE_D", lat: -0.425590, lng: 35.742922, type: "SENSOR", status: "ACTIVE", risk: "MEDIUM", battery: 64 },
  { id: "NODE_E", lat: -0.455590, lng: 35.792922, type: "SENSOR", status: "ACTIVE", risk: "LOW", battery: 78 },
];

// Base64 simple beep sound (short sine wave) to avoid external assets
export const ALERT_SOUND_URI = "data:audio/wav;base64,UklGRl9vT1BXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU"; // Shortened placeholder, will implement full sound generation in code logic for reliability.

export const HEX_GRID_STYLE = {
  color: "#0ea5e9",
  weight: 1,
  opacity: 0.1,
  fillOpacity: 0.05
};

export const MESH_LINE_STYLE = {
  color: "#22d3ee",
  weight: 1,
  opacity: 0.4,
  dashArray: '5, 10'
};