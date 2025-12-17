import React, { createContext, useContext, useState, useEffect } from 'react';
import { STORAGE_KEY_USER, STORAGE_KEY_SESSION } from '../constants';

interface AuthContextType {
  isAuthenticated: boolean;
  userExists: boolean;
  login: (username: string, pass: string) => boolean;
  register: (username: string, pass: string) => void;
  logout: () => void;
  currentUser: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userExists, setUserExists] = useState(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);

  useEffect(() => {
    // Check if user is already registered
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (storedUser) {
      setUserExists(true);
      const parsedUser = JSON.parse(storedUser);
      // Check if session is active (optional, keeps user logged in on refresh)
      const session = localStorage.getItem(STORAGE_KEY_SESSION);
      if (session === 'true') {
        setIsAuthenticated(true);
        setCurrentUser(parsedUser.username);
      }
    }
  }, []);

  const login = (username: string, pass: string): boolean => {
    const storedUser = localStorage.getItem(STORAGE_KEY_USER);
    if (!storedUser) return false;

    const parsed = JSON.parse(storedUser);
    if (parsed.username === username && parsed.password === pass) {
      setIsAuthenticated(true);
      setCurrentUser(username);
      localStorage.setItem(STORAGE_KEY_SESSION, 'true');
      return true;
    }
    return false;
  };

  const register = (username: string, pass: string) => {
    const user = { username, password: pass };
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    setUserExists(true);
    // Auto login after register
    setIsAuthenticated(true);
    setCurrentUser(username);
    localStorage.setItem(STORAGE_KEY_SESSION, 'true');
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_SESSION);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userExists, login, register, logout, currentUser }}>
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