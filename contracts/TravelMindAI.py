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


def _parse_recommendations(text: str) -> list:
    """Parse pipe-delimited recommendation text into list of dicts."""
    recs = []
    
    # Split by '6' as record separator
    sections = text.split("6")
    
    for section in sections:
        section = section.strip()
        if not section or len(section) < 20:
            continue
        
        # Skip the header "recommendations" part
        if section.startswith("recommendations"):
            section = section.replace("recommendations", "", 1).strip(" -|")
            if not section:
                continue
        
        rec = {"name": "", "location": "", "description": "", "best_season": "", "match_score": 75}
        
        # Split by pipe
        parts = [p.strip() for p in section.split("|") if p.strip()]
        
        for part in parts:
            p = part.strip()
            pl = p.lower()
            
            if "best_season" in pl:
                val = p.split("best_season", 1)[-1].strip(": -")
                if val:
                    rec["best_season"] = val
            elif "description" in pl:
                val = p.split("description", 1)[-1].strip(": -")
                if val:
                    rec["description"] = val[:300]
            elif "location" in pl:
                val = p.split("location", 1)[-1].strip(": -<>DdLl,")
                if val:
                    rec["location"] = val
            elif "match_score" in pl:
                val = p.split("match_score", 1)[-1].strip(": -")
                try:
                    rec["match_score"] = int(val)
                except:
                    pass
            elif "name" in pl:
                val = p.split("name", 1)[-1].strip(": -<>DdLl,")
                if val:
                    rec["name"] = val
        
        # If no name found, try to extract from beginning
        if not rec["name"]:
            # Look for capitalized words at start
            m = regex_mod.match(r'^([A-Z][a-zA-Z\s&\'-]+?)(?:\s*\||\s*6|$)', section)
            if m:
                candidate = m.group(1).strip()
                if len(candidate) > 3:
                    rec["name"] = candidate
        
        if rec["description"] or rec["location"] or rec["name"]:
            rec.setdefault("estimated_cost", {"min": 500, "max": 2000})
            recs.append(rec)
    
    return recs


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

        def leader_fn() -> dict:
            prompt = (
                f"Recommend {limit} travel destinations for: {query}\n"
                "Return JSON: {\"recommendations\":[{\"name\":\"...\",\"location\":\"...\","
                "\"description\":\"...\",\"match_score\":85,\"best_season\":\"...\","
                "\"estimated_cost\":{\"min\":500,\"max\":2000}}]}"
            )
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            return {"recommendations": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            # Accept leader result directly - no second LLM call
            return isinstance(leader, gl.vm.Return)

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        
        # Try JSON first, then pipe format
        if isinstance(raw, dict):
            result = raw
        elif isinstance(raw, str):
            result = _extract_json(raw)
            if not result or not result.get("recommendations"):
                # Try pipe format parsing
                recs = _parse_recommendations(raw)
                if recs:
                    result = {"recommendations": recs}
                else:
                    result = {"recommendations": []}
        else:
            result = {"recommendations": []}

        recs = result.get("recommendations", [])
        if not isinstance(recs, list):
            recs = []

        # Clean each recommendation
        clean_recs = []
        for r in recs[:limit]:
            if not isinstance(r, dict):
                continue
            est = r.get("estimated_cost", {})
            if isinstance(est, dict):
                cost_min = est.get("min", 0)
                cost_max = est.get("max", 0)
            else:
                cost_min = 0
                cost_max = 0
            clean_recs.append({
                "name": str(r.get("name", "Unknown")),
                "location": str(r.get("location", "Unknown")),
                "description": str(r.get("description", "")),
                "match_score": int(r.get("match_score", 75)),
                "best_season": str(r.get("best_season", "Year-round")),
                "estimated_cost": {"min": int(cost_min), "max": int(cost_max)},
            })

        out = json.dumps({
            "query": query,
            "preferences": result.get("preferences", {}),
            "recommendations": clean_recs,
            "validator_id": str(gl.message.sender_address),
        })
        self.last_recommendation[str(gl.message.sender_address)] = out
        return out

    # ═══════════════════════════════════════════════════════════════════
    # 2. ITINERARY GENERATOR
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def generate_itinerary(
        self, destination: str, days: bigint,
        budget: bigint, travelers: bigint, preferences: str,
    ) -> str:
        def leader_fn() -> dict:
            prompt = (
                f"Plan {int(days)} days in {destination}, budget ${int(budget)}, {preferences}\n"
                "Return JSON: {\"daily_plans\":[{\"day\":1,\"title\":\"...\","
                "\"highlights\":[\"...\"],\"cost\":100}]}"
            )
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            if isinstance(res, list):
                return {"daily_plans": res}
            return {"daily_plans": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            return isinstance(leader, gl.vm.Return)

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"daily_plans": []}

        plans = result.get("daily_plans", [])
        if not isinstance(plans, list):
            plans = []

        # Normalize nested structures
        flat = []
        for item in plans:
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

        out = json.dumps({
            "destination": destination,
            "total_days": int(days),
            "daily_plans": flat[:int(days)],
            "total_cost": total_cost,
        })
        self.last_itinerary[str(gl.message.sender_address)] = out
        return out

    # ═══════════════════════════════════════════════════════════════════
    # 3. TRAVEL MATCH
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def match_by_image(self, image_hash: str, caption: str, max_results: bigint = 5) -> str:
        def leader_fn() -> dict:
            prompt = (
                f"Find {int(max_results)} destinations matching this vibe: {caption}\n"
                "Return JSON: {\"matches\":[{\"name\":\"...\",\"location\":\"...\","
                "\"match_score\":85,\"description\":\"...\"}]}"
            )
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            return {"matches": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            return isinstance(leader, gl.vm.Return)

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"matches": []}

        matches = result.get("matches", [])
        if not isinstance(matches, list):
            matches = []

        out = json.dumps({
            "image_analysis": result.get("image_analysis", {}),
            "matches": matches[:int(max_results)],
        })
        self.last_match[str(gl.message.sender_address)] = out
        return out

    # ═══════════════════════════════════════════════════════════════════
    # 4. HIDDEN GEM FINDER
    # ═══════════════════════════════════════════════════════════════════

    @gl.public.write
    def find_hidden_gems(
        self, preferences: str,
        budget_max: bigint = 0, category: str = "any", max_results: bigint = 10,
    ) -> str:
        def leader_fn() -> dict:
            prompt = (
                f"Find {int(max_results)} hidden gem destinations for: {preferences}\n"
                f"Budget: ${int(budget_max)}, Category: {category}\n"
                "Return JSON: {\"hidden_gems\":[{\"name\":\"...\",\"location\":\"...\","
                "\"description\":\"...\",\"hidden_score\":85,\"best_season\":\"...\"}]}"
            )
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, list):
                return {"hidden_gems": res}
            if isinstance(res, dict):
                return res
            return {"hidden_gems": []}

        def validator_fn(leader: gl.vm.Result) -> bool:
            return isinstance(leader, gl.vm.Return)

        raw = gl.vm.run_nondet_unsafe(leader_fn, validator_fn)
        result = _extract_json(json.dumps(raw) if isinstance(raw, dict) else str(raw))
        if not result:
            result = {"hidden_gems": []}

        gems = result.get("hidden_gems", [])
        if not isinstance(gems, list):
            gems = []

        out = json.dumps({"hidden_gems": gems[:int(max_results)]})
        self.last_gems[str(gl.message.sender_address)] = out
        return out

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
