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

    sections = text.split("6")

    for section in sections:
        section = section.strip()
        if not section or len(section) < 20:
            continue

        if section.startswith("recommendations"):
            section = section.replace("recommendations", "", 1).strip(" -|")
            if not section:
                continue

        rec = {"name": "", "location": "", "description": "", "best_season": "", "match_score": 75, "estimated_cost": {"min": 500, "max": 2000}}

        parts = [p.strip() for p in section.split("|") if p.strip()]

        i = 0
        while i < len(parts):
            p = parts[i]
            pl = p.lower()

            # Combined key-value: location<, locationD, locationl, location, name<, named, namel, name,, nameT
            # Also: best_seasont, descriptiont
            combined = False
            for prefix, key in [("location<", "location"), ("locationd", "location"),
                               ("locationl", "location"), ("location,", "location"),
                               ("name<", "name"), ("named", "name"),
                               ("namel", "name"), ("name,", "name"),
                               ("namet", "name"), ("name\\", "name"),
                               ("best_seasont", "best_season"),
                               ("descriptiont", "description")]:
                if pl.startswith(prefix):
                    val = p[len(prefix):].strip()
                    if val:
                        rec[key] = val
                    combined = True
                    break
            if combined:
                i += 1
                continue

            # Standalone keys
            if pl == "best_season" and i + 1 < len(parts):
                rec["best_season"] = parts[i + 1].strip()
                i += 2
            elif pl == "description" and i + 1 < len(parts):
                rec["description"] = parts[i + 1].strip()[:300]
                i += 2
            elif pl == "estimated_cost":
                # Next part might be location value or empty
                if i + 1 < len(parts):
                    nxt = parts[i + 1].strip()
                    nxtl = nxt.lower()
                    # If next part is NOT a known key, treat as location value
                    if nxtl not in ("best_season", "description", "estimated_cost", "match_score") and not any(nxtl.startswith(p) for p in ["location", "name"]):
                        if not rec["location"]:
                            rec["location"] = nxt
                        i += 2
                    else:
                        i += 1
                else:
                    i += 1
            elif pl == "match_score":
                # Next part might be name value (not a number)
                if i + 1 < len(parts):
                    nxt = parts[i + 1].strip()
                    nxtl = nxt.lower()
                    try:
                        rec["match_score"] = int(nxt)
                        i += 2
                    except:
                        # Check combined key-value: nameXvalue
                        nm = False
                        for prefix, key in [("name<", "name"), ("named", "name"),
                                           ("namel", "name"), ("name,", "name"),
                                           ("namet", "name"), ("name\\", "name")]:
                            if nxtl.startswith(prefix):
                                val = nxt[len(prefix):].strip()
                                if val:
                                    rec[key] = val
                                nm = True
                                break
                        if not nm:
                            # Plain text after match_score = name
                            if not any(nxtl.startswith(p) for p in ["location"]):
                                if not rec["name"]:
                                    rec["name"] = nxt
                        i += 2
                else:
                    i += 1
            else:
                i += 1

        if rec["description"] or rec["location"] or rec["name"]:
            recs.append(rec)

    return recs


def _calc_match_score(query: str, name: str, location: str, description: str) -> int:
    """Calculate match score based on keyword overlap between query and destination."""
    score = 60
    ql = query.lower()
    dl = f"{name} {location} {description}".lower()

    # Keyword matches
    keywords = {
        "family": ["family", "kids", "children"],
        "cool": ["cool", "mountain", "alpine", "lake", "snow", "cold"],
        "beach": ["beach", "coastal", "ocean", "sea", "island", "tropical"],
        "photo": ["photo", "scenic", "views", "picturesque", "photography"],
        "hiking": ["hike", "hiking", "trail", "trek", "walk"],
        "history": ["historic", "ancient", "temple", "heritage", "ruins", "museum"],
        "city": ["city", "urban", "downtown", "nightlife"],
        "nature": ["nature", "park", "forest", "wildlife", "garden"],
        "budget": ["budget", "cheap", "affordable"],
        "romantic": ["romantic", "couples", "honeymoon"],
    }

    for category, words in keywords.items():
        if any(w in ql for w in words):
            if any(w in dl for w in words):
                score += 8

    return min(score, 95)


def _estimate_cost(location: str) -> dict:
    """Estimate cost based on location."""
    loc = location.lower()

    if any(x in loc for x in ["thailand", "vietnam", "cambodia", "laos", "myanmar", "india", "nepal", "indonesia"]):
        return {"min": 300, "max": 800}
    if any(x in loc for x in ["japan", "south korea", "taiwan", "malaysia", "philippines"]):
        return {"min": 600, "max": 1500}
    if any(x in loc for x in ["france", "italy", "spain", "germany", "uk", "england", "portugal", "greece", "europe"]):
        return {"min": 800, "max": 2500}
    if any(x in loc for x in ["usa", "united states", "canada", "new york", "california", "florida", "texas"]):
        return {"min": 800, "max": 2500}
    if any(x in loc for x in ["australia", "new zealand"]):
        return {"min": 1000, "max": 3000}
    if any(x in loc for x in ["africa", "kenya", "tanzania", "south africa", "morocco"]):
        return {"min": 600, "max": 1800}
    if any(x in loc for x in ["brazil", "argentina", "mexico", "peru", "colombia"]):
        return {"min": 500, "max": 1500}
    return {"min": 500, "max": 2000}


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
                "Each must have: name, location, description (1-2 sentences), "
                "match_score (60-95, how well it matches the query), "
                "best_season (e.g. November to February), "
                "estimated_cost with min and max in USD (e.g. 500 and 2000).\n"
                "Return valid JSON array."
            )
            res = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(res, dict):
                return res
            if isinstance(res, list):
                return {"recommendations": res}
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
            name = str(r.get("name", "Unknown"))
            location = str(r.get("location", "Unknown"))
            description = str(r.get("description", ""))

            # Calculate match_score if default (75) or missing
            ms = int(r.get("match_score", 75))
            if ms == 75:
                ms = _calc_match_score(query, name, location, description)

            # Estimate cost if default (500-2000) or missing
            est = r.get("estimated_cost", {})
            if isinstance(est, dict):
                cost_min = int(est.get("min", 0))
                cost_max = int(est.get("max", 0))
            else:
                cost_min = 0
                cost_max = 0
            if cost_min == 500 and cost_max == 2000:
                est = _estimate_cost(location)
                cost_min = est["min"]
                cost_max = est["max"]

            clean_recs.append({
                "name": name,
                "location": location,
                "description": description,
                "match_score": ms,
                "best_season": str(r.get("best_season", "Year-round")),
                "estimated_cost": {"min": cost_min, "max": cost_max},
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
