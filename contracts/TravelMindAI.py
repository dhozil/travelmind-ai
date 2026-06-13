# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


def _fix_json(s):
    """Fix malformed JSON from AI validators: missing commas, trailing commas."""
    import re
    # Add missing commas between key-value pairs: "val""key" -> "val","key"
    s = re.sub(r'"([^"]*)"(\s*)"', r'"\1", "\2"', s, flags=re.DOTALL)
    # Add missing comma after value before next key: "val"  "key" -> "val", "key"
    s = re.sub(r'("[^"]*")(\s+)(?=")', r'\1,\2', s)
    # Remove trailing commas before } or ]
    s = re.sub(r',\s*([}\]])', r'\1', s)
    return s


def _to_dict(raw):
    """Convert prompt_comparative result to dict.
    Handles: dict (pass-through), str (strip code fences + parse JSON).
    """
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            first_nl = cleaned.find("\n")
            if first_nl != -1:
                cleaned = cleaned[first_nl + 1:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
        cleaned = cleaned.strip()
        try:
            return json.loads(cleaned)
        except Exception:
            pass
        cleaned = _fix_json(cleaned)
        try:
            return json.loads(cleaned)
        except Exception:
            pass
        cleaned = cleaned.replace(",}", "}").replace(",]", "]")
        return json.loads(cleaned)
    raise gl.vm.UserError("LLM did not return dict or string")


class TravelMindAI(gl.Contract):
    saved_trips: TreeMap[str, str]
    saved_recommendations: TreeMap[str, str]
    user_profiles: TreeMap[str, str]
    user_trip_count: TreeMap[str, bigint]
    user_rec_count: TreeMap[str, bigint]
    destinations_cache: TreeMap[str, str]
    last_recommendation: TreeMap[str, str]
    last_itinerary: TreeMap[str, str]
    last_match: TreeMap[str, str]
    last_gems: TreeMap[str, str]

    def __init__(self):
        pass

    # ═══════════════════════════════════════════════════════════════════
    # 1. AI RECOMMENDATION
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def recommend(self, query: str, max_results: bigint = 5) -> str:
        limit = int(max_results) if max_results > 0 else 5

        def do_all() -> str:
            return gl.nondet.exec_prompt(
                f"You are a travel expert. User query: \"{query}\"\n"
                f"Generate exactly {limit} destination recommendations.\n"
                "Return ONLY valid JSON with exactly 2 keys:\n"
                "1. \"preferences\": object with destination_type, budget_min, budget_max, "
                "duration_days, group_type, activities (array of 3-5 strings)\n"
                f"2. \"recommendations\": array of exactly {limit} objects, each with: "
                "name, location, description (1-2 sentences), match_score (int 0-100), "
                "best_season, estimated_cost {min, max} in USD\n"
                "Sort recommendations by match_score descending.",
                response_format="json",
            )

        raw = gl.eq_principle.prompt_comparative(
            do_all,
            "Both outputs must be valid JSON with exactly 2 keys: 'preferences' (dict) and "
            "'recommendations' (array of destination objects). Values may differ slightly.",
        )
        data = _to_dict(raw)
        prefs = data.get("preferences", {}) if isinstance(data, dict) else {}
        recs = data.get("recommendations", []) if isinstance(data, dict) else []
        if not isinstance(recs, list):
            recs = []
        result = json.dumps({
            "query": query,
            "preferences": prefs,
            "recommendations": recs[:limit],
            "validator_id": str(gl.message.sender_address),
        })
        self.last_recommendation[str(gl.message.sender_address)] = result
        return result

    # ═══════════════════════════════════════════════════════════════════
    # 2. ITINERARY GENERATOR
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def generate_itinerary(
        self, destination: str, days: bigint,
        budget: bigint, travelers: bigint, preferences: str,
    ) -> str:
        def plan_all() -> str:
            return gl.nondet.exec_prompt(
                f"Plan {int(days)} days in {destination}, budget ${int(budget)}, {preferences}. "
                "Return JSON: [{day:1, title:'...', highlights:['...'], cost:0}]",
                response_format="json",
            )

        raw = gl.eq_principle.prompt_comparative(
            plan_all,
            "Both must be valid JSON arrays.",
        )
        daily_plans = _to_dict(raw)
        if isinstance(daily_plans, dict):
            daily_plans = [daily_plans]
        total_cost = sum(p.get("cost", 0) for p in daily_plans)

        result = json.dumps({
            "destination": destination,
            "total_days": int(days),
            "daily_plans": daily_plans[:int(days)],
            "total_cost": total_cost,
        })
        self.last_itinerary[str(gl.message.sender_address)] = result
        return result

    # ═══════════════════════════════════════════════════════════════════
    # 3. TRAVEL MATCH
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def match_by_image(self, image_hash: str, caption: str, max_results: bigint = 5) -> str:
        def analyze_and_find() -> str:
            return gl.nondet.exec_prompt(
                f"Analyze this travel vibe and find matching destinations.\n"
                f"Image hash: {image_hash}, User caption: \"{caption}\"\n"
                "Return ONLY valid JSON with exactly 2 keys:\n"
                "1. \"image_analysis\": {{landscape_type, atmosphere, dominant_colors[], "
                "natural_elements[], human_activity_level 0-100, vibe_summary}}\n"
                f"2. \"matches\": array of exactly {int(max_results)} destinations, "
                "each with: name, location, why_match, match_score 0-100, "
                "estimated_cost {{min,max}}, image_vibe_match 0-100, description.\n"
                "Sorted by match_score descending.",
                response_format="json",
            )

        raw = gl.eq_principle.prompt_comparative(
            analyze_and_find,
            "Both outputs must be valid JSON with 'image_analysis' and 'matches'. "
            "The contract uses the first result.",
        )
        data = _to_dict(raw)
        result = json.dumps({
            "image_analysis": data.get("image_analysis", {}),
            "matches": data.get("matches", [])[:int(max_results)],
        })
        self.last_match[str(gl.message.sender_address)] = result
        return result

    # ═══════════════════════════════════════════════════════════════════
    # 4. HIDDEN GEM FINDER
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def find_hidden_gems(
        self, preferences: str,
        budget_max: bigint = 0, category: str = "any", max_results: bigint = 10,
    ) -> str:
        def discover_and_verify() -> str:
            return gl.nondet.exec_prompt(
                f"Find {int(max_results)} hidden gem destinations.\n"
                f"Query: \"{preferences}\"\n"
                f"Max budget: ${int(budget_max)}, Category: {category}\n"
                "Hidden = not widely known, authentic, minimal commercial tourism.\n"
                "For each gem, self-verify: assess popularity, tourist traffic, authenticity, "
                "social media presence, infrastructure.\n"
                "Return ONLY a JSON array. Each element:\n"
                "  name, location, description, hidden_score 0-100, "
                "estimated_cost {{min,max}} USD, why_hidden, best_season, tags[], "
                "authenticity_rating 0-100, comparable_popular_spot, "
                "verification: {{is_hidden bool, confidence 0-100, reasons[], why_authentic}}.\n"
                "Sorted by hidden_score descending.",
                response_format="json",
            )

        raw = gl.eq_principle.prompt_comparative(
            discover_and_verify,
            "Both outputs must be valid JSON arrays with the same structure. "
            "The contract uses the first result.",
        )
        gems = _to_dict(raw)
        if isinstance(gems, dict):
            gems = [gems]
        result = json.dumps({"hidden_gems": gems[:int(max_results)]})
        self.last_gems[str(gl.message.sender_address)] = result
        return result

    # ═══════════════════════════════════════════════════════════════════
    # 5. ON-CHAIN STORAGE
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def save_trip(self, trip_data: str) -> str:
        import time
        sender = str(gl.message.sender_address)
        count = int(self.user_trip_count.get(sender, 0)) + 1
        ts = int(time.time())
        trip_id = f"trip_{count}_{ts}"
        record = json.dumps({
            "id": trip_id,
            "wallet": sender,
            "data": json.loads(trip_data) if trip_data.strip().startswith("{") else {},
            "created_at": ts,
            "onchain_verified": True,
        })
        self.saved_trips[trip_id] = record
        self.user_trip_count[sender] = count
        return record

    @gl.public.write
    def save_recommendation(self, query: str, preferences: str, results: str, consensus_score: bigint) -> str:
        import time
        sender = str(gl.message.sender_address)
        ts = int(time.time())
        count = int(self.user_rec_count.get(sender, 0)) + 1
        rec_id = f"rec_{ts}_{sender[-8:]}"
        record = json.dumps({
            "id": rec_id,
            "wallet": sender,
            "query": query,
            "preferences": json.loads(preferences) if preferences.strip().startswith("{") else {},
            "results": json.loads(results) if results.strip().startswith("[") or results.strip().startswith("{") else [],
            "consensus_score": int(consensus_score),
            "created_at": ts,
        })
        self.saved_recommendations[rec_id] = record
        self.user_rec_count[sender] = count
        return record

    @gl.public.view
    def get_trip(self, trip_id: str) -> str:
        return self.saved_trips.get(trip_id, "")

    @gl.public.view
    def get_recommendation(self, rec_id: str) -> str:
        return self.saved_recommendations.get(rec_id, "")

    @gl.public.view
    def get_user_trips(self, wallet: str) -> str:
        trips = []
        for tid, tdata in self.saved_trips.items():
            try:
                t = json.loads(tdata)
                if t.get("wallet") == wallet:
                    trips.append(t)
            except Exception:
                pass
        return json.dumps(trips)

    @gl.public.view
    def get_user_recommendations(self, wallet: str) -> str:
        recs = []
        for rid, rdata in self.saved_recommendations.items():
            try:
                r = json.loads(rdata)
                if r.get("wallet") == wallet:
                    recs.append(r)
            except Exception:
                pass
        return json.dumps(recs)

    @gl.public.view
    def get_stats(self) -> str:
        return json.dumps({
            "total_trips": len(self.saved_trips),
            "total_recommendations": len(self.saved_recommendations),
            "total_users": len(self.user_trip_count),
        })

    @gl.public.view
    def get_last_recommendation(self, wallet: str) -> str:
        return self.last_recommendation.get(wallet, "")

    @gl.public.view
    def get_last_itinerary(self, wallet: str) -> str:
        return self.last_itinerary.get(wallet, "")

    @gl.public.view
    def get_last_match(self, wallet: str) -> str:
        return self.last_match.get(wallet, "")

    @gl.public.view
    def get_last_gems(self, wallet: str) -> str:
        return self.last_gems.get(wallet, "")
