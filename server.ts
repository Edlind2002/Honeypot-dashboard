import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { evaluateFinalModel } from "./server/agent";
import dotenv from "dotenv";
dotenv.config();
import { GoogleGenAI, Type } from "@google/genai";

// --- PROCEDURAL GENERATOR FALLBACK FOR GENERATIVE DECOY ENGINE ---
function generateProceduralDecoy(persona: string, poisonDegree: string) {
  let tree = "";
  let script = "";
  let canary = "";
  let expl = "";

  const nameTag = persona.toLowerCase().replace(/[^a-z0-9]/g, "_");

  if (persona.toLowerCase().includes("financial") || persona.toLowerCase().includes("database") || persona.toLowerCase().includes("credit")) {
    tree = `├── opt/
│   └── secure_assets/
│       ├── db_backup.sh
│       └── db_connection_sec.key (DECOY CANARY)
├── var/
│   └── log/
│       └── database_journal_audit.log
└── etc/
    └── db_credentials/
        └── prod_secureset.conf.bak`;
    script = `#!/bin/bash
# Secure Database Backup & Integrity Check Routine
# Persona Context: Financial / Transaction Ledger Host

DB_NAME="finance_ledger_audit"
BACKUP_DIR="/opt/secure_assets/backups"
TELEMETRY_INGRESS="https://telemetry.internal/sec-check"

echo "[$(date)] Starting secure ledger copy..."

# Canary trap active monitor: check if backup credentials key is accessed
if [ -f "/opt/secure_assets/db_connection_sec.key" ]; then
  CANARY_SIG=$(sha256sum /opt/secure_assets/db_connection_sec.key | awk '{print $1}')
  # Silently log incident telemetry to backend honeypot receiver
  curl -s -X POST -H "Content-Type: application/json" -d "{\\"trigger\\":\\"FINANCE_CANARY\\",\\"hash\\":\\"$CANARY_SIG\\"}" $TELEMETRY_INGRESS/report >/dev/null
fi

echo "[$(date)] Running schema dump..."
pg_dump -U sec_auditor_db -h 127.0.0.1 $DB_NAME > $BACKUP_DIR/ledger_backup.sql
echo "[$(date)] Backup completed with PPO validation status: SUCCESS"`;
    canary = "Any read/access of /opt/secure_assets/db_connection_sec.key or replication of prod_secureset.conf.bak";
    expl = "Provides deceptive financial vault patterns. Seeds a highly juicy db_connection_sec.key alongside standard database backup bash scripts, configuring a high-value data structure to delay attacker exploration.";
  } else if (persona.toLowerCase().includes("web") || persona.toLowerCase().includes("legacy") || persona.toLowerCase().includes("apache") || persona.toLowerCase().includes("nginx")) {
    tree = `├── var/
│   └── www/
│       └── html/
│           ├── index.php
│           ├── uploads/
│           ├── .env (DECOY CANARY)
│           └── backups/
│               └── config.php.old
└── etc/
    └── apache2/
        └── conf-enabled/
            └── security-patch-902-audit.conf`;
    script = `#!/bin/bash
# Legacy system asset sync & index integrity monitor
# Server Context: Legacy CMS Web Server

SENSITIVE_ENV="/var/www/html/.env"
SECURITY_GATEWAY="http://gateway-telemetry/webroot"

# Intruder detection trigger on .env file manipulation
inotifywait -q -e modify,access "$SENSITIVE_ENV" --timeout 15 2>/dev/null
if [ $? -eq 0 ]; then
  # Attacker read/write detected
  curl -s -X POST --data "alert=ENV_ACCESS_VIOLATION&path=$SENSITIVE_ENV" $SECURITY_GATEWAY/alert >/dev/null
fi

echo "Validating rewrite conditions and folder compliance..."
find /var/www/html/ -type f -exec chmod 644 {} \\;
echo "[$(date)] Webroot cleanup pass run smoothly."`;
    canary = "Attempted reading of /var/www/html/.env or accessing config.php.old";
    expl = "Lures attackers focusing on classic web deployment vulnerabilities. Exposes a fake environment credentials file (.env) containing deliberate obsolete database passwords under public folders.";
  } else {
    // Elegant procedural fallback for any customized persona
    tree = `├── opt/
│   └── ${nameTag || "custom_node"}/
│       ├── daemon_settings.xml
│       ├── secrets_stash.vault (DECOY CANARY)
│       └── admin_controller.sh
└── etc/
    └── systemd/
        └── system/
            └── core_${nameTag || "security"}.service`;
    script = `#!/bin/bash
# Autonomous node synchronization engine
# Target Host Persona: ${persona}

VAULT_PATH="/opt/${nameTag || "custom_node"}/secrets_stash.vault"
MONITOR_IP="127.0.0.1"

echo "Checking health status of central cluster..."
ping -c 1 $MONITOR_IP >/dev/null

if [ -f "$VAULT_PATH" ]; then
  # Silent telemetry check
  echo "[SENSOR DETECTED] Performing core secret audit..."
  RAW_CONTENTS=$(head -n 2 "$VAULT_PATH")
  # Trigger webhook on server side
  curl -s -X POST -d "node=${persona}&contents=compromised" http://127.0.0.1:3000/api/rl-action > /dev/null
fi

echo "[$(date)] Operational run completed successfully."`;
    canary = `Accessing /opt/${nameTag || "custom_node"}/secrets_stash.vault or running core_${nameTag || "security"}.service`;
    expl = `Synthesized decoy structure tailored for '${persona}'. Mimics standard administrator microservice files using custom service-specific nomenclature and active monitoring triggers.`;
  }

  return { tree, script, canary, expl, method: "Intel procedural synth" };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Parse JSON payloads
  app.use(express.json());

  // API logs middleware
  app.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      console.log(`[API REQUEST] ${req.method} ${req.path} at ${new Date().toISOString()}`);
    }
    next();
  });

  // REST API: RL Agent Evaluation Service
  app.post("/api/rl-action", (req, res) => {
    try {
      const { num_commands, time_alive, unique_commands, last_command, repetitive, command_type } = req.body;
      
      // Sanitized inputs with robust default structures
      const state = {
        num_commands: typeof num_commands === "number" ? num_commands : 1,
        time_alive: typeof time_alive === "number" ? time_alive : 10,
        unique_commands: typeof unique_commands === "number" ? unique_commands : 1,
        last_command: typeof last_command === "number" ? last_command : 0,
        repetitive: typeof repetitive === "number" ? repetitive : 0,
        command_type: typeof command_type === "number" ? command_type : 0,
      };

      // Run forward evaluation on our compiled policy weights inside the simulated final_model
      const decisionResult = evaluateFinalModel(state);

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        agent: "final_model",
        algorithm: "Proximal Policy Optimization (PPO)",
        model_checksum: "sha256:d8c971eb0fa7243b901bc09aeeea1203",
        inputs: state,
        decision: decisionResult
      });
    } catch (err: any) {
      console.error("[RL API ERROR]", err);
      res.status(500).json({
        success: false,
        error: err.message || "Failed running policy evaluation pass"
      });
    }
  });

  // NEW API: Generative Decoy Engine configuration & generation
  app.post("/api/generate-decoy", async (req, res) => {
    try {
      const { persona, poisonDegree, generateLlm } = req.body;
      
      const selectedPersona = typeof persona === "string" && persona.trim().length > 0 
        ? persona.trim()
        : "Standard Linux Server";
      
      const selectedPoisonDegree = typeof poisonDegree === "string" ? poisonDegree : "Standard canary traps";
      const shouldGenerateLlm = typeof generateLlm === "boolean" ? generateLlm : true;

      // Safe Fallback initialization
      const proceduralData = generateProceduralDecoy(selectedPersona, selectedPoisonDegree);

      if (!shouldGenerateLlm) {
        return res.json({
          success: true,
          isLlmGenerated: false,
          apiKeyMissing: false,
          decoyMethod: "Procedural Local Synthesizer",
          persona: selectedPersona,
          poisonDegree: selectedPoisonDegree,
          data: proceduralData
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn("[DECOY ENGINE] No GEMINI_API_KEY found, falling back to procedural engine.");
        return res.json({
          success: true,
          isLlmGenerated: false,
          apiKeyMissing: true,
          decoyMethod: "Procedural Local Fallback (No API Key found)",
          persona: selectedPersona,
          poisonDegree: selectedPoisonDegree,
          data: proceduralData
        });
      }

      // Initialize GoogleGenAI client lazily (fully secure inside handler)
      console.log("[DECOY ENGINE] Contacting Gemini for persona:", selectedPersona);
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const prompt = `Generate a modern, highly convincing ssh/honeypot decoy asset for a system persona configured as: "${selectedPersona}".
The threat level/poison degree config is: "${selectedPoisonDegree}".

Your response must contain:
1. A realistic directory tree template using standard ASCII (e.g. ├──, └──) with realistic files tailored specifically for this persona (e.g., database configs for financial databases, old wordpress or config folder structures for web servers). Keep it 6-12 lines, compact and extremely believable.
2. A matching, functional-looking administration bash script (15-30 lines) associated with one of the files in the directory tree. The script should look normal but secretly contain a simulated canary probe alert or telemetry trigger that alerts security on intruder manipulation.
3. A description of the "canaryTriggerEvent" specifying exactly what action or file accesses trigger the trap.
4. A strategic explanation of the decoy layout.

Return the result strictly as a JSON object matching the requested schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert security engineer designing highly authentic ssh honeypot systems and canary decoy assets. You specialize in generating complex, believable Linux folder hierarchies and poisoned administration scripts that look authentic to standard attackers but contain hidden canary trap triggers.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tree: {
                type: Type.STRING,
                description: "The directory tree structured as an ASCII drawing. (├──, └──, files, containing decoy details)"
              },
              script: {
                type: Type.STRING,
                description: "The complete poisoned bash script containing believable administration logic and simulated canary trigger payloads."
              },
              canary: {
                type: Type.STRING,
                description: "Which specific file or script command action triggers the intrusion telemetry."
              },
              expl: {
                type: Type.STRING,
                description: "Historical or threat-intel strategic explanation of why this decoy configuration is highly effective."
              }
            },
            required: ["tree", "script", "canary", "expl"]
          }
        }
      });

      if (response && response.text) {
        const parsedResult = JSON.parse(response.text.trim());
        return res.json({
          success: true,
          isLlmGenerated: true,
          apiKeyMissing: false,
          decoyMethod: "Gemini AI Core Generator (gemini-3.5-flash)",
          persona: selectedPersona,
          poisonDegree: selectedPoisonDegree,
          data: {
            tree: parsedResult.tree,
            script: parsedResult.script,
            canary: parsedResult.canary,
            expl: parsedResult.expl,
            method: "Gemini 3.5 AI Engine"
          }
        });
      } else {
        throw new Error("Empty response from gemini model.");
      }

    } catch (err: any) {
      console.error("[DECOY ENGINE ERROR]", err);
      // fallback to procedural
      const selectedPersona = req.body?.persona || "Standard Linux Server";
      const selectedPoisonDegree = req.body?.poisonDegree || "Standard canary traps";
      const fallbackProcedural = generateProceduralDecoy(selectedPersona, selectedPoisonDegree);
      
      return res.json({
        success: true,
        isLlmGenerated: false,
        apiKeyMissing: false,
        decoyMethod: "Procedural Local Fallback (Gemini API execution failed)",
        persona: selectedPersona,
        poisonDegree: selectedPoisonDegree,
        errorMsg: err.message || "Unknown API error",
        data: fallbackProcedural
      });
    }
  });

  // --- MODEL PROCEDURAL GENERATOR FOR ANONYMIZED THREAT INTELLIGENCE ---
  function generateProceduralThreatIntel(persona: string) {
    const p = persona.toLowerCase();
    
    let trends: string[] = [];
    let ttps: { mitreId: string; tactic: string; description: string }[] = [];
    let mitigations: string[] = [];
    let feed: any[] = [];

    const time1 = "Just now";
    const time2 = "7 mins ago";
    const time3 = "24 mins ago";
    const time4 = "1 hr ago";

    if (p.includes("financial") || p.includes("database") || p.includes("credit") || p.includes("oracle")) {
      trends = [
        "94% spike in PostgreSQL standard crawler sweeps searching for default system passwords (postgres/admin).",
        "Sophisticated ransomware groups (LockBit 4.0 variation) actively targeting financial transaction ledger databases via simulated backup scripts hijacking.",
        "Increasing occurrence of micro-exfiltration activities on exposed Oracle TCP listener socket port 1521."
      ];
      ttps = [
        { mitreId: "T1190", tactic: "Exploit Public-Facing Application", description: "Attackers look for unpatched SQL injection vulnerabilities to run administrative DB or system commands." },
        { mitreId: "T1555.005", tactic: "Credentials from Password Stores", description: "Harvesting plaintext DB passwords and keys from backup scripts and configuration files." },
        { mitreId: "T1046", tactic: "Network Service Scanning", description: "Automated banner grabbing on Postgres/Oracle ports to identify system architecture versions for target-matched exploits." }
      ];
      mitigations = [
        "Deploy decoy canary assets under logical folder paths like /opt/secure_assets/.",
        "Enable real-time policy modifications in the RL engine to inject latency (tarpit tactics) on suspicious database scouts.",
        "Limit backend DB socket access exclusively to validated application middleware IPs with strict security groups."
      ];
      feed = [
        { id: "FI-101", timestamp: time1, sourceIp: "185.220.101.5", country: "DE", severity: "CRITICAL", incidentType: "Database Injection Probe", payloadSignature: "UNION SELECT username, password_hash FROM users", attackerTactics: "Credential Access via SQLi" },
        { id: "FI-102", timestamp: time2, sourceIp: "45.132.22.90", country: "NL", severity: "HIGH", incidentType: "Port Scanning Activity", payloadSignature: "TCP SYN port 1521 (Oracle DB)", attackerTactics: "Reconnaissance / Banner Grab" },
        { id: "FI-103", timestamp: time3, sourceIp: "82.165.9.114", country: "US", severity: "HIGH", incidentType: "Canary Trigger Alert", payloadSignature: "/opt/secure_assets/db_connection_sec.key accessed", attackerTactics: "Data Exfiltration Attempt (Canary Token)" },
        { id: "FI-104", timestamp: time4, sourceIp: "103.45.2.16", country: "CN", severity: "MEDIUM", incidentType: "SSH Brute Force Attack", payloadSignature: "Failed login: root / master_finance123", attackerTactics: "Credential Abuse" }
      ];
    } else if (p.includes("web") || p.includes("legacy") || p.includes("apache") || p.includes("nginx") || p.includes("php")) {
      trends = [
        "Active campaigns scanning for unpatched phpMyAdmin or older Apache web vulnerabilities in outdated server deployments.",
        "Automated threat bots targeting web /uploads/ and fallback backups directories to upload malicious PHP control scripts.",
        "Aggressive automated crawler traffic looking for leaking configuration keys (.env, config.php.old, config.bak)."
      ];
      ttps = [
        { mitreId: "T1505.003", tactic: "Server Software Component: Web Shell", description: "Uploading hidden PHP backdoors inside media folder hierarchies to gain direct virtual shell access." },
        { mitreId: "T1589", tactic: "Gather Victim Identity Info", description: "Scanning exposed public webroots to locate leaks of private environment keys and database credentials." },
        { mitreId: "T1110.001", tactic: "Brute Force: Password Guessing", description: "Executing automated password brute-forcing against standard administrative login endpoints." }
      ];
      mitigations = [
        "Inject custom honeypot .env assets inside public directories containing poisoned credentials to track and alarm web gateway operations.",
        "Apply active file path access filters (inotifywait triggers) on high-value sensitive web deployment configs.",
        "Utilize dynamic latency overrides to heavily stall TCP connections for suspect wget/curl requests targeting sensitive folders."
      ];
      feed = [
        { id: "FI-201", timestamp: time1, sourceIp: "193.37.254.12", country: "FR", severity: "CRITICAL", incidentType: "Web Shell Upload Target", payloadSignature: "POST /uploads/shell.php HTTP/1.1 CMD: whoami", attackerTactics: "Execution via Web Backdoor" },
        { id: "FI-202", timestamp: time2, sourceIp: "109.201.154.34", country: "RU", severity: "HIGH", incidentType: "Directory Traversal Scout", payloadSignature: "GET /../../../../etc/passwd HTTP/1.1", attackerTactics: "Credential Disclosure Traversal" },
        { id: "FI-203", timestamp: time3, sourceIp: "41.90.11.23", country: "KE", severity: "HIGH", incidentType: "Canary Trigger Alarm", payloadSignature: "/var/www/html/.env file accessed (read check)", attackerTactics: "HoneyToken Discovery Tracker" },
        { id: "FI-204", timestamp: time4, sourceIp: "123.45.12.89", country: "JP", severity: "INFO", incidentType: "Vulnerability Survey", payloadSignature: "GET /wp-admin/install.php (WordPress probing)", attackerTactics: "Initial Scanning Enumeration" }
      ];
    } else {
      // Elegant baseline generic fallback
      trends = [
        `Targeted campaigns explicitly cataloging node characteristics aligned with '${persona}'.`,
        "Adversaries executing rapid port-sweeps to determine system footprint characteristics.",
        "Significant surge in scanning requests from commercially leased VPN ranges searching for open management endpoints."
      ];
      ttps = [
        { mitreId: "T1078.001", tactic: "Valid Accounts: Default Accounts", description: `Harnessing system-default or misplaced testing credentials associated with standard '${persona}' environments.` },
        { mitreId: "T1059.004", tactic: "Command and Scripting Interpreter: Unix Shell", description: "Injecting diagnostic commands inside running scripts to audit backend filesystem structure and root accounts." },
        { mitreId: "T1213", tactic: "Data from Information Repositories", description: "Scanning temporary folders and administration file backups to clone configuration access tokens." }
      ];
      mitigations = [
        "Erect specific honeypot file paths inside logical directories (opt/, var/) matching this system persona's layout.",
        "Alarm on typical enumeration command triggers (e.g., executing hostname, whoami, or custom bash scans) originating from unfamiliar unprivileged users.",
        "Configure simulated software banners to mimic outdated dependencies, confusing attackers and inflating discovery times."
      ];
      feed = [
        { id: "FI-301", timestamp: time1, sourceIp: "185.220.101.12", country: "DE", severity: "HIGH", incidentType: "Host Header Tamper", payloadSignature: `Injected host parameters mapping: ${persona}`, attackerTactics: "Dynamic Endpoint Spoofing" },
        { id: "FI-302", timestamp: time2, sourceIp: "104.244.75.110", country: "US", severity: "HIGH", incidentType: "Suspicious Script Execution", payloadSignature: "./admin_controller.sh --recon-all", attackerTactics: "Privileged Command Enumeration" },
        { id: "FI-303", timestamp: time3, sourceIp: "88.99.141.2", country: "NL", severity: "CRITICAL", incidentType: "Canary Sensor Tripped", payloadSignature: "Access to customized /secrets_stash.vault detected", attackerTactics: "Protected Memory Target Accessed" },
        { id: "FI-304", timestamp: time4, sourceIp: "201.240.10.88", country: "BR", severity: "MEDIUM", incidentType: "Host Scanner Probe", payloadSignature: "Mass TCP SYN scan check on typical UDP ports", attackerTactics: "Network Service Discovery" }
      ];
    }

    return {
      persona,
      trends,
      ttps,
      mitigations,
      feed
    };
  }

  // API endpoint for dynamic anonymized threat intelligence feed related to the selected persona
  app.post("/api/threat-intel", async (req, res) => {
    try {
      const { persona, generateLlm } = req.body;
      const selectedPersona = typeof persona === "string" && persona.trim().length > 0 
        ? persona.trim()
        : "Standard Linux Server";
      
      const shouldGenerateLlm = typeof generateLlm === "boolean" ? generateLlm : true;
      const proceduralIntel = generateProceduralThreatIntel(selectedPersona);

      if (!shouldGenerateLlm) {
        return res.json({
          success: true,
          isLlmGenerated: false,
          apiKeyMissing: false,
          intelMethod: "Procedural Expert Threats Database",
          persona: selectedPersona,
          data: proceduralIntel
        });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        console.warn("[THREAT INTEL] No GEMINI_API_KEY available, using expert procedural backup.");
        return res.json({
          success: true,
          isLlmGenerated: false,
          apiKeyMissing: true,
          intelMethod: "Procedural Expert Fallback (No API Key found)",
          persona: selectedPersona,
          data: proceduralIntel
        });
      }

      console.log("[THREAT INTEL] Consulting Gemini for persona security profile:", selectedPersona);
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          }
        }
      });

      const prompt = `Perform an advanced, highly realistic security Threat Intelligence audit for a node mimicking system persona: "${selectedPersona}".
Generate realistic, anonymized attack telemetry, trends, MITRE ATT&CK TTPs, and recommended defenses.

Your response must contain:
1. "trends": A list of 3 realistic recent security attack trend observations (e.g., CVEs, scanning peaks, targeted tactics) specific to "${selectedPersona}".
2. "ttps": A list of 3 structured objects representing MITRE ATT&CK techniques, each containing:
   - "mitreId" (e.g., T1190, T1078)
   - "tactic" (the technique name)
   - "description" (a highly believable contextual breakdown of how threat groups target this persona)
3. "mitigations": A list of 3 recommended proactive honeypot/deception measures to mitigate risks on this system.
4. "feed": A list of 4 anonymized real-time simulation feed alert entries. Each entry must be realistic and have:
   - "id" (e.g., FI-101)
   - "timestamp" (a relative timestamp string close to current time, e.g. "Just now", "4 mins ago", "1 hour ago")
   - "sourceIp" (a high-fidelity public or malicious IP address)
   - "country" (2-letter capital ISO country code)
   - "severity" (one of "CRITICAL", "HIGH", "MEDIUM", "INFO")
   - "incidentType" (e.g., Database Injection Probe, directory search)
   - "payloadSignature" (unauthentic-looking code strings, SQL syntax, or file accesses that triggered the alert)
   - "attackerTactics" (MITRE category, e.g., "Initial Access", "Credential Access")

Return the result strictly as a JSON object matching the requested schema.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are an expert Cyber Threat Intelligence (CTI) researcher specializing in honeypot telemetry, MITRE ATT&CK techniques, and deceptive cyber countermeasures.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              trends: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 3 recent attack trend descriptions specific to this architecture node."
              },
              ttps: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    mitreId: { type: Type.STRING },
                    tactic: { type: Type.STRING },
                    description: { type: Type.STRING }
                  },
                  required: ["mitreId", "tactic", "description"]
                }
              },
              mitigations: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "List of 3 recommended deceptive defense actions."
              },
              feed: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    timestamp: { type: Type.STRING },
                    sourceIp: { type: Type.STRING },
                    country: { type: Type.STRING },
                    severity: { type: Type.STRING },
                    incidentType: { type: Type.STRING },
                    payloadSignature: { type: Type.STRING },
                    attackerTactics: { type: Type.STRING }
                  },
                  required: ["id", "timestamp", "sourceIp", "country", "severity", "incidentType", "payloadSignature", "attackerTactics"]
                }
              }
            },
            required: ["trends", "ttps", "mitigations", "feed"]
          }
        }
      });

      if (response && response.text) {
        const parsedResult = JSON.parse(response.text.trim());
        return res.json({
          success: true,
          isLlmGenerated: true,
          apiKeyMissing: false,
          intelMethod: "Gemini AI Threat Research Profile",
          persona: selectedPersona,
          data: parsedResult
        });
      } else {
        throw new Error("Empty response from gemini model.");
      }

    } catch (err: any) {
      console.error("[THREAT INTEL API ERROR]", err);
      const selectedPersona = req.body?.persona || "Standard Linux Server";
      const fallbackIntel = generateProceduralThreatIntel(selectedPersona);
      return res.json({
        success: true,
        isLlmGenerated: false,
        apiKeyMissing: false,
        intelMethod: "Procedural Expert Database Fallback (API error)",
        persona: selectedPersona,
        errorMsg: err.message || "Unknown API error",
        data: fallbackIntel
      });
    }
  });

  // --- API ENDPOINT FOR CONVERSATIONAL AI SECURITY ADVISORY PLAYGROUND ---
  app.post("/api/security-chat", async (req, res) => {
    try {
      const { message, history, persona } = req.body;
      const selectedPersona = typeof persona === "string" ? persona : "Financial Database Server";
      const userMessage = typeof message === "string" ? message.trim() : "";
      const chatHistory = Array.isArray(history) ? history : [];

      if (!userMessage) {
        return res.status(400).json({ error: "Empty prompt message parameter" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.trim() === "") {
        // High fidelity procedural security answers if API key is not configured
        let fallbackReply = "Hello! I am your AI Deception Advisor. I see that your GEMINI_API_KEY is not configured in the workspace settings. Let me provide some professional recommendations based on your system persona:\n\n";
        
        const p = selectedPersona.toLowerCase();
        if (p.includes("financial") || p.includes("database")) {
          fallbackReply += `For your **${selectedPersona}**, my top recommendation is to deploy custom directory-level canary triggers. \n\n` + 
            `1. Setup files like \`/opt/secure_assets/db_connection_sec.key\` with immediate inotify wait triggers. \n` +
            `2. Use our Reinforcement Learning engine to alter latency policies on suspicious SQL sweeps. \n\n` +
            `Please specify your valid \`GEMINI_API_KEY\` inside the workspace Settings > Secrets to unlock full interactive AI logic!`;
        } else if (p.includes("web") || p.includes("apache") || p.includes("nginx") || p.includes("php")) {
          fallbackReply += `For your **${selectedPersona}**, we should prioritize protecting direct virtual shell hazards:\n\n` +
            `1. Seed decoy credentials or backup files inside \`/var/www/html/.env\` paths.\n` +
            `2. Apply slow read tarpit responses when suspected search engines search for administration config backups.\n\n` +
            `Ensure your \`GEMINI_API_KEY\` is active in the settings interface to start building customized response routines cooperatively.`;
        } else {
          fallbackReply += `To harden a **${selectedPersona}** node, simulate realistic outdated service configurations and inject canaries on administrative endpoints like \`secrets_stash.vault\`.\n\n` +
            `Configure the \`GEMINI_API_KEY\` environment secret in the AI Studio sidebar dashboard to enable fully tailored interactive simulation planning!`;
        }

        return res.json({
          success: true,
          isLlmGenerated: false,
          apiKeyMissing: true,
          reply: fallbackReply
        });
      }

      console.log("[SECURITY CHAT] Instantiating GenAI user prompt:", userMessage);
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });

      // Prepare standard contents list matching the API documentation
      const formattedContents = [
        ...chatHistory.map(item => ({
          role: item.role === "user" ? "user" : "model",
          parts: [{ text: item.message }]
        })),
        {
          role: "user",
          parts: [{ text: userMessage }]
        }
      ];

      const sysInstruction = `You are "Deception Brain AI", an advanced, friendly, high-fidelity Tactical Security AI Advisory specialist built directly into the 'Deception Defense Console'.
Your goal is to consult security administrators on constructing intelligent deceptive environments, designing high-entropy honeypot decoy files, and tweaking the active Reinforcement Learning defensive agent policies.

Core Contextual Info:
- The current selected target server node system persona is: "${selectedPersona}".
- The framework operates on dual defense patterns: Procedural Expert heuristics and autonomous Reinforcement Learning.
- Common decoy items include: decoy DB files, fake configuration keys, slow tarpits, and active canary script traps.

When explaining or recommending things:
1. Speak objectively, clearly, and like a seasoned Cyber Security Architect.
2. Provide short, clean markdown code snippets or bash scripts where helpful as visual guides.
3. Align advice specifically with the current persona: "${selectedPersona}".
4. Avoid ungrounded technical terminology, buzzwords or promotional sales talk. Be concrete, technical, and helpful.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: sysInstruction,
          temperature: 0.72
        }
      });

      if (response && response.text) {
        return res.json({
          success: true,
          isLlmGenerated: true,
          apiKeyMissing: false,
          reply: response.text.trim()
        });
      } else {
        throw new Error("Empty text response received from Gemini.");
      }

    } catch (err: any) {
      console.error("[SECURITY CHAT BACKEND ERROR]", err);
      return res.status(500).json({
        error: "AI Generation Error",
        details: err.message || "Failed communicating with Gemini model"
      });
    }
  });

  // API Status Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({
      status: "online",
      agent: "final_model",
      device: "CPU / Inference Thread 1",
      connections: 1
    });
  });

  // Vite middleware configurations for development or statically served production assets
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`=================================================`);
    console.log(`🚀 [RL DECEPTION BACKEND] server running!`);
    console.log(`🔗 Interface bind: http://0.0.0.0:${PORT}`);
    console.log(`🤖 Reinforcement Learning final_model online`);
    console.log(`=================================================`);
  });
}

startServer().catch((err) => {
  console.error("FATAL: Failed starting RL deception backend server:", err);
});
