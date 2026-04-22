'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { useAuth } from '@/firebase/provider';

export function useUser() {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If the auth service isn't ready, we are still loading and can't do anything.
    if (!auth) {
      return;
    }

    // Auth service is ready, set up the listener.
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // When the auth state is resolved (either with a user or null),
      // update the user state and set loading to false.
      setUser(user);
      setLoading(false);
    });

    // Clean up the listener on unmount.
    return () => unsubscribe();
  }, [auth]); // This effect depends on the auth service becoming available.

  return { user, loading };
}
