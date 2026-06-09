import React from 'react';

const PlanSkeleton = () => (
  <div className="plan-card" style={{ opacity: 0.5 }}>
    {[80, 40, 24, 24, 24].map((w, i) => (
      <div key={i} className="skeleton" style={{ width: `${w}%`, marginBottom: 10 }} />
    ))}
  </div>
);

export default PlanSkeleton;