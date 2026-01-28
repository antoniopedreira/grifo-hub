import { useState, useEffect } from "react";
import { Building2, Copy, Check, Eye, EyeOff, Link2, Key, Loader2, Megaphone } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function GeneralSettings() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Controles de visibilidade de senha
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);
  const [showMetaToken, setShowMetaToken] = useState(false); // Novo para o Meta

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado do Formulário
  const [formData, setFormData] = useState({
    razaoSocial: "",
    cnpj: "",
    endereco: "",
    emailCorporativo: "",
    webhookLastlink: "https://api.grifo.academy/webhook/lastlink",
    whatsappToken: "",
    openaiKey: "",
    // Novo campo apenas para o Token
    metaAccessToken: "",
  });

  // Carregar configurações do Supabase
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase.from("settings").select("key, value");

        if (error) throw error;

        if (data) {
          const settingsMap: Record<string, string> = {};
          data.forEach((item) => {
            settingsMap[item.key] = item.value || "";
          });

          setFormData({
            razaoSocial: settingsMap["razao_social"] || "",
            cnpj: settingsMap["cnpj"] || "",
            endereco: settingsMap["endereco"] || "",
            emailCorporativo: settingsMap["email_corporativo"] || "",
            webhookLastlink: settingsMap["webhook_lastlink"] || "https://api.grifo.academy/webhook/lastlink",
            whatsappToken: settingsMap["whatsapp_token"] || "",
            openaiKey: settingsMap["openai_key"] || "",
            // Carrega o Token do Meta
            metaAccessToken: settingsMap["meta_access_token"] || "",
          });
        }
      } catch (error) {
        console.error("Error loading settings:", error);
        toast({
          title: "Erro ao carregar configurações",
          description: "Não foi possível carregar as configurações salvas.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [toast]);

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(formData.webhookLastlink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copiado!",
      description: "URL do webhook copiada para a área de transferência.",
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = [
        { key: "razao_social", value: formData.razaoSocial },
        { key: "cnpj", value: formData.cnpj },
        { key: "endereco", value: formData.endereco },
        { key: "email_corporativo", value: formData.emailCorporativo },
        { key: "webhook_lastlink", value: formData.webhookLastlink },
        { key: "whatsapp_token", value: formData.whatsappToken },
        { key: "openai_key", value: formData.openaiKey },
        // Salva o Token do Meta
        { key: "meta_access_token", value: formData.metaAccessToken },
      ];

      for (const update of updates) {
        // Upsert garante criar se não existir
        const { error } = await supabase
          .from("settings")
          .upsert({ key: update.key, value: update.value }, { onConflict: "key" });

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas!",
        description: "Seus dados foram atualizados com sucesso.",
      });
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card 1: Dados Corporativos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados Corporativos
          </CardTitle>
          <CardDescription>Informações da empresa para geração de contratos e faturas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input
                id="razaoSocial"
                placeholder="Nome da empresa"
                value={formData.razaoSocial}
                onChange={(e) => handleInputChange("razaoSocial", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ / Tax ID</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) => handleInputChange("cnpj", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="endereco">Endereço Comercial</Label>
            <Input
              id="endereco"
              placeholder="Rua, número, bairro, cidade - UF"
              value={formData.endereco}
              onChange={(e) => handleInputChange("endereco", e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="emailCorporativo">Email Corporativo</Label>
              <Input
                id="emailCorporativo"
                type="email"
                placeholder="contato@empresa.com"
                value={formData.emailCorporativo}
                onChange={(e) => handleInputChange("emailCorporativo", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Meta Ads (NOVO - Apenas Token) */}
      <Card className="border-blue-900/20 bg-blue-50/5 dark:bg-blue-900/10">
        <CardHeader>
          <CardTitle className="text-[#1877F2] flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Meta Ads (API de Conversões)
          </CardTitle>
          <CardDescription>
            Configure o Token Global da sua conta de anúncios. O ID do Pixel deve ser configurado individualmente em
            cada produto.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="metaAccessToken" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Token de Acesso (API Token)
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="metaAccessToken"
                  type={showMetaToken ? "text" : "password"}
                  placeholder="Cole aqui seu Token (Começa com EAA...)"
                  value={formData.metaAccessToken}
                  onChange={(e) => handleInputChange("metaAccessToken", e.target.value)}
                  className="pr-10 font-mono"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowMetaToken(!showMetaToken)}
                >
                  {showMetaToken ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Token de longa duração gerado em: Gerenciador de Eventos {">"} Configurações {">"} API de Conversões.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Outras Conexões */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Outras Integrações
          </CardTitle>
          <CardDescription>WhatsApp, OpenAI e Webhooks</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook Lastlink */}
          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook Lastlink</Label>
            <div className="flex gap-2">
              <Input
                id="webhook"
                value={formData.webhookLastlink}
                onChange={(e) => handleInputChange("webhookLastlink", e.target.value)}
                placeholder="https://api.exemplo.com/webhook"
                className="font-mono text-sm"
              />
              <Button variant="outline" size="icon" onClick={handleCopyWebhook} className="shrink-0">
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use esta URL para receber notificações de vendas da Lastlink
            </p>
          </div>

          {/* WhatsApp Token */}
          <div className="space-y-2">
            <Label htmlFor="whatsappToken" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Token WhatsApp (UAZAPI)
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="whatsappToken"
                  type={showWhatsAppToken ? "text" : "password"}
                  placeholder="Insira seu token de autenticação"
                  value={formData.whatsappToken}
                  onChange={(e) => handleInputChange("whatsappToken", e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowWhatsAppToken(!showWhatsAppToken)}
                >
                  {showWhatsAppToken ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Token para envio de mensagens via WhatsApp</p>
          </div>

          {/* OpenAI Key */}
          <div className="space-y-2">
            <Label htmlFor="openaiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              OpenAI API Key
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="openaiKey"
                  type={showOpenAIKey ? "text" : "password"}
                  placeholder="sk-..."
                  value={formData.openaiKey}
                  onChange={(e) => handleInputChange("openaiKey", e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                  onClick={() => setShowOpenAIKey(!showOpenAIKey)}
                >
                  {showOpenAIKey ? (
                    <EyeOff className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Chave da API OpenAI para recursos de inteligência artificial
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        >
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </Button>
      </div>
    </div>
  );
}
