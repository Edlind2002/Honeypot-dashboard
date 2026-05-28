import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Radio, Activity, Globe, Terminal, Award, HelpCircle, 
  MapPin, Clock, ArrowRight, Eye, RefreshCw, Cpu, Layers, CheckCircle, Sliders
} from 'lucide-react';

interface ThreatTTP {
  mitreId: string;
  tactic: string;
  description: string;
}

interface ThreatFeedItem {
  id: string;
  timestamp: string;
  sourceIp: string;
  country: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
  incidentType: string;
  payloadSignature: string;
  attackerTactics: string;
}

interface ThreatIntelData {
  trends: string[];
  ttps: ThreatTTP[];
  mitigations: string[];
  feed: ThreatFeedItem[];
}

interface ThreatIntelProps {
  systemPersona: string;
  setSystemPersona: (persona: string) => void;
}

export default function ThreatIntelFeed({ systemPersona, setSystemPersona }: ThreatIntelProps) {
  const [generateLlm, setGenerateLlm] = useState<boolean>(true);
  const [intelResponse, setIntelResponse] = useState<{
    success: boolean;
    isLlmGenerated: boolean;
    apiKeyMissing: boolean;
    intelMethod: string;
    data: ThreatIntelData;
  } | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'trends' | 'ttps' | 'mitigations'>('trends');

  // Interactive deployed indicators for defense mitigations
  const [deployedMitigations, setDeployedMitigations] = useState<Record<number, boolean>>({});

  // Real-time extra simulated feed telemetry list
  const [simulatedFeed, setSimulatedFeed] = useState<ThreatFeedItem[]>([]);

  // Selected preset options matching GenerativeDecoyEngine
  const presets = [
    { label: "🏦 Finance DB Oracle", val: "Oracle Financial Transaction Database Server" },
    { label: "🌐 Legacy PHP Apache Server", val: "Outdated Apache Web Host with Legacy Admin Index" },
    { label: "🔑 Identity Provider (IdP)", val: "ADFS & Active Directory Single Sign-On Server" },
    { label: "☸️ Kubernetes Control Plane", val: "Kubernetes Master API Server with Exposed ETCD Ports" }
  ];

  const fetchThreatIntel = async () => {
    setIsLoading(true);
    setSimulatedFeed([]);
    try {
      const response = await fetch('/api/threat-intel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          persona: systemPersona,
          generateLlm
        })
      });
      const data = await response.json();
      if (data.success) {
        setIntelResponse(data);
        setSimulatedFeed(data.data.feed || []);
      }
    } catch (e) {
      console.error("Failed fetching threat intelligence feed:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchThreatIntel();
  }, [systemPersona, generateLlm]);

  // Periodic simulation: Append new incident telemetry ticks in real-time
  useEffect(() => {
    if (!intelResponse) return;

    const interval = setInterval(() => {
      // Add a simulated packet tick with 35% probability
      if (Math.random() > 0.65) {
        const severities: ("CRITICAL" | "HIGH" | "MEDIUM" | "INFO")[] = ["CRITICAL", "HIGH", "MEDIUM", "INFO"];
        const chosenSeverity = severities[Math.floor(Math.random() * severities.length)];
        
        const ipPrefixes = ["185.220.", "45.132.", "103.45.", "88.99.", "193.37.", "109.201."];
        const randomIp = ipPrefixes[Math.floor(Math.random() * ipPrefixes.length)] + 
          Math.floor(Math.random() * 254) + "." + Math.floor(Math.random() * 254);
          
        const countries = ["DE", "NL", "US", "RU", "FR", "CN", "BR", "JP", "UA", "GB"];
        const randomCountry = countries[Math.floor(Math.random() * countries.length)];

        let incident = "Anomaly Scanning Event";
        let sig = "GET /admin/setup.php";
        let category = "Discovery";

        if (systemPersona.toLowerCase().includes("financial") || systemPersona.toLowerCase().includes("database")) {
          incident = "Database Query Intercept";
          sig = `SELECT * FROM payment_methods WHERE card_stored = 1; --`;
          category = "Credential Access";
        } else if (systemPersona.toLowerCase().includes("web") || systemPersona.toLowerCase().includes("legacy")) {
          incident = "Obsolete phpMyAdmin crawler";
          sig = "POST /phpmyadmin/scripts/setup.php (HTTP/1.1 200)";
          category = "Initial Intrusion Attempt";
        } else {
          incident = "Unauthorized Node Inquiry";
          sig = `./cluster_diagnostics --force-dump-session`;
          category = "Execution / Recon";
        }

        const newAlert: ThreatFeedItem = {
          id: `FI-NEW-${Math.floor(Math.random() * 10000)}`,
          timestamp: "Just now",
          sourceIp: randomIp,
          country: randomCountry,
          severity: chosenSeverity,
          incidentType: incident,
          payloadSignature: sig,
          attackerTactics: category
        };

        setSimulatedFeed(prev => [newAlert, ...prev.slice(0, 5)]);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [intelResponse, systemPersona]);

  const toggleMitigation = (idx: number) => {
    setDeployedMitigations(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  return (
    <div id="threat-intel-container" className="p-4 bg-[#020503] border border-[#0d2e1b] rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.06)] space-y-4">
      
      {/* Top Controller Segment */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-emerald-950 pb-3 gap-3">
        <div>
          <h2 className="text-xs sm:text-sm font-bold uppercase text-[#10b981] tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#10b981] animate-ping shrink-0" />
            Anonymized Threat Intelligence Feed
          </h2>
          <p className="text-[10px] text-emerald-650 font-sans mt-0.5">
            Real-time telemetry auditing attack vectors, recent campaigns, and MITRE guidelines mapped to node persona templates.
          </p>
        </div>

        {/* Sync Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[8px] bg-[#022c22] text-[#34d399] font-mono px-2 py-0.5 rounded border border-[#047857]">
            ALIGNED: "{systemPersona}"
          </span>
          <button
            onClick={() => fetchThreatIntel()}
            className="p-1.5 bg-slate-950 border border-emerald-950 text-emerald-400 rounded hover:text-[#10b981] transition-all cursor-pointer"
            title="Refresh feeds manually"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Main Grid Sector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Hand: Configurator & Context Mapping */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Persona selector & Config panel */}
          <div className="p-4 bg-[#010906]/85 border border-emerald-950/80 rounded-lg space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-emerald-500 font-mono tracking-wider font-semibold uppercase flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#10b981]" />
                Target Node Persona
              </span>
              <button
                onClick={() => setGenerateLlm(!generateLlm)}
                className={`text-[9px] px-2 py-0.5 rounded border ${
                  generateLlm 
                    ? 'bg-[#10b981]/15 border-[#10b981]/50 text-[#34d399]' 
                    : 'bg-zinc-950 border-zinc-900 text-zinc-500'
                }`}
                title="Toggle Gemini research module"
              >
                {generateLlm ? "Gemini AI: ON" : "Heuristic Fallback: ON"}
              </button>
            </div>

            {/* Selector Input */}
            <div className="space-y-1">
              <span className="text-[9.5px] uppercase text-emerald-600 block font-bold">Configure Target System Name:</span>
              <input
                type="text"
                value={systemPersona}
                onChange={(e) => setSystemPersona(e.target.value)}
                placeholder="Database server, Identity vault..."
                className="w-full bg-slate-950 border border-emerald-950 text-slate-100 placeholder-emerald-850 rounded px-2.5 py-1.5 text-xs outline-none focus:border-[#10b981] transition-all font-mono shadow-inner"
              />
            </div>

            {/* Quick alignment shortcuts */}
            <div className="space-y-1">
              <span className="text-[8.5px] text-emerald-700 uppercase block font-semibold tracking-wider font-mono">Select Preset Persona Archetype:</span>
              <div className="grid grid-cols-2 gap-1.5">
                {presets.map((preset, i) => (
                  <button
                    key={i}
                    onClick={() => setSystemPersona(preset.val)}
                    className={`p-1.5 rounded text-[9px] text-left truncate transition-all border cursor-pointer ${
                      systemPersona === preset.val
                        ? "bg-emerald-950/80 border-[#10b981] text-emerald-300 font-bold"
                        : "bg-slate-950/40 border-emerald-950/50 text-emerald-600 hover:text-emerald-400 hover:border-emerald-800"
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Intelligence Summary Tabs (Recent campaigns, MITRE, mitigations) */}
          <div className="bg-[#010604] border border-emerald-950 rounded-lg p-3.5 flex flex-col justify-between min-h-[250px]">
            
            {/* Horizontal Sub-tabs */}
            <div className="flex border-b border-emerald-950 pb-2 mb-3 gap-1 grid grid-cols-3">
              {(["trends", "ttps", "mitigations"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`py-1 text-center text-[10px] uppercase font-mono tracking-wide rounded transition-all cursor-pointer ${
                    activeTab === tab
                      ? "bg-emerald-950 text-emerald-300 font-bold border-emerald-800"
                      : "text-emerald-700 hover:text-emerald-400"
                  }`}
                >
                  {tab === "trends" ? "Trends" : tab === "ttps" ? "MITRE TTPs" : "Measures"}
                </button>
              ))}
            </div>

            {/* Tab content renderer */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-2 py-6">
                <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
                <span className="text-[9px] uppercase tracking-wider text-emerald-600 font-mono animate-pulse">Running CTI query ...</span>
              </div>
            ) : intelResponse ? (
              <div className="flex-grow flex flex-col justify-between">
                
                {/* 1. Recents Trends */}
                {activeTab === "trends" && (
                  <div className="space-y-3">
                    <span className="text-[9px] text-[#10b981] tracking-wider uppercase font-extrabold block">
                      Active Cyber Campaigns on Similar Systems
                    </span>
                    <ul className="space-y-2.5">
                      {intelResponse.data.trends.map((trend, idx) => (
                        <li key={idx} className="text-[10px] text-slate-300 leading-normal flex gap-2 items-start bg-slate-950/40 p-2 rounded border border-emerald-950/40">
                          <span className="text-amber-500 shrink-0 font-bold font-mono">⚡</span>
                          <span>{trend}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* 2. MITRE Attack Tactics */}
                {activeTab === "ttps" && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-[#10b981] tracking-wider uppercase font-bold block">
                      MITRE ATT&CK Matrix Alignment
                    </span>
                    <div className="space-y-2">
                      {intelResponse.data.ttps.map((ttp, idx) => (
                        <div key={idx} className="p-2 bg-slate-950 border border-emerald-950 rounded relative overflow-hidden">
                          <span className="absolute right-1.5 top-1 px-1 py-0.1 bg-purple-950 border border-purple-900 rounded text-purple-300 text-[7.5px] font-mono">
                            {ttp.mitreId}
                          </span>
                          <span className="block text-[9.5px] font-bold text-slate-200 mt-0.5 font-sans">
                            {ttp.tactic}
                          </span>
                          <p className="text-[9px] text-emerald-650 font-sans mt-0.5 leading-relaxed">
                            {ttp.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Recommended Defensive Measures */}
                {activeTab === "mitigations" && (
                  <div className="space-y-2">
                    <span className="text-[9px] text-[#10b981] tracking-wider uppercase font-bold block">
                      Active Deception Mitigation Playbook
                    </span>
                    <div className="space-y-2">
                      {intelResponse.data.mitigations.map((mitigation, idx) => {
                        const isDeployed = !!deployedMitigations[idx];
                        return (
                          <div 
                            key={idx} 
                            onClick={() => toggleMitigation(idx)}
                            className={`p-2.5 border rounded flex items-center justify-between transition-all cursor-pointer ${
                              isDeployed 
                                ? 'bg-[#023315]/45 border-[#10b981] text-emerald-100'
                                : 'bg-slate-950 border-emerald-950 text-slate-400 hover:border-emerald-700'
                            }`}
                          >
                            <div className="pr-2 flex flex-col">
                              <span className="text-[10px] leading-snug font-sans">
                                {mitigation}
                              </span>
                              <span className="text-[7.5px] font-mono uppercase text-emerald-650 tracking-wider mt-0.5">
                                {isDeployed ? "● ACTIVE DECEPTION DEPLOYED" : "○ DECEPTION SUSPENDED"}
                              </span>
                            </div>
                            
                            <div className="shrink-0">
                              {isDeployed ? (
                                <CheckCircle className="w-4 h-4 text-[#10b981] shrink-0 fill-emerald-950" />
                              ) : (
                                <div className="w-3.5 h-3.5 border border-emerald-800 rounded-full hover:border-[#10b981]" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                
                {/* Method tag */}
                <div className="text-[8px] text-emerald-750 font-mono border-t border-emerald-950/40 pt-2 mt-3 block">
                  Methodology: {intelResponse.intelMethod}
                </div>

              </div>
            ) : (
              <div className="text-center py-8 text-emerald-750 text-[10px]">
                Initiate telemetry stream node configuration above.
              </div>
            )}

          </div>

        </div>

        {/* Right Hand: Simulated Telemetry Feed */}
        <div className="lg:col-span-7 flex flex-col bg-slate-950 border border-emerald-950 rounded-lg p-4 min-h-[400px]">
          
          {/* Header */}
          <div className="flex justify-between items-center border-b border-emerald-950 pb-2 mb-3 select-none">
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 animate-pulse text-[#10b981]" />
              Anonymized Signal Threat Stream (Live Simulation)
            </span>
            <span className="text-[8px] uppercase tracking-widest text-[#10b981] bg-[#022e1b] px-2 py-0.5 rounded border border-emerald-800 font-bold">
              ● STREAM ACTIVE
            </span>
          </div>

          {/* Table list */}
          <div className="flex-1 overflow-y-auto space-y-2.5 max-h-[380px] scrollbar-thin scrollbar-thumb-emerald-950 scrollbar-track-transparent">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center space-y-3 py-16">
                <RefreshCw className="w-8 h-8 text-[#10b981] animate-spin opacity-80" />
                <span className="text-[10px] text-emerald-500 font-mono tracking-widest uppercase animate-pulse">
                  STREAMS OVERLAY SYNCHRONIZING ...
                </span>
              </div>
            ) : simulatedFeed.length > 0 ? (
              simulatedFeed.map((feedItem) => {
                const badgeColor = feedItem.severity === "CRITICAL" 
                  ? "bg-rose-950/60 border-rose-900 text-rose-300 font-extrabold"
                  : feedItem.severity === "HIGH"
                    ? "bg-amber-950/60 border-amber-900 text-amber-300"
                    : feedItem.severity === "MEDIUM"
                      ? "bg-yellow-950/40 border-yellow-905 text-yellow-300"
                      : "bg-[#172554] border-[#1e3a8a] text-blue-300";

                return (
                  <div 
                    key={feedItem.id} 
                    className="p-3 bg-[#020503] border border-emerald-950 hover:border-emerald-820 transition-all rounded relative overflow-hidden flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                  >
                    
                    {/* Left details */}
                    <div className="space-y-1.5 flex-1 select-text">
                      <div className="flex items-center gap-2 select-none">
                        <span className={`text-[8.5px] px-1.5 py-0.5 border rounded-sm font-mono tracking-wider ${badgeColor}`}>
                          {feedItem.severity}
                        </span>
                        
                        <span className="font-mono text-[10px] text-[#10b981] font-bold">
                          {feedItem.incidentType}
                        </span>

                        <span className="text-[8px] text-emerald-750 font-mono">
                          {feedItem.id}
                        </span>
                      </div>

                      {/* Code Snippet Payload signature */}
                      <div className="p-1 px-2 bg-slate-950 rounded border border-emerald-950/50 font-mono text-[9px] text-slate-300 truncate max-w-lg select-all">
                        {feedItem.payloadSignature}
                      </div>

                      <div className="flex items-center gap-3.5 text-[8.5px] text-emerald-650">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-emerald-700" />
                          {feedItem.timestamp}
                        </span>
                        <span className="flex items-center gap-1">
                          <Globe className="w-3 h-3 text-emerald-700" />
                          Origin IP: <strong className="text-slate-300 select-all font-mono">{feedItem.sourceIp}</strong> ({feedItem.country})
                        </span>
                      </div>
                    </div>

                    {/* Right MITRE mapping summary button */}
                    <div className="shrink-0">
                      <span className="text-[8.5px] font-mono text-purple-300 bg-purple-950/40 border border-purple-900/40 rounded px-1.5 py-0.5">
                        {feedItem.attackerTactics}
                      </span>
                    </div>

                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 py-16 text-emerald-750 text-[10px]">
                No signal streams synchronized. Configure a system persona to compile security alerts.
              </div>
            )}
          </div>

          <div className="text-[8.5px] text-slate-500 italic mt-3 bg-slate-950 p-2 rounded border border-emerald-950/30">
            * Anonymized security feed alerts simulator dynamically maps IP ranges against threat indicators matching the current selected system persona model.
          </div>

        </div>

      </div>

    </div>
  );
}
