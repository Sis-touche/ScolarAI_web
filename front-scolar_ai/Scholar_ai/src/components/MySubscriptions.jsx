import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiBox,
  FiCalendar,
  FiDollarSign,
  FiSmartphone,
  FiCreditCard,
  FiHome,
  FiChevronDown,
  FiChevronUp,
  FiLoader,
  FiAlertCircle,
  FiRefreshCw,
  FiPlus,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiTrendingUp,
} from "react-icons/fi";
import { fetchSubscriptions } from "../reducer/subscriptionSlice";
import { fetchPaymentPlans } from "../reducer/paymentPlanSlice";
import {
  initiatePayment,
  clearSimulationData,
  resetStatuses as resetPayStatuses,
} from "../reducer/paymentSlice";
import styles from "./MySubscriptions.module.css";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("fr-MG").format(parseFloat(v ?? 0));

const decodeJwt = (token) => {
  try {
    if (!token) return null;
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + c.charCodeAt(0).toString(16).padStart(2, "0"))
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const getUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  const payload = decodeJwt(token);
  return payload?.id ?? null;
};

const STATUS_CONFIG = {
  pending: {
    label: "En attente",
    icon: FiClock,
    bg: "#fef9c3",
    color: "#b45309",
    dot: "#f59e0b",
  },
  paid: {
    label: "Payé",
    icon: FiCheckCircle,
    bg: "#dcfce7",
    color: "#166534",
    dot: "#22c55e",
  },
  active: {
    label: "Actif",
    icon: FiTrendingUp,
    bg: "#e0f2fe",
    color: "#0369a1",
    dot: "#0ea5e9",
  },
  expired: {
    label: "Expiré",
    icon: FiXCircle,
    bg: "#f3f4f6",
    color: "#6b7280",
    dot: "#9ca3af",
  },
  overdue: {
    label: "En retard",
    icon: FiAlertCircle,
    bg: "#fee2e2",
    color: "#991b1b",
    dot: "#ef4444",
  },
  partial: {
    label: "Partiel",
    icon: FiTrendingUp,
    bg: "#fdf4ff",
    color: "#7e22ce",
    dot: "#a855f7",
  },
  confirmed: {
    label: "Confirmé",
    icon: FiCheckCircle,
    bg: "#dcfce7",
    color: "#166534",
    dot: "#22c55e",
  },
  failed: {
    label: "Échoué",
    icon: FiXCircle,
    bg: "#fee2e2",
    color: "#991b1b",
    dot: "#ef4444",
  },
};

const getStatusConfig = (status) => STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;

const PAYMENT_METHODS = [
  { value: "mobile_money", label: "Mobile Money", icon: FiSmartphone },
  { value: "carte_bancaire", label: "Carte", icon: FiCreditCard },
  { value: "virement", label: "Virement", icon: FiHome },
  { value: "especes", label: "Espèces", icon: FiDollarSign },
];

// ─────────────────────────────────────────────────────────────
// Sous-composants
// ─────────────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const cfg = getStatusConfig(status);
  const Icon = cfg.icon;
  return (
    <span className={styles.badge} style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
};

const InstallmentProgress = ({ installments }) => {
  const total = installments.length;
  const paid = installments.filter((p) => ["paid", "confirmed"].includes(p.status)).length;
  const pct = total > 0 ? (paid / total) * 100 : 0;
  return (
    <div className={styles.progressWrap}>
      <div className={styles.progressBar}>
        <motion.div
          className={styles.progressFill}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4 }}
        />
      </div>
      <span className={styles.progressLabel}>
        {paid}/{total} tranches payées
      </span>
    </div>
  );
};

const InstallmentRow = ({ plan, index, onPay, paying }) => {
  const cfg = getStatusConfig(plan.status);
  const isPending = ["pending", "overdue"].includes(plan.status);
  const dueDate = plan.due_date ? new Date(plan.due_date).toLocaleDateString("fr-MG") : "—";

  return (
    <motion.div
      className={styles.installRow}
      style={{ borderLeftColor: cfg.dot }}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.03 }}
    >
      <div className={styles.installLeft}>
        <span className={styles.installNum}>Tranche #{plan.installment_number ?? index + 1}</span>
        <span className={styles.installDate}>Échéance : {dueDate}</span>
      </div>
      <div className={styles.installRight}>
        <span className={styles.installAmount}>Ar {fmt(plan.amount)}</span>
        <StatusBadge status={plan.status} />
        {isPending && (
          <button
            className={styles.payBtn}
            onClick={() => onPay(plan.id)}
            disabled={paying}
          >
            {paying ? <FiLoader className={styles.spinnerSmall} /> : "Payer"}
          </button>
        )}
      </div>
    </motion.div>
  );
};

const SubscriptionCard = ({ subscription }) => {
  const dispatch = useDispatch();
  const { list: allInstallments, loading: loadingPlans } = useSelector((s) => s.paymentPlans);
  const { initiateStatus, currentSimulationUrl, currentTransactionRef } = useSelector(
    (s) => s.payments
  );

  const [expanded, setExpanded] = useState(false);
  const [method, setMethod] = useState("mobile_money");
  const [payingId, setPayingId] = useState(null);
  const [showSim, setShowSim] = useState(false);

  const installments = allInstallments.filter((p) => p.subscription_id === subscription.id);
  const hasPending = installments.some((p) => ["pending", "overdue"].includes(p.status));
  const startDate = subscription.startDate
    ? new Date(subscription.startDate).toLocaleDateString("fr-MG")
    : "—";
  const endDate = subscription.endDate
    ? new Date(subscription.endDate).toLocaleDateString("fr-MG")
    : "—";

  useEffect(() => {
    if (expanded && subscription.id) {
      dispatch(
        fetchPaymentPlans({
          subscription_id: subscription.id,
          limit: 50,
          sort: "installment_number",
          order: "ASC",
        })
      );
    }
  }, [expanded, subscription.id, dispatch]);

  useEffect(() => {
    if (initiateStatus === "succeeded" && currentSimulationUrl) {
      setShowSim(true);
    }
  }, [initiateStatus, currentSimulationUrl]);

  useEffect(() => {
    const handleMsg = (event) => {
      if (event.data?.type === "PAYMENT_RESULT") {
        setShowSim(false);
        dispatch(clearSimulationData());
        dispatch(resetPayStatuses());
        setPayingId(null);
        dispatch(
          fetchPaymentPlans({
            subscription_id: subscription.id,
            limit: 50,
            sort: "installment_number",
            order: "ASC",
          })
        );
      }
    };
    window.addEventListener("message", handleMsg);
    return () => window.removeEventListener("message", handleMsg);
  }, [subscription.id, dispatch]);

  const handlePay = (planId) => {
    setPayingId(planId);
    dispatch(
      initiatePayment({
        payment_plan_id: planId,
        user_id: subscription.user_id,
        method,
        notes: `Reprise paiement — abonnement #${subscription.id}`,
      })
    );
  };

  const openSimulation = () => {
    const w = 480,
      h = 600;
    const left = window.screenX + (window.outerWidth - w) / 2;
    const top = window.screenY + (window.outerHeight - h) / 2;
    window.open(currentSimulationUrl, "sim_pay", `width=${w},height=${h},left=${left},top=${top},resizable=no`);
  };

  return (
    <motion.div
      className={`${styles.card} ${expanded ? styles.cardExpanded : ""}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.cardHeader} onClick={() => setExpanded(!expanded)}>
        <div className={styles.cardHeaderLeft}>
          <div className={styles.cardIcon}>
            <FiBox size={24} />
          </div>
          <div>
            <div className={styles.cardTitle}>
              Abonnement <code className={styles.cardId}>#{subscription.id.slice(0, 8)}…</code>
            </div>
            <div className={styles.cardMeta}>
              {startDate !== "—" && (
                <span>
                  <FiCalendar size={12} /> Du {startDate} au {endDate}
                </span>
              )}
              {subscription.remainingScans > 0 && (
                <span className={styles.scanBadge}>
                  🔍 {subscription.remainingScans} scans
                </span>
              )}
            </div>
          </div>
        </div>
        <div className={styles.cardHeaderRight}>
          <StatusBadge status={subscription.status} />
          {hasPending && <span className={styles.alertDot} title="Tranches en attente">!</span>}
          <motion.span
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className={styles.chevron}
          >
            <FiChevronDown size={18} />
          </motion.span>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            className={styles.cardBody}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {installments.length > 0 && <InstallmentProgress installments={installments} />}

            {hasPending && (
              <div className={styles.methodSection}>
                <p className={styles.methodTitle}>Méthode de paiement</p>
                <div className={styles.methodRow}>
                  {PAYMENT_METHODS.map((m) => {
                    const Icon = m.icon;
                    return (
                      <button
                        key={m.value}
                        className={`${styles.methodBtn} ${method === m.value ? styles.methodBtnActive : ""}`}
                        onClick={() => setMethod(m.value)}
                      >
                        <Icon size={16} /> {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loadingPlans ? (
              <div className={styles.loading}>
                <FiLoader className={styles.spinner} /> Chargement des tranches…
              </div>
            ) : installments.length === 0 ? (
              <div className={styles.empty}>Aucune tranche trouvée.</div>
            ) : (
              <div className={styles.installList}>
                {installments.map((p, i) => (
                  <InstallmentRow
                    key={p.id}
                    plan={p}
                    index={i}
                    onPay={handlePay}
                    paying={initiateStatus === "loading" && payingId === p.id}
                  />
                ))}
              </div>
            )}

            <AnimatePresence>
              {showSim && currentSimulationUrl && (
                <motion.div
                  className={styles.simBox}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <div className={styles.simHeader}>
                    <span>✅ Paiement initié</span>
                    <code className={styles.simRef}>{currentTransactionRef}</code>
                  </div>
                  <button className={styles.simBtn} onClick={openSimulation}>
                    Ouvrir la simulation ↗
                  </button>
                  <button
                    className={styles.simClose}
                    onClick={() => {
                      setShowSim(false);
                      dispatch(clearSimulationData());
                      dispatch(resetPayStatuses());
                    }}
                  >
                    Fermer
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ─────────────────────────────────────────────────────────────
// Page principale
// ─────────────────────────────────────────────────────────────
export default function MySubscriptions({ userId: userIdProp, onNewSubscription }) {
  const dispatch = useDispatch();
  const userId = userIdProp ?? getUserIdFromToken();
  const { list, loading, error, pagination } = useSelector((s) => s.subscriptions);

  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (userId) {
      dispatch(
        fetchSubscriptions({
          user_id: userId,
          page,
          limit: 10,
          sort: "created_at",
          order: "DESC",
          ...(statusFilter !== "all" && { status: statusFilter }),
        })
      );
    }
  }, [userId, page, statusFilter, dispatch]);

  const filters = [
    { value: "all", label: "Tous" },
    { value: "active", label: "Actifs" },
    { value: "pending", label: "En attente" },
    { value: "expired", label: "Expirés" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Mes abonnements</h1>
            <p className={styles.subtitle}>
              {pagination?.total ?? 0} abonnement{pagination?.total !== 1 ? "s" : ""} trouvé
              {pagination?.total !== 1 ? "s" : ""}
            </p>
          </div>
          {onNewSubscription && (
            <button className={styles.newBtn} onClick={onNewSubscription}>
              <FiPlus size={16} /> Nouvel abonnement
            </button>
          )}
        </div>

        <div className={styles.filters}>
          {filters.map((f) => (
            <button
              key={f.value}
              className={`${styles.filterBtn} ${statusFilter === f.value ? styles.filterBtnActive : ""}`}
              onClick={() => {
                setStatusFilter(f.value);
                setPage(1);
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading && (
          <div className={styles.loadingPage}>
            <FiLoader className={styles.spinnerLg} />
            <span>Chargement de vos abonnements…</span>
          </div>
        )}

        {error && (
          <div className={styles.errorBox}>
            <FiAlertCircle size={18} />
            <span>{error}</span>
            <button
              className={styles.retryBtn}
              onClick={() =>
                dispatch(
                  fetchSubscriptions({
                    user_id: userId,
                    page,
                    limit: 10,
                    sort: "created_at",
                    order: "DESC",
                    ...(statusFilter !== "all" && { status: statusFilter }),
                  })
                )
              }
            >
              <FiRefreshCw size={14} /> Réessayer
            </button>
          </div>
        )}

        {!loading && !error && list.length === 0 && (
          <div className={styles.emptyPage}>
            <div className={styles.emptyIcon}>📭</div>
            <p className={styles.emptyText}>Aucun abonnement trouvé.</p>
            {onNewSubscription && (
              <button className={styles.newBtn} onClick={onNewSubscription}>
                Créer mon premier abonnement
              </button>
            )}
          </div>
        )}

        <AnimatePresence>
          {!loading &&
            list.map((sub) => <SubscriptionCard key={sub.id} subscription={sub} />)}
        </AnimatePresence>

        {pagination?.totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={`${styles.pageBtn} ${page === 1 ? styles.pageBtnDisabled : ""}`}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              ← Précédent
            </button>
            <span className={styles.pageInfo}>
              Page {page} / {pagination.totalPages}
            </span>
            <button
              className={`${styles.pageBtn} ${
                page === pagination.totalPages ? styles.pageBtnDisabled : ""
              }`}
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page === pagination.totalPages}
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}