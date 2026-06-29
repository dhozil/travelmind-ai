import { createClient } from 'genlayer-js';
import { testnetBradbury } from 'genlayer-js/chains';
import { TransactionStatus, TransactionHashVariant } from 'genlayer-js/types';
import { getAddress } from 'viem';

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

/**
 * Try to convert GenLayer text-format output to a structured object.
 * Accepts JSON first; if that fails, tokenizes pipe-delimited text and
 * groups known recommendation keys into objects.
 */
function parseGenLayerResult(val: unknown): unknown {
  if (typeof val !== 'string' || val.length < 10) return val;

  // 1. Try JSON
  if (val.startsWith('{')) {
    try { return JSON.parse(val); } catch { /* not json */ }
  }

  if (!val.includes(' | ')) return val;

  const tokens = val.split(' | ').map(t => t.trim()).filter(Boolean);
  if (tokens.length < 4) return val;

  const recIdx = tokens.findIndex(t => /^recommendations?-?\d*$/.test(t));
  if (recIdx === -1) return val;

  const prefs: Record<string, string> = {};
  const REC_KEYS = new Set(['best_season', 'description', 'estimated_cost', 'location', 'match_score', 'name']);

  // Preferences are alternating key:value pairs before the rec section
  for (let i = 1; i + 1 < recIdx; i += 2) {
    prefs[tokens[i]] = tokens[i + 1];
  }

  // Recommendations: flat alternating key:value pairs after the rec header
  const recs: Array<Record<string, string>> = [];
  let i = recIdx + 1;
  while (i + 1 < tokens.length) {
    const key = tokens[i];
    if (!REC_KEYS.has(key)) { i++; continue; }
    const rec: Record<string, string> = { [key]: tokens[i + 1] };
    i += 2;
    while (i + 1 < tokens.length) {
      if (!REC_KEYS.has(tokens[i])) { i++; continue; }
      // best_season appearing again means this is a new rec — push current, break
      if (tokens[i] === 'best_season' && Object.keys(rec).length > 0) {
        recs.push(rec);
        break;
      }
      rec[tokens[i]] = tokens[i + 1];
      i += 2;
    }
    // If we exhausted tokens without hitting a second 'best_season', push final
    if (i >= tokens.length && Object.keys(rec).length > 0) {
      // Check it's not already in recs
      if (!recs.includes(rec)) recs.push(rec);
    }
  }

  if (recs.length === 0) return val;
  const result: Record<string, unknown> = {};
  if (Object.keys(prefs).length > 0) result.preferences = prefs;
  result.recommendations = recs;
  return result;
}

async function callView(method: string, args: any[]): Promise<unknown> {
  if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured');
  const client = getReadonlyClient();
  const variants = [TransactionHashVariant.LATEST_NONFINAL, TransactionHashVariant.LATEST_FINAL];
  for (const v of variants) {
    try {
      const raw = await client.readContract({
        address: CONTRACT_ADDRESS,
        functionName: method,
        args,
        transactionHashVariant: v,
        jsonSafeReturn: true,
      });
      if (raw === null || raw === undefined) continue;
      if (typeof raw === 'string') {
        if (raw.length <= 2) continue;
        try { return JSON.parse(raw); } catch { return raw; }
      }
      if (typeof raw === 'object') {
        const str = JSON.stringify(raw);
        if (str && str.length > 2 && str !== '{}' && str !== '[]' && str !== '""') return raw;
      }
      return raw;
    } catch { continue; }
  }
  return null;
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

export async function simulateWriteLeaderOnly(method: string, args: any[]): Promise<unknown> {
  if (!CONTRACT_ADDRESS) throw new Error('Contract address not configured');
  const client = getReadonlyClient();
  const result = await client.simulateWriteContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args,
    leaderOnly: true,
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
    } catch (e: any) { if (attempt <= 2) console.warn('[GenLayer] pollView callView error:', e?.message || e); }
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
  // Re-authorize MetaMask (safe to call multiple times, no prompt if already authorized)
  if (typeof window !== 'undefined' && window.ethereum) {
    try {
      await window.ethereum.request({ method: 'eth_requestAccounts', params: [] });
    } catch (e) {
      console.warn('[GenLayer] eth_requestAccounts failed:', e);
    }
  }
  try {
    await (client as any).connect('testnetBradbury');
    connectedOnce = true;
  } catch (e) {
    console.warn('[GenLayer] Snap reconnect failed, proceeding with write:', e);
  }
}

// ── Write + wait (signed via MetaMask) ────────────────────────────

async function writeAndWait(method: string, args: any[]): Promise<string> {
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
    consensusMaxRotations: 1,
  });
  await client.waitForTransactionReceipt({
    hash,
    status: TransactionStatus.ACCEPTED,
    retries: 200,
    interval: 2000,
  });
  return hash;
}

// ── AI helpers: submit tx, poll until accepted, extract result ─────

/**
 * Poll until ACCEPTED / FINALIZED, extract return value from debug trace.
 * On timeout returns null so the caller can try a view-method fallback
 * (the tx may still finalize on testnet — don't throw prematurely).
 */
async function pollUntilAccepted(hash: string, client: any, timeoutMs: number): Promise<any> {
  const deadline = Date.now() + timeoutMs;
  const started = Date.now();
  let lastLog = '';

  while (Date.now() < deadline) {
    const elapsed = Math.round((Date.now() - started) / 1000);

    let tx: any;
    try {
      tx = await (client as any).getTransaction({ hash });
    } catch (e: any) {
      console.warn(`[GenLayer] getTransaction error (${elapsed}s):`, e?.message || e);
      await new Promise(r => setTimeout(r, 5000));
      continue;
    }

    const status: string = tx?.statusName ?? '';

    if (status === 'CANCELED') {
      throw new Error('GenLayer transaction was canceled.');
    }

    // Only try debug trace once leader has revealed their data
    if (['LEADER_REVEALING', 'REVEALING', 'ACCEPTED', 'FINALIZED', 'UNDETERMINED'].includes(status)) {
      try {
        const trace = await (client as any).debugTraceTransaction({ hash, round: 0 });
        if (trace?.return_value) {
          console.log(`[GenLayer] data extracted from trace (status: ${status})`);
          return trace.return_value;
        }
      } catch {
        // trace not yet available
      }
    }

    if (status === 'ACCEPTED' || status === 'FINALIZED' || status === 'UNDETERMINED') {
      return null;
    }

    const logLine = `[GenLayer] tx status: ${status} (${elapsed}s)`;
    if (logLine !== lastLog) {
      console.log(logLine);
      lastLog = logLine;
    }
    await new Promise(r => setTimeout(r, 5000));
  }

  // Timeout — don't throw, let caller attempt view-method fallback
  console.warn(`[GenLayer] poll timeout (${timeoutMs / 1000}s), trying view-method fallback. Explorer: https://explorer-bradbury.genlayer.com/tx/${hash}`);
  return null;
}

async function writeThenPoll(
  writeMethod: string, writeArgs: any[],
  viewMethod: string,
  timeoutMs = 3600000, // 60 min (testnet appeal + finalization window can take ~45 min)
): Promise<any> {
  const addr = loadStoredAddress();
  if (!addr) throw new WalletNotConnectedError();
  await ensureConnected(addr);
  const client = buildWalletClient(addr);

  // Build unique address formats to try (for view-method fallback)
  const addrVariants: string[] = [addr];
  try { addrVariants.push(getAddress(addr)); } catch {}
  const lower = addr.toLowerCase();
  if (!addrVariants.includes(lower)) addrVariants.push(lower);

  // 1. Submit transaction (gas estimation fails for AI contracts, use high fallback)
  console.log('[GenLayer] submitting tx...');
  const origEstimate = client.estimateTransactionGas.bind(client);
  (client as any).estimateTransactionGas = async (args: any) => {
    try { return await origEstimate(args); }
    catch { console.warn('[GenLayer] gas estimation failed, using 5_000_000'); return BigInt(5000000); }
  };
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: writeMethod,
    args: writeArgs as never[],
    value: BigInt(0),
    consensusMaxRotations: 1,
  });
  (client as any).estimateTransactionGas = origEstimate;
  console.log('[GenLayer] tx hash:', hash);
  console.log('[GenLayer] explorer: https://explorer-bradbury.genlayer.com/tx/' + hash);

  // 2. Poll until ACCEPTED or FINALIZED (skip UNDETERMINED + appeal)
  console.log('[GenLayer] waiting for acceptance (max ' + (timeoutMs / 1000) + 's)...');
  const receiptResult = await pollUntilAccepted(hash, client, timeoutMs);

  // 3. Try view method as final fallback (receipt extraction failed)
  if (receiptResult === null) {
    console.log('[GenLayer] fallback: reading from view method...');
    for (let i = 0; i < 120; i++) {
      for (const variant of addrVariants) {
        try {
          const stored = await callView(viewMethod, [variant]);
          const str = typeof stored === 'string' ? stored : JSON.stringify(stored ?? '');
          if (str && str.length > 2 && str !== 'null' && str !== 'undefined' && str !== '{}' && str.trim() !== '' && str !== '""') {
            console.log('[GenLayer] data found from view method');
            return stored;
          }
        } catch {}
      }
      await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('Transaction accepted but data not available in view method after polling.');
  }

  return receiptResult;
}

/** Unwrap raw GenLayer return value into a page-friendly JS object */
function unwrapAndParse(val: unknown): any {
  const unwrapped = unwrapResult(val);
  return unwrapped !== val ? unwrapAndParse(unwrapped) : parseGenLayerResult(unwrapped);
}

// ── 1. AI RECOMMENDATION ──────────────────────────────────────────

export async function getRecommendation(query: string, maxResults = 5) {
  const raw = await writeThenPoll('recommend', [query, BigInt(maxResults)], 'get_last_recommendation');
  return unwrapAndParse(raw);
}

// ── 2. ITINERARY GENERATOR ────────────────────────────────────────

export async function generateItinerary(
  destination: string, days: number, budget: number,
  travelers: number, preferences: string,
) {
  const raw = await writeThenPoll(
    'generate_itinerary', [destination, days, budget, travelers, preferences],
    'get_last_itinerary',
  );
  return unwrapAndParse(raw);
}

// ── 3. TRAVEL MATCH ────────────────────────────────────────────────

export async function matchByTravelVibe(imageHash: string, caption: string, maxResults = 5) {
  const raw = await writeThenPoll(
    'match_by_image', [imageHash, caption, maxResults],
    'get_last_match',
  );
  return unwrapAndParse(raw);
}

// ── 4. HIDDEN GEMS ────────────────────────────────────────────────

export async function findHiddenGems(
  preferences: string, budgetMax = 0, category = 'any', maxResults = 10,
) {
  const raw = await writeThenPoll(
    'find_hidden_gems', [preferences, budgetMax, category, maxResults],
    'get_last_gems',
  );
  return unwrapAndParse(raw);
}

// ── 5. ON-CHAIN STORAGE (write) ───────────────────────────────────

/** Submit a simple write tx (no AI/consensus) and return immediately. */
async function writeOnly(method: string, args: any[]): Promise<string> {
  const addr = loadStoredAddress();
  if (!addr) throw new WalletNotConnectedError();
  await ensureConnected(addr);
  const client = buildWalletClient(addr);
  const hash = await client.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: method,
    args: args as never[],
    value: BigInt(0),
    consensusMaxRotations: 1,
  });
  console.log(`[GenLayer] submitted ${method}, hash:`, hash);
  return hash;
}

export async function saveTripToChain(tripData: Record<string, unknown>) {
  await writeOnly('save_trip', [JSON.stringify(tripData)]);
}

export async function saveRecommendationToChain(
  query: string, preferences: Record<string, unknown>,
  results: unknown[], consensusScore: number,
) {
  await writeOnly('save_recommendation', [
    query, JSON.stringify(preferences), JSON.stringify(results), consensusScore,
  ]);
}

// ── VIEW (no wallet needed) ───────────────────────────────────────

export async function getTrip(tripId: string) {
  return callView('get_trip', [tripId]);
}

function walletVariants(addr: string): string[] {
  const variants = [addr];
  try { const c = getAddress(addr); if (!variants.includes(c)) variants.push(c); } catch {}
  const l = addr.toLowerCase();
  if (!variants.includes(l)) variants.push(l);
  return variants;
}

export async function getUserTrips(wallet: string) {
  for (const v of walletVariants(wallet)) {
    const res = await callView('get_user_trips', [v]);
    if (res != null) {
      const parsed = typeof res === 'string' ? JSON.parse(res || '[]') : res;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  }
  return [];
}

export async function getUserRecommendations(wallet: string) {
  for (const v of walletVariants(wallet)) {
    const res = await callView('get_user_recommendations', [v]);
    if (res != null) {
      const parsed = typeof res === 'string' ? JSON.parse(res || '[]') : res;
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  }
  return [];
}

export async function getChainStats() {
  return callView('get_stats', []);
}
