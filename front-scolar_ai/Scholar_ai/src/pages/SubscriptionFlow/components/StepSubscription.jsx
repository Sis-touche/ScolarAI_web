import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiDollarSign,
  FiCalendar,
  FiCreditCard,
  FiArrowLeft,
  FiAlertCircle,
  FiLoader,
} from "react-icons/fi";
import { createSubscription, setSelectedSubscription } from "../../../reducer/subscriptionSlice";
import RecapRow from "./RecapRow";
import { fmt } from "../helpers";
import styles from "./StepSubscription.module.css";

const StepSubscription = ({ onNext, onBack, userId }) => {
  const dispatch = useDispatch();
  const { selectedPlan } = useSelector((s) => s.plans);
  const { createStatus, error, selectedSubscription, list: subList } = useSelector(
    (s) => s.subscriptions
  );
  const subscription = selectedSubscription ?? (createStatus === "succeeded" ? subList[0] : null);
  const [paymentMode, setPaymentMode] = useState("total");
  const [isCreating, setIsCreating] = useState(false);

  const isLoading = createStatus === "loading" || isCreating;

  const handleContinue = async () => {
    if (!selectedPlan || isLoading) return;

    const nbTranches = paymentMode === "total" ? 1 : 2;

    // Si abonnement existe déjà avec le bon nombre de tranches
    if (subscription && subscription.nb_tranches === nbTranches) {
      dispatch(setSelectedSubscription({ ...subscription, paymentMode }));
      onNext(paymentMode);
      return;
    }

    setIsCreating(true);
    try {
      const result = await dispatch(
        createSubscription({
          user_id: userId,
          plan_id: selectedPlan.id,
          nb_tranches: nbTranches,
        })
      ).unwrap();
      dispatch(setSelectedSubscription({ ...result, paymentMode }));
      onNext(paymentMode);
    } catch (err) {
      console.error("Erreur création abonnement", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Récapitulatif de votre abonnement</h2>
        <p>Votre abonnement sera créé lors du passage au paiement.</p>
      </div>

      <AnimatePresence>
        {createStatus === "failed" && error && (
          <motion.div
            className={styles.errorBox}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <FiAlertCircle size={18} />
            <span>{error}</span>
            <button className={styles.retryBtn} onClick={handleContinue}>
              Réessayer
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedPlan && (
        <motion.div
          className={styles.recapCard}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
        >
          <RecapRow label="Plan" value={selectedPlan.name} />
          <RecapRow label="Type" value={selectedPlan.type === "TIME_BASED" ? "Durée" : "Crédits"} />
          <RecapRow label="Prix" value={`Ar ${fmt(selectedPlan.price)}`} />
          {selectedPlan.durationDays && (
            <RecapRow label="Durée" value={`${selectedPlan.durationDays} jours`} />
          )}
          {selectedPlan.scanLimit !== null && (
            <RecapRow
              label="Scans"
              value={selectedPlan.scanLimit === null ? "Illimité" : selectedPlan.scanLimit}
            />
          )}
        </motion.div>
      )}

      <div className={styles.modeSelector}>
        <p className={styles.modeSelectorTitle}>
          <FiCreditCard size={14} /> Mode de paiement
        </p>
        <div className={styles.modeGrid}>
          <button
            className={`${styles.modeBtn} ${paymentMode === "total" ? styles.active : ""}`}
            onClick={() => setPaymentMode("total")}
          >
            <FiDollarSign size={22} className={styles.modeIcon} />
            <span className={styles.modeName}>Paiement total</span>
            <span className={styles.modeDesc}>
              Ar {fmt(selectedPlan?.price)} en une fois
            </span>
          </button>
          <button
            className={`${styles.modeBtn} ${paymentMode === "installments" ? styles.active : ""}`}
            onClick={() => setPaymentMode("installments")}
          >
            <FiCalendar size={22} className={styles.modeIcon} />
            <span className={styles.modeName}>Paiement en 2 tranches</span>
            <span className={styles.modeDesc}>
              2 × Ar {fmt(parseFloat(selectedPlan?.price ?? 0) / 2)} / mois
            </span>
          </button>
        </div>
      </div>

      <div className={styles.navRow}>
        <button className={styles.btnSecondary} onClick={onBack}>
          <FiArrowLeft size={14} /> Retour
        </button>
        <button
          className={`${styles.btnPrimary} ${isLoading ? styles.disabled : ""}`}
          onClick={handleContinue}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <FiLoader className={styles.spinner} /> Création…
            </>
          ) : (
            "Passer au paiement →"
          )}
        </button>
      </div>
    </div>
  );
};

export default StepSubscription;