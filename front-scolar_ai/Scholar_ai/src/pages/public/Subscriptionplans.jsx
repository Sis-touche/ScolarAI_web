import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchPlans,
  setSelectedPlan,
  clearSelectedPlan,
} from "../../reducer/planSlice";
import "./SubscriptionPlans.css";
import { useNavigate } from "react-router-dom";

// ── Helpers ──────────────────────────────────────────────────────────────────


const formatPrice = (priceStr) => {
  const n = parseFloat(priceStr);
  if (n === 0) return { main: "0,00", currency: "Ar", period: "/mois" };
  return {
    main: new Intl.NumberFormat("fr-MG").format(n),
    currency: "Ar",
    period: null,
  };
};

const getPeriodLabel = (plan) => {
  if (plan.type === "TIME_BASED") {
    return plan.durationDays >= 365 ? "/an" : "/mois";
  }
  return null;
};

const getPlanFeatures = (plan) => {
  const features = [];
  if (plan.scanLimit === null) {
    features.push("Scans illimités");
  } else if (plan.scanLimit > 0) {
    features.push(`${plan.scanLimit} scans inclus`);
  }
  if (plan.type === "TIME_BASED") {
    features.push(plan.durationDays >= 365 ? "Accès 12 mois" : "Accès 30 jours");
    features.push("Tableau de bord complet");
    if (plan.durationDays >= 365) {
      features.push("Support prioritaire");
      features.push("Rapports PDF mensuels");
    }
  } else {
    features.push("Validité 6 mois");
    features.push("Tableau de bord complet");
  }
  return features;
};

// ── Composants enfants ───────────────────────────────────────────────────────

function PlanCardSkeleton() {
  return (
    <div className="plan-card plan-card--skeleton">
      <div className="skeleton skeleton--radio" />
      <div className="skeleton skeleton--title" />
      <div className="skeleton skeleton--price" />
      <div className="skeleton skeleton--line" />
      <div className="skeleton skeleton--line skeleton--line-short" />
      <div className="skeleton skeleton--line" />
    </div>
  );
}

function PlanCard({ plan, isSelected, onSelect, index }) {
  const { main, currency } = formatPrice(plan.price);
  const period = getPeriodLabel(plan);
  const features = getPlanFeatures(plan);
  const isFree = parseFloat(plan.price) === 0;

  return (
    <div
      className={`plan-card ${isSelected ? "plan-card--selected" : ""} ${plan.popular ? "plan-card--popular" : ""}`}
      onClick={() => onSelect(plan)}
      style={{ animationDelay: `${index * 0.1}s` }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(plan)}
      aria-pressed={isSelected}
    >
      {plan.popular && (
        <div className="plan-card__popular-badge">Recommandé</div>
      )}

      {/* Radio */}
      <div className="plan-card__radio">
        <div className={`plan-card__radio-dot ${isSelected ? "plan-card__radio-dot--active" : ""}`} />
      </div>

      {/* Header */}
      <div className="plan-card__header">
        <span className="plan-card__name">{plan.name}</span>
        <div className="plan-card__pricing">
          {isFree ? (
            <span className="plan-card__price">
              <span className="plan-card__price-currency">$</span>0
              <span className="plan-card__price-period">/mois</span>
            </span>
          ) : (
            <span className="plan-card__price">
              <span className="plan-card__price-currency">Ar</span>
              {main}
              {period && <span className="plan-card__price-period">{period}</span>}
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="plan-card__features">
        {features.map((f, i) => (
          <li key={i} className="plan-card__feature">
            <span className="plan-card__check">✓</span>
            {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`faq-item ${open ? "faq-item--open" : ""}`}>
      <button className="faq-item__question" onClick={() => setOpen(!open)}>
        <span>{question}</span>
        <span className="faq-item__icon">{open ? "−" : "+"}</span>
      </button>
      <div className="faq-item__answer">
        <p>{answer}</p>
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────

const FAQ_ITEMS = [
  {
    question: "Puis-je modifier ma formule d'abonnement ?",
    answer:
      "Oui, notre plateforme offre aux utilisateurs la possibilité de passer d'un abonnement à un autre à tout moment depuis votre espace administrateur.",
  },
  {
    question: "Comment puis-je annuler mon abonnement si je ne suis plus intéressé(e) ?",
    answer:
      "Vous pouvez annuler votre abonnement à tout moment depuis les paramètres de votre compte. L'accès reste actif jusqu'à la fin de la période en cours.",
  },
  {
    question: "Puis-je obtenir un remboursement après avoir annulé mon abonnement ?",
    answer:
      "Les remboursements sont traités au cas par cas dans les 7 jours suivant la facturation. Contactez notre support avec votre numéro de facture pour toute demande.",
  },
];

export default function SubscriptionPlans() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  // ── Sélecteurs Redux (planSlice) ──
  const { list, loading, error, selectedPlan, pagination } = useSelector(
    (state) => state.plans
  );

  const [showComparison, setShowComparison] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ── fetchPlans au montage ──
  useEffect(() => {
    dispatch(fetchPlans({ page: 1, limit: 20, sort: "price", order: "ASC" }));
  }, [dispatch]);

  // ── Handlers ──
  const handleSelectPlan = (plan) => {
    if (selectedPlan?.id === plan.id) {
      dispatch(clearSelectedPlan());
    } else {
      dispatch(setSelectedPlan(plan));
    }
  };

  // const handleContinue = async () => {
  //   // if (!selectedPlan || submitting) return;
  //   // setSubmitting(true);
  //   // // Ici : dispatch(createSubscription({ planId: selectedPlan.id }))
  //   // await new Promise((r) => setTimeout(r, 1500));
  //   // setSubmitting(false);
  //   // alert(`Formule "${selectedPlan.name}" sélectionnée !\n\nDispatch createSubscription({ planId: "${selectedPlan.id}" })`);
  // };

  // ── Render states ──
  const renderCards = () => {
    if (loading) {
      return [1, 2, 3].map((i) => <PlanCardSkeleton key={i} />);
    }
    if (error) {
      return (
        <div className="plans__error">
          <span className="plans__error-icon">⚠</span>
          <p>{error}</p>
          <button
            className="plans__retry-btn"
            onClick={() => dispatch(fetchPlans({ page: 1, limit: 20 }))}
          >
            Réessayer
          </button>
        </div>
      );
    }
    if (!list.length) {
      return <div className="plans__empty">Aucun plan disponible pour le moment.</div>;
    }
    return list.map((plan, i) => (
      <PlanCard
        key={plan.id}
        plan={plan}
        isSelected={selectedPlan?.id === plan.id}
        onSelect={handleSelectPlan}
        index={i}
      />
    ));
  };

  return (
    <div className="sp-page">
      {/* ── Colonne gauche ── */}
      <div className="sp-left">
        <div className="sp-left__eyebrow">MEILLEUR PRIX POUR VOS BESOINS</div>
        <h1 className="sp-left__title">
          Sélectionner l'abonnement qui vous convient
        </h1>

        <div className="sp-faq">
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>

      {/* ── Colonne droite ── */}
      <div className="sp-right">
        {/* Cards */}
        <div className="plans-list">{renderCards()}</div>

        {/* Continue button */}
        <button
          className={`sp-continue-btn ${!selectedPlan ? "sp-continue-btn--disabled" : ""}`}
          onClick={()=>navigate('/login',{replace:false})}
          disabled={!selectedPlan || submitting}
        >
          {submitting ? (
            <>
              <span className="sp-spinner" />
              Traitement…
            </>
          ) : (
            "Continue"
          )}
        </button>

        {/* Show comparison */}
        <button
          className="sp-comparison-toggle"
          onClick={() => setShowComparison(!showComparison)}
        >
          Show full comparison{" "}
          <span className={`sp-chevron ${showComparison ? "sp-chevron--up" : ""}`}>
            ∨
          </span>
        </button>

        {/* Comparison table */}
        {showComparison && !loading && list.length > 0 && (
          <div className="sp-comparison">
            <table className="sp-comparison__table">
              <thead>
                <tr>
                  <th>Fonctionnalité</th>
                  {list.map((p) => (
                    <th key={p.id}>{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Type</td>
                  {list.map((p) => (
                    <td key={p.id}>{p.type === "TIME_BASED" ? "Durée" : "Crédits"}</td>
                  ))}
                </tr>
                <tr>
                  <td>Scans</td>
                  {list.map((p) => (
                    <td key={p.id}>{p.scanLimit === null ? "Illimité" : p.scanLimit}</td>
                  ))}
                </tr>
                <tr>
                  <td>Durée</td>
                  {list.map((p) => (
                    <td key={p.id}>
                      {p.durationDays ? `${p.durationDays} jours` : "—"}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}