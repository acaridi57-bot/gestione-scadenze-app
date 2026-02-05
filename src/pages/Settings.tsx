import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Globe, 
  Trash2, 
  User, 
  Bell,
  Shield,
  Loader2,
  Archive,
  Receipt,
  Calendar,
  Wrench,
  Volume2,
  VolumeX,
  MapPin,
  Camera,
  Mic,
  Key,
  Download,
  Smartphone,
  Crown,
  CreditCard,
  Lock,
  Unlock,
} from 'lucide-react';
import { isSoundEnabled, setSoundEnabled } from '@/hooks/useClickSound';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { UpdateSettings } from '@/components/settings/UpdateSettings';
import { AdminSettings } from '@/components/settings/AdminSettings';
import { TTSSettings } from '@/components/settings/TTSSettings';
import { PWAInstallButton, PWAUninstallButton } from '@/components/PWAInstallButton';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import euroCoin from '@/assets/2-euro-coin.png';
import { ProfilePhotoUpload } from '@/components/profile/ProfilePhotoUpload';

type Language = 'it' | 'en';
type ResetType = 'full' | 'transactions' | 'reminders' | 'archive';

const translations = {
  it: {
    settings: 'Impostazioni',
    language: 'Lingua',
    languageDesc: 'Seleziona la lingua dell\'applicazione',
    italian: 'Italiano',
    english: 'English',
    notifications: 'Notifiche',
    notificationsDesc: 'Gestisci le preferenze di notifica',
    enableNotifications: 'Abilita notifiche',
    enableNotificationsDesc: 'Ricevi notifiche per le scadenze',
    dangerZone: 'Zona Pericolosa',
    dangerZoneDesc: 'Azioni irreversibili',
    resetApp: 'Reset Applicazione',
    resetAppDesc: 'Elimina tutti i dati e ripristina le impostazioni predefinite.',
    resetButton: 'Reset Completo',
    resetTransactions: 'Elimina Transazioni',
    resetTransactionsDesc: 'Elimina tutte le transazioni mantenendo categorie e promemoria.',
    resetReminders: 'Elimina Promemoria',
    resetRemindersDesc: 'Elimina tutti i promemoria mantenendo transazioni e categorie.',
    archiveData: 'Archivia Anno',
    archiveDataDesc: 'Elimina le transazioni dell\'anno precedente. I promemoria completati verranno rimossi.',
    resetDialogTitle: 'Conferma azione',
    resetDialogDescFull: 'Questa azione eliminerà TUTTI i tuoi dati: transazioni, promemoria, categorie personalizzate e impostazioni. Non potrai recuperare questi dati.',
    resetDialogDescTransactions: 'Questa azione eliminerà TUTTE le tue transazioni. Categorie e promemoria rimarranno intatti.',
    resetDialogDescReminders: 'Questa azione eliminerà TUTTI i tuoi promemoria. Transazioni e categorie rimarranno intatti.',
    resetDialogDescArchive: 'Questa azione eliminerà le transazioni dell\'anno precedente e i promemoria completati. I dati dell\'anno corrente rimarranno intatti.',
    resetConfirmLabel: 'Digita "CONFERMA" per procedere',
    cancel: 'Annulla',
    confirm: 'Conferma',
    resetting: 'Elaborazione...',
    resetSuccess: 'Operazione completata con successo',
    resetError: 'Errore durante l\'operazione',
    profile: 'Profilo',
    profileDesc: 'Informazioni del tuo account',
    email: 'Email',
    signOut: 'Esci',
    signOutDesc: 'Disconnetti il tuo account',
    changePassword: 'Cambia Password',
    changePasswordDesc: 'Modifica la password del tuo account',
    newPassword: 'Nuova Password',
    confirmPassword: 'Conferma Password',
    passwordChanged: 'Password modificata con successo',
    passwordError: 'Errore durante il cambio password',
    passwordMismatch: 'Le password non corrispondono',
    passwordTooShort: 'La password deve essere di almeno 6 caratteri',
    dataManagement: 'Gestione Dati',
    dataManagementDesc: 'Gestisci i tuoi dati in modo selettivo',
    installApp: 'Installa App',
    installAppDesc: 'Scarica Gestione Scadenze sul tuo dispositivo',
    installAppButton: 'Scarica App',
    appInstalled: 'App già installata',
    appInstalledDesc: 'L\'app è già installata sul tuo dispositivo',
  },
  en: {
    settings: 'Settings',
    language: 'Language',
    languageDesc: 'Select the application language',
    italian: 'Italiano',
    english: 'English',
    notifications: 'Notifications',
    notificationsDesc: 'Manage notification preferences',
    enableNotifications: 'Enable notifications',
    enableNotificationsDesc: 'Receive notifications for due dates',
    dangerZone: 'Danger Zone',
    dangerZoneDesc: 'Irreversible actions',
    resetApp: 'Reset Application',
    resetAppDesc: 'Delete all data and restore default settings.',
    resetButton: 'Full Reset',
    resetTransactions: 'Delete Transactions',
    resetTransactionsDesc: 'Delete all transactions keeping categories and reminders.',
    resetReminders: 'Delete Reminders',
    resetRemindersDesc: 'Delete all reminders keeping transactions and categories.',
    archiveData: 'Archive Year',
    archiveDataDesc: 'Delete transactions from the previous year. Completed reminders will be removed.',
    resetDialogTitle: 'Confirm action',
    resetDialogDescFull: 'This action will delete ALL your data: transactions, reminders, custom categories, and settings. You will not be able to recover this data.',
    resetDialogDescTransactions: 'This action will delete ALL your transactions. Categories and reminders will remain intact.',
    resetDialogDescReminders: 'This action will delete ALL your reminders. Transactions and categories will remain intact.',
    resetDialogDescArchive: 'This action will delete transactions from the previous year and completed reminders. Current year data will remain intact.',
    resetConfirmLabel: 'Type "CONFIRM" to proceed',
    cancel: 'Cancel',
    confirm: 'Confirm',
    resetting: 'Processing...',
    resetSuccess: 'Operation completed successfully',
    resetError: 'Error during operation',
    profile: 'Profile',
    profileDesc: 'Your account information',
    email: 'Email',
    signOut: 'Sign Out',
    signOutDesc: 'Disconnect your account',
    changePassword: 'Change Password',
    changePasswordDesc: 'Change your account password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    passwordChanged: 'Password changed successfully',
    passwordError: 'Error changing password',
    passwordMismatch: 'Passwords do not match',
    passwordTooShort: 'Password must be at least 6 characters',
    dataManagement: 'Data Management',
    dataManagementDesc: 'Manage your data selectively',
    installApp: 'Install App',
    installAppDesc: 'Download Gestione Scadenze on your device',
    installAppButton: 'Download App',
    appInstalled: 'App already installed',
    appInstalledDesc: 'The app is already installed on your device',
  }
};

export default function Settings() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const { upgradeToPro, openCustomerPortal, loading: upgradeLoading, portalLoading, isPro, subscription } = useSubscription();
  const { isAdmin } = useAdmin();
  const hasProAccess = isAdmin || isPro;
  
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('app-language') as Language) || 'it';
  });
  const [soundsEnabled, setSoundsEnabled] = useState<boolean>(() => isSoundEnabled());
  const [requirePasswordOnExit, setRequirePasswordOnExit] = useState<boolean>(() => {
    return localStorage.getItem('require-password-on-exit') === 'true';
  });
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetType, setResetType] = useState<ResetType>('full');
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  
  // Password change states
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Handle session cleanup on page unload if requirePasswordOnExit is enabled
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (requirePasswordOnExit) {
        // Clear session on exit
        await supabase.auth.signOut();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [requirePasswordOnExit]);

  const handleRequirePasswordToggle = () => {
    const newValue = !requirePasswordOnExit;
    setRequirePasswordOnExit(newValue);
    localStorage.setItem('require-password-on-exit', newValue.toString());
    toast.success(
      language === 'it' 
        ? (newValue ? 'Password richiesta all\'uscita attivata' : 'Password richiesta all\'uscita disattivata')
        : (newValue ? 'Require password on exit enabled' : 'Require password on exit disabled')
    );
  };

  const handleSoundsToggle = () => {
    const newValue = !soundsEnabled;
    setSoundsEnabled(newValue);
    setSoundEnabled(newValue);
    toast.success(newValue
      ? (language === 'it' ? 'Suoni attivati' : 'Sounds enabled')
      : (language === 'it' ? 'Suoni disattivati' : 'Sounds disabled')
    );
  };

  // Browser permissions state
  const [permissions, setPermissions] = useState<{
    notifications: PermissionState | 'unsupported';
    geolocation: PermissionState | 'unsupported';
    camera: PermissionState | 'unsupported';
    microphone: PermissionState | 'unsupported';
  }>({
    notifications: 'prompt',
    geolocation: 'prompt',
    camera: 'prompt',
    microphone: 'prompt',
  });

  // Check permissions on mount
  useState(() => {
    const checkPermissions = async () => {
      try {
        // Notifications
        if ('Notification' in window) {
          setPermissions(prev => ({ 
            ...prev, 
            notifications: Notification.permission as PermissionState 
          }));
        } else {
          setPermissions(prev => ({ ...prev, notifications: 'unsupported' }));
        }

        // Geolocation
        if ('permissions' in navigator) {
          try {
            const geo = await navigator.permissions.query({ name: 'geolocation' });
            setPermissions(prev => ({ ...prev, geolocation: geo.state }));
          } catch {
            setPermissions(prev => ({ ...prev, geolocation: 'unsupported' }));
          }

          // Camera
          try {
            const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
            setPermissions(prev => ({ ...prev, camera: cam.state }));
          } catch {
            setPermissions(prev => ({ ...prev, camera: 'unsupported' }));
          }

          // Microphone
          try {
            const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });
            setPermissions(prev => ({ ...prev, microphone: mic.state }));
          } catch {
            setPermissions(prev => ({ ...prev, microphone: 'unsupported' }));
          }
        }
      } catch (error) {
        console.log('Error checking permissions:', error);
      }
    };
    checkPermissions();
  });

  const getPermissionDisplay = (state: PermissionState | 'unsupported') => {
    const isGranted = state === 'granted';
    return (
      <span className={`text-sm font-medium ${isGranted ? 'text-green-500' : 'text-red-500'}`}>
        {isGranted ? (language === 'it' ? 'Sì' : 'Yes') : 'No'}
      </span>
    );
  };

  const t = translations[language];
  const confirmWord = language === 'it' ? 'CONFERMA' : 'CONFIRM';

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('app-language', newLang);
    toast.success(newLang === 'it' ? 'Lingua cambiata in Italiano' : 'Language changed to English');
  };

  const openResetDialog = (type: ResetType) => {
    setResetType(type);
    setResetConfirmText('');
    setResetDialogOpen(true);
  };

  const getResetDialogDescription = () => {
    switch (resetType) {
      case 'full':
        return t.resetDialogDescFull;
      case 'transactions':
        return t.resetDialogDescTransactions;
      case 'reminders':
        return t.resetDialogDescReminders;
      case 'archive':
        return t.resetDialogDescArchive;
      default:
        return '';
    }
  };

  const handleResetAction = async () => {
    if (resetConfirmText !== confirmWord) return;

    setIsResetting(true);
    try {
      const userId = user?.id;
      
      if (!userId) {
        toast.error('Utente non autenticato');
        return;
      }

      switch (resetType) {
        case 'full':
          // Delete payments first (due to foreign key constraints)
          const { data: transactions } = await supabase
            .from('transactions')
            .select('id')
            .eq('user_id', userId);
          
          if (transactions && transactions.length > 0) {
            const transactionIds = transactions.map(t => t.id);
            await supabase
              .from('payments')
              .delete()
              .in('transaction_id', transactionIds);
          }

          // Delete all transactions
          await supabase
            .from('transactions')
            .delete()
            .eq('user_id', userId);

          // Delete all reminders
          await supabase
            .from('reminders')
            .delete()
            .eq('user_id', userId);

          // Delete custom categories
          await supabase
            .from('categories')
            .delete()
            .eq('user_id', userId)
            .eq('is_default', false);

          // Reset profile
          await supabase
            .from('profiles')
            .update({
              notification_enabled: false,
              avatar_url: null,
            })
            .eq('id', userId);

          localStorage.removeItem('app-language');
          
          toast.success(t.resetSuccess);
          await signOut();
          navigate('/auth');
          break;

        case 'transactions':
          // Delete payments first
          const { data: userTransactions } = await supabase
            .from('transactions')
            .select('id')
            .eq('user_id', userId);
          
          if (userTransactions && userTransactions.length > 0) {
            const transactionIds = userTransactions.map(t => t.id);
            await supabase
              .from('payments')
              .delete()
              .in('transaction_id', transactionIds);
          }

          // Delete all transactions
          await supabase
            .from('transactions')
            .delete()
            .eq('user_id', userId);

          toast.success(t.resetSuccess);
          break;

        case 'reminders':
          // Delete all reminders
          await supabase
            .from('reminders')
            .delete()
            .eq('user_id', userId);

          toast.success(t.resetSuccess);
          break;

        case 'archive':
          const currentYear = new Date().getFullYear();
          const startOfCurrentYear = `${currentYear}-01-01`;

          // Get transactions from previous years
          const { data: oldTransactions } = await supabase
            .from('transactions')
            .select('id')
            .eq('user_id', userId)
            .lt('date', startOfCurrentYear);
          
          if (oldTransactions && oldTransactions.length > 0) {
            const oldTransactionIds = oldTransactions.map(t => t.id);
            
            // Delete payments for old transactions
            await supabase
              .from('payments')
              .delete()
              .in('transaction_id', oldTransactionIds);

            // Delete old transactions
            await supabase
              .from('transactions')
              .delete()
              .eq('user_id', userId)
              .lt('date', startOfCurrentYear);
          }

          // Delete completed reminders
          await supabase
            .from('reminders')
            .delete()
            .eq('user_id', userId)
            .eq('completed', true);

          toast.success(t.resetSuccess);
          break;
      }

      setResetDialogOpen(false);
      setResetConfirmText('');
    } catch (error) {
      console.error('Reset error:', error);
      toast.error(t.resetError);
    } finally {
      setIsResetting(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast.error(t.passwordTooShort);
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error(t.passwordMismatch);
      return;
    }
    
    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      toast.success(t.passwordChanged);
      setPasswordDialogOpen(false);
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(t.passwordError);
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/landing');
  };

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-3xl mx-auto pb-24">
        <div className="flex items-center gap-3 mb-6">
          <div className="coin-container">
            <div className="banknote-shine coin-rotate w-10 h-10 rounded-full">
              <img src={euroCoin} alt="Euro" className="w-10 h-10 object-contain" />
            </div>
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-bold text-[#067d1c]"
          >
            {t.settings}
          </motion.h1>
        </div>

        <div className="space-y-6">
          {/* Profile Section */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#067d1c]" />
                <CardTitle className="text-[#067d1c]">{t.profile}</CardTitle>
              </div>
              <CardDescription>{t.profileDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile Photo */}
              <div className="flex items-center gap-4">
                <ProfilePhotoUpload size="lg" />
                <div className="flex-1">
                  <p className="font-medium">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Utente'}
                  </p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {language === 'it' ? 'Clicca sulla foto per modificarla' : 'Click on photo to change'}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>{t.email}</Label>
                <Input 
                  value={user?.email || ''} 
                  disabled 
                  className="bg-muted"
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.changePassword}</p>
                  <p className="text-sm text-muted-foreground">{t.changePasswordDesc}</p>
                </div>
                <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/10" onClick={() => setPasswordDialogOpen(true)}>
                  <Key className="w-4 h-4 mr-2" />
                  {t.changePassword}
                </Button>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{t.signOut}</p>
                  <p className="text-sm text-muted-foreground">{t.signOutDesc}</p>
                </div>
                <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/10" onClick={handleSignOut}>
                  {t.signOut}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscription Section */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Crown className={`w-5 h-5 ${isPro ? 'text-yellow-500' : 'text-[#067d1c]'}`} />
                <CardTitle className={isPro ? 'text-yellow-600' : 'text-[#067d1c]'}>
                  {language === 'it' ? 'Abbonamento' : 'Subscription'}
                </CardTitle>
              </div>
              <CardDescription>
                {language === 'it' ? 'Gestisci il tuo piano e la fatturazione' : 'Manage your plan and billing'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-full ${hasProAccess ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-muted'}`}>
                    <Crown className={`w-5 h-5 ${hasProAccess ? 'text-white' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-lg">
                      {hasProAccess
                        ? (isAdmin
                          ? (language === 'it' ? 'Piano Pro (Admin)' : 'Pro Plan (Admin)')
                          : (language === 'it' ? 'Piano Pro' : 'Pro Plan'))
                        : (language === 'it' ? 'Piano Free' : 'Free Plan')}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {hasProAccess
                        ? (isAdmin
                          ? (language === 'it' ? 'Accesso completo (Admin)' : 'Full access (Admin)')
                          : (language === 'it' ? 'Tutte le funzionalità sbloccate' : 'All features unlocked'))
                        : (language === 'it' ? 'Funzionalità base' : 'Basic features')}
                    </p>
                  </div>
                </div>
                {hasProAccess && (
                  <span className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    {isAdmin ? 'Admin' : (language === 'it' ? 'Attivo' : 'Active')}
                  </span>
                )}
              </div>

              {isAdmin ? (
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {language === 'it'
                        ? 'Accesso Pro permanente: nessun abbonamento richiesto per gli amministratori.'
                        : 'Permanent Pro access: no subscription required for administrators.'}
                    </p>
                  </div>
                </div>
              ) : isPro ? (
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {language === 'it' ? 'Tipo di piano:' : 'Plan type:'}{' '}
                      <span className="font-medium text-foreground">
                        {language === 'it' ? 'Mensile (€4,99/mese)' : 'Monthly (€4.99/month)'}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={openCustomerPortal}
                      disabled={portalLoading}
                    >
                      {portalLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <CreditCard className="w-4 h-4 mr-2" />
                      )}
                      {language === 'it' ? 'Gestisci abbonamento' : 'Manage subscription'}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {language === 'it' 
                      ? 'Passa a Pro per sbloccare allegati, export, TTS, notifiche WhatsApp e molto altro!'
                      : 'Upgrade to Pro to unlock attachments, exports, TTS, WhatsApp notifications and more!'}
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => navigate('/pricing')}
                    >
                      {language === 'it' ? 'Vedi piani' : 'View plans'}
                    </Button>
                    <Button
                      className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white"
                      onClick={() => upgradeToPro()}
                      disabled={upgradeLoading}
                    >
                      {upgradeLoading ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Crown className="w-4 h-4 mr-2" />
                      )}
                      {language === 'it' ? 'Upgrade a Pro' : 'Upgrade to Pro'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Install App Section */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#067d1c]" />
                <CardTitle className="text-[#067d1c]">{t.installApp}</CardTitle>
              </div>
              <CardDescription>{t.installAppDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              {isInstalled ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-800 flex items-center justify-center">
                      <Download className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-400">{t.appInstalled}</p>
                      <p className="text-sm text-green-600 dark:text-green-500">{t.appInstalledDesc}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-destructive">Disinstalla App</p>
                      <p className="text-sm text-muted-foreground">Rimuovi l'app dal tuo dispositivo</p>
                    </div>
                    <PWAUninstallButton variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <img src={euroCoin} alt="Logo" className="w-8 h-8" />
                    </div>
                    <div>
                      <p className="font-medium">Gestione Scadenze</p>
                      <p className="text-sm text-muted-foreground">
                        {isIOS ? 'Aggiungi alla schermata Home' : 'Installa come app'}
                      </p>
                    </div>
                  </div>
                  <PWAInstallButton 
                    variant="default"
                    size="lg"
                    className="w-full sm:w-auto gradient-primary text-white"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* TTS Settings */}
          <TTSSettings language={language} />

          {/* Language Section */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#067d1c]" />
                <CardTitle className="text-[#067d1c]">{t.language}</CardTitle>
              </div>
              <CardDescription>{t.languageDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={language} onValueChange={(v) => handleLanguageChange(v as Language)}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="it">
                    <div className="flex items-center gap-2">
                      <span>🇮🇹</span>
                      <span>{t.italian}</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="en">
                    <div className="flex items-center gap-2">
                      <span>🇬🇧</span>
                      <span>{t.english}</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Sound Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                {soundsEnabled ? (
                  <Volume2 className="w-5 h-5 text-[#067d1c]" />
                ) : (
                  <VolumeX className="w-5 h-5 text-[#067d1c]" />
                )}
                <CardTitle className="text-[#067d1c]">
                  {language === 'it' ? 'Suoni' : 'Sounds'}
                </CardTitle>
              </div>
              <CardDescription>
                {language === 'it' 
                  ? 'Abilita o disabilita i suoni dei pulsanti'
                  : 'Enable or disable button sounds'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === 'it' ? 'Suoni click' : 'Click sounds'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'it' 
                      ? 'Riproduce un suono quando premi i pulsanti'
                      : 'Plays a sound when you press buttons'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSoundsToggle}
                  className={soundsEnabled 
                    ? "text-primary border-primary/30 hover:bg-primary/10" 
                    : "text-muted-foreground"
                  }
                  noSound
                >
                  {soundsEnabled ? (
                    <>
                      <Volume2 className="w-4 h-4 mr-2" />
                      {language === 'it' ? 'Attivo' : 'On'}
                    </>
                  ) : (
                    <>
                      <VolumeX className="w-4 h-4 mr-2" />
                      {language === 'it' ? 'Disattivo' : 'Off'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Session Security Settings */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                {requirePasswordOnExit ? (
                  <Lock className="w-5 h-5 text-primary" />
                ) : (
                  <Unlock className="w-5 h-5 text-primary" />
                )}
                <CardTitle className="text-primary">
                  {language === 'it' ? 'Sicurezza Sessione' : 'Session Security'}
                </CardTitle>
              </div>
              <CardDescription>
                {language === 'it' 
                  ? 'Controlla il comportamento della sessione all\'uscita'
                  : 'Control session behavior on exit'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {language === 'it' ? 'Richiedi password all\'uscita' : 'Require password on exit'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'it' 
                      ? 'Se attivo, dovrai reinserire la password quando riapri l\'app'
                      : 'If enabled, you\'ll need to re-enter your password when reopening the app'}
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRequirePasswordToggle}
                  className={requirePasswordOnExit 
                    ? "text-primary border-primary/30 hover:bg-primary/10" 
                    : "text-muted-foreground"
                  }
                >
                  {requirePasswordOnExit ? (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      {language === 'it' ? 'Attivo' : 'On'}
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4 mr-2" />
                      {language === 'it' ? 'Disattivo' : 'Off'}
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Browser Permissions */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#067d1c]" />
                <CardTitle className="text-[#067d1c]">
                  {language === 'it' ? 'Permessi Browser' : 'Browser Permissions'}
                </CardTitle>
              </div>
              <CardDescription>
                {language === 'it' 
                  ? 'Stato dei permessi richiesti dall\'applicazione'
                  : 'Status of permissions requested by the application'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Notifications */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Bell className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {language === 'it' ? 'Notifiche' : 'Notifications'}
                    </span>
                  </div>
                  {getPermissionDisplay(permissions.notifications)}
                </div>

                {/* Geolocation */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {language === 'it' ? 'Posizione' : 'Location'}
                    </span>
                  </div>
                  {getPermissionDisplay(permissions.geolocation)}
                </div>

                {/* Camera */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Camera className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {language === 'it' ? 'Fotocamera' : 'Camera'}
                    </span>
                  </div>
                  {getPermissionDisplay(permissions.camera)}
                </div>

                {/* Microphone */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Mic className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {language === 'it' ? 'Microfono' : 'Microphone'}
                    </span>
                  </div>
                  {getPermissionDisplay(permissions.microphone)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notifications Section */}
          <NotificationSettings translations={t} />

          {/* Admin Settings - Only visible for admins */}
          <AdminSettings />
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Wrench className="w-5 h-5 text-[#067d1c]" />
                <CardTitle className="text-[#067d1c]">{language === 'it' ? 'Diagnostica' : 'Diagnostics'}</CardTitle>
              </div>
              <CardDescription>
                {language === 'it' 
                  ? 'Informazioni di debug e stato dell\'applicazione' 
                  : 'Debug information and application status'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="text-primary border-primary/30 hover:bg-primary/10" onClick={() => navigate('/diagnostics')}>
                <Wrench className="w-4 h-4 mr-2" />
                {language === 'it' ? 'Apri Diagnostica' : 'Open Diagnostics'}
              </Button>
            </CardContent>
          </Card>

          {/* App Version Section */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#067d1c]" />
                <CardTitle className="text-[#067d1c]">
                  {language === 'it' ? 'Informazioni App' : 'App Information'}
                </CardTitle>
              </div>
              <CardDescription>
                {language === 'it' 
                  ? 'Dettagli sulla versione dell\'applicazione' 
                  : 'Application version details'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">
                    {language === 'it' ? 'Versione' : 'Version'}
                  </span>
                  <span className="text-sm text-muted-foreground">1.0.0</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">
                    {language === 'it' ? 'Build' : 'Build'}
                  </span>
                  <span className="text-sm text-muted-foreground">2024.12.27</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="font-medium">
                    {language === 'it' ? 'Ambiente' : 'Environment'}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {import.meta.env.MODE === 'production' ? 'Production' : 'Development'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Updates Section */}
          <UpdateSettings language={language} />

          {/* Data Management Section */}
          <Card className="shadow-card">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-[#067d1c]" />
                <CardTitle className="text-[#067d1c]">{t.dataManagement}</CardTitle>
              </div>
              <CardDescription>{t.dataManagementDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Archive Year */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-[#067d1c] mt-0.5" />
                  <div>
                    <p className="font-medium">{t.archiveData}</p>
                    <p className="text-sm text-muted-foreground">{t.archiveDataDesc}</p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  className="text-primary border-primary/30 hover:bg-primary/10"
                  onClick={() => openResetDialog('archive')}
                >
                  <Archive className="w-4 h-4 mr-2" />
                  {t.archiveData}
                </Button>
              </div>

              {/* Delete Transactions */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-start gap-3">
                  <Receipt className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{t.resetTransactions}</p>
                    <p className="text-sm text-muted-foreground">{t.resetTransactionsDesc}</p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  className="text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
                  onClick={() => openResetDialog('transactions')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.resetTransactions}
                </Button>
              </div>

              {/* Delete Reminders */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-lg bg-muted/50">
                <div className="flex items-start gap-3">
                  <Bell className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <p className="font-medium">{t.resetReminders}</p>
                    <p className="text-sm text-muted-foreground">{t.resetRemindersDesc}</p>
                  </div>
                </div>
                <Button 
                  variant="outline"
                  className="text-orange-500 border-orange-500/50 hover:bg-orange-500/10"
                  onClick={() => openResetDialog('reminders')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.resetReminders}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="shadow-card border-destructive/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-destructive" />
                <CardTitle className="text-destructive">{t.dangerZone}</CardTitle>
              </div>
              <CardDescription>{t.dangerZoneDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <p className="font-medium">{t.resetApp}</p>
                  <p className="text-sm text-muted-foreground">{t.resetAppDesc}</p>
                </div>
                <Button 
                  variant="destructive"
                  onClick={() => openResetDialog('full')}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {t.resetButton}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Reset Confirmation Dialog */}
        <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className={resetType === 'full' ? 'text-destructive' : ''}>
                {t.resetDialogTitle}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {getResetDialogDescription()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4">
              <Label className="text-sm font-medium">{t.resetConfirmLabel}</Label>
              <Input 
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                placeholder={confirmWord}
                className="mt-2"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setResetConfirmText('')}>
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetAction}
                disabled={resetConfirmText !== confirmWord || isResetting}
                className={resetType === 'full' 
                  ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                  : ''
                }
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.resetting}
                  </>
                ) : (
                  t.confirm
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Change Password Dialog */}
        <AlertDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                {t.changePassword}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t.changePasswordDesc}
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">{t.newPassword}</Label>
                <Input 
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">{t.confirmPassword}</Label>
                <Input 
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setNewPassword('');
                setConfirmPassword('');
              }}>
                {t.cancel}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleChangePassword}
                disabled={!newPassword || !confirmPassword || isChangingPassword}
                className="bg-primary hover:bg-primary/90"
              >
                {isChangingPassword ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.resetting}
                  </>
                ) : (
                  t.confirm
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </MainLayout>
  );
}
