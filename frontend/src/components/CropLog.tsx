import React from 'react';
import { useState, useEffect } from 'react';
import { Plus, Calendar, Sprout, Loader2, Trash2 } from 'lucide-react';
import { getActiveCrops, getCropStatus, deleteCropCycle, type CropCycle } from '../lib/crop-db';
import { supabase } from '../lib/supabase';
import { getCurrentUser } from '../lib/auth-helpers';

interface CropLogProps {
  onAddCrop?: () => void;
}

// Sample crops data - hardcoded for display
const HARDCODED_CROPS: CropCycle[] = [
  {
    crop_id: 1,
    crop_name: 'Wheat',
    sowing_date: '2024-12-07',
    expected_harvest_date: '2025-04-06',
    current_stage: 'vegetative',
    is_active: true,
    user_id: 'demo',
    predicted_yield: undefined
  },
  {
    crop_id: 2,
    crop_name: 'Mustard',
    sowing_date: '2024-11-14',
    expected_harvest_date: '2025-02-12',
    current_stage: 'rosette',
    is_active: true,
    user_id: 'demo',
    predicted_yield: undefined
  },
  {
    crop_id: 3,
    crop_name: 'Onion',
    sowing_date: '2024-11-21',
    expected_harvest_date: '2025-03-21',
    current_stage: 'bulb-stage',
    is_active: true,
    user_id: 'demo',
    predicted_yield: undefined
  }
];

// Separate component for each crop card to handle async status
function CropCard({ crop, refreshKey, onDelete, isHardcoded }: { crop: CropCycle; refreshKey?: number; onDelete: (cropId: number) => void; isHardcoded?: boolean }) {
  const [status, setStatus] = useState<'healthy' | 'attention' | 'critical'>('healthy');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isDeleting, setIsDeleting] = useState(false);

  // Hardcoded status for demo crops
  const hardcodedStatus: Record<string, 'healthy' | 'attention' | 'critical'> = {
    'Wheat': 'healthy',
    'Mustard': 'attention',
    'Onion': 'healthy'
  };

  useEffect(() => {
    const loadStatus = async () => {
      if (isHardcoded) {
        // Use hardcoded status for demo crops
        setStatus(hardcodedStatus[crop.crop_name] || 'healthy');
        return;
      }
      
      setIsRefreshing(true);
      try {
        console.log(`🔄 [${new Date().toLocaleTimeString()}] Re-evaluating ${crop.crop_name} status from database...`);
        const cropStatus = await getCropStatus(crop);
        console.log(`✅ [${new Date().toLocaleTimeString()}] ${crop.crop_name} status: ${cropStatus}`);
        setStatus(cropStatus);
        setLastUpdated(new Date());
      } catch (error) {
        console.error('Error loading crop status:', error);
      } finally {
        setIsRefreshing(false);
      }
    };
    loadStatus();
  }, [crop.crop_id, refreshKey, isHardcoded]); // Refresh when refreshKey changes

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getStatusColor = (status: 'healthy' | 'attention' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'attention':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'critical':
        return 'bg-red-100 text-red-700 border-red-200';
    }
  };

  const getStatusLabel = (status: 'healthy' | 'attention' | 'critical') => {
    switch (status) {
      case 'healthy':
        return 'On Track';
      case 'attention':
        return 'Low Water';
      case 'critical':
        return 'Urgent Action';
    }
  };

  const getFieldInfo = (cropName: string) => {
    const fieldMap: Record<string, string> = {
      'Wheat': 'Field A - 2.5 ac',
      'Mustard': 'Field B - 1.8 ac',
      'Onion': 'Field C - 1.2 ac'
    };
    return fieldMap[cropName] || '';
  };

  const getDaysSincePlanting = (sowingDate: string) => {
    const sowing = new Date(sowingDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - sowing.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getTotalDuration = (sowingDate: string, harvestDate: string) => {
    const sowing = new Date(sowingDate);
    const harvest = new Date(harvestDate);
    const diffTime = Math.abs(harvest.getTime() - sowing.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysSincePlanting = getDaysSincePlanting(crop.sowing_date);
  const totalDuration = crop.expected_harvest_date ? getTotalDuration(crop.sowing_date, crop.expected_harvest_date) : 120;
  const progressPercentage = Math.min((daysSincePlanting / totalDuration) * 100, 100);

  const handleDelete = async () => {
    if (isHardcoded) {
      alert('Cannot delete demo crops');
      return;
    }
    
    if (!confirm(`Are you sure you want to delete ${crop.crop_name}?`)) {
      return;
    }
    
    setIsDeleting(true);
    try {
      const success = await deleteCropCycle(crop.crop_id);
      if (success) {
        console.log(`✅ Deleted crop: ${crop.crop_name}`);
        onDelete(crop.crop_id);
      } else {
        alert('Failed to delete crop. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting crop:', error);
      alert('Error deleting crop. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-green-100 hover:shadow-md transition-shadow relative group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center text-2xl">
            {crop.crop_name === 'Wheat' && '🌾'}
            {crop.crop_name === 'Mustard' && '🌿'}
            {crop.crop_name === 'Onion' && '🧅'}
            {!['Wheat', 'Mustard', 'Onion'].includes(crop.crop_name) && <Sprout className="w-6 h-6 text-green-600" />}
          </div>
          <div>
            <h3 className="text-gray-800 font-semibold text-lg">{crop.crop_name}</h3>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
              <span>{getFieldInfo(crop.crop_name)}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(status)}`}
          >
            {getStatusLabel(status)}
          </div>
          {!isHardcoded && (
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-8 h-8 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50"
              title="Delete crop"
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 text-red-600 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 text-red-600" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Growth Stage and Progress */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-500 capitalize">{crop.current_stage.replace('-', ' ')}</span>
          <span className="text-sm font-semibold text-gray-700">{daysSincePlanting}/{totalDuration}d</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100">
        <div>
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Planted</span>
          </div>
          <p className="text-gray-700 text-sm">{formatDate(crop.sowing_date)}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 text-gray-500 text-sm mb-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Harvest</span>
          </div>
          <p className="text-gray-700 text-sm">
            {crop.expected_harvest_date ? formatDate(crop.expected_harvest_date) : 'TBD'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function CropLog({ onAddCrop }: CropLogProps) {
  const [crops, setCrops] = useState<CropCycle[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Changed to false since we have hardcoded data
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Combine hardcoded crops with database crops
  const allCrops = [...HARDCODED_CROPS, ...crops];

  useEffect(() => {
    loadCrops();
    
    // Set up polling to refresh status every 5 seconds (faster for testing)
    const pollInterval = setInterval(() => {
      console.log('🔄 Auto-refreshing crop status...');
      setRefreshKey(prev => prev + 1);
    }, 5000); // Refresh every 5 seconds

    // Listen for visibility change to refresh when user returns to tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Tab visible, refreshing crop status...');
        setRefreshKey(prev => prev + 1);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for custom disease detection event
    const handleDiseaseDetected = () => {
      console.log('🦠 Disease detected event, refreshing crop status...');
      setRefreshKey(prev => prev + 1);
    };
    window.addEventListener('diseaseDetected', handleDiseaseDetected);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('diseaseDetected', handleDiseaseDetected);
    };
  }, []);

  const loadCrops = async () => {
    setError('');
    try {
      const data = await getActiveCrops();
      // Filter out any crops that match hardcoded IDs to avoid duplicates
      const filteredData = data.filter(c => c.crop_id > 1000); // Hardcoded crops use IDs 1-3
      setCrops(filteredData);
    } catch (err) {
      console.error('Error loading crops:', err);
      // Don't show error since we have hardcoded crops
    }
  };

  const handleDeleteCrop = (cropId: number) => {
    // Remove crop from local state immediately
    setCrops(prevCrops => prevCrops.filter(c => c.crop_id !== cropId));
  };

  const addSampleCrops = async () => {
    alert('Sample crops are already displayed! These are the demo crops shown by default.');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-800">My Crops</h2>
          <p className="text-gray-500 text-sm mt-1">Track your planted crops</p>
        </div>
        <button 
          onClick={onAddCrop}
          className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-colors shadow-md active:scale-95"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-sm">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
        </div>
      )}

      {/* Crops List - Always show hardcoded crops */}
      <div className="space-y-3">
        {allCrops.map((crop) => (
          <CropCard 
            key={crop.crop_id} 
            crop={crop} 
            refreshKey={refreshKey} 
            onDelete={handleDeleteCrop}
            isHardcoded={crop.crop_id <= 3} // Hardcoded crops have IDs 1-3
          />
        ))}
      </div>
    </div>
  );
}


