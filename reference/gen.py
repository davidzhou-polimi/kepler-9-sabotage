"""Kepler-9 case generator – feasibility test.

World rules (from caso-1-kepler9.md):
- Modules: Bridge (B), Engine Room (N), Medbay (M), Cargo Bay (C), Life Support (L), Corridor (K).
- Hatches: B-K, N-K, M-K, L-K, C-B. Mechanical, anonymous: they log WHEN, never WHO.
- Motion sensors per module (yes/no). Life Support sensors offline (questions refused).
- Each crew member starts the night in a different module among B, N, M, C.
- The saboteur leaves their module at time t, crosses the corridor, enters Life Support.
  Only humans can be the saboteur (ECHO-7 open issue).
- Optional innocent visit: one innocent goes to another occupied module at time u and stays.
- Reports: innocents tell the truth; the saboteur claims to have stayed, either
  'quiet' (nothing unusual) or 'accuser' (claims to have heard another module's hatch).
Time in minutes after 02:00.
"""
import itertools, random, collections

CREW = ["Hana", "Doyun", "Mira", "ECHO-7"]
HUMANS = ["Hana", "Doyun", "Mira"]
START_MODS = ["B", "N", "M", "C"]
NAME = {"B": "Bridge", "N": "Engine Room", "M": "Medbay", "C": "Cargo Bay", "L": "Life Support", "K": "Corridor"}
HATCH_OF = {"B": "B-K", "N": "N-K", "M": "M-K", "L": "L-K"}
LEAVE_TIMES = [40, 45, 50, 55]
VISIT_TIMES = [20, 25, 30, 35]
GRID = list(range(0, 61, 5))


def path_hatches(src, dst, t):
    """Hatch events and corridor/bridge transit for moving src -> dst starting at t."""
    ev, transit = [], []
    if src == "C":
        ev.append(("C-B", t)); transit.append(("B", t, t + 1)); t += 1
        src = "B"
        if dst == "B":
            return ev, transit
    ev.append((HATCH_OF[src], t)); transit.append(("K", t, t + 1))
    ev.append((HATCH_OF[dst] if dst != "C" else "B-K", t + 1))
    if dst == "C":
        transit.append(("B", t + 1, t + 2)); ev.append(("C-B", t + 2))
    return ev, transit


def build_world(start, sab, t, visit):
    """Return hatch events and motion spans for one concrete world."""
    hatches = []
    occ = collections.defaultdict(list)  # module -> list of (start, end)
    for p in CREW:
        m = start[p]
        if p == sab:
            occ[m].append((0, t))
            ev, tr = path_hatches(m, "L", t)
            hatches += ev
            for mod, a, b in tr:
                occ[mod].append((a, b))
        elif visit and p == visit[0]:
            _, dst, u = visit
            occ[m].append((0, u))
            ev, tr = path_hatches(m, dst, u)
            hatches += ev
            for mod, a, b in tr:
                occ[mod].append((a, b))
            occ[dst].append((u + 1, 60))
        else:
            occ[m].append((0, 60))
    return hatches, occ


def ask(world, q):
    hatches, occ = world
    kind, what, a, b = q
    if kind == "hatch":
        if what == "L-K":
            return "refused"
        return any(h == what and a <= tt <= b for h, tt in hatches)
    if what == "L":
        return "refused"
    return any(s < b and e > a for s, e in occ.get(what, []))


QUESTIONS = []
for a, b in itertools.combinations(GRID, 2):
    for h in ["B-K", "N-K", "M-K", "C-B", "L-K"]:
        QUESTIONS.append(("hatch", h, a, b))
    for m in ["B", "N", "M", "C", "K", "L"]:
        QUESTIONS.append(("motion", m, a, b))


def reports(start, sab, style, accuse, visit):
    """What each crew member writes. accuse = (module, time) for an accuser saboteur."""
    r = {}
    for p in CREW:
        m = start[p]
        if visit and p == visit[0]:
            r[p] = ("moved", m, visit[1], visit[2])
        elif p == sab:
            r[p] = ("stayed", m, ("heard", accuse) if style == "accuser" else ("quiet",))
        else:
            visitor = visit and visit[1] == m
            r[p] = ("stayed", m, ("visitor", visit[2]) if visitor else ("quiet",))
    return r


def candidate_worlds(start, rep, liar, visit):
    """Worlds consistent with: liar's report false (liar went to L), all others true.
    The players know each person's claimed module, so start = claimed modules."""
    worlds = []
    # contradiction check among the non-liars' reports
    for p in CREW:
        if p == liar:
            continue
        kind = rep[p][0]
        if kind == "stayed" and rep[p][2][0] == "heard":
            mod, tt = rep[p][2][1]
            occupant = [q for q in CREW if start[q] == mod]
            # someone stayed in mod with nothing happening, or nobody could open it
            for q in occupant:
                if q != liar and rep[q][0] == "stayed" and rep[q][2][0] == "quiet":
                    return []
            if not occupant:
                return []
    if start[liar] == "C":
        return []  # would have crossed an occupied Bridge
    if rep[liar][0] == "moved":
        return []  # only a "stayed" report can hide the trip to Life Support
    for t in LEAVE_TIMES:
        w = build_world(start, liar, t, visit)
        # every honest accusation must match a real hatch event
        ok = True
        for p in CREW:
            if p != liar and rep[p][0] == "stayed" and rep[p][2][0] == "heard":
                mod, tt = rep[p][2][1]
                if not ask(w, ("hatch", HATCH_OF[mod], tt, tt)):
                    ok = False
        if ok:
            worlds.append(w)
    return worlds


def solvable(groups):
    """groups: liar -> list of worlds. Can 2 adaptive questions always identify the liar?"""
    suspects = [s for s, ws in groups.items() if ws]
    if len(suspects) <= 1:
        return len(suspects) == 1, None

    def answers(q, s):
        return {ask(w, q) for w in groups[s]}

    def split(sus, depth):
        if len(sus) == 1:
            return True
        if depth == 0:
            return False
        for q in QUESTIONS:
            buckets = collections.defaultdict(set)
            ok = True
            for s in sus:
                ans = answers(q, s)
                if len(ans) > 1:
                    ok = False
                    break
                buckets[next(iter(ans))].add(s)
            if not ok or len(buckets) < 2:
                continue
            if all(split(b, depth - 1) for b in buckets.values()):
                return q
        return False

    q = split(set(suspects), 2)
    return bool(q), q


def generate_all():
    valid = []
    stats = collections.Counter()
    for perm in itertools.permutations(START_MODS):
        start = dict(zip(CREW, perm))
        for sab in HUMANS:
            if start[sab] == "C":
                stats["sab in cargo (skipped)"] += 1
                continue
            others = [p for p in CREW if p != sab]
            visits = [None]
            for v in others:
                for dst in START_MODS:
                    if dst != start[v] and dst != start[sab] and dst != "C" and start[v] != "C":
                        for u in VISIT_TIMES:
                            visits.append((v, dst, u))
            for visit in visits:
                for style in ["quiet", "accuser"]:
                    accuses = [None]
                    if style == "accuser":
                        accuses = [(start[q], tt) for q in HUMANS if q != sab and start[q] != "C"
                                   and not (visit and visit[0] == q) for tt in LEAVE_TIMES]
                    for acc in accuses:
                        for t in LEAVE_TIMES:
                            stats["generated"] += 1
                            rep = reports(start, sab, style, acc, visit)
                            groups = {h: candidate_worlds(start, rep, h, visit) for h in HUMANS}
                            sus = [h for h in HUMANS if groups[h]]
                            if sab not in sus:
                                stats["true saboteur excluded (bug)"] += 1
                                continue
                            ok, q = solvable(groups)
                            if not ok:
                                stats["not solvable in 2 questions"] += 1
                                continue
                            stats["valid"] += 1
                            stats[f"valid, {len(sus)} suspects"] += 1
                            valid.append(dict(start=start, sab=sab, t=t, style=style, accuse=acc,
                                              visit=visit, suspects=sus, first_q=q))
    return valid, stats


def fmt_time(m):
    return f"02:{m:02d}" if m < 60 else "03:00"


def render(case):
    start, sab, visit = case["start"], case["sab"], case["visit"]
    rep = reports(start, sab, case["style"], case["accuse"], visit)
    lines = []
    for i, p in enumerate(CREW, 1):
        r = rep[p]
        if r[0] == "moved":
            txt = f"{NAME[r[1]]}, then around {fmt_time(r[3])} I went to the {NAME[r[2]]} and stayed there."
        else:
            txt = f"{NAME[r[1]]}, all night."
            obs = r[2]
            if obs[0] == "quiet":
                txt += " Quiet night, nothing unusual."
            elif obs[0] == "heard":
                txt += f" Around {fmt_time(obs[1][1])} I heard the {NAME[obs[1][0]]} hatch slam."
            elif obs[0] == "visitor":
                txt += f" Around {fmt_time(obs[1])} someone came in to see me."
        lines.append(f"  {i}. {p}: {txt}")
    q = case["first_q"]
    lines.append(f"  [truth] saboteur {sab}, left at {fmt_time(case['t'])}; suspects {case['suspects']}")
    lines.append(f"  [a good first question] {q[0]} {q[1]} {fmt_time(q[2])}-{fmt_time(q[3])}")
    return "\n".join(lines)


if __name__ == "__main__":
    valid, stats = generate_all()
    for k, v in stats.items():
        print(f"{k}: {v}")
    random.seed(7)
    acc = [c for c in valid if c["style"] == "accuser"]
    qui = [c for c in valid if c["style"] == "quiet" and c["visit"]]
    for c in random.sample(acc, 2) + random.sample(qui, 1):
        print()
        print(render(c))
