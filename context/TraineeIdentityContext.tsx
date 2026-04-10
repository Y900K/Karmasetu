'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

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

export function TraineeIdentityProvider({ children }: { children: React.ReactNode }) {
  const [identity, setIdentity] = useState<Identity>(DEFAULT_IDENTITY);
  const [loading, setLoading] = useState(true);

  const refreshIdentity = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/trainee/profile');
      const data = await response.json().catch(() => ({}));

      if (response.ok && data.ok && data.profile) {
        const name = typeof data.profile.name === 'string' && data.profile.name.trim()
          ? data.profile.name.trim()
          : DEFAULT_IDENTITY.name;

        setIdentity({
          name,
          initials: toInitials(name) || DEFAULT_IDENTITY.initials,
          role:
            typeof data.profile.role === 'string' && data.profile.role.trim()
              ? data.profile.role
              : DEFAULT_IDENTITY.role,
          approvalStatus:
            data.profile.approvalStatus === 'pending' || data.profile.approvalStatus === 'rejected'
              ? data.profile.approvalStatus
              : 'approved',
          accessLevel: data.profile.accessLevel === 'basic' ? 'basic' : 'full',
          authMessage:
            typeof data.profile.authMessage === 'string' && data.profile.authMessage.trim()
              ? data.profile.authMessage
              : DEFAULT_IDENTITY.authMessage,
        });
      }
    } catch {
      setIdentity(DEFAULT_IDENTITY);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshIdentity();
  }, []);

  const value = useMemo(
    () => ({ identity, loading, refreshIdentity }),
    [identity, loading]
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
