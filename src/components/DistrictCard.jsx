import { useEffect, useRef } from 'react';
import { getDistrictColor, COOK_CONFIG } from '../utils/districtUtils.js';
import './InfoBox.css';

export default function DistrictCard({
  district,
  rank,
  isHovered,
  isSelected,
  onHover,
  onLeave,
  onClick,
}) {
  const ref = useRef(null);
  const cookCfg = COOK_CONFIG[district.cookRating] ?? {
    label: district.cookRating,
    color: '#475569',
    bg: '#f1f5f9',
  };
  const vpColor = getDistrictColor(district.voterPower);
  const vpRounded = Math.round(district.voterPower);

  // Scroll into view when this card becomes hovered or selected externally
  useEffect(() => {
    if ((isHovered || isSelected) && ref.current) {
      ref.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [isHovered, isSelected]);

  return (
    <div
      ref={ref}
      className={`district-card ${isHovered ? 'hovered' : ''} ${isSelected ? 'selected' : ''}`}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onClick}
    >
      <div className="card-rank">{rank}</div>

      <div className="card-info">
        <div className="card-label">{district.label}</div>
        <div className="card-state">{district.state}</div>
      </div>

      <span
        className="card-cook"
        style={{ color: cookCfg.color, background: cookCfg.bg }}
      >
        {cookCfg.label}
      </span>

      <div className="card-vp">
        <div className="vp-bar-track">
          <div
            className="vp-bar-fill"
            style={{ width: `${vpRounded}%`, background: vpColor }}
          />
        </div>
        <span className="vp-score">{vpRounded}</span>
      </div>
    </div>
  );
}
