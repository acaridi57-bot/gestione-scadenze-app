import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Download, Smartphone, Monitor, Apple, Chrome, ArrowLeft, LogIn, Trash2, ExternalLink, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isMac, setIsMac] = useState(false);
  const [isWindows, setIsWindows] = useState(false);
  const [isChrome, setIsChrome] = useState(false);
  const [isEdge, setIsEdge] = useState(false);
  const [isFirefox, setIsFirefox] = useState(false);
  const [isSafari, setIsSafari] = useState(false);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent.toLowerCase();
    setIsIOS(/iphone|ipad|ipod/.test(userAgent));
    setIsAndroid(/android/.test(userAgent));
    setIsMac(/macintosh|mac os x/.test(userAgent) && !/iphone|ipad|ipod/.test(userAgent));
    setIsWindows(/windows/.test(userAgent));
    
    // Detect browser
    setIsChrome(/chrome/.test(userAgent) && !/edg/.test(userAgent));
    setIsEdge(/edg/.test(userAgent));
    setIsFirefox(/firefox/.test(userAgent));
    setIsSafari(/safari/.test(userAgent) && !/chrome/.test(userAgent));

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const handleOpenChromeApps = () => {
    // Copy the URL to clipboard since we can't directly open chrome://
    navigator.clipboard.writeText('chrome://apps').then(() => {
      toast.success('URL copiato! Incollalo nella barra degli indirizzi di Chrome', { duration: 5000 });
    });
  };

  const handleOpenEdgeApps = () => {
    navigator.clipboard.writeText('edge://apps').then(() => {
      toast.success('URL copiato! Incollalo nella barra degli indirizzi di Edge', { duration: 5000 });
    });
  };

  const getBrowserName = () => {
    if (isEdge) return 'Edge';
    if (isChrome) return 'Chrome';
    if (isFirefox) return 'Firefox';
    if (isSafari) return 'Safari';
    return 'Browser';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-border/50">
        <Link to="/landing">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Indietro
          </Button>
        </Link>
        <Link to="/auth">
          <Button size="sm" className="gradient-primary text-primary-foreground gap-2">
            <LogIn className="w-4 h-4" />
            Accedi
          </Button>
        </Link>
      </header>
      
      <div className="p-4 md:p-6 max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-bold text-primary mb-2">
            Installa Gestione Scadenze
          </h1>
          <p className="text-muted-foreground">
            Installa l'app sul tuo dispositivo per un accesso rapido
          </p>
        </motion.div>

        {isInstalled ? (
          <div className="space-y-4">
            <Card className="shadow-card border-income/30 bg-income/5">
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-income/20 flex items-center justify-center mx-auto mb-4">
                  <Download className="w-8 h-8 text-income" />
                </div>
                <h3 className="text-lg font-semibold text-income mb-2">App Installata!</h3>
                <p className="text-muted-foreground">
                  Gestione Scadenze è già installata sul tuo dispositivo
                </p>
              </CardContent>
            </Card>

            {/* Uninstall Instructions */}
            <Card className="shadow-card border-destructive/30">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  <CardTitle className="text-destructive">Disinstalla App</CardTitle>
                </div>
                <CardDescription>
                  Come rimuovere l'app dal tuo dispositivo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {isIOS && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Su iPhone/iPad:</p>
                    <p className="text-sm text-muted-foreground">
                      Tieni premuta l'icona dell'app sulla Home → Rimuovi app → Elimina app
                    </p>
                  </div>
                )}
                {isAndroid && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Su Android:</p>
                    <p className="text-sm text-muted-foreground">
                      Tieni premuta l'icona dell'app → Disinstalla, oppure vai in Impostazioni → App → Gestione Scadenze → Disinstalla
                    </p>
                  </div>
                )}
                {(isMac || isWindows) && (
                  <>
                    {isChrome && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Da Chrome:</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={handleOpenChromeApps}
                        >
                          <Settings className="w-4 h-4" />
                          Apri chrome://apps
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Copia l'URL, incollalo nella barra degli indirizzi, clicca destro sull'app → Rimuovi da Chrome
                        </p>
                      </div>
                    )}
                    {isEdge && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Da Edge:</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="gap-2"
                          onClick={handleOpenEdgeApps}
                        >
                          <Settings className="w-4 h-4" />
                          Apri edge://apps
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Copia l'URL, incollalo nella barra degli indirizzi, clicca sui tre puntini dell'app → Disinstalla
                        </p>
                      </div>
                    )}
                    {isMac && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Su Mac:</p>
                        <p className="text-sm text-muted-foreground">
                          Apri Finder → Applicazioni → Cerca "Gestione Scadenze" → Trascina nel Cestino
                        </p>
                      </div>
                    )}
                    {isWindows && (
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Su Windows:</p>
                        <p className="text-sm text-muted-foreground">
                          Impostazioni → App → App installate → Cerca "Gestione Scadenze" → Disinstalla
                        </p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Direct Install Button (Chrome/Edge) */}
            {deferredPrompt && (
              <Card className="shadow-card border-primary/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Download className="w-5 h-5 text-primary" />
                    <CardTitle>Installazione Rapida</CardTitle>
                  </div>
                  <CardDescription>
                    Clicca per installare direttamente l'app (funziona su {getBrowserName()})
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button 
                    onClick={handleInstallClick}
                    className="w-full gradient-primary text-primary-foreground shadow-glow"
                    size="lg"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Installa App
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* iOS Instructions */}
            {isIOS && (
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Apple className="w-5 h-5 text-primary" />
                    <CardTitle className="text-primary">Installa su iPhone/iPad</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                      <p className="text-sm">Tocca il pulsante <strong>Condividi</strong> (icona quadrato con freccia in su) nella barra di Safari</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                      <p className="text-sm">Scorri verso il basso e tocca <strong>"Aggiungi a Home"</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                      <p className="text-sm">Tocca <strong>"Aggiungi"</strong> in alto a destra</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Android Instructions */}
            {isAndroid && !deferredPrompt && (
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-5 h-5 text-primary" />
                    <CardTitle className="text-primary">Installa su Android</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                      <p className="text-sm">Tocca il menu (⋮) in alto a destra nel browser</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                      <p className="text-sm">Seleziona <strong>"Installa app"</strong> o <strong>"Aggiungi a schermata Home"</strong></p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                      <p className="text-sm">Conferma l'installazione</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Desktop Instructions */}
            {(isMac || isWindows) && !deferredPrompt && (
              <Card className="shadow-card">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-5 h-5 text-primary" />
                    <CardTitle className="text-primary">Installa su {isMac ? 'Mac' : 'Windows'}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
                      <p className="text-sm">Usa Chrome o Edge per visitare questa pagina</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
                      <p className="text-sm">Clicca sull'icona di installazione nella barra degli indirizzi (a destra)</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
                      <p className="text-sm">Clicca <strong>"Installa"</strong></p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Manage Installed Apps */}
            {(isChrome || isEdge) && (isMac || isWindows) && (
              <Card className="shadow-card border-muted">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-muted-foreground" />
                    <CardTitle className="text-muted-foreground">Gestisci App Installate</CardTitle>
                  </div>
                  <CardDescription>
                    Visualizza e gestisci tutte le PWA installate nel tuo browser
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2 flex-wrap">
                  {isChrome && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={handleOpenChromeApps}
                    >
                      <Chrome className="w-4 h-4" />
                      chrome://apps
                    </Button>
                  )}
                  {isEdge && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2"
                      onClick={handleOpenEdgeApps}
                    >
                      <ExternalLink className="w-4 h-4" />
                      edge://apps
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Native App Info */}
            <Card className="shadow-card border-muted">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-primary" />
                  <CardTitle className="text-primary">App Native (Prossimamente)</CardTitle>
                </div>
                <CardDescription>
                  Le app native per iOS (App Store) e Android (Play Store) saranno disponibili a breve
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
