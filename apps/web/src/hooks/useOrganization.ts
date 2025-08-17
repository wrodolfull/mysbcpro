'use client';

import { useState, useEffect } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

interface Organization {
  id: string;
  name: string;
  domain?: string;
  adminEmail?: string;
  blocked?: boolean;
  freeswitchTenantId?: string;
}

export function useOrganization() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseClient();

    async function getOrganization() {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          throw userError;
        }

        if (!user) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }

        // Get organization_id from user metadata
        const orgId = user.user_metadata?.organization_id;
        
        if (!orgId) {
          setError('No organization found for user');
          setLoading(false);
          return;
        }

        setOrganizationId(orgId);

        // Fetch organization details from API
        const response = await fetch(`http://localhost:4000/orgs/${orgId}`, {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch organization: ${response.statusText}`);
        }

        const orgData = await response.json();
        setOrganization(orgData);
        
      } catch (err) {
        console.error('Error getting organization:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    getOrganization();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getOrganization();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    organizationId,
    organization,
    loading,
    error
  };
}
