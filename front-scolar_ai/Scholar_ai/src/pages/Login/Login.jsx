import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginUser, clearAuthError } from '../../reducer/authSlice';
import { FiCoffee, FiBookOpen, FiSun , FiEye, FiEyeOff } from 'react-icons/fi';
import { TfiLightBulb } from "react-icons/tfi";
import { FaGoogle, FaFacebookF, FaApple } from 'react-icons/fa';
import './login.css';
import logo from '../../assets/logo_sai.png';
import { PiStudentBold } from 'react-icons/pi';
import { CheckCircle } from 'lucide-react';
export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (email || password) {
      dispatch(clearAuthError());
    }
  }, [email, password, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/user/dashboard',{ replace: false });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(loginUser({ email, password }));
  };

  return (
    <div className="login-container">
      
      {/* HEADER BAR */}
      <header className="login-header">
        <div className="login-logo-wrapper">
          {/* <div className="login-logo-box"> */}
            {/* Remplacement du texte par l'image du logo de la maquette */}
            {/* <img src={logo} alt="Scholar AI Logo" className="login-logo-img" /> */}
            {/* S.AI */}
          {/* </div> */}
          {/* <span className="login-brand-name">Scholar AI</span> */}
          <div className="home__logo-icon">
            {/* <FileText className="home__logo-file" /> */}
            <PiStudentBold className="home__logo-file" />
            <CheckCircle className="home__logo-check" />
          </div>
          <span className="home__logo-text">Scholar AI</span>
        </div>

        <div className="login-signup-link">
          Doesn't have an account? <a href="/signup">Sign up</a>
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
            Bienvenue sur <br />
            <span className="login-title-highlight">Scholar AI</span>
          </h1>
          <p className="login-subtitle">C'est un plaisir de vous rencontrer</p>
        </div>

        {/* COLONNE DROITE (FORMULAIRE DE CONNEXION) */}
        <div className="login-right-col">
          <div className="icon-decorator icon-bulb"><TfiLightBulb  /></div>

          <h2 className="login-box-title">Sign in</h2>

          {error && <div className="login-error-box">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form-group">
            <div>
              <label className="login-label">Email</label>
              <input
                type="email"
                placeholder="example.email@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="login-input"
              />
            </div>

            <div>
              <label className="login-label">Password</label>
              <div className="login-password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter at least 8+ characters"
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

            <div className="login-options">
              <label className="login-checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="login-checkbox"
                />
                <span>Remember me</span>
              </label>
              <a href="/forgot" className="login-forgot-link">Forgot password?</a>
            </div>

            <button type="submit" disabled={loading} className="login-btn-submit">
              {loading && <span className="login-spinner"></span>}
              Sign in
            </button>
          </form>

          {/* SÉPARATEUR EN LIGNE FIN */}
          <div className="login-separator">
            <span className="login-separator-text">Or sign in with</span>
            <div className="login-separator-line"></div>
          </div>

          {/* BOUTONS SOCIAUX HARMONISÉS */}
          <div className="login-social-wrapper">
            <button className="login-social-btn google"><FaGoogle /></button>
            <button className="login-social-btn facebook"><FaFacebookF /></button>
            <button className="login-social-btn apple"><FaApple /></button>
          </div>

        </div>
      </main>

      {/* EFFET DE FOND : LE GRAND DÔME BLEU/VIOLET DE LA MAQUETTE */}
      <div className="login-bg-dome"></div>
    </div>
  );
}