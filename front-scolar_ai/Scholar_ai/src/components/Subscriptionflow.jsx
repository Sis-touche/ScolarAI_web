import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { QRCodeSVG } from "qrcode.react"; // npm install qrcode.react

// ── Slices ────────────────────────────────────────────────────────────────────
import { fetchPlans, setSelectedPlan, clearSelectedPlan } from "../reducer/planSlice";
import { createSubscription, setSelectedSubscription, fetchSubscriptionById, resetStatuses as resetSubStatuses } from "../reducer/subscriptionSlice";
import { fetchInvoiceById } from "../reducer/invoiceSlice";
import { fetchPaymentPlans } from "../reducer/paymentPlanSlice";
import { initiatePayment, clearSimulationData, resetStatuses as resetPayStatuses } from "../reducer/paymentSlice";
import { setQrCodeUrl, resetActivation } from "../reducer/mobileActivationSlice";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────────────────────────────────
const PAYMENT_METHODS = [
  { value: "mobile_money",   label: "MVola / Airtel / Orange", icon: "📱" },
  { value: "carte_bancaire", label: "Carte bancaire",          icon: "💳" },
  { value: "virement",       label: "Virement bancaire",       icon: "🏦" },
  { value: "especes",        label: "Espèces",                 icon: "💵" },
];

const STEPS = [
  { id: 1, label: "Plan"         },
  { id: 2, label: "Abonnement"   },
  { id: 3, label: "Paiement"     },
  { id: 4, label: "Confirmation" },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Décode le payload d'un JWT sans librairie externe.
 * Retourne null si le token est absent ou malformé.
 */
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

/**
 * Récupère le user_id (UUID) depuis le JWT stocké en localStorage.
 * Clé : "token" — à adapter si vous utilisez un autre nom.
 */
const getUserIdFromToken = () => {
  const token = localStorage.getItem("token");
  const payload = decodeJwt(token);
  return payload?.id ?? null;
};

const fmt = (v) =>
  new Intl.NumberFormat("fr-MG").format(parseFloat(v ?? 0));

const getPlanFeatures = (plan) => {
  const f = [];
  if (plan.scanLimit === null) f.push("Scans illimités");
  else if (plan.scanLimit > 0) f.push(`${plan.scanLimit} scans inclus`);
  if (plan.type === "TIME_BASED") {
    f.push(plan.durationDays >= 365 ? "Accès 12 mois" : "Accès 30 jours");
    f.push("Tableau de bord complet");
    if (plan.durationDays >= 365) {
      f.push("Support prioritaire");
      f.push("Rapports PDF mensuels");
    }
  } else {
    f.push("Validité 6 mois");
    f.push("Tableau de bord complet");
  }
  return f;
};

// ─────────────────────────────────────────────────────────────────────────────
// SOUS-COMPOSANTS UI
// ─────────────────────────────────────────────────────────────────────────────

// Indicateur de progression
function StepIndicator({ currentStep }) {
  return (
    <div style={styles.stepBar}>
      {STEPS.map((s, i) => {
        const done    = s.id < currentStep;
        const active  = s.id === currentStep;
        return (
          <div key={s.id} style={styles.stepItem}>
            <div
              style={{
                ...styles.stepCircle,
                ...(done   ? styles.stepDone   : {}),
                ...(active ? styles.stepActive : {}),
              }}
            >
              {done ? "✓" : s.id}
            </div>
            <span style={{ ...styles.stepLabel, ...(active ? styles.stepLabelActive : {}) }}>
              {s.label}
            </span>
            {i < STEPS.length - 1 && (
              <div style={{ ...styles.stepLine, ...(done ? styles.stepLineDone : {}) }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// Skeleton card
function PlanSkeleton() {
  return (
    <div style={{ ...styles.planCard, opacity: 0.5 }}>
      {[80, 40, 24, 24, 24].map((w, i) => (
        <div key={i} style={{ ...styles.skel, width: `${w}%`, marginBottom: 10 }} />
      ))}
    </div>
  );
}

// Card de plan
function PlanCard({ plan, selected, onSelect }) {
  const features = getPlanFeatures(plan);
  const isFree   = parseFloat(plan.price) === 0;
  return (
    <div
      style={{ ...styles.planCard, ...(selected ? styles.planCardSelected : {}) }}
      onClick={() => onSelect(plan)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onSelect(plan)}
      aria-pressed={selected}
    >
      {plan.popular && <div style={styles.badge}>⭐ Recommandé</div>}
      <div style={styles.radioRow}>
        <div style={{ ...styles.radioOuter, ...(selected ? styles.radioOuterSel : {}) }}>
          {selected && <div style={styles.radioDot} />}
        </div>
        <span style={styles.planName}>{plan.name}</span>
      </div>
      <div style={styles.price}>
        {isFree ? (
          <><span style={styles.priceCur}>$</span>0<span style={styles.pricePer}>/mois</span></>
        ) : (
          <>
            <span style={styles.priceCur}>Ar</span>
            {fmt(plan.price)}
            <span style={styles.pricePer}>
              {plan.type === "TIME_BASED" && plan.durationDays >= 365 ? "/an" : "/mois"}
            </span>
          </>
        )}
      </div>
      <ul style={styles.featureList}>
        {features.map((f, i) => (
          <li key={i} style={styles.featureItem}>
            <span style={styles.check}>✓</span> {f}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Carte tranche de paiement
function InstallmentCard({ plan, index, onPay, paying }) {
  const statusColors = {
    pending:   { bg: "#fff8e1", color: "#b45309" },
    paid:      { bg: "#e8f5e9", color: "#166534" },
    overdue:   { bg: "#fef2f2", color: "#991b1b" },
    cancelled: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const sc = statusColors[plan.status] ?? statusColors.pending;

  return (
    <div style={styles.installCard}>
      <div style={styles.installHeader}>
        <span style={styles.installNum}>Tranche #{plan.installment_number ?? index + 1}</span>
        <span style={{ ...styles.installStatus, background: sc.bg, color: sc.color }}>
          {plan.status ?? "pending"}
        </span>
      </div>
      <div style={styles.installRow}>
        <span style={styles.installLabel}>Montant</span>
        <span style={styles.installValue}>Ar {fmt(plan.amount)}</span>
      </div>
      {plan.due_date && (
        <div style={styles.installRow}>
          <span style={styles.installLabel}>Échéance</span>
          <span style={styles.installValue}>
            {new Date(plan.due_date).toLocaleDateString("fr-MG")}
          </span>
        </div>
      )}
      {(plan.status === "pending" || plan.status === "overdue") && (
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, marginTop: 12, width: "100%", opacity: paying ? 0.7 : 1 }}
          onClick={() => onPay(plan.id)}
          disabled={paying}
        >
          {paying ? "Traitement…" : "Payer cette tranche"}
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 1 — Sélection du plan
// ─────────────────────────────────────────────────────────────────────────────
function StepPlan({ onNext }) {
  const dispatch = useDispatch();
  const { list, loading, error, selectedPlan } = useSelector((s) => s.plans);

  useEffect(() => {
    dispatch(fetchPlans({ page: 1, limit: 20, sort: "price", order: "ASC" }));
  }, [dispatch]);

  const handleSelect = (plan) => {
    if (selectedPlan?.id === plan.id) dispatch(clearSelectedPlan());
    else dispatch(setSelectedPlan(plan));
  };

  return (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Choisissez votre formule</h2>
      <p style={styles.stepSub}>Sélectionnez le plan qui correspond à vos besoins.</p>

      {error && (
        <div style={styles.errorBox}>
          ⚠ {error}
          <button style={styles.retryBtn} onClick={() => dispatch(fetchPlans({ page: 1, limit: 20 }))}>
            Réessayer
          </button>
        </div>
      )}

      <div style={styles.planGrid}>
        {loading
          ? [1, 2, 3].map((k) => <PlanSkeleton key={k} />)
          : list.map((p) => (
              <PlanCard
                key={p.id}
                plan={p}
                selected={selectedPlan?.id === p.id}
                onSelect={handleSelect}
              />
            ))}
      </div>

      <div style={styles.navRow}>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, ...(selectedPlan ? {} : styles.btnDisabled) }}
          onClick={() => selectedPlan && onNext()}
          disabled={!selectedPlan}
        >
          Continuer →
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 2 — Création de l'abonnement & récapitulatif
// ─────────────────────────────────────────────────────────────────────────────
function StepSubscription({ onNext, onBack, userId }) {
  const dispatch = useDispatch();
  const { selectedPlan }                               = useSelector((s) => s.plans);
  const { createStatus, error, selectedSubscription, list: subList } = useSelector((s) => s.subscriptions);
  // Si selectedSubscription est null après création, on prend le premier élément de la liste
  // (c'est l'abonnement qui vient d'être créé via list.unshift)
  const subscription = selectedSubscription ?? (createStatus === "succeeded" ? subList[0] : null);

  // Mode de paiement choisi par l'utilisateur
  const [paymentMode, setPaymentMode] = useState("total"); // "total" | "installments"

  // Détermine si on peut continuer
  const canContinue = createStatus === "succeeded" || (createStatus === "idle" && !!subscription);
  const isLoading   = createStatus === "loading";
  const hasFailed   = createStatus === "failed";

  // Créer l'abonnement au montage SEULEMENT si aucun abonnement n'existe déjà
  const createCalledRef = useRef(false);

  useEffect(() => {
    if (
      selectedPlan &&
      createStatus === "idle" &&
      !subscription &&
      !createCalledRef.current
    ) {
      createCalledRef.current = true;
      dispatch(createSubscription({ 
        user_id: userId, 
        plan_id: selectedPlan.id,
        nb_tranches: paymentMode === "total" ? 1 : 2
        }));
    }
    return () => {
      if (createStatus === "idle") createCalledRef.current = false;
    };
  }, [selectedPlan?.id, createStatus, subscription?.id, dispatch, userId]);

  const handleContinue = () => {
    if (!canContinue || !subscription) return;
    dispatch(setSelectedSubscription({ ...subscription, paymentMode }));
    onNext(paymentMode); // ← transmettre le mode à l'étape suivante
  };

  return (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Récapitulatif de votre abonnement</h2>
      <p style={styles.stepSub}>Votre abonnement est créé en statut <em>en attente</em>.</p>

      {isLoading && (
        <div style={styles.loadingBox}>
          <div style={styles.spinner} />
          <span>Création de l'abonnement…</span>
        </div>
      )}

      {hasFailed && (
        <div style={styles.errorBox}>
          ⚠ {error}
          <button
            style={styles.retryBtn}
            onClick={() => dispatch(createSubscription({ user_id: userId, plan_id: selectedPlan.id }))}
          >
            Réessayer
          </button>
        </div>
      )}

      {canContinue && subscription && selectedPlan && (
        <div style={styles.recapCard}>
          <RecapRow label="Plan"          value={selectedPlan.name} />
          <RecapRow label="Type"          value={selectedPlan.type === "TIME_BASED" ? "Durée" : "Crédits"} />
          <RecapRow label="Prix"          value={`Ar ${fmt(selectedPlan.price)}`} />
          {selectedPlan.durationDays && (
            <RecapRow label="Durée"       value={`${selectedPlan.durationDays} jours`} />
          )}
          {selectedPlan.scanLimit !== null && (
            <RecapRow label="Scans"       value={selectedPlan.scanLimit === null ? "Illimité" : selectedPlan.scanLimit} />
          )}
          <RecapRow label="Abonnement ID" value={`#${subscription.id}`} mono />
          <RecapRow label="Statut"        value={subscription.status ?? "pending"} highlight />
        </div>
      )}

      {/* Sélecteur mode de paiement */}
      {canContinue && subscription && (
        <div style={styles.modeSelector}>
          <p style={styles.modeSelectorTitle}>💳 Mode de paiement</p>
          <div style={styles.modeGrid}>
            <button
              style={{
                ...styles.modeBtn,
                ...(paymentMode === "total" ? styles.modeBtnActive : {}),
              }}
              onClick={() => setPaymentMode("total")}
            >
              <span style={styles.modeIcon}>💰</span>
              <span style={styles.modeName}>Paiement total</span>
              <span style={styles.modeDesc}>
                Ar {fmt(selectedPlan?.price)} en une fois
              </span>
            </button>

            <button
              style={{
                ...styles.modeBtn,
                ...(paymentMode === "installments" ? styles.modeBtnActive : {}),
              }}
              onClick={() => setPaymentMode("installments")}
            >
              <span style={styles.modeIcon}>📅</span>
              <span style={styles.modeName}>Paiement en 2 tranches</span>
              <span style={styles.modeDesc}>
                2 × Ar {fmt(parseFloat(selectedPlan?.price ?? 0) / 2)} / mois
              </span>
            </button>
          </div>
        </div>
      )}

      <div style={styles.navRow}>
        <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={onBack}>← Retour</button>
        <button
          style={{
            ...styles.btn,
            ...styles.btnPrimary,
            ...(!canContinue || !subscription ? styles.btnDisabled : {}),
          }}
          onClick={handleContinue}
          disabled={!canContinue || !subscription}
        >
          {isLoading ? (
            <><span style={styles.spinner} /> Création…</>
          ) : (
            "Passer au paiement →"
          )}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 3 — Paiement des tranches
// ─────────────────────────────────────────────────────────────────────────────
function StepPayment({ onNext, onBack, subscription: subscriptionProp, paymentMode = "total" }) {
  const dispatch = useDispatch();
  const { list: installments, loading: loadingPlans } = useSelector((s) => s.paymentPlans);
  const { initiateStatus, error: payError, currentSimulationUrl, currentTransactionRef } =
    useSelector((s) => s.payments);
  // Lire l'abonnement depuis Redux pour avoir le statut live (mis à jour après simulation)
  const { selectedSubscription: reduxSub } = useSelector((s) => s.subscriptions);
  // Fusionner : Redux en priorité (statut live), prop en fallback (id, user_id)
  const subscription = reduxSub ?? subscriptionProp;

  const [method,   setMethod]  = useState("mobile_money");
  const [payingId, setPayingId] = useState(null);
  const [showSim,  setShowSim]  = useState(false);

  // Détecter le retour de la simulation (?payment=success ou ?payment=failed)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentResult = params.get("payment");
    if (paymentResult === "success") {
      // Recharger les tranches pour voir les statuts mis à jour
      if (subscription?.id) {
        dispatch(fetchPaymentPlans({
          subscription_id: subscription.id,
          limit: 50,
          sort: "installment_number",
          order: "ASC",
        }));
      }
      // Nettoyer l'URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Charger les tranches dès que l'id de l'abonnement est disponible
  useEffect(() => {
    if (subscription?.id) {
      console.log("[StepPayment] fetch tranches pour subscription:", subscription.id);
      dispatch(fetchPaymentPlans({
        subscription_id: subscription.id,
        limit: 50,
        sort: "installment_number",
        order: "ASC",
      }));
    } else {
      console.warn("[StepPayment] subscription prop est null — tranches non chargées");
    }
  }, [subscription?.id, dispatch]);

  // Afficher la simulation dès qu'on a l'URL
  useEffect(() => {
    if (initiateStatus === "succeeded" && currentSimulationUrl) {
      setShowSim(true);
    }
  }, [initiateStatus, currentSimulationUrl]);

  // Écouter le résultat de la simulation (postMessage depuis la popup)
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "PAYMENT_RESULT") {
        console.log("[StepPayment] Résultat simulation:", event.data.status);
        setShowSim(false);
        dispatch(clearSimulationData());
        dispatch(resetPayStatuses());

        if (subscription?.id) {
          // 1. Recharger les tranches — pour voir les statuts mis à jour
          dispatch(fetchPaymentPlans({
            subscription_id: subscription.id,
            limit: 50,
            sort: "installment_number",
            order: "ASC",
          }));
          // 2. Recharger l'abonnement — pour récupérer le nouveau statut "active"
          //    et débloquer le bouton "Voir la confirmation"
          dispatch(fetchSubscriptionById(subscription.id));
        }
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [subscription?.id, dispatch]);

  const handlePay = (planId) => {
    setPayingId(planId);
    dispatch(initiatePayment({
      payment_plan_id: planId,
      user_id:         subscription?.user_id,
      method,
      notes:           `Paiement tranche – abonnement #${subscription?.id}`,
    }));
  };

  // Filtrer les tranches selon le mode choisi à l'étape 2
  // "total"        → 1 seule tranche (la première = montant total)
  // "installments" → 2 tranches
  const visibleInstallments = paymentMode === "total"
    ? installments.slice(0, 1)   // seulement la 1ère tranche
    : installments.slice(0, 2);  // les 2 premières tranches

  // Vérifier si toutes les tranches VISIBLES sont payées
  const PAID_STATUSES = ["paid", "confirmed", "success"];
  const allPaid = visibleInstallments.length > 0 &&
    visibleInstallments.every((p) => PAID_STATUSES.includes(p.status));

  // Compter les tranches payées pour debug
  const paidCount = installments.filter((p) => PAID_STATUSES.includes(p.status)).length;
  console.log(`[canProceed] ${paidCount}/${installments.length} tranches payées — statuts:`,
    installments.map(p => p.status));

  // Permettre de continuer si :
  // 1. Toutes les tranches sont payées
  // 2. L'abonnement est "active" (même si pas toutes les tranches payées)
  //    → le backend active dès la 1ère tranche confirmée
  const subIsActive = subscription?.status === "active" || reduxSub?.status === "active";
  const canProceed  = allPaid || subIsActive;

  return (
    <div style={styles.stepContent}>
      <h2 style={styles.stepTitle}>Paiement des échéances</h2>
      <p style={styles.stepSub}>
        {visibleInstallments.length} tranche{visibleInstallments.length !== 1 ? "s" : ""} à régler
        {paymentMode === "total" ? " — paiement intégral" : " — paiement échelonné"}.
      </p>

      {/* Choix de la méthode */}
      <div style={styles.methodGrid}>
        {PAYMENT_METHODS.map((m) => (
          <button
            key={m.value}
            style={{ ...styles.methodBtn, ...(method === m.value ? styles.methodBtnActive : {}) }}
            onClick={() => setMethod(m.value)}
          >
            <span style={{ fontSize: 20 }}>{m.icon}</span>
            <span style={{ fontSize: 12, marginTop: 4 }}>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Tranches */}
      {loadingPlans ? (
        <div style={styles.loadingBox}><div style={styles.spinner} /><span>Chargement des tranches…</span></div>
      ) : visibleInstallments.length === 0 ? (
        <div style={styles.emptyBox}>Aucune tranche trouvée pour cet abonnement.</div>
      ) : (
        <div style={styles.installGrid}>
          {visibleInstallments.map((p, i) => (
            <InstallmentCard
              key={p.id}
              plan={p}
              index={i}
              onPay={handlePay}
              paying={initiateStatus === "loading" && payingId === p.id}
            />
          ))}
        </div>
      )}

      {/* Erreur paiement */}
      {initiateStatus === "failed" && payError && (
        <div style={styles.errorBox}>⚠ {payError}</div>
      )}

      {/* Simulation URL */}
      {showSim && currentSimulationUrl && (
        <div style={styles.simBox}>
          <p style={{ margin: "0 0 8px", fontWeight: 500 }}>
            ✅ Paiement initié — Réf: <code>{currentTransactionRef}</code>
          </p>
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#6b7280" }}>
            Utilisez le lien de simulation pour confirmer le paiement :
          </p>
          <button
            style={styles.simLink}
            onClick={() => {
              // Ouvrir dans une popup centrée — pas un nouvel onglet
              const w = 480, h = 600;
              const left = window.screenX + (window.outerWidth - w) / 2;
              const top  = window.screenY + (window.outerHeight - h) / 2;
              window.open(
                currentSimulationUrl,
                "simulation_paiement",
                `width=${w},height=${h},left=${left},top=${top},resizable=no`
              );
            }}
          >
            Ouvrir la simulation ↗
          </button>
          <button
            style={{ ...styles.btn, ...styles.btnSecondary, marginTop: 10, fontSize: 13 }}
            onClick={() => { setShowSim(false); dispatch(clearSimulationData()); dispatch(resetPayStatuses()); }}
          >
            Fermer
          </button>
        </div>
      )}

      <div style={styles.navRow}>
        <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={onBack}>← Retour</button>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary, ...(!canProceed ? styles.btnDisabled : {}) }}
          onClick={onNext}
          disabled={!canProceed}
        >
          Voir la confirmation →
        </button>
      </div>

      {!canProceed && installments.length > 0 && (
        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 8 }}>
          Payez toutes les tranches pour continuer.
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ÉTAPE 4 — Confirmation : Facture + QR Code
// ─────────────────────────────────────────────────────────────────────────────
function StepConfirmation({ onReset }) {
  const dispatch = useDispatch();
  const { selectedSubscription }                     = useSelector((s) => s.subscriptions);
  const { selectedInvoice, fetchOneStatus, error: invError } = useSelector((s) => s.invoices);
  const { qrCodeUrl }                                = useSelector((s) => s.mobileActivation);

  // Chercher la facture liée à l'abonnement
  useEffect(() => {
    if (selectedSubscription?.invoice_id && fetchOneStatus === "idle") {
      dispatch(fetchInvoiceById(selectedSubscription.invoice_id));
    }
  }, [selectedSubscription, fetchOneStatus, dispatch]);

  // Construire l'URL d'activation QR
  useEffect(() => {
    if (selectedSubscription?.mobile_activation_token) {
      const url = `${window.location.origin}/activate?token=${selectedSubscription.mobile_activation_token}`;
      dispatch(setQrCodeUrl(url));
    }
  }, [selectedSubscription, dispatch]);

  const qrValue = qrCodeUrl
    ?? (selectedSubscription?.mobile_activation_token
      ? `${window.location.origin}/activate?token=${selectedSubscription.mobile_activation_token}`
      : `${window.location.origin}/activate?token=PENDING`);

  return (
    <div style={styles.stepContent}>
      <div style={styles.successBanner}>
        <div style={styles.successIcon}>✓</div>
        <h2 style={{ margin: "12px 0 4px", fontSize: 22, fontWeight: 600 }}>Abonnement activé !</h2>
        <p style={{ margin: 0, color: "#6b7280", fontSize: 14 }}>
          Votre paiement a été confirmé. Voici votre facture et votre QR d'activation.
        </p>
      </div>

      <div style={styles.confirmGrid}>
        {/* Facture */}
        <div style={styles.confirmCard}>
          <h3 style={styles.cardTitle}>🧾 Facture</h3>
          {fetchOneStatus === "loading" && (
            <div style={styles.loadingBox}><div style={styles.spinner} /><span>Chargement…</span></div>
          )}
          {fetchOneStatus === "failed" && (
            <div style={styles.errorBox}>⚠ {invError ?? "Impossible de charger la facture."}</div>
          )}
          {fetchOneStatus === "succeeded" && selectedInvoice ? (
            <>
              <RecapRow label="N° Facture"  value={selectedInvoice.invoice_number} mono />
              <RecapRow label="Date"        value={new Date(selectedInvoice.created_at).toLocaleDateString("fr-MG")} />
              <RecapRow label="Montant HT"  value={`Ar ${fmt(selectedInvoice.amount_ht)}`} />
              {selectedInvoice.tax_amount > 0 && (
                <RecapRow label="TVA"       value={`Ar ${fmt(selectedInvoice.tax_amount)}`} />
              )}
              <RecapRow label="Total TTC"   value={`Ar ${fmt(selectedInvoice.total_amount)}`} highlight />
              <RecapRow label="Statut"      value={selectedInvoice.status} />
              <button
                style={{ ...styles.btn, ...styles.btnSecondary, marginTop: 14, width: "100%", fontSize: 13 }}
                onClick={() => window.open(`/api/invoices/${selectedInvoice.id}/pdf`, "_blank")}
              >
                📥 Télécharger le PDF
              </button>
            </>
          ) : fetchOneStatus === "idle" && (
            <div style={styles.emptyBox}>
              La facture sera disponible après traitement du paiement.
            </div>
          )}
        </div>

        {/* QR Code */}
        <div style={{ ...styles.confirmCard, alignItems: "center", textAlign: "center" }}>
          <h3 style={styles.cardTitle}>📱 QR Code d'activation</h3>
          <p style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
            Scannez ce code depuis l'application mobile pour activer votre abonnement.
          </p>
          <div style={styles.qrWrapper}>
            <QRCodeSVG
              value={qrValue}
              size={180}
              level="H"
              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
            />
          </div>
          {selectedSubscription?.mobile_activation_token && (
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 12, wordBreak: "break-all" }}>
              Token : {selectedSubscription.mobile_activation_token}
            </p>
          )}
          <button
            style={{ ...styles.btn, ...styles.btnSecondary, marginTop: 14, width: "100%", fontSize: 13 }}
            onClick={() => {
              const svg = document.querySelector(".qr-svg");
              if (!svg) return;
              const blob = new Blob([svg.outerHTML], { type: "image/svg+xml" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a"); a.href = url;
              a.download = "qrcode-activation.svg"; a.click();
            }}
          >
            📥 Télécharger le QR Code
          </button>
        </div>
      </div>

      <div style={styles.navRow}>
        <button
          style={{ ...styles.btn, ...styles.btnPrimary }}
          onClick={() => { dispatch(resetActivation()); onReset(); }}
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT UTILITAIRE
// ─────────────────────────────────────────────────────────────────────────────
function RecapRow({ label, value, mono, highlight }) {
  return (
    <div style={styles.recapRow}>
      <span style={styles.recapLabel}>{label}</span>
      <span style={{
        ...styles.recapValue,
        ...(mono      ? { fontFamily: "monospace", fontSize: 13 } : {}),
        ...(highlight ? { fontWeight: 600, color: "#0f766e" }    : {}),
      }}>
        {value}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function SubscriptionFlow({ userId: userIdProp }) {
  const userId = userIdProp ?? getUserIdFromToken();
  const [step, setStep]               = useState(1);
  const [paymentMode, setPaymentMode] = useState("total"); // transmis de l'étape 2 → 3

  const next  = useCallback((mode) => {
    if (mode) setPaymentMode(mode); // sauvegarder le mode choisi
    setStep((s) => Math.min(s + 1, 4));
  }, []);
  const back  = useCallback(() => setStep((s) => Math.max(s - 1, 1)), []);
  const reset = useCallback(() => setStep(1), []);

  // Garde : si on n'arrive pas à résoudre l'UUID, on bloque
  if (!userId) {
    return (
      <div style={styles.page}>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={{ padding: "40px 36px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🔐</div>
              <h2 style={{ margin: "0 0 8px", color: "#0f172a" }}>Session expirée</h2>
              <p style={{ color: "#64748b", fontSize: 14, margin: "0 0 20px" }}>
                Impossible de récupérer votre identifiant utilisateur.<br />
                Veuillez vous reconnecter.
              </p>
              <button
                style={{ ...styles.btn, ...styles.btnPrimary, margin: "0 auto" }}
                onClick={() => window.location.href = "/login"}
              >
                Se reconnecter
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Lire selectedSubscription ici pour le passer en prop à StepPayment
  // (évite le problème de timing Redux entre l'étape 2 et l'étape 3)
  const { selectedSubscription, list: subList, createStatus } = useSelector((s) => s.subscriptions);
  const resolvedSubscription = selectedSubscription ?? (createStatus === "succeeded" ? subList[0] : null);

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <StepIndicator currentStep={step} />

        <div style={styles.card}>
          {step === 1 && <StepPlan        onNext={next} />}
          {step === 2 && <StepSubscription onNext={next} onBack={back} userId={userId} />}
          {step === 3 && <StepPayment      onNext={next} onBack={back} subscription={resolvedSubscription} paymentMode={paymentMode} />}
          {step === 4 && <StepConfirmation onReset={reset} />}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    padding: "32px 16px",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    boxSizing: "border-box",
  },
  container: {
    maxWidth: 860,
    margin: "0 auto",
  },

  // ── Stepper ──
  stepBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
    marginBottom: 32,
    flexWrap: "nowrap",
    position: "relative",
  },
  stepItem: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    position: "relative",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#e2e8f0",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: 600,
    flexShrink: 0,
    transition: "all 0.2s",
  },
  stepActive: {
    background: "#0f766e",
    color: "#fff",
    boxShadow: "0 0 0 4px rgba(15,118,110,0.15)",
  },
  stepDone: {
    background: "#0f766e",
    color: "#fff",
  },
  stepLabel: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  stepLabelActive: {
    color: "#0f766e",
  },
  stepLine: {
    width: 40,
    height: 2,
    background: "#e2e8f0",
    marginLeft: 8,
    flexShrink: 0,
  },
  stepLineDone: {
    background: "#0f766e",
  },

  // ── Card principale ──
  card: {
    background: "#fff",
    borderRadius: 16,
    boxShadow: "0 1px 3px rgba(0,0,0,0.08), 0 8px 24px rgba(0,0,0,0.04)",
    overflow: "hidden",
  },
  stepContent: {
    padding: "32px 36px",
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
    margin: "0 0 6px",
  },
  stepSub: {
    fontSize: 14,
    color: "#64748b",
    margin: "0 0 24px",
  },

  // ── Plans ──
  planGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
    gap: 16,
    marginBottom: 28,
  },
  planCard: {
    border: "2px solid #e2e8f0",
    borderRadius: 12,
    padding: "18px 16px",
    cursor: "pointer",
    transition: "all 0.2s",
    position: "relative",
    background: "#fff",
  },
  planCardSelected: {
    border: "2px solid #0f766e",
    background: "#f0fdfa",
    boxShadow: "0 0 0 3px rgba(15,118,110,0.1)",
  },
  badge: {
    position: "absolute",
    top: -10,
    right: 12,
    background: "#0f766e",
    color: "#fff",
    fontSize: 11,
    fontWeight: 600,
    padding: "3px 10px",
    borderRadius: 20,
  },
  radioRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: "50%",
    border: "2px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  radioOuterSel: {
    border: "2px solid #0f766e",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#0f766e",
  },
  planName: {
    fontWeight: 600,
    fontSize: 15,
    color: "#0f172a",
  },
  price: {
    fontSize: 24,
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 12,
    lineHeight: 1,
  },
  priceCur: {
    fontSize: 14,
    fontWeight: 500,
    color: "#64748b",
    marginRight: 3,
  },
  pricePer: {
    fontSize: 13,
    fontWeight: 400,
    color: "#94a3b8",
    marginLeft: 3,
  },
  featureList: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  featureItem: {
    fontSize: 13,
    color: "#475569",
    padding: "3px 0",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  check: {
    color: "#0f766e",
    fontWeight: 700,
  },
  skel: {
    background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 37%,#f0f0f0 63%)",
    backgroundSize: "400% 100%",
    borderRadius: 6,
    height: 14,
    animation: "shimmer 1.4s ease infinite",
  },

  // ── Récap ──
  recapCard: {
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "16px 20px",
    marginBottom: 24,
  },
  recapRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "7px 0",
    borderBottom: "1px solid #f1f5f9",
    fontSize: 14,
  },
  recapLabel: {
    color: "#64748b",
  },
  recapValue: {
    color: "#0f172a",
    fontWeight: 500,
  },

  // ── Paiement méthode ──
  methodGrid: {
    display: "flex",
    gap: 10,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  methodBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "10px 16px",
    border: "2px solid #e2e8f0",
    borderRadius: 10,
    cursor: "pointer",
    background: "#fff",
    fontFamily: "inherit",
    color: "#475569",
    transition: "all 0.15s",
    minWidth: 90,
  },
  methodBtnActive: {
    border: "2px solid #0f766e",
    background: "#f0fdfa",
    color: "#0f766e",
    fontWeight: 600,
  },

  // ── Tranches ──
  installGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 14,
    marginBottom: 24,
  },
  installCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "14px 16px",
    background: "#fff",
  },
  installHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  installNum: {
    fontWeight: 600,
    fontSize: 14,
    color: "#0f172a",
  },
  installStatus: {
    fontSize: 11,
    fontWeight: 600,
    padding: "2px 8px",
    borderRadius: 20,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  },
  installRow: {
    display: "flex",
    justifyContent: "space-between",
    fontSize: 13,
    padding: "3px 0",
  },
  installLabel: { color: "#64748b" },
  installValue: { fontWeight: 500, color: "#0f172a" },

  // ── Simulation ──
  simBox: {
    background: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "16px 18px",
    marginBottom: 20,
    display: "flex",
    flexDirection: "column",
  },
  simLink: {
    display: "inline-block",
    background: "#0f766e",
    color: "#fff",
    borderRadius: 8,
    padding: "8px 16px",
    fontSize: 13,
    fontWeight: 600,
    textDecoration: "none",
    alignSelf: "flex-start",
  },

  // ── Confirmation ──
  successBanner: {
    textAlign: "center",
    marginBottom: 28,
    paddingBottom: 24,
    borderBottom: "1px solid #f1f5f9",
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#0f766e",
    color: "#fff",
    fontSize: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 12px",
  },
  confirmGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 20,
    marginBottom: 28,
    "@media (max-width: 600px)": {
      gridTemplateColumns: "1fr",
    },
  },
  confirmCard: {
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: "#0f172a",
    margin: "0 0 14px",
  },
  qrWrapper: {
    background: "#fff",
    padding: 16,
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    display: "inline-flex",
  },

  // ── Mode paiement sélecteur ──
  modeSelector: {
    margin: "20px 0",
    padding: "18px 20px",
    background: "#f8fafc",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
  },
  modeSelectorTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    margin: "0 0 14px",
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
  },
  modeBtn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "14px 12px",
    border: "2px solid #e2e8f0",
    borderRadius: 10,
    cursor: "pointer",
    background: "#fff",
    fontFamily: "inherit",
    transition: "all 0.15s",
    gap: 4,
  },
  modeBtnActive: {
    border: "2px solid #0f766e",
    background: "#f0fdfa",
    boxShadow: "0 0 0 3px rgba(15,118,110,0.1)",
  },
  modeIcon: {
    fontSize: 22,
  },
  modeName: {
    fontSize: 13,
    fontWeight: 600,
    color: "#0f172a",
  },
  modeDesc: {
    fontSize: 11,
    color: "#64748b",
    textAlign: "center",
  },

  // ── Boutons ──
  navRow: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 12,
    paddingTop: 8,
    borderTop: "1px solid #f1f5f9",
    marginTop: 8,
  },
  btn: {
    padding: "10px 22px",
    borderRadius: 8,
    border: "none",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "all 0.15s",
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  btnPrimary: {
    background: "#0f766e",
    color: "#fff",
  },
  btnSecondary: {
    background: "#f1f5f9",
    color: "#475569",
  },
  btnDisabled: {
    opacity: 0.45,
    cursor: "not-allowed",
  },
  retryBtn: {
    marginLeft: 12,
    background: "transparent",
    border: "1px solid currentColor",
    borderRadius: 6,
    padding: "3px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontFamily: "inherit",
  },

  // ── États ──
  loadingBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "24px 0",
    color: "#64748b",
    fontSize: 14,
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: "50%",
    border: "2px solid #e2e8f0",
    borderTopColor: "#0f766e",
    animation: "spin 0.8s linear infinite",
  },
  errorBox: {
    background: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#991b1b",
    borderRadius: 8,
    padding: "12px 16px",
    fontSize: 13,
    marginBottom: 16,
    display: "flex",
    alignItems: "center",
  },
  emptyBox: {
    textAlign: "center",
    padding: "24px",
    color: "#94a3b8",
    fontSize: 14,
  },
};