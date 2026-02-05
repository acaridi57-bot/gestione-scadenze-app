import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, ShieldCheck, Mail, Phone, Save, Loader2, RefreshCw } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAdmin } from '@/hooks/useAdmin';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  notification_enabled: boolean | null;
  whatsapp_number: string | null;
  created_at: string | null;
  updated_at: string | null;
  role: 'admin' | 'user';
}

export default function AdminUsers() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    whatsapp_number: string;
    notification_enabled: boolean;
    role: 'admin' | 'user';
  }>({ whatsapp_number: '', notification_enabled: false, role: 'user' });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      toast.error('Accesso negato: richiesto ruolo admin');
      navigate('/');
    }
  }, [isAdmin, adminLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_all_users_for_admin');
      
      if (error) {
        console.error('Error fetching users:', error);
        toast.error('Errore nel caricamento utenti');
        return;
      }

      setUsers(data || []);
    } catch (err) {
      console.error('Error:', err);
      toast.error('Errore nel caricamento utenti');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const startEditing = (userProfile: UserProfile) => {
    setEditingUser(userProfile.id);
    setEditForm({
      whatsapp_number: userProfile.whatsapp_number || '',
      notification_enabled: userProfile.notification_enabled || false,
      role: userProfile.role || 'user',
    });
  };

  const cancelEditing = () => {
    setEditingUser(null);
    setEditForm({ whatsapp_number: '', notification_enabled: false, role: 'user' });
  };

  const saveUser = async (userId: string) => {
    try {
      setSaving(userId);

      // Update profile
      const { error: profileError } = await supabase.rpc('admin_update_profile', {
        _target_user_id: userId,
        _whatsapp_number: editForm.whatsapp_number || null,
        _notification_enabled: editForm.notification_enabled,
      });

      if (profileError) {
        console.error('Error updating profile:', profileError);
        toast.error('Errore aggiornamento profilo');
        return;
      }

      // Update role
      const { error: roleError } = await supabase.rpc('update_user_role', {
        _target_user_id: userId,
        _new_role: editForm.role,
      });

      if (roleError) {
        console.error('Error updating role:', roleError);
        toast.error('Errore aggiornamento ruolo');
        return;
      }

      toast.success('Utente aggiornato');
      setEditingUser(null);
      fetchUsers();
    } catch (err) {
      console.error('Error:', err);
      toast.error('Errore salvataggio');
    } finally {
      setSaving(null);
    }
  };

  if (adminLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <MainLayout>
      <div className="p-4 md:p-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <ShieldCheck className="w-8 h-8 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold text-[#067d1c]">
              Gestione Utenti
            </h1>
          </motion.div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchUsers}
            className="gap-2 text-primary border-primary/30 hover:bg-primary/10"
          >
            <RefreshCw className="w-4 h-4" />
            Aggiorna
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Utenti Registrati ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Ruolo</TableHead>
                    <TableHead>Email Notifiche</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Notifiche</TableHead>
                    <TableHead>Data Registrazione</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userProfile) => (
                    <TableRow key={userProfile.id}>
                      <TableCell className="font-medium">
                        {userProfile.full_name || 'Senza nome'}
                        {userProfile.id === user?.id && (
                          <Badge variant="outline" className="ml-2 text-xs">Tu</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUser === userProfile.id ? (
                          <Select
                            value={editForm.role}
                            onValueChange={(value: 'admin' | 'user') => 
                              setEditForm({ ...editForm, role: value })
                            }
                          >
                            <SelectTrigger className="w-24">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge 
                            variant={userProfile.role === 'admin' ? 'default' : 'secondary'}
                            className={userProfile.role === 'admin' ? 'bg-primary' : ''}
                          >
                            {userProfile.role === 'admin' ? (
                              <><Shield className="w-3 h-3 mr-1" /> Admin</>
                            ) : (
                              'User'
                            )}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {userProfile.notification_enabled ? 'Attive' : 'Disattive'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingUser === userProfile.id ? (
                          <Input
                            value={editForm.whatsapp_number}
                            onChange={(e) => setEditForm({ ...editForm, whatsapp_number: e.target.value })}
                            placeholder="+39..."
                            className="w-32"
                          />
                        ) : (
                          <div className="flex items-center gap-1 text-sm">
                            <Phone className="w-3 h-3 text-green-600" />
                            {userProfile.whatsapp_number || '-'}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUser === userProfile.id ? (
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={editForm.notification_enabled}
                              onCheckedChange={(checked) => 
                                setEditForm({ ...editForm, notification_enabled: checked })
                              }
                            />
                            <Label className="text-xs">
                              {editForm.notification_enabled ? 'On' : 'Off'}
                            </Label>
                          </div>
                        ) : (
                          <Badge variant={userProfile.notification_enabled ? 'default' : 'outline'}>
                            {userProfile.notification_enabled ? 'On' : 'Off'}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {userProfile.created_at 
                          ? format(new Date(userProfile.created_at), 'dd MMM yyyy', { locale: it })
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        {editingUser === userProfile.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEditing}
                            >
                              Annulla
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveUser(userProfile.id)}
                              disabled={saving === userProfile.id}
                              className="gap-1"
                            >
                              {saving === userProfile.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3" />
                              )}
                              Salva
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEditing(userProfile)}
                          >
                            Modifica
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {users.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                Nessun utente trovato
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
