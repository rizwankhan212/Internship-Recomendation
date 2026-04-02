"""Shortlist Optimizer — Greedy + ILP (PuLP) for candidate selection."""
from typing import List, Dict


def greedy_shortlist(candidates: List[Dict], max_count: int) -> List[Dict]:
    """
    Greedy shortlisting: select top-K candidates by rank score.
    Simple but effective when diversity constraints aren't needed.
    """
    sorted_candidates = sorted(candidates, key=lambda c: c["rank_score"], reverse=True)
    return sorted_candidates[:max_count]


def ilp_shortlist(
    candidates: List[Dict],
    max_count: int,
    branch_diversity: bool = False,
) -> List[Dict]:
    """
    Integer Linear Programming (ILP) based shortlisting using PuLP.
    
    Objective: Maximize total rank score
    Constraints:
    - At most max_count candidates selected
    - If branch_diversity=True: at most ceil(max_count/num_branches) per branch
    
    This produces globally optimal shortlists subject to constraints,
    unlike greedy which may miss diversity goals.
    """
    try:
        from pulp import LpMaximize, LpProblem, LpVariable, lpSum, LpStatus
        import math

        n = len(candidates)
        if n == 0:
            return []
        if n <= max_count:
            return candidates

        # Create ILP problem
        prob = LpProblem("CandidateShortlisting", LpMaximize)

        # Binary decision variables: x[i] = 1 if candidate i is selected
        x = [LpVariable(f"x_{i}", cat="Binary") for i in range(n)]

        # Objective: maximize total rank score
        prob += lpSum(candidates[i]["rank_score"] * x[i] for i in range(n))

        # Constraint 1: at most max_count candidates
        prob += lpSum(x[i] for i in range(n)) <= max_count

        # Constraint 2: branch diversity (optional)
        if branch_diversity:
            branches = set(c.get("branch", "Unknown") for c in candidates)
            num_branches = max(len(branches), 1)
            max_per_branch = math.ceil(max_count / num_branches)

            for branch in branches:
                branch_indices = [
                    i for i, c in enumerate(candidates) if c.get("branch", "Unknown") == branch
                ]
                if branch_indices:
                    prob += lpSum(x[i] for i in branch_indices) <= max_per_branch

        # Solve
        prob.solve()

        if LpStatus[prob.status] != "Optimal":
            # Fallback to greedy if ILP fails
            return greedy_shortlist(candidates, max_count)

        selected = [candidates[i] for i in range(n) if x[i].value() == 1]
        selected.sort(key=lambda c: c["rank_score"], reverse=True)
        return selected

    except ImportError:
        # PuLP not available, fallback to greedy
        print("PuLP not installed. Falling back to greedy shortlisting.")
        return greedy_shortlist(candidates, max_count)
    except Exception as e:
        print(f"ILP optimization failed: {e}. Falling back to greedy.")
        return greedy_shortlist(candidates, max_count)
