# TravelMind AI

AI-powered travel recommendation platform built on **GenLayer** Intelligent Contracts. Uses multi-validator consensus (Optimistic Democracy) to generate unbiased, transparent travel recommendations — no sponsored results, no hidden bias.

---

## How it works

```
User prompt → GenLayer contract → AI leader/validators (run_nondet_unsafe) → consensus → result
```

Every recommendation, itinerary, travel match, and hidden gem finding runs through a `run_nondet_unsafe` leader/validator pattern — a single `gl.nondet.exec_prompt` call inside an AI leader function, validated by a structural validator (`isinstance(leader, gl.vm.Return)`). The transaction is signed via MetaMask (GenLayer Snap) and settled on Bradbury testnet.

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

- `@gl.public.write` — AI methods: `recommend`, `generate_itinerary`, `match_by_image`, `find_hidden_gems` (all use `run_nondet_unsafe` with `exec_prompt`)
- `@gl.public.write` — Storage methods: `save_trip`, `save_recommendation`
- `@gl.public.view` — Read methods: `get_last_recommendation`, `get_last_itinerary`, `get_last_match`, `get_last_gems`, `get_trip`, `get_recommendation`, `get_user_trips`, `get_user_recommendations`, `get_stats`

All AI methods follow this pattern:
1. `leader_fn` calls `gl.nondet.exec_prompt` once; `validator_fn` checks the result is a `gl.vm.Return`
2. Results stored in a `TreeMap[str, str]` keyed by sender address (EIP-55 checksummed)
3. Frontend submits via `writeContract`, waits for receipt (`waitForTransactionReceipt` with `ACCEPTED` status), then reads data via `callView`

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
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0x6858C53D519CBE7C5f1149B262Ea7B30E618273f
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
│   └── about/                   # About page
├── genlayer.json                # GenLayer deployment config
└── .env                         # Environment variables
```

---

## Design Decisions

- **No fake data** — All stats, testimonials, and team content are real (from Supabase or the contract). No hallucinations.
- **Simplified prompts** — Concise prompts reduce LLM response time and malformed JSON from validators.
- **`_extract_json` / `_parse_recommendations`** — Handles malformed JSON and pipe-delimited output from validators using regex fallback and line-by-line parsing.
- **Store-then-read pattern** — AI methods store their result in a TreeMap before returning. The frontend `waitForTransactionReceipt(ACCEPTED)` then reads via `callView`.
- **`run_nondet_unsafe` with structural validator** — Leader runs `exec_prompt`; validator only checks the result type. This avoids consensus failures from minor formatting differences.
- **No `simulateWriteContract`** — All writes go through real `writeContract` with MetaMask signing.
