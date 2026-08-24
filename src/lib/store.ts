import { create } from 'zustand';
import { User, AppSettings } from '../types';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: JSON.parse(localStorage.getItem('te_current_user') || 'null'),
  isAuthenticated: !!localStorage.getItem('te_current_user'),
  login: (user) => {
    localStorage.setItem('te_current_user', JSON.stringify(user));
    set({ user, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem('te_current_user');
    set({ user: null, isAuthenticated: false });
  },
}));

interface SettingsState {
  settings: AppSettings;
  updateSettings: (settings: AppSettings) => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: JSON.parse(localStorage.getItem('te_settings') || '{"theme":"light","accentColor":"emerald","invoicePrefix":"INV-WAL-MIS","invoicePadding":6}'),
  updateSettings: (settings) => {
    set({ settings });
  },
}));
