import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { appClient } from '@/api/appClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    setIsLoadingAuth(true);
    try {
      if (appClient.auth.isLoggedIn()) {
        const currentUser = await appClient.auth.me();
        setUser(currentUser);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch {
      setUser(null);
      setIsAuthenticated(false);
    }
    setIsLoadingAuth(false);
  };

  const loginUser = useCallback((userData) => {
    setUser(userData);
    setIsAuthenticated(true);
  }, []);

  const logout = useCallback(() => {
    appClient.auth.logout();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError: null,
        appPublicSettings: null,
        loginUser,
        logout,
        navigateToLogin: () => {},
        checkAppState: checkSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
