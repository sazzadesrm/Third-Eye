import React, { useEffect } from 'react';
import { useSettingsStore } from '../lib/store';

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const settings = useSettingsStore(state => state.settings);

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', settings.theme);
    root.setAttribute('data-accent', settings.accentColor);
  }, [settings]);

  return <>{children}</>;
};
