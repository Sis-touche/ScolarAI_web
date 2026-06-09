import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiSmartphone,
  FiCreditCard,
  FiHome,
  FiDollarSign,
  FiLoader,
  FiAlertCircle,
  FiExternalLink,
  FiArrowLeft,
  FiCheckCircle,
} from "react-icons/fi";
import { fetchPaymentPlans } from "../../../reducer/paymentPlanSlice";
import {
  initiatePayment,
  clearSimulationData,
  resetStatuses,
} from "../../../reducer/paymentSlice";
import { fetchSubscriptionById } from "../../../reducer/subscriptionSlice";
import { PAYMENT_METHODS } from "../constants";
import InstallmentCard from "./InstallmentCard";
import styles from "./StepPayment.module.css";

const iconMap = {
  mobile_money: FiSmartphone,
  carte_bancaire: FiCreditCard,
  virement: FiHome,
  especes: FiDollarSign,
};

const StepPayment = ({
  onNext,
  onBack,
  subscription: subscriptionProp,
  paymentMode = "total",
}) => {
  const dispatch = useDispatch();
  const { list: installments, loading: loadingPlans } = useSelector(
    (s) => s.paymentPlans
  );
  const {
    initiateStatus,
    error: payError,
    currentSimulationUrl,
    currentTransactionRef,
  } = useSelector((s) => s.payments);
  const { selectedSubscription: reduxSub } = useSelector((s) => s.subscriptions);
  const subscription = reduxSub ?? subscriptionProp;

  const [method, setMethod] = useState("mobile_money");
  const [payingId, setPayingId] = useState(null);
  const [showSim, setShowSim] = useState(false);

  // Recharger les tranches après retour de simulation
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment");
    if (paymentResult === "success" && subscription?.id) {
      dispatch(
        fetchPaymentPlans({
          subscription_id: subscription.id,
          limit: 50,
          sort: "installment_number",
          order: "ASC",
        })
      );
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [subscription?.id, dispatch]);

  // Chargement initial des tranches
  useEffect(() => {
    if (subscription?.id) {
      dispatch(
        fetchPaymentPlans({
          subscription_id: subscription.id,
          limit: 50,
          sort: "installment_number",
          order: "ASC",
        })
      );
    }
  }, [subscription?.id, dispatch]);

  // Affichage de la simulation quand l'URL est prête
  useEffect(() => {
    if (initiateStatus === "succeeded" && currentSimulationUrl) {
      setShowSim(true);
    }
  }, [initiateStatus, currentSimulationUrl]);

  // Réception du message de la popup simulation
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "PAYMENT_RESULT") {
        setShowSim(false);
        dispatch(clearSimulationData());
        dispatch(resetStatuses());
        if (subscription?.id) {
          dispatch(
            fetchPaymentPlans({
              subscription_id: subscription.id,
              limit: 50,
              sort: "installment_number",
              order: "ASC",
            })
          );
          dispatch(fetchSubscriptionById(subscription.id));
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [subscription?.id, dispatch]);

  const handlePay = (planId) => {
    setPayingId(planId);
    dispatch(
      initiatePayment({
        payment_plan_id: planId,
        user_id: subscription?.user_id,
        method,
        notes: `Paiement tranche – abonnement #${subscription?.id}`,
      })
    );
  };

  const visibleInstallments =
    paymentMode === "total" ? installments.slice(0, 1) : installments;
  const PAID_STATUSES = ["paid", "confirmed", "success"];
  const allPaid =
    visibleInstallments.length > 0 &&
    visibleInstallments.every((p) => PAID_STATUSES.includes(p.status));
  const subIsActive =
    subscription?.status === "active" || reduxSub?.status === "active";
  const canProceed = allPaid || subIsActive;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2>Paiement des échéances</h2>
        <p>
          {visibleInstallments.length} tranche
          {visibleInstallments.length !== 1 ? "s" : ""} à régler
          {paymentMode === "total"
            ? " — paiement intégral"
            : " — paiement échelonné"}
          .
        </p>
      </div>

      {/* Méthodes de paiement */}
      <div className={styles.methodsGrid}>
        {PAYMENT_METHODS.map((m) => {
          const Icon = iconMap[m.value] || FiCreditCard;
          return (
            <button
              key={m.value}
              className={`${styles.methodBtn} ${
                method === m.value ? styles.activeMethod : ""
              }`}
              onClick={() => setMethod(m.value)}
            >
              <Icon size={22} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Liste des tranches */}
      {loadingPlans ? (
        <div className={styles.loadingBox}>
          <FiLoader className={styles.spinner} />
          <span>Chargement des tranches…</span>
        </div>
      ) : visibleInstallments.length === 0 ? (
        <div className={styles.emptyBox}>
          Aucune tranche trouvée pour cet abonnement.
        </div>
      ) : (
        <motion.div
          className={styles.installmentsGrid}
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
          }}
        >
          {visibleInstallments.map((p, i) => (
            <InstallmentCard
              key={p.id}
              plan={p}
              index={i}
              onPay={handlePay}
              paying={initiateStatus === "loading" && payingId === p.id}
            />
          ))}
        </motion.div>
      )}

      {/* Erreur de paiement */}
      {initiateStatus === "failed" && payError && (
        <div className={styles.errorBox}>
          <FiAlertCircle size={16} />
          <span>{payError}</span>
        </div>
      )}

      {/* Simulation popup */}
      <AnimatePresence>
        {showSim && currentSimulationUrl && (
          <motion.div
            className={styles.simOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.simCard}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className={styles.simHeader}>
                <FiCheckCircle size={20} color="#0f766e" />
                <strong>Paiement initié</strong>
              </div>
              <p>
                Réf : <code>{currentTransactionRef}</code>
              </p>
              <p>Utilisez le lien de simulation pour confirmer :</p>
              <button
                className={styles.simLink}
                onClick={() => {
                  const w = 480,
                    h = 600;
                  const left = window.screenX + (window.outerWidth - w) / 2;
                  const top = window.screenY + (window.outerHeight - h) / 2;
                  window.open(
                    currentSimulationUrl,
                    "simulation_paiement",
                    `width=${w},height=${h},left=${left},top=${top},resizable=no`
                  );
                }}
              >
                Ouvrir la simulation <FiExternalLink size={14} />
              </button>
              <button
                className={styles.simClose}
                onClick={() => {
                  setShowSim(false);
                  dispatch(clearSimulationData());
                  dispatch(resetStatuses());
                }}
              >
                Fermer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className={styles.navRow}>
        <button className={styles.btnSecondary} onClick={onBack}>
          <FiArrowLeft size={14} /> Retour
        </button>
        <button
          className={`${styles.btnPrimary} ${!canProceed ? styles.disabled : ""}`}
          onClick={onNext}
          disabled={!canProceed}
        >
          Voir la confirmation →
        </button>
      </div>

      {!canProceed && installments.length > 0 && (
        <p className={styles.hint}>
          Payez toutes les tranches pour continuer.
        </p>
      )}
    </div>
  );
};

export default StepPayment;