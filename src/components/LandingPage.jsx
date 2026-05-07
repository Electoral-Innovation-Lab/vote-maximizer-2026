import { useState, useEffect, useRef } from 'react';
import './LandingPage.css';

const TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

async function geocodeQuery(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TOKEN}&country=us&limit=1&types=address,place,region,neighborhood,postcode`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.features?.length) return null;
  const [lng, lat] = data.features[0].center;
  return { lat, lng, placeName: data.features[0].place_name };
}

async function geocodeSuggest(query) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${TOKEN}&country=us&limit=5&types=address,place,region,neighborhood,postcode&autocomplete=true`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.features ?? [];
}

export default function LandingPage({ onDismiss, onSearch, onAbout }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dismissing, setDismissing] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const suggestTimer = useRef(null);
  const suggestionsRef = useRef(null);

  // Slide up on scroll down or swipe up
  useEffect(() => {
    let touchStartY = 0;
    const onWheel = (e) => { if (e.deltaY > 40 && !dismissing) startDismiss(); };
    const onTouchStart = (e) => { touchStartY = e.touches[0].clientY; };
    const onTouchMove = (e) => {
      if (touchStartY - e.touches[0].clientY > 60 && !dismissing) startDismiss();
    };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, [dismissing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Hide suggestions on outside click
  useEffect(() => {
    function onDocClick(e) {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  function startDismiss(searchResult) {
    setDismissing(true);
    setTimeout(() => {
      if (searchResult) onSearch(searchResult);
      onDismiss();
    }, 600);
  }

  function handleQueryChange(e) {
    const val = e.target.value;
    setQuery(val);
    setError('');
    clearTimeout(suggestTimer.current);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    suggestTimer.current = setTimeout(async () => {
      const results = await geocodeSuggest(val.trim());
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    }, 220);
  }

  async function handleSuggestionClick(feature) {
    setShowSuggestions(false);
    setSuggestions([]);
    const [lng, lat] = feature.center;
    startDismiss({ lat, lng, placeName: feature.place_name });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setShowSuggestions(false);
    setLoading(true);
    setError('');
    const result = await geocodeQuery(query.trim());
    setLoading(false);
    if (!result) {
      setError('Location not found. Try a city, address, or zip code.');
      return;
    }
    startDismiss(result);
  }

  return (
    <div className={`landing ${dismissing ? 'landing--out' : ''}`}>
      {/* Nav */}
      <nav className="landing-nav">
        <span className="landing-wordmark">Vote Maximizer 2026</span>
        <button className="landing-nav-link" onClick={onAbout}>About</button>
      </nav>

      {/* Hero */}
      <div className="landing-hero">
        <div className="landing-eyebrow anim-1">2026 Election Cycle</div>
        <h1 className="landing-headline anim-2">
          Maximize the impact of<br />your canvassing and donations.
        </h1>
        <p className="landing-sub anim-3">
          In a competitive race, a single vote can tip the balance.<br className="landing-br" />
          We calculate exactly where that is.<br className="landing-br" />
          A project of the <a href="https://www.electoral-lab.org/" style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.2)' }}>Electoral Innovation Lab.</a>
        </p>

        {/* Stat pills */}
        <div className="landing-stats anim-4">
          <div className="landing-stat">
            <span className="stat-num">35</span>
            <span className="stat-label">Senate races</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="stat-num">3,000+</span>
            <span className="stat-label">Competitive races</span>
          </div>
          <div className="landing-stat-divider" />
          <div className="landing-stat">
            <span className="stat-num">9</span>
            <span className="stat-label">Race types</span>
          </div>
        </div>

        {/* Search */}
        <form className="landing-search anim-5" onSubmit={handleSubmit}>
          <div className="landing-search-inner">
            <svg className="landing-search-icon" viewBox="0 0 20 20" fill="none">
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              className="landing-search-input"
              type="text"
              value={query}
              onChange={handleQueryChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Enter your city, address, or zip code"
              autoComplete="off"
            />
            <button className="landing-search-btn" type="submit" disabled={loading}>
              {loading ? '…' : 'Find races'}
            </button>
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="landing-suggestions" ref={suggestionsRef}>
              {suggestions.map((f) => (
                <li
                  key={f.id}
                  className="landing-suggestion-item"
                  onMouseDown={(e) => { e.preventDefault(); handleSuggestionClick(f); }}
                >
                  <svg className="landing-suggest-icon" viewBox="0 0 16 16" fill="none">
                    <circle cx="6.5" cy="6.5" r="4" stroke="currentColor" strokeWidth="1.4"/>
                    <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  <span>{f.place_name}</span>
                </li>
              ))}
            </ul>
          )}
          {error && <p className="landing-search-error">{error}</p>}
        </form>

        <button className="landing-skip anim-5" onClick={() => startDismiss()}>
          Browse the full map ↓
        </button>
      </div>

      {/* Scroll hint */}
      <div className="landing-scroll-hint anim-6">
        <div className="landing-scroll-arrow" />
        <span>Scroll to explore</span>
      </div>
    </div>
  );
}
