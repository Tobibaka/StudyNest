import { create } from "zustand";
import type { StateCreator } from "zustand";
import { db } from "@store/db";

export interface UserSession {
  username: string;
}

type AuthStatus = "initializing" | "authenticated" | "unauthenticated";

interface AuthState {
  status: AuthStatus;
  user: UserSession | null;
  mode: "signin" | "signup";
  message: string | null;
  bootstrap: () => void;
  toggleMode: () => void;
  login: (username: string, password: string) => Promise<boolean>;
  signup: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const hashCredential = async (username: string, password: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${username.toLowerCase()}::${password}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
};

const SESSION_KEY = "studynest:session";

const authCreator: StateCreator<AuthState, [], [], AuthState> = (set, get) => ({
  status: "initializing",
  user: null,
  mode: "signin",
  message: null,
  bootstrap: () => {
    const stored = localStorage.getItem(SESSION_KEY);
    if (stored) {
      set({ user: { username: stored }, status: "authenticated" });
    } else {
      set({ status: "unauthenticated" });
    }
  },
  toggleMode: () => {
    set((state) => ({
      mode: state.mode === "signin" ? "signup" : "signin",
      message: null
    }));
  },
  login: async (username: string, password: string) => {
    try {
      const credential = await db.credentials.get(username.toLowerCase());
      if (!credential) {
        set({ message: "User not found" });
        return false;
      }
      const hash = await hashCredential(username, password);
      if (hash !== credential.passwordHash) {
        set({ message: "Incorrect password" });
        return false;
      }
      localStorage.setItem(SESSION_KEY, credential.username);
      set({ user: { username: credential.username }, status: "authenticated", message: null });
      return true;
    } catch (error) {
      console.error(error);
      set({ message: "Failed to sign in" });
      return false;
    }
  },
  signup: async (username: string, password: string) => {
    try {
      const normalized = username.toLowerCase();
      const existing = await db.credentials.get(normalized);
      if (existing) {
        set({ message: "Username already exists" });
        return false;
      }
      const hash = await hashCredential(username, password);
      await db.credentials.put({
        username: normalized,
        passwordHash: hash,
        createdAt: new Date().toISOString()
      });
      localStorage.setItem(SESSION_KEY, normalized);
      set({ user: { username: normalized }, status: "authenticated", message: null });
      return true;
    } catch (error) {
      console.error(error);
      set({ message: "Failed to sign up" });
      return false;
    }
  },
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    set({ user: null, status: "unauthenticated", message: null, mode: "signin" });
  }
});

export const useAuthStore = create<AuthState>(authCreator);
