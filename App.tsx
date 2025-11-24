import React, { useState, useEffect } from 'react';
import SentinelMap from './components/SentinelMap';
import { Sidebar, Ledger } from './components/UIOverlay';
import ForestSelector, { StatsPanel } from './components/ForestSelector';
import { LogEntry, SensorNode, APIResponse } from './types';
import { Radar, Menu } from 'lucide-react';

function App() {
    const [activeAlertNodeId, setActiveAlertNodeId] = useState<string | null>(null);
    const [selectedNode, setSelectedNode] = useState<SensorNode | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [nodes, setNodes] = useState<SensorNode[]>([]);
    const [blockchainInfo, setBlockchainInfo] = useState({ height: 0, latest_hash: 'Loading...' });
    const [systemStatus, setSystemStatus] = useState<string>('CONNECTING...');
    const [mapView, setMapView] = useState<{ center: [number, number], zoom: number } | undefined>(undefined);
    const [stats, setStats] = useState<any>(null);

    const [activeForest, setActiveForest] = useState("MAU FOREST SECTOR 4");
    const [verificationZones, setVerificationZones] = useState<any[]>([]);

    const handleDeployment = (data: any) => {
        if (data.nodes) {
            const optimizedNodes: SensorNode[] = data.nodes.map((n: any) => ({
                ...n,
                risk: n.type === 'SENSOR' ? 'HIGH' : 'LOW'
            }));
            setNodes(optimizedNodes);
            setMapView({ center: data.center, zoom: data.zoom });
            setStats(data.stats);
            if (data.active_forest) setActiveForest(data.active_forest.toUpperCase());
        }
    };

    // Polling Loop with Simulation Fallback
    useEffect(() => {
        const fetchData = async () => {
            try {
                const res = await fetch('http://localhost:5000/api/status');
                if (!res.ok) throw new Error("Backend unreachable");

                const data: APIResponse = await res.json();

                setSystemStatus(data.system_status);
                if (data.active_forest) setActiveForest(data.active_forest.toUpperCase());
                if (data.verification_zones) setVerificationZones(data.verification_zones);

                // Map Nodes
                if (data.nodes && data.nodes.length > 0) {
                    const mappedNodes: SensorNode[] = data.nodes.map(n => ({
                        ...n,
                        type: (n.type as any) || (n.id.includes('RELAY') ? 'RELAY' : 'SENSOR'),
                        status: 'ACTIVE',
                        risk: 'LOW',
                        battery: n.battery || 85
                    }));
                    setNodes(mappedNodes);
                }

                // Map Logs (Hardware Alerts)
                const hardwareLogs: LogEntry[] = data.alerts.map(a => ({
                    id: a.id,
                    node: a.node,
                    threat: a.threat,
                    gps: a.gps,
                    time: a.time,
                    tx_hash: a.tx_hash,
                    event: a.threat,
                    status: 'ALERT',
                    hash: a.tx_hash,
                    timestamp: a.time
                }));

                // Map SMS Logs
                const smsLogs: LogEntry[] = (data.sms_logs || []).map(s => ({
                    id: s.id,
                    node: s.sender, // Use sender as node identifier for UI
                    threat: 'SMS_TIP',
                    gps: 'N/A',
                    time: s.time,
                    tx_hash: s.hash,
                    event: s.message,
                    status: s.status || 'VERIFYING',
                    hash: s.hash,
                    timestamp: s.time
                }));

                // Merge and Sort
                const allLogs = [...smsLogs, ...hardwareLogs].sort((a, b) =>
                    new Date('1970/01/01 ' + b.time).getTime() - new Date('1970/01/01 ' + a.time).getTime()
                );

                setLogs(allLogs);
                setBlockchainInfo(data.blockchain);

                if (data.alerts.length > 0) {
                    setActiveAlertNodeId(data.alerts[0].node);
                } else {
                    setActiveAlertNodeId(null);
                }

            } catch (e) {
                // Fallback to Simulation Mode
                setSystemStatus('OFFLINE (SIMULATION)');

                // Generate Mock Nodes if empty
                if (nodes.length === 0) {
                    setNodes([
                        { id: "NODE_A", lat: -0.410171, lon: 35.815571, type: "SENSOR", status: "ACTIVE", risk: "HIGH", battery: 82 },
                        { id: "NODE_B", lat: -0.447092, lon: 35.765176, type: "RELAY", status: "ACTIVE", risk: "LOW", battery: 95 },
                        { id: "NODE_C", lat: -0.405590, lon: 35.702922, type: "RELAY", status: "ACTIVE", risk: "LOW", battery: 100 },
                        { id: "NODE_D", lat: -0.425590, lon: 35.742922, type: "SENSOR", status: "ACTIVE", risk: "MEDIUM", battery: 64 },
                        { id: "NODE_E", lat: -0.455590, lon: 35.792922, type: "SENSOR", status: "ACTIVE", risk: "LOW", battery: 78 },
                    ]);
                }
            }
        };

        const interval = setInterval(fetchData, 2000);
        fetchData(); // Initial fetch

        return () => clearInterval(interval);
    }, []);

    const [smsText, setSmsText] = useState("");

    const sendSimulatedSMS = async () => {
        try {
            await fetch('http://localhost:5000/api/sms_webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sender: "+254700000000",
                    message: smsText || "Suspicious activity near Gate C"
                })
            });
            setSmsText("");
        } catch (err) {
            console.error("Failed to send SMS", err);
        }
    };

    return (
        <div className="relative w-full h-screen flex font-sans scanlines overflow-hidden">

            {/* SIDEBAR STRUCTURE (Left Panel) */}
            <div className="w-96 flex flex-col h-full bg-gray-900/80 backdrop-blur-md border-r border-gray-800 z-50 shadow-2xl">

                {/* HEADER (Fixed) */}
                <div className="p-6 border-b border-gray-800 bg-transparent flex items-center justify-between">
                    <div>
                        <div className="text-xs text-cyan-500 font-mono tracking-widest mb-1">SYSTEM STATUS: {systemStatus}</div>
                        <h1 className="text-2xl font-bold text-white tracking-tighter">ECO-GRID <span className="text-cyan-400">SENTINEL</span></h1>
                    </div>
                    <div className={`p-2 border rounded-md ${systemStatus.includes('OFFLINE') ? 'bg-red-500/20 border-red-500' : 'bg-cyan-500/20 border-cyan-500'}`}>
                        <Radar className={`w-5 h-5 animate-spin-slow ${systemStatus.includes('OFFLINE') ? 'text-red-400' : 'text-cyan-400'}`} />
                    </div>
                </div>

                {/* SCROLLABLE MIDDLE AREA */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Forest Selector */}
                    <ForestSelector onDeploy={handleDeployment} />

                    {/* Stats Panel */}
                    <StatsPanel stats={stats} />

                    {/* Live Feed / Status (Existing Sidebar Component) */}
                    <Sidebar
                        activeAlert={activeAlertNodeId}
                        selectedNode={selectedNode}
                        sensorCount={nodes.length}
                    />
                </div>

                {/* FOOTER (Fixed - SMS Input) */}
                <div className="p-4 border-t border-gray-800 bg-transparent">
                    <div className="bg-gray-800/50 p-3 rounded border border-gray-700">
                        <label className="text-xs text-cyan-400 mb-2 block uppercase flex items-center gap-2">
                            <span className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> COMMUNITY TIP LINE
                        </label>
                        <div className="flex gap-2">
                            <input
                                className="flex-1 bg-black text-white text-xs p-2 rounded border border-gray-600 focus:border-cyan-500 outline-none"
                                placeholder='Ex: "Logging at Gate C"'
                                value={smsText}
                                onChange={(e) => setSmsText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendSimulatedSMS()}
                            />
                            <button
                                onClick={sendSimulatedSMS}
                                className="bg-cyan-600 hover:bg-cyan-500 text-black font-bold text-xs px-3 rounded transition-all"
                            >
                                SEND
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* MAIN MAP AREA (Right Panel) */}
            <div className="flex-1 relative bg-black">
                {/* Map Overlay Header */}
                <div className="absolute top-6 left-6 z-[1000] pointer-events-none">
                    {/* Optional: Add map-specific overlays here if needed, or keep clean */}
                </div>

                <SentinelMap
                    activeAlertNodeId={activeAlertNodeId}
                    onNodeSelect={setSelectedNode}
                    nodes={nodes}
                    center={mapView?.center}
                    zoom={mapView?.zoom}
                    verificationZones={verificationZones}
                />

                {/* Bottom Right Ledger (Logs) */}
                <Ledger logs={logs} />

                {/* Decorative HUD Elements */}
                <div className="absolute bottom-8 left-8 z-[500] pointer-events-none opacity-50">
                    <div className="flex items-end gap-1">
                        <div className="w-1 h-4 bg-cyan-500"></div>
                        <div className="w-1 h-6 bg-cyan-500"></div>
                        <div className="w-1 h-3 bg-cyan-500"></div>
                        <div className="w-1 h-8 bg-cyan-500 animate-pulse"></div>
                        <div className="w-1 h-2 bg-cyan-500"></div>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-500 mt-1">AUDIO_SPECTRUM_ANALYSIS</div>
                </div>
            </div>
        </div>
    );
}

export default App;