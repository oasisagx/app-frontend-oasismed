import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface OverlayContextValue {
  hasOverlay: boolean;
  registerOverlay: () => void;
  unregisterOverlay: () => void;
}

const OverlayContext = createContext<OverlayContextValue | undefined>(undefined);

export const OverlayProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openCount, setOpenCount] = useState(0);

  const registerOverlay = useCallback(() => {
    setOpenCount((count) => count + 1);
  }, []);

  const unregisterOverlay = useCallback(() => {
    setOpenCount((count) => (count > 0 ? count - 1 : 0));
  }, []);

  const value = useMemo(
    () => ({
      hasOverlay: openCount > 0,
      registerOverlay,
      unregisterOverlay,
    }),
    [openCount, registerOverlay, unregisterOverlay],
  );

  return <OverlayContext.Provider value={value}>{children}</OverlayContext.Provider>;
};

export const useOverlay = (): OverlayContextValue => {
  const ctx = useContext(OverlayContext);
  if (!ctx) {
    throw new Error('useOverlay must be used within an OverlayProvider');
  }
  return ctx;
};


