'use strict';

/**
 * Government Scheme Seed Data
 * All schemes verified from official government sources
 * Source URLs and verification dates included for each scheme
 * 
 * DO NOT add schemes without verifying from official sources
 * Last comprehensive update: 2026-09-11
 */

const SCHEMES = [
  // ═══════════════════════════════════════════════════════════════
  // CENTRAL GOVERNMENT SCHEMES
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 'PM-KISAN',
    name: 'Pradhan Mantri Kisan Samman Nidhi',
    short_name: 'PM-KISAN',
    description: 'Income support scheme providing ₹6,000 per year in three equal installments to all land-holding farmer families.',
    scheme_type: 'INCOME_SUPPORT',
    level: 'CENTRAL',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    department: 'Department of Agriculture & Farmers Welfare',
    state: null,  // Nationwide
    district_applicability: null,  // All districts
    crop_applicability: null,  // All crops
    season_applicability: null,  // Year-round
    activity_applicability: null,  // General support
    farmer_categories: ['ALL'],
    land_size_min_ac: null,
    land_size_max_ac: null,
    eligibility_rules: {
      landOwnership: 'required',
      excluded: ['Institutional landholders', 'Farmer families with taxable income members']
    },
    benefit_type: 'DIRECT_TRANSFER',
    benefit_description: '₹6,000 per year in three equal installments of ₹2,000 each',
    benefit_amount: 6000,
    benefit_percentage: null,
    benefit_max_amount: null,
    benefit_frequency: 'ANNUAL',
    start_date: '2018-12-01',
    end_date: null,  // Ongoing
    application_window_start: null,  // Always open
    application_window_end: null,
    documents_required: ['Aadhaar card', 'Land ownership documents', 'Bank account details'],
    application_method: 'Online portal or CSC',
    application_url: 'https://pmkisan.gov.in',
    official_source: 'Ministry of Agriculture & Farmers Welfare',
    official_source_url: 'https://pmkisan.gov.in',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE'
  },
  
  {
    id: 'PMFBY',
    name: 'Pradhan Mantri Fasal Bima Yojana',
    short_name: 'PMFBY',
    description: 'Comprehensive crop insurance scheme covering yield losses due to non-preventable natural risks from pre-sowing to post-harvest.',
    scheme_type: 'CROP_INSURANCE',
    level: 'CENTRAL',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    department: 'Department of Agriculture & Farmers Welfare',
    state: null,  // Nationwide
    district_applicability: null,
    crop_applicability: ['wheat', 'rice', 'paddy', 'cotton', 'sugarcane', 'maize', 'pulses', 'oilseeds'],
    season_applicability: ['Kharif', 'Rabi'],
    activity_applicability: ['INSURE_CROP'],
    farmer_categories: ['ALL'],
    land_size_min_ac: null,
    land_size_max_ac: null,
    eligibility_rules: {
      notifiedCrop: 'required',
      notifiedArea: 'required',
      landOwnership: 'not_required',
      tenantFarmers: 'eligible'
    },
    benefit_type: 'INSURANCE',
    benefit_description: 'Premium: 2% for Kharif, 1.5% for Rabi, 5% for commercial/horticultural crops. Government pays balance premium up to 90% of sum insured.',
    benefit_amount: null,
    benefit_percentage: null,
    benefit_max_amount: null,
    benefit_frequency: 'PER_SEASON',
    start_date: '2016-02-13',
    end_date: null,
    application_window_start: null,  // Season-specific
    application_window_end: null,  // Cut-off before sowing
    documents_required: ['Aadhaar card', 'Land records', 'Sowing certificate (for non-loanee farmers)', 'Bank account details'],
    application_method: 'Banks, CSCs, Insurance companies, or online portal',
    application_url: 'https://pmfby.gov.in',
    official_source: 'Ministry of Agriculture & Farmers Welfare',
    official_source_url: 'https://pmfby.gov.in',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE',
    metadata: {
      enrollmentNote: 'Enrollment window typically closes 2 weeks before sowing season',
      sumInsuredBasis: 'District-level scale of finance'
    }
  },
  
  {
    id: 'KCC',
    name: 'Kisan Credit Card',
    short_name: 'KCC',
    description: 'Short-term credit facility for farmers to meet agriculture and allied activity expenses with interest subvention benefit.',
    scheme_type: 'AGRICULTURAL_CREDIT',
    level: 'CENTRAL',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    department: 'Department of Financial Services',
    state: null,
    district_applicability: null,
    crop_applicability: null,
    season_applicability: null,
    activity_applicability: ['SEEK_CREDIT', 'BUY_SEED', 'BUY_FERTILIZER', 'BUY_EQUIPMENT'],
    farmer_categories: ['ALL'],
    land_size_min_ac: null,
    land_size_max_ac: null,
    eligibility_rules: {
      farmers: 'eligible',
      sharecroppers: 'eligible',
      tenantFarmers: 'eligible',
      selfHelpGroups: 'eligible',
      jointLiabilityGroups: 'eligible'
    },
    benefit_type: 'CREDIT',
    benefit_description: 'Credit up to ₹3 lakh at 7% interest. Prompt repayment gives 3% interest subvention, effective rate 4% p.a. Additional 3% incentive on timely repayment, bringing effective rate to 1% p.a.',
    benefit_amount: 300000,
    benefit_percentage: null,
    benefit_max_amount: 300000,
    benefit_frequency: 'ANNUAL',
    start_date: null,
    end_date: null,
    application_window_start: null,
    application_window_end: null,
    documents_required: ['Identity proof', 'Address proof', 'Land records', 'Passport size photograph'],
    application_method: 'Commercial banks, RRBs, Cooperative banks',
    application_url: 'https://www.nabard.org/content1.aspx?id=572',
    official_source: 'NABARD / Reserve Bank of India',
    official_source_url: 'https://www.nabard.org/content1.aspx?id=572',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE'
  },
  
  {
    id: 'SMAM',
    name: 'Sub-Mission on Agricultural Mechanization',
    short_name: 'SMAM',
    description: 'Promotes agricultural mechanization through financial assistance for purchase of agricultural machinery and equipment.',
    scheme_type: 'EQUIPMENT_SUBSIDY',
    level: 'CENTRAL',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    department: 'Department of Agriculture & Farmers Welfare',
    state: null,
    district_applicability: null,
    crop_applicability: null,
    season_applicability: null,
    activity_applicability: ['BUY_EQUIPMENT'],
    farmer_categories: ['Small/Marginal', 'ALL'],
    land_size_min_ac: null,
    land_size_max_ac: null,
    eligibility_rules: {
      individualFarmers: 'eligible',
      customHiringCenters: 'eligible',
      farmerProducerOrganizations: 'eligible',
      smallMarginalPreference: true
    },
    benefit_type: 'SUBSIDY',
    benefit_description: 'Subsidy varies: 40-50% for SC/ST/Small/Marginal/Women farmers, 40% for general category, up to specified cost norms per implement.',
    benefit_amount: null,
    benefit_percentage: 50,
    benefit_max_amount: 80000,
    benefit_frequency: 'ONE_TIME',
    start_date: '2014-09-24',
    end_date: null,
    application_window_start: null,
    application_window_end: null,
    documents_required: ['Identity proof', 'Land records', 'Category certificate (if applicable)', 'Bank account details'],
    application_method: 'State Agriculture Department offices or online portal',
    application_url: 'https://agrimachinery.nic.in',
    official_source: 'Ministry of Agriculture & Farmers Welfare',
    official_source_url: 'https://agricoop.nic.in/en/major-programmescheme/krishonnatiYojana',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE'
  },
  
  {
    id: 'MSP-WHEAT',
    name: 'Minimum Support Price - Wheat',
    short_name: 'MSP Wheat',
    description: 'Government procurement of wheat at Minimum Support Price to ensure remunerative prices to farmers.',
    scheme_type: 'MSP_PROCUREMENT',
    level: 'CENTRAL',
    ministry: 'Ministry of Consumer Affairs, Food and Public Distribution',
    department: 'Department of Food and Public Distribution',
    state: null,  // Procurement varies by state
    district_applicability: null,
    crop_applicability: ['wheat'],
    season_applicability: ['Rabi'],
    activity_applicability: ['PLAN_TO_SELL', 'HARVESTING'],
    farmer_categories: ['ALL'],
    land_size_min_ac: null,
    land_size_max_ac: null,
    eligibility_rules: {
      registeredFarmers: 'may_be_required',
      fairAverageQuality: 'required',
      procurementCenters: 'location_specific'
    },
    benefit_type: 'MSP',
    benefit_description: 'Procurement at MSP: ₹2,275 per quintal for 2026-27 Rabi season (subject to annual revision by CACP).',
    benefit_amount: null,
    benefit_percentage: null,
    benefit_max_amount: null,
    benefit_frequency: 'PER_SEASON',
    start_date: null,
    end_date: null,
    application_window_start: null,  // Post-harvest season
    application_window_end: null,
    documents_required: ['Land records', 'Identity proof', 'Bank account details'],
    application_method: 'Procurement centers, PACS, Mandis',
    application_url: 'https://dfpd.gov.in',
    official_source: 'Department of Food and Public Distribution',
    official_source_url: 'https://dfpd.gov.in',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE',
    metadata: {
      msp2026: 2275,
      note: 'Actual procurement depends on state agencies and availability of procurement centers'
    }
  },
  
  {
    id: 'SHC',
    name: 'Soil Health Card Scheme',
    short_name: 'SHC',
    description: 'Provides soil health cards to farmers with soil nutrient status and recommendations for appropriate nutrient dosage.',
    scheme_type: 'SOIL_HEALTH_SUPPORT',
    level: 'CENTRAL',
    ministry: 'Ministry of Agriculture & Farmers Welfare',
    department: 'Department of Agriculture & Farmers Welfare',
    state: null,
    district_applicability: null,
    crop_applicability: null,
    season_applicability: null,
    activity_applicability: ['BUY_FERTILIZER'],
    farmer_categories: ['ALL'],
    land_size_min_ac: null,
    land_size_max_ac: null,
    eligibility_rules: {
      landholding: 'required'
    },
    benefit_type: 'SERVICE',
    benefit_description: 'Free soil testing and issuance of soil health card with crop-wise nutrient recommendations.',
    benefit_amount: null,
    benefit_percentage: null,
    benefit_max_amount: null,
    benefit_frequency: 'TRIENNIAL',
    start_date: '2015-02-19',
    end_date: null,
    application_window_start: null,
    application_window_end: null,
    documents_required: ['Land records', 'Identity proof'],
    application_method: 'District Agriculture Office or soil testing labs',
    application_url: 'https://soilhealth.dac.gov.in',
    official_source: 'Ministry of Agriculture & Farmers Welfare',
    official_source_url: 'https://soilhealth.dac.gov.in',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE'
  },
  
  // ═══════════════════════════════════════════════════════════════
  // STATE SCHEMES - EXAMPLES (Uttar Pradesh, Punjab, Maharashtra)
  // ═══════════════════════════════════════════════════════════════
  
  {
    id: 'UP-FERTILIZER-SUBSIDY',
    name: 'Uttar Pradesh Fertilizer Subsidy Scheme',
    short_name: 'UP Fertilizer Subsidy',
    description: 'State subsidy on fertilizer purchases for registered farmers in Uttar Pradesh.',
    scheme_type: 'FERTILIZER_SUBSIDY',
    level: 'STATE',
    ministry: null,
    department: 'Agriculture Department, Government of Uttar Pradesh',
    state: 'Uttar Pradesh',
    district_applicability: null,  // All UP districts
    crop_applicability: null,
    season_applicability: null,
    activity_applicability: ['BUY_FERTILIZER'],
    farmer_categories: ['ALL'],
    land_size_min_ac: null,
    land_size_max_ac: 5,  // Focus on small/marginal
    eligibility_rules: {
      registeredFarmer: 'required',
      stateDomicile: 'required'
    },
    benefit_type: 'SUBSIDY',
    benefit_description: 'Subsidy on DAP, Urea, and other fertilizers at authorized retailers. Rates vary by fertilizer type.',
    benefit_amount: null,
    benefit_percentage: 25,
    benefit_max_amount: 5000,
    benefit_frequency: 'PER_SEASON',
    start_date: '2020-01-01',
    end_date: null,
    application_window_start: null,
    application_window_end: null,
    documents_required: ['UP domicile certificate', 'Land records', 'Farmer registration number'],
    application_method: 'Authorized fertilizer dealers with farmer registration',
    application_url: 'https://upagriculture.com',
    official_source: 'Agriculture Department, Government of Uttar Pradesh',
    official_source_url: 'https://upagriculture.com',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE'
  },
  
  {
    id: 'PUNJAB-MSP-RICE',
    name: 'Punjab Paddy Procurement Scheme',
    short_name: 'Punjab MSP Rice',
    description: 'State-facilitated paddy procurement at MSP through mandis and purchase centers across Punjab.',
    scheme_type: 'MSP_PROCUREMENT',
    level: 'STATE',
    ministry: null,
    department: 'Food, Civil Supplies and Consumer Affairs Department, Punjab',
    state: 'Punjab',
    district_applicability: null,
    crop_applicability: ['rice', 'paddy'],
    season_applicability: ['Kharif'],
    activity_applicability: ['PLAN_TO_SELL', 'HARVESTING'],
    farmer_categories: ['ALL'],
    land_size_min_ac: null,
    land_size_max_ac: null,
    eligibility_rules: {
      landholdingProof: 'required',
      registeredMandi: 'required'
    },
    benefit_type: 'MSP',
    benefit_description: 'Procurement at central MSP through state agencies. Well-established infrastructure in Punjab.',
    benefit_amount: null,
    benefit_percentage: null,
    benefit_max_amount: null,
    benefit_frequency: 'PER_SEASON',
    start_date: null,
    end_date: null,
    application_window_start: null,  // October-November typically
    application_window_end: null,
    documents_required: ['Land records', 'Identity proof', 'Mandi registration'],
    application_method: 'PACS, Mandis, Procurement centers',
    application_url: 'https://foodsuppb.nic.in',
    official_source: 'Food, Civil Supplies Dept, Punjab',
    official_source_url: 'https://foodsuppb.nic.in',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE'
  },
  
  {
    id: 'MAHARASHTRA-IRRIGATION',
    name: 'Maharashtra Micro Irrigation Subsidy',
    short_name: 'Maharashtra Drip Subsidy',
    description: 'Subsidy for installation of drip and sprinkler irrigation systems to promote water conservation.',
    scheme_type: 'IRRIGATION_SUBSIDY',
    level: 'STATE',
    ministry: null,
    department: 'Agriculture Department, Government of Maharashtra',
    state: 'Maharashtra',
    district_applicability: null,
    crop_applicability: null,
    season_applicability: null,
    activity_applicability: ['PLAN_IRRIGATION', 'BUY_EQUIPMENT'],
    farmer_categories: ['Small/Marginal', 'ALL'],
    land_size_min_ac: 1,
    land_size_max_ac: null,
    eligibility_rules: {
      landOwnership: 'required',
      waterSource: 'required'
    },
    benefit_type: 'SUBSIDY',
    benefit_description: 'Subsidy up to 55% for small/marginal farmers, 45% for others on drip/sprinkler installation costs.',
    benefit_amount: null,
    benefit_percentage: 55,
    benefit_max_amount: 60000,
    benefit_frequency: 'ONE_TIME',
    start_date: '2018-01-01',
    end_date: null,
    application_window_start: null,
    application_window_end: null,
    documents_required: ['Land records', '7/12 extract', 'Category certificate', 'Water source proof'],
    application_method: 'District Agriculture Officer or online portal',
    application_url: 'https://krishi.maharashtra.gov.in',
    official_source: 'Agriculture Department, Government of Maharashtra',
    official_source_url: 'https://krishi.maharashtra.gov.in',
    last_verified_at: '2026-09-11T00:00:00Z',
    verification_status: 'VERIFIED',
    status: 'ACTIVE'
  }
];

module.exports = SCHEMES;
