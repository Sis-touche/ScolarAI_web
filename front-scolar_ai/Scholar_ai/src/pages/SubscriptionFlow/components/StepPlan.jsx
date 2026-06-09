import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiStar,
  FiChevronDown,
  FiChevronUp,
  FiCheck,
  FiDollarSign,
  FiTrendingUp,
  FiRefreshCw,
  FiAlertCircle,
} from "react-icons/fi";
import {
  fetchPlans,
  setSelectedPlan,
  clearSelectedPlan,
} from "../../../reducer/planSlice";
import styles from "./StepPlan.module.css";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
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
  if (plan.scanLimit === null) features.push("Scans illimités");
  else if (plan.scanLimit > 0) features.push(`${plan.scanLimit} scans inclus`);

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

// ─────────────────────────────────────────────────────────────
// Sous‑composants
// ─────────────────────────────────────────────────────────────
const PlanCardSkeleton = () => (
  <div className={styles.skeletonCard}>
    <div className={styles.skeletonRadio} />
    <div className={styles.skeletonTitle} />
    <div className={styles.skeletonPrice} />
    <div className={styles.skeletonLine} />
    <div className={`${styles.skeletonLine} ${styles.short}`} />
    <div className={styles.skeletonLine} />
  </div>
);

const PlanCard = ({ plan, isSelected, onSelect, index }) => {
  const { main } = formatPrice(plan.price);
  const period = getPeriodLabel(plan);
  const features = getPlanFeatures(plan);
  const isFree = parseFloat(plan.price) === 0;

  return (
    <motion.div
      className={`${styles.planCard} ${isSelected ? styles.selected : ""} ${
        plan.popular ? styles.popular : ""
      }`}
      onClick={() => onSelect(plan)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(plan)}
      aria-pressed={isSelected}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {plan.popular && (
        <div className={styles.popularBadge}>
          <FiStar size={12} />
          Recommandé
        </div>
      )}

      <div className={styles.radioRow}>
        <div className={`${styles.radioOuter} ${isSelected ? styles.radioSelected : ""}`}>
          {isSelected && <div className={styles.radioDot} />}
        </div>
        <span className={styles.planName}>{plan.name}</span>
      </div>

      <div className={styles.price}>
        {isFree ? (
          <>
            <span className={styles.currency}>$</span>0
            <span className={styles.period}>/mois</span>
          </>
        ) : (
          <>
            <span className={styles.currency}>Ar</span>
            {main}
            {period && <span className={styles.period}>{period}</span>}
          </>
        )}
      </div>

      <ul className={styles.featureList}>
        {features.map((f, i) => (
          <li key={i} className={styles.featureItem}>
            <FiCheck size={14} className={styles.checkIcon} />
            {f}
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

const FaqItem = ({ question, answer }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.faqItem}>
      <button
        className={styles.faqQuestion}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        <span>{question}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <FiChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            className={styles.faqAnswer}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p>{answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────
// Composant principal
// ─────────────────────────────────────────────────────────────
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

const StepPlan = ({ onNext }) => {
  const dispatch = useDispatch();
  const { list, loading, error, selectedPlan } = useSelector((state) => state.plans);
  const [submitting, setSubmitting] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  useEffect(() => {
    dispatch(fetchPlans({ page: 1, limit: 20, sort: "price", order: "ASC" }));
  }, [dispatch]);

  const handleSelectPlan = (plan) => {
    if (selectedPlan?.id === plan.id) dispatch(clearSelectedPlan());
    else dispatch(setSelectedPlan(plan));
  };

  const handleContinue = async () => {
    if (!selectedPlan || submitting) return;
    setSubmitting(true);
    // Petit délai pour simuler (optionnel)
    await new Promise((resolve) => setTimeout(resolve, 300));
    setSubmitting(false);
    onNext();
  };

  const renderCards = () => {
    if (loading) {
      return [1, 2, 3].map((i) => <PlanCardSkeleton key={i} />);
    }
    if (error) {
      return (
        <div className={styles.errorBox}>
          <FiAlertCircle size={20} />
          <p>{error}</p>
          <button
            className={styles.retryBtn}
            onClick={() => dispatch(fetchPlans({ page: 1, limit: 20 }))}
          >
            <FiRefreshCw size={14} /> Réessayer
          </button>
        </div>
      );
    }
    if (list.length === 0) {
      return <div className={styles.emptyBox}>Aucun plan disponible pour le moment.</div>;
    }
    return list.map((plan, idx) => (
      <PlanCard
        key={plan.id}
        plan={plan}
        isSelected={selectedPlan?.id === plan.id}
        onSelect={handleSelectPlan}
        index={idx}
      />
    ));
  };

  return (
    <div className={styles.page}>
      <div className={styles.leftColumn}>
        <div className={styles.eyebrow}>MEILLEUR PRIX POUR VOS BESOINS</div>
        <h1 className={styles.title}>Sélectionner l'abonnement qui vous convient</h1>
        <div className={styles.faqList}>
          {FAQ_ITEMS.map((item, i) => (
            <FaqItem key={i} question={item.question} answer={item.answer} />
          ))}
        </div>
      </div>

      <div className={styles.rightColumn}>
        <div className={styles.plansGrid}>{renderCards()}</div>

        <motion.button
          className={`${styles.continueBtn} ${!selectedPlan ? styles.disabled : ""}`}
          onClick={handleContinue}
          disabled={!selectedPlan || submitting}
          whileTap={{ scale: 0.98 }}
          whileHover={{ scale: 1.02 }}
        >
          {submitting ? (
            <>
              <span className={styles.spinner} /> Traitement…
            </>
          ) : (
            "Continuer →"
          )}
        </motion.button>

        <button className={styles.comparisonToggle} onClick={() => setShowComparison(!showComparison)}>
          Voir la comparaison complète
          <motion.span animate={{ rotate: showComparison ? 180 : 0 }}>
            <FiChevronDown size={16} />
          </motion.span>
        </button>

        <AnimatePresence>
          {showComparison && !loading && list.length > 0 && (
            <motion.div
              className={styles.comparisonTable}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <table>
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
                      <td key={p.id}>{p.durationDays ? `${p.durationDays} jours` : "—"}</td>
                    ))}
                  </tr>
                  <tr>
                    <td>Prix</td>
                    {list.map((p) => (
                      <td key={p.id}>
                        {parseFloat(p.price) === 0
                          ? "Gratuit"
                          : `${formatPrice(p.price).main} Ar`}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default StepPlan;