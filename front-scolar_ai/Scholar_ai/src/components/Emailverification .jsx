// EmailVerification.jsx
// Deux usages :
//   1. /email-sent          → confirmation que l'email a été envoyé
//   2. /verify-email?token= → vérification du token et résultat

import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { verifyEmail, resetVerification } from "../reducer/verificationSlice";
import { useNavigate } from "react-router-dom";
// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const getTokenFromUrl = () => {
  const params = new URLSearchParams(window.location.search);
  return params.get("token");
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANTS VISUELS AJUSTÉS AU DESIGN
// ─────────────────────────────────────────────────────────────────────────────

// Icône d'enveloppe stylisée inspirée de la capture d'écran
function StatusCircle({ status }) {
  // L'icône principale enveloppe selon le design
  return (
    <div style={{
      position: "relative",
      width: 110,
      height: 110,
      background: "#ffffff",
      border: "1px solid #e2e8f0",
      borderRadius: "16px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin: "0 auto 32px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.02)"
    }}>
      {/* Petite bulle de notification email en haut à droite */}
      <div style={{
        position: "absolute",
        top: -6,
        right: -6,
        width: 24,
        height: 24,
        background: "#7dd3fc",
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 12,
        color: "#002147",
        border: "2px solid #fff"
      }}>
        ✉
      </div>
      
      {/* Icône enveloppe centrale */}
      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#002147" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
        {/* Petit point de notification intérieur */}
        <circle cx="18" cy="10" r="2" fill="#002147" />
      </svg>

      {/* Indicateur de statut discret pour le chargement / erreur / succès */}
      {status === "loading" && (
        <div style={{
          position: "absolute", bottom: -5, width: 20, height: 20, 
          borderRadius: "50%", border: "2px solid #e2e8f0", borderTopColor: "#002147",
          animation: "spin 0.8s linear infinite"
        }} />
      )}
      {status === "success" && (
        <div style={{ position: "absolute", bottom: -5, background: "#22c55e", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold" }}>✓</div>
      )}
      {status === "error" && (
        <div style={{ position: "absolute", bottom: -5, background: "#ef4444", color: "#fff", borderRadius: "50%", width: 20, height: 20, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: "bold" }}>✕</div>
      )}
    </div>
  );
}

// Bouton principal Bleu Nuit avec icône de redirection externe
function PrimaryButton({ children, onClick, href, style = {} }) {
  const base = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 10,
    padding: "14px 32px", borderRadius: "4px",
    background: "#002147", // Bleu nuit de la capture
    color: "#fff", fontWeight: "500", fontSize: 14,
    border: "none", cursor: "pointer", fontFamily: "inherit",
    transition: "background 0.2s", textDecoration: "none",
    width: "100%", maxWidth: "340px", boxSizing: "border-box",
    ...style,
  };

  const content = (
    <>
      {children}
      {/* Icône de redirection externe de l'image */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </svg>
    </>
  );

  if (href) return <a href={href} style={base}>{content}</a>;
  return <button onClick={onClick} style={base}>{content}</button>;
}

// ─────────────────────────────────────────────────────────────────────────────
// VUE 1 — Email envoyé (page /email-sent)
// ─────────────────────────────────────────────────────────────────────────────
function EmailSentView({ email }) {
  const [resent,    setResent]    = useState(false);
  const [countdown, setCountdown] = useState(0);

  const handleResend = () => {
    setResent(true);
    setCountdown(60);
  };

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  return (
    <div style={S.container}>
      <StatusCircle status="sent" />

      <h1 style={S.title}>Vérifiez votre boîte de réception</h1>
      
      <p style={S.subtitle}>
        Nous avons envoyé un lien d'activation. Veuillez cliquer dessus pour activer votre compte.
        {email && <span style={{ display: "block", marginTop: "8px", fontWeight: "600", color: "#002147" }}>({email})</span>}
      </p>

      <div style={{ margin: "24px 0 32px" }}>
        <PrimaryButton href="mailto:">
          Ouvrir ma messagerie
        </PrimaryButton>
      </div>

      {/* Séparateur en 3 lignes horizontales comme l'image */}
      <div style={S.tripleDivider}>
        <div style={S.divLine} />
        <div style={S.divLine} />
        <div style={S.divLine} />
      </div>

      {/* Section de Renvoi */}
      <div style={S.resendSection}>
        <p style={S.resendText}>Vous n'avez rien reçu ?</p>
        {countdown > 0 ? (
          <span style={S.countdown}>Renvoyer dans {countdown}s</span>
        ) : (
          <button onClick={handleResend} style={S.linkBtn}>
            {resent ? "✓ Email renvoyé" : "Renoyer l'e-mail"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// VUE 2 — Résultat de vérification (page /verify-email?token=...)
// ─────────────────────────────────────────────────────────────────────────────
function VerifyTokenView({ onNavigateLogin }) {
  const dispatch = useDispatch();
  const navigate = useNavigate(); // ← pour la navigation
  const { verificationStatus, message, error } = useSelector(s => s.emailVerification);

  useEffect(() => {
    const token = getTokenFromUrl();
    if (token && verificationStatus === "idle") {
      dispatch(verifyEmail(token));
    }
    return () => { dispatch(resetVerification()); };
  }, [dispatch]);

  const handleLoginRedirect = () => {
    // if (onNavigateLogin) onNavigateLogin();
    // else 
      navigate("/login",{replace:false}); // ← navigation React Router
  };

  // ── Chargement ──
  if (verificationStatus === "idle" || verificationStatus === "loading") {
    return (
      <div style={S.container}>
        <StatusCircle status="loading" />
        <h1 style={S.title}>Vérification en cours…</h1>
        <p style={S.subtitle}>Nous validons votre adresse email, veuillez patienter.</p>
      </div>
    );
  }

  // ── Succès ──
  if (verificationStatus === "succeeded") {
    return (
      <div style={S.container}>
        <StatusCircle status="success" />
        <h1 style={S.title}>Compte vérifié !</h1>
        <p style={S.subtitle}>
          {message ?? "Votre adresse email a été vérifiée avec succès. Bienvenue sur Scholar AI !"}
        </p>

        <div style={{ margin: "24px 0" }}>
          <PrimaryButton onClick={handleLoginRedirect}>
            Se connecter
          </PrimaryButton>
        </div>

        <AutoRedirect seconds={5} onRedirect={handleLoginRedirect} />
      </div>
    );
  }

  // ── Erreur ──
  if (verificationStatus === "failed") {
    const isExpired  = error?.toLowerCase().includes("expiré") || error?.toLowerCase().includes("expired");
    const isInvalid  = error?.toLowerCase().includes("invalide") || error?.toLowerCase().includes("invalid");

    return (
      <div style={S.container}>
        <StatusCircle status="error" />
        <h1 style={S.title}>
          {isExpired ? "Lien expiré" : isInvalid ? "Lien invalide" : "Échec de la vérification"}
        </h1>
        <p style={S.subtitle}>{error ?? "Une erreur est survenue lors de la vérification."}</p>

        <div style={{ margin: "24px 0 12px" }}>
          <PrimaryButton onClick={() => navigate("/register")}>
            Créer un nouveau compte
          </PrimaryButton>
        </div>
        
        <button onClick={() => navigate("/login")} style={S.secondaryBtn}>
          Retour à la connexion
        </button>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT UTILITAIRE — Compte à rebours avant redirection
// ─────────────────────────────────────────────────────────────────────────────
function AutoRedirect({ seconds, onRedirect }) {
  const [count, setCount] = useState(seconds);

  useEffect(() => {
    if (count <= 0) { onRedirect(); return; }
    const t = setTimeout(() => setCount(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onRedirect]);

  return (
    <p style={{ ...S.resendText, color: "#94a3b8" }}>
      Redirection automatique dans {count}s…
    </p>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPOSANT PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────
export default function EmailVerification({ mode, email, onNavigateLogin }) {
  const hasToken   = !!getTokenFromUrl();
  const activeMode = mode ?? (hasToken ? "verify" : "sent");

  return (
    <div style={S.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
      `}</style>

      {/* Barre supérieure Header "Scholar AI" */}
      <header style={S.header}>
        <span style={S.headerLogo}>Scholar AI</span>
        <div style={S.helpIcon}>?</div>
      </header>

      {/* Contenu principal centré */}
      <main style={S.mainContent}>
        {activeMode === "sent"
          ? <EmailSentView email={email} />
          : <VerifyTokenView onNavigateLogin={onNavigateLogin} />
        }
      </main>

      {/* Section Hub sous le séparateur */}
      <div style={S.hubText}>SCHOLAR AI ACADEMIC HUB</div>

      {/* Pied de page Footer */}
      <footer style={S.footer}>
        © 2024 Scholar AI. Tous droits réservés.
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// TOUT LE DESIGN AJUSTÉ SELON L'IMAGE (Clean & Minimalist)
// ─────────────────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100vh",
    background: "#fcfcfd", // Fond blanc cassé très clair du design original
    display: "flex", 
    flexDirection: "column", 
    alignItems: "center",
    justifyContent: "between",
    fontFamily: "'Inter', system-ui, sans-serif",
    color: "#334155",
    margin: 0,
    padding: 0,
  },
  header: {
    width: "100%",
    height: "60px",
    borderBottom: "1px solid #f1f5f9",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    background: "#fff",
  },
  headerLogo: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#002147",
    letterSpacing: "-0.5px"
  },
  helpIcon: {
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    border: "1px solid #cbd5e1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    color: "#64748b",
    cursor: "pointer"
  },
  mainContent: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
    width: "100%",
    maxWidth: "580px",
    textAlign: "center",
  },
  container: {
    width: "100%",
  },
  title: {
    fontSize: "28px", 
    fontWeight: "600", 
    color: "#002147", // Couleur bleu de l'image
    margin: "0 0 16px 0",
    letterSpacing: "-0.5px"
  },
  subtitle: {
    fontSize: "15px", 
    color: "#334155",
    margin: "0 auto", 
    lineHeight: "1.6",
    maxWidth: "420px",
    fontWeight: "400"
  },
  tripleDivider: {
    display: "flex",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: "420px",
    margin: "0 auto 24px auto",
    gap: "12px"
  },
  divLine: {
    height: "2px",
    background: "#e2e8f0",
    flex: 1
  },
  resendSection: {
    margin: "16px 0",
  },
  resendText: {
    fontSize: "14px",
    color: "#475569",
    margin: "0 0 8px 0"
  },
  linkBtn: {
    background: "none", 
    border: "none",
    color: "#0ea5e9", // Couleur bleu canard/turquoise pour l'action secondaire
    fontSize: "14px", 
    fontWeight: "500",
    cursor: "pointer", 
    fontFamily: "inherit",
    textDecoration: "underline",
  },
  countdown: {
    fontSize: "14px", 
    color: "#94a3b8", 
    fontWeight: "500",
  },
  hubText: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#64748b",
    letterSpacing: "1.5px",
    marginBottom: "80px",
    textAlign: "center"
  },
  footer: {
    padding: "24px",
    fontSize: "12px",
    color: "#64748b",
    textAlign: "center",
    width: "100%"
  },
  secondaryBtn: {
    background: "none",
    border: "none",
    color: "#64748b",
    fontSize: "14px",
    cursor: "pointer",
    textDecoration: "underline",
    fontFamily: "inherit",
    marginTop: "8px"
  }
};