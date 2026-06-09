import React from "react";
import { motion } from "framer-motion";
import { FiCheckCircle, FiStar, FiTrendingUp, FiDollarSign } from "react-icons/fi";
import { fmt, getPlanFeatures } from "../helpers";
import styles from "./PlanCard.module.css";

const PlanCard = ({ plan, selected, onSelect, index }) => {
  const features = getPlanFeatures(plan);
  const isFree = parseFloat(plan.price) === 0;
  const isPopular = plan.popular;
  const isTimeBased = plan.type === "TIME_BASED";
  const isAnnual = isTimeBased && plan.durationDays >= 365;

  return (
    <motion.div
      className={`${styles.card} ${selected ? styles.selected : ""}`}
      onClick={() => onSelect(plan)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(plan)}
      aria-pressed={selected}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      {isPopular && (
        <div className={styles.popularBadge}>
          <FiStar size={12} />
          Recommandé
        </div>
      )}

      <div className={styles.radioRow}>
        <div className={`${styles.radioOuter} ${selected ? styles.radioSelected : ""}`}>
          {selected && <div className={styles.radioDot} />}
        </div>
        <span className={styles.planName}>{plan.name}</span>
      </div>

      <div className={styles.pricing}>
        {isFree ? (
          <div className={styles.price}>
            <span className={styles.priceCurrency}>$</span>0
            <span className={styles.pricePeriod}>/mois</span>
          </div>
        ) : (
          <div className={styles.price}>
            <span className={styles.priceCurrency}>Ar</span>
            {fmt(plan.price)}
            {!isFree && (
              <span className={styles.pricePeriod}>
                {isAnnual ? "/an" : "/mois"}
              </span>
            )}
          </div>
        )}
      </div>

      <ul className={styles.features}>
        {features.map((f, i) => (
          <li key={i} className={styles.featureItem}>
            <FiCheckCircle size={14} className={styles.checkIcon} />
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export default PlanCard;