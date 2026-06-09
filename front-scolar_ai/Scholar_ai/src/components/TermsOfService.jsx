import React, { useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCheckCircle,
  FiDownload,
  FiArrowLeft,
  FiFileText,
  FiShield,
  FiClock,
  FiDollarSign,
  FiBookOpen,
} from "react-icons/fi";
import { SECTIONS } from "./termsData"; // données externalisées
import "./TermsOfService.css";
import { useNavigate } from "react-router-dom";

// Animation variants
const fadeInRight = {
  initial: { opacity: 0, x: 15 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -15 },
};

const indicatorTransition = {
  type: "spring",
  stiffness: 350,
  damping: 30,
};

const SectionContent = ({ section }) => {
  const { title, content } = section;
  return (
    <motion.div
      key={title}
      variants={fadeInRight}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.2 }}
    >
      <h2 className="tos-pane-title">{title}</h2>
      <div className="tos-section-content">
        {content.map((block, idx) => {
          if (block.type === "text") {
            return (
              <div key={idx}>
                <h3>{block.subtitle}</h3>
                <p>{block.text}</p>
              </div>
            );
          }
          if (block.type === "highlight-grid") {
            return (
              <div key={idx} className="tos-grid-highlights">
                {block.items.map((item, i) => (
                  <div className="tos-highlight-item" key={i}>
                    <span className="tos-highlight-icon">
                    <item.icon size={20} />
                    </span>
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          return null;
        })}
      </div>
    </motion.div>
  );
};

export default function TermsOfService({ onAccept, onDecline, onBack }) {
  const [activeId, setActiveId] = useState(SECTIONS[0].id);
    const navigate =useNavigate();
  const currentSection = SECTIONS.find((s) => s.id === activeId);

  const handleAccept = useCallback(() => {
    if (onAccept) onAccept();
  }, [onAccept]);

  const handleDecline = useCallback(() => {
    if (onDecline) onDecline();
  }, [onDecline]);

  const handleBack = useCallback(() => {
    if (onBack) onBack();
  }, [onBack]);

  return (
    <div className="tos-wrapper">
      {/* HEADER */}
      <header className="tos-header">
        <div className="tos-header-container">
          <div className="tos-header-text">
            {onBack && (
              <button onClick={handleBack} className="tos-back-btn" aria-label="Retour">
                <FiArrowLeft size={18} /> Retour
              </button>
            )}
            <h1>Terms of Service</h1>
            <p>Read our terms below to learn more about your rights and responsibilities</p>
          </div>
          <div className="tos-header-illustration" aria-hidden="true">
            {/* image */}
            <img src="../../src/assets/home.jpeg" alt="phone image" width={150} height={300} />
            <div className="tos-floating-badge accent-badge">
              <FiCheckCircle size={14} /> Accept
            </div>
            <div className="tos-floating-badge download-badge">
              <FiDownload size={14} /> Download
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="tos-main-container">
        {/* Sidebar Navigation */}
        <nav className="tos-sidebar" aria-label="Terms sections">
          <ul className="tos-nav-list">
            {SECTIONS.map((sec) => {
              const isActive = sec.id === activeId;
              return (
                <li key={sec.id} className="tos-nav-item">
                  <button
                    onClick={() => setActiveId(sec.id)}
                    className={`tos-nav-link ${isActive ? "active" : ""}`}
                    aria-current={isActive ? "section" : undefined}
                  >
                    {sec.num}. {sec.title}
                  </button>
                  {isActive && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="tos-active-indicator"
                      transition={indicatorTransition}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <button className="tos-download-pdf-btn" aria-label="Télécharger le PDF">
            <FiFileText size={16} /> Download PDF
          </button>
        </nav>

        {/* Content Pane */}
        <section className="tos-content-pane" aria-live="polite">
          <AnimatePresence mode="wait">
            {currentSection && <SectionContent key={currentSection.id} section={currentSection} />}
          </AnimatePresence>

          <div className="tos-action-bar">
            <button onClick={handleDecline} className="tos-btn-decline">
              Decline
            </button>
            <button onClick={handleAccept} className="tos-btn-accept">
              Accept & Download App
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}