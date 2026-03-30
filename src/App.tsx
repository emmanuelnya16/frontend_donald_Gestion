/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { User } from './types';
import { authService } from './services/authService';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import LandingPage from './components/LandingPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      const token = localStorage.getItem('nexus_jwt_token');
      
      if (token) {
        try {
          // Fetch real user data from backend
          const userData = await authService.getCurrentUser();
          const mappedUser: User = {
            ...userData,
            role: authService.mapRole(userData.role),
            boutiqueId: userData.boutique?.id || userData.boutiqueId
          };
          setUser(mappedUser);
          setShowLanding(false);
        } catch (err) {
          console.error('Failed to fetch user with token:', err);
          localStorage.removeItem('nexus_jwt_token');
          localStorage.removeItem('nexus_current_user');
        }
      }
      setLoading(false);
    };

    initApp();
  }, []);

  const handleLogin = (loggedInUser: User, token?: string) => {
    if (token) {
      localStorage.setItem('nexus_jwt_token', token);
    }
    localStorage.setItem('nexus_current_user', JSON.stringify(loggedInUser));
    setUser(loggedInUser);
    setShowLanding(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexus_jwt_token');
    localStorage.removeItem('nexus_current_user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-light">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-blue"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-light">
      {!user ? (
        showLanding ? (
          <LandingPage onGoToLogin={() => setShowLanding(false)} />
        ) : (
          <Login onLogin={handleLogin} onBack={() => setShowLanding(true)} />
        )
      ) : (
        <Dashboard user={user} onLogout={handleLogout} />
      )}
    </div>
  );
}
