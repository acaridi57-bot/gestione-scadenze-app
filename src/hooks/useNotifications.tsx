import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface NotificationPermissionState {
  permission: NotificationPermission;
  isSupported: boolean;
}

export function useNotifications() {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Check if notifications are supported
  useEffect(() => {
    const supported = 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Load user preferences
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('notification_enabled')
        .eq('id', user.id)
        .single();
      
      if (data) {
        setNotificationsEnabled(data.notification_enabled ?? false);
      }
    };

    loadPreferences();
  }, [user?.id]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) {
      toast.error('Le notifiche non sono supportate in questo browser');
      return false;
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        toast.success('Notifiche abilitate!');
        return true;
      } else if (result === 'denied') {
        toast.error('Permesso notifiche negato');
        return false;
      }
      
      return false;
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      toast.error('Errore nella richiesta permessi');
      return false;
    }
  }, [isSupported]);

  // Toggle notifications
  const toggleNotifications = useCallback(async (enabled: boolean) => {
    if (!user?.id) return;

    if (enabled && permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return;
    }

    const { error } = await supabase
      .from('profiles')
      .update({ notification_enabled: enabled })
      .eq('id', user.id);

    if (error) {
      toast.error('Errore nel salvare le preferenze');
      return;
    }

    setNotificationsEnabled(enabled);
    toast.success(enabled ? 'Notifiche attivate' : 'Notifiche disattivate');
  }, [user?.id, permission, requestPermission]);

  // Send browser notification
  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!isSupported || permission !== 'granted') {
      console.log('Notifications not available, using toast instead');
      toast.info(title, { description: options?.body });
      return null;
    }

    try {
      const notification = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.info(title, { description: options?.body });
      return null;
    }
  }, [isSupported, permission]);

  // Send test notification
  const sendTestNotification = useCallback(() => {
    if (permission !== 'granted') {
      toast.warning('Abilita prima le notifiche');
      return;
    }

    sendNotification('Notifica di test', {
      body: 'Le notifiche funzionano correttamente! 🎉',
      tag: 'test-notification',
    });
  }, [permission, sendNotification]);

  // Check upcoming reminders and notify
  const checkUpcomingReminders = useCallback(async () => {
    if (!user?.id || !notificationsEnabled || permission !== 'granted') return;

    const today = new Date();
    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(today.getDate() + 3);

    const { data: reminders } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', user.id)
      .eq('completed', false)
      .gte('due_date', today.toISOString().split('T')[0])
      .lte('due_date', threeDaysFromNow.toISOString().split('T')[0]);

    if (reminders && reminders.length > 0) {
      reminders.forEach(reminder => {
        const dueDate = new Date(reminder.due_date);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        let message = '';
        if (daysUntil === 0) {
          message = 'Scade oggi!';
        } else if (daysUntil === 1) {
          message = 'Scade domani!';
        } else {
          message = `Scade tra ${daysUntil} giorni`;
        }

        const amountText = reminder.amount 
          ? ` - ${new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(reminder.amount)}`
          : '';

        sendNotification(`📅 ${reminder.title}`, {
          body: `${message}${amountText}`,
          tag: `reminder-${reminder.id}`,
        });
      });
    }

    return reminders;
  }, [user?.id, notificationsEnabled, permission, sendNotification]);

  return {
    permission,
    isSupported,
    notificationsEnabled,
    requestPermission,
    toggleNotifications,
    sendNotification,
    sendTestNotification,
    checkUpcomingReminders,
  };
}
