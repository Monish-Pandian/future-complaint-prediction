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
 * Reusable KpiCard component for Admin Dashboard Intelligence Panels (Stitch Pattern)
 */
export default function KpiCard({
  label,
  value,
  supportingText,
  change,
  status = 'info', // 'warning' | 'critical' | 'info' | 'success' | 'accent'
  prefix = '',
  suffix = '',
  icon = null,
}) {
  const animatedValue = useCountUp(value, 800);

  const getStatusClass = () => {
    if (status === 'critical' || status === 'danger') return 'danger';
    if (status === 'warning') return 'warning';
    if (status === 'success') return 'success';
    return 'accent';
  };

  return (
    <div className="stitch-telemetry-card" role="region" aria-label={label}>
      <div className="stitch-card-top">
        <span className="stitch-card-label">{label}</span>
        <div className={`stitch-card-icon ${getStatusClass()}`}>
          {icon || <span className="stitch-live-dot" />}
        </div>
      </div>

      <div className="stitch-card-value-wrap">
        <span className="stitch-card-value" aria-live="polite">
          {prefix}
          {animatedValue.toLocaleString()}
          {suffix}
        </span>
      </div>

      <p className="stitch-card-subtext">{supportingText}</p>

      <div className="stitch-card-footer">
        <span>{change || 'Live Stream Active'}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <span className={`stitch-live-dot ${getStatusClass()}`} style={{ width: '5px', height: '5px' }} />
          SLA 48h
        </span>
      </div>
    </div>
  );
}
