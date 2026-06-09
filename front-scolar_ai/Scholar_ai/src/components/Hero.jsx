import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Download, FileText, RefreshCw, CheckCircle } from 'lucide-react';
import { PiStudentBold } from "react-icons/pi";
import './hero.css';
import { useNavigate } from 'react-router-dom';

// Contenu des trois panneaux (identifiés par une clé unique)
const panelContent = {
  source: (
    <>
      <div className="panel__content">
        <div className="panel__header">
          <div>Nom: <span className="panel__data">Jean Dupont</span></div>
          <div>Classe: <span className="panel__data">Terminale S1</span></div>
        </div>
        <div className="panel__lines">
          <div className="panel__score">15/20</div>
        </div>
      </div>
      <motion.div
        animate={{ top: ['0%', '100%', '0%'] }}
        transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
        className="panel__laser"
        aria-hidden="true"
      />
    </>
  ),
  extract: (
    <>
      <h3 className="panel__title">Informations détectées</h3>
      <div className="panel__field">
        <label className="panel__label">Élève</label>
        <div className="panel__row">
          <span className="panel__value">Jean Dupont</span>
          <span className="badge badge--confidence">Confiance : 95%</span>
        </div>
      </div>
      <div className="panel__field">
        <label className="panel__label">Classe</label>
        <div className="panel__row">
          <span className="panel__value">Terminale S1</span>
          <span className="badge badge--confidence">Confiance : 95%</span>
        </div>
      </div>
      <div className="panel__field">
        <label className="panel__label">Note détectée</label>
        <div className="panel__row">
          <span className="panel__value panel__value--bold">15 / 20</span>
          <span className="badge badge--high">Confiance : 98%</span>
        </div>
      </div>
    </>
  ),
  export: (
    <div className="panel__export-buttons">
      <button className="export-btn export-btn--primary">
        <Download className="export-btn__icon" aria-hidden="true" />
        <span className="export-btn__text">
          <span className="export-btn__main">Télécharger le fichier</span>
          <span className="export-btn__sub">.xlsx (Excel)</span>
        </span>
      </button>
      <button className="export-btn export-btn--secondary">
        <FileText className="export-btn__icon" aria-hidden="true" />
        <span className="export-btn__text">
          <span className="export-btn__main">Générer le rapport PDF</span>
        </span>
      </button>
      <button className="export-btn export-btn--secondary">
        <RefreshCw className="export-btn__icon" aria-hidden="true" />
        <span className="export-btn__text">
          <span className="export-btn__main">Envoyer vers le logiciel de gestion de notes</span>
        </span>
      </button>
    </div>
  )
};

export default function Hero() {
  // Ordre actuel des panneaux : [gauche, centre, droite]
  const [order, setOrder] = useState(['source', 'extract', 'export']);
  const navigate = useNavigate();
  // Gestion du clic sur un panneau
  const handlePanelClick = (clickedIndex) => {
    if (clickedIndex === 1) return; // déjà au centre, rien ne se passe

    setOrder((prevOrder) => {
      const newOrder = [...prevOrder];
      // Échange entre le panneau cliqué et le panneau central (index 1)
      [newOrder[clickedIndex], newOrder[1]] = [newOrder[1], newOrder[clickedIndex]];
      return newOrder;
    });
  };

  return (
    <div className="home">
      {/* Orbites floues décoratives */}
      <div className="glow glow--top-left" aria-hidden="true" />
      <div className="glow glow--top-right" aria-hidden="true" />
      <div className="glow glow--bottom-center" aria-hidden="true" />

      {/* Barre de navigation */}
      <header className="home__header" role="banner">
        <div className="home__logo">
          <div className="home__logo-icon">
            {/* <FileText className="home__logo-file" /> */}
            <PiStudentBold className="home__logo-file" />
            <CheckCircle className="home__logo-check" />
          </div>
          <span className="home__logo-text">Scholar AI</span>
        </div>
        <button 
        className="home__cta" aria-label="Commencer le scan gratuitement"
        onClick={() => navigate("/login")}
        >
          Commencer le scan gratuitement
        </button>
      </header>

      {/* Texte principal */}
      <main className="home__main">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="home__title"
        >
          Numérisez vos copies d'élèves en un instant.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="home__subtitle"
        >
          Scannez les feuilles de copie, extrayez automatiquement les informations des élèves
          avec leurs notes, et exportez le tout vers vos outils habituels.
        </motion.p>
      </main>

      {/* Visuel central – les 3 panneaux permutables */}
      <section className="panels" aria-label="Étapes du scan de copie">
        {order.map((panelKey, index) => {
          const isLeft = index === 0;
          const isCenter = index === 1;
          const isRight = index === 2;

          // Rotation perspective pour les panneaux latéraux
          const rotateY = isLeft ? 15 : isRight ? -15 : 0;

          // Classe CSS selon la position
          const slotClass = isLeft
            ? 'panel--left'
            : isCenter
            ? 'panel--center'
            : 'panel--right';

          return (
            <motion.div
              key={panelKey}
              layout
              className={`panel ${slotClass} ${isCenter ? '' : 'panel--clickable'}`}
              style={{ transformPerspective: 1200 }}
              animate={{ rotateY }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              onClick={() => handlePanelClick(index)}
              role="button"
              tabIndex={0}
              aria-label={`Panneau ${panelKey === 'source' ? 'source' : panelKey === 'extract' ? 'extraction' : 'export'}, ${
                isCenter ? 'actuellement au centre' : 'cliquez pour mettre au centre'
              }`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handlePanelClick(index);
              }}
            >
              {panelContent[panelKey]}
            </motion.div>
          );
        })}
      </section>

      {/* Pied de page – Preuve sociale */}
      <footer className="home__footer">
        <p className="home__footer-text">
          <span aria-hidden="true">📊</span> Déjà utilisé pour la gestion et la saisie de plus de 50,000 copies d'examens.
        </p>
        <div className="home__avatars" aria-label="Visages d'utilisateurs">
          {[
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&q=80',
            'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&q=80',
            'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&q=80',
            'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&q=80',
            'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=100&q=80'
          ].map((url, i) => (
            <img
              key={i}
              className="home__avatar"
              src={url}
              alt={`Utilisateur ${i + 1}`}
              loading="lazy"
            />
          ))}
        </div>
      </footer>

      {/* Étoile décorative */}
      <div className="home__star" aria-hidden="true">✦</div>
    </div>
  );
}