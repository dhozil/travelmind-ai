# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import re as regex_mod


def _clean_json(text: str) -> str:
    """Remove markdown code fences from LLM output."""
    backticks = "``" + "`"
    text = text.replace(backticks + "json", "").replace(backticks, "")
    return text.strip()


def _extract_json(text: str) -> dict:
    """Best-effort JSON extraction from LLM output."""
    text = _clean_json(text)
    try:
        return json.loads(text)
    except (json.JSONDecodeError, ValueError):
        pass
    match = regex_mod.search(r"\{[\s\S]*\}", text)
    if match:
        try:
            return json.loads(match.group(0))
        except (json.JSONDecodeError, ValueError):
            pass
    return {}


def _fix_json(s: str) -> str:
    """Fix malformed JSON: missing commas, trailing commas."""
    s = regex_mod.sub(r'"([^"]*)"(\s*)"', r'"\1", "\2"', s, flags=regex_mod.DOTALL)
    s = regex_mod.sub(r'("[^"]*")(\s+)(?=")', r'\1,\2', s)
    s = regex_mod.sub(r',\s*([}\]])', r'\1', s)
    return s


def _safe_json(raw) -> dict:
    """Parse JSON from dict or str, with fix fallback."""
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        result = _extract_json(raw)
        if result:
            return result
        fixed = _fix_json(raw)
        result = _extract_json(fixed)
        if result:
            return result
    return {}


def _normalize_recommendations(data: dict, query: str, limit: int) -> dict:
    """Ensure recommendations response has correct structure."""
    prefs = data.get("preferences", {})
    if not isinstance(prefs, dict):
        prefs = {}
    recs = data.get("recommendations", [])
    if not isinstance(recs, list):
        recs = []
    # Clean up each recommendation
    clean_recs = []
    for r in recs[:limit]:
        if not isinstance(r, dict):
            continue
        clean_recs.append({
            "name": str(r.get("name", "Unknown")),
            "location": str(r.get("location", "Unknown")),
            "description": str(r.get("description", "")),
            "match_score": int(r.get("match_score", 50)),
            "best_season": str(r.get("best_season", "Year-round")),
            "estimated_cost": r.get("estimated_cost", {"min": 0, "max": 0}),
        })
    return {"preferences": prefs, "recommendations": clean_recs}


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

        def build_prompt() -> str:
            return (
                f"You are a travel expert. User query: \"{query}\"\n"
                f"Generate exactly {limit} destination recommendations.\n"
                "You MUST return valid JSON. No markdown, no code fences.\n"
                "Format: {\"preferences\":{...},\"recommendations\":[...]}\n"
                "preferences keys: destination_type, budget_min, budget_max, "
                "duration_days, group_type, activities (array of 3-5 strings)\n"
                f"recommendations: array of {limit} objects with: "
                "name, location, description (1-2 sentences), match_score (int 0-100), "
                "best_season, estimated_cost {min, max} in USD\n"
                "Sort by match_score descending."
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"preferences": {}, "recommendations": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_recs = len(leader.calldata.get("recommendations", []))
            v_recs = len(mine.get("recommendations", []))
            if abs(l_recs - v_recs) > 2:
                return False
            l_prefs = leader.calldata.get("preferences", {})
            v_prefs = mine.get("preferences", {})
            if type(l_prefs) != type(v_prefs):
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        data = _safe_json(raw) if not isinstance(raw, dict) else raw
        data = _normalize_recommendations(data, query, limit)
        prefs = data.get("preferences", {})
        recs = data.get("recommendations", [])
        result = json.dumps({
            "query": query,
            "preferences": prefs,
            "recommendations": recs,
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
        def build_prompt() -> str:
            return (
                f"Plan {int(days)} days in {destination}, budget ${int(budget)}, {preferences}.\n"
                "You MUST return valid JSON. No markdown, no code fences.\n"
                "Format: [{\"day\":1,\"title\":\"...\",\"highlights\":[\"...\"],\"cost\":0}]"
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            if isinstance(res, list):
                return {"daily_plans": res}
            return {"daily_plans": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_plans = leader.calldata.get("daily_plans", leader.calldata if isinstance(leader.calldata, list) else [])
            v_plans = mine.get("daily_plans", [])
            if not isinstance(l_plans, list):
                l_plans = []
            if not isinstance(v_plans, list):
                v_plans = []
            if abs(len(l_plans) - len(v_plans)) > 1:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        
        # Parse result
        if isinstance(raw, dict):
            daily_plans = raw.get("daily_plans", [])
        elif isinstance(raw, list):
            daily_plans = raw
        else:
            daily_plans = []
        
        # Normalize to flat list of day objects
        flat = []
        if isinstance(daily_plans, dict):
            for key in ["plan", "itinerary", "days", "items"]:
                if key in daily_plans and isinstance(daily_plans[key], list):
                    flat = daily_plans[key]
                    break
            if not flat:
                flat = [daily_plans]
        elif isinstance(daily_plans, list):
            for item in daily_plans:
                if isinstance(item, dict):
                    found = False
                    for key in ["plan", "itinerary", "days", "items"]:
                        if key in item and isinstance(item[key], list):
                            flat.extend(item[key])
                            found = True
                            break
                    if not found:
                        flat.append(item)
                elif isinstance(item, list):
                    flat.extend(item)
        
        total_cost = sum(
            p.get("total_cost", p.get("cost", 0))
            for p in flat
            if isinstance(p, dict)
        )

        result = json.dumps({
            "destination": destination,
            "total_days": int(days),
            "daily_plans": flat[:int(days)],
            "total_cost": total_cost,
        })
        self.last_itinerary[str(gl.message.sender_address)] = result
        return result

    # ═══════════════════════════════════════════════════════════════════
    # 3. TRAVEL MATCH
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def match_by_image(self, image_hash: str, caption: str, max_results: bigint = 5) -> str:
        def build_prompt() -> str:
            return (
                f"Analyze this travel vibe and find matching destinations.\n"
                f"Image hash: {image_hash}, User caption: \"{caption}\"\n"
                "You MUST return valid JSON. No markdown, no code fences.\n"
                "Format: {\"image_analysis\":{...},\"matches\":[...]}\n"
                "image_analysis keys: landscape_type, atmosphere, dominant_colors, "
                "natural_elements, human_activity_level (0-100), vibe_summary\n"
                f"matches: array of {int(max_results)} destinations with: "
                "name, location, why_match, match_score (0-100), "
                "estimated_cost {min,max}, image_vibe_match (0-100), description."
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, dict):
                return res
            return {"image_analysis": {}, "matches": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_matches = len(leader.calldata.get("matches", []))
            v_matches = len(mine.get("matches", []))
            if abs(l_matches - v_matches) > 2:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        data = _safe_json(raw) if not isinstance(raw, dict) else raw
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
        def build_prompt() -> str:
            return (
                f"Find {int(max_results)} hidden gem destinations.\n"
                f"Query: \"{preferences}\"\n"
                f"Max budget: ${int(budget_max)}, Category: {category}\n"
                "Hidden = not widely known, authentic, minimal commercial tourism.\n"
                "You MUST return valid JSON. No markdown, no code fences.\n"
                "Format: [{\"name\":\"...\",\"location\":\"...\",\"description\":\"...\","
                "\"hidden_score\":0-100,\"estimated_cost\":{\"min\":0,\"max\":0},"
                "\"why_hidden\":\"...\",\"best_season\":\"...\",\"tags\":[],"
                "\"authenticity_rating\":0-100,\"comparable_popular_spot\":\"...\"}]"
            )

        def leader_fn() -> dict:
            p = build_prompt()
            res = gl.nondet.exec_prompt(p, response_format="json")
            if isinstance(res, list):
                return {"hidden_gems": res}
            if isinstance(res, dict):
                return res
            return {"hidden_gems": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            if not isinstance(leader, gl.vm.Return):
                return False
            mine = leader_fn()
            l_gems = leader.calldata.get("hidden_gems", leader.calldata if isinstance(leader.calldata, list) else [])
            v_gems = mine.get("hidden_gems", [])
            if not isinstance(l_gems, list):
                l_gems = []
            if not isinstance(v_gems, list):
                v_gems = []
            if abs(len(l_gems) - len(v_gems)) > 3:
                return False
            return True

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        
        if isinstance(raw, dict):
            gems = raw.get("hidden_gems", [])
        elif isinstance(raw, list):
            gems = raw
        else:
            gems = []
        
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
