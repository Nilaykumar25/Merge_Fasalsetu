'use strict';

/**
 * config/diseaseClasses.js
 * PlantVillage disease class mapping
 * Maps model output class names to structured disease information
 */

const DISEASE_CLASSES = {
  // ── Apple ──
  'Apple___Apple_scab': {
    crop: 'Apple',
    disease: 'Apple Scab',
    healthy: false,
    scientificName: 'Venturia inaequalis',
    category: 'fungal'
  },
  'Apple___Black_rot': {
    crop: 'Apple',
    disease: 'Black Rot',
    healthy: false,
    scientificName: 'Diplodia seriata',
    category: 'fungal'
  },
  'Apple___Cedar_apple_rust': {
    crop: 'Apple',
    disease: 'Cedar Apple Rust',
    healthy: false,
    scientificName: 'Gymnosporangium juniperi-virginianae',
    category: 'fungal'
  },
  'Apple___healthy': {
    crop: 'Apple',
    disease: null,
    healthy: true,
    category: 'healthy'
  },

  // ── Corn (Maize) ──
  'Corn_(maize)___Cercospora_leaf_spot Gray_leaf_spot': {
    crop: 'Corn',
    disease: 'Gray Leaf Spot',
    healthy: false,
    scientificName: 'Cercospora zeae-maydis',
    category: 'fungal'
  },
  'Corn_(maize)___Common_rust_': {
    crop: 'Corn',
    disease: 'Common Rust',
    healthy: false,
    scientificName: 'Puccinia sorghi',
    category: 'fungal'
  },
  'Corn_(maize)___Northern_Leaf_Blight': {
    crop: 'Corn',
    disease: 'Northern Leaf Blight',
    healthy: false,
    scientificName: 'Exserohilum turcicum',
    category: 'fungal'
  },
  'Corn_(maize)___healthy': {
    crop: 'Corn',
    disease: null,
    healthy: true,
    category: 'healthy'
  },

  // ── Tomato ──
  'Tomato___Bacterial_spot': {
    crop: 'Tomato',
    disease: 'Bacterial Spot',
    healthy: false,
    scientificName: 'Xanthomonas spp.',
    category: 'bacterial'
  },
  'Tomato___Early_blight': {
    crop: 'Tomato',
    disease: 'Early Blight',
    healthy: false,
    scientificName: 'Alternaria solani',
    category: 'fungal'
  },
  'Tomato___Late_blight': {
    crop: 'Tomato',
    disease: 'Late Blight',
    healthy: false,
    scientificName: 'Phytophthora infestans',
    category: 'fungal'
  },
  'Tomato___Leaf_Mold': {
    crop: 'Tomato',
    disease: 'Leaf Mold',
    healthy: false,
    scientificName: 'Passalora fulva',
    category: 'fungal'
  },
  'Tomato___Septoria_leaf_spot': {
    crop: 'Tomato',
    disease: 'Septoria Leaf Spot',
    healthy: false,
    scientificName: 'Septoria lycopersici',
    category: 'fungal'
  },
  'Tomato___Spider_mites Two-spotted_spider_mite': {
    crop: 'Tomato',
    disease: 'Spider Mites',
    healthy: false,
    scientificName: 'Tetranychus urticae',
    category: 'pest'
  },
  'Tomato___Target_Spot': {
    crop: 'Tomato',
    disease: 'Target Spot',
    healthy: false,
    scientificName: 'Corynespora cassiicola',
    category: 'fungal'
  },
  'Tomato___Tomato_Yellow_Leaf_Curl_Virus': {
    crop: 'Tomato',
    disease: 'Yellow Leaf Curl Virus',
    healthy: false,
    scientificName: 'Tomato yellow leaf curl virus',
    category: 'viral'
  },
  'Tomato___Tomato_mosaic_virus': {
    crop: 'Tomato',
    disease: 'Mosaic Virus',
    healthy: false,
    scientificName: 'Tomato mosaic virus',
    category: 'viral'
  },
  'Tomato___healthy': {
    crop: 'Tomato',
    disease: null,
    healthy: true,
    category: 'healthy'
  },

  // ── Potato ──
  'Potato___Early_blight': {
    crop: 'Potato',
    disease: 'Early Blight',
    healthy: false,
    scientificName: 'Alternaria solani',
    category: 'fungal'
  },
  'Potato___Late_blight': {
    crop: 'Potato',
    disease: 'Late Blight',
    healthy: false,
    scientificName: 'Phytophthora infestans',
    category: 'fungal'
  },
  'Potato___healthy': {
    crop: 'Potato',
    disease: null,
    healthy: true,
    category: 'healthy'
  },

  // ── Grape ──
  'Grape___Black_rot': {
    crop: 'Grape',
    disease: 'Black Rot',
    healthy: false,
    scientificName: 'Guignardia bidwellii',
    category: 'fungal'
  },
  'Grape___Esca_(Black_Measles)': {
    crop: 'Grape',
    disease: 'Esca (Black Measles)',
    healthy: false,
    scientificName: 'Complex of fungi',
    category: 'fungal'
  },
  'Grape___Leaf_blight_(Isariopsis_Leaf_Spot)': {
    crop: 'Grape',
    disease: 'Leaf Blight',
    healthy: false,
    scientificName: 'Pseudocercospora vitis',
    category: 'fungal'
  },
  'Grape___healthy': {
    crop: 'Grape',
    disease: null,
    healthy: true,
    category: 'healthy'
  },

  // ── Pepper (Bell Pepper) ──
  'Pepper,_bell___Bacterial_spot': {
    crop: 'Pepper',
    disease: 'Bacterial Spot',
    healthy: false,
    scientificName: 'Xanthomonas campestris',
    category: 'bacterial'
  },
  'Pepper,_bell___healthy': {
    crop: 'Pepper',
    disease: null,
    healthy: true,
    category: 'healthy'
  },

  // ── Add more as needed ──
};

/**
 * Get all supported crops
 * @returns {string[]}
 */
function getSupportedCrops() {
  const crops = new Set();
  Object.values(DISEASE_CLASSES).forEach(item => crops.add(item.crop));
  return Array.from(crops).sort();
}

/**
 * Get all diseases for a crop
 * @param {string} crop
 * @returns {string[]}
 */
function getDiseasesByCrop(crop) {
  return Object.values(DISEASE_CLASSES)
    .filter(item => item.crop === crop && !item.healthy)
    .map(item => item.disease);
}

/**
 * Map model class to disease info
 * @param {string} className
 * @returns {object|null}
 */
function getClassInfo(className) {
  return DISEASE_CLASSES[className] || null;
}

/**
 * Get all class names (for validation)
 * @returns {string[]}
 */
function getAllClassNames() {
  return Object.keys(DISEASE_CLASSES);
}

module.exports = {
  DISEASE_CLASSES,
  getSupportedCrops,
  getDiseasesByCrop,
  getClassInfo,
  getAllClassNames
};
