import { useEffect, useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { DiagnosticInfo } from "@/types/electron.d";

const Diagnostics = () => {
  const { toast } = useToast();
  const [info, setInfo] = useState<DiagnosticInfo | null>(null);
  const [copied, setCopied] = useState(false);

  const collectInfo = async () => {
    const electronAPI = window.electronAPI;
    
    // Try to get diagnostics from Electron main process
    if (electronAPI?.getDiagnostics) {
      try {
        const diag = await electronAPI.getDiagnostics();
        setInfo(diag);
        return;
      } catch (e) {
        console.error("Failed to get diagnostics from main process:", e);
      }
    }
    
    // Fallback: collect what we can from the renderer
    const fallbackInfo: DiagnosticInfo = {
      isElectron: !!electronAPI?.isElectron,
      platform: electronAPI?.platform || navigator.platform,
      userAgent: navigator.userAgent,
      currentUrl: window.location.href,
      baseUrl: import.meta.env.BASE_URL || "/",
      nodeEnv: import.meta.env.MODE || "unknown",
      electronVersion: "n/a (renderer only)",
      chromeVersion: navigator.userAgent.match(/Chrome\/(\d+\.\d+\.\d+\.\d+)/)?.[1] || "n/a",
      appPath: "n/a (renderer only)",
      distPath: "n/a (renderer only)",
      errors: [],
    };
    setInfo(fallbackInfo);
  };

  useEffect(() => {
    collectInfo();
  }, []);

  const copyToClipboard = () => {
    if (!info) return;
    const text = JSON.stringify(info, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copiato negli appunti" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#067d1c]">Diagnostica</h1>
            <p className="text-muted-foreground">Informazioni di debug per l'applicazione</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={collectInfo}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Aggiorna
            </Button>
            <Button variant="outline" size="sm" onClick={copyToClipboard} disabled={!info}>
              {copied ? <CheckCircle2 className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
              {copied ? "Copiato!" : "Copia JSON"}
            </Button>
          </div>
        </div>

        {info ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-[#067d1c]">Ambiente</CardTitle>
                <CardDescription>Informazioni sull'ambiente di esecuzione</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="Electron" value={info.isElectron ? "Sì" : "No (Browser)"} />
                <Row label="Piattaforma" value={info.platform} />
                <Row label="Modalità" value={info.nodeEnv} />
                <Row label="Versione Electron" value={info.electronVersion} />
                <Row label="Versione Chrome" value={info.chromeVersion} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-[#067d1c]">Percorsi</CardTitle>
                <CardDescription>URL e percorsi file</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Row label="URL corrente" value={info.currentUrl} mono />
                <Row label="Base URL" value={info.baseUrl} mono />
                <Row label="App Path" value={info.appPath} mono />
                <Row label="Dist Path" value={info.distPath} mono />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-lg text-[#067d1c]">User Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <code className="text-xs bg-muted p-2 rounded block break-all">{info.userAgent}</code>
              </CardContent>
            </Card>

            {info.errors.length > 0 && (
              <Card className="md:col-span-2 border-destructive">
                <CardHeader>
                  <CardTitle className="text-lg text-destructive">Errori di avvio</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {info.errors.map((err, i) => (
                    <div key={i} className="bg-destructive/10 text-destructive p-2 rounded text-sm font-mono">
                      {err}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Caricamento informazioni diagnostiche...
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

const Row = ({ label, value, mono }: { label: string; value: string; mono?: boolean }) => (
  <div className="flex justify-between items-start gap-4">
    <span className="text-muted-foreground text-sm shrink-0">{label}</span>
    <span className={`text-sm text-right break-all ${mono ? "font-mono" : ""}`}>{value}</span>
  </div>
);

export default Diagnostics;
