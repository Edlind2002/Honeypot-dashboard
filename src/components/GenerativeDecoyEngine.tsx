import React, { useState } from 'react';
import { 
  BrainCircuit, Sparkles, Terminal, Check, Copy, FileCode, FolderClosed,
  ShieldAlert, RefreshCw, Sliders, Info, Cpu, CheckCircle
} from 'lucide-react';

interface DecoyData {
  tree: string;
  script: string;
  canary: string;
  expl: string;
  method: string;
}

interface DecoyEngineProps {
  persona: string;
  setPersona: (persona: string) => void;
}

export default function GenerativeDecoyEngine({ persona, setPersona }: DecoyEngineProps) {
  // Config States
  const [poisonDegree, setPoisonDegree] = useState<string>("Standard canary traps");
  const [generateLlm, setGenerateLlm] = useState<boolean>(true);
  const [treeDepth, setTreeDepth] = useState<string>("Standard (6-10 modular files)");

  // Generation status and response states
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progressMsg, setProgressMsg] = useState<string>("");
  const [decoyResult, setDecoyResult] = useState<{
    success: boolean;
    isLlmGenerated: boolean;
    apiKeyMissing: boolean;
    decoyMethod: string;
    data: DecoyData;
  } | null>(null);

  // Copied indicator state
  const [copiedKey, setCopiedKey] = useState<'tree' | 'script' | null>(null);

  // Quick Preset Options
  const presets = [
    { label: "🏦 Finance DB Oracle", val: "Oracle Financial Transaction Database Server" },
    { label: "🌐 Legacy PHP Apache Server", val: "Outdated Apache Web Host with Legacy Admin Index" },
    { label: "🔑 Identity Provider (IdP)", val: "ADFS & Active Directory Single Sign-On Server" },
    { label: "☸️ Kubernetes Control Plane", val: "Kubernetes Master API Server with Exposed ETCD Ports" }
  ];

  const handleCopyText = (text: string, key: 'tree' | 'script') => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1805);
  };

  const executeGeneration = async () => {
    setIsLoading(true);
    setDecoyResult(null);

    // Simulate real progressive terminal logs for high-fidelity security feedback
    const processSteps = [
      "Contacting honeypot hypervisor agent dispatch...",
      "Setting decoy persona: '" + persona + "'...",
      "Analyzing neural boundary defensive matrix...",
      generateLlm ? "Initializing Gemini 3.5 LLM Content Synthesizer..." : "Bootstrapping procedurally-templated heuristic parser...",
      "Injecting randomized canary webhook endpoints...",
      "Compiling poisoned bash trap payload scripts...",
      "Finalizing file tree layout schemas..."
    ];

    for (let i = 0; i < processSteps.length; i++) {
      setProgressMsg(processSteps[i]);
      // small variable delay for dramatic visual rhythm
      await new Promise(resolve => setTimeout(resolve, 380 + Math.random() * 200));
    }

    try {
      const response = await fetch('/api/generate-decoy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          persona,
          poisonDegree,
          generateLlm
        })
      });

      const data = await response.json();
      setDecoyResult(data);
    } catch (err) {
      console.error("Error generating decoys:", err);
      // Construct a client-side panic fallback just in case the network fails completely
      setDecoyResult({
        success: false,
        isLlmGenerated: false,
        apiKeyMissing: true,
        decoyMethod: "Client-Side Safe Fallback Engine",
        data: {
          tree: `├── opt/
│   └── secure_node/
│       ├── system_config.backup (DECOY CANARY)
│       └── monitor_agent.sh`,
          script: `#!/bin/bash\n# Safe backup script fallback\necho "Canary check active."\nif [ -f "/opt/secure_node/system_config.backup" ]; then\n  curl -s -X POST -d "threat=intruder" http://127.0.0.1:3000/api/rl-action\nfi`,
          canary: "Reading /opt/secure_node/system_config.backup",
          expl: "Critical client fallback deployed due to transmission timeout. Standard sandboxing procedures remain functional.",
          method: "Procedural Static Safety Module"
        }
      });
    } finally {
      setIsLoading(false);
      setProgressMsg("");
    }
  };

  return (
    <div id="generative-decoy-container" className="p-4 bg-[#020704] border border-[#065f46] rounded-xl shadow-[0_0_15px_rgba(16,185,129,0.08)] space-y-4">
      
      {/* Header Block */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-emerald-950 pb-3 gap-2 select-none">
        <div>
          <h2 className="text-xs sm:text-sm font-bold uppercase text-[#10b981] tracking-wider flex items-center gap-2">
            <BrainCircuit className="w-4 h-4 text-[#10b981] animate-pulse" />
            Generative Decoy Engine (Active Configurator)
          </h2>
          <p className="text-[10px] text-emerald-600 font-sans mt-0.5">
            Dynamically synthesize custom administrative file hierarchies and poisoned bash traps tailored to arbitrary server persona models.
          </p>
        </div>
        <span className="text-[8px] bg-[#1e1b4b]/50 text-purple-300 font-mono px-2 py-0.5 rounded border border-purple-950">
          HEURISTIC_GEN_V3
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Configurations Column (Spans 5 of 12) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Main Config Form Area */}
          <div className="p-4 bg-[#010905]/75 border border-[#064e3b]/80 rounded-lg space-y-3.5 shadow-inner">
            
            <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] uppercase tracking-wider font-bold">
              <Sliders className="w-3.5 h-3.5" />
              <span>Synthesis Controller Settings</span>
            </div>

            {/* Toggle Switch */}
            <div className="flex items-center justify-between p-2.5 bg-slate-950/80 border border-emerald-950 rounded-lg">
              <div className="flex flex-col pr-2">
                <span className="text-[11px] font-bold text-slate-200">Enable Gemini LLM content generation</span>
                <span className="text-[9px] text-emerald-600">Queries intelligent models on backend servers. Disable to enforce procedural code fallbacks.</span>
              </div>
              <button
                type="button"
                onClick={() => setGenerateLlm(!generateLlm)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-all duration-300 ease-in-out outline-none select-none items-center ${
                  generateLlm ? 'bg-[#10b981]' : 'bg-zinc-800'
                }`}
                title="Toggle dynamic intelligent text payload delivery"
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow ring-0 transition duration-300 ease-in-out ${
                    generateLlm ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Input Persona */}
            <div className="space-y-1">
              <label className="text-[9.5px] text-emerald-500 font-bold block uppercase tracking-wider">
                Target Node System Persona:
              </label>
              <input 
                type="text"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
                placeholder="e.g. PCI-DSS Payment Processing Node"
                className="w-full bg-slate-950 border border-emerald-950 text-slate-100 placeholder-emerald-800 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#10b981] transition-all font-mono shadow-inner"
              />
            </div>

            {/* Quick Presets list */}
            <div className="space-y-1">
              <span className="text-[8.5px] text-emerald-600 uppercase font-mono tracking-wider block">Quick Presets:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => setPersona(preset.val)}
                    className={`p-1 rounded text-[9.5px] border font-sans text-left transition-all truncate cursor-pointer ${
                      persona === preset.val
                        ? "bg-emerald-950/70 border-[#10b981] text-emerald-300"
                        : "bg-slate-950/40 border-emerald-950/60 text-emerald-600 hover:border-emerald-700 hover:text-emerald-400"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Severity Parameter Option */}
            <div className="space-y-1">
              <label className="text-[9.5px] text-emerald-500 font-bold block uppercase tracking-wider">
                Canary Poison level Severity:
              </label>
              <select
                value={poisonDegree}
                onChange={(e) => setPoisonDegree(e.target.value)}
                className="w-full bg-slate-950 border border-emerald-950 text-slate-200 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#10b981] transition-all font-sans cursor-pointer focus:bg-slate-950"
              >
                <option value="Standard canary traps">Standard canary traps (Silent URL Webhooks)</option>
                <option value="High-entropy credential traps">High-entropy credential traps (Seeded Fake DB tokens)</option>
                <option value="Deliberate SSH boundary padding anomalies">Deliberate boundary anomalies (Tarpit slow read blockages)</option>
              </select>
            </div>

            {/* Visual configuration layout only - File tree depth mapping */}
            <div className="space-y-1">
              <label className="text-[9.5px] text-emerald-500 font-bold block uppercase tracking-wider font-sans">
                Dynamic Decoy tree depth parameters:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {["Compact (3-5 items)", "Standard (6-10 modular)", "Deep Enterprise (12+ assets)"].map((depth) => (
                  <button
                    key={depth}
                    onClick={() => setTreeDepth(depth)}
                    className={`py-1 text-center text-[9px] border rounded transition-all cursor-pointer font-sans truncate ${
                      treeDepth === depth
                        ? "bg-emerald-950/60 border-[#10b981] text-emerald-300 font-bold"
                        : "bg-slate-950/50 border-emerald-950/40 text-emerald-700 hover:text-[#10b981]"
                    }`}
                  >
                    {depth.split(" ")[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Trigger Button */}
            <button
              onClick={executeGeneration}
              disabled={isLoading}
              className={`w-full py-2.5 rounded-lg border font-bold font-mono tracking-wider text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                isLoading 
                  ? 'bg-emerald-950/40 border-emerald-950 text-emerald-600 cursor-not-allowed'
                  : 'bg-[#10b981] border-[#10b981] text-slate-950 hover:bg-emerald-400 hover:border-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
              }`}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing Payload...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>On-The-Fly Generate Decoys</span>
                </>
              )}
            </button>

          </div>

          {/* Theoretical Security context informational tip card */}
          <div className="p-3 bg-[#0c0d16]/30 border border-blue-950/60 rounded-lg space-y-1 text-slate-400 text-[10px] leading-relaxed relative overflow-hidden select-none">
            <div className="absolute right-1.5 top-1.5 opacity-20">
              <Info className="w-8 h-8 text-blue-400" />
            </div>
            <span className="block text-blue-400 font-bold font-mono text-[9px] uppercase tracking-wider flex items-center gap-1">
              <Info className="w-3 h-3 text-blue-400" />
              Intelligence Note (SSH Deception Tactics)
            </span>
            <p className="font-sans pr-4">
              Providing realistic directories layout targets diverts unauthorized scanners away from physical root databases, trapping malicious automated processes inside a high-fidelity diagnostic network container.
            </p>
          </div>

        </div>

        {/* Results Column (Spans 7 of 12) */}
        <div className="lg:col-span-7 flex flex-col justify-between p-4 bg-slate-950 border border-emerald-950 rounded-lg min-h-[420px]">
          
          {isLoading ? (
            /* Loading Simulator States Display */
            <div className="flex-1 flex flex-col items-center justify-center space-y-4 py-8">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <RefreshCw className="w-12 h-12 text-[#10b981] animate-spin opacity-80" />
                <Cpu className="absolute w-5 h-5 text-emerald-300 animate-pulse" />
              </div>
              
              <div className="text-center space-y-1.5 max-w-sm">
                <span className="block text-[10px] uppercase tracking-widest text-[#10b981] font-bold font-mono animate-pulse">
                  ALIVE SIMULATOR INTERFACING...
                </span>
                <p className="font-mono text-[10px] text-emerald-500 bg-[#0d2113]/30 border border-emerald-950 py-1.5 px-3 rounded text-center">
                  ➔ {progressMsg}
                </p>
                <span className="text-[8.5px] italic text-emerald-700 font-sans block">
                  Synchronizing state nodes against threat model algorithms ...
                </span>
              </div>
            </div>
          ) : decoyResult ? (
            /* Compiled / Generated Output Display */
            <div className="flex-1 space-y-4 animate-fade-in flex flex-col justify-between">
              
              {/* Output Meta header card */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3.5 bg-[#030e06] border border-[#064e3b]/80 rounded-lg">
                  <div>
                    <span className="block text-[8px] uppercase tracking-widest text-emerald-500 font-mono font-bold">Generation Protocol deployed</span>
                    <h4 className="text-[12px] text-slate-200 mt-0.5 font-bold font-sans flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4 text-[#10b981]" />
                      Compiled Decoy Asset: Model Success
                    </h4>
                    <p className="text-[9.5px] text-emerald-600 tracking-tight font-sans">
                      Method: <strong className="text-emerald-400 font-mono font-sans">{decoyResult.decoyMethod}</strong>
                    </p>
                  </div>
                  
                  {decoyResult.apiKeyMissing && (
                    <span className="text-[8.5px] text-amber-300 bg-amber-950/40 border border-amber-900 px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                      ★ PROCEDURAL FALLBACK
                    </span>
                  )}
                </div>

                {/* API Key Missing warning alert */}
                {decoyResult.apiKeyMissing && (
                  <div className="p-2.5 bg-amber-950/20 border border-amber-900/60 rounded text-[9.5px] text-amber-200 leading-normal flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold">No Gemini API Key Detected in App Settings:</strong> Ensure your <code className="bg-slate-900 border border-slate-850 px-1 py-0.1 select-all font-mono">GEMINI_API_KEY</code> variable is provisioned under the AI Studio workspace <strong>Settings &gt; Secrets</strong> pane. Active fallback procedures compiled appropriate content representation safely.
                    </div>
                  </div>
                )}
              </div>

              {/* TWO PANEL SPLIT: directory tree (top) script (bottom) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 flex-1 min-h-[240px]">
                
                {/* 1. Directory Tree Box (Spans 5 of 12) */}
                <div className="md:col-span-5 flex flex-col justify-between bg-[#040805] border border-emerald-950/60 rounded p-2.5">
                  <div className="flex justify-between items-center border-b border-emerald-950/40 pb-1 mb-2">
                    <span className="text-[8px] uppercase tracking-wide text-emerald-500 font-mono font-bold">
                      1. File Tree Layout (s_t)
                    </span>
                    <button 
                      onClick={() => handleCopyText(decoyResult.data.tree, 'tree')}
                      className="text-emerald-700 hover:text-[#10b981] p-0.5"
                      title="Copy Directory tree ascii"
                    >
                      {copiedKey === 'tree' ? (
                        <Check className="w-3.5 h-3.5 text-[#10b981]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <pre className="flex-1 font-mono text-[9px] text-emerald-300 leading-normal overflow-auto whitespace-pre h-[115px] p-1 select-text scrollbar-thin scrollbar-thumb-emerald-950 scrollbar-track-transparent">
                    {decoyResult.data.tree}
                  </pre>
                  
                  <span className="block text-[8px] text-emerald-650 font-mono border-t border-emerald-950/30 pt-1 mt-1 shrink-0">
                    Seeded decoy paths layout.
                  </span>
                </div>

                {/* 2. Bash Script Box (Spans 7 of 12) */}
                <div className="md:col-span-7 flex flex-col justify-between bg-[#040805] border border-emerald-950/60 rounded p-2.5">
                  <div className="flex justify-between items-center border-b border-emerald-950/40 pb-1 mb-2">
                    <span className="text-[8px] uppercase tracking-wide text-emerald-500 font-mono font-bold flex items-center gap-1">
                      <FileCode className="w-3 h-3" />
                      2. Active Poisoned Bash Canary
                    </span>
                    <button 
                      onClick={() => handleCopyText(decoyResult.data.script, 'script')}
                      className="text-emerald-700 hover:text-[#10b981] p-0.5"
                      title="Copy script code"
                    >
                      {copiedKey === 'script' ? (
                        <Check className="w-3.5 h-3.5 text-[#10b981]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <pre className="flex-1 font-mono text-[8.5px] text-emerald-200 leading-relaxed overflow-x-auto overflow-y-auto whitespace-pre h-[115px] p-1 select-text scrollbar-thin scrollbar-thumb-emerald-950 scrollbar-track-transparent bg-slate-950/40">
                    {decoyResult.data.script}
                  </pre>
                  
                  <span className="block text-[8px] text-purple-400 font-sans border-t border-emerald-950/30 pt-1 mt-1 shrink-0 font-bold">
                    ⚠️ ALERT BOUNDARY INJECTED CRITICAL WEBHOOKS
                  </span>
                </div>

              </div>

              {/* Canary Diagnostics Footer Block */}
              <div className="p-3 bg-slate-950 border border-emerald-950 rounded-lg space-y-1 mt-auto">
                <span className="block text-[8.5px] font-mono text-amber-500 font-extrabold uppercase tracking-wide">
                  ⚡ Detected active telemetry sensor trigger event:
                </span>
                <p className="text-[10px] text-slate-300 bg-slate-950/50 p-1.5 rounded font-mono italic">
                  "{decoyResult.data.canary}"
                </p>
                <div className="text-[9px] text-[#22c55e]/70 font-sans pt-1">
                  <strong>Strategic Deception Intel Rationale:</strong> {decoyResult.data.expl}
                </div>
              </div>

            </div>
          ) : (
            /* Intact Default Empty-State Screen */
            <div className="flex-grow flex flex-col items-center justify-center text-center p-8 select-none">
              <FolderClosed className="w-14 h-14 text-emerald-950 animate-bounce mb-3" />
              <h3 className="text-slate-400 text-xs uppercase tracking-wider font-extrabold font-sans">
                No active generated payloads
              </h3>
              <p className="text-[10px] text-emerald-700 font-sans max-w-sm mt-1 leading-normal">
                Erect a custom persona model in the parameters dispatcher on the left and click "On-The-Fly Generate Decoys" to execute real-time simulation synthesis.
              </p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
