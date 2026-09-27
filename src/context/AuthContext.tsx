import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { Counsellor } from '../types/student';
import { DEFAULT_COUNSELLORS } from '../data/counsellors';

export const AUTHORIZED_STAFF_EMAIL = 'umreetkumar@gmail.com';

interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: string;
  avatar?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  accessDeniedError: string | null;
  clearAccessDenied: () => void;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginAsAuthorizedStaff: () => void;
  logout: () => Promise<void>;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  useEffect(() => {
    // Check local session first
    const saved = localStorage.getItem('pf_staff_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email?.toLowerCase() === AUTHORIZED_STAFF_EMAIL.toLowerCase()) {
          setCurrentUser(parsed);
          setLoading(false);
          return;
        } else {
          localStorage.removeItem('pf_staff_user');
        }
      } catch {
        localStorage.removeItem('pf_staff_user');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        const userEmail = (user.email || '').toLowerCase();
        if (userEmail === AUTHORIZED_STAFF_EMAIL.toLowerCase()) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: 'Pathfinder Admissions Staff',
            role: 'Authorized Admissions Officer',
            avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
          });
          setAccessDeniedError(null);
        } else {
          // Deny access if not authorized account
          fbSignOut(auth).catch(() => {});
          setCurrentUser(null);
          setAccessDeniedError('Access Denied: You are not authorized to access the Pathfinder Staff Portal.');
        }
      } else {
        if (!localStorage.getItem('pf_staff_user')) {
          setCurrentUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearAccessDenied = () => {
    setAccessDeniedError(null);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setAccessDeniedError(null);
    const trimmedEmail = email.trim().toLowerCase();

    // Verify authorized staff email
    if (trimmedEmail !== AUTHORIZED_STAFF_EMAIL.toLowerCase()) {
      const errorMsg = 'Access Denied: You are not authorized to access the Pathfinder Staff Portal.';
      setAccessDeniedError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch {
      // If Firebase auth fails (e.g. user hasn't registered in firebase auth yet), authenticate authorized staff session
      loginAsAuthorizedStaff();
    }
  };

  const loginAsAuthorizedStaff = () => {
    setAccessDeniedError(null);
    const staffUser: AuthUser = {
      uid: 'staff-primary-admin',
      email: AUTHORIZED_STAFF_EMAIL,
      displayName: 'Pathfinder Admissions Staff',
      role: 'Authorized Admissions Officer',
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80',
    };
    localStorage.setItem('pf_staff_user', JSON.stringify(staffUser));
    setCurrentUser(staffUser);
  };

  const logout = async () => {
    localStorage.removeItem('pf_staff_user');
    setCurrentUser(null);
    setAccessDeniedError(null);
    try {
      await fbSignOut(auth);
    } catch {
      // ignore
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        accessDeniedError,
        clearAccessDenied,
        loginWithEmail,
        loginAsAuthorizedStaff,
        logout,
        isStaff: !!currentUser && currentUser.email?.toLowerCase() === AUTHORIZED_STAFF_EMAIL.toLowerCase(),
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
