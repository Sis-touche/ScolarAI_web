import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { motion, AnimatePresence } from 'framer-motion';
import { uploadAndAnalyzeFile, clearAnalysisResult } from '../../reducer/analysisSlice';
import MarkovIntro from '../../components/MarkovIntro';
import {
  FaChartBar, FaTrophy, FaExclamationTriangle, FaChartLine,
  FaArrowDown, FaCaretDown, FaBrain, FaFileAlt, FaCode, FaTimes,
  FaProjectDiagram, FaTh, FaShieldAlt, FaBook, FaChevronDown, FaChevronUp,
} from 'react-icons/fa';
import './FileAnalyzer.css';
// ─────────────────────────────────────────────────────────────
// ANIMATION VARIANTS
// ─────────────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show:   { opacity: 1, y: 0,  transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } },
  exit:   { opacity: 0, y: -12, transition: { duration: 0.2 } },
};

const stagger = { show: { transition: { staggerChildren: 0.05 } } };

const cardVariant = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  show:   { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } },
};

const rowVariant = {
  hidden: { opacity: 0, x: -8 },
  show:   { opacity: 1, x: 0, transition: { duration: 0.25 } },
};

const modalVariant = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  show:   { opacity: 1, scale: 1,    y: 0, transition: { type: 'spring', duration: 0.4 } },
  exit:   { opacity: 0, scale: 0.95, y: 15, transition: { duration: 0.2 } },
};

// ─────────────────────────────────────────────────────────────
// HELPERS — FICHIER ANALYZER
// ─────────────────────────────────────────────────────────────
const fmt       = (n) => (n !== undefined && n !== null ? n.toFixed(2) : 'N/A');
const scoreClass = (v) => {
  if (v === undefined || v === null) return '';
  if (v >= 14) return 'fa-score--high';
  if (v >= 10) return 'fa-score--mid';
  return 'fa-score--low';
};
const barColor  = (pct) => pct <= 20 ? 'var(--c-success)' : pct <= 50 ? 'var(--c-warning)' : 'var(--c-danger)';
const rankClass = (i)   => i < 3 ? `fa-rank fa-rank--${i + 1}` : 'fa-rank';

// ─────────────────────────────────────────────────────────────
// HELPERS — MARKOV
// ─────────────────────────────────────────────────────────────
const STATES = ['A', 'B', 'C', 'D'];

const STATE_COLORS = {
  A: { fill: '#e8f5ee', stroke: '#10b981', text: '#065f46', label: 'A ≥16' },
  B: { fill: '#eff6ff', stroke: '#3b82f6', text: '#1e40af', label: 'B ≥12' },
  C: { fill: '#fffbeb', stroke: '#f59e0b', text: '#92400e', label: 'C ≥10' },
  D: { fill: '#fef2f2', stroke: '#ef4444', text: '#991b1b', label: 'D  <10' },
};

const matrixObjTo2D   = (tm) => STATES.map(s1 => STATES.map(s2 => tm?.[s1]?.[s2] ?? 0));

const buildTransitions = (tm) => {
  const arcs = [];
  STATES.forEach((s1, fi) =>
    STATES.forEach((s2, ti) => {
      const prob = tm?.[s1]?.[s2] ?? 0;
      if (prob > 0) arcs.push({ from: fi, to: ti, prob: prob.toFixed(2) });
    })
  );
  return arcs;
};

const classifyNode = (label, nc) => {
  const raw = nc?.[label] ?? '';
  if (/r.currence|r.current|puits/i.test(raw)) return 'recurrent';
  if (/transitoire/i.test(raw))               return 'transient';
  return 'unknown';
};

const computeDensity = (tm) => {
  let total = 0, nonZero = 0;
  STATES.forEach(s1 => STATES.forEach(s2 => { total++; if ((tm?.[s1]?.[s2] ?? 0) > 0) nonZero++; }));
  return total > 0 ? parseFloat((nonZero / total).toFixed(2)) : 0;
};

const computeEntropy = (tm) => {
  let total = 0;
  STATES.forEach(s1 => STATES.forEach(s2 => {
    const p = tm?.[s1]?.[s2] ?? 0;
    if (p > 0) total -= p * Math.log2(p);
  }));
  return parseFloat((total / STATES.length).toFixed(2));
};

const buildCommClasses = (nc) => {
  const groups = {};
  STATES.forEach(s => {
    const type = classifyNode(s, nc);
    const key  = type === 'recurrent' ? 'Classe Récurrente' : 'Classe Transitoire';
    if (!groups[key]) groups[key] = { type, states: [] };
    groups[key].states.push(s);
  });
  return Object.entries(groups).map(([label, v]) => ({ label, type: v.type, count: v.states.length }));
};

const computeStationary = (tm) => {
  const n = STATES.length;
  let pi = STATES.map(() => 1 / n);
  for (let k = 0; k < 120; k++) {
    const next = STATES.map((_, j) =>
      STATES.reduce((sum, s1, i) => sum + pi[i] * (tm?.[s1]?.[STATES[j]] ?? 0), 0)
    );
    const s = next.reduce((a, b) => a + b, 0);
    pi = s > 0 ? next.map(v => v / s) : next;
  }
  return pi.map(v => parseFloat(v.toFixed(3)));
};

const checkIrreducible = (tm) => {
  const reach = (start) => {
    const vis = new Set([start]);
    const q   = [start];
    while (q.length) {
      const cur = q.shift();
      STATES.forEach(s => { if ((tm?.[cur]?.[s] ?? 0) > 0 && !vis.has(s)) { vis.add(s); q.push(s); } });
    }
    return vis;
  };
  return STATES.every(s => reach(s).size === STATES.length);
};

// ─────────────────────────────────────────────────────────────
// SUB-COMPOSANTS PARTAGÉS
// ─────────────────────────────────────────────────────────────
const Card = ({ icon, iconColor = 'blue', title, badge, badgeColor, children }) => (
  <motion.div className="fa-card" variants={cardVariant}>
    <div className="fa-card-header">
      <div className={`fa-card-icon fa-card-icon--${iconColor}`}>{icon}</div>
      <span className="fa-card-title">{title}</span>
      {badge !== undefined && (
        <span className={`fa-card-count fa-card-count--${badgeColor || iconColor}`}>{badge}</span>
      )}
    </div>
    <div className="fa-card-body">{children}</div>
  </motion.div>
);

const AnimatedRows = ({ children }) => (
  <motion.tbody variants={stagger} initial="hidden" animate="show">
    {React.Children.map(children, (child) => (
      <motion.tr variants={rowVariant} onClick={child.props.onClick} className={child.props.className}>
        {child.props.children}
      </motion.tr>
    ))}
  </motion.tbody>
);

const SubCard = ({ icon, title, children }) => (
  <div style={{
    background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12,
    padding: '1.25rem', flex: 1, minWidth: 260,
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
      <div style={{
        background: 'rgba(122,129,236,0.08)', color: '#7a81ec',
        width: 32, height: 32, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem',
      }}>{icon}</div>
      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0f172a' }}>{title}</span>
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────
// MODAL DÉTAIL ÉLÈVE
// ─────────────────────────────────────────────────────────────
const StudentDetailModal = ({ student, index, onClose }) => {
  if (!student) return null;
  return (
    <div className="fa-modal-overlay" onClick={onClose}>
      <motion.div
        className="fa-modal"
        variants={modalVariant}
        initial="hidden" animate="show" exit="exit"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="fa-modal-header">
          <div>
            <h2>#{index + 1} {student.prenom} {student.nom}</h2>
            <div className="fa-modal-meta-row">
              <span className="fa-chip">{student.classe}</span>
              <span className="fa-chip fa-chip--purple">{student.profilDominant}</span>
              {student.age && (
                <span className="fa-modal-age">{student.age} ans ({student.situationAge})</span>
              )}
            </div>
          </div>
          <button className="fa-modal-close" onClick={onClose} aria-label="Fermer"><FaTimes /></button>
        </div>

        <div className="fa-modal-body">
          <div className="fa-modal-score-banner">
            <span className="fa-modal-score-label">Moyenne Générale</span>
            <span className={`fa-score ${scoreClass(student.moyenneGenerale)} fa-score--large`}>
              {fmt(student.moyenneGenerale)}/20
            </span>
          </div>

          {student.pointsFaibles?.length > 0 && (
            <div className="fa-modal-block">
              <h4 className="fa-modal-section-title text-danger">
                <FaCaretDown className="fa-icon" /> Points faibles identifiés
              </h4>
              <ul className="fa-points-list">
                {student.pointsFaibles.map((p, i) => (
                  <li key={i}>
                    <strong>{p.matiere}</strong> : <span className="fa-badge-note">{p.note}/20</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {student.matiereLePlusEnRetard && (
            <div className="fa-modal-block">
              <h4 className="fa-modal-section-title text-warning">
                <FaArrowDown className="fa-icon" /> Plus gros retard par rapport à la classe
              </h4>
              <p className="fa-modal-text">
                En <strong>{student.matiereLePlusEnRetard.matiere}</strong>, l'élève obtient{' '}
                <span className="text-danger font-semibold">{student.matiereLePlusEnRetard.noteEleve}/20</span>{' '}
                contre une moyenne de classe de {student.matiereLePlusEnRetard.moyenneClasse}/20, soit un écart critique de{' '}
                <span className="text-danger font-semibold">
                  {student.matiereLePlusEnRetard.ecart > 0 ? '+' : ''}{student.matiereLePlusEnRetard.ecart} pts
                </span>.
              </p>
            </div>
          )}

          <div className="fa-modal-block">
            <h4 className="fa-modal-section-title text-primary">
              <FaBrain className="fa-icon" /> Trajectoire prédictive (Analyse de Markov)
            </h4>
            <p className="fa-modal-text fa-diagnostic-text">{student.diagnosticMarkov}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// GRAPHE TOPOLOGIQUE SVG
// ─────────────────────────────────────────────────────────────
const TopologicalGraph = ({ transitions, nodeClassifications }) => {
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const R = 100, cx = 200, cy = 175;

  const pos = STATES.map((_, i) => {
    const a = (2 * Math.PI * i) / STATES.length - Math.PI / 2;
    return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) };
  });

  const arc = (fi, ti) => {
    const f = pos[fi], t = pos[ti];
    if (fi === ti) return null;
    const dx = t.x - f.x, dy = t.y - f.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const nx = -dy / dist, ny = dx / dist;
    const mx = (f.x + t.x) / 2 + nx * 24, my = (f.y + t.y) / 2 + ny * 24;
    const ex = t.x - (dx / dist) * 21, ey = t.y - (dy / dist) * 21;
    return `M${f.x.toFixed(1)},${f.y.toFixed(1)} Q${mx.toFixed(1)},${my.toFixed(1)} ${ex.toFixed(1)},${ey.toFixed(1)}`;
  };

  return (
    <svg viewBox="0 0 400 360" width="100%" style={{ maxWidth: 400, display: 'block', margin: '0 auto' }}>
      <defs>
        <marker id="mG" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
        <marker id="mH" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#7a81ec" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </marker>
      </defs>

      {transitions.map((t, i) => {
        if (t.from === t.to) return null;
        const hov = hoveredEdge === i;
        const d = arc(t.from, t.to);
        if (!d) return null;
        const f = pos[t.from], to = pos[t.to];
        return (
          <g key={i} onMouseEnter={() => setHoveredEdge(i)} onMouseLeave={() => setHoveredEdge(null)}>
            <path d={d} fill="none" stroke={hov ? '#7a81ec' : '#cbd5e1'}
                  strokeWidth={hov ? 2 : 1.2} markerEnd={hov ? 'url(#mH)' : 'url(#mG)'}
                  style={{ transition: 'all .2s' }}/>
            <text x={((f.x + to.x) / 2) + 12} y={((f.y + to.y) / 2) - 10}
                  fontSize="10" fill={hov ? '#7a81ec' : '#94a3b8'}
                  textAnchor="middle" fontWeight={hov ? '700' : '400'}>{t.prob}</text>
          </g>
        );
      })}

      {transitions.filter(t => t.from === t.to).map((t, i) => {
        const p = pos[t.from];
        return (
          <g key={`lp${i}`}>
            <path d={`M${p.x - 10},${p.y - 21} C${p.x - 34},${p.y - 54} ${p.x + 34},${p.y - 54} ${p.x + 10},${p.y - 21}`}
                  fill="none" stroke="#cbd5e1" strokeWidth="1.2" markerEnd="url(#mG)"/>
            <text x={p.x} y={p.y - 57} fontSize="10" fill="#94a3b8" textAnchor="middle">{t.prob}</text>
          </g>
        );
      })}

      {STATES.map((s, i) => {
        const { x, y } = pos[i];
        const col  = STATE_COLORS[s];
        const type = classifyNode(s, nodeClassifications);
        return (
          <g key={s}>
            <circle cx={x} cy={y} r={22} fill={col.fill} stroke={col.stroke}
                    strokeWidth={type === 'recurrent' ? 2.8 : 1.5}/>
            <text x={x} y={y - 3} textAnchor="middle" dominantBaseline="central"
                  fontSize="13" fontWeight="800" fill={col.text}>{s}</text>
            <text x={x} y={y + 10} textAnchor="middle" fontSize="9" fill={col.text} opacity="0.75">
              {col.label}
            </text>
          </g>
        );
      })}

      <g transform="translate(12,308)">
        {[{ c: '#10b981', l: 'Récurrent (Puits)' }, { c: '#ef4444', l: 'Transitoire' }].map(({ c, l }, i) => (
          <g key={i} transform={`translate(${i * 190},0)`}>
            <circle cx="8" cy="8" r="6" fill="transparent" stroke={c} strokeWidth="2"/>
            <text x="20" y="12" fontSize="11" fill="#475569">{l}</text>
          </g>
        ))}
      </g>
    </svg>
  );
};

// ─────────────────────────────────────────────────────────────
// MATRICE HEATMAP
// ─────────────────────────────────────────────────────────────
const TransitionMatrix = ({ matrix2D }) => {
  const [hov, setHov] = useState(null);
  const bg  = v => v === 0 ? '#f8fafc' : v < 0.2 ? 'rgba(122,129,236,0.12)' : v < 0.5 ? 'rgba(122,129,236,0.38)' : v < 0.8 ? 'rgba(122,129,236,0.62)' : 'rgba(122,129,236,0.88)';
  const txt = v => v >= 0.62 ? '#fff' : '#0f172a';

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: '0.83rem', margin: '0 auto' }}>
        <thead>
          <tr>
            <th style={{ padding: '5px 10px', color: '#94a3b8' }}></th>
            {STATES.map(s => <th key={s} style={{ padding: '5px 10px', color: '#475569', fontWeight: 700 }}>{s}</th>)}
          </tr>
        </thead>
        <tbody>
          {matrix2D.map((row, ri) => (
            <tr key={ri}>
              <td style={{ padding: '6px 10px', fontWeight: 700, color: '#475569' }}>{STATES[ri]}</td>
              {row.map((val, ci) => (
                <td key={ci}
                    onMouseEnter={() => setHov(`${ri}-${ci}`)}
                    onMouseLeave={() => setHov(null)}
                    style={{
                      padding: '7px 12px', background: bg(val), color: txt(val),
                      textAlign: 'center', fontFamily: 'monospace', fontWeight: 600,
                      border: '1px solid #e2e8f0', borderRadius: 4, minWidth: 52,
                      transition: 'all .15s', cursor: 'default',
                      transform: hov === `${ri}-${ci}` ? 'scale(1.08)' : 'scale(1)',
                    }}>{val.toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ fontSize: '0.72rem', color: '#94a3b8', textAlign: 'center', marginTop: 8 }}>
        Intensité = probabilité de transition — survol pour zoomer
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// VECTEUR STATIONNAIRE
// ─────────────────────────────────────────────────────────────
const StationaryVector = ({ vector }) => {
  const max = Math.max(...vector, 0.001);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {STATES.map((s, i) => {
        const col = STATE_COLORS[s];
        return (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: '0.85rem', color: col.text, minWidth: 28 }}>{s}</span>
            <div style={{ flex: 1, background: '#e2e8f0', height: 10, borderRadius: 10, overflow: 'hidden' }}>
              <motion.div
                style={{ height: '100%', borderRadius: 10, background: col.stroke }}
                initial={{ width: 0 }}
                animate={{ width: `${(vector[i] / max) * 100}%` }}
                transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: i * 0.07 }}/>
            </div>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.8rem', color: col.text, minWidth: 44, textAlign: 'right' }}>
              {vector[i].toFixed(3)}
            </span>
          </div>
        );
      })}
      <p style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 4 }}>
        Calculé par puissance itérée (λ₁ = 1.00) — distribution d'équilibre à long terme
      </p>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// PANNEAU THÉORIQUE
// ─────────────────────────────────────────────────────────────
const TheoryPanel = () => {
  const [tab, setTab] = useState('formules');

  const formulas = [
    {
      title: 'ÉQUATION DE CHAPMAN-KOLMOGOROV',
      latex: 'P_{ij}^{(n+m)} = Σk P_{ik}^{(n)} · P_{kj}^{(m)}',
      desc:  'Probabilité de passer de i à j en n+m étapes via un état intermédiaire k.',
    },
    {
      title: 'VECTEUR STATIONNAIRE',
      latex: 'π = π · P   (avec Σi πi = 1)',
      desc:  "Distribution d'équilibre de la chaîne sur le long terme.",
    },
    {
      title: "CRITÈRE D'IRRÉDUCTIBILITÉ",
      latex: '∀ i, j ∈ S : i ↔ j',
      desc:  "Chaîne irréductible si chaque état est atteignable depuis n'importe quel autre.",
    },
  ];

  const code = `// Puissance itérée → vecteur stationnaire
function stationaryVector(tm, iter = 120) {
  const states = ['A','B','C','D'];
  let pi = states.map(() => 1 / states.length);
  for (let k = 0; k < iter; k++) {
    const next = states.map((_, j) =>
      states.reduce((sum, s, i) =>
        sum + pi[i] * (tm[s]?.[states[j]] ?? 0), 0)
    );
    const norm = next.reduce((a, b) => a + b, 0);
    pi = norm > 0 ? next.map(v => v / norm) : next;
  }
  return pi; // [πA, πB, πC, πD]
}`;

  const notes = [
    'A ≥ 16/20 · B ≥ 12/20 · C ≥ 10/20 · D < 10/20 — seuils de getState() dans analyzeSchoolData.js.',
    'Un état est Récurrent (Puits) si P(s→s) > 0.7 et aucun voisin sortant significatif (> 0.1).',
    'La densité = fraction de transitions non nulles dans la matrice 4×4.',
    "L'entropie H(X) = −Σ p·log₂(p) moyennée sur les lignes (bits d'incertitude).",
    "La chaîne est irréductible si chaque état A/B/C/D est atteignable depuis tout autre (BFS).",
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
        {['formules', 'javascript', 'notes'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '5px 14px', fontSize: '0.78rem', fontWeight: 600,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: tab === t ? '#7a81ec' : '#94a3b8',
            borderBottom: tab === t ? '2px solid #7a81ec' : '2px solid transparent',
            transition: 'all .15s',
          }}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
        ))}
      </div>

      {tab === 'formules' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {formulas.map((f, i) => (
            <div key={i}>
              <p style={{ fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.08em', color: '#94a3b8', marginBottom: 5 }}>{f.title}</p>
              <p style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, color: '#7a81ec', marginBottom: 5 }}>{f.latex}</p>
              <p style={{ fontSize: '0.83rem', color: '#475569', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      )}

      {tab === 'javascript' && (
        <pre style={{ background: '#0f172a', color: '#e2e8f0', fontFamily: 'monospace', fontSize: '0.76rem', padding: '1rem', borderRadius: 8, overflowX: 'auto', lineHeight: 1.65 }}>{code}</pre>
      )}

      {tab === 'notes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notes.map((n, i) => (
            <p key={i} style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.5 }}>• {n}</p>
          ))}
        </div>
      )}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// LÉGENDE DU GRAPHE TOPOLOGIQUE
// ─────────────────────────────────────────────────────────────
const GraphLegend = () => (
  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginTop: 12, border: '1px solid #e2e8f0' }}>
    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Comment lire ce graphe ?
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {[
        { icon: '⭕', text: 'Chaque cercle = un niveau (A, B, C, D). Contour épais = état récurrent (puits) : les élèves ont tendance à y rester.' },
        { icon: '➡️', text: 'Chaque flèche = une transition possible d\'un niveau à l\'autre entre deux évaluations.' },
        { icon: '🔢', text: 'Le nombre sur la flèche = probabilité de cette transition (ex: 0.65 = 65% de chances). Plus le nombre est élevé, plus la transition est fréquente.' },
        { icon: '🔄', text: 'Une flèche qui revient sur le même cercle = l\'élève reste dans le même niveau d\'une évaluation à l\'autre.' },
        { icon: '🚨', text: 'Si l\'état D (rouge) a une grosse flèche sur lui-même, cela signifie que beaucoup d\'élèves en échec restent en échec.' },
      ].map(({ icon, text }, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{icon}</span>
          <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>{text}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// LÉGENDE DE LA MATRICE
// ─────────────────────────────────────────────────────────────
const MatrixLegend = () => (
  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginTop: 14, border: '1px solid #e2e8f0' }}>
    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Comment lire cette matrice ?
    </p>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      {[
        { icon: '📋', text: 'Chaque ligne = état actuel de l\'élève. Chaque colonne = état à la prochaine évaluation.' },
        { icon: '📖', text: 'Exemple — ligne D, colonne A : si la valeur est 0.05, cela signifie que seulement 5% des élèves en échec (D) passent en excellence (A) au trimestre suivant.' },
        { icon: '🎨', text: 'Plus la cellule est foncée (violet intense), plus la probabilité est élevée. Une cellule claire = transition rare.' },
        { icon: '➕', text: 'La somme de chaque ligne = 1.00 (100%). Un élève doit forcément aller quelque part : il reste dans son état ou passe dans un autre.' },
        { icon: '⚡', text: 'Regardez la diagonale (de haut à gauche à bas à droite) : si les valeurs y sont fortes, les élèves ont tendance à rester dans leur niveau actuel.' },
      ].map(({ icon, text }, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ fontSize: '0.85rem', flexShrink: 0 }}>{icon}</span>
          <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.5, margin: 0 }}>{text}</p>
        </div>
      ))}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// INTERPRÉTATION DU VECTEUR STATIONNAIRE
// ─────────────────────────────────────────────────────────────
const StationaryIntro = () => (
  <div style={{ background: '#f8fafc', borderRadius: 8, padding: '12px 14px', marginBottom: 14, border: '1px solid #e2e8f0' }}>
    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
      Que représente ce vecteur ?
    </p>
    <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.6, marginBottom: 6 }}>
      C'est la <strong>photographie à long terme</strong> de votre classe : si les tendances actuelles ne changent pas,
      quelle proportion d'élèves se trouvera dans chaque niveau dans plusieurs mois ?
    </p>
    <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.6 }}>
      <strong>Exemple :</strong> π(D) = 0.35 signifie que si rien ne change pédagogiquement,
      <strong> 35% des élèves seront en situation d'échec à terme</strong>. C'est un indicateur de pilotage,
      pas une fatalité — une intervention ciblée peut modifier ces probabilités.
    </p>
  </div>
);

// ─────────────────────────────────────────────────────────────
// SECTION MARKOV (intégrée dans le tableau de bord)
// Consomme result.transitionMatrix + result.nodeClassifications
// ─────────────────────────────────────────────────────────────
const MarkovSection = ({ transitionMatrix, nodeClassifications }) => {
  const [collapsed, setCollapsed] = useState(false);

  const matrix2D    = matrixObjTo2D(transitionMatrix);
  const transitions = buildTransitions(transitionMatrix);
  const stationary  = computeStationary(transitionMatrix);
  const density     = computeDensity(transitionMatrix);
  const entropy     = computeEntropy(transitionMatrix);
  const irreducible = checkIrreducible(transitionMatrix);
  const commClasses = buildCommClasses(nodeClassifications);
  const hasData     = transitionMatrix && Object.keys(transitionMatrix).length > 0;

  const irrNote = irreducible
    ? "Bonne nouvelle : tous les niveaux sont interconnectés. Un élève en D peut potentiellement atteindre A, et inversement. Le système converge vers un équilibre prévisible (π unique)."
    : "Attention : certains niveaux forment des « trappes » isolées. Un élève qui y tombe ne peut plus en sortir selon les données actuelles. Vérifiez si l'état D est absorbant.";

  return (
    <motion.div className="fa-card" variants={cardVariant}>
      <div
        className="fa-card-header"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setCollapsed(c => !c)}
      >
        <div className="fa-card-icon fa-card-icon--blue"><FaBrain /></div>
        <span className="fa-card-title">Analyse de Markov — Trajectoires Prédictives</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {!hasData && (
            <span style={{
              fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px',
              background: 'rgba(245,158,11,0.1)', color: '#92400e', borderRadius: 20,
            }}>DONNÉES MANQUANTES</span>
          )}
          <button style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.9rem' }}>
            {collapsed ? <FaChevronDown /> : <FaChevronUp />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <div className="fa-card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

              {/* ── Introduction pédagogique ── */}
              <MarkovIntro />

              {/* ── KPI ── */}
              <div>
                <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
                  Indicateurs du modèle
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  {[
                    {
                      label: 'Densité',
                      value: density,
                      sub: 'Transitions observées',
                      tip: 'Fraction de transitions non nulles. 1.0 = tous les passages entre niveaux ont été observés dans vos données.',
                    },
                    {
                      label: 'Entropie H(X)',
                      value: entropy,
                      sub: 'Imprévisibilité (bits)',
                      tip: 'Plus ce chiffre est élevé, plus les trajectoires des élèves sont imprévisibles. Valeur basse = comportements homogènes.',
                    },
                    {
                      label: 'États',
                      value: STATES.length,
                      sub: 'A · B · C · D',
                      tip: '4 niveaux de performance : A (≥16), B (12-15), C (10-11), D (<10).',
                    },
                    {
                      label: 'λ₁ (dominant)',
                      value: '1.00',
                      sub: 'Valeur propre',
                      tip: 'Toujours 1 pour une chaîne de Markov valide. Garantit l\'existence d\'un équilibre à long terme.',
                    },
                  ].map(({ label, value, sub, tip }) => (
                    <motion.div key={label} className="fa-kpi"
                      title={tip}
                      whileHover={{ scale: 1.02 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      style={{ cursor: 'help' }}>
                      <div className="fa-kpi-value">{value}</div>
                      <div className="fa-kpi-label">{label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: 2 }}>{sub}</div>
                    </motion.div>
                  ))}
                </div>
                <p style={{ fontSize: '0.71rem', color: '#94a3b8', marginTop: 6 }}>
                  💬 Survolez un indicateur pour en lire l'explication.
                </p>
              </div>

              {/* ── Graphe + Classes + Irréductibilité ── */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <SubCard icon={<FaProjectDiagram />} title="Graphe des transitions entre niveaux">
                  <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, marginBottom: 10 }}>
                    Ce graphe montre <strong>comment les élèves circulent entre les niveaux A, B, C et D</strong> d'une
                    évaluation à l'autre. Chaque flèche représente un mouvement observé dans vos données, et son
                    chiffre indique la probabilité de ce mouvement.
                  </p>
                  <TopologicalGraph transitions={transitions} nodeClassifications={nodeClassifications} />
                  <GraphLegend />
                </SubCard>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1, minWidth: 220 }}>
                  <SubCard icon={<FaChartBar />} title="Stabilité des niveaux">
                    <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.55, marginBottom: 10 }}>
                      Un niveau <strong>récurrent (puits)</strong> est un niveau dont les élèves ont du mal à sortir :
                      ils ont tendance à y rester d'une évaluation à l'autre.
                      Un niveau <strong>transitoire</strong> est instable : les élèves y passent mais n'y restent pas longtemps.
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {commClasses.map((cls, i) => {
                        const isR = cls.type === 'recurrent';
                        const bg  = isR ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)';
                        const dot = isR ? '#10b981' : '#ef4444';
                        const txt = isR ? '#065f46' : '#991b1b';
                        return (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: bg }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: dot }}/>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: txt }}>{cls.label}</span>
                            </div>
                            <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: 'rgba(255,255,255,0.6)', color: txt }}>{cls.count} ÉTATS</span>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ marginTop: 14, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {STATES.map(s => {
                        const col = STATE_COLORS[s];
                        return (
                          <span key={s} style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: col.fill, color: col.text, border: `1px solid ${col.stroke}` }}>
                            {col.label}
                          </span>
                        );
                      })}
                    </div>
                  </SubCard>

                  <SubCard icon={<FaShieldAlt />} title="Les élèves peuvent-ils progresser ?">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Mobilité inter-niveaux :</span>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: irreducible ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                        color:      irreducible ? '#065f46' : '#991b1b',
                      }}>
                        {irreducible ? '✅ Mobilité totale' : '⛔ Mobilité bloquée'}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.55, background: '#f8fafc', padding: '8px 10px', borderRadius: 6, borderLeft: '3px solid #e2e8f0' }}>
                      {irrNote}
                    </p>
                  </SubCard>
                </div>
              </div>

              {/* ── Matrice + Vecteur stationnaire ── */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                <SubCard icon={<FaTh />} title="Matrice de transition — Probabilités de changement de niveau">
                  <p style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.55, marginBottom: 12 }}>
                    Cette table répond à la question : <em>« Un élève qui est actuellement dans le niveau X,
                    quelle est la probabilité qu'il soit dans le niveau Y à la prochaine évaluation ? »</em>
                    Lisez-la <strong>ligne par ligne</strong> (état actuel → état suivant).
                  </p>
                  <TransitionMatrix matrix2D={matrix2D} />
                  <MatrixLegend />
                </SubCard>

                <SubCard icon={<FaChartBar />} title="Équilibre à long terme — Que deviendra votre classe ?">
                  <StationaryIntro />
                  <StationaryVector vector={stationary} />
                </SubCard>
              </div>

              {/* ── Théorie ── */}
              <SubCard icon={<FaBook />} title="Ressources & Théorie mathématique">
                <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.5, marginBottom: 12 }}>
                  Pour les curieux : les formules et l'algorithme utilisés pour calculer les probabilités affichées ci-dessus.
                </p>
                <TheoryPanel />
              </SubCard>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL — FileAnalyzer
// ─────────────────────────────────────────────────────────────
const FileAnalyzer = () => {
  const dispatch = useDispatch();
  const { result, loading, error } = useSelector((state) => state.analysis);

  const [selectedFile,          setSelectedFile]          = useState(null);
  const [showJson,              setShowJson]              = useState(false);
  const [activeCriticalStudent, setActiveCriticalStudent] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) setSelectedFile(file);
  };

  const handleAnalyze = () => {
    if (!selectedFile) return alert('Veuillez sélectionner un fichier Excel');
    dispatch(uploadAndAnalyzeFile(selectedFile));
  };

  const handleClear = () => {
    dispatch(clearAnalysisResult());
    setSelectedFile(null);
    setShowJson(false);
    document.getElementById('fileInput').value = '';
  };

  return (
    <div className="fa-page">
      <div className="fa-container">

        {/* ── Header ── */}
        <motion.header
          className="fa-header"
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="fa-eyebrow">Tableau de bord</p>
          <h1 className="fa-title">
            Analyse des <span className="fa-title-accent">données scolaires</span>
          </h1>
          <p className="fa-subtitle">Importez un fichier Excel pour générer l'analyse complète.</p>
        </motion.header>

        {/* ── Upload ── */}
        <motion.div
          className="fa-upload-card"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35, delay: 0.1 }}
        >
          <div className="fa-upload-row">
            <label className="fa-file-label" htmlFor="fileInput">
              <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2"
                   strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Choisir un fichier
            </label>
            <input
              id="fileInput"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="fa-file-input"
            />

            <AnimatePresence>
              {selectedFile && (
                <motion.span
                  className="fa-file-chip"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                >
                  <FaFileAlt className="fa-icon" /> {selectedFile.name}
                </motion.span>
              )}
            </AnimatePresence>

            <div className="fa-upload-actions">
              <button className="fa-btn fa-btn--primary" onClick={handleAnalyze} disabled={loading}>
                {loading ? <><div className="fa-spinner" /> Analyse…</> : '▶ Analyser'}
              </button>
              <button className="fa-btn fa-btn--ghost" onClick={handleClear} disabled={loading}>
                Effacer
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Erreur ── */}
        <AnimatePresence>
          {error && (
            <motion.div className="fa-error" variants={fadeUp} initial="hidden" animate="show" exit="exit">
              <FaExclamationTriangle className="fa-icon" /> {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Résultats ── */}
        <AnimatePresence>
          {result && (
            <motion.div className="fa-results" variants={stagger} initial="hidden" animate="show" exit="exit">

              {/* Métadonnées */}
              {result.meta && (
                <Card icon={<FaChartBar />} iconColor="blue" title="Métadonnées globales">
                  <div className="fa-meta-grid">
                    {[
                      { value: result.meta.totalEleves,        label: 'Élèves'       },
                      { value: result.meta.totalMatieres,      label: 'Matières'     },
                      { value: result.meta.totalClasses,       label: 'Classes'      },
                      { value: `${result.meta.seuilEchec}/20`, label: "Seuil d'échec" },
                    ].map(({ value, label }) => (
                      <motion.div className="fa-kpi" key={label} variants={rowVariant}
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
                        <div className="fa-kpi-value">{value}</div>
                        <div className="fa-kpi-label">{label}</div>
                      </motion.div>
                    ))}
                  </div>
                  {result.meta.referenceDate && (
                    <p className="fa-meta-date">Date de référence : <span>{result.meta.referenceDate}</span></p>
                  )}
                </Card>
              )}

              {/* Top élèves */}
              {result.topStudents?.length > 0 && (
                <Card icon={<FaTrophy />} iconColor="gold"
                      title={`Top ${result.topStudents.length} Élèves`}
                      badge={result.topStudents.length} badgeColor="gold">
                  <div className="fa-table-wrap">
                    <table className="fa-table">
                      <thead>
                        <tr><th>#</th><th>Nom & Prénoms</th><th>Classe</th><th>Moyenne</th><th>Profil Dominant</th></tr>
                      </thead>
                      <AnimatedRows>
                        {result.topStudents.map((s, i) => (
                          <tr key={s.numero || i}>
                            <td><span className={rankClass(i)}>{i + 1}</span></td>
                            <td className="font-semibold">{s.nom} {s.prenom}</td>
                            <td><span className="fa-chip">{s.classe}</span></td>
                            <td><span className={`fa-score ${scoreClass(s.moyenneGenerale)}`}>{fmt(s.moyenneGenerale)}</span></td>
                            <td><span className="fa-chip fa-chip--outline">{s.profilDominant}</span></td>
                          </tr>
                        ))}
                      </AnimatedRows>
                    </table>
                  </div>
                </Card>
              )}

              {/* Élèves critiques */}
              {result.criticalStudents?.length > 0 && (
                <Card icon={<FaExclamationTriangle />} iconColor="red"
                      title="Élèves en situation critique"
                      badge={result.criticalStudents.length} badgeColor="red">
                  <p className="fa-table-helper-text">
                    ⚠️ Cliquez sur la ligne d'un élève pour consulter son diagnostic complet et ses axes d'amélioration.
                  </p>
                  <div className="fa-table-wrap">
                    <table className="fa-table fa-table--clickable">
                      <thead>
                        <tr><th>#</th><th>Nom & Prénoms</th><th>Classe</th><th>Moyenne</th><th>Profil</th></tr>
                      </thead>
                      <AnimatedRows>
                        {result.criticalStudents.map((student, idx) => (
                          <tr key={student.numero || idx}
                              onClick={() => setActiveCriticalStudent({ student, idx })}
                              className="fa-row-critical">
                            <td><span className="fa-rank fa-rank--danger">#{idx + 1}</span></td>
                            <td className="font-semibold">{student.nom} {student.prenom}</td>
                            <td><span className="fa-chip">{student.classe}</span></td>
                            <td><span className={`fa-score ${scoreClass(student.moyenneGenerale)}`}>{fmt(student.moyenneGenerale)}</span></td>
                            <td><span className="fa-chip fa-chip--danger-light">{student.profilDominant}</span></td>
                          </tr>
                        ))}
                      </AnimatedRows>
                    </table>
                  </div>
                </Card>
              )}

              {/* Stats par classe */}
              {result.statsParClasse && Object.keys(result.statsParClasse).length > 0 && (
                <Card icon={<FaChartLine />} iconColor="green" title="Statistiques par classe">
                  <div className="fa-table-wrap">
                    <table className="fa-table">
                      <thead>
                        <tr><th>Classe</th><th>Effectif</th><th>Âge moyen</th><th>Moyenne classe</th></tr>
                      </thead>
                      <AnimatedRows>
                        {Object.entries(result.statsParClasse).map(([cls, st]) => (
                          <tr key={cls}>
                            <td><span className="fa-chip fa-chip--bold">{cls}</span></td>
                            <td>{st.effectif} apprenants</td>
                            <td>{st.ageMoyen ? st.ageMoyen.toFixed(1) : 'N/A'} ans</td>
                            <td><span className={`fa-score ${scoreClass(st.moyenneClasse)}`}>{fmt(st.moyenneClasse)}</span></td>
                          </tr>
                        ))}
                      </AnimatedRows>
                    </table>
                  </div>
                </Card>
              )}

              {/* Matières critiques */}
              {result.matieresCritiques?.length > 0 && (
                <Card icon={<FaArrowDown />} iconColor="red"
                      title="Matières nécessitant une attention immédiate"
                      badge={result.matieresCritiques.length} badgeColor="red">
                  <div className="fa-table-wrap">
                    <table className="fa-table">
                      <thead>
                        <tr><th>Matière</th><th>Moyenne Globale</th><th>Taux d'échec</th><th>Groupe assigné</th></tr>
                      </thead>
                      <AnimatedRows>
                        {result.matieresCritiques.map((m, i) => (
                          <tr key={i}>
                            <td className="font-semibold text-color-dark">{m.matiere}</td>
                            <td><span className={`fa-score ${scoreClass(m.moyenne)}`}>{fmt(m.moyenne)}</span></td>
                            <td>
                              <div className="fa-bar-wrap">
                                <div className="fa-bar-track">
                                  <motion.div
                                    className="fa-bar-fill"
                                    style={{ background: barColor(m.tauxEchec) }}
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(m.tauxEchec, 100)}%` }}
                                    transition={{ duration: 0.8, delay: i * 0.05, ease: [0.4, 0, 0.2, 1] }}/>
                                </div>
                                <span className="fa-bar-label">{m.tauxEchec}%</span>
                              </div>
                            </td>
                            <td><span className="fa-chip">{m.groupe}</span></td>
                          </tr>
                        ))}
                      </AnimatedRows>
                    </table>
                  </div>
                </Card>
              )}

              {/* Corrélation Âge / Notes */}
              {result.correlationAgeNotes !== undefined && result.correlationAgeNotes !== null && (
                <Card icon={<FaFileAlt />} iconColor="purple" title="Analyse factorielle : Âge / Notes">
                  <div className="fa-corr-wrap">
                    <div>
                      <div className="fa-corr-big">{result.correlationAgeNotes.toFixed(3)}</div>
                      <div className="fa-corr-label">Coefficient de Pearson</div>
                    </div>
                    <p className="fa-corr-desc">
                      {Math.abs(result.correlationAgeNotes) < 0.2
                        ? "Très faible corrélation. Les écarts d'âge au sein des classes n'impactent pas de manière significative les résultats académiques."
                        : Math.abs(result.correlationAgeNotes) < 0.5
                        ? "Corrélation modérée. L'âge constitue un facteur secondaire pouvant influencer partiellement la réussite scolaire."
                        : "Forte corrélation. Les écarts d'âge représentent un indicateur hautement significatif dans la disparité des notes."}
                    </p>
                  </div>
                </Card>
              )}

              {/* ═══════════════════════════════════════════════════════
                  SECTION MARKOV — directement depuis result du back-end
                  Consomme result.transitionMatrix + result.nodeClassifications
                  issues de analyzeSchoolData()
                  ═══════════════════════════════════════════════════════ */}
              {result.transitionMatrix && (
                <MarkovSection
                  transitionMatrix={result.transitionMatrix}
                  nodeClassifications={result.nodeClassifications}
                />
              )}

              {/* JSON brut */}
              <motion.div className="fa-card" variants={cardVariant}>
                <div className="fa-card-header">
                  <div className="fa-card-icon fa-card-icon--blue"><FaCode /></div>
                  <span className="fa-card-title">Données brutes de l'indexation</span>
                  <button
                    className="fa-btn fa-btn--ghost"
                    onClick={() => setShowJson(!showJson)}
                    style={{ marginLeft: 'auto', padding: '0.35rem 1rem', fontSize: '0.78rem' }}
                  >
                    {showJson ? 'Masquer' : 'Afficher'} le modèle JSON
                  </button>
                </div>
                <AnimatePresence>
                  {showJson && (
                    <motion.div
                      className="fa-card-body"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <pre className="fa-json-pre">{JSON.stringify(result, null, 2)}</pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Modal diagnostic élève critique ── */}
        <AnimatePresence>
          {activeCriticalStudent && (
            <StudentDetailModal
              student={activeCriticalStudent.student}
              index={activeCriticalStudent.idx}
              onClose={() => setActiveCriticalStudent(null)}
            />
          )}
        </AnimatePresence>

      </div>
    </div>
  );
};

export default FileAnalyzer;