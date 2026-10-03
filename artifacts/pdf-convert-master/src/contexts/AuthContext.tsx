import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { User } from "@workspace/db";

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  signin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  /** Step 1 of signup: emails a verification code. Does NOT log the user in. */
  signup: (email: string, password: string, name?: string) => Promise<{ success: boolean; error?: string }>;
  /** Step 2 of signup: verifies the emailed code, creates the account, logs in. */
  verifySignupOtp: (email: string, code: string) => Promise<{ success: boolean; error?: string }>;
  /** Google OAuth: exchanges the popup authorization code for a session, logs in. */
  googleSignin: (code: string) => Promise<{ success: boolean; error?: string; isNewUser?: boolean }>;
  signout: () => void;
  updateUser: (user: User, token?: string) => void;
  /** Re-fetch the signed-in user from the backend (e.g. after a plan change). */
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on mount
  useEffect(() => {
    const storedToken = localStorage.getItem("auth_token");
    if (storedToken) {
      setToken(storedToken);
      // Verify token with backend
      checkAuthStatus(storedToken);
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuthStatus = async (authToken: string) => {
    try {
      const response = await fetch("/api/user", {
        headers: {
          "Authorization": `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUser(data.data.user);
          setToken(authToken);
        } else {
          // Token is invalid
          localStorage.removeItem("auth_token");
          setToken(null);
          setUser(null);
        }
      } else {
        // Token is invalid or expired
        localStorage.removeItem("auth_token");
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      localStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signin = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success) {
        const { user: userData, token: authToken } = data.data;
        setUser(userData);
        setToken(authToken);
        localStorage.setItem("auth_token", authToken);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Sign in failed" };
      }
    } catch (error) {
      console.error("Sign in error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  // Step 1: submit credentials. The backend stashes them and emails a code; the
  // account is NOT created and the user is NOT logged in until verifySignupOtp.
  const signup = async (
    email: string,
    password: string,
    name?: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password, ...(name ? { name } : {}) }),
      });

      const data = await response.json();

      if (data.success) {
        return { success: true };
      } else {
        return { success: false, error: data.error || "Sign up failed" };
      }
    } catch (error) {
      console.error("Sign up error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  // Step 2: verify the emailed code. On success the backend creates the account
  // and returns a token, so we log the user in here (parity with the old
  // auto-login behaviour, now gated behind email verification).
  const verifySignupOtp = async (
    email: string,
    code: string,
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch("/api/auth/verify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (data.success) {
        const { user: userData, token: authToken } = data.data ?? {};
        if (!userData || !authToken) {
          return { success: false, error: "Verification failed. Please try again." };
        }
        setUser(userData);
        setToken(authToken);
        localStorage.setItem("auth_token", authToken);
        return { success: true };
      } else {
        return { success: false, error: data.error || "Invalid or expired code" };
      }
    } catch (error) {
      console.error("Verify signup error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  // Google sign-in: the browser obtains an authorization code via the Google
  // popup, then we hand it to the backend which verifies it and returns the same
  // session token email/password login does. Find-or-create happens server-side.
  const googleSignin = async (
    code: string,
  ): Promise<{ success: boolean; error?: string; isNewUser?: boolean }> => {
    try {
      const response = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (data.success) {
        const { user: userData, token: authToken, isNewUser } = data.data ?? {};
        if (!userData || !authToken) {
          return { success: false, error: "Google sign-in failed. Please try again." };
        }
        setUser(userData);
        setToken(authToken);
        localStorage.setItem("auth_token", authToken);
        return { success: true, isNewUser: !!isNewUser };
      } else {
        return { success: false, error: data.error || "Google sign-in failed" };
      }
    } catch (error) {
      console.error("Google sign-in error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  };

  const signout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("auth_token");
    // Hard-navigate home so account-only screens (Dashboard, Usage Statistics)
    // and any in-memory conversion state are fully torn down. Without this the
    // user could be left on a stale page showing download buttons for files the
    // backend will now refuse (their jobs require their token).
    if (typeof window !== "undefined") {
      window.location.href = import.meta.env.BASE_URL || "/";
    }
  };

  // Merge fresh user data (and optionally a reissued token) into state after a
  // profile/avatar update so the UI reflects changes without a full reload.
  const updateUser = (updatedUser: User, newToken?: string) => {
    setUser(updatedUser);
    if (newToken) {
      setToken(newToken);
      localStorage.setItem("auth_token", newToken);
    }
  };

  // Re-pull the user record from the backend without a full reload. Used after a
  // Dodo checkout returns so the freshly-activated plan shows up once the webhook
  // has reconciled it.
  const refreshUser = async () => {
    const authToken = token || localStorage.getItem("auth_token");
    if (!authToken) return;
    try {
      const response = await fetch("/api/user", {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) setUser(data.data.user);
      }
    } catch (error) {
      console.error("Refresh user failed:", error);
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    signin,
    signup,
    verifySignupOtp,
    googleSignin,
    signout,
    updateUser,
    refreshUser,
    isAuthenticated: !!user && !!token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}