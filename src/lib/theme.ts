export type ThemeMode = 'dark' | 'light';

const STORAGE_KEY = 'auftragstaktik-theme';

export function getStoredTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark';
}

export function setStoredTheme(theme: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, theme);
}
