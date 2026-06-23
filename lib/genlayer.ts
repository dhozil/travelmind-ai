import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';

type Eth = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

declare global {
  interface Window {
    ethereum?: Eth;
  }
}

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS || '') as `0x${string}`;

const ADDR_STORAGE = 'travelmind:wallet:address';

// ── Read-only client (for @gl.public.view) ─────────────────────────

let readonlyClient: ReturnType<typeof createClient> | null = null;

function getReadonlyClient() {
  if (readonlyClient) return readonlyClient;
  readonlyClient = createClient({ chain: testnetBradbury });
  return readonlyClient;
}

/** Unwrap GenLayer SDK result: handles {value, inner} wrappers, JSON strings */
function unwrapResult(val: unknown): unknown {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object' && !Array.isArray(val)) {
    const obj = val as Record<string, unknown>;
    if (obj.value !== undefined) return unwrapResult(obj.value);
    if (obj.inner !== undefined) return unwrapResult(obj.inner);
    if (obj.result !== undefined) return unwrapResult(obj.result);
    if (obj.returnValue !== undefined) return unwrapResult(obj.returnValue);
  }
  if (typeof val === 'string') {
    if (val.length === 0) return null;
    try { return JSON.parse(val); } catch { return val; }
  }
  return val;
}

async function callView(method: string, args: any[]): Promise<unknown> {
  if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured');
  const client = getReadonlyClient();
  const raw = await client.readContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
  });
  return unwrapResult(raw);
}

async function simulateWrite(method: string, args: any[]): Promise<unknown> {
  if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured');
  const client = getReadonlyClient();
  const result = await client.simulateWriteContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    leaderOnly: false,
  });
  return unwrapResult(result);
}

/** Poll a view method until it returns a non-empty result (GenLayer TreeMap delay) */
async function pollView(method: string, args: any[], maxAttempts = 120, baseIntervalMs = 2000): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await callView(method, args);
      const str = typeof result === 'string' ? result : JSON.stringify(result ?? '');
      const isEmpty = !str || str === 'null' || str === 'undefined' || str === '{}' || str.trim() === '';
      if (!isEmpty) {
        return result;
      }
    } catch {
      // retry
    }
    const waitMs = Math.min(baseIntervalMs * (1 + attempt * 0.5), 15000);
    await new Promise(r => setTimeout(r, waitMs));
  }
  return null;
}

// ── Wallet state ──────────────────────────────────────────────────

export class WalletNotConnectedError extends Error {
  constructor() {
    super("Wallet not connected. Click 'Connect Wallet' in the header.");
    this.name = 'WalletNotConnectedError';
  }
}

export class NoWalletError extends Error {
  constructor() {
    super('No EVM wallet detected. Install MetaMask to continue.');
    this.name = 'NoWalletError';
  }
}

function isBrowser() { return typeof window !== 'undefined'; }

export function loadStoredAddress(): `0x${string}` | null {
  if (!isBrowser()) return null;
  let v = localStorage.getItem(ADDR_STORAGE);
  if (!v) {
    v = localStorage.getItem('walletAddress');
    if (v && /^0x[0-9a-fA-F]{40}$/.test(v)) {
      localStorage.setItem(ADDR_STORAGE, v);
      localStorage.removeItem('walletAddress');
    }
  }
  if (!v || !/^0x[0-9a-fA-F]{40}$/.test(v)) return null;
  return v as `0x${string}`;
}

export function saveStoredAddress(addr: `0x${string}` | null) {
  if (!isBrowser()) return;
  localStorage.removeItem('walletAddress');
  if (addr) localStorage.setItem(ADDR_STORAGE, addr as `0x${string}`);
  else localStorage.removeItem(ADDR_STORAGE);
}

// ── Wallet client (for @gl.public.write) ─────────────────────────

let walletClient: ReturnType<typeof createClient> | null = null;
let walletAddress: `0x${string}` | null = null;
let connectedOnce = false;

function buildWalletClient(addr: `0x${string}`) {
  if (walletClient && walletAddress === addr) return walletClient;
  walletClient = createClient({ chain: testnetBradbury, account: addr });
  walletAddress = addr;
  connectedOnce = false;
  return walletClient;
}

export async function connectWallet(): Promise<`0x${string}`> {
  if (!isBrowser() || !window.ethereum) throw new NoWalletError();
  const accs = (await window.ethereum.request({ method: 'eth_requestAccounts' })) as string[];
  const addr = accs?.[0] as `0x${string}` | undefined;
  if (!addr) throw new Error('MetaMask returned no account.');
  saveStoredAddress(addr);
  const client = buildWalletClient(addr);
  try {
    await (client as any).connect('testnetBradbury');
    connectedOnce = true;
  } catch (e) {
    console.warn('[GenLayer] Snap connection failed, will retry before write:', e);
  }
  return addr;
}

export function disconnectWallet() {
  walletClient = null;
  walletAddress = null;
  connectedOnce = false;
  saveStoredAddress(null);
}

async function ensureConnected(addr: `0x${string}`) {
  if (connectedOnce && walletAddress === addr) return;
  const client = buildWalletClient(addr);
  try {
    await (client as any).connect('testnetBradbury');
    connectedOnce = true;
  } catch (e) {
    console.warn('[GenLayer] Snap reconnect failed, proceeding with write:', e);
  }
}

// ── Write + wait (signed via MetaMask) ────────────────────────────

async function writeAndWait(method: string, args: any[]): Promise<void> {
  if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured');
  const addr = loadStoredAddress();
  if (!addr) throw new WalletNotConnectedError();
  await ensureConnected(addr);
  const client = buildWalletClient(addr);
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args: args as never[],
    value: BigInt(0),
  });
  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
    interval: 2000,
  });
}

// ── AI helpers: writeContract (MetaMask consensus) → poll view method ──

async function writeThenPoll(
  writeMethod: string, writeArgs: any[],
  viewMethod: string,
): Promise<any> {
  const addr = loadStoredAddress();
  if (!addr) throw new WalletNotConnectedError();
  await ensureConnected(addr);
  const client = buildWalletClient(addr);

  // Submit — MetaMask signs, consensus runs, state persisted
  const writeResult: any = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: writeMethod,
    args: writeArgs as never[],
    value: BigInt(0),
  });

  const hash = typeof writeResult === 'string' ? writeResult : writeResult?.hash;

  // Poll transaction status until consensus_data is available
  const pollIntervalMs = 10000; // 10 seconds

  for (let attempt = 1; attempt <= 180; attempt++) {
    try {
      const tx: any = await (client as any).getTransaction({ hash });

      // Check if result is available (leader_receipt with readable payload)
      const lr = tx?.consensus_data?.leader_receipt?.[0];
      if (lr) {
        const raw = lr?.result?.payload?.readable || lr?.eq_outputs?.['0']?.payload?.readable;
        if (raw && typeof raw === 'string') {
          const p = JSON.parse(raw);
          const result = typeof p === 'string' ? JSON.parse(p) : p;
          if (result) return result;
        }
      }

      // Also try view method (TreeMap) - might be updated by now
      for (const variant of [addr, addr.toLowerCase()]) {
        try {
          const stored = await callView(viewMethod, [variant]);
          const str = typeof stored === 'string' ? stored : JSON.stringify(stored ?? '');
          if (str && str !== 'null' && str !== 'undefined' && str !== '{}' && str.trim() !== '' && str !== '""') {
            return stored;
          }
        } catch { /* try next */ }
      }
    } catch { /* retry */ }

    await new Promise(r => setTimeout(r, pollIntervalMs));
  }

  throw new Error('GenVM execution returned empty result.');
}

// ── 1. AI RECOMMENDATION ──────────────────────────────────────────

export async function getRecommendation(query: string, maxResults = 5) {
  return writeThenPoll('recommend', [query, BigInt(maxResults)], 'get_last_recommendation');
}

// ── 2. ITINERARY GENERATOR ────────────────────────────────────────

export async function generateItinerary(
  destination: string, days: number, budget: number,
  travelers: number, preferences: string,
) {
  return writeThenPoll(
    'generate_itinerary', [destination, days, budget, travelers, preferences],
    'get_last_itinerary',
  );
}

// ── 3. TRAVEL MATCH ────────────────────────────────────────────────

export async function matchByTravelVibe(imageHash: string, caption: string, maxResults = 5) {
  return writeThenPoll(
    'match_by_image', [imageHash, caption, maxResults],
    'get_last_match',
  );
}

// ── 4. HIDDEN GEMS ────────────────────────────────────────────────

export async function findHiddenGems(
  preferences: string, budgetMax = 0, category = 'any', maxResults = 10,
) {
  return writeThenPoll(
    'find_hidden_gems', [preferences, budgetMax, category, maxResults],
    'get_last_gems',
  );
}

// ── 5. ON-CHAIN STORAGE (write) ───────────────────────────────────

export async function saveTripToChain(tripData: Record<string, unknown>) {
  await writeAndWait('save_trip', [JSON.stringify(tripData)]);
  return loadStoredAddress()!
    ? await callView('get_user_trips', [loadStoredAddress()!])
    : null;
}

export async function saveRecommendationToChain(
  query: string, preferences: Record<string, unknown>,
  results: unknown[], consensusScore: number,
) {
  await writeAndWait('save_recommendation', [
    query, JSON.stringify(preferences), JSON.stringify(results), consensusScore,
  ]);
}

// ── VIEW (no wallet needed) ───────────────────────────────────────

export async function getTrip(tripId: string) {
  return callView('get_trip', [tripId]);
}

export async function getUserTrips(wallet: string) {
  return callView('get_user_trips', [wallet]);
}

export async function getChainStats() {
  return callView('get_stats', []);
}
