// Layout.jsx
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Sidebar from '../../components/sidebar/Sidebar ';

export default function Layout() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);

  return (
    <div className={`app-layout${darkMode ? ' dark' : ''}`} style={{ display: 'flex' }}>
      
      {/* Sidebar fixée à gauche */}
      <Sidebar darkMode={darkMode} toggleDarkMode={() => setDarkMode(v => !v)} />

      {/* Contenu principal décalé de la largeur de la sidebar */}
      <main style={{ marginLeft: '72px', flex: 1, minHeight: '100vh' }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>

    </div>
  );
}