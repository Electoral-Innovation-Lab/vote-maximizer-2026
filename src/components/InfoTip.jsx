import { useState } from 'react';
import './InfoTip.css';

export default function InfoTip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className={`infotip${open ? ' infotip--open' : ''}`}>
      <button
        className="infotip-trigger"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        aria-label="More information"
        type="button"
      >?</button>
      <span className="infotip-bubble" role="tooltip">{text}</span>
    </span>
  );
}
