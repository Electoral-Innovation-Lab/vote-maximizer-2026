import './AboutPage.css';

const SECTIONS = [
  {
    num: '01',
    title: 'What is Vote Maximizer?',
    body: `Vote Maximizer is designed to maximize the power of individual voters. We perform mathematical and strategic analysis to identify the races and ballot questions where per-voter impact is greatest in the 2026 election cycle.

    Our tool centers not on campaigns, but on the individual voter. Our goal is to give you the kind of rigorous analysis that campaign strategists provide to politicians — so you can optimize your time and resources to make the most difference.`,
  },
  {
    num: '02',
    title: 'The Principle of Voter Power',
    body: `Not all votes are created equal. Voter power means choosing the races where a few votes can actually make the difference. Rather than sending you to certain winners or certain losers, Vote Maximizer shows you the high-leverage cases: close knife-edge races and ballot questions that can change policy — even when legislatures fail to act.

    Voter power is especially high for ballot initiatives that can reshape policies and democracy itself for years to come. Examples include reproductive rights, ranked-choice voting, and anti-gerrymandering measures.`,
  },
  {
    num: '03',
    title: 'The Mathematics',
    body: `For each race, we ask: how much does a single additional vote shift the probability of a different outcome? We use a t-distribution probability density function centered on the projected margin, with an effective sigma (σ_eff) that blends polling uncertainty (σ ≈ 3.0 pts) with historical race-type volatility.

    The voter power score (0–100) is normalized within each race type. Statewide races are adjusted for electorate size using a turnout scaling factor (÷ turnout^0.3). House districts use no scaling since they have equal populations by law.`,
  },
  {
    num: '04',
    title: 'Data Sources',
    body: `Margins come from two sources, color-coded in the interface: real polling averages (sourced from Emerson, PPP, ASR, and Sabato's Crystal Ball, Jan–Mar 2026) shown in green, and Cook Political Report rating proxies shown in amber. Cook ratings are translated as: Toss-Up = 0, Lean = ±4 pts, Likely = ±9 pts, Solid = ±18 pts.

    As more polls become available through the election cycle, the Cook proxies are replaced with real data, and all Voter Power scores update automatically.`,
  },
  {
    num: '05',
    title: 'Effective Sigmas by Race Type',
    items: [
      { label: 'US Senate', value: '4.24 pts', note: 'Reference (1.00×)' },
      { label: 'US House', value: '4.00 pts', note: 'Matches 2024 VM formula' },
      { label: 'Governor', value: '5.18 pts', note: '1.22× Senate' },
      { label: 'Attorney General / Sec. of State', value: '5.00 pts', note: '1.18× Senate' },
      { label: 'Ballot Initiatives', value: '6.47 pts', note: '1.53× Senate — most volatile' },
    ],
  },
  {
    num: '06',
    title: 'About the Electoral Innovation Lab',
    body: `The Electoral Innovation Lab (EIL) is a research organization at Princeton University dedicated to improving the health of American democracy through rigorous quantitative analysis. Vote Maximizer is one of several tools EIL has developed to help citizens and researchers understand and strengthen democratic participation.`,
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
