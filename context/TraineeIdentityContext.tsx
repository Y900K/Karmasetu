'use client';

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';

type Identity = {
  name: string;
  initials: string;
  role: string;
  approvalStatus: 'approved' | 'pending' | 'rejected';
  accessLevel: 'basic' | 'full';
  authMessage: string;
};

type IdentityContextValue = {
  identity: Identity;
  loading: boolean;
  refreshIdentity: () => Promise<void>;
};

const DEFAULT_IDENTITY: Identity = {
  name: 'Trainee User',
  initials: 'TU',
  role: 'Trainee',
  approvalStatus: 'approved',
  accessLevel: 'full',
  authMessage: 'Your account is fully approved.',
};

const TraineeIdentityContext = createContext<IdentityContextValue | undefined>(undefined);

function toInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getInitialIdentity(): Identity {
  if (typeof window === 'undefined') return DEFAULT_IDENTITY;
  const storedName = localStorage.getItem('traineeName');
  if (storedName) {
    return {
      ...DEFAULT_IDENTITY,
      name: storedName,
      initials: toInitials(storedName),
    };
  }
  return DEFAULT_IDENTITY;
}

export function TraineeIdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity>(getInitialIdentity);
  const [loading, setLoading] = useState(true);

  const refreshIdentity = useCallback(async () => {
    // Avoid running this on admin routes to prevent 403 Forbidden errors
    if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/admin') || window.location.pathname.startsWith('/dashboard'))) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/me');
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.ok && data.user) {
        const name = typeof data.user.fullName === 'string' && data.user.fullName.trim()
          ? data.user.fullName.trim()
          : typeof data.user.name === 'string' && data.user.name.trim()
            ? data.user.name.trim()
            : DEFAULT_IDENTITY.name;

        setIdentity({
          name,
          initials: toInitials(name) || DEFAULT_IDENTITY.initials,
          role:
            typeof data.user.role === 'string' && data.user.role.trim()
              ? data.user.role
              : DEFAULT_IDENTITY.role,
          approvalStatus:
            data.user.approvalStatus === 'pending' || data.user.approvalStatus === 'rejected'
              ? data.user.approvalStatus
              : 'approved',
          accessLevel: data.user.accessLevel === 'basic' ? 'basic' : 'full',
          authMessage:
            typeof data.user.authMessage === 'string' && data.user.authMessage.trim()
              ? data.user.authMessage
              : DEFAULT_IDENTITY.authMessage,
        });

        // Cache for hydration on next page load
        localStorage.setItem('traineeName', name);
      }
    } catch {
      // Keep cached name if network fails
      setIdentity(prev => prev.name !== DEFAULT_IDENTITY.name ? prev : DEFAULT_IDENTITY);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshIdentity();
  }, [refreshIdentity]);

  const value = useMemo(
    () => ({ identity, loading, refreshIdentity }),
    [identity, loading, refreshIdentity]
  );

  return <TraineeIdentityContext.Provider value={value}>{children}</TraineeIdentityContext.Provider>;
}

export function useTraineeIdentity() {
  const context = useContext(TraineeIdentityContext);
  if (!context) {
    throw new Error('useTraineeIdentity must be used within a TraineeIdentityProvider.');
  }

  return context;
}
