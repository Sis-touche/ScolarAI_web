// features/admin/UserManagement.jsx
import { useState, useEffect, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import { motion, AnimatePresence } from "framer-motion";
import {
  FaUsers, FaUserCheck, FaUserTimes, FaCreditCard,
  FaSearch, FaTrash, FaEdit, FaPlus, FaEye, FaSpinner,
  FaFileInvoice, FaMoneyBillWave, FaTag
} from "react-icons/fa";
import {
  fetchUsers, addUser, updateUser, deleteUser,
  setSelectedUser, resetEditState, resetStatuses as resetUserStatuses,
} from "../../reducer/UserSlices";
import { MdSubscriptions } from "react-icons/md";
import {
  fetchSubscriptions, consumeScan,
} from "../../reducer/subscriptionSlice";

import { fetchInvoices }  from "../../reducer/invoiceSlice";
import { fetchPayments }  from "../../reducer/paymentSlice";
import { fetchPlans }     from "../../reducer/planSlice";

// ─── Palette ────────────────────────────────────────────────────────────────
const PURPLE = {
  50: "#EEEDFE", 100: "#CECBF6", 200: "#AFA9EC",
  400: "#7F77DD", 600: "#534AB7", 800: "#3C3489", 900: "#26215C",
};
const CORAL  = { 100: "#F5C4B3", 400: "#D85A30", 600: "#993C1D" };
const GREEN  = { bg: "#E1F5EE", text: "#085041", border: "#9FE1CB" };
const GRAY   = { bg: "#F1EFE8", text: "#5F5E5A", border: "#D3D1C7" };

// ─── Helpers ────────────────────────────────────────────────────────────────
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

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtAmount = (n) =>
  n != null ? `${Number(n).toLocaleString("fr-FR")} €` : "—";

// ─── Composants de base ──────────────────────────────────────────────────────
const Avatar = ({ name = "", size = 36 }) => {
  const { bg, text } = avatarPalette(name);
  return (
    <motion.div whileHover={{ scale: 1.05 }} style={{
      width: size, height: size, borderRadius: "50%",
      background: bg, color: text, flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 600, fontSize: size * 0.35,
    }}>
      {getInitials(name)}
    </motion.div>
  );
};

const Badge = ({ active, trueLabel = "Actif", falseLabel = "Inactif" }) => (
  <span style={{
    display: "inline-flex", alignItems: "center", gap: 4,
    padding: "2px 10px", borderRadius: 20, fontSize: 12, fontWeight: 500,
    background: active ? GREEN.bg  : GRAY.bg,
    color:      active ? GREEN.text : GRAY.text,
    border:    `1px solid ${active ? GREEN.border : GRAY.border}`,
  }}>
    {active ? trueLabel : falseLabel}
  </span>
);

const StatusBadge = ({ status }) => {
  const map = {
    active:    { bg: "#E1F5EE", text: "#085041", border: "#9FE1CB",  label: "Actif"      },
    pending:   { bg: "#FAEEDA", text: "#633806", border: "#FAC775",  label: "En attente" },
    paid:      { bg: "#E1F5EE", text: "#085041", border: "#9FE1CB",  label: "Payé"       },
    confirmed: { bg: "#E1F5EE", text: "#085041", border: "#9FE1CB",  label: "Confirmé"   },
    cancelled: { bg: "#FAECE7", text: "#712B13", border: "#F5C4B3",  label: "Annulé"     },
    expired:   { bg: "#F1EFE8", text: "#5F5E5A", border: "#D3D1C7",  label: "Expiré"     },
    failed:    { bg: "#FAECE7", text: "#712B13", border: "#F5C4B3",  label: "Échoué"     },
    refunded:  { bg: "#E6F1FB", text: "#0C447C", border: "#B5D4F4",  label: "Remboursé"  },
  };
  const s = map[status] ?? { bg: "#F1EFE8", text: "#5F5E5A", border: "#D3D1C7", label: status ?? "—" };
  return (
    <span style={{
      display: "inline-block", padding: "2px 10px", borderRadius: 20,
      fontSize: 12, fontWeight: 500,
      background: s.bg, color: s.text, border: `1px solid ${s.border}`,
    }}>{s.label}</span>
  );
};

const Spinner = ({ size = 20, color = PURPLE[600] }) => (
  <FaSpinner style={{ animation: "spin .8s linear infinite", fontSize: size, color }} />
);

const EmptyState = ({ icon, message }) => (
  <div style={{ textAlign: "center", padding: "32px 0", color: "#B4B2A9" }}>
    <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
    <p style={{ margin: 0, fontSize: 14 }}>{message}</p>
  </div>
);

// ─── Modal ───────────────────────────────────────────────────────────────────
const Modal = ({ title, onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(38,33,92,0.25)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
    }}
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
      style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480,
        boxShadow: "0 8px 40px rgba(83,74,183,0.18)", overflow: "hidden",
      }}
    >
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 24px 16px", borderBottom: "1px solid #EEEDFE",
      }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: PURPLE[900] }}>{title}</h2>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#888780" }}>✕</button>
      </div>
      <div style={{ padding: "20px 24px 24px" }}>{children}</div>
    </motion.div>
  </motion.div>
);

// ─── StatCard ────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, bg, color }) => (
  <motion.div
    initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.3 }}
    style={{
      background: "#fff", borderRadius: 14, border: "1px solid #EEEDFE",
      padding: "18px 22px", display: "flex", alignItems: "center", gap: 16,
    }}
  >
    <div style={{
      width: 44, height: 44, borderRadius: 10, background: bg,
      display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
    }}>{icon}</div>
    <div>
      <p style={{ margin: 0, fontSize: 12, color: "#888780", fontWeight: 500 }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontSize: 22, fontWeight: 700, color }}>{value}</p>
    </div>
  </motion.div>
);

// ─── UserDrawer ───────────────────────────────────────────────────────────────
const UserDrawer = ({ user, open, onClose }) => {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState("subscriptions");

  // Sélecteurs alignés avec les noms de slice confirmés
  const allSubscriptions = useSelector((s) => s.subscriptions?.list ?? []);
  const allInvoices      = useSelector((s) => s.invoices?.list      ?? []);
  const allPayments      = useSelector((s) => s.payments?.list      ?? []);
  const plans            = useSelector((s) => s.plans?.list         ?? []);

  const subLoading = useSelector((s) => s.subscriptions?.loading ?? false);
  const invLoading = useSelector((s) => s.invoices?.loading      ?? false);
  const payLoading = useSelector((s) => s.payments?.loading      ?? false);
  const scanStatus = useSelector((s) => s.subscriptions?.scanStatus ?? "idle");

  const subscriptions = allSubscriptions.filter((s) => s.user_id === user?.id);
  const invoices      = allInvoices.filter((i) => i.user_id      === user?.id);
  const payments      = allPayments.filter((p) => p.user_id      === user?.id);

  useEffect(() => {
    if (!user || !open) return;
    dispatch(fetchSubscriptions({ user_id: user.id }));
    dispatch(fetchInvoices({ user_id: user.id, limit: 10 }));
    dispatch(fetchPayments({ user_id: user.id, limit: 10 }));
  }, [user?.id, open, dispatch]);

  const getPlanName = (planId) =>
    plans.find((p) => p.id === planId)?.name ?? "Plan inconnu";

  const getPlanPrice = (planId) => {
    const p = plans.find((p) => p.id === planId);
    return p?.price != null ? fmtAmount(p.price) : null;
  };

  const TABS = [
    { key: "subscriptions", label: "Abonnements", icon: <FaTag />        },
    { key: "invoices",      label: "Factures",    icon: <FaFileInvoice /> },
    { key: "payments",      label: "Paiements",   icon: <FaMoneyBillWave /> },
  ];

  // Résumé rapide
  const summary = {
    activeSubs:  subscriptions.filter((s) => s.status === "active").length,
    totalPaid:   payments.filter((p) => p.status === "confirmed").reduce((acc, p) => acc + (Number(p.amount) || 0), 0),
    unpaidInv:   invoices.filter((i) => i.status !== "paid").length,
  };

  return (
    <AnimatePresence>
      {open && user && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: "fixed", inset: 0, zIndex: 1040, background: "rgba(38,33,92,0.15)" }}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28 }}
            style={{
              position: "fixed", top: 0, right: 0, bottom: 0, width: 500,
              background: "#fff", boxShadow: "-4px 0 24px rgba(0,0,0,0.07)",
              zIndex: 1050, display: "flex", flexDirection: "column",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {/* Header */}
            <div style={{ padding: "24px 24px 16px", borderBottom: "1px solid #EEEDFE" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <Avatar name={user.name} size={52} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: PURPLE[900] }}>{user.name}</h3>
                    <p style={{ margin: "2px 0 4px", fontSize: 13, color: "#888780" }}>{user.email}</p>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Badge active={user.isActive} />
                      {user.role && (
                        <span style={{
                          fontSize: 11, background: PURPLE[50], color: PURPLE[600],
                          padding: "2px 8px", borderRadius: 12, fontWeight: 600,
                        }}>
                          {user.role.toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#888780" }}>✕</button>
              </div>

              {/* Résumé chiffres */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
                {[
                  { label: "Abonnements actifs", value: summary.activeSubs,            bg: "#E1F5EE", color: "#085041" },
                  { label: "Total payé",          value: fmtAmount(summary.totalPaid),  bg: PURPLE[50], color: PURPLE[800] },
                  { label: "Factures impayées",   value: summary.unpaidInv,             bg: "#FAECE7", color: "#712B13" },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} style={{ background: bg, borderRadius: 10, padding: "10px 12px" }}>
                    <p style={{ margin: 0, fontSize: 11, color, opacity: .75, fontWeight: 500 }}>{label}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 700, color }}>{value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid #EEEDFE", padding: "0 24px" }}>
              {TABS.map((tab) => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                  padding: "11px 16px", background: "none", border: "none",
                  fontWeight: activeTab === tab.key ? 600 : 400,
                  color: activeTab === tab.key ? PURPLE[600] : "#888780",
                  borderBottom: activeTab === tab.key ? `2px solid ${PURPLE[600]}` : "2px solid transparent",
                  cursor: "pointer", fontSize: 13, fontFamily: "'DM Sans', sans-serif",
                  display: "flex", alignItems: "center", gap: 6, transition: "color .15s",
                }}>
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* Contenu tabs */}
            <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>

              {/* ── Abonnements ── */}
              {activeTab === "subscriptions" && (
                subLoading
                  ? <div style={{ textAlign: "center", paddingTop: 40 }}><Spinner size={28} /></div>
                  : subscriptions.length === 0
                    ? <EmptyState icon=<MdSubscriptions/> message="Aucun abonnement trouvé" />
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {subscriptions.map((sub) => (
                          <div key={sub.id} style={{
                            border: "1px solid #EEEDFE", borderRadius: 12, padding: 16,
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                              <div>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: PURPLE[900] }}>
                                  {getPlanName(sub.plan_id)}
                                </p>
                                {getPlanPrice(sub.plan_id) && (
                                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#888780" }}>
                                    {getPlanPrice(sub.plan_id)}
                                  </p>
                                )}
                              </div>
                              <StatusBadge status={sub.status} />
                            </div>
                            <div style={{
                              display: "grid", gridTemplateColumns: "1fr 1fr",
                              gap: 8, fontSize: 13, color: "#888780", marginBottom: 12,
                            }}>
                              <span>🎯 Crédits restants : <strong style={{ color: PURPLE[900] }}>{sub.remainingScans ?? 0}</strong></span>
                              <span>📅 Depuis le : <strong style={{ color: PURPLE[900] }}>{fmtDate(sub.created_at)}</strong></span>
                            </div>
                            {sub.status === "active" && (
                              <button
                                onClick={() => dispatch(consumeScan(sub.id))}
                                disabled={scanStatus === "loading" || (sub.remainingScans ?? 0) <= 0}
                                style={{
                                  padding: "6px 14px", borderRadius: 20,
                                  border: `1px solid ${PURPLE[100]}`, background: PURPLE[50],
                                  color: (sub.remainingScans ?? 0) <= 0 ? "#B4B2A9" : PURPLE[600],
                                  cursor: (sub.remainingScans ?? 0) <= 0 ? "not-allowed" : "pointer",
                                  fontSize: 13, fontFamily: "'DM Sans', sans-serif", fontWeight: 500,
                                }}
                              >
                                {scanStatus === "loading" ? <Spinner size={12} /> : "Consommer un scan"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )
              )}

              {/* ── Factures ── */}
              {activeTab === "invoices" && (
                invLoading
                  ? <div style={{ textAlign: "center", paddingTop: 40 }}><Spinner size={28} /></div>
                  : invoices.length === 0
                    ? <EmptyState icon=<FaFileInvoice/> message="Aucune facture trouvée" />
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {invoices.map((inv) => (
                          <div key={inv.id} style={{
                            border: "1px solid #EEEDFE", borderRadius: 10, padding: "14px 16px",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <div>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: PURPLE[900] }}>
                                  {inv.invoice_number ?? `#${inv.id}`}
                                </p>
                                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#888780" }}>
                                  {fmtDate(inv.created_at)}
                                </p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: PURPLE[800] }}>
                                  {fmtAmount(inv.amount)}
                                </p>
                                <div style={{ marginTop: 4 }}>
                                  <StatusBadge status={inv.status} />
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
              )}

              {/* ── Paiements ── */}
              {activeTab === "payments" && (
                payLoading
                  ? <div style={{ textAlign: "center", paddingTop: 40 }}><Spinner size={28} /></div>
                  : payments.length === 0
                    ? <EmptyState icon=<FaCreditCard /> message="Aucun paiement trouvé" />
                    : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {payments.map((p) => (
                          <div key={p.id} style={{
                            border: "1px solid #EEEDFE", borderRadius: 10, padding: "14px 16px",
                          }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                              <div>
                                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: PURPLE[900] }}>
                                  {p.method ?? "Paiement"}
                                </p>
                                <p style={{ margin: "3px 0 0", fontSize: 12, color: "#888780" }}>
                                  {fmtDate(p.created_at)}
                                </p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: PURPLE[800] }}>
                                  {fmtAmount(p.amount)}
                                </p>
                                <div style={{ marginTop: 4 }}>
                                  <StatusBadge status={p.status} />
                                </div>
                              </div>
                            </div>
                            {p.transaction_ref && (
                              <p style={{ margin: 0, fontSize: 11, color: "#B4B2A9", fontFamily: "monospace" }}>
                                Réf : {p.transaction_ref}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// ─── UserForm ────────────────────────────────────────────────────────────────
const EMPTY_FORM = { name: "", email: "", isActive: true, role: "user" };
const ROLES = ["user", "admin"];

const UserForm = ({ initial = EMPTY_FORM, onSubmit, onCancel, loading }) => {
  const [form, setForm] = useState({
    name:     initial.name     ?? "",
    email:    initial.email    ?? "",
    isActive: initial.isActive ?? true,
    role:     initial.role     ?? "user",
  });

  const setField  = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggleActive = () => setForm((f) => ({ ...f, isActive: !f.isActive }));
  const isValid   = form.name.trim() && form.email.trim();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <label style={labelSt}>Nom complet</label>
        <input value={form.name} onChange={setField("name")} placeholder="Jean Dupont" style={inputSt} />
      </div>
      <div>
        <label style={labelSt}>Email</label>
        <input value={form.email} onChange={setField("email")} placeholder="jean@exemple.com" style={inputSt} />
      </div>
      <div>
        <label style={labelSt}>Rôle</label>
        <select value={form.role} onChange={setField("role")} style={inputSt}>
          {ROLES.map((r) => (
            <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
          ))}
        </select>
      </div>
      <div>
        <label style={labelSt}>Statut</label>
        <button type="button" onClick={toggleActive} style={{
          ...inputSt, textAlign: "left", cursor: "pointer", fontWeight: 500,
          background: form.isActive ? "#E1F5EE" : "#F1EFE8",
          color:      form.isActive ? "#085041" : "#5F5E5A",
          border:    `1.5px solid ${form.isActive ? "#9FE1CB" : "#D3D1C7"}`,
        }}>
          {form.isActive ? "✅  Actif" : "❌  Inactif"}
        </button>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        <button onClick={onCancel} style={btnCancelSt}>Annuler</button>
        <button
          onClick={() => onSubmit(form)}
          disabled={loading || !isValid}
          style={{
            ...btnSaveSt,
            background: loading || !isValid ? "#AFA9EC" : PURPLE[600],
            cursor: loading || !isValid ? "not-allowed" : "pointer",
          }}
        >
          {loading ? <Spinner size={14} color="#fff" /> : "Enregistrer"}
        </button>
      </div>
    </motion.div>
  );
};

// ─── Styles partagés ─────────────────────────────────────────────────────────
const inputSt = {
  width: "100%", padding: "9px 12px", borderRadius: 8, fontSize: 14,
  border: "1.5px solid #CECBF6", outline: "none", boxSizing: "border-box",
  fontFamily: "'DM Sans', sans-serif", color: "#26215C", background: "#fff",
};
const labelSt = {
  display: "block", fontSize: 12, fontWeight: 600, color: PURPLE[600],
  marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em",
};
const btnCancelSt = {
  padding: "9px 20px", borderRadius: 8, border: "1.5px solid #CECBF6",
  background: "none", color: PURPLE[600], fontWeight: 600, cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};
const btnSaveSt = {
  padding: "9px 22px", borderRadius: 8, border: "none", color: "#fff",
  fontWeight: 600, display: "flex", alignItems: "center", gap: 6,
  fontFamily: "'DM Sans', sans-serif", transition: "background .2s",
};
const thSt = {
  padding: "10px 14px", textAlign: "left", fontSize: 13,
  color: "#888780", fontWeight: 600, borderBottom: "1px solid #EEEDFE", whiteSpace: "nowrap",
};
const tdSt = {
  padding: "12px 14px", fontSize: 14, color: "#26215C",
  borderBottom: "1px solid #F8F7FD", verticalAlign: "middle",
};
const selSt = {
  padding: "8px 12px", borderRadius: 8, border: "1.5px solid #EEEDFE",
  fontSize: 14, background: "#FAFAFE", cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif", color: "#26215C",
};
const actionBtnSt = {
  padding: "6px 10px", borderRadius: 7,
  border: `1px solid ${PURPLE[100]}`, background: PURPLE[50],
  color: PURPLE[600], cursor: "pointer", fontSize: 13,
  display: "flex", alignItems: "center",
};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function UserManagement() {
  const dispatch = useDispatch();

  const users        = useSelector((s) => s.users.list);
  const loading      = useSelector((s) => s.users.loading);
  const error        = useSelector((s) => s.users.error);
  const addStatus    = useSelector((s) => s.users.addStatus);
  const updateStatus = useSelector((s) => s.users.updateStatus);
  const deleteStatus = useSelector((s) => s.users.deleteStatus);
  const selectedUser = useSelector((s) => s.users.selectedUser);

  // subscriptionCount vient du backend si disponible, sinon on croise avec le store
  const allSubscriptions = useSelector((s) => s.subscriptions?.list ?? []);

  const [search,             setSearch]            = useState("");
  const [filterActive,       setFilterActive]      = useState("all");
  const [sortField,          setSortField]         = useState("name");
  const [selectedIds,        setSelectedIds]       = useState([]);
  const [page,               setPage]              = useState(1);
  const [showAddModal,       setShowAddModal]      = useState(false);
  const [confirmDeleteUser,  setConfirmDeleteUser] = useState(null);
  const [drawerUser,         setDrawerUser]        = useState(null);

  const PAGE_SIZE = 8;

  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchPlans());
  }, [dispatch]);

  useEffect(() => {
    if (addStatus === "succeeded" || updateStatus === "succeeded") {
      setShowAddModal(false);
      dispatch(resetEditState());
      dispatch(resetUserStatuses());
    }
  }, [addStatus, updateStatus, dispatch]);

  useEffect(() => {
    if (deleteStatus === "succeeded") {
      setConfirmDeleteUser(null);
      dispatch(resetUserStatuses());
    }
  }, [deleteStatus, dispatch]);

  // Filtrage + tri
  const filteredUsers = useMemo(() => {
    let r = [...users];
    if (search) {
      const q = search.toLowerCase();
      r = r.filter((u) => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (filterActive !== "all") {
      r = r.filter((u) => String(u.isActive) === filterActive);
    }
    r.sort((a, b) =>
      (a[sortField] ?? "").toString().localeCompare((b[sortField] ?? "").toString())
    );
    return r;
  }, [users, search, filterActive, sortField]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE));
  const pagedUsers = filteredUsers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Sélection
  const toggleSelect = (id) =>
    setSelectedIds((p) => p.includes(id) ? p.filter((i) => i !== id) : [...p, id]);
  const toggleAll = () =>
    setSelectedIds(selectedIds.length === pagedUsers.length ? [] : pagedUsers.map((u) => u.id));

  // CRUD
  const handleAdd    = (form) => dispatch(addUser(form));
  const handleEdit   = (user) => dispatch(setSelectedUser(user));
  const handleUpdate = (form) => dispatch(updateUser({ id: selectedUser.id, data: form }));
  const handleDelete = (id)   => dispatch(deleteUser(id));
  const bulkDelete   = () => { selectedIds.forEach((id) => dispatch(deleteUser(id))); setSelectedIds([]); };

  // Stats
  // subscriptionCount : utilise le champ backend si présent, sinon croise le store
  const getSubCount = (user) => {
    if (user.subscriptionCount != null) return user.subscriptionCount;
    return allSubscriptions.filter((s) => s.user_id === user.id).length;
  };

  const stats = {
    total:    users.length,
    active:   users.filter((u) => u.isActive === true).length,
    inactive: users.filter((u) => u.isActive === false).length,
    withSub:  users.filter((u) => getSubCount(u) > 0).length,
  };

  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      background: "#F8F7FD", minHeight: "100vh", padding: "32px 40px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* ── Titre ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}
      >
        <div>
          <p style={{ fontSize: 12, fontWeight: 600, color: PURPLE[400], textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 4px" }}>
            Administration
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, color: PURPLE[900], margin: 0 }}>
            Gestion des utilisateurs
          </h1>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "10px 22px", borderRadius: 10, border: "none",
            background: PURPLE[600], color: "#fff",
            display: "flex", alignItems: "center", gap: 7,
            fontWeight: 600, cursor: "pointer", fontSize: 14,
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 4px 14px rgba(83,74,183,0.3)",
          }}
        >
          <FaPlus /> Ajouter un utilisateur
        </motion.button>
      </motion.div>

      {/* ── Stats ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard icon={<FaUsers color={PURPLE[600]} />}     label="Total utilisateurs" value={stats.total}    bg={PURPLE[50]}  color={PURPLE[800]} />
        <StatCard icon={<FaUserCheck color="#0F6E56" />}     label="Actifs"             value={stats.active}   bg="#E1F5EE"     color="#085041"     />
        <StatCard icon={<FaUserTimes color="#5F5E5A" />}     label="Inactifs"           value={stats.inactive} bg="#F1EFE8"     color="#5F5E5A"     />
        <StatCard icon={<FaCreditCard color={CORAL[400]} />} label="Avec abonnement"    value={stats.withSub}  bg="#FAECE7"     color="#712B13"     />
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        background: "#fff", borderRadius: 12, border: "1px solid #EEEDFE",
        padding: "14px 20px", display: "flex", alignItems: "center",
        gap: 12, flexWrap: "wrap", marginBottom: 16,
      }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <FaSearch style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#B4B2A9" }} />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Rechercher un utilisateur…"
            style={{ ...inputSt, paddingLeft: 32, background: "#FAFAFE", border: "1.5px solid #EEEDFE" }}
          />
        </div>

        <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1); }} style={selSt}>
          <option value="all">Tous les statuts</option>
          <option value="true">Actifs uniquement</option>
          <option value="false">Inactifs uniquement</option>
        </select>

        <select value={sortField} onChange={(e) => setSortField(e.target.value)} style={selSt}>
          <option value="name">Trier par nom</option>
          <option value="email">Trier par email</option>
          <option value="role">Trier par rôle</option>
        </select>

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#888780" }}>
          {filteredUsers.length} résultat{filteredUsers.length > 1 ? "s" : ""}
        </span>

        {selectedIds.length > 0 && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={bulkDelete} style={{
            padding: "8px 16px", borderRadius: 8,
            border: "1.5px solid #F5C4B3", background: "#FAECE7",
            color: CORAL[600], fontWeight: 600, cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            fontFamily: "'DM Sans', sans-serif",
          }}>
            <FaTrash /> Supprimer ({selectedIds.length})
          </motion.button>
        )}
      </div>

      {/* ── Erreur ── */}
      {error && (
        <div style={{
          background: "#FAECE7", border: "1px solid #F5C4B3", borderRadius: 8,
          padding: "10px 16px", marginBottom: 14, color: CORAL[600], fontSize: 14,
        }}>⚠ {error}</div>
      )}

      {/* ── Tableau ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{ background: "#fff", borderRadius: 14, border: "1px solid #EEEDFE", overflow: "hidden" }}
      >
        {loading ? (
          <div style={{ textAlign: "center", padding: 56, color: "#B4B2A9" }}>
            <Spinner size={30} />
            <p style={{ marginTop: 12, fontSize: 14 }}>Chargement des utilisateurs…</p>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#FAFAFE" }}>
                <th style={{ ...thSt, width: 44, paddingLeft: 22 }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.length === pagedUsers.length && pagedUsers.length > 0}
                    onChange={toggleAll}
                    style={{ accentColor: PURPLE[600], cursor: "pointer" }}
                  />
                </th>
                <th style={thSt}>Utilisateur</th>
                <th style={thSt}>Email</th>
                <th style={thSt}>Rôle</th>
                <th style={thSt}>Statut</th>
                <th style={thSt}>Abonnements</th>
                <th style={{ ...thSt, textAlign: "right", paddingRight: 22 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: "center", padding: 52, color: "#B4B2A9", fontSize: 14 }}>
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : pagedUsers.map((user) => (
                <tr
                  key={user.id}
                  style={{ background: selectedIds.includes(user.id) ? PURPLE[50] : "#fff", transition: "background .12s" }}
                  onMouseEnter={(e) => { if (!selectedIds.includes(user.id)) e.currentTarget.style.background = "#FAFAFE"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = selectedIds.includes(user.id) ? PURPLE[50] : "#fff"; }}
                >
                  <td style={{ ...tdSt, paddingLeft: 22 }}>
                    <input type="checkbox" checked={selectedIds.includes(user.id)} onChange={() => toggleSelect(user.id)} style={{ accentColor: PURPLE[600], cursor: "pointer" }} />
                  </td>
                  <td style={tdSt}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <Avatar name={user.name} size={34} />
                      <span style={{ fontWeight: 500 }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ ...tdSt, color: PURPLE[600], fontSize: 13 }}>{user.email}</td>
                  <td style={tdSt}>
                    <span style={{
                      background: PURPLE[50], color: PURPLE[600],
                      padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                    }}>
                      {(user.role ?? "user").toUpperCase()}
                    </span>
                  </td>
                  <td style={tdSt}><Badge active={user.isActive} /></td>
                  <td style={tdSt}>
                    {getSubCount(user) > 0 ? (
                      <span style={{
                        background: "#E1F5EE", color: "#085041", border: "1px solid #9FE1CB",
                        padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600,
                      }}>
                        {getSubCount(user)} abonnement{getSubCount(user) > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span style={{ color: "#B4B2A9", fontSize: 13 }}>—</span>
                    )}
                  </td>
                  <td style={{ ...tdSt, textAlign: "right", paddingRight: 22 }}>
                    <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                      <motion.button whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
                        onClick={() => setDrawerUser(user)} title="Voir les détails" style={actionBtnSt}>
                        <FaEye />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
                        onClick={() => handleEdit(user)} title="Modifier" style={actionBtnSt}>
                        <FaEdit />
                      </motion.button>
                      <motion.button whileHover={{ scale: 1.07 }} whileTap={{ scale: 0.93 }}
                        onClick={() => setConfirmDeleteUser(user)} title="Supprimer"
                        style={{ ...actionBtnSt, background: "#FAECE7", border: "1px solid #F5C4B3", color: CORAL[400] }}>
                        <FaTrash />
                      </motion.button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{
            padding: "14px 22px", borderTop: "1px solid #EEEDFE",
            display: "flex", justifyContent: "space-between", alignItems: "center",
          }}>
            <span style={{ fontSize: 13, color: "#888780" }}>
              Page {page} sur {totalPages} · {filteredUsers.length} utilisateur{filteredUsers.length > 1 ? "s" : ""}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #EEEDFE", background: "#fff", cursor: page === 1 ? "not-allowed" : "pointer", color: page === 1 ? "#D3D1C7" : PURPLE[800], fontSize: 13 }}>
                ← Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => setPage(p)} style={{
                  width: 34, height: 34, borderRadius: 8,
                  border: p === page ? "none" : "1px solid #EEEDFE",
                  background: p === page ? PURPLE[600] : "#fff",
                  color: p === page ? "#fff" : PURPLE[800],
                  fontWeight: p === page ? 600 : 400, cursor: "pointer", fontSize: 13,
                }}>{p}</button>
              ))}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #EEEDFE", background: "#fff", cursor: page === totalPages ? "not-allowed" : "pointer", color: page === totalPages ? "#D3D1C7" : PURPLE[800], fontSize: 13 }}>
                Suivant →
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Modals ── */}
      <AnimatePresence>
        {showAddModal && (
          <Modal title="Nouvel utilisateur" onClose={() => setShowAddModal(false)}>
            <UserForm onSubmit={handleAdd} onCancel={() => setShowAddModal(false)} loading={addStatus === "loading"} />
          </Modal>
        )}
        {selectedUser && (
          <Modal title="Modifier l'utilisateur" onClose={() => dispatch(resetEditState())}>
            <UserForm
              initial={selectedUser}
              onSubmit={handleUpdate}
              onCancel={() => dispatch(resetEditState())}
              loading={updateStatus === "loading"}
            />
          </Modal>
        )}
        {confirmDeleteUser && (
          <Modal title="Confirmer la suppression" onClose={() => setConfirmDeleteUser(null)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center" }}>
              <div style={{
                width: 56, height: 56, borderRadius: "50%", background: "#FAECE7",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
              }}>🗑</div>
              <div>
                <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: PURPLE[900] }}>
                  Supprimer {confirmDeleteUser.name} ?
                </p>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: "#888780" }}>
                  Cette action est irréversible.
                </p>
              </div>
              <div style={{ display: "flex", gap: 10, width: "100%" }}>
                <button onClick={() => setConfirmDeleteUser(null)}
                  style={{ ...btnCancelSt, flex: 1, padding: "10px", textAlign: "center" }}>
                  Annuler
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteUser.id)}
                  disabled={deleteStatus === "loading"}
                  style={{
                    ...btnSaveSt, flex: 1, padding: "10px", justifyContent: "center",
                    background: deleteStatus === "loading" ? "#F0997B" : CORAL[400],
                    cursor: deleteStatus === "loading" ? "not-allowed" : "pointer",
                  }}
                >
                  {deleteStatus === "loading" ? <Spinner size={14} color="#fff" /> : "Supprimer"}
                </button>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ── Drawer ── */}
      <UserDrawer user={drawerUser} open={!!drawerUser} onClose={() => setDrawerUser(null)} />
    </div>
  );
}