// server/agent.ts
// AI Deception Defense: final_model Reinforcement Learning Agent Forward-Pass Engine

export interface RLState {
  num_commands: number;
  time_alive: number;
  unique_commands: number;
  last_command: number;
  repetitive: number;
  command_type: number;
}

export interface RLResponse {
  action: number;
  action_name: string;
  probabilities: number[];
  state_value: number;
  entropy: number;
  confidence: number;
  state_vector: number[];
}

// Weights matrix representation for a feed-forward policy network (6 Inputs -> 12 Hidden Units -> 5 Outputs / 1 Value)
// Seeding weights to represent a fully-trained policy:
// Inputs: num_commands, time_alive, unique_commands, last_command, repetitive, command_type
const WEIGHTS_IH = [
  // [num_cmds, time, unique, last, rep, cmd_type]
  [-0.15,  0.05, -0.10,  0.02,  0.40, -1.50], // H0 (Sensitive to non-scanners)
  [ 0.10, -0.02,  0.08, -0.01, -0.10,  3.20], // H1 (Heavy Scanner detector -> Action 1 Latency)
  [ 0.05,  0.01,  0.02,  0.05,  1.80,  0.80], // H2 (Repetitive detector -> Action 2 Fake Error)
  [ 0.20,  0.40,  0.15, -0.01, -0.20, -1.10], // H3 (Duration detector)
  [-0.05,  0.02, -0.05,  0.01, -0.50,  2.80], // H4 (Scan high priority)
  [ 0.12, -0.10,  0.22,  0.08,  0.10, -2.50], // H5 (Recon detector -> Action 4 Env Mod)
  [-0.22,  0.15, -0.30,  0.05,  0.15, -1.80], // H6 (Normal/Low impact)
  [ 0.35,  0.12,  0.40, -0.02,  0.05,  0.95], // H7 (Malware detector -> Action 3 Fake Success or Action 0 Sandbox)
  [-0.08,  0.05, -0.12,  0.10,  0.85, -0.40], // H8 (State persistence)
  [ 0.02,  0.01,  0.04, -0.01, -0.05,  1.60], // H9 (Broad malicious signature)
  [-0.10, -0.05, -0.15,  0.03,  2.20, -0.80], // H10 (High repetition filter)
  [ 0.18,  0.08,  0.12,  0.05,  0.10, -2.10]  // H11 (Recon special)
];

const BIAS_H = [-0.1, 0.5, 0.2, -0.3, 0.4, -0.2, -0.1, 0.8, -0.2, 0.1, 0.3, -0.4];

// Output Policy Weights (12 Hidden Units -> 5 Actions)
// Actions: 0=NORMAL_EXECUTION, 1=LATENCY_INJECTION, 2=FAKE_ERROR, 3=FAKE_SUCCESS, 4=ENV_MODIFICATION
const WEIGHTS_HO = [
  // H0     H1     H2     H3     H4     H5     H6     H7     H8     H9     H10    H11
  [ 0.15, -1.25, -0.85,  0.45, -1.10,  0.10,  0.85,  1.20, -0.30, -0.50, -0.40,  0.25], // A0: Normal Sandbox
  [-0.95,  2.10,  0.35, -0.10,  1.85, -1.05, -0.65, -0.85,  0.45,  0.90,  0.15, -1.10], // A1: Latency Injection (Tarpit)
  [-0.50, -0.40,  1.95, -0.25, -0.50, -0.80, -0.45, -0.90,  1.10, -0.10,  2.05, -0.65], // A2: Fake Error
  [ 0.10, -0.90, -0.60,  0.15, -1.20, -0.20,  0.35,  2.05, -0.45,  0.50, -0.85, -0.15], // A3: Fake Success
  [ 0.85, -1.10, -0.70,  0.30, -1.40,  2.45, -0.15, -0.50, -0.60, -0.35, -0.90,  2.15]  // A4: Env Modification
];

const BIAS_O = [0.2, -0.5, -0.3, 0.1, -0.1];

// Value Head Weights (12 Hidden Units -> 1 State Value V(S))
const WEIGHTS_HV = [0.55, -0.25, 0.70, 0.40, -0.15, 0.65, -0.80, 0.95, 0.10, 0.30, 0.50, 0.35];
const BIAS_V = 0.5;

function relu(x: number): number {
  return Math.max(0, x);
}

function softmax(arr: number[]): number[] {
  const maxVal = Math.max(...arr); // Stabilize against overflow
  const exps = arr.map(v => Math.exp(v - maxVal));
  const sumExps = exps.reduce((a, b) => a + b, 0);
  return exps.map(v => v / sumExps);
}

export function evaluateFinalModel(state: RLState): RLResponse {
  // 1. Normalize variables to create safe state vector for the continuous neural policy inputs
  const normNumCmds = Math.min(1.0, state.num_commands / 30);
  const normTimeAlive = Math.min(1.0, state.time_alive / 300);
  const normUniqueCmds = Math.min(1.0, state.unique_commands / 20);
  const normLastCmd = (state.last_command % 100) / 100;
  const normRepetitive = state.repetitive > 0 ? 1.0 : 0.0;
  
  // Categorical encoding mapping command type to numeric intensity
  let normCmdType = 0.0;
  if (state.command_type === 1) normCmdType = 0.33; // Recon
  if (state.command_type === 2) normCmdType = 0.66; // Malware
  if (state.command_type === 3) normCmdType = 1.00; // Scanner

  const stateVector = [
    normNumCmds,
    normTimeAlive,
    normUniqueCmds,
    normLastCmd,
    normRepetitive,
    normCmdType
  ];

  // 2. Hidden Layer Forward Pass
  const hiddenOutputs = new Array(12).fill(0);
  for (let j = 0; j < 12; j++) {
    let sum = BIAS_H[j];
    for (let i = 0; i < 6; i++) {
      sum += stateVector[i] * WEIGHTS_IH[j][i];
    }
    hiddenOutputs[j] = relu(sum);
  }

  // 3. Output Policy Logits Forward Pass
  const actionLogits = new Array(5).fill(0);
  for (let k = 0; k < 5; k++) {
    let sum = BIAS_O[k];
    for (let j = 0; j < 12; j++) {
      sum += hiddenOutputs[j] * WEIGHTS_HO[k][j];
    }
    actionLogits[k] = sum;
  }

  // 4. Softmax over action logits to retrieve probabilities
  const actionProbabilities = softmax(actionLogits);

  // 5. Value Function V(s) Estimation
  let estValue = BIAS_V;
  for (let j = 0; j < 12; j++) {
    estValue += hiddenOutputs[j] * WEIGHTS_HV[j];
  }

  // 6. Calculate Shannon Entropy H(pi) of the action probability distribution
  let entropy = 0;
  for (let k = 0; k < 5; k++) {
    const p = actionProbabilities[k];
    if (p > 1e-8) {
      entropy -= p * Math.log2(p);
    }
  }

  // 7. Argmax selection (Greedy Exploitation in Evaluation Mode)
  let maxIdx = 0;
  let maxP = -1;
  for (let k = 0; k < 5; k++) {
    if (actionProbabilities[k] > maxP) {
      maxP = actionProbabilities[k];
      maxIdx = k;
    }
  }

  const actionNames: Record<number, string> = {
    0: "NORMAL_EXECUTION",
    1: "LATENCY_INJECTION",
    2: "FAKE_ERROR",
    3: "FAKE_SUCCESS",
    4: "ENV_MODIFICATION"
  };

  return {
    action: maxIdx,
    action_name: actionNames[maxIdx],
    probabilities: actionProbabilities.map(p => parseFloat(p.toFixed(4))),
    state_value: parseFloat(estValue.toFixed(4)),
    entropy: parseFloat(entropy.toFixed(4)),
    confidence: parseFloat(maxP.toFixed(4)),
    state_vector: stateVector.map(v => parseFloat(v.toFixed(3)))
  };
}
