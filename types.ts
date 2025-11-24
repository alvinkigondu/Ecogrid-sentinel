export type NodeType = "SENSOR" | "RELAY";

export interface SensorNode {
  id: string;
  lat: number;
  lon: number;
  // UI specific fields (derived or defaulted)
  type?: 'SENSOR' | 'RELAY';
  status?: 'ACTIVE' | 'INACTIVE' | 'ALERT';
  risk?: 'LOW' | 'MEDIUM' | 'HIGH';
  battery?: number;
}

export interface LogEntry {
  id: number | string;
  node: string;
  threat: string;
  gps: string;
  time: string;
  tx_hash: string;
  // UI specific
  event?: string; // Mapped from threat
  status?: string; // Mapped from threat/logic
  hash?: string; // Mapped from tx_hash
  timestamp?: string; // Mapped from time
}

export interface MapViewport {
  lat: number;
  lng: number;
  zoom: number;
}

export interface VerificationZone {
  id: string;
  lat: number;
  lon: number;
  radius: number;
  status: 'VERIFYING' | 'CONFIRMED' | 'FALSE';
  tip_id: string;
}

export interface APIResponse {
  system_status: string;
  active_forest?: string;
  nodes: { id: string; lat: number; lon: number; type?: string; battery?: number }[];
  alerts: { id: number; node: string; threat: string; gps: string; time: string; tx_hash: string; hops?: string }[];
  sms_logs: { id: string; sender: string; message: string; time: string; hash: string; status: string }[];
  verification_zones?: VerificationZone[];
  blockchain: {
    height: number;
    latest_hash: string;
  };
}