'use strict';

/**
 * schemesService.js
 * Government Scheme Matcher - Eligibility and Matching Engine
 * 
 * Matches farmer profile against verified government schemes with:
 * - Multi-factor eligibility evaluation
 * - Relevance scoring
 * - Deadline/window tracking
 * - Revenue impact calculation
 * - Activity-based filtering
 */

const SCHEMES = require('../models/schemeSeedData');

// ═══════════════════════════════════════════════════════════════
// ELIGIBILITY & MATCHING ENGINE
// ═══════════════════════════════════════════════════════════════

/**
 * Calculate days remaining until deadline
 * Uses Asia/Kolkata timezone
 */
function calculateDaysRemaining(deadline) {
  if (!deadline) return null;
  
  const now = new Date();
  const deadlineDate = new Date(deadline);
  const diffTime = deadlineDate - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Determine scheme window status
 */
function getWindowStatus(scheme) {
  const now = new Date();
  
  // Check if scheme has expired
  if (scheme.end_date) {
    const endDate = new Date(scheme.end_date);
    if (now > endDate) {
      return { status: 'CLOSED', daysRemaining: 0 };
    }
  }
  
  // Check if scheme is upcoming
  if (scheme.start_date) {
    const startDate = new Date(scheme.start_date);
    if (now < startDate) {
      const daysUntilStart = Math.ceil((startDate - now) / (1000 * 60 * 60 * 24));
      return { status: 'UPCOMING', daysUntilStart };
    }
  }
  
  // Check application window
  if (scheme.application_window_end) {
    const daysRemaining = calculateDaysRemaining(scheme.application_window_end);
    
    if (daysRemaining === 0) {
      return { status: 'CLOSED', daysRemaining: 0 };
    } else if (daysRemaining <= 7) {
      return { status: 'CLOSING_SOON', daysRemaining };
    } else if (daysRemaining > 0) {
      return { status: 'OPEN', daysRemaining };
    }
  }
  
  // Year-round or no specific window
  if (!scheme.application_window_start && !scheme.application_window_end) {
    return { status: 'YEAR_ROUND', daysRemaining: null };
  }
  
  return { status: 'OPEN', daysRemaining: null };
}

/**
 * Calculate relevance score (0-100)
 * Higher score = better match to farmer's context
 */
function calculateRelevanceScore(scheme, farmerProfile) {
  let score = 0;
  const factors = [];
  
  // State match (30 points)
  if (scheme.state === null || scheme.state === farmerProfile.state) {
    score += 30;
    factors.push(`Available in ${farmerProfile.state || 'all states'}`);
  }
  
  // Crop match (20 points)
  if (!scheme.crop_applicability || 
      scheme.crop_applicability.includes(farmerProfile.crop?.toLowerCase())) {
    score += 20;
    if (farmerProfile.crop) {
      factors.push(`Applicable to ${farmerProfile.crop} cultivation`);
    }
  }
  
  // Activity match (20 points)
  if (!scheme.activity_applicability ||
      scheme.activity_applicability.includes(farmerProfile.activity)) {
    score += 20;
    if (farmerProfile.activity) {
      const activityLabels = {
        'BUY_EQUIPMENT': 'equipment purchase',
        'BUY_SEED': 'seed purchase',
        'BUY_FERTILIZER': 'fertilizer purchase',
        'INSURE_CROP': 'crop insurance',
        'SEEK_CREDIT': 'agricultural credit',
        'PLAN_TO_SELL': 'crop sale',
        'HARVESTING': 'harvest timing',
        'PLAN_IRRIGATION': 'irrigation'
      };
      factors.push(`Relevant to ${activityLabels[farmerProfile.activity] || farmerProfile.activity}`);
    }
  }
  
  // Season match (10 points)
  if (!scheme.season_applicability ||
      scheme.season_applicability.includes(farmerProfile.season)) {
    score += 10;
  }
  
  // Land size eligibility (10 points)
  if (farmerProfile.landSize) {
    const landSizeAc = farmerProfile.landSize;
    const minMet = !scheme.land_size_min_ac || landSizeAc >= scheme.land_size_min_ac;
    const maxMet = !scheme.land_size_max_ac || landSizeAc <= scheme.land_size_max_ac;
    
    if (minMet && maxMet) {
      score += 10;
    }
  } else if (!scheme.land_size_min_ac && !scheme.land_size_max_ac) {
    score += 10;  // No land size restriction
  }
  
  // Timing bonus (10 points)
  const window = getWindowStatus(scheme);
  if (window.status === 'OPEN' || window.status === 'YEAR_ROUND') {
    score += 10;
    if (window.status === 'OPEN') {
      factors.push('Current application window is open');
    }
  } else if (window.status === 'CLOSING_SOON') {
    score += 5;
    factors.push(`Application window closing in ${window.daysRemaining} days`);
  }
  
  return { score, factors };
}

/**
 * Determine eligibility status
 */
function determineEligibilityStatus(scheme, farmerProfile, relevanceScore) {
  const missingInfo = [];
  
  // Check state
  if (scheme.state && !farmerProfile.state) {
    missingInfo.push('State information');
  }
  
  // Check crop for crop-specific schemes
  if (scheme.crop_applicability && !farmerProfile.crop) {
    missingInfo.push('Crop type');
  }
  
  // Check land size for schemes with restrictions
  if ((scheme.land_size_min_ac || scheme.land_size_max_ac) && !farmerProfile.landSize) {
    missingInfo.push('Land size');
  }
  
  // Check land ownership if required
  if (scheme.eligibility_rules?.landOwnership === 'required' && 
      farmerProfile.landOwnership === undefined) {
    missingInfo.push('Land ownership status');
  }
  
  // Determine status
  if (missingInfo.length > 0) {
    return { status: 'INSUFFICIENT_INFORMATION', missingInfo };
  }
  
  // HARD CHECK: State must match for state-level schemes (already filtered but double-check)
  if (scheme.state && scheme.state !== farmerProfile.state) {
    return { status: 'NOT_MATCHED', missingInfo: [] };
  }
  
  // Check crop applicability
  if (scheme.crop_applicability && farmerProfile.crop &&
      !scheme.crop_applicability.includes(farmerProfile.crop.toLowerCase())) {
    return { status: 'NOT_MATCHED', missingInfo: [] };
  }
  
  // HARD CHECK: Land size bounds (if farmer provided land size)
  if (farmerProfile.landSize !== null && farmerProfile.landSize !== undefined) {
    if (scheme.land_size_min_ac && farmerProfile.landSize < scheme.land_size_min_ac) {
      return { status: 'NOT_MATCHED', missingInfo: [] };
    }
    if (scheme.land_size_max_ac && farmerProfile.landSize > scheme.land_size_max_ac) {
      return { status: 'NOT_MATCHED', missingInfo: [] };
    }
  }
  
  // Matched - differentiate between high and medium confidence
  if (relevanceScore >= 70) {
    return { status: 'POTENTIALLY_ELIGIBLE', missingInfo: [] };
  } else {
    return { status: 'MATCHED', missingInfo: [] };
  }
}

/**
 * Calculate potential revenue impact
 */
function calculateRevenueImpact(scheme, farmerProfile) {
  if (!scheme.benefit_amount && !scheme.benefit_percentage) {
    return { available: false };
  }
  
  // For CREDIT schemes, do not treat credit limit as direct revenue benefit
  if (scheme.benefit_type === 'CREDIT') {
    // Credit is financing capacity, not direct revenue
    // Could calculate potential interest savings if data available
    return { available: false };
  }
  
  // Direct benefit amount (transfers, MSP, etc.)
  if (scheme.benefit_amount && !scheme.benefit_percentage) {
    // Only treat as revenue benefit for appropriate benefit types
    if (scheme.benefit_type === 'DIRECT_TRANSFER' || 
        scheme.benefit_type === 'SUBSIDY') {
      return {
        available: true,
        type: 'POTENTIAL_DIRECT_BENEFIT',
        amount: scheme.benefit_amount,
        basis: `${scheme.benefit_description}`
      };
    }
    return { available: false };
  }
  
  // Percentage-based subsidy
  if (scheme.benefit_percentage && farmerProfile.estimatedCost) {
    const subsidyAmount = Math.min(
      (farmerProfile.estimatedCost * scheme.benefit_percentage) / 100,
      scheme.benefit_max_amount || Infinity
    );
    
    return {
      available: true,
      type: 'POTENTIAL_COST_SAVING',
      amount: Math.round(subsidyAmount),
      basis: `${scheme.benefit_percentage}% subsidy on estimated cost of ₹${farmerProfile.estimatedCost}`
    };
  }
  
  return { available: false };
}

/**
 * Transform scheme to API response format
 */
function formatSchemeResponse(scheme, farmerProfile) {
  const { score, factors } = calculateRelevanceScore(scheme, farmerProfile);
  const eligibility = determineEligibilityStatus(scheme, farmerProfile, score);
  const window = getWindowStatus(scheme);
  const revenueImpact = calculateRevenueImpact(scheme, farmerProfile);
  
  return {
    id: scheme.id,
    name: scheme.name,
    shortName: scheme.short_name,
    description: scheme.description,
    level: scheme.level,
    category: scheme.scheme_type,
    status: eligibility.status,
    relevanceScore: score,
    matchedBecause: factors,
    missingInformation: eligibility.missingInfo,
    benefit: {
      type: scheme.benefit_type,
      description: scheme.benefit_description,
      percentage: scheme.benefit_percentage,
      amount: scheme.benefit_amount,
      maximumAmount: scheme.benefit_max_amount,
      frequency: scheme.benefit_frequency
    },
    window: {
      status: window.status,
      startDate: scheme.application_window_start,
      endDate: scheme.application_window_end,
      daysRemaining: window.daysRemaining,
      daysUntilStart: window.daysUntilStart
    },
    documents: scheme.documents_required || [],
    application: {
      method: scheme.application_method,
      url: scheme.application_url
    },
    revenueImpact,
    source: {
      authority: scheme.official_source,
      url: scheme.official_source_url,
      lastVerifiedAt: scheme.last_verified_at,
      verificationStatus: scheme.verification_status
    },
    metadata: scheme.metadata
  };
}

/**
 * Match schemes based on farmer profile
 * 
 * @param {Object} farmerProfile
 * @param {string} farmerProfile.state - State name
 * @param {string} farmerProfile.district - District name (optional)
 * @param {string} farmerProfile.crop - Crop type
 * @param {number} farmerProfile.landSize - Land size in acres
 * @param {string} farmerProfile.landUnit - Unit (acre/hectare)
 * @param {string} farmerProfile.season - Kharif/Rabi/Zaid
 * @param {string} farmerProfile.activity - Current farming activity
 * @param {string} farmerProfile.farmerCategory - Small/Marginal/All
 * @param {boolean} farmerProfile.landOwnership - Land ownership status
 * @param {number} farmerProfile.estimatedCost - For subsidy calculation
 */
async function match(farmerProfile) {
  // Normalize inputs
  const normalized = {
    ...farmerProfile,
    crop: farmerProfile.crop?.toLowerCase().trim(),
    state: farmerProfile.state?.trim(),
    district: farmerProfile.district?.trim(),
    category: farmerProfile.category?.trim() || null
  };
  
  // Filter active schemes only
  const activeSchemes = SCHEMES.filter(s => 
    s.status === 'ACTIVE' && 
    s.verification_status === 'VERIFIED'
  );
  
  // CRITICAL: Apply geographic filtering FIRST as a hard filter
  const geographicallyEligibleSchemes = activeSchemes.filter(scheme => {
    // Central schemes (state = null) are available nationwide
    if (scheme.level === 'CENTRAL' && scheme.state === null) {
      return true;
    }
    
    // State-level schemes MUST match farmer's state
    if (scheme.level === 'STATE') {
      if (!scheme.state || !normalized.state) {
        return false;
      }
      
      // Strict state match required
      if (scheme.state !== normalized.state) {
        return false;  // HARD EXCLUDE - state mismatch
      }
      
      // If scheme has district restrictions, check district match
      if (scheme.district_applicability && scheme.district_applicability.length > 0) {
        if (!normalized.district) {
          return false;  // District required but not provided
        }
        if (!scheme.district_applicability.includes(normalized.district)) {
          return false;  // District mismatch
        }
      }
      
      return true;
    }
    
    // For any other level, check state match if state is specified
    if (scheme.state && normalized.state && scheme.state !== normalized.state) {
      return false;  // HARD EXCLUDE
    }
    
    return true;
  });
  
  // Match and format schemes
  const matchedSchemes = geographicallyEligibleSchemes
    .filter(scheme => !normalized.category || scheme.scheme_type === normalized.category)
    .map(scheme => formatSchemeResponse(scheme, normalized))
    .filter(result => 
      result.window.status !== 'CLOSED' &&
      result.status !== 'NOT_MATCHED'
    );
  
  // Sort by priority
  matchedSchemes.sort((a, b) => {
    // 1. Status priority
    const statusPriority = {
      'POTENTIALLY_ELIGIBLE': 4,
      'MATCHED': 3,
      'INSUFFICIENT_INFORMATION': 2
    };
    const statusDiff = (statusPriority[b.status] || 0) - (statusPriority[a.status] || 0);
    if (statusDiff !== 0) return statusDiff;
    
    // 2. Relevance score
    const scoreDiff = b.relevanceScore - a.relevanceScore;
    if (scoreDiff !== 0) return scoreDiff;
    
    // 3. Window status
    const windowPriority = {
      'CLOSING_SOON': 4,
      'OPEN': 3,
      'YEAR_ROUND': 2,
      'UPCOMING': 1
    };
    const windowDiff = (windowPriority[b.window.status] || 0) - (windowPriority[a.window.status] || 0);
    if (windowDiff !== 0) return windowDiff;
    
    // 4. Revenue impact
    if (a.revenueImpact.available && !b.revenueImpact.available) return -1;
    if (!a.revenueImpact.available && b.revenueImpact.available) return 1;
    
    return 0;
  });
  
  // Calculate summary
  const summary = {
    totalMatches: matchedSchemes.length,
    highRelevance: matchedSchemes.filter(s => s.relevanceScore >= 70).length,
    closingSoon: matchedSchemes.filter(s => s.window.status === 'CLOSING_SOON').length,
    potentiallyEligible: matchedSchemes.filter(s => s.status === 'POTENTIALLY_ELIGIBLE').length
  };
  
  return {
    success: true,
    farmerContext: {
      state: normalized.state,
      district: normalized.district,
      crop: normalized.crop,
      landSize: normalized.landSize,
      season: normalized.season,
      activity: normalized.activity
    },
    summary,
    schemes: matchedSchemes
  };
}

/**
 * Get scheme by ID with formatted response
 */
async function getById(schemeId) {
  const scheme = SCHEMES.find(s => s.id === schemeId);
  if (!scheme) return null;
  
  // Return full scheme detail without farmer-specific matching
  const window = getWindowStatus(scheme);
  
  return {
    ...scheme,
    window: {
      status: window.status,
      daysRemaining: window.daysRemaining,
      daysUntilStart: window.daysUntilStart
    },
    documents: scheme.documents_required || [],
    source: {
      authority: scheme.official_source,
      url: scheme.official_source_url,
      lastVerifiedAt: scheme.last_verified_at,
      verificationStatus: scheme.verification_status
    }
  };
}

/**
 * Get schemes by state (for state-specific browsing)
 */
async function getByState(state) {
  const normalizedState = state?.trim();
  
  const schemes = SCHEMES.filter(s => 
    s.status === 'ACTIVE' &&
    (s.state === null || s.state === normalizedState)
  );
  
  return schemes.map(scheme => ({
    id: scheme.id,
    name: scheme.name,
    shortName: scheme.short_name,
    level: scheme.level,
    category: scheme.scheme_type,
    benefit: scheme.benefit_description,
    window: getWindowStatus(scheme)
  }));
}

/**
 * Get schemes by category
 */
async function getByCategory(category) {
  const schemes = SCHEMES.filter(s => 
    s.status === 'ACTIVE' &&
    s.scheme_type === category
  );
  
  return schemes.map(scheme => ({
    id: scheme.id,
    name: scheme.name,
    level: scheme.level,
    benefit: scheme.benefit_description,
    state: scheme.state,
    window: getWindowStatus(scheme)
  }));
}

module.exports = { 
  match, 
  getById,
  getByState,
  getByCategory
};
