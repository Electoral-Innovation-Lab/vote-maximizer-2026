import './AboutPage.css';

const SECTIONS = [
  {
    num: '01',
    title: 'What is Vote Maximizer?',
    body: `Vote Maximizer identifies high-impact races across three lenses: Democracy Moneyball (where to donate), Election Hotspots (where to canvass), and Civic Leverage (which elections are most at risk).

    Vote Maximizer uses mathematical and strategic analysis to find the 2026 contests where your donation, canvassing hours, or vote will have the greatest impact. Our tool centers on the individual voter — giving you the kind of rigorous strategic analysis that campaign teams use, so you can direct your time and money where they'll make the most difference.

    High-impact races are also the ones most worth defending. Where the margin is thin, voter suppression, misinformation, and administrative irregularities have the most effect. Vote Maximizer helps you find the contests where you can drive outcomes — and where defending democracy matters most.`,
  },
  {
    num: '02',
    title: 'The Principle of Voter Power',
    body: `Not all votes are created equal. Voter power means choosing the contests where a small number of votes can actually change the outcome: close, high-stakes elections where individual participation has measurable impact, rather than contests already decided by wide margins.

    Voter power is especially high in competitive ballot initiatives, which can reshape policy for years to come. These races often receive less attention than candidate elections despite their direct impact on issues like voting rights, redistricting, and electoral reform.

    A high voter power score also indicates a race worth defending. Close elections are where voter suppression, misinformation, and administrative interference have the most effect — making them both the highest-impact races for your participation, and the ones where defending democracy is most meaningful.`,
  },
  {
    num: '03',
    title: 'The Mathematics',
    body: `Every voter power score answers one question: how much does a single additional vote shift the probability of a different outcome? We use a t-distribution probability density function centered on the projected margin, with an effective sigma (σ_eff) that blends polling uncertainty (σ ≈ 3.0 pts) with historical race-type volatility.

    Scores are normalized 0–100 within each race type. Statewide races are adjusted for electorate size using a turnout scaling factor (÷ turnout^0.3). House districts use no scaling since they have equal populations by law.`,
  },
  {
    num: '04',
    title: 'Data Sources',
    body: `Margins come from two sources, color-coded in the interface: polling averages (sourced from Emerson, PPP, ASR, and Sabato's Crystal Ball, Jan-Jul 2026) shown in green, and rating proxies shown in amber. 2026 ratings are translated as: Toss-Up = 0, Lean = ±4 pts, Likely = ±9 pts, Solid = ±18 pts.

    As more polls become available through the election cycle, Cook proxies are replaced with real data and all voter power scores update automatically.`,
  },
  // {
  //   num: '05',
  //   title: 'Effective Sigmas by Race Type',
  //   items: [
  //     { label: 'US Senate', value: '4.24 pts', note: 'Reference (1.00×)' },
  //     { label: 'US House', value: '4.00 pts', note: 'Matches 2024 VM formula' },
  //     { label: 'Governor', value: '5.18 pts', note: '1.22× Senate' },
  //     { label: 'Attorney General / Sec. of State', value: '5.00 pts', note: '1.18× Senate' },
  //     { label: 'Ballot Initiatives', value: '6.47 pts', note: '1.53× Senate — most volatile' },
  //   ],
  // },
  {
    num: '05',
    title: 'About the Electoral Innovation Lab',
    body: `The Electoral Innovation Lab (EIL) is a Princeton, NJ based non-profit dedicated to building a science of democracy reform. Vote Maximizer is one of several tools EIL has developed to help citizens, researchers, and partner organizations understand and strengthen democratic participation.

    EIL's work is nonpartisan, independent, and evidence-driven. We believe that the same mathematical tools used by campaign strategists should be available to every voter — and that an informed, engaged citizenry is the most durable defense democracy has.`,
    link: { href: 'https://electoral-lab.org', label: 'Learn more at electoral-lab.org →' },
  },
];

export default function AboutPage({ onClose }) {
  return (
    <div className="about-overlay">
      <div className="about-panel">
        {/* Header */}
        <div className="about-header">
          <div>
            <h2 className="about-title">About Vote Maximizer</h2>
            <p className="about-tagline">The science of making your vote count more.</p>
          </div>
          <button className="about-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Content */}
        <div className="about-content">
          {SECTIONS.map((s) => (
            <section className="about-section" key={s.num}>
              <div className="about-section-num">{s.num}</div>
              <div className="about-section-body">
                <h3 className="about-section-title">{s.title}</h3>

                {s.body && s.body.split('\n\n').map((para, i) => (
                  <p className="about-para" key={i}>{para.trim()}</p>
                ))}

                {s.items && (
                  <div className="about-table">
                    {s.items.map((item) => (
                      <div className="about-table-row" key={item.label}>
                        <span className="about-table-label">{item.label}</span>
                        <span className="about-table-value">{item.value}</span>
                        <span className="about-table-note">{item.note}</span>
                      </div>
                    ))}
                  </div>
                )}

                {s.link && (
                  <a
                    className="about-link"
                    href={s.link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.link.label}
                  </a>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
