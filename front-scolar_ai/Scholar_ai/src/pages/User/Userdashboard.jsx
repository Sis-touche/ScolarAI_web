// UserDashboard.jsx
import { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import { QRCodeSVG } from "qrcode.react";
import {
  FiUser, FiMail, FiCalendar, FiTag, FiScissors, FiSettings,
  FiCreditCard, FiFileText, FiActivity, FiChevronDown, FiChevronUp,
  FiArrowLeft, FiPackage, FiCheckCircle, FiAlertCircle, FiInfo,
  FiDollarSign, FiClock
} from "react-icons/fi";
import { FiX } from "react-icons/fi";
import { fetchSubscriptions } from "../../reducer/subscriptionSlice";
import { fetchPayments } from "../../reducer/paymentSlice";
import { fetchInvoices } from "../../reducer/invoiceSlice";
import styles from "./UserDashboard.module.css";

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
const fmt = (v) => new Intl.NumberFormat("fr-MG").format(parseFloat(v ?? 0));
const fmtDate = (d) => d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

const STATUS_MAP = {
  pending:   { label: "En attente",  color: "#b45309", bg: "#fef9c3", icon: FiClock },
  active:    { label: "Actif",       color: "#0369a1", bg: "#e0f2fe", icon: FiCheckCircle },
  paid:      { label: "Payé",        color: "#166534", bg: "#dcfce7", icon: FiCheckCircle },
  confirmed: { label: "Confirmé",    color: "#166534", bg: "#dcfce7", icon: FiCheckCircle },
  expired:   { label: "Expiré",      color: "#6b7280", bg: "#f3f4f6", icon: FiAlertCircle },
  overdue:   { label: "En retard",   color: "#991b1b", bg: "#fee2e2", icon: FiAlertCircle },
  failed:    { label: "Échoué",      color: "#991b1b", bg: "#fee2e2", icon: FiAlertCircle },
  partial:   { label: "Partiel",     color: "#7e22ce", bg: "#f3e8ff", icon: FiInfo },
  open:      { label: "Ouvert",      color: "#b45309", bg: "#fef9c3", icon: FiInfo },
  cancelled: { label: "Annulé",      color: "#6b7280", bg: "#f3f4f6", icon: FiAlertCircle },
};

const getStatus = (s) => STATUS_MAP[s] ?? STATUS_MAP.pending;

// ─────────────────────────────────────────────────────────────
// COMPOSANTS UI AVEC FRAMER MOTION
// ─────────────────────────────────────────────────────────────
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
};

function StatusPill({ status }) {
  const cfg = getStatus(status);
  const Icon = cfg.icon;
  return (
    <span className={styles.statusPill} style={{ background: cfg.bg, color: cfg.color }}>
      <Icon size={12} />
      {cfg.label}
    </span>
  );
}

function SectionTitle({ icon: Icon, title, action }) {
  return (
    <div className={styles.sectionTitle}>
      <div className={styles.sectionTitleLeft}>
        <div className={styles.iconWrapper}>
          <Icon size={18} />
        </div>
        <span>{title}</span>
      </div>
      {action && <div className={styles.sectionTitleAction}>{action}</div>}
    </div>
  );
}

function TabBar({ tabs, active, onChange }) {
  return (
    <div className={styles.tabBar}>
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={`${styles.tab} ${active === t.value ? styles.tabActive : ""}`}
        >
          {t.label}
          {t.count !== undefined && <span className={styles.tabCount}>{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

function Card({ children, delay = 0 }) {
  return (
    <motion.div
      variants={fadeInUp}
      initial="hidden"
      animate="visible"
      transition={{ delay }}
      className={styles.card}
    >
      {children}
    </motion.div>
  );
}

function InfoRow({ label, value, mono }) {
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={`${styles.infoValue} ${mono ? styles.mono : ""}`}>{value}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className={styles.spinnerContainer}>
      <div className={styles.spinner} />
    </div>
  );
}

function Empty({ text }) {
  return <p className={styles.empty}>{text}</p>;
}

// ─────────────────────────────────────────────────────────────
// SECTIONS
// ─────────────────────────────────────────────────────────────
function GeneralInfo({ user, subscription }) {
  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const qrValue = subscription?.mobile_activation_token
    ? `${window.location.origin}/activate?token=${subscription.mobile_activation_token}`
    : null;

  return (
    <Card delay={0.1}>
      <SectionTitle icon={FiUser} title="Informations générales" />
      <div className={styles.generalGrid}>
        <div>
          <InfoRow label="Membre depuis" value={fmtDate(user?.createdAt || user?.created_at)} />
          <InfoRow label="Email" value={user?.email ?? "—"} />
          <InfoRow label="Rôle" value={user?.role ?? "—"} />
          {subscription && (
            <>
              <InfoRow label="Abonnement" value={`#${subscription.id?.slice(0, 8)}…`} mono />
              <InfoRow label="Statut" value={<StatusPill status={subscription.status} />} />
              {subscription.endDate && <InfoRow label="Expire le" value={fmtDate(subscription.endDate)} />}
              {subscription.remainingScans > 0 && <InfoRow label="Scans restants" value={subscription.remainingScans} />}
            </>
          )}
        </div>

        {/* QR code cliquable */}
        <div className={styles.qrWrapper}>
          {qrValue ? (
            <div 
              className={styles.qrCard} 
              onClick={() => setIsQRModalOpen(true)}
              style={{ cursor: "pointer" }}
            >
              <QRCodeSVG value={qrValue} size={110} level="H" />
              <p>Cliquez pour agrandir</p>
            </div>
          ) : (
            <div className={styles.qrPlaceholder}>
              <FiTag size={28} />
              <span>QR disponible après activation</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal QR Code agrandi */}
      <AnimatePresence>
        {isQRModalOpen && qrValue && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsQRModalOpen(false)}
          >
            <motion.div
              className={styles.modalContent}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.modalClose}
                onClick={() => setIsQRModalOpen(false)}
              >
                <FiX size={24} />
              </button>
              <div className={styles.modalQR}>
                <QRCodeSVG value={qrValue} size={250} level="H" />
              </div>
              <p className={styles.modalText}>
                Scannez ce code depuis l'application mobile
              </p>
              <p className={styles.modalToken}>
                Token: {subscription?.mobile_activation_token}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  );
}

function SubscriptionsSection({ userId }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.subscriptions);

  useEffect(() => {
    if (userId) dispatch(fetchSubscriptions({ user_id: userId, limit: 10, sort: "created_at", order: "DESC" }));
  }, [userId, dispatch]);

  return (
    <Card delay={0.15}>
      <SectionTitle icon={FiPackage} title="Abonnements" />
      {loading ? <Spinner /> : list.length === 0 ? <Empty text="Aucun abonnement" /> : (
        <div className={styles.subscriptionsList}>
          {list.map((sub) => (
            <motion.div key={sub.id} className={styles.subscriptionItem} whileHover={{ scale: 1.01 }} transition={{ duration: 0.2 }}>
              <div className={styles.subscriptionIcon}>
                <FiPackage size={20} />
              </div>
              <div className={styles.subscriptionInfo}>
                <div className={styles.subscriptionId}>Abonnement #{sub.id?.slice(0, 8)}…</div>
                <div className={styles.subscriptionDate}>
                  {sub.startDate ? `Du ${fmtDate(sub.startDate)} au ${fmtDate(sub.endDate)}` : "En attente de paiement"}
                </div>
              </div>
              <StatusPill status={sub.status} />
            </motion.div>
          ))}
        </div>
      )}
    </Card>
  );
}

function PaymentsSection({ userId }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.payments);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (userId) dispatch(fetchPayments({ user_id: userId, limit: 20, sort: "created_at", order: "DESC" }));
  }, [userId, dispatch]);

  const filtered = tab === "all" ? list
    : tab === "succeeded" ? list.filter(p => ["paid","confirmed"].includes(p.status))
    : tab === "pending" ? list.filter(p => p.status === "pending")
    : list.filter(p => p.status === "failed");

  const counts = {
    all: list.length,
    succeeded: list.filter(p => ["paid","confirmed"].includes(p.status)).length,
    pending: list.filter(p => p.status === "pending").length,
    failed: list.filter(p => p.status === "failed").length,
  };

  return (
    <Card delay={0.2}>
      <SectionTitle icon={FiCreditCard} title="Paiements" action={<span className={styles.totalBadge}>{list.length} total</span>} />
      <TabBar tabs={[
        { value: "all", label: "Tous", count: counts.all },
        { value: "succeeded", label: "Confirmés", count: counts.succeeded },
        { value: "pending", label: "En attente", count: counts.pending },
        { value: "failed", label: "Échoués", count: counts.failed },
      ]} active={tab} onChange={setTab} />
      {loading ? <Spinner /> : filtered.length === 0 ? <Empty text="Aucun paiement" /> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr><th>Référence</th><th>Montant</th><th>Statut</th><th>Méthode</th><th>Date</th></tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td data-label="Référence"><span className={styles.ref}>#{p.transaction_ref?.slice(-8) ?? p.id?.slice(0, 8)}</span></td>
                  <td data-label="Montant"><strong>Ar {fmt(p.amount)}</strong></td>
                  <td data-label="Statut"><StatusPill status={p.status} /></td>
                  <td data-label="Méthode">{p.method ?? "—"}</td>
                  <td data-label="Date">{fmtDate(p.created_at)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function InvoicesSection({ userId }) {
  const dispatch = useDispatch();
  const { list, loading } = useSelector((s) => s.invoices);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    if (userId) dispatch(fetchInvoices({ user_id: userId, limit: 20, sort: "created_at", order: "DESC" }));
  }, [userId, dispatch]);

  const filtered = tab === "all" ? list
    : tab === "open" ? list.filter(i => ["pending","partial","overdue"].includes(i.status))
    : list.filter(i => i.status === "paid");

  const counts = { all: list.length, open: list.filter(i => ["pending","partial","overdue"].includes(i.status)).length, paid: list.filter(i => i.status === "paid").length };

  return (
    <Card delay={0.25}>
      <SectionTitle icon={FiFileText} title="Factures" action={<span className={styles.totalBadge}>{list.length} total</span>} />
      <TabBar tabs={[
        { value: "all", label: "Toutes", count: counts.all },
        { value: "open", label: "Ouvertes", count: counts.open },
        { value: "paid", label: "Payées", count: counts.paid },
      ]} active={tab} onChange={setTab} />
      {loading ? <Spinner /> : filtered.length === 0 ? <Empty text="Aucune facture" /> : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead><tr><th>N° Facture</th><th>Montant</th><th>Statut</th><th>Échéance</th><th>Créée le</th></tr></thead>
            <tbody>
              {filtered.map((inv, i) => (
                <motion.tr key={inv.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.02 }}>
                  <td data-label="N° Facture"><span className={styles.ref}>{inv.invoice_number ?? `#${inv.id?.slice(0, 8)}`}</span></td>
                  <td data-label="Montant"><strong>Ar {fmt(inv.total_amount)}</strong></td>
                  <td data-label="Statut"><StatusPill status={inv.status} /></td>
                  <td data-label="Échéance">{fmtDate(inv.due_date)}</td>
                  <td data-label="Créée le">{fmtDate(inv.created_at)}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function ActivitiesSection({ payments, subscriptions }) {
  const [showAll, setShowAll] = useState(false);
  const activities = [
    ...payments.map(p => ({
      id: `pay-${p.id}`,
      type: ["paid","confirmed"].includes(p.status) ? "success" : p.status === "failed" ? "error" : "info",
      text: ["paid","confirmed"].includes(p.status) ? `Paiement de Ar ${fmt(p.amount)} confirmé` : p.status === "failed" ? `Paiement de Ar ${fmt(p.amount)} échoué` : `Paiement de Ar ${fmt(p.amount)} en attente`,
      date: p.created_at,
    })),
    ...subscriptions.map(s => ({
      id: `sub-${s.id}`,
      type: s.status === "active" ? "success" : "info",
      text: s.status === "active" ? `Abonnement activé — #${s.id?.slice(0, 8)}` : `Abonnement créé en attente — #${s.id?.slice(0, 8)}`,
      date: s.created_at,
    })),
  ].sort((a,b) => new Date(b.date) - new Date(a.date));

  const visible = showAll ? activities : activities.slice(0, 5);
  const dotColor = { success: "#22c55e", error: "#ef4444", info: "#6366f1" };
  const IconMap = { success: FiCheckCircle, error: FiAlertCircle, info: FiInfo };

  return (
    <Card delay={0.3}>
      <SectionTitle icon={FiActivity} title="Activités récentes" />
      {activities.length === 0 ? <Empty text="Aucune activité" /> : (
        <div className={styles.timeline}>
          {visible.map((a, i) => {
            const Icon = IconMap[a.type];
            return (
              <motion.div key={a.id} className={styles.timelineItem} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <div className={styles.timelineDot} style={{ background: dotColor[a.type] }} />
                <div className={styles.timelineContent}>
                  <div className={styles.timelineText}>
                    <Icon size={14} style={{ marginRight: 8, color: dotColor[a.type] }} />
                    {a.text}
                  </div>
                  <div className={styles.timelineDate}>{fmtTime(a.date)} — {fmtDate(a.date)}</div>
                </div>
              </motion.div>
            );
          })}
          {activities.length > 5 && (
            <button onClick={() => setShowAll(!showAll)} className={styles.showMoreBtn}>
              {showAll ? "Voir moins" : `Voir plus (${activities.length - 5} autres)`}
              {showAll ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────
export default function UserDashboard({ userId: userIdProp, onBack }) {
  const dispatch = useDispatch();
  const { user: authUser, isAuthenticated, role } = useSelector(s => s.auth);
  const { list: subscriptions } = useSelector(s => s.subscriptions);
  const { list: payments } = useSelector(s => s.payments);
  const userId = userIdProp ?? authUser?.id ?? null;
  console.log("information de l'utilisateur",authUser);

  useEffect(() => {
    if (userId) {
      dispatch(fetchSubscriptions({ user_id: userId, limit: 20, sort: "created_at", order: "DESC" }));
      dispatch(fetchPayments({ user_id: userId, limit: 20, sort: "created_at", order: "DESC" }));
      dispatch(fetchInvoices({ user_id: userId, limit: 20, sort: "created_at", order: "DESC" }));
    }
  }, [userId, dispatch]);

  const user = authUser;
  console.log("information de l'utilisateur",user);
  
  const activeSubscription = subscriptions.find(s => s.status === "active") ?? subscriptions[0] ?? null;
  const loadingUser = !isAuthenticated && !authUser;
  const initials = user ? `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase() || "?" : "?";

  return (
    <div className={styles.dashboard}>
      <div className={styles.container}>
        {onBack && (
          <button onClick={onBack} className={styles.backBtn}>
            <FiArrowLeft size={16} /> Retour
          </button>
        )}

        <motion.div className={styles.profileHeader} variants={fadeInUp} initial="hidden" animate="visible">
          <div className={styles.avatar}>{initials}</div>
          <div className={styles.profileInfo}>
            {loadingUser ? <div className={styles.skeletonName} /> : (
              <h1>{user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email : "Utilisateur"}</h1>
            )}
            <p>{user?.email ?? "—"}</p>
          </div>
          {(user?.role || role) && (
            <span className={`${styles.roleBadge} ${(user?.role || role) === "admin" ? styles.adminBadge : styles.userBadge}`}>
              {user?.role || role}
            </span>
          )}
        </motion.div>

        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <GeneralInfo user={user} subscription={activeSubscription} />
          <SubscriptionsSection userId={userId} />
          <PaymentsSection userId={userId} />
          <InvoicesSection userId={userId} />
          <ActivitiesSection payments={payments} subscriptions={subscriptions} />
        </motion.div>
      </div>
    </div>
  );
}