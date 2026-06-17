import React from 'react';
import {
  Crosshair,
  Trophy,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Info,
} from 'lucide-react';

const MarkovIntro = () => (
  <div
    style={{
      background: 'white',
      borderRadius: 16,
      padding: '1.5rem 2rem',
      boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      border: '1px solid #e9edf4',
      maxWidth: '100%',
    }}
  >
    {/* En-tête avec icône */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          borderRadius: 10,
          padding: 8,
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Crosshair size={22} />
      </div>
      <div>
        <p
          style={{
            fontWeight: 800,
            fontSize: '1rem',
            color: '#1e1b4b',
            margin: 0,
            letterSpacing: '-0.01em',
          }}
        >
          À quoi sert cette analyse ?
        </p>
        <p
          style={{
            fontSize: '0.85rem',
            color: '#6b7280',
            margin: 0,
          }}
        >
          Ce que prédit le modèle de Markov
        </p>
      </div>
    </div>

    {/* Description */}
    <p
      style={{
        fontSize: '0.9rem',
        color: '#374151',
        lineHeight: 1.7,
        marginBottom: 20,
      }}
    >
      À partir des notes observées de <strong>tous vos élèves sur la période</strong>
      , ce modèle calcule la{' '}
      <strong>
        probabilité qu'un élève change de niveau de performance
      </strong>{' '}
      d'une évaluation à la suivante. Il ne prédit pas une note précise — il
      répond à la question :{' '}
      <em>
        « Si un élève est en difficulté aujourd'hui, quelle est la chance qu'il
        s'en sorte lors de la prochaine évaluation ? »
      </em>
    </p>

    {/* Titre des états avec séparateur */}
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
      }}
    >
      <div
        style={{
          width: 4,
          height: 20,
          background: '#6366f1',
          borderRadius: 4,
        }}
      />
      <p
        style={{
          fontSize: '0.75rem',
          fontWeight: 700,
          letterSpacing: '0.06em',
          color: '#6366f1',
          textTransform: 'uppercase',
          margin: 0,
        }}
      >
        Les 4 niveaux de performance (états)
      </p>
    </div>

    {/* Grille des états */}
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 12,
        marginBottom: 20,
      }}
    >
      {[
        {
          state: 'A',
          range: '≥ 16 / 20',
          label: 'Excellence',
          color: '#065f46',
          bg: '#e8f5ee',
          border: '#10b981',
          icon: Trophy,
          desc: "L'élève maîtrise très bien la matière.",
        },
        {
          state: 'B',
          range: '12 – 15',
          label: 'Satisfaisant',
          color: '#1e40af',
          bg: '#eff6ff',
          border: '#3b82f6',
          icon: CheckCircle,
          desc: 'Résultats corrects, au-dessus de la moyenne.',
        },
        {
          state: 'C',
          range: '10 – 11',
          label: 'Fragile',
          color: '#92400e',
          bg: '#fffbeb',
          border: '#f59e0b',
          icon: AlertTriangle,
          desc: 'Juste la moyenne. Peut basculer des deux côtés.',
        },
        {
          state: 'D',
          range: '< 10 / 20',
          label: 'En difficulté',
          color: '#991b1b',
          bg: '#fef2f2',
          border: '#ef4444',
          icon: AlertOctagon,
          desc: 'En échec. Intervention prioritaire recommandée.',
        },
      ].map(({ state, range, label, color, bg, border, icon: Icon, desc }) => (
        <div
          key={state}
          style={{
            background: bg,
            border: `1px solid ${border}`,
            borderRadius: 10,
            padding: '12px 14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                background: color,
                borderRadius: 6,
                padding: 4,
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
              }}
            >
              <Icon size={16} />
            </div>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 900,
                fontSize: '1.1rem',
                color,
              }}
            >
              {state}
            </span>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color,
                background: 'rgba(255,255,255,0.8)',
                padding: '2px 8px',
                borderRadius: 12,
                marginLeft: 'auto',
              }}
            >
              {range}
            </span>
          </div>
          <p
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color,
              marginBottom: 2,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontSize: '0.75rem',
              color: '#475569',
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            {desc}
          </p>
        </div>
      ))}
    </div>

    {/* Bloc pratique avec icône Info */}
    <div
      style={{
        background: 'linear-gradient(135deg, #f8f7ff 0%, #f0f0ff 100%)',
        borderRadius: 10,
        padding: '12px 16px',
        borderLeft: '4px solid #6366f1',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ marginTop: 2, color: '#6366f1' }}>
        <Info size={18} />
      </div>
      <div>
        <p
          style={{
            fontSize: '0.85rem',
            color: '#374151',
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          <strong>💡 En pratique :</strong> Si la matrice montre qu'un élève en
          état D a 70% de chances de rester en D à la prochaine évaluation, cela
          signifie que <strong>sans intervention pédagogique</strong>, 7 élèves
          sur 10 actuellement en échec risquent de le rester. C'est un signal
          d'alerte collectif, pas individuel.
        </p>
      </div>
    </div>
  </div>
);

export default MarkovIntro;