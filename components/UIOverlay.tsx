import React from 'react';
import { SensorNode, LogEntry } from '../types';
import { Activity, ShieldAlert, Wifi, Server, Radio, Database, CheckCircle, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
    activeAlert: string | null;
    selectedNode: SensorNode | null;
    sensorCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeAlert, selectedNode, sensorCount }) => {
    return (
        <div className="w-full flex flex-col gap-4 pointer-events-none">
            {/* Network Status Card */}
            <div className="bg-black/60 backdrop-blur-md border border-cyan-500/30 p-4 rounded-lg pointer-events-auto font-mono text-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>
                <div className="flex items-center justify-between mb-2">
                    <h2 className="text-cyan-400 font-bold flex items-center gap-2">
                        <Wifi className="w-4 h-4" /> NETWORK STATUS
                    </h2>
                    <span className="text-emerald-400 text-xs animate-pulse">ONLINE</span>
                </div>
                <div className="space-y-2 text-slate-300">
                    <div className="flex justify-between">
                        <span>Mesh Topology:</span>
                        <span className="text-white">ACTIVE</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Uptime:</span>
                        <span className="text-white">42d 11h 04m</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Bandwidth:</span>
                        <span className="text-white">24 MB/s</span>
                    </div>
                </div>
            </div>

            {/* Threat Level Card */}
            <div className={`bg-black/60 backdrop-blur-md border ${activeAlert ? 'border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'border-emerald-500/30'} p-4 rounded-lg pointer-events-auto font-mono text-sm relative transition-all duration-500`}>
                <div className={`absolute top-0 left-0 w-1 h-full ${activeAlert ? 'bg-red-500' : 'bg-emerald-500'}`}></div>
                <div className="flex items-center justify-between mb-2">
                    <h2 className={`${activeAlert ? 'text-red-500' : 'text-emerald-400'} font-bold flex items-center gap-2`}>
                        <ShieldAlert className="w-4 h-4" /> THREAT LEVEL
                    </h2>
                    <span className={`${activeAlert ? 'text-red-500 animate-ping' : 'text-emerald-500'}`}>
                        {activeAlert ? 'CRITICAL' : 'NOMINAL'}
                    </span>
                </div>
                <div className="text-xs text-slate-400">
                    {activeAlert ? (
                        <span className="text-red-400">
                            ACOUSTIC SIGNATURE MATCH: CHAINSAW<br />
                            SECTOR: {activeAlert}
                        </span>
                    ) : "No active anomalies detected in protected sectors."}
                </div>
            </div>

            {/* Context Panel (Active Node) */}
            <AnimatePresence>
                {selectedNode && (
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-slate-900/80 backdrop-blur-md border border-white/20 p-4 rounded-lg pointer-events-auto font-mono text-sm"
                    >
                        <h3 className="text-white font-bold border-b border-white/10 pb-2 mb-2 flex justify-between">
                            <span>{selectedNode.id}</span>
                            <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded">{selectedNode.type}</span>
                        </h3>
                        <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                            <div className="flex flex-col">
                                <span className="text-slate-500">LAT</span>
                                <span>{selectedNode.lat.toFixed(4)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-500">LNG</span>
                                <span>{selectedNode.lon.toFixed(4)}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-500">BATTERY</span>
                                <span className={selectedNode.battery && selectedNode.battery < 30 ? "text-amber-500" : "text-emerald-400"}>{selectedNode.battery}%</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-slate-500">NDVI</span>
                                <span className="text-amber-300">0.45 (Warning)</span>
                            </div>
                        </div>
                        <div className="mt-3 pt-2 border-t border-white/10 text-[10px] uppercase tracking-wider text-cyan-400">
                            Node operational
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

interface LedgerProps {
    logs: LogEntry[];
}

export const Ledger: React.FC<LedgerProps> = ({ logs }) => {
    return (
        <div className="absolute bottom-4 right-4 z-[1000] w-[450px] h-64 bg-black/80 backdrop-blur-md border-t-2 border-emerald-500/50 flex flex-col rounded-tl-xl pointer-events-auto font-mono text-xs shadow-2xl">
            <div className="flex items-center justify-between p-3 border-b border-white/10 bg-white/5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Database className="w-4 h-4" /> IMMUTABLE LEDGER (POLYGON)
                </div>
                <div className="flex gap-2 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div> SYNCED</span>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar flex flex-col-reverse">
                <AnimatePresence initial={false}>
                    {logs.map((log) => (
                        <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: 20, height: 0 }}
                            animate={{ opacity: 1, x: 0, height: 'auto' }}
                            transition={{ duration: 0.3 }}
                            className={`grid grid-cols-[60px_1fr_1fr_80px] gap-2 p-2 border-l-2 ${log.status === 'ALERT' ? 'border-red-500 bg-red-500/10' : 'border-emerald-500 bg-emerald-500/5'} mb-1`}
                        >
                            <span className="text-slate-500">{log.timestamp}</span>
                            <span className="text-slate-400 truncate" title={log.hash}>{log.hash}</span>
                            <span className={log.status === 'ALERT' ? 'text-red-300 font-bold' : 'text-white'}>{log.event}</span>
                            <span className="flex items-center justify-end gap-1">
                                {log.status === 'VERIFIED' && <CheckCircle className="w-3 h-3 text-emerald-500" />}
                                {log.status === 'ALERT' && <AlertTriangle className="w-3 h-3 text-red-500" />}
                                {log.status === 'VERIFYING' && <div className="w-3 h-3 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />}
                                <span className={log.status === 'ALERT' ? 'text-red-500' : log.status === 'VERIFYING' ? 'text-amber-500' : 'text-emerald-500'}>
                                    {log.status === 'VERIFIED' ? 'MINED' : log.status}
                                </span>
                            </span>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};