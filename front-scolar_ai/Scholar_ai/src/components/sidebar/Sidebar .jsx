import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../reducer/authSlice';

import { FaRegMoon, FaUsers, FaSignOutAlt, FaSignInAlt,FaUserCog  } from 'react-icons/fa';
import { GoSun, GoHome, GoCreditCard } from 'react-icons/go';
import { LuLayoutDashboard } from "react-icons/lu";
import { GrDocumentUser,GrDocumentCloud } from "react-icons/gr";
import { RxDashboard } from "react-icons/rx";
import {
  MdBusiness,
  MdAdminPanelSettings, MdHistory, MdSettings, MdMenu, MdClose,
} from 'react-icons/md';

import './Sidebar.css';
import { TbDeviceDesktopAnalytics } from 'react-icons/tb';

/* ── nav configs ── */
const PubLinks = [
  { icon: <GoHome />,               label: 'Accueil',           link: '/home' },
  { icon: <GoCreditCard />,         label: 'Plan',              link: '/plan' },
  { icon: <MdBusiness />,           label: 'Service',           link: '/service' },
];

const UserLinks = [
  { icon: <LuLayoutDashboard  />,        label: 'Dashboard',         link: '/user/dashboard' },
  { icon: <GoCreditCard />,            label: 'Abonnement',        link: '/user/abonnement' },
  { icon: <GrDocumentUser  />,        label: 'Mes Abonnement',         link: '/user/mes_abonnement' },
  { icon: <FaUserCog  />,        label: 'Condition',         link: '/user/condition' },
  { icon: <TbDeviceDesktopAnalytics  />,        label: 'Analyse',         link: '/user/file_analyzer' },
];

const SecretariatLinks = [
  { icon: <MdAdminPanelSettings />, label: 'Template & Lettre', link: '/admin/template_letter' },
  { icon: <MdHistory />,            label: 'Audit',             link: '/admin/audit' },
];

const AdminLinks = [
  // ...UserLinks,
  { icon: <RxDashboard />,              label: 'Dashboard',      link: '/admin/dashboard' },
  { icon: <FaUsers />,              label: 'Utilisateurs',      link: '/admin/users' },
  { icon: <GoCreditCard />, label: 'Gestion de payement', link: '/admin/payment' },
  { icon: <GrDocumentCloud />, label: 'Gestion de abonnement', link: '/admin/abonnement' },
  { icon: <MdHistory />,            label: 'Audit',             link: '/admin/audit' },
];

function getLinks(role, isAuthenticated) {
  if (!isAuthenticated) return PubLinks;
  if (role === 'admin')        return AdminLinks;
  if (role === 'secretariat')  return SecretariatLinks;
  return UserLinks;
}

/* ── component ── */
const Sidebar = ({ darkMode, toggleDarkMode }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Source unique de vérité : Redux store
  const { isAuthenticated, role } = useSelector((state) => state.auth);

  const links = getLinks(role, isAuthenticated);

  const handleLogOut = () => {
    dispatch(logout());      // nettoie localStorage + reset Redux
    setMobileOpen(false);
    navigate('/');
  };

  // Fermer le menu mobile au changement de route
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      {/* Mobile hamburger */}
      <button
        className="sidebar-mobile-toggle"
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <MdClose /> : <MdMenu />}
      </button>

      <aside className={`sidebar${darkMode ? ' dark' : ''}${mobileOpen ? ' mobile-open' : ''}`}>

        {/* Logo */}
        <div className="sidebar-logo">
          <span>Al<em>.S</em></span>
        </div>

        {/* Nav links */}
        <nav className="sidebar-nav">
          {links.map((item) => (
            <Link
              key={item.link}
              to={item.link}
              className={`sidebar-item${location.pathname === item.link ? ' active' : ''}`}
              aria-label={item.label}
            >
              {item.icon}
              <span className="tooltip">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Divider */}
        <div className="sidebar-divider" />

        {/* Bottom controls */}
        <div className="sidebar-bottom">

          {/* Dark mode toggle */}
          <button
            className="sidebar-theme-btn"
            onClick={toggleDarkMode}
            aria-label="Basculer le thème"
          >
            {darkMode ? <GoSun /> : <FaRegMoon />}
          </button>

          {/* Settings */}
          <Link to="/settings" className="sidebar-item" aria-label="Paramètres">
            <MdSettings />
            <span className="tooltip">Paramètres</span>
          </Link>

          {/* Login / Logout */}
          {isAuthenticated ? (
            <button
              className="sidebar-auth-btn"
              onClick={handleLogOut}
              aria-label="Déconnexion"
              title="Déconnexion"
            >
              <FaSignOutAlt />
            </button>
          ) : (
            <Link to="/login" className="sidebar-auth-btn" aria-label="Connexion" title="Connexion">
              <FaSignInAlt />
            </Link>
          )}

        </div>
      </aside>
    </>
  );
};

export default Sidebar;