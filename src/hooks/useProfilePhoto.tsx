import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ProfilePhotoContextType {
  avatarUrl: string | null;
  isLoading: boolean;
  refreshAvatar: () => Promise<void>;
  setAvatarUrl: (url: string | null) => void;
  getInitials: () => string;
  userName: string;
  userEmail: string;
}

const ProfilePhotoContext = createContext<ProfilePhotoContextType | null>(null);

/**
 * Provider component to manage profile photo state across the application
 * Provides a single source of truth for avatar URL
 */
export function ProfilePhotoProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const buildAvatarUrl = useCallback((avatarPath: string | null): string | null => {
    if (!avatarPath) return null;
    
    // Get public URL for the avatar with cache buster
    const { data: urlData } = supabase.storage
      .from('profile-avatars')
      .getPublicUrl(avatarPath);
    
    return `${urlData.publicUrl}?t=${Date.now()}`;
  }, []);

  const fetchAvatarUrl = useCallback(async () => {
    if (!user?.id) {
      setAvatarUrl(null);
      setIsLoading(false);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      
      if (error) throw error;

      const url = buildAvatarUrl(data?.avatar_url);
      setAvatarUrl(url);
    } catch (error) {
      console.error('Error fetching avatar:', error);
      setAvatarUrl(null);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, buildAvatarUrl]);

  useEffect(() => {
    fetchAvatarUrl();
  }, [fetchAvatarUrl]);

  // Listen for realtime updates to profile
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('profile-avatar-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          const newAvatarPath = payload.new?.avatar_url as string | null;
          const url = buildAvatarUrl(newAvatarPath);
          setAvatarUrl(url);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, buildAvatarUrl]);

  const refreshAvatar = useCallback(async () => {
    setIsLoading(true);
    await fetchAvatarUrl();
  }, [fetchAvatarUrl]);

  const getInitials = useCallback(() => {
    const name = user?.user_metadata?.full_name || user?.email || '';
    return name.charAt(0).toUpperCase() || 'U';
  }, [user]);

  const value: ProfilePhotoContextType = {
    avatarUrl,
    isLoading,
    refreshAvatar,
    setAvatarUrl,
    getInitials,
    userName: user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utente',
    userEmail: user?.email || '',
  };

  return (
    <ProfilePhotoContext.Provider value={value}>
      {children}
    </ProfilePhotoContext.Provider>
  );
}

/**
 * Hook to access profile photo state from anywhere in the app
 * Must be used within ProfilePhotoProvider
 */
export function useProfilePhoto(): ProfilePhotoContextType {
  const context = useContext(ProfilePhotoContext);
  
  if (!context) {
    // Fallback for components outside provider - return default values
    return {
      avatarUrl: null,
      isLoading: false,
      refreshAvatar: async () => {},
      setAvatarUrl: () => {},
      getInitials: () => 'U',
      userName: 'Utente',
      userEmail: '',
    };
  }
  
  return context;
}
