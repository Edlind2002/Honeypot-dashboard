import React, { useState, useEffect, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend, AreaChart, Area 
} from 'recharts';
import { 
  Play, Pause, RotateCcw, Flame, Target, 
  Settings, Terminal, HelpCircle, Activity, Award, Sliders
} from 'lucide-react';

// --- Dynamic Mock Data Generator ---
// Simulates a PPO agent learning converges over 100 epochs
const generateDiagnosticsDataset = (): DiagnosticDataPoint[] => {
  const data: DiagnosticDataPoint[] = [];
  for (let i = 1; i <= 100; i++) {
    const progress = i / 100;
    
    // Reward curve starts negative (failure) and converges to high positive (expert trapping)
    const baseReward = -40 + 220 * (1 - Math.exp(-i / 22));
    const noiseReward = (Math.sin(i * 0.45) * 12 + Math.cos(i * 1.1) * 6) * (1 - 0.6 * progress);
    const reward = Math.round((baseReward + noiseReward) * 10) / 10;

    // Policy Loss: starts at ~0.25, oscillates, converges to small stable values
    const basePolicy = 0.28 * Math.exp(-i / 35) + 0.012;
    const noisePolicy = (Math.sin(i * 0.9) * 0.03 + Math.cos(i * 1.9) * 0.015) * (1 - 0.75 * progress);
    const policyLoss = Math.round(Math.max(0.001, basePolicy + noisePolicy) * 1000) / 1000;

    // Value (critic) Loss: starts highly unstable (~1.4), decays down to low residual prediction error
    const baseValue = 1.15 * Math.exp(-i / 26) + 0.045;
    const noiseValue = (Math.sin(i * 1.05) * 0.12 + Math.cos(i * 2.2) * 0.06) * Math.exp(-i / 40);
    const valueLoss = Math.round(Math.max(0.005, baseValue + noiseValue) * 1000) / 1000;

    data.push({
      epoch: i,
      reward,
      policyLoss,
      valueLoss,
    });
  }
  return data;
};

export interface DiagnosticDataPoint {
  epoch: number;
  reward: number;
  policyLoss: number;
  valueLoss: number;
}

export default function RLModelDiagnostics() {
  const completeDataset = useRef<DiagnosticDataPoint[]>(generateDiagnosticsDataset());
  const [currentEpochCount, setCurrentEpochCount] = useState<number>(100);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(100); // ms per epoch step
  const [simLogs, setSimLogs] = useState<string[]>([]);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Active hover point for unified metrics overlay
  const [activeDataPoint, setActiveDataPoint] = useState<DiagnosticDataPoint | null>(null);

  // Handle live simulation iterations
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isSimulating) {
      timer = setInterval(() => {
        setCurrentEpochCount(prev => {
          if (prev >= 100) {
            setIsSimulating(false);
            if (timer) clearInterval(timer);
            return 100;
          }
          const nextVal = prev + 1;
          
          // Generate a log entry for this epoch iteration
          const pt = completeDataset.current[nextVal - 1];
          if (pt) {
            const statusMessage = nextVal > 75 
              ? "STABILIZED" 
              : nextVal > 40 
                ? "CONVERGING" 
                : "DIVERGENT_EXPLORE";
            
            const logLine = `[EPOCH ${String(pt.epoch).padStart(3, '0')}] GAE Reward: ${pt.reward.toFixed(1).padStart(5, ' ')} | Policy_Loss: ${pt.policyLoss.toFixed(3)} | Critic_Loss: ${pt.valueLoss.toFixed(3)} | Status: ${statusMessage}`;
            setSimLogs(prevLogs => [...prevLogs.slice(-40), logLine]);
          }
          return nextVal;
        });
      }, simSpeed);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isSimulating, simSpeed]);

  // Scroll logs automatically
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [simLogs]);

  const startSimulation = () => {
    if (currentEpochCount >= 100) {
      setCurrentEpochCount(1);
      setSimLogs(["[PPO INTRUSION MONITOR] Initializing Neural Network...", "[MODEL] Spawning parameters on device CUDA:0", "[RL] Exploring policy space with high entropy parameter scaling..."]);
    }
    setIsSimulating(true);
  };

  const pauseSimulation = () => {
    setIsSimulating(false);
  };

  const resetDiagnostics = () => {
    setIsSimulating(false);
    setCurrentEpochCount(100);
    setSimLogs([]);
  };

  // Slice complete dataset to match current simulation progression
  const activePlotData = completeDataset.current.slice(0, currentEpochCount);
  const activeMetrics = completeDataset.current[currentEpochCount - 1] || completeDataset.current[99];

  return (
    <div id="rl-diagnostics-container" className="p-4 bg-[#020704] border border-[#065f46] rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.08)] space-y-4">
      
      {/* Dynamic Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-emerald-950 pb-3 gap-2 select-none">
        <div>
          <h2 className="text-xs sm:text-sm font-bold uppercase text-[#10b981] tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#10b981] animate-pulse" />
            RL Model Diagnostics (final_model)
          </h2>
          <p className="text-[10px] text-emerald-600 font-sans mt-0.5">
            Real-time policy learning analytics and critic-loss telemetry over 100 PPO epochs.
          </p>
        </div>

        {/* Diagnostic Simulator Controller Buttons */}
        <div className="flex items-center gap-2 text-xs">
          {isSimulating ? (
            <button
              onClick={pauseSimulation}
              className="py-1 px-2.5 rounded border border-yellow-700 bg-yellow-950/20 text-yellow-400 hover:bg-yellow-950/40 transition-colors flex items-center gap-1.5 font-sans"
              title="Pause Simulated Hypernetwork Training"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Pause</span>
            </button>
          ) : (
            <button
              onClick={startSimulation}
              className="py-1 px-2.5 rounded border border-[#10b981] bg-emerald-950/60 text-emerald-300 hover:bg-[#10b981] hover:text-slate-950 font-bold transition-all duration-200 flex items-center gap-1.5 font-sans cursor-pointer shadow-[0_0_8px_rgba(16,185,129,0.15)]"
              title="Trigger Simulated Learning Sequence"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{currentEpochCount >= 100 ? "Simulate Training" : "Resume"}</span>
            </button>
          )}

          <button
            onClick={resetDiagnostics}
            className="py-1 p-1.5 rounded border border-emerald-950 bg-slate-950/80 text-emerald-600 hover:text-emerald-400 font-sans cursor-pointer"
            title="Reset training to Epoch 100 (Full convergence)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Rate Controller */}
          <select
            value={simSpeed}
            onChange={(e) => setSimSpeed(Number(e.target.value))}
            className="bg-slate-950 border border-emerald-950 text-emerald-400 text-[10px] px-1.5 py-1 rounded outline-none font-sans cursor-pointer focus:border-[#10b981]"
            title="Simulation speed multiplier"
          >
            <option value={200}>Speed: 0.5x</option>
            <option value={100}>Speed: 1.0x</option>
            <option value={40}>Speed: 2.5x</option>
            <option value={15}>Speed: 6.0x</option>
          </select>
        </div>
      </div>

      {/* Grid containing policy status blocks and hyperparameters */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5">
        
        {/* Core Hyperparameters & Metrics (Spans 4/12 columns) */}
        <div className="sm:col-span-4 space-y-3.5 flex flex-col justify-between">
          
          {/* Active Model Training Status Card */}
          <div className="p-3 bg-slate-950/30 border border-emerald-950/80 rounded-lg shadow-inner select-none flex-1 flex flex-col justify-between">
            <div>
              <span className="block text-[8px] uppercase tracking-widest text-emerald-600 font-bold font-sans">training progression state</span>
              
              <div className="flex items-baseline justify-between mt-1">
                <span className="text-xl font-mono font-extrabold text-emerald-300">
                  Epoch {currentEpochCount} <span className="text-emerald-800 text-xs">/ 100</span>
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-full border font-bold font-mono tracking-wider ${
                  currentEpochCount >= 90
                    ? 'bg-emerald-950/65 text-[#10b981] border-emerald-700 shadow-[0_0_8px_rgba(16,185,129,0.15)]'
                    : currentEpochCount >= 40
                      ? 'bg-yellow-950/50 text-yellow-400 border-yellow-800'
                      : 'bg-rose-955/40 text-rose-300 border-rose-800'
                }`}>
                  {currentEpochCount >= 90 ? "CONVERGED ✓" : currentEpochCount >= 40 ? "TUNING..." : "EXPLORATIVE ⬡"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5 pt-3.5 border-t border-emerald-950/40">
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-850 font-sans">Final-weight Reward Index:</span>
                <span className="font-mono font-extrabold text-[#10b981]">
                  {activeMetrics ? `${activeMetrics.reward >= 0 ? "+" : ""}${activeMetrics.reward.toFixed(1)}` : "+0.0"}
                </span>
              </div>
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-emerald-850 font-sans">Active Critic prediction loss:</span>
                <span className="font-mono text-emerald-300">{activeMetrics ? activeMetrics.valueLoss.toFixed(3) : "0.000"}</span>
              </div>
            </div>
          </div>

          {/* Static Hyperparameters modeled on the State Vector Analysis UI */}
          <div className="p-3 bg-[#010c05]/60 border border-[#065f46]/45 rounded-lg space-y-2 select-none">
            <span className="block text-[8.5px] uppercase tracking-wider text-[#10b981] font-bold font-mono flex items-center gap-1">
              <Settings className="w-3.5 h-3.5 text-[#10b981]" />
              PPO Model Hyperparameters
            </span>
            
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[10px]">
              <div className="p-1 px-2 bg-slate-950/80 border border-emerald-950 rounded flex justify-between">
                <span className="text-emerald-800 font-sans">λ GAE</span>
                <span className="text-emerald-400 font-bold">0.95</span>
              </div>
              <div className="p-1 px-2 bg-slate-950/80 border border-emerald-950 rounded flex justify-between">
                <span className="text-emerald-800 font-sans">γ Discount</span>
                <span className="text-emerald-400 font-bold">0.99</span>
              </div>
              <div className="p-1 px-2 bg-slate-950/80 border border-emerald-950 rounded flex justify-between">
                <span className="text-emerald-800 font-sans">Clip Range</span>
                <span className="text-emerald-400 font-bold">0.20</span>
              </div>
              <div className="p-1 px-2 bg-slate-950/80 border border-emerald-950 rounded flex justify-between">
                <span className="text-emerald-800 font-sans">Learn Rate</span>
                <span className="text-emerald-400 font-bold text-[9px]">3.0e-4</span>
              </div>
              <div className="p-1 px-2 bg-slate-950/80 border border-emerald-950 rounded flex justify-between col-span-2">
                <span className="text-emerald-800 font-sans">Actor/Critic Ratio</span>
                <span className="text-emerald-400 font-bold">0.5 / 1.0</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic System Output Monitor Logs (Spans 8/12 columns) */}
        <div className="sm:col-span-8 flex flex-col justify-between p-3.5 bg-slate-950 border border-emerald-950 rounded-lg">
          <div className="flex justify-between items-center border-b border-emerald-950 pb-1.5 select-none shrink-0 mb-2">
            <span className="text-[9px] uppercase font-bold text-emerald-500 font-mono flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#10b981]" />
              Hyper-Layer Training Execution Console
            </span>
            <span className="text-[8px] px-1.5 rounded-sm bg-emerald-950/30 border border-emerald-900 text-emerald-400 font-mono">
              STDOUT:CUDA_0
            </span>
          </div>

          <div 
            ref={logContainerRef}
            className="h-[105px] overflow-y-auto font-mono text-[9px] text-[#22c55e]/90 leading-relaxed space-y-1.5 scrollbar-thin scrollbar-thumb-emerald-950 scrollbar-track-transparent select-text"
          >
            {simLogs.length > 0 ? (
              simLogs.map((logLine, idx) => (
                <div key={idx} className="whitespace-pre-wrap font-mono uppercase tracking-tight">
                  <span className="text-emerald-800 mr-1 opacity-70">➔</span>
                  {logLine}
                </div>
              ))
            ) : (
              <div className="text-emerald-800 italic h-full flex items-center justify-center font-sans tracking-tight text-center">
                Click "Simulate Training" above to initialize deep policy iteration telemetry feed logs.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Charts Grid Row Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        
        {/* Chart 1: Cumulative Episode Reward Line Chart */}
        <div className="p-3 bg-slate-950/40 border border-emerald-950 rounded-lg flex flex-col justify-between">
          <div className="mb-2 select-none flex justify-between items-center border-b border-emerald-950/40 pb-1.5">
            <div>
              <span className="block text-[8.5px] uppercase tracking-wider text-emerald-600 font-bold font-sans">Metric Curve 01</span>
              <h3 className="text-emerald-200 font-bold text-xs flex items-center gap-1.5 font-sans">
                <Award className="w-3.5 h-3.5 text-[#10b981]" />
                Cumulative Episode Reward (Average R_t)
              </h3>
            </div>
            
            <div className="text-right">
              <span className="text-[8px] text-emerald-700 font-mono uppercase block">CURRENT VALUE</span>
              <span className="font-mono text-[10px] text-emerald-300 font-extrabold bg-[#0d2a17]/20 border border-emerald-950 px-1.5 py-0.2 rounded">
                {activeMetrics ? activeMetrics.reward.toFixed(1) : "-"}
              </span>
            </div>
          </div>

          <div className="h-[140px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={activePlotData}
                onMouseMove={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setActiveDataPoint(e.activePayload[0].payload as DiagnosticDataPoint);
                  }
                }}
                onMouseLeave={() => setActiveDataPoint(null)}
              >
                <defs>
                  <linearGradient id="rewardGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#052e16" vertical={false} />
                <XAxis 
                  dataKey="epoch" 
                  stroke="#065f46" 
                  fontSize={8} 
                  tickLine={false}
                  label={{ value: 'PPO EPOCH', position: 'insideBottom', offset: -5, fill: '#059669', fontSize: 8, fontWeight: 'bold' }}
                />
                <YAxis 
                  stroke="#065f46" 
                  fontSize={8} 
                  tickLine={false} 
                  domain={[-60, 200]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#059669', fontSize: 10, color: '#e2e8f0', fontFamily: 'monospace' }}
                  cursor={{ stroke: '#10b981', strokeWidth: 1 }}
                />
                <Area 
                  type="monotone" 
                  dataKey="reward" 
                  stroke="#10b981" 
                  strokeWidth={1.8}
                  fillOpacity={1}
                  fill="url(#rewardGradient)"
                  isAnimationActive={false}
                  name="Episode Reward"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          
          <p className="text-[8.5px] text-emerald-700 font-sans mt-2 italic">
            Rising episodes mean state vectors s_t are correctly guiding optimal spoof allocations to tarpit scanner vectors.
          </p>
        </div>

        {/* Chart 2: Policy & Value Loss Dual-Line Chart */}
        <div className="p-3 bg-slate-950/40 border border-emerald-950 rounded-lg flex flex-col justify-between">
          <div className="mb-2 select-none flex justify-between items-center border-b border-emerald-950/40 pb-1.5 font-sans">
            <div>
              <span className="block text-[8.5px] uppercase tracking-wider text-emerald-600 font-bold font-sans">Metric Curve 02</span>
              <h3 className="text-emerald-200 font-bold text-xs flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                Actor-Critic Loss (π_θ Loss & V_φ Value error)
              </h3>
            </div>

            <div className="flex gap-2">
              <div className="text-right">
                <span className="text-[7.5px] text-emerald-700 font-mono uppercase block">POLICY</span>
                <span className="font-mono text-[9.5px] text-emerald-300 font-bold bg-[#0d2a17]/25 px-1 rounded border border-emerald-950">
                  {activeMetrics ? activeMetrics.policyLoss.toFixed(3) : "-"}
                </span>
              </div>
              <div className="text-right border-l border-emerald-950/60 pl-2">
                <span className="text-[7.5px] text-purple-700 font-mono uppercase block">CRITIC</span>
                <span className="font-mono text-[9.5px] text-purple-450 font-bold bg-[#1e1b4b]/20 px-1 rounded border border-purple-950">
                  {activeMetrics ? activeMetrics.valueLoss.toFixed(3) : "-"}
                </span>
              </div>
            </div>
          </div>

          <div className="h-[140px] w-full relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart 
                data={activePlotData}
                onMouseMove={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    setActiveDataPoint(e.activePayload[0].payload as DiagnosticDataPoint);
                  }
                }}
                onMouseLeave={() => setActiveDataPoint(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#110e2d" vertical={false} />
                <XAxis 
                  dataKey="epoch" 
                  stroke="#065f46" 
                  fontSize={8} 
                  tickLine={false}
                  label={{ value: 'PPO EPOCH', position: 'insideBottom', offset: -5, fill: '#059669', fontSize: 8, fontWeight: 'bold' }}
                />
                <YAxis 
                  stroke="#065f46" 
                  fontSize={8} 
                  tickLine={false}
                  domain={[0, 1.4]}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#4c1d95', fontSize: 10, color: '#e2e8f0', fontFamily: 'monospace' }}
                  cursor={{ stroke: '#a78bfa', strokeWidth: 1 }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={15} 
                  iconSize={8}
                  iconType="circle"
                  wrapperStyle={{ fontSize: 8, fontFamily: 'monospace', color: '#64748b' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="policyLoss" 
                  stroke="#10b981" 
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name="Actor (Policy) Loss"
                />
                <Line 
                  type="monotone" 
                  dataKey="valueLoss" 
                  stroke="#c084fc" 
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                  name="Critic (Value) Loss"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-[8.5px] text-emerald-700 font-sans mt-2 italic">
            Actor loss should steadily baseline around clipping boundaries, while standard critic MSE loss trends to zero value, ensuring correct defense scoring.
          </p>
        </div>

      </div>

      {/* Unified Tooltip data indicator row overlay */}
      {activeDataPoint && (
        <div className="bg-[#020503] border border-emerald-950/80 rounded p-2 text-[9px] font-mono p-2 select-none flex justify-between items-center animate-fade-in">
          <span className="text-emerald-500 font-bold uppercase">📊 Epoch {activeDataPoint.epoch} Focal Point telemetry:</span>
          <div className="flex gap-4">
            <span>Reward: <strong className="text-emerald-200">{activeDataPoint.reward.toFixed(1)}</strong></span>
            <span>Policy Loss: <strong className="text-emerald-200">{activeDataPoint.policyLoss.toFixed(3)}</strong></span>
            <span>Critic Loss: <strong className="text-purple-300">{activeDataPoint.valueLoss.toFixed(3)}</strong></span>
          </div>
        </div>
      )}

    </div>
  );
}
