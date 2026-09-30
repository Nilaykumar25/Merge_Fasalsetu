/**
 * Script to add sample crops to the database
 * Run this from the browser console or as a one-time setup
 */

import { supabase } from '../src/lib/supabase';
import { getCurrentUser } from '../src/lib/auth-helpers';

interface SampleCrop {
  crop_name: string;
  sowing_date: string;
  current_stage: string;
  expected_harvest_date: string;
  field_name?: string;
  field_size?: string;
}

const sampleCrops: SampleCrop[] = [
  {
    crop_name: 'Wheat',
    sowing_date: '2024-11-07', // 22 days ago from today (assuming today is ~Nov 29)
    current_stage: 'vegetative',
    expected_harvest_date: '2025-03-07', // 120 days from sowing
    field_name: 'Field A',
    field_size: '2.5 ac'
  },
  {
    crop_name: 'Mustard',
    sowing_date: '2024-10-15', // 17 days ago from 75-day cycle
    current_stage: 'rosette',
    expected_harvest_date: '2025-01-13', // 90 days from sowing
    field_name: 'Field B',
    field_size: '1.8 ac'
  },
  {
    crop_name: 'Onion',
    sowing_date: '2024-10-22', // 38 days ago from 120-day cycle
    current_stage: 'bulb-stage',
    expected_harvest_date: '2025-02-19', // 120 days from sowing
    field_name: 'Field C',
    field_size: '1.2 ac'
  }
];

export async function addSampleCrops() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('❌ User not authenticated. Please log in first.');
      return;
    }

    console.log('🌾 Adding sample crops...');

    for (const crop of sampleCrops) {
      const { data, error } = await supabase
        .from('crop_cycles')
        .insert({
          user_id: user.id,
          crop_name: crop.crop_name,
          sowing_date: crop.sowing_date,
          current_stage: crop.current_stage,
          expected_harvest_date: crop.expected_harvest_date,
          is_active: true,
          notes: `${crop.field_name} - ${crop.field_size}`
        })
        .select()
        .single();

      if (error) {
        console.error(`❌ Error adding ${crop.crop_name}:`, error);
      } else {
        console.log(`✅ Added ${crop.crop_name} (${crop.field_name} - ${crop.field_size})`);
      }
    }

    console.log('🎉 Sample crops added successfully!');
    console.log('🔄 Refresh the page to see the crops in your Crop Log.');
  } catch (error) {
    console.error('❌ Error adding sample crops:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).addSampleCrops = addSampleCrops;
}
