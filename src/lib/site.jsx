import { createContext, useContext } from 'react';
import { useApi } from './api.js';

const SiteCtx = createContext(null);

export function SiteProvider({ children }) {
  const { data } = useApi('home');
  return <SiteCtx.Provider value={data}>{children}</SiteCtx.Provider>;
}
export const useSite = () => useContext(SiteCtx);
