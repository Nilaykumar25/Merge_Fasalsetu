/**
 * Nutrition Alert Service
 * Rule-based NPK + pH analysis with crop-specific thresholds
 */

// Crop-specific NPK thresholds (kg/ha) by growth stage
const NPK_THRESHOLDS = {
  tomato: {
    vegetative: { N: [40, 60], P: [20, 30], K: [40, 60] },
    flowering: { N: [50, 70], P: [25, 35], K: [50, 70] },
    fruiting: { N: [30, 50], P: [30, 40], K: [60, 80] }
  },
  wheat: {
    tillering: { N: [40, 60], P: [20, 30], K: [20, 30] },
    jointing: { N: [60, 80], P: [25, 35], K: [25, 35] },
    flowering: { N: [40, 60], P: [20, 30], K: [30, 40] }
  },
  rice: {
    tillering: { N: [50, 70], P: [20, 30], K: [30, 40] },
    panicle_initiation: { N: [60, 80], P: [25, 35], K: [40, 50] },
    flowering: { N: [40, 60], P: [20, 30], K: [50, 60] }
  },
  potato: {
    vegetative: { N: [60, 80], P: [30, 40], K: [80, 100] },
    tuber_formation: { N: [50, 70], P: [35, 45], K: [100, 120] },
    tuber_bulking: { N: [40, 60], P: [30, 40], K: [120, 140] }
  },
  default: {
    early: { N: [40, 60], P: [20, 30], K: [30, 40] },
    mid: { N: [50, 70], P: [25, 35], K: [40, 50] },
    late: { N: [30, 50], P: [20, 30], K: [50, 60] }
  }
};

// pH ranges by crop
const PH_RANGES = {
  tomato: [6.0, 7.0],
  wheat: [6.0, 7.5],
  rice: [5.5, 7.0],
  potato: [5.0, 6.5],
  default: [6.0, 7.0]
};

/**
 * Analyze nutrition status
 * @param {Object} params
 * @param {string} params.crop - Crop type
 * @param {string} params.growthStage - Growth stage
 * @param {number} params.nitrogen - N level (kg/ha)
 * @param {number} params.phosphorus - P level (kg/ha)
 * @param {number} params.potassium - K level (kg/ha)
 * @param {number} params.pH - Soil pH
 * @returns {Object} Nutrition decision
 */
function analyzeNutrition(params) {
  const { crop, growthStage, nitrogen, phosphorus, potassium, pH } = params;

  // Get thresholds
  const cropThresholds = NPK_THRESHOLDS[crop] || NPK_THRESHOLDS.default;
  const stageKey = Object.keys(cropThresholds)[0]; // Default to first stage if not matched
  const thresholds = cropThresholds[growthStage] || cropThresholds[stageKey];
  const phRange = PH_RANGES[crop] || PH_RANGES.default;

  // Analyze each nutrient
  const nStatus = analyzeNutrient('Nitrogen', nitrogen, thresholds.N);
  const pStatus = analyzeNutrient('Phosphorus', phosphorus, thresholds.P);
  const kStatus = analyzeNutrient('Potassium', potassium, thresholds.K);
  const phStatus = analyzepH(pH, phRange);

  // Collect deficiencies and excesses
  const issues = [nStatus, pStatus, kStatus, phStatus].filter(s => s.status !== 'NORMAL');
  
  // Determine overall severity
  let severity = 'NORMAL';
  let alert = 'Nutrient levels adequate';
  let recommendation = 'Continue regular fertilization schedule';
  let yieldRisk = 'Low';

  if (issues.length > 0) {
    const hasDeficiency = issues.some(i => i.status === 'DEFICIENT');
    const hasCriticalDeficiency = issues.some(i => i.status === 'CRITICAL_DEFICIENCY');
    
    if (hasCriticalDeficiency) {
      severity = 'HIGH';
      yieldRisk = 'High';
      alert = 'Critical nutrient deficiency detected';
      recommendation = 'Immediate corrective action required within 3 days';
    } else if (hasDeficiency) {
      severity = 'MEDIUM';
      yieldRisk = 'Medium';
      alert = 'Nutrient deficiency detected';
      recommendation = 'Apply corrective fertilization within 1 week';
    } else {
      severity = 'LOW';
      yieldRisk = 'Low';
      alert = 'Nutrient imbalance detected';
      recommendation = 'Adjust fertilization in next application';
    }
  }

  // Generate specific actions
  const actions = issues.map(issue => issue.action).filter(Boolean);

  return {
    type: 'NUTRITION',
    severity,
    alert,
    recommendation,
    reason: issues.length > 0 
      ? issues.map(i => `${i.nutrient}: ${i.message}`).join('; ')
      : 'All nutrient levels within optimal range',
    yieldRisk,
    actions,
    metadata: {
      nitrogen: { value: nitrogen, status: nStatus.status, ...thresholds.N },
      phosphorus: { value: phosphorus, status: pStatus.status, ...thresholds.P },
      potassium: { value: potassium, status: kStatus.status, ...thresholds.K },
      pH: { value: pH, status: phStatus.status, optimalRange: phRange },
      deficiencies: issues.filter(i => i.status.includes('DEFICIENT')).map(i => i.nutrient),
      excesses: issues.filter(i => i.status === 'EXCESS').map(i => i.nutrient)
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Analyze individual nutrient
 */
function analyzeNutrient(nutrient, value, [min, max]) {
  if (value === null || value === undefined) {
    return {
      nutrient,
      status: 'UNKNOWN',
      message: 'No data available'
    };
  }

  const criticalMin = min * 0.5;
  
  if (value < criticalMin) {
    return {
      nutrient,
      status: 'CRITICAL_DEFICIENCY',
      message: `Critically low (${value} kg/ha, recommended: ${min}-${max})`,
      action: `Apply ${nutrient.toLowerCase()}-rich fertilizer immediately`
    };
  } else if (value < min) {
    return {
      nutrient,
      status: 'DEFICIENT',
      message: `Below optimal (${value} kg/ha, recommended: ${min}-${max})`,
      action: `Increase ${nutrient.toLowerCase()} application`
    };
  } else if (value > max * 1.5) {
    return {
      nutrient,
      status: 'EXCESS',
      message: `Excessive (${value} kg/ha, recommended: ${min}-${max})`,
      action: `Reduce ${nutrient.toLowerCase()} application to prevent toxicity`
    };
  } else if (value > max) {
    return {
      nutrient,
      status: 'HIGH',
      message: `Above optimal (${value} kg/ha, recommended: ${min}-${max})`,
      action: `Monitor and adjust ${nutrient.toLowerCase()} levels`
    };
  } else {
    return {
      nutrient,
      status: 'NORMAL',
      message: `Optimal (${value} kg/ha)`
    };
  }
}

/**
 * Analyze pH
 */
function analyzepH(value, [min, max]) {
  if (value === null || value === undefined) {
    return {
      nutrient: 'pH',
      status: 'UNKNOWN',
      message: 'No data available'
    };
  }

  if (value < min - 1.0) {
    return {
      nutrient: 'pH',
      status: 'CRITICAL_DEFICIENCY',
      message: `Soil too acidic (${value}, optimal: ${min}-${max})`,
      action: 'Apply lime to raise pH'
    };
  } else if (value < min) {
    return {
      nutrient: 'pH',
      status: 'DEFICIENT',
      message: `Slightly acidic (${value}, optimal: ${min}-${max})`,
      action: 'Consider lime application'
    };
  } else if (value > max + 1.0) {
    return {
      nutrient: 'pH',
      status: 'EXCESS',
      message: `Soil too alkaline (${value}, optimal: ${min}-${max})`,
      action: 'Apply sulfur or acidifying agents'
    };
  } else if (value > max) {
    return {
      nutrient: 'pH',
      status: 'HIGH',
      message: `Slightly alkaline (${value}, optimal: ${min}-${max})`,
      action: 'Monitor pH levels'
    };
  } else {
    return {
      nutrient: 'pH',
      status: 'NORMAL',
      message: `Optimal (${value})`
    };
  }
}

module.exports = {
  analyzeNutrition
};
