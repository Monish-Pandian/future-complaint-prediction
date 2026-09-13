import React, { useEffect, useState } from 'react';

/**
 * Custom lightweight count-up hook for KPI numbers
 * Respects prefers-reduced-motion media query
 */
function useCountUp(targetValue, duration = 800) {
  const isReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [count, setCount] = useState(() => (isReducedMotion ? targetValue : 0));

  useEffect(() => {
    if (isReducedMotion) {
      return;
    }

    let startTime = null;
    let animationFrameId;

    const startValue = 0;
    const endValue = typeof targetValue === 'number' ? targetValue : parseInt(targetValue, 10) || 0;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      
      // Easing function: cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(startValue + (endValue - startValue) * easeOut);
      
      setCount(current);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [targetValue, duration, isReducedMotion]);

  return count;
}

/**
 * Reusable KpiCard component for Admin Dashboard Intelligence Panels
 */
export default function KpiCard({
  label,
  value,
  supportingText,
  change,
  status = 'info', // 'warning' | 'critical' | 'info' | 'success'
  prefix = '',
  suffix = '',
}) {
  const animatedValue = useCountUp(value, 800);

  return (
    <div className="kpi-card" role="region" aria-label={label}>
      <div className="kpi-header">
        <span className="kpi-label">{label}</span>
        <span
          className={`kpi-indicator-dot kpi-indicator-${status}`}
          aria-hidden="true"
        />
      </div>

      <div className="kpi-value" aria-live="polite">
        {prefix}
        {animatedValue.toLocaleString()}
        {suffix}
      </div>

      <div className="kpi-meta-row">
        <span className="kpi-meta">{supportingText}</span>
        {change && (
          <span
            className={`kpi-trend-pill ${
              status === 'critical' ? 'critical' : status === 'warning' || status === 'success' ? 'up' : ''
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
