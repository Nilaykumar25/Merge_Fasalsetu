'use strict';

/**
 * config/diseaseKnowledge.js
 * Disease treatment and prevention information
 * Separate from model - allows model updates without changing treatment advice
 */

const DISEASE_KNOWLEDGE = {
  // ── Fungal Diseases ──
  'Early Blight': {
    symptoms: [
      'Dark concentric rings on lower leaves',
      'Yellow halos around lesions',
      'Premature leaf drop'
    ],
    treatment: [
      'Remove affected leaves',
      'Apply copper-based fungicide',
      'Improve air circulation',
      'Avoid overhead watering'
    ],
    prevention: [
      'Use disease-resistant varieties',
      'Rotate crops every 2-3 years',
      'Maintain proper spacing',
      'Mulch to prevent soil splash'
    ],
    organic: [
      'Neem oil spray',
      'Copper sulfate solution',
      'Baking soda spray (1 tbsp per liter)'
    ]
  },

  'Late Blight': {
    symptoms: [
      'Water-soaked lesions on leaves',
      'White fungal growth on undersides',
      'Rapid leaf death',
      'Brown lesions on stems and fruit'
    ],
    treatment: [
      'Remove and destroy infected plants immediately',
      'Apply chlorothalonil or mancozeb fungicide',
      'Improve drainage',
      'Reduce humidity'
    ],
    prevention: [
      'Plant certified disease-free seeds',
      'Avoid overhead irrigation',
      'Ensure good air circulation',
      'Monitor weather - spreads in cool, wet conditions'
    ],
    urgent: true
  },

  'Gray Leaf Spot': {
    symptoms: [
      'Rectangular gray-brown lesions',
      'Lesions run parallel to leaf veins',
      'Premature leaf death'
    ],
    treatment: [
      'Apply azoxystrobin or trifloxystrobin',
      'Remove crop residue',
      'Improve field drainage'
    ],
    prevention: [
      'Plant resistant hybrids',
      'Rotate with non-host crops',
      'Reduce plant density'
    ]
  },

  'Common Rust': {
    symptoms: [
      'Small circular or elongated rust-colored pustules',
      'Pustules on both leaf surfaces',
      'Severe infection causes leaf yellowing'
    ],
    treatment: [
      'Apply triazole or strobilurin fungicide',
      'Scout fields regularly'
    ],
    prevention: [
      'Plant resistant varieties',
      'Early planting reduces risk',
      'Monitor weather - spreads in moderate temps with dew'
    ]
  },

  'Northern Leaf Blight': {
    symptoms: [
      'Cigar-shaped gray-green lesions',
      'Lesions turn tan as they age',
      'Can cause significant yield loss'
    ],
    treatment: [
      'Apply azoxystrobin at first signs',
      'Scout weekly during susceptible growth stages'
    ],
    prevention: [
      'Plant resistant hybrids',
      'Crop rotation',
      'Till under crop residue'
    ]
  },

  'Apple Scab': {
    symptoms: [
      'Olive-green spots on leaves',
      'Velvety texture on lesions',
      'Fruit develops dark, scabby lesions'
    ],
    treatment: [
      'Apply captan or myclobutanil',
      'Rake and destroy fallen leaves',
      'Prune for better air circulation'
    ],
    prevention: [
      'Plant resistant varieties',
      'Apply dormant spray in spring',
      'Remove leaf litter in fall'
    ]
  },

  'Black Rot': {
    symptoms: [
      'Purple-bordered leaf spots',
      'Fruit develops concentric rings',
      'Mummified fruit remains on tree'
    ],
    treatment: [
      'Remove mummified fruit',
      'Prune dead wood',
      'Apply captan fungicide'
    ],
    prevention: [
      'Sanitation is critical',
      'Prune to improve air flow',
      'Remove infected fruit promptly'
    ]
  },

  // ── Bacterial Diseases ──
  'Bacterial Spot': {
    symptoms: [
      'Small dark spots with yellow halos',
      'Spots may have greasy appearance',
      'Fruit develops raised lesions'
    ],
    treatment: [
      'Apply copper-based bactericide',
      'Remove severely infected plants',
      'Avoid working in wet conditions'
    ],
    prevention: [
      'Use disease-free transplants',
      'Avoid overhead irrigation',
      'Rotate crops',
      'Use drip irrigation'
    ],
    organic: [
      'Copper hydroxide spray',
      'Remove volunteer plants'
    ]
  },

  // ── Viral Diseases ──
  'Yellow Leaf Curl Virus': {
    symptoms: [
      'Upward curling of leaves',
      'Yellow leaf margins',
      'Stunted plant growth',
      'Reduced fruit production'
    ],
    treatment: [
      'No cure - remove infected plants',
      'Control whitefly vectors',
      'Use reflective mulches'
    ],
    prevention: [
      'Plant resistant varieties',
      'Use insect-proof netting',
      'Control whitefly populations',
      'Remove volunteer tomato plants'
    ],
    urgent: true
  },

  'Mosaic Virus': {
    symptoms: [
      'Mottled light and dark green leaves',
      'Leaf distortion',
      'Stunted growth',
      'Reduced yield'
    ],
    treatment: [
      'Remove and destroy infected plants',
      'Disinfect tools',
      'Control aphid vectors'
    ],
    prevention: [
      'Use certified virus-free seeds',
      'Control aphids',
      'Avoid tobacco use near plants',
      'Wash hands before handling plants'
    ]
  },

  // ── Pest-related ──
  'Spider Mites': {
    symptoms: [
      'Fine webbing on leaves',
      'Stippling or tiny yellow spots',
      'Leaf bronzing',
      'Premature leaf drop'
    ],
    treatment: [
      'Spray with water to dislodge mites',
      'Apply horticultural oil',
      'Use miticides if severe'
    ],
    prevention: [
      'Maintain adequate soil moisture',
      'Avoid over-fertilizing with nitrogen',
      'Encourage beneficial insects'
    ],
    organic: [
      'Neem oil spray',
      'Insecticidal soap',
      'Release predatory mites'
    ]
  }
};

/**
 * Get treatment and prevention for a disease
 * @param {string} diseaseName
 * @returns {object|null}
 */
function getKnowledge(diseaseName) {
  return DISEASE_KNOWLEDGE[diseaseName] || null;
}

/**
 * Check if disease is urgent (requires immediate action)
 * @param {string} diseaseName
 * @returns {boolean}
 */
function isUrgent(diseaseName) {
  const knowledge = DISEASE_KNOWLEDGE[diseaseName];
  return knowledge?.urgent === true;
}

module.exports = {
  DISEASE_KNOWLEDGE,
  getKnowledge,
  isUrgent
};
