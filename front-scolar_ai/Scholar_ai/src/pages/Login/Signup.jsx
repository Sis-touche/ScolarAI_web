import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, clearAuthError } from '../../reducer/authSlice'; // à créer si nécessaire
import { FiEye, FiEyeOff, FiUser, FiMail, FiLock ,FiCoffee ,FiBookOpen,FiSun } from 'react-icons/fi';
import { FaGoogle, FaFacebookF, FaApple } from 'react-icons/fa';
import { TfiLightBulb } from "react-icons/tfi";
import { PiStudentBold } from 'react-icons/pi';
import { CheckCircle } from 'lucide-react';
import './login.css'; // on réutilise le même fichier CSS (ou on crée signup.css)

export default function Signup() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  // Effacer l'erreur quand l'utilisateur modifie un champ
  useEffect(() => {
    if (firstName || lastName || email || password || confirmPassword) {
      dispatch(clearAuthError());
    }
  }, [firstName, lastName, email, password, confirmPassword, dispatch]);

  // Redirection après inscription réussie
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/user/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName || !lastName || !email || !password || !confirmPassword) {
      return;
    }
    if (password !== confirmPassword) {
      // Vous pouvez gérer cette erreur localement ou via Redux
      dispatch({ type: 'auth/setError', payload: 'Les mots de passe ne correspondent pas.' });
      return;
    }
    if (!acceptTerms) {
      dispatch({ type: 'auth/setError', payload: 'Vous devez accepter les conditions d\'utilisation.' });
      return;
    }
    navigate("/email-sent", { state: { email: email } });
    dispatch(registerUser({ firstName, lastName, email, password }));
  };

  return (
    <div className="login-container">
      {/* HEADER BAR */}
      <header className="login-header">
        <div className="login-logo-wrapper">
          <div className="home__logo-icon">
            <PiStudentBold className="home__logo-file" />
            <CheckCircle className="home__logo-check" />
          </div>
          <span className="home__logo-text">Scholar AI</span>
        </div>
        <div className="login-signup-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </header>

      {/* CORPS PRINCIPAL */}
      <main className="login-main">
        {/* COLONNE GAUCHE (DÉCORATIONS & TITRE) */}
        <div className="login-left-col">
          <div className="icon-decorator icon-coffee"><FiCoffee /></div>
          <div className="icon-decorator icon-book"><FiBookOpen /></div>
          <div className="icon-decorator icon-sun"><FiSun /></div>

          <h1 className="login-title">
            Rejoignez <br />
            <span className="login-title-highlight">Scholar AI</span>
          </h1>
          <p className="login-subtitle">Créez votre compte gratuitement</p>
        </div>

        {/* COLONNE DROITE (FORMULAIRE D'INSCRIPTION) */}
        <div className="login-right-col signup-right-col">
          <div className="icon-decorator icon-bulb"><TfiLightBulb /></div>

          <h2 className="login-box-title">Create account</h2>

          {error && <div className="login-error-box">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form-group">
            <div className="signup-name-row">
              <div className="signup-field">
                <label className="login-label">First name</label>
                <div className="login-input-wrapper">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    placeholder="John"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="login-input"
                  />
                </div>
              </div>
              <div className="signup-field">
                <label className="login-label">Last name</label>
                <div className="login-input-wrapper">
                  <FiUser className="input-icon" />
                  <input
                    type="text"
                    placeholder="Doe"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="login-input"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="login-label">Email</label>
              <div className="login-input-wrapper">
                <FiMail className="input-icon" />
                <input
                  type="email"
                  placeholder="example.email@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="login-input"
                />
              </div>
            </div>

            <div>
              <label className="login-label">Password</label>
              <div className="login-password-wrapper">
                <FiLock className="input-icon password-icon" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password (8+ characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="login-input"
                />
                <span
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <FiEye /> : <FiEyeOff />}
                </span>
              </div>
            </div>

            <div>
              <label className="login-label">Confirm password</label>
              <div className="login-password-wrapper">
                <FiLock className="input-icon password-icon" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="login-input"
                />
                <span
                  className="login-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? <FiEye /> : <FiEyeOff />}
                </span>
              </div>
            </div>

            <div className="login-options">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="login-checkbox"
                />
                <span>I accept the <a href="/terms" target="_blank">Terms of Use</a> and <a href="/privacy" target="_blank">Privacy Policy</a></span>
              </label>
            </div>

            <button type="submit" disabled={loading} className="login-btn-submit">
              {loading && <span className="login-spinner"></span>}
              Create account
            </button>
          </form>

          <div className="login-separator">
            <span className="login-separator-text">Or sign up with</span>
            <div className="login-separator-line"></div>
          </div>

          <div className="login-social-wrapper">
            <button className="login-social-btn google"><FaGoogle /></button>
            <button className="login-social-btn facebook"><FaFacebookF /></button>
            <button className="login-social-btn apple"><FaApple /></button>
          </div>
        </div>
      </main>

      <div className="login-bg-dome"></div>
    </div>
  );
}