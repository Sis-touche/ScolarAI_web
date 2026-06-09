// // AdminPaymentManagement.jsx
// import React, { useState, useEffect, useCallback, useMemo } from 'react';
// import { useSelector, useDispatch } from 'react-redux';
// import { 
//   CheckCircle2, Clock, XCircle, AlertCircle, 
//   Layers, SlidersHorizontal, Download, Plus, 
//   MoreHorizontal, ChevronLeft, ChevronRight 
// } from 'lucide-react';

// // Thunks
// import { fetchPayments, fetchPaymentsByStatus } from '../../reducer/paymentSlice';
// import { fetchUsers } from '../../reducer/UserSlices';
// import { fetchInvoices } from '../../reducer/invoiceSlice';
// import { fetchPaymentPlans } from '../../reducer/paymentPlanSlice';

// // Styles
// import styles from './AdminPaymentManagement.module.css';

// export default function AdminPaymentManagement() {
//   const dispatch = useDispatch();

//   // --- Données Redux ---
//   const { list: payments, loading, pagination } = useSelector(state => state.payments || { list: [], loading: false, pagination: { total: 0, page: 1, limit: 20, totalPages: 1 } });
//   const { list: users } = useSelector(state => state.users);
//   const { list: invoices } = useSelector(state => state.invoices);
//   const { list: paymentPlans } = useSelector(state => state.paymentPlans);

//   // --- États locaux ---
//   const [selectedPayments, setSelectedPayments] = useState([]);
//   const [currentFilter, setCurrentFilter] = useState('All');
//   const [currentPage, setCurrentPage] = useState(1);

//   // --- Chargement initial ---
//   useEffect(() => {
//     dispatch(fetchUsers());
//     dispatch(fetchInvoices());
//     dispatch(fetchPaymentPlans());
//   }, [dispatch]);

//   // Chargement des paiements selon filtre & page
//   useEffect(() => {
//     if (currentFilter === 'All') {
//       dispatch(fetchPayments({ page: currentPage, limit: 20 }));
//     } else {
//       // Utiliser le thunk fetchPaymentsByStatus si disponible
//       dispatch(fetchPaymentsByStatus(currentFilter.toLowerCase()));
//       // Note : ce thunk remplace la liste et la pagination, on reset la page à 1
//       setCurrentPage(1);
//     }
//   }, [dispatch, currentPage, currentFilter]);

//   // --- Calculs des KPIs dynamiques à partir des paiements chargés ---
//  const kpis = useMemo(() => {
//   const all = payments || [];
//   const succeeded = all.filter(p => p.status?.toLowerCase() === 'succeeded');
//   const pending = all.filter(p => p.status?.toLowerCase() === 'pending');
//   const failed = all.filter(p => p.status?.toLowerCase() === 'failed');
//   const incomplete = all.filter(p => p.status?.toLowerCase() === 'incomplete');
  
//   const sum = (arr) => arr.reduce((acc, p) => {
//     const amt = typeof p.amount === 'number' ? p.amount : parseFloat(p.amount);
//     return acc + (isNaN(amt) ? 0 : amt);
//   }, 0);
  
//   return {
//     All: { amount: sum(all), count: all.length },
//     Succeeded: { amount: sum(succeeded), count: succeeded.length },
//     Pending: { amount: sum(pending), count: pending.length },
//     Failed: { amount: sum(failed), count: failed.length },
//     Incomplete: { amount: sum(incomplete), count: incomplete.length }
//   };
// }, [payments]);

//   const kpiCards = [
//     { title: 'All payments', key: 'All', icon: <Layers size={18} />, color: '#4f46e5' },
//     { title: 'Succeeded', key: 'Succeeded', icon: <CheckCircle2 size={18} />, color: '#10b981' },
//     { title: 'Pending', key: 'Pending', icon: <Clock size={18} />, color: '#f59e0b' },
//     { title: 'Failed', key: 'Failed', icon: <XCircle size={18} />, color: '#ef4444' },
//     { title: 'Incomplete', key: 'Incomplete', icon: <AlertCircle size={18} />, color: '#64748b' }
//   ];

//   // --- Gestion sélection ---
//   const handleSelectAll = useCallback((e) => {
//     if (e.target.checked) {
//       setSelectedPayments(payments.map(p => p.id));
//     } else {
//       setSelectedPayments([]);
//     }
//   }, [payments]);

//   const handleSelectOne = useCallback((id) => {
//     setSelectedPayments(prev =>
//       prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
//     );
//   }, []);

//   const totalSelectedAmount = useMemo(() => {
//     return payments
//       .filter(p => selectedPayments.includes(p.id))
//       .reduce((sum, p) => sum + (p.amount || 0), 0);
//   }, [payments, selectedPayments]);

//   // --- Rendu des statuts ---
//   const getStatusBadgeClass = (status) => {
//     switch (status?.toLowerCase()) {
//       case 'succeeded': return styles.statusSucceeded;
//       case 'pending': return styles.statusPending;
//       case 'failed': return styles.statusFailed;
//       case 'incomplete': return styles.statusIncomplete;
//       default: return styles.statusDefault;
//     }
//   };

//   // --- Mapping utilisateur pour affichage ---
//   const getUserName = (userId) => {
//     const user = users.find(u => u.id === userId);
//     return user ? user.name : 'Client inconnu';
//   };

//   const getUserAvatar = (userId) => {
//     const user = users.find(u => u.id === userId);
//     return user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80';
//   };

//   return (
//     <div className={styles.container}>
//       {/* Header */}
//       <div className={styles.header}>
//         <h1 className={styles.title}>Payments</h1>
//         <div className={styles.headerActions}>
//           <button className={styles.iconButton}>
//             <SlidersHorizontal size={16} /> Filter
//           </button>
//           <button className={styles.iconButton}>
//             <Download size={16} /> Export
//           </button>
//           <button className={styles.primaryButton}>
//             <Plus size={16} /> New payment
//           </button>
//         </div>
//       </div>

//       {/* Sélection contextuelle */}
//       {selectedPayments.length > 0 && (
//         <div className={styles.selectionBar}>
//           <span>
//             <strong>{selectedPayments.length}</strong> selected payments |
//             <strong> ${Number(totalSelectedAmount).toFixed(2)}</strong> total amount
//           </span>
//           <button className={styles.actionButton}>Action ▼</button>
//         </div>
//       )}

//       {/* Grille KPI + Tableau */}
//       <div className={styles.grid}>
//         {/* Colonne gauche : KPIs */}
//         <div className={styles.kpiColumn}>
//           {kpiCards.map(card => (
//             <div
//               key={card.key}
//               onClick={() => setCurrentFilter(card.key)}
//               className={`${styles.kpiCard} ${currentFilter === card.key ? styles.kpiCardActive : ''}`}
//               style={{ borderColor: currentFilter === card.key ? card.color : 'transparent' }}
//             >
//               <div className={styles.kpiHeader}>
//                 <span className={styles.kpiTitle}>{card.title}</span>
//                 <div className={styles.kpiIcon} style={{ backgroundColor: card.color }}>{card.icon}</div>
//               </div>
//               <div className={styles.kpiAmount}>
//                 ${(kpis[card.key]?.amount ?? 0).toFixed(2)}
//               </div>
//               <div className={styles.kpiBadge}>
//                 {kpis[card.key]?.count ?? 0} records
//               </div>
//             </div>
//           ))}
//         </div>

//         {/* Colonne droite : Tableau */}
//         <div className={styles.tableColumn}>
//           {loading ? (
//             <div className={styles.loading}>Chargement des transactions...</div>
//           ) : (
//             <div className={styles.tableWrapper}>
//               <table className={styles.table}>
//                 <thead>
//                   <tr>
//                     <th className={styles.checkboxCell}>
//                       <input
//                         type="checkbox"
//                         onChange={handleSelectAll}
//                         checked={payments.length > 0 && selectedPayments.length === payments.length}
//                       />
//                     </th>
//                     <th>Code</th>
//                     <th>Status</th>
//                     <th>Description</th>
//                     <th>Time</th>
//                     <th>Date</th>
//                     <th>Customer</th>
//                     <th className={styles.amountHeader}>Amount</th>
//                     <th></th>
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {payments.map(payment => {
//                     const isSelected = selectedPayments.includes(payment.id);
//                     return (
//                       <tr key={payment.id} className={isSelected ? styles.rowSelected : ''}>
//                         <td className={styles.checkboxCell}>
//                           <input
//                             type="checkbox"
//                             checked={isSelected}
//                             onChange={() => handleSelectOne(payment.id)}
//                           />
//                         </td>
//                         <td className={styles.codeCell}>{payment.code || `#${payment.id}`}</td>
//                         <td>
//                           <span className={`${styles.statusBadge} ${getStatusBadgeClass(payment.status)}`}>
//                             {payment.status || 'Unknown'}
//                           </span>
//                         </td>
//                         <td>{payment.description || '—'}</td>
//                         <td>{payment.time || '—'}</td>
//                         <td>{payment.date || new Date(payment.created_at).toLocaleDateString()}</td>
//                         <td>
//                           <div className={styles.customerCell}>
//                             <img
//                               src={getUserAvatar(payment.user_id)}
//                               alt="avatar"
//                               className={styles.avatar}
//                             />
//                             <span>{getUserName(payment.user_id)}</span>
//                           </div>
//                         </td>
//                         <td className={styles.amountCell}> ${Number(payment.amount).toFixed(2)}</td>
//                         <td>
//                           <button className={styles.moreButton}>
//                             <MoreHorizontal size={18} />
//                           </button>
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//               </table>
//             </div>
//           )}

//           {/* Pagination */}
//           {!loading && pagination.totalPages > 0 && (
//             <div className={styles.pagination}>
//               <div>
//                 Showing {(currentPage - 1) * pagination.limit + 1} to{' '}
//                 {Math.min(currentPage * pagination.limit, pagination.total)} of {pagination.total} results
//               </div>
//               <div className={styles.paginationControls}>
//                 <button
//                   onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
//                   disabled={currentPage === 1}
//                   className={styles.paginationButton}
//                 >
//                   <ChevronLeft size={16} />
//                 </button>
//                 {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map(page => (
//                   <button
//                     key={page}
//                     onClick={() => setCurrentPage(page)}
//                     className={`${styles.pageNumber} ${currentPage === page ? styles.pageActive : ''}`}
//                   >
//                     {page}
//                   </button>
//                 ))}
//                 <button
//                   onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
//                   disabled={currentPage === pagination.totalPages}
//                   className={styles.paginationButton}
//                 >
//                   <ChevronRight size={16} />
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }



// AdminPaymentManagement.jsx
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  CheckCircle2, Clock, XCircle, AlertCircle,
  Layers, SlidersHorizontal, Download, Plus,
  MoreHorizontal, ChevronLeft, ChevronRight, Search
} from 'lucide-react';

import { fetchPayments, updatePayment, deletePayment } from '../../reducer/paymentSlice';
import { fetchUsers }        from '../../reducer/UserSlices';
import { fetchInvoices }     from '../../reducer/invoiceSlice';
import { fetchPaymentPlans } from '../../reducer/paymentPlanSlice';

// ─── Palette (cohérente avec UserManagement) ────────────────────────────────
const PURPLE = {
  50: "#EEEDFE", 100: "#CECBF6", 200: "#AFA9EC",
  400: "#7F77DD", 600: "#534AB7", 800: "#3C3489", 900: "#26215C",
};
const CORAL = { 100: "#F5C4B3", 400: "#D85A30", 600: "#993C1D" };

// ─── Config statuts ──────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  succeeded: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0", label: "Succès"      },
  confirmed: { bg: "#D1FAE5", text: "#065F46", border: "#A7F3D0", label: "Confirmé"    },
  pending:   { bg: "#FEF3C7", text: "#92400E", border: "#FDE68A", label: "En attente"  },
  failed:    { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA", label: "Échoué"      },
  incomplete:{ bg: "#E2E8F0", text: "#334155", border: "#CBD5E1", label: "Incomplet"   },
  refunded:  { bg: "#DBEAFE", text: "#1E3A8A", border: "#BFDBFE", label: "Remboursé"   },
  cancelled: { bg: "#FEE2E2", text: "#991B1B", border: "#FECACA", label: "Annulé"      },
};

const getStatusCfg = (s) => STATUS_CONFIG[s?.toLowerCase()] ?? {
  bg: "#F1F5F9", text: "#475569", border: "#E2E8F0", label: s ?? "Inconnu",
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtAmount = (n) =>
  Number(n || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtTime = (d) =>
  d ? new Date(d).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";

const getInitials = (name = "") => {
  const p = name.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "?";
  if (p.length === 1) return p[0][0].toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
};

const avatarPalette = (name = "") => {
  const list = [
    { bg: "#EEEDFE", text: "#3C3489" }, { bg: "#E1F5EE", text: "#085041" },
    { bg: "#FAECE7", text: "#712B13" }, { bg: "#E6F1FB", text: "#0C447C" },
    { bg: "#FBEAF0", text: "#72243E" }, { bg: "#EAF3DE", text: "#27500A" },
  ];
  return list[(name.charCodeAt(0) || 0) % list.length];
};

// ─── Composants UI ───────────────────────────────────────────────────────────
const Avatar = ({ name = "", size = 28 }) => {
  const { bg, text } = avatarPalette(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: text, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: size * 0.36,
    }}>
      {getInitials(name)}
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const cfg = getStatusCfg(status);
  return (
    <span style={{
      display: "inline-block", padding: "3px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 500,
      background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
      whiteSpace: "nowrap",
    }}>
      {cfg.label}
    </span>
  );
};

const Spinner = () => (
  <div style={{
    width: 28, height: 28, borderRadius: "50%",
    border: `3px solid ${PURPLE[100]}`,
    borderTop: `3px solid ${PURPLE[600]}`,
    animation: "spin .8s linear infinite",
    margin: "0 auto",
  }} />
);

// Modal générique
const Modal = ({ title, onClose, children }) => (
  <div style={{
    position: "fixed", inset: 0, zIndex: 1000,
    background: "rgba(38,33,92,0.25)",
    display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
  }} onClick={onClose}>
    <div onClick={(e) => e.stopPropagation()} style={{
      background: "#fff", borderRadius: 16, width: "100%", maxWidth: 460,
      boxShadow: "0 8px 40px rgba(83,74,183,0.18)", overflow: "hidden",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "18px 24px 14px", borderBottom: "1px solid #EEEDFE",
      }}>
        <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: PURPLE[900] }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#888780" }}>✕</button>
      </div>
      <div style={{ padding: "20px 24px 24px" }}>{children}</div>
    </div>
  </div>
);

// Détail paiement (modal)
const PaymentDetailModal = ({ payment, users, invoices, paymentPlans, onClose, onUpdate }) => {
  const user        = users.find((u) => u.id === payment.user_id);
  const invoice     = invoices.find((i) => i.id === payment.invoice_id);
  const paymentPlan = paymentPlans.find((p) => p.id === payment.payment_plan_id);

  const [editNotes, setEditNotes] = useState(payment.notes ?? "");
  const [saving, setSaving]       = useState(false);

  const rows = [
    { label: "Référence",      value: payment.transaction_ref ?? `#${payment.id}` },
    { label: "Méthode",        value: payment.method ?? "—"               },
    { label: "Montant",        value: fmtAmount(payment.amount)            },
    { label: "Statut",         value: <StatusBadge status={payment.status} /> },
    { label: "Date",           value: fmtDate(payment.created_at)          },
    { label: "Heure",          value: fmtTime(payment.created_at)          },
    { label: "Client",         value: user?.name ?? `User #${payment.user_id}` },
    { label: "Facture",        value: invoice?.invoice_number ?? (payment.invoice_id ? `#${payment.invoice_id}` : "—") },
    { label: "Tranche",        value: paymentPlan ? `Tranche ${paymentPlan.installment_number ?? payment.payment_plan_id}` : "—" },
  ];

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(payment.id, { notes: editNotes });
    setSaving(false);
    onClose();
  };

  return (
    <Modal title="Détail du paiement" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {rows.map(({ label, value }) => (
          <div key={label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "9px 0", borderBottom: "1px solid #F8F7FD",
          }}>
            <span style={{ fontSize: 13, color: "#888780", fontWeight: 500 }}>{label}</span>
            <span style={{ fontSize: 13, color: PURPLE[900], fontWeight: 500, textAlign: "right" }}>{value}</span>
          </div>
        ))}
        <div style={{ marginTop: 14 }}>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: PURPLE[600], marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>
            Notes
          </label>
          <textarea
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            rows={3}
            style={{
              width: "100%", padding: "8px 12px", borderRadius: 8, fontSize: 14,
              border: "1.5px solid #CECBF6", outline: "none", resize: "vertical",
              fontFamily: "'DM Sans', sans-serif", color: "#26215C", boxSizing: "border-box",
            }}
          />
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 14 }}>
          <button onClick={onClose} style={{
            padding: "8px 18px", borderRadius: 8, border: "1.5px solid #CECBF6",
            background: "none", color: PURPLE[600], fontWeight: 600, cursor: "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>Fermer</button>
          <button onClick={handleSave} disabled={saving} style={{
            padding: "8px 18px", borderRadius: 8, border: "none",
            background: saving ? "#AFA9EC" : PURPLE[600], color: "#fff",
            fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            {saving ? "Enregistrement…" : "Sauvegarder"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// Menu contextuel (3 points)
const ContextMenu = ({ payment, onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  const canDelete = payment.status !== "confirmed" && payment.status !== "succeeded";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        style={{ background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4, borderRadius: 6 }}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          style={{
            position: "absolute", right: 0, top: "calc(100% + 4px)", zIndex: 200,
            background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            border: "1px solid #EEEDFE", minWidth: 150, overflow: "hidden",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {[
            { label: "Voir les détails", icon: "👁", action: () => { onView(); setOpen(false); } },
            ...(canDelete ? [{ label: "Supprimer", icon: "🗑", action: () => { onDelete(); setOpen(false); }, danger: true }] : []),
          ].map(({ label, icon, action, danger }) => (
            <button key={label} onClick={action} style={{
              width: "100%", padding: "9px 14px", background: "none", border: "none",
              textAlign: "left", cursor: "pointer", fontSize: 13,
              color: danger ? CORAL[600] : PURPLE[900],
              display: "flex", alignItems: "center", gap: 8,
              fontFamily: "'DM Sans', sans-serif",
            }}
              onMouseEnter={(e) => { e.currentTarget.style.background = danger ? "#FAECE7" : PURPLE[50]; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
            >
              {icon} {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── KPI CONFIG ──────────────────────────────────────────────────────────────
const KPI_CONFIG = [
  { key: "all",        label: "Tous",         icon: Layers,       color: PURPLE[600] },
  { key: "succeeded",  label: "Succès",        icon: CheckCircle2, color: "#10B981"  },
  { key: "pending",    label: "En attente",    icon: Clock,        color: "#F59E0B"  },
  { key: "failed",     label: "Échoués",       icon: XCircle,      color: "#EF4444"  },
  { key: "incomplete", label: "Incomplets",    icon: AlertCircle,  color: "#64748B"  },
];

// ─── Composant principal ─────────────────────────────────────────────────────
export default function AdminPaymentManagement() {
  const dispatch = useDispatch();

  // Redux state — clés alignées avec les slices confirmés
  const payments     = useSelector((s) => s.payments?.list         ?? []);
  const loading      = useSelector((s) => s.payments?.loading      ?? false);
  const pagination   = useSelector((s) => s.payments?.pagination   ?? { total: 0, page: 1, limit: 20, totalPages: 1 });
  const updateStatus = useSelector((s) => s.payments?.updateStatus ?? "idle");
  const deleteStatus = useSelector((s) => s.payments?.deleteStatus ?? "idle");

  const users        = useSelector((s) => s.users?.list        ?? []);
  const invoices     = useSelector((s) => s.invoices?.list     ?? []);
  const paymentPlans = useSelector((s) => s.paymentPlans?.list ?? []);

  // États locaux
  const [selectedIds,    setSelectedIds]    = useState([]);
  const [activeFilter,   setActiveFilter]   = useState("all");
  const [currentPage,    setCurrentPage]    = useState(1);
  const [search,         setSearch]         = useState("");
  const [detailPayment,  setDetailPayment]  = useState(null);
  const [confirmDelete,  setConfirmDelete]  = useState(null);

  // Chargement initial des données liées
  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchInvoices({ limit: 100 }));
    dispatch(fetchPaymentPlans({ limit: 100 }));
  }, [dispatch]);

  // Chargement paiements selon filtre + page
  useEffect(() => {
    if (activeFilter === "all") {
      dispatch(fetchPayments({ page: currentPage, limit: 20 }));
    } else {
      // fetchPaymentsByStatus recharge la liste côté slice
      dispatch(fetchPayments({ page: 1, limit: 100, status: activeFilter }));
      setCurrentPage(1);
    }
  }, [dispatch, currentPage, activeFilter]);

  // Reset page si filtre change
  const handleFilterChange = (key) => {
    setActiveFilter(key);
    setCurrentPage(1);
    setSelectedIds([]);
    setSearch("");
  };

  // Recherche côté client sur la liste chargée
  const filteredPayments = useMemo(() => {
    if (!search.trim()) return payments;
    const q = search.toLowerCase();
    return payments.filter((p) => {
      const user = users.find((u) => u.id === p.user_id);
      return (
        p.transaction_ref?.toLowerCase().includes(q) ||
        p.method?.toLowerCase().includes(q) ||
        user?.name?.toLowerCase().includes(q) ||
        user?.email?.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      );
    });
  }, [payments, search, users]);

  // KPIs calculés sur la liste complète chargée
  const kpis = useMemo(() => {
    const sum = (arr) => arr.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
    return KPI_CONFIG.reduce((acc, { key }) => {
      const filtered = key === "all"
        ? payments
        : payments.filter((p) => p.status?.toLowerCase() === key);
      acc[key] = { amount: sum(filtered), count: filtered.length };
      return acc;
    }, {});
  }, [payments]);

  // Sélection
  const toggleAll = useCallback(() =>
    setSelectedIds((prev) =>
      prev.length === filteredPayments.length ? [] : filteredPayments.map((p) => p.id)
    ), [filteredPayments]);

  const toggleOne = useCallback((id) =>
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    ), []);

  const totalSelectedAmount = useMemo(() =>
    payments.filter((p) => selectedIds.includes(p.id)).reduce((s, p) => s + (Number(p.amount) || 0), 0),
    [payments, selectedIds]
  );

  // Helpers
  const getUserName = (userId) => users.find((u) => u.id === userId)?.name ?? `User #${userId}`;

  const handleUpdate = (id, data) => dispatch(updatePayment({ id, data }));
  const handleDelete = (id)       => { dispatch(deletePayment(id)); setConfirmDelete(null); };

  // Pagination affichage
  const showPagination = !loading && (activeFilter === "all" ? pagination.totalPages > 1 : false);

  return (
    <div style={{
      minHeight: "100vh", background: "#F8F7FD", padding: "32px 40px",
      fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#0F172A",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Header ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 600, color: PURPLE[400], textTransform: "uppercase", letterSpacing: ".08em" }}>
            Administration
          </p>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: PURPLE[900] }}>Gestion des paiements</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 9, fontSize: 14, fontWeight: 500,
            cursor: "pointer", border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <SlidersHorizontal size={15} /> Filtrer
          </button>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 16px", borderRadius: 9, fontSize: 14, fontWeight: 500,
            cursor: "pointer", border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569",
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <Download size={15} /> Exporter
          </button>
          <button style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 18px", borderRadius: 9, fontSize: 14, fontWeight: 600,
            cursor: "pointer", border: "none", background: PURPLE[600], color: "#fff",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 4px 14px rgba(83,74,183,0.3)",
          }}>
            <Plus size={15} /> Nouveau paiement
          </button>
        </div>
      </div>

      {/* ── Barre sélection ── */}
      {selectedIds.length > 0 && (
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginBottom: 14, padding: "10px 16px", background: PURPLE[50],
          borderRadius: 10, border: `1px solid ${PURPLE[100]}`, fontSize: 14,
        }}>
          <span style={{ color: PURPLE[800] }}>
            <strong>{selectedIds.length}</strong> paiement{selectedIds.length > 1 ? "s" : ""} sélectionné{selectedIds.length > 1 ? "s" : ""} ·{" "}
            <strong>{fmtAmount(totalSelectedAmount)}</strong> total
          </span>
          <button
            onClick={() => setSelectedIds([])}
            style={{
              padding: "5px 14px", borderRadius: 8, border: `1px solid ${PURPLE[100]}`,
              background: "#fff", color: PURPLE[600], fontWeight: 600, cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif", fontSize: 13,
            }}
          >
            Désélectionner tout
          </button>
        </div>
      )}

      {/* ── Grid KPI + Tableau ── */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 20 }}>

        {/* ── KPI column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {KPI_CONFIG.map(({ key, label, icon: Icon, color }) => {
            const isActive = activeFilter === key;
            return (
              <div
                key={key}
                onClick={() => handleFilterChange(key)}
                style={{
                  background: isActive ? "#EEEDFE" : "#fff",
                  borderRadius: 14, padding: "16px 18px",
                  border: `2px solid ${isActive ? PURPLE[600] : "transparent"}`,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  cursor: "pointer", transition: "all .18s",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = "#EEEDFE"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = "transparent"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{label}</span>
                  <div style={{
                    width: 32, height: 32, borderRadius: 8, background: color,
                    display: "flex", alignItems: "center", justifyContent: "center", color: "#fff",
                  }}>
                    <Icon size={16} />
                  </div>
                </div>
                <p style={{ margin: "0 0 6px", fontSize: 20, fontWeight: 700, color: PURPLE[900] }}>
                  {fmtAmount(kpis[key]?.amount ?? 0)}
                </p>
                <span style={{
                  display: "inline-block", background: "#F1F5F9", padding: "2px 10px",
                  borderRadius: 20, fontSize: 12, fontWeight: 500, color: "#475569",
                  border: "1px solid #E2E8F0",
                }}>
                  {kpis[key]?.count ?? 0} enregistrement{(kpis[key]?.count ?? 0) > 1 ? "s" : ""}
                </span>
              </div>
            );
          })}
        </div>

        {/* ── Table column ── */}
        <div style={{
          background: "#fff", borderRadius: 14, border: "1px solid #E2E8F0",
          overflow: "hidden", display: "flex", flexDirection: "column",
        }}>
          {/* Barre de recherche interne */}
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #F1F5F9" }}>
            <div style={{ position: "relative", maxWidth: 340 }}>
              <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#B4B2A9" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par réf, méthode, client…"
                style={{
                  width: "100%", padding: "8px 12px 8px 30px", borderRadius: 8,
                  border: "1.5px solid #EEEDFE", fontSize: 13, color: PURPLE[900],
                  fontFamily: "'DM Sans', sans-serif", outline: "none",
                  background: "#FAFAFE", boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "56px 0" }}>
              <Spinner />
              <p style={{ marginTop: 12, fontSize: 14, color: "#94A3B8" }}>Chargement des paiements…</p>
            </div>
          ) : filteredPayments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "56px 0", color: "#B4B2A9" }}>
              <p style={{ fontSize: 32, margin: "0 0 8px" }}>💳</p>
              <p style={{ fontSize: 14, margin: 0 }}>Aucun paiement trouvé</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC" }}>
                    <th style={{ ...thSt, width: 40, paddingLeft: 18 }}>
                      <input
                        type="checkbox"
                        checked={filteredPayments.length > 0 && selectedIds.length === filteredPayments.length}
                        onChange={toggleAll}
                        style={{ accentColor: PURPLE[600], cursor: "pointer" }}
                      />
                    </th>
                    <th style={thSt}>Référence</th>
                    <th style={thSt}>Statut</th>
                    <th style={thSt}>Méthode</th>
                    <th style={thSt}>Date</th>
                    <th style={thSt}>Heure</th>
                    <th style={thSt}>Client</th>
                    <th style={thSt}>Facture</th>
                    <th style={{ ...thSt, textAlign: "right" }}>Montant</th>
                    <th style={{ ...thSt, width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const isSelected = selectedIds.includes(payment.id);
                    const user       = users.find((u) => u.id === payment.user_id);
                    const invoice    = invoices.find((i) => i.id === payment.invoice_id);

                    return (
                      <tr
                        key={payment.id}
                        style={{
                          background: isSelected ? PURPLE[50] : "#fff",
                          transition: "background .12s", cursor: "default",
                        }}
                        onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#FAFAFE"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? PURPLE[50] : "#fff"; }}
                      >
                        <td style={{ ...tdSt, paddingLeft: 18 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(payment.id)}
                            style={{ accentColor: PURPLE[600], cursor: "pointer" }}
                          />
                        </td>
                        <td style={{ ...tdSt, fontWeight: 600, color: PURPLE[600], cursor: "pointer" }}
                          onClick={() => setDetailPayment(payment)}>
                          {payment.transaction_ref ?? `#${payment.id}`}
                        </td>
                        <td style={tdSt}><StatusBadge status={payment.status} /></td>
                        <td style={{ ...tdSt, color: "#475569" }}>{payment.method ?? "—"}</td>
                        <td style={{ ...tdSt, color: "#64748B", whiteSpace: "nowrap" }}>{fmtDate(payment.created_at)}</td>
                        <td style={{ ...tdSt, color: "#94A3B8" }}>{fmtTime(payment.created_at)}</td>
                        <td style={tdSt}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Avatar name={user?.name ?? "?"} size={26} />
                            <span style={{ fontWeight: 500, color: PURPLE[900] }}>
                              {user?.name ?? `User #${payment.user_id}`}
                            </span>
                          </div>
                        </td>
                        <td style={{ ...tdSt, color: "#64748B", fontSize: 12 }}>
                          {invoice?.invoice_number ?? (payment.invoice_id ? `#${payment.invoice_id}` : "—")}
                        </td>
                        <td style={{ ...tdSt, textAlign: "right", fontWeight: 700, color: PURPLE[900] }}>
                          {fmtAmount(payment.amount)}
                        </td>
                        <td style={{ ...tdSt, textAlign: "center" }}>
                          <ContextMenu
                            payment={payment}
                            onView={() => setDetailPayment(payment)}
                            onDelete={() => setConfirmDelete(payment)}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* ── Pagination ── */}
          {showPagination && (
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "14px 18px", borderTop: "1px solid #E2E8F0", fontSize: 13, color: "#64748B",
            }}>
              <span>
                {(currentPage - 1) * pagination.limit + 1}–{Math.min(currentPage * pagination.limit, pagination.total)} sur {pagination.total} paiements
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={pageNavBtnSt(currentPage === 1)}
                >
                  <ChevronLeft size={15} />
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, border: "none",
                      background: p === currentPage ? PURPLE[600] : "transparent",
                      color: p === currentPage ? "#fff" : "#475569",
                      fontWeight: p === currentPage ? 700 : 400,
                      cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                    }}
                  >{p}</button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  style={pageNavBtnSt(currentPage === pagination.totalPages)}
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Modal détail ── */}
      {detailPayment && (
        <PaymentDetailModal
          payment={detailPayment}
          users={users}
          invoices={invoices}
          paymentPlans={paymentPlans}
          onClose={() => setDetailPayment(null)}
          onUpdate={handleUpdate}
        />
      )}

      {/* ── Modal confirmation suppression ── */}
      {confirmDelete && (
        <Modal title="Confirmer la suppression" onClose={() => setConfirmDelete(null)}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, textAlign: "center" }}>
            <div style={{ width: 52, height: 52, borderRadius: "50%", background: "#FAECE7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22 }}>🗑</div>
            <div>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: PURPLE[900] }}>
                Supprimer ce paiement ?
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888780" }}>
                Réf : <strong>{confirmDelete.transaction_ref ?? `#${confirmDelete.id}`}</strong> · {fmtAmount(confirmDelete.amount)}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#B4B2A9" }}>
                Cette action est irréversible.
              </p>
            </div>
            <div style={{ display: "flex", gap: 10, width: "100%" }}>
              <button onClick={() => setConfirmDelete(null)} style={{
                flex: 1, padding: "10px", borderRadius: 8, border: "1.5px solid #CECBF6",
                background: "none", color: PURPLE[600], fontWeight: 600, cursor: "pointer",
                fontFamily: "'DM Sans', sans-serif",
              }}>Annuler</button>
              <button
                onClick={() => handleDelete(confirmDelete.id)}
                disabled={deleteStatus === "loading"}
                style={{
                  flex: 1, padding: "10px", borderRadius: 8, border: "none",
                  background: deleteStatus === "loading" ? "#F0997B" : CORAL[400],
                  color: "#fff", fontWeight: 600, cursor: deleteStatus === "loading" ? "not-allowed" : "pointer",
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                {deleteStatus === "loading" ? "Suppression…" : "Supprimer"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── Styles inline partagés ──────────────────────────────────────────────────
const thSt = {
  padding: "11px 14px", textAlign: "left", fontSize: 12,
  color: "#64748B", fontWeight: 600, borderBottom: "1px solid #E2E8F0",
  whiteSpace: "nowrap", background: "#F8FAFC",
};
const tdSt = {
  padding: "12px 14px", fontSize: 13, color: "#0F172A",
  borderBottom: "1px solid #F1F5F9", verticalAlign: "middle",
};
const pageNavBtnSt = (disabled) => ({
  width: 32, height: 32, borderRadius: 8, border: "1px solid #E2E8F0",
  background: "#fff", cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.4 : 1, display: "flex", alignItems: "center", justifyContent: "center",
  color: "#475569",
});