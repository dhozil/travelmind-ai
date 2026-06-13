# TravelMind AI

AI-powered travel recommendation platform built on **GenLayer** Intelligent Contracts. Uses multi-validator consensus (Optimistic Democracy) to generate unbiased, transparent travel recommendations — no sponsored results, no hidden bias.

---

## How it works

```
User prompt → GenLayer contract → AI validators (prompt_comparative) → consensus → result
```

Every recommendation, itinerary, travel match, and hidden gem finding goes through GenLayer's `prompt_comparative` consensus mechanism. Multiple independent validators run the same prompt, and the contract reconciles their outputs. The transaction is signed via MetaMask (GenLayer Snap) and settled on Studionet.

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
| Blockchain | GenLayer Studionet (chain ID 61999) |
| SDK | genlayer-js |
| Wallet | MetaMask + GenLayer Snap |
| Database | Supabase (Postgres for destination catalog) |

---

## Architecture

### Contract (`contracts/TravelMindAI.py`)

A single `gl.Contract` with five feature domains:

- `@gl.public.write` — AI methods that require multi-validator consensus: `recommend`, `generate_itinerary`, `match_by_image`, `find_hidden_gems`
- `@gl.public.write` — Storage methods: `save_trip`, `save_recommendation`
- `@gl.public.view` — Read methods: `get_trip`, `get_last_recommendation`, `get_stats`, etc.

All AI methods follow the PatchworkTruth pattern:
1. One `gl.nondet.exec_prompt` wrapped in one `gl.eq_principle.prompt_comparative` (2 validators)
2. Result stored in a `TreeMap[str, str]` keyed by sender address
3. Frontend polls the corresponding `get_last_*` view method after the transaction is accepted

### Frontend (`lib/genlayer.ts`)

- **Reads** (`@gl.public.view`) — `readContract` via read-only client, no wallet needed
- **Writes** (`@gl.public.write`) — `writeContract` signed by MetaMask, `waitForTransactionReceipt(ACCEPTED)`, then poll view getter

---

## Getting Started

### Prerequisites

- Node.js 20+
- MetaMask browser extension
- GenLayer Snap installed (auto-installed on first `connectWallet`)
- Some Studionet GEN tokens (use the [Studio faucet](https://studio.genlayer.com))

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
NEXT_PUBLIC_GENLAYER_RPC_URL=https://studio.genlayer.com/api
NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS=0xBF4E4D22928942F85ee2CBa357Fcd6773AE65E21
```

### Dev

```bash
npm run dev
```

Open `http://localhost:3000`, connect your wallet (header → Connect Wallet), and try a recommendation.

---

## Deploying the Contract

1. Open [studio.genlayer.com](https://studio.genlayer.com)
2. Paste `contracts/TravelMindAI.py`
3. Click **Get Schema** to verify the contract parses
4. Click **Deploy**, copy the printed address
5. Update `NEXT_PUBLIC_GENLAYER_CONTRACT_ADDRESS` in `.env`

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
- **`_to_dict` with JSON repair** — Handles missing commas and trailing commas from AI validators using regex fix before parsing.
- **Store-then-poll pattern** — AI methods store their result in a TreeMap before returning. The frontend polls a `@gl.public.view` getter after the transaction is accepted.
- **`prompt_comparative` with lenient criteria** — Comparison criteria is kept minimal ("Both are valid responses") to avoid consensus failures from minor formatting differences.
- **No `simulateWriteContract`** — All writes go through real `writeContract` with MetaMask signing.
