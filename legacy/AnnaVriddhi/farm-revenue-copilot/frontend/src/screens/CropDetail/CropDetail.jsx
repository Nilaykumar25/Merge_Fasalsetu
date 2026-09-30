import React from 'react';
import { useParams } from 'react-router-dom';

/**
 * CropDetail screen — per-crop status, grading, irrigation
 * recommendations, and timeline.
 */
export default function CropDetail() {
  const { cropId } = useParams();

  return (
    <main>
      <h1>Crop Detail</h1>
      <p>Crop ID: {cropId}</p>
      {/* TODO: StatusHero, GradeGauge, RecommendationList, Timeline */}
    </main>
  );
}
