/**
 * Filter Service — Application shortlisting
 * Simulates:
 *   1. Greedy Real-time Allocator: greedily select top candidates per quota
 *   2. Batch ILP Solver: assign candidates to internships respecting global quotas
 */

/**
 * Greedy Real-time Allocator
 * Given a list of applications (with rankScore), shortlist top N by score
 *
 * @param {Array} applications - array of application docs with rankScore
 * @param {number} quota - max candidates to shortlist (default 20)
 * @returns {Array} shortlisted application IDs
 */
function greedyAllocator(applications, quota = 20) {
  if (!applications || applications.length === 0) return [];

  // Sort by rankScore descending
  const sorted = [...applications].sort((a, b) => b.rankScore - a.rankScore);

  // Take top `quota` candidates
  return sorted.slice(0, quota).map((app) => app._id.toString());
}

/**
 * Batch ILP Solver Simulation
 * Distributes candidates across multiple internships respecting:
 *   - Per-internship quota (openings)
 *   - Each candidate can only be fully selected for one internship (hard constraint)
 *   - Maximize total rank score (knapsack-style greedy approx.)
 *
 * @param {Array} applications - all applications with candidate, internship, rankScore
 * @param {Object} quotaMap - { internshipId: maxOpenings }
 * @returns {Object} { selected: [appIds], allocations: { internshipId: [appIds] } }
 */
function batchILPSolver(applications, quotaMap) {
  if (!applications || applications.length === 0) {
    return { selected: [], allocations: {} };
  }

  // Sort all applications globally by rankScore (greedy approximation of ILP)
  const sorted = [...applications].sort((a, b) => b.rankScore - a.rankScore);

  const allocations = {};
  const selectedCandidates = new Set(); // Each candidate selected at most once
  const internshipCounts = {};

  Object.keys(quotaMap).forEach((id) => {
    allocations[id] = [];
    internshipCounts[id] = 0;
  });

  const selected = [];

  sorted.forEach((app) => {
    const internshipId = app.internship.toString();
    const candidateId = app.candidate.toString();
    const quota = quotaMap[internshipId] || 5;

    // Greedy constraint checks:
    // 1. Internship still has capacity
    // 2. Candidate not already selected elsewhere (hard constraint)
    if (internshipCounts[internshipId] < quota && !selectedCandidates.has(candidateId)) {
      selected.push(app._id.toString());
      allocations[internshipId] = allocations[internshipId] || [];
      allocations[internshipId].push(app._id.toString());
      internshipCounts[internshipId]++;
      selectedCandidates.add(candidateId);
    }
  });

  return { selected, allocations };
}

/**
 * Compute shortlist for a single internship using candidate scores
 * Called when a recruiter requests shortlisted candidates
 *
 * @param {Array} applications - applications for one internship
 * @param {number} quota - max shortlist size
 * @returns {Array} sorted applications (top quota)
 */
function shortlistForInternship(applications, quota = 20) {
  const sorted = [...applications].sort((a, b) => b.rankScore - a.rankScore);
  return sorted.slice(0, quota);
}

module.exports = { greedyAllocator, batchILPSolver, shortlistForInternship };
