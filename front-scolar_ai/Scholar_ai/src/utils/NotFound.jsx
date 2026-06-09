import { Link } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  return (
    <div className="notfound-page">

      {/* ── Navbar ── */}
      <nav className="notfound-navbar">
        <Link to="/" className="notfound-logo">
          <span className="ai">AI.</span>
          <span className="school">School</span>
        </Link>
        <div className="notfound-nav-actions">
          <button className="btn-signin">Sign in</button>
          <button className="btn-signup">Sign up</button>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="notfound-main">

        {/* Illustration */}
        <div className="notfound-illustration">
          <div className="nf-deco-rect" />
          <div className="nf-deco-diamond" />
          <span className="nf-plus nf-plus-1">+</span>
          <span className="nf-plus nf-plus-2">+</span>
          <span className="nf-plus nf-plus-3">+</span>

          <svg
            className="nf-swing-wrap"
            viewBox="0 0 420 420"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Swing frame */}
            <rect x="60"  y="60" width="12" height="280" rx="6" fill="#3ecfb2" />
            <rect x="348" y="60" width="12" height="280" rx="6" fill="#3ecfb2" />
            <rect x="55"  y="55" width="310" height="14" rx="7" fill="#3ecfb2" />

            {/* Swing seats & ropes */}
            {/* Seat 1 (left – "4") */}
            <line x1="130" y1="69" x2="115" y2="230" stroke="#3ecfb2" strokeWidth="3" />
            <line x1="175" y1="69" x2="190" y2="230" stroke="#3ecfb2" strokeWidth="3" />
            <rect x="110" y="228" width="85" height="16" rx="5" fill="#3ecfb2" />

            {/* Seat 2 (middle – "0") */}
            <line x1="200" y1="69" x2="185" y2="220" stroke="#3ecfb2" strokeWidth="3" />
            <line x1="220" y1="69" x2="235" y2="220" stroke="#3ecfb2" strokeWidth="3" />
            <rect x="180" y="218" width="60"  height="16" rx="5" fill="#3ecfb2" />

            {/* Seat 3 (right – "4") */}
            <line x1="245" y1="69" x2="230" y2="230" stroke="#3ecfb2" strokeWidth="3" />
            <line x1="290" y1="69" x2="305" y2="230" stroke="#3ecfb2" strokeWidth="3" />
            <rect x="225" y="228" width="85" height="16" rx="5" fill="#3ecfb2" />

            {/* ── Number "4" left ── */}
            <text
              x="152" y="228"
              textAnchor="middle"
              fontSize="90"
              fontWeight="900"
              fontFamily="Nunito, sans-serif"
              fill="#4f46c8"
            >4</text>
            {/* boots left */}
            <rect x="120" y="320" width="28" height="22" rx="5" fill="#f06292" />
            <rect x="155" y="320" width="28" height="22" rx="5" fill="#f06292" />
            <rect x="116" y="335" width="36" height="14" rx="4" fill="#3f3fa0" />
            <rect x="151" y="335" width="36" height="14" rx="4" fill="#3f3fa0" />

            {/* ── Number "0" middle ── */}
            <text
              x="210" y="222"
              textAnchor="middle"
              fontSize="90"
              fontWeight="900"
              fontFamily="Nunito, sans-serif"
              fill="#3f3fa0"
            >0</text>
            {/* boots middle */}
            <rect x="183" y="314" width="28" height="22" rx="5" fill="#f06292" />
            <rect x="215" y="314" width="28" height="22" rx="5" fill="#f06292" />
            <rect x="179" y="329" width="36" height="14" rx="4" fill="#3f3fa0" />
            <rect x="211" y="329" width="36" height="14" rx="4" fill="#3f3fa0" />

            {/* ── Number "4" right ── */}
            <text
              x="268" y="228"
              textAnchor="middle"
              fontSize="90"
              fontWeight="900"
              fontFamily="Nunito, sans-serif"
              fill="#4f46c8"
            >4</text>
            {/* boots right */}
            <rect x="235" y="320" width="28" height="22" rx="5" fill="#f06292" />
            <rect x="270" y="320" width="28" height="22" rx="5" fill="#f06292" />
            <rect x="231" y="335" width="36" height="14" rx="4" fill="#3f3fa0" />
            <rect x="266" y="335" width="36" height="14" rx="4" fill="#3f3fa0" />

            {/* ── Trees ── */}
            {/* Tree 1 */}
            <ellipse cx="340" cy="340" rx="20" ry="28" stroke="#3ecfb2" strokeWidth="2" fill="none" />
            <ellipse cx="340" cy="316" rx="14" ry="20" stroke="#3ecfb2" strokeWidth="2" fill="none" />
            <line x1="340" y1="368" x2="340" y2="390" stroke="#3ecfb2" strokeWidth="2" />
            {/* Tree 2 (pink) */}
            <ellipse cx="370" cy="336" rx="16" ry="24" stroke="#f06292" strokeWidth="2" fill="none" />
            <ellipse cx="370" cy="314" rx="11" ry="16" stroke="#f06292" strokeWidth="2" fill="none" />
            <line x1="370" y1="360" x2="370" y2="390" stroke="#f06292" strokeWidth="2" />
          </svg>
        </div>

        {/* Text content */}
        <div className="notfound-content">
          <p className="notfound-subheading">Uh oh..</p>
          <h1 className="notfound-title">Something went wrong</h1>
          <p className="notfound-desc">
            Looks like this page doesn't exist or was removed.
          </p>
          <Link to="/" className="btn-home">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
            </svg>
            Back to Home
          </Link>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="notfound-footer">
        <div className="footer-left">
          © 2024 Brand, Inc. •
          <a href="#">Privacy</a> •
          <a href="#">Terms</a> •
          <a href="#">Sitemap</a>
        </div>
        <div className="footer-right">
          {/* Twitter/X */}
          <a href="#" className="social-icon" aria-label="Twitter">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.258 5.632 5.906-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </a>
          {/* Facebook */}
          <a href="#" className="social-icon" aria-label="Facebook">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </a>
          {/* LinkedIn */}
          <a href="#" className="social-icon" aria-label="LinkedIn">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </a>
          {/* YouTube */}
          <a href="#" className="social-icon" aria-label="YouTube">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 00-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 00.502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 002.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 002.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
          </a>
        </div>
      </footer>

    </div>
  );
}