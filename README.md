# TravelMind AI

AI-powered travel recommendation platform built on **GenLayer** Intelligent Contracts. Uses multi-validator consensus (Optimistic Democracy) to generate unbiased, transparent travel recommendations — no sponsored results, no hidden bias.

---

## How it works

```
User prompt → GenLayer contract → AI leader generates recommendations → Validators evaluate via EqNonComparative → consensus → result
```

Every recommendation, itinerary, travel match, and hidden gem finding runs through `prompt_non_comparative` — a GenLayer equivalence principle where the leader generates output via LLM, and validators independently **evaluate** the output against objective criteria (rather than re-generating their own competing output). The transaction is signed via MetaMask (GenLayer Snap) and settled on Bradbury testnet.

### Features

- **AI Recommendation** — Describe your ideal trip in natural language; the AI extracts preferences and finds matching destinations
- **Itinerary Generator** — Generate day-by-day travel plans with daily highlights and cost estimates
- **Travel Match** — Describe a travel vibe (or reference an image) and find destinations with matching atmosphere
- **Hidden Gem Finder** — Discover off-the-beaten-path destinations before they become tourist hotspots
- **On-chain Storage** — Save trips and recommendations to the contract, keyed by your wallet address

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS, shadcn/ui |
| Smart Contract | Python (GenLayer Intelligent Contract) |
| Blockchain | GenLayer Testnet Bradbury (chain ID 4221) |
| SDK | genlayer-js |
| Wallet | MetaMask + GenLayer Snap |
| Database | Supabase (Postgres for destination catalog) |

---

## Architecture

### Contract (`contracts/TravelMindAI.py`)

A single `gl.Contract` with the following methods:

- `@gl.public.write` — AI methods: `recommend`, `generate_itinerary`, `match_by_image`, `find_hidden_gems` (all use `gl.eq_principle.prompt_non_comparative`)
- `@gl.public.write` — Storage methods: `save_trip`, `save_recommendation`
- `@gl.public.view` — Read methods: `get_last_recommendation`, `get_last_itinerary`, `get_last_match`, `get_last_gems`, `get_trip`, `get_recommendation`, `get_user_trips`, `get_user_recommendations`, `get_stats`

All AI methods follow this pattern:
1. `user_input()` returns the raw user parameters as JSON (no LLM call)
2. `EqNonComparativeLeader` template takes `task` + `input` + `criteria` → generates output via LLM
3. `EqNonComparativeValidator` template checks leader's output satisfies `criteria` given the `input`
4. Results stored in a `TreeMap[str, str]` keyed by sender address (EIP-55 checksummed)
5. Storage writes use fire-and-forget (no consensus wait); AI writes poll until ACCEPTED

### Frontend (`lib/genlayer.ts`)

- **Reads** (`@gl.public.view`) — `readContract` via read-only client (`callView`), no wallet needed. Tries `latest-nonfinal` first, falls back to `latest-final`.
- **Writes** (`@gl.public.write`) — `writeContract` signed by MetaMask → `waitForTransactionReceipt(ACCEPTED)` → `callView` to read result

---

## Getting Started

### Prerequisites

- Node.js 20+
- MetaMask browser extension
- GenLayer Snap installed (auto-installed on first `connectWallet`)
- Some Bradbury GEN tokens (use the [testnet faucet](https://testnet-faucet.genlayer.foundation))

### Setup

```bash
git clone <repo-url>
cd travelmind-ai
npm install
```

### Environment

```env
NEXT_PUBLIC_SUPABASE_URL=https://txabofbwpyojtusvcbrp.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
NEXT_PUBLIC_GENLAYER_RPC_URL=https://rpc-bradbury.genlayer.com
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0xdA9e0b6686D887Dce47676610D9B63F16Bd49099
```

### Dev

```bash
npm run dev
```

Open `http://localhost:3000`, connect your wallet (header → Connect Wallet), and try a recommendation.

---

## Deploying the Contract

1. Open [GenLayer Studio](https://studio.genlayer.com) or use GenLayer CLI
2. Set network: `genlayer network testnet-bradbury`
3. Paste `contracts/TravelMindAI.py`
4. Click **Get Schema** to verify the contract parses
5. Click **Deploy**, copy the printed address
6. Update `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` in `.env`

---

## Project Structure

```
travelmind-ai/
├── contracts/
│   └── TravelMindAI.py          # GenLayer Intelligent Contract
├── lib/
│   ├── genlayer.ts              # genlayer-js wrapper (read/write/view)
│   ├── supabase.ts              # Supabase client
│   └── utils.ts                 # Utility functions
├── components/
│   └── layout/
│       ├── header.tsx           # Navigation + wallet connection
│       └── footer.tsx           # Footer with safe links only
├── app/
│   ├── page.tsx                 # Landing page with real stats from Supabase
│   ├── recommendation/          # AI recommendation flow
│   ├── itinerary/               # Itinerary generator
│   ├── travel-match/            # Travel vibe matcher
│   ├── hidden-gems/             # Hidden gem finder
│   ├── dashboard/               # Saved trips & recommendations view
│   └── about/                   # About page
├── genlayer.json                # GenLayer deployment config
└── .env                         # Environment variables
```

---

## Design Decisions

### Why `prompt_non_comparative` instead of `run_nondet_unsafe` or `prompt_comparative`?

GenLayer offers several equivalence principles for LLM-based consensus. We chose `prompt_non_comparative` based on the nature of our task:

| Principle | Mechanism | Problem for TravelMind |
|-----------|-----------|----------------------|
| `strict_eq` | Exact byte-for-byte match | Impossible — different AI models never produce identical output |
| `prompt_comparative` | Both leader and validator generate independent output, then an LLM compares them | Heterogeneous validator LLMs recommend **different destinations** with **different scores**. Comparing "Bali" vs "Phuket" or `85` vs `72` via LLM always results in validators disagreeing → `UNDETERMINED` |
| `run_nondet_unsafe` with custom validator | Programmatic field-by-field comparison of leader vs validator output | Same fundamental problem: comparing destination names (`"Bali" != "Phuket"`) or scores (`|85-72| > 10%`) causes validators to reject. A structural-only check (ignoring content) defeats consensus purpose |
| **`prompt_non_comparative`** ✅ | Leader generates output via LLM; validators **evaluate** the output against criteria without generating their own | Validators don't need to agree on specific destinations — they verify the output is valid JSON, scores are in range 0-100, costs are reasonable, etc. This achieves **near 100% consensus** even across different AI models |

**Key insight**: Travel recommendations are inherently **subjective and creative** — different travel experts (or AI models) will naturally recommend different places. Forcing them to agree on the same destinations is counterproductive. Instead, validators check **quality and validity** of the leader's output against the user's query.

### Other decisions

- **No fake data** — All stats, testimonials, and team content are real (from Supabase or the contract). No hallucinations.
- **Simplified prompts** — Concise prompts reduce LLM response time and malformed JSON from validators.
- **Store-then-read pattern** — AI methods store their result in a TreeMap before returning. The frontend reads via `callView`.
- **Fire-and-forget storage writes** — `save_trip` and `save_recommendation` are pure storage writes with no AI calls, so the frontend submits them without waiting for consensus finalization.
- **No `simulateWriteContract`** — All writes go through real `writeContract` with MetaMask signing.
