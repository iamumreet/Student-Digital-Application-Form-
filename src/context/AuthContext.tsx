import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const AUTHORIZED_STAFF_PRIMARY_EMAIL = 'umreetkumar@gmail.com';
export const AUTHORIZED_STAFF_EMAILS: readonly string[] = [
  'umreetkumar@gmail.com',
  'reception.pathfinders@gmail.com',
  'admission@pathfinders.com.np',
  'bdm@pathfinders.com.np',
  'director@pathfinders.com.np',
  'australia@pathfinders.com.np',
  'info@pathfinders.com.np',
  'uk@pathfinders.com.np',
  'ubmotionpicturesmusic@gmail.com', // AI Studio workspace administrator account
];

/**
 * Normalizes an email address to lowercase and checks against authorized staff accounts
 */
export const isAuthorizedStaffEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const normalized = email.toLowerCase().trim();
  return AUTHORIZED_STAFF_EMAILS.some((allowed) => allowed.toLowerCase().trim() === normalized);
};

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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  isStaff: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [accessDeniedError, setAccessDeniedError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user: User | null) => {
      if (user) {
        const isAuthorized = isAuthorizedStaffEmail(user.email);

        if (isAuthorized) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || 'Pathfinder Admissions Staff',
            role: 'Authorized Admissions Officer',
            avatar: user.photoURL || undefined,
          });
          setAccessDeniedError(null);
        } else {
          // If signed in with an unauthorized account, sign out immediately
          fbSignOut(auth).catch(() => {});
          setCurrentUser(null);
          setAccessDeniedError(
            `Access Denied (${user.email}): You are not authorized to access the Pathfinder Staff Portal. Access is restricted to authorized Pathfinder staff accounts.`
          );
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const clearAccessDenied = () => {
    setAccessDeniedError(null);
  };

  const loginWithGoogle = async () => {
    setAccessDeniedError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    try {
      const result = await signInWithPopup(auth, provider);
      const isAuthorized = isAuthorizedStaffEmail(result.user.email);

      if (!isAuthorized) {
        await fbSignOut(auth);
        const errMsg = `Access Denied (${result.user.email}): Access is restricted to authorized Pathfinder staff accounts.`;
        setAccessDeniedError(errMsg);
        throw new Error(errMsg);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        if (err.message.includes('popup-closed-by-user')) {
          return;
        }
        throw err;
      }
      throw new Error('Sign-in failed. Please try again.');
    }
  };

  const logout = async () => {
    setCurrentUser(null);
    setAccessDeniedError(null);
    try {
      await fbSignOut(auth);
    } catch (err) {
      console.warn('Firebase sign-out warning:', err);
    }
  };

  const isStaff = !!currentUser && isAuthorizedStaffEmail(currentUser.email);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        accessDeniedError,
        clearAccessDenied,
        loginWithGoogle,
        logout,
        isStaff,
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
