import { useState } from "react";
import { Building2, Copy, Check, Eye, EyeOff, Link2, Key } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export function GeneralSettings() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [showWhatsAppToken, setShowWhatsAppToken] = useState(false);
  const [showOpenAIKey, setShowOpenAIKey] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    razaoSocial: "",
    cnpj: "",
    endereco: "",
    emailFinanceiro: "",
    whatsappToken: "",
    openaiKey: "",
  });

  const webhookUrl = "https://api.grifo.academy/webhook/lastlink";

  const handleCopyWebhook = async () => {
    await navigator.clipboard.writeText(webhookUrl);
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

  const handleSave = () => {
    // TODO: Implement actual save to Supabase
    toast({
      title: "Configurações salvas!",
      description: "Seus dados foram atualizados com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Card 1: Dados Corporativos */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dados Corporativos
          </CardTitle>
          <CardDescription>
            Informações da empresa para geração de contratos e faturas
          </CardDescription>
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
              <Label htmlFor="emailFinanceiro">Email Financeiro</Label>
              <Input
                id="emailFinanceiro"
                type="email"
                placeholder="financeiro@empresa.com"
                value={formData.emailFinanceiro}
                onChange={(e) => handleInputChange("emailFinanceiro", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Conexões Externas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Conexões Externas
          </CardTitle>
          <CardDescription>
            Configure integrações com serviços externos
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Webhook Lastlink */}
          <div className="space-y-2">
            <Label htmlFor="webhook">Webhook Lastlink</Label>
            <div className="flex gap-2">
              <Input
                id="webhook"
                value={webhookUrl}
                readOnly
                className="bg-muted font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={handleCopyWebhook}
                className="shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
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
              Token WhatsApp / Evolution API
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
            <p className="text-xs text-muted-foreground">
              Token para envio de mensagens via WhatsApp
            </p>
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
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        >
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
