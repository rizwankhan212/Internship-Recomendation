"""
Allocator Service — Candidate shortlisting algorithms.

Two strategies:
  1. Greedy Real-time Allocator  — O(N log N) sort, take top-K
  2. Batch ILP Solver            — scipy.optimize.linprog, respects per-internship quotas
                                   and ensures each candidate is selected at most once globally
"""

import logging
import numpy as np
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


# ── Greedy Allocator ──────────────────────────────────────────────────────────

def greedy_shortlist(
    applications: List[Dict[str, Any]],
    quota: int = 20,
) -> List[Dict[str, Any]]:
    """
    Greedy Real-time Allocator:
    Sort all applications by rankScore descending, take top `quota`.

    :param applications: list of application dicts with _id and rankScore
    :param quota:        max number to shortlist
    :returns:            sorted top-quota applications
    """
    sorted_apps = sorted(applications, key=lambda a: a.get("rankScore", 0), reverse=True)
    return sorted_apps[:quota]


# ── Batch ILP Solver ─────────────────────────────────────────────────────────

def ilp_allocate(
    applications:  List[Dict[str, Any]],
    quota_map:     Dict[str, int],   # {internship_id: max_openings}
) -> Dict[str, Any]:
    """
    Batch ILP Solver using scipy.optimize.milp / linprog:
    Maximises total rank score subject to:
      - Each internship gets at most quota[internship_id] selections
      - Each candidate is selected for at most one internship (hard constraint)

    Falls back to greedy if scipy MILP is unavailable.

    :param applications:  list of {_id, candidate, internship, rankScore}
    :param quota_map:     {internship_id: openings}
    :returns:             {selected: [app_ids], allocations: {internship_id: [app_ids]}}
    """
    if not applications:
        return {"selected": [], "allocations": {}}

    try:
        return _scipy_milp(applications, quota_map)
    except Exception as e:
        logger.warning(f"MILP solver failed ({e}), falling back to greedy ILP")
        return _greedy_ilp(applications, quota_map)


def _scipy_milp(
    applications: List[Dict[str, Any]],
    quota_map:    Dict[str, int],
) -> Dict[str, Any]:
    """Binary MILP: maximise sum of rankScore * x_i subject to capacity and conflict constraints."""
    from scipy.optimize import milp, LinearConstraint, Bounds

    n = len(applications)
    # Objective: maximise rankScore → minimise negative rankScore
    c = np.array([-a.get("rankScore", 0.0) for a in applications], dtype=float)

    internship_ids = list(quota_map.keys())
    candidate_ids  = list({a["candidate"] for a in applications})

    # Build constraint matrix
    rows, cols, data = [], [], []

    # Per-internship capacity constraints: sum(x_i for i in internship_j) <= quota_j
    for j, iid in enumerate(internship_ids):
        for i, app in enumerate(applications):
            if str(app["internship"]) == iid:
                rows.append(j)
                cols.append(i)
                data.append(1.0)

    # Per-candidate uniqueness: sum(x_i for i of candidate_k) <= 1
    base = len(internship_ids)
    for k, cid in enumerate(candidate_ids):
        for i, app in enumerate(applications):
            if str(app["candidate"]) == cid:
                rows.append(base + k)
                cols.append(i)
                data.append(1.0)

    from scipy.sparse import csr_matrix
    num_rows = len(internship_ids) + len(candidate_ids)
    A = csr_matrix((data, (rows, cols)), shape=(num_rows, n), dtype=float)

    # Upper bounds
    ub = np.array(
        [quota_map.get(iid, 1) for iid in internship_ids] + [1] * len(candidate_ids),
        dtype=float,
    )

    constraints = LinearConstraint(A, lb=-np.inf, ub=ub)
    integrality = np.ones(n)  # binary variables
    bounds = Bounds(lb=0, ub=1)

    result = milp(c, constraints=constraints, integrality=integrality, bounds=bounds)

    if not result.success:
        raise RuntimeError(f"MILP did not converge: {result.message}")

    x = np.round(result.x).astype(int)
    selected    = []
    allocations: Dict[str, List[str]] = {iid: [] for iid in internship_ids}

    for i, val in enumerate(x):
        if val == 1:
            app = applications[i]
            app_id = str(app["_id"])
            selected.append(app_id)
            iid = str(app["internship"])
            if iid not in allocations:
                allocations[iid] = []
            allocations[iid].append(app_id)

    logger.info(f"MILP solver selected {len(selected)} applications")
    return {"selected": selected, "allocations": allocations}


def _greedy_ilp(
    applications: List[Dict[str, Any]],
    quota_map:    Dict[str, int],
) -> Dict[str, Any]:
    """Greedy approximation of ILP — O(N log N)."""
    sorted_apps = sorted(applications, key=lambda a: a.get("rankScore", 0), reverse=True)

    selected: List[str]           = []
    allocations: Dict[str, List]  = {}
    internship_counts: Dict[str, int] = {}
    selected_candidates: set      = set()

    for app in sorted_apps:
        iid = str(app["internship"])
        cid = str(app["candidate"])
        quota = quota_map.get(iid, 5)

        count = internship_counts.get(iid, 0)
        if count < quota and cid not in selected_candidates:
            app_id = str(app["_id"])
            selected.append(app_id)
            allocations.setdefault(iid, []).append(app_id)
            internship_counts[iid] = count + 1
            selected_candidates.add(cid)

    return {"selected": selected, "allocations": allocations}
