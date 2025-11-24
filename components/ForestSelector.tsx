import React, { useState, useEffect } from 'react';
import { Map, Zap, Satellite, ShieldCheck, Signal } from 'lucide-react';

interface ForestSelectorProps {
    onDeploy: (data: any) => void;
}

const ForestSelector: React.FC<ForestSelectorProps> = ({ onDeploy }) => {
    const [forests, setForests] = useState<string[]>([]);
    const [selected, setSelected] = useState("");
    const [loading, setLoading] = useState(false);
    const [liveMode, setLiveMode] = useState(false);

    useEffect(() => {
        // Fetch list of forests on load
        fetch('http://localhost:5000/api/forests')
            .then(res => res.json())
            .then(data => setForests(data))
            .catch(err => console.error(err));
    }, []);

    const handleDeploy = async () => {
        if (!selected) return;
        setLoading(true);
        try {
            const res = await fetch('http://localhost:5000/api/deploy_forest', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    forest_name: selected,
                    live_analysis: liveMode
                })
            });
            const data = await res.json();
            onDeploy(data); // Pass data back to App
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    return (
        <div className="bg-black/80 border border-cyan-500/30 p-4 rounded-lg mb-4 backdrop-blur-md pointer-events-auto">
            <h3 className="text-cyan-400 font-mono text-sm mb-2 flex items-center gap-2">
                <Map size={16} /> STRATEGIC DEPLOYMENT
            </h3>

            <div className="flex flex-col gap-2">
                <select
                    className="bg-gray-900 text-white text-sm p-2 rounded border border-gray-700 w-full focus:border-cyan-500 outline-none"
                    value={selected}
                    onChange={(e) => setSelected(e.target.value)}
                >
                    <option value="">-- Select Target Zone --</option>
                    {forests.map(f => <option key={f} value={f}>{f}</option>)}
                </select>

                <div className="flex items-center gap-2 my-1">
                    <button
                        onClick={() => setLiveMode(!liveMode)}
                        className={`flex-1 text-[10px] py-1 px-2 rounded border flex items-center justify-center gap-1 transition-all ${liveMode ? 'bg-purple-900/50 border-purple-500 text-purple-300' : 'bg-gray-900 border-gray-700 text-gray-500'}`}
                    >
                        <Satellite size={10} /> {liveMode ? "LIVE SATELLITE ON" : "PRE-COMPUTED MODE"}
                    </button>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Or Search Custom..."
                        className="flex-1 bg-gray-900 text-white text-sm p-2 rounded border border-gray-700 focus:border-cyan-500 outline-none"
                        onChange={(e) => setSelected(e.target.value)}
                    />
                    <button
                        onClick={handleDeploy}
                        disabled={loading || !selected}
                        className={`font-bold text-xs px-4 rounded uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed ${liveMode ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-cyan-600 hover:bg-cyan-500 text-black'}`}
                    >
                        {loading ? (liveMode ? "SCANNING..." : "LOADING...") : "DEPLOY"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export const StatsPanel = ({ stats }: { stats: any }) => {
    if (!stats) return null;

    // Calculate "Competitor Cost" to show savings
    // Competitors use Satellite Phones ($800/unit) or Grid (4x more sensors)
    const competitor_cost = (stats.sensors * 4 * 35) + (stats.relays * 800);
    const savings = competitor_cost - stats.cost;

    return (
        <div className="grid grid-cols-2 gap-2 mt-4 animate-in fade-in slide-in-from-bottom-4 pointer-events-auto">
            {/* CORE METRICS */}
            <div className="bg-gray-900/80 p-3 rounded border-l-2 border-red-500">
                <div className="text-[10px] text-gray-400 uppercase">Risk Sensors</div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                    <ShieldCheck size={14} /> {stats.sensors}
                </div>
                <div className="text-[9px] text-gray-500">Placed on Entry Routes</div>
            </div>

            <div className="bg-gray-900/80 p-3 rounded border-l-2 border-cyan-500">
                <div className="text-[10px] text-gray-400 uppercase">Topo-Relays</div>
                <div className="text-xl font-bold text-white flex items-center gap-2">
                    <Signal size={14} /> {stats.relays}
                </div>
                <div className="text-[9px] text-gray-500">Placed on Ridges</div>
            </div>

            {/* FINANCIAL IMPACT (The Winning Logic) */}
            <div className="col-span-2 bg-gray-800/50 p-3 rounded border border-green-900/50">
                <div className="flex justify-between items-center mb-1">
                    <div className="text-[10px] text-gray-400 uppercase">Deployment Cost</div>
                    <div className="text-xl font-mono text-yellow-400">${stats.cost.toLocaleString()}</div>
                </div>

                <div className="w-full bg-gray-700 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-green-500 h-full w-[30%]"></div>
                </div>

                <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] text-gray-500">Competitor Est: ${competitor_cost.toLocaleString()}</span>
                    <span className="text-xs font-bold text-green-400">SAVINGS: ${savings.toLocaleString()}</span>
                </div>
            </div>

            {/* TERRAIN CONTEXT */}
            <div className="col-span-2 text-[10px] text-gray-600 text-center font-mono">
                TERRAIN FACTOR: {stats.terrain_factor || 1.0} | SOURCE: {stats.source || "PRE_COMPUTED"}
            </div>
        </div>
    );
};

export default ForestSelector;
