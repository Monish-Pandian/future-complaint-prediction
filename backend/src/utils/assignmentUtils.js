const SR_TO_DEPT = {
  'Rodent Baiting/Rat Complaint': 'Vector Control',
  'Abandoned Vehicle Complaint': 'Vehicle & Traffic Operations',
  'Garbage Cart Maintenance': 'Sanitation & Recycling',
  'Graffiti Removal Request': 'Community Maintenance',
  'Traffic Signal Out Complaint': 'Electrical & Lighting',
  'Blue Recycling Cart': 'Sanitation & Recycling',
  'Building Violation': 'Building & Safety Inspections',
  'Street Light Out Complaint': 'Electrical & Lighting',
  'Pothole in Street Complaint': 'Infrastructure Repair',
  'Tree Debris Clean-Up Request': 'Community Maintenance',
};

function getRequiredDepartment(srType) {
  return SR_TO_DEPT[srType] || '';
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371.0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  lat1 = toRad(lat1);
  lon1 = toRad(lon1);
  lat2 = toRad(lat2);
  lon2 = toRad(lon2);
  const dlat = lat2 - lat1;
  const dlon = lon2 - lon1;
  const a = Math.sin(dlat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function computeDistanceMatrix(officers, centroids) {
  const centroidMap = new Map();
  for (const c of centroids) {
    centroidMap.set(c.communityArea, { lat: c.latitude, lon: c.longitude });
  }

  const distances = [];
  for (const officer of officers) {
    const homeArea = officer.homeCommunityArea;
    if (!homeArea || !centroidMap.has(homeArea)) continue;
    const offCoords = centroidMap.get(homeArea);
    for (const [ca, coords] of centroidMap.entries()) {
      const d = haversine(offCoords.lat, offCoords.lon, coords.lat, coords.lon);
      distances.push({
        officerId: officer._id.toString(),
        communityArea: ca,
        distanceKm: d,
      });
    }
  }
  return distances;
}

function normalizeValue(value, min, max) {
  if (max === min) return 0;
  return (value - min) / (max - min);
}

function findEligibleOfficersForCandidate(officers, candidate, srTypeToDeptMap) {
  const requiredDept = srTypeToDeptMap.get(candidate.srType) || '';
  if (!requiredDept) return [];

  return officers.filter((officer) => {
    if (!officer.active) return false;
    if (officer.availability !== 'AVAILABLE' && officer.availability !== 'BUSY') return false;
    if (officer.currentWorkload >= officer.maxAssignments) return false;
    if ((officer.department || '').trim().toLowerCase() !== requiredDept.trim().toLowerCase()) return false;
    return true;
  });
}

function selectBestOfficer(eligibleOfficers, candidate, distances, weights = { risk: 0.4, distance: 0.3, workload: 0.3 }) {
  if (eligibleOfficers.length === 0) return null;

  const eligibleWithDistance = eligibleOfficers.map((officer) => {
    const distEntry = distances.find(
      (d) => d.officerId === officer._id.toString() && d.communityArea === candidate.communityArea
    );
    const distanceKm = distEntry ? distEntry.distanceKm : 100;
    return { officer, distanceKm };
  });

  if (weights.distance === 0 && weights.workload === 0) {
    eligibleWithDistance.sort((a, b) => {
      const wlDiff = a.officer.currentWorkload - b.officer.currentWorkload;
      if (wlDiff !== 0) return wlDiff;
      return a.distanceKm - b.distanceKm;
    });
    return { officer: eligibleWithDistance[0].officer, distanceKm: eligibleWithDistance[0].distanceKm, score: 0 };
  }

  const workloads = eligibleWithDistance.map((e) => e.officer.currentWorkload);
  const distancesArr = eligibleWithDistance.map((e) => e.distanceKm);
  const risks = eligibleWithDistance.map(() => candidate.probability);

  const minWl = Math.min(...workloads);
  const maxWl = Math.max(...workloads);
  const minDist = Math.min(...distancesArr);
  const maxDist = Math.max(...distancesArr);
  const minRisk = Math.min(...risks);
  const maxRisk = Math.max(...risks);

  let best = null;
  let bestScore = Infinity;

  for (const entry of eligibleWithDistance) {
    const workloadNorm = normalizeValue(entry.officer.currentWorkload, minWl, maxWl);
    const distanceNorm = normalizeValue(entry.distanceKm, minDist, maxDist);
    const riskNorm = normalizeValue(candidate.probability, minRisk, maxRisk);

    const score = weights.risk * (1 - riskNorm) + weights.distance * distanceNorm + weights.workload * workloadNorm;

    if (score < bestScore) {
      bestScore = score;
      best = { officer: entry.officer, distanceKm: entry.distanceKm, score };
    }
  }

  return best;
}

module.exports = {
  SR_TO_DEPT,
  getRequiredDepartment,
  haversine,
  computeDistanceMatrix,
  normalizeValue,
  findEligibleOfficersForCandidate,
  selectBestOfficer,
};