// EmailSentPage.jsx
import { useLocation, useNavigate } from "react-router-dom"; // ← import manquant
import { useSelector } from "react-redux";
import EmailVerification from "../../components/Emailverification "; // ← adaptez le chemin

export default function EmailSentPage() {
  const { state }  = useLocation();
  const navigate   = useNavigate();
  const { user }   = useSelector(s => s.auth);

  // Priorité : state de navigation → authSlice
  const email = state?.email ?? user?.email ?? "";

  return (
    <EmailVerification
      mode="sent"
      email={email}
      onNavigateLogin={() => navigate("/login")}
    />
  );
}