import DistrictCard from './DistrictCard.jsx';
import './InfoBox.css';

export default function InfoBox({
  districtData,
  hoveredGeoid,
  selectedGeoid,
  onDistrictHover,
  onDistrictSelect,
}) {
  return (
    <div className="info-box">
      {/* ── Fixed left header panel ─────────────────────────────────────── */}
      <div className="info-header">
        <div>
          <h1 className="info-title">Vote Maximizer 2026</h1>
          <p className="info-subtitle">
            Where does a single vote have the most power in 2026 elections?
          </p>
        </div>

        <div className="info-links">
          <a
            href="#api-docs"
            className="info-api-link"
            onClick={(e) => e.preventDefault()}
          >
            Use Vote Maximizer data with our API
          </a>
        </div>

        <div className="info-org">
          A project by{' '}
          <a
            href="https://electoral-lab.org"
            target="_blank"
            rel="noopener noreferrer"
          >
            the Electoral Innovation Lab
          </a>
        </div>
      </div>

      {/* ── Scrollable district list ────────────────────────────────────── */}
      <div className="district-list">
        {districtData.length === 0 ? (
          <div className="list-loading">Loading district data…</div>
        ) : (
          <>
            <div className="list-header">
              <span className="lh-rank">#</span>
              <span className="lh-district">District</span>
              <span className="lh-cook">Cook Rating</span>
              <span className="lh-vp">Voter Power</span>
            </div>

            {districtData.map((district, idx) => (
              <DistrictCard
                key={district.geoid ?? district.label}
                district={district}
                rank={idx + 1}
                isHovered={hoveredGeoid === district.geoid}
                isSelected={selectedGeoid === district.geoid}
                onHover={() => onDistrictHover(district.geoid)}
                onLeave={() => onDistrictHover(null)}
                onClick={() =>
                  onDistrictSelect(
                    selectedGeoid === district.geoid ? null : district.geoid
                  )
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
