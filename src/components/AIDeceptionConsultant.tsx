import React, { useState, useRef, useEffect } from 'react';
import { 
  Sparkles, Bot, Send, Terminal, User, RefreshCw, AlertCircle, Copy, Check, MessageSquareCode, Sliders, Play, Trash2
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  message: string;
  timestamp: string;
}

interface AIDeceptionConsultantProps {
  systemPersona: string;
  setSystemPersona: (persona: string) => void;
}

export default function AIDeceptionConsultant({ systemPersona, setSystemPersona }: AIDeceptionConsultantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: 'model',
      message: `Greetings! I am the **Deception Brain AI**, your dedicated tactical deception advisor.\n\nI am currently synchronized with your active target endpoint persona: **"${systemPersona}"**.\n\nAsk me to:\n- Draft tailored, high-entropy administrative decoy folders and files.\n- Generate custom reactive poison bash scripts with silent telemetry webhooks.\n- Recommend deep Reinforcement Learning response policies to trigger on intruder scouts.\n\nWhat security guidelines shall we explore?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputText, setInputText] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedTextId, setCopiedTextId] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto Scroll to bottom of terminal chat stream
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Suggested prompt query blocks mapped with current node persona templates
  const getSuggestedPrompts = () => {
    const p = systemPersona.toLowerCase();
    if (p.includes("financial") || p.includes("database")) {
      return [
        { label: "🔑 Create db Canary keys", text: "Draft an active canary database backup key and a script to trigger alert on read." },
        { label: "🎯 Poison Postgres sweep", text: "How should our RL model punish automated Postgres scanners searching for usernames?" },
        { label: "🗄️ Outline decoy tables", text: "Suggest some high-fidelity administrative database files and layout paths." }
      ];
    } else if (p.includes("web") || p.includes("legacy") || p.includes("apache") || p.includes("nginx")) {
      return [
        { label: "🕸️ Draft honey .env keys", text: "Create code strings for a poisoned .env file to trap web scanners looking for keys." },
        { label: "⏳ Tarpit web backdoors", text: "How can the RL agent configure slow tarpit delays on suspected shell execution?" },
        { label: "📂 Safe web directories", text: "Recommend a decoy folder structure for standard media and configuration file assets." }
      ];
    } else {
      return [
        { label: "🛠️ Design Canary triggers", text: `Design active decoy files and canary bash script monitors tailored for ${systemPersona}.` },
        { label: "🤖 Tune RL penalty flags", text: "How to configure the hyperparameter punishment flags to maximize threat detection?" },
        { label: "🏰 Fake active credentials", text: "Produce believable false access parameters or administrative credentials to lead intruders on." }
      ];
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || isLoading) return;

    if (!customText) {
      setInputText("");
    }

    const userMsgId = `msg-user-${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      message: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Map history down to plain structures for standard server API ingestion
      const mappedHistory = messages.map(m => ({
        role: m.role,
        message: m.message
      }));

      const res = await fetch('/api/security-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: textToSend,
          history: mappedHistory,
          persona: systemPersona
        })
      });

      const data = await res.json();
      
      const botMsgId = `msg-model-${Date.now()}`;
      setMessages(prev => [...prev, {
        id: botMsgId,
        role: 'model',
        message: data.reply || "Error: Malformed advisory reply payload.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);

    } catch (err) {
      console.error("Advisory consulting stream failure:", err);
      setMessages(prev => [...prev, {
        id: `msg-err-${Date.now()}`,
        role: 'model',
        message: "🚨 Critical Transmission Failure: The central deception brain module has experienced a latency timeout. Re-evaluate connections or check your local firewall profiles.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTextId(id);
    setTimeout(() => setCopiedTextId(null), 1500);
  };

  const clearChatHistory = () => {
    setMessages([
      {
        id: "welcome-reset",
        role: 'model',
        message: `Chat log flushed. Deception Consultant ready to analyze threat vectors for system persona: **"${systemPersona}"**.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Dedicated parser helper for elegant console terminal text formats.
  // Safely distinguishes triple backticks code blocks, inline tags, list markers, and standard text blocks.
  const formatTerminalOutputs = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Extract raw language if exists or clean backticks
        const cleanContent = part.replace(/^```[a-zA-Z]*\n/, '').replace(/```$/, '').trim();
        const blockId = `code-block-${index}`;
        return (
          <div key={index} className="my-3 border border-emerald-900 rounded-lg overflow-hidden bg-black/90 shadow-lg relative font-mono text-[9px] leading-relaxed select-text">
            <div className="flex justify-between items-center bg-[#011409] border-b border-emerald-950 px-3 py-1.5 select-none text-emerald-500 text-[8px] font-mono">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
                <MessageSquareCode className="w-3.5 h-3.5 text-[#10b981]" />
                Advisory Payload Blueprint
              </span>
              <button
                onClick={() => handleCopyCode(cleanContent, blockId)}
                className="text-emerald-700 hover:text-[#10b981] transition-colors flex items-center gap-1 cursor-pointer"
                title="Copy code blueprint"
              >
                {copiedTextId === blockId ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#10b981]" />
                    <span className="text-[7.5px] uppercase text-[#10b981] font-bold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[7.5px]">Copy Block</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-3 text-emerald-200 overflow-x-auto whitespace-pre font-mono scrollbar-thin scrollbar-thumb-emerald-950">
              {cleanContent}
            </pre>
          </div>
        );
      }

      // Inline highlights parser
      const renderInlineHighlights = (paragraph: string) => {
        const textParts = paragraph.split(/(\*\*.*?\*\*|`.*?`)/g);
        return textParts.map((subPart, sIdx) => {
          if (subPart.startsWith('**') && subPart.endsWith('**')) {
            return (
              <strong key={sIdx} className="font-bold text-emerald-300">
                {subPart.slice(2, -2)}
              </strong>
            );
          }
          if (subPart.startsWith('`') && subPart.endsWith('`')) {
            return (
              <code key={sIdx} className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded font-mono text-emerald-400 text-[9px] mx-0.5">
                {subPart.slice(1, -1)}
              </code>
            );
          }
          return subPart;
        });
      };

      // Standard text split by newlines
      const lines = part.split('\n');
      return (
        <div key={index} className="space-y-1">
          {lines.map((line, lIdx) => {
            const trimmed = line.trim();
            if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
              return (
                <div key={lIdx} className="flex items-start gap-1.5 ml-2 text-[10.5px]">
                  <span className="text-[#10b981] mt-0.5 shrink-0">➔</span>
                  <p className="text-slate-200 leading-normal font-sans">
                    {renderInlineHighlights(line.replace(/^[-*]\s+/, ''))}
                  </p>
                </div>
              );
            }
            if (!trimmed) return <div key={lIdx} className="h-2" />;
            return (
              <p key={lIdx} className="text-slate-200 text-[10.5px] leading-relaxed font-sans">
                {renderInlineHighlights(line)}
              </p>
            );
          })}
        </div>
      );
    });
  };

  return (
    <div id="ai-deception-consultant-panel" className="p-4 bg-[#010502] border border-[#0d2e1a] rounded-xl shadow-[0_0_22px_rgba(16,185,129,0.08)] flex flex-col h-[520px]">
      
      {/* Dynamic Module Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-emerald-950 pb-3 gap-3">
        <div>
          <h2 className="text-xs sm:text-sm font-bold uppercase text-[#10b981] tracking-wider flex items-center gap-1.5 select-none">
            <Bot className="w-4 h-4 text-[#10b981] animate-bounce shrink-0" />
            Tactical Deception Consult (Gemini AI Powered)
          </h2>
          <p className="text-[10px] text-emerald-600 font-sans mt-0.5 select-none">
            Active security collaboration brain generating customized honeypots and cyber payload algorithms.
          </p>
        </div>

        <div className="flex items-center gap-2 select-none">
          <span className="text-[8.5px] bg-slate-950 text-emerald-400 font-mono px-2 py-0.5 rounded border border-emerald-950">
            ENGINE: GEMINI_3.5_FLASH
          </span>
          <button
            onClick={clearChatHistory}
            className="p-1 px-1.5 rounded bg-rose-950/20 border border-rose-950 hover:bg-rose-950/50 text-rose-400 text-[9px] flex items-center gap-1 transition-all cursor-pointer"
            title="Wipe advisory memory logs"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Primary Terminal Chat Flow Area */}
      <div className="flex-1 overflow-y-auto px-1 py-3 my-2 space-y-4 max-h-[350px] scrollbar-thin scrollbar-thumb-emerald-950 scrollbar-track-transparent">
        {messages.map((msg) => {
          const isModel = msg.role === 'model';
          return (
            <div 
              key={msg.id} 
              className={`flex gap-2.5 max-w-[90%] sm:max-w-[85%] ${isModel ? 'mr-auto items-start' : 'ml-auto flex-row-reverse items-start'}`}
            >
              {/* Profile Shield Icon */}
              <div className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 select-none ${
                isModel 
                  ? 'bg-emerald-950/80 border-[#10b981]/50 text-[#10b981]' 
                  : 'bg-indigo-950/80 border-indigo-500/50 text-indigo-400'
              }`}>
                {isModel ? <Bot className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
              </div>

              {/* Message Bubble Block */}
              <div className={`p-3 rounded-lg border flex flex-col ${
                isModel 
                  ? 'bg-emerald-950/20 border-emerald-950/60' 
                  : 'bg-indigo-950/10 border-[#1e1b4b]'
              }`}>
                
                {/* Meta details */}
                <span className="block text-[8px] font-mono select-none text-emerald-800 mb-1.5 uppercase tracking-wider">
                  {isModel ? "Deception Agent Brain" : "Security Administrator"} — {msg.timestamp}
                </span>

                {/* Text Parser Layout */}
                <div className="space-y-2">
                  {formatTerminalOutputs(msg.message)}
                </div>
                
              </div>
            </div>
          );
        })}

        {/* Dynamic Loading Cursor Simulator */}
        {isLoading && (
          <div className="flex gap-2.5 items-start mr-auto max-w-[80%] animate-pulse">
            <div className="w-6 h-6 rounded-full bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400 select-none">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            </div>
            <div className="p-3 rounded-lg border border-emerald-950/30 bg-emerald-950/10 flex flex-col">
              <span className="block text-[8px] font-mono select-none text-emerald-700 mb-1">
                Deception Brain AI — Thinking ...
              </span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-emerald-500 font-mono">Formulating custom cyber tactics</span>
                <span className="text-emerald-400 font-mono animate-ping">▋</span>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Tailored Prompts Shortcuts Picker */}
      <div className="my-1.5 space-y-1 select-none">
        <span className="block text-[8.5px] uppercase font-mono tracking-wider font-semibold text-emerald-700">
          Suggested Consultation Queries:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {getSuggestedPrompts().map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt.text)}
              disabled={isLoading}
              className="px-2 py-1 text-[9px] bg-[#020e06] border border-emerald-950 hover:bg-emerald-950/30 hover:border-emerald-700 text-emerald-500 hover:text-emerald-300 rounded transition-all cursor-pointer flex items-center gap-1 block max-w-xs truncate"
            >
              <Play className="w-2 h-2 text-[#10b981]" />
              {prompt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input Message Dispatch Panel */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="mt-auto border-t border-emerald-950 pt-2.5 flex items-center gap-2"
      >
        <div className="relative flex-1">
          <input 
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            placeholder={`Ask Deception Consultant about active ${systemPersona} tactics...`}
            className="w-full bg-slate-950 border border-emerald-950 focus:border-[#10b981] text-xs px-3.5 py-2.5 pr-10 outline-none rounded-lg text-slate-200 placeholder-emerald-800/80 tracking-wide font-sans shadow-inner focus:outline-none focus:ring-1 focus:ring-emerald-950/60"
          />
          <span className="absolute right-3.5 top-3 text-[9px] font-mono text-emerald-900 flex items-center gap-0.5 select-none font-bold">
            <Terminal className="w-3.5 h-3.5" />
            SYS
          </span>
        </div>

        <button
          type="submit"
          disabled={isLoading || !inputText.trim()}
          className={`p-2.5 rounded-lg border font-bold flex items-center justify-center transition-all cursor-pointer ${
            isLoading || !inputText.trim()
              ? 'bg-slate-950 border-emerald-950 text-emerald-900 cursor-not-allowed'
              : 'bg-[#10b981] border-[#10b981] text-slate-950 hover:bg-emerald-400 hover:border-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.15)]'
          }`}
          title="Send consultation query to Brain AI"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>

    </div>
  );
}
