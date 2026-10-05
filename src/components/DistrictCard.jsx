import { useEffect, useRef } from 'react';
import { getDistrictColor, getScore, competitivenessConfig, COMPETITIVENESS_TITLE, COMPETITIVENESS_TOOLTIP } from '../utils/districtUtils.js';
import './InfoBox.css';

export default function DistrictCard({
  district,
  metric,
  rank,
  isHovered,
  isSelected,
  onHover,
  onLeave,
  onClick,
}) {
  const ref = useRef(null);
  const cookCfg = competitivenessConfig(district.competitiveness);
  const score = getScore(district, metric);
  const vpColor = getDistrictColor(score);
  const vpRounded = Math.round(score ?? 0);

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

      {district.competitiveness ? (
        <span
          className="card-cook"
          style={{ color: cookCfg.color, background: cookCfg.bg }}
          title={`${COMPETITIVENESS_TITLE}: ${COMPETITIVENESS_TOOLTIP}`}
        >
          {cookCfg.label}
        </span>
      ) : (
        <span className="card-cook" />
      )}

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
