import { useState, useMemo } from "react";
import { Megaphone, Copy, Save, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Marketing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");

  // Fetch active products
  const { data: products } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, slug")
        .eq("active", true)
        .not("slug", "is", null)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch marketing links history
  const { data: marketingLinks } = useQuery({
    queryKey: ["marketing-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_links")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Save link mutation
  const saveLink = useMutation({
    mutationFn: async () => {
      const selectedProduct = products?.find((p) => p.id === selectedProductId);
      if (!selectedProduct?.slug) throw new Error("Produto sem slug");

      const { error } = await supabase.from("marketing_links").insert({
        slug: selectedProduct.slug,
        destination_url: generatedUrl,
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-links"] });
      toast({
        title: "Link salvo!",
        description: "O link foi salvo no histórico com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar o link.",
        variant: "destructive",
      });
    },
  });

  // Get selected product
  const selectedProduct = products?.find((p) => p.id === selectedProductId);

  // Generate URL in real-time
  const generatedUrl = useMemo(() => {
    if (!selectedProduct?.slug) return "";

    const baseUrl = `${window.location.origin}/p/${selectedProduct.slug}`;
    const params = new URLSearchParams();

    if (utmSource) params.append("utm_source", utmSource);
    if (utmMedium) params.append("utm_medium", utmMedium);
    if (utmCampaign) params.append("utm_campaign", utmCampaign);
    if (utmTerm) params.append("utm_term", utmTerm);
    if (utmContent) params.append("utm_content", utmContent);

    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }, [selectedProduct, utmSource, utmMedium, utmCampaign, utmTerm, utmContent]);

  // Copy to clipboard
  const handleCopy = async () => {
    if (!generatedUrl) return;
    try {
      await navigator.clipboard.writeText(generatedUrl);
      toast({
        title: "URL copiada!",
        description: "O link foi copiado para a área de transferência.",
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link.",
        variant: "destructive",
      });
    }
  };

  const canSave = selectedProduct?.slug && generatedUrl;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Megaphone className="h-8 w-8 text-secondary" />
        <h1 className="text-3xl font-bold text-primary">
          Gerador de Links Rastreáveis
        </h1>
      </div>

      {/* Main Card - Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Criar Novo Link com UTM</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Product Select */}
          <div className="space-y-2">
            <Label htmlFor="product" className="text-primary font-medium">
              Produto Alvo
            </Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger id="product">
                <SelectValue placeholder="Selecione um produto..." />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedProduct?.slug && (
              <p className="text-sm text-muted-foreground">
                URL Base: {window.location.origin}/p/{selectedProduct.slug}
              </p>
            )}
          </div>

          {/* UTM Parameters Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="utm_source" className="text-primary font-medium">
                Origem (utm_source)
              </Label>
              <Input
                id="utm_source"
                placeholder="ex: google, instagram"
                value={utmSource}
                onChange={(e) => setUtmSource(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utm_medium" className="text-primary font-medium">
                Mídia (utm_medium)
              </Label>
              <Input
                id="utm_medium"
                placeholder="ex: cpc, stories"
                value={utmMedium}
                onChange={(e) => setUtmMedium(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utm_campaign" className="text-primary font-medium">
                Campanha (utm_campaign)
              </Label>
              <Input
                id="utm_campaign"
                placeholder="ex: black_friday"
                value={utmCampaign}
                onChange={(e) => setUtmCampaign(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utm_term" className="text-primary font-medium">
                Termo (utm_term)
              </Label>
              <Input
                id="utm_term"
                placeholder="ex: construcao_civil"
                value={utmTerm}
                onChange={(e) => setUtmTerm(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utm_content" className="text-primary font-medium">
                Conteúdo (utm_content)
              </Label>
              <Input
                id="utm_content"
                placeholder="ex: banner_v2"
                value={utmContent}
                onChange={(e) => setUtmContent(e.target.value)}
              />
            </div>
          </div>

          {/* Generated URL Output */}
          <div className="space-y-2">
            <Label className="text-primary font-medium">URL Gerada</Label>
            <div className="relative">
              <Input
                readOnly
                value={generatedUrl}
                placeholder="Selecione um produto para gerar a URL..."
                className="bg-muted pr-10 font-mono text-sm"
              />
              {generatedUrl && (
                <a
                  href={generatedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleCopy}
              disabled={!generatedUrl}
              variant="outline"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copiar URL
            </Button>
            <Button
              onClick={() => saveLink.mutate()}
              disabled={!canSave || saveLink.isPending}
              className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              <Save className="h-4 w-4" />
              {saveLink.isPending ? "Salvando..." : "Salvar Link"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-primary">Links Salvos Recentemente</CardTitle>
        </CardHeader>
        <CardContent>
          {marketingLinks && marketingLinks.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Slug/Produto</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Mídia</TableHead>
                  <TableHead className="text-center">Cliques</TableHead>
                  <TableHead>Data de Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {marketingLinks.map((link) => (
                  <TableRow key={link.id}>
                    <TableCell className="font-medium">{link.slug}</TableCell>
                    <TableCell>{link.utm_campaign || "-"}</TableCell>
                    <TableCell>{link.utm_source || "-"}</TableCell>
                    <TableCell>{link.utm_medium || "-"}</TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-full bg-secondary/10 px-2.5 py-0.5 text-sm font-medium text-secondary">
                        {link.clicks_count || 0}
                      </span>
                    </TableCell>
                    <TableCell>
                      {link.created_at
                        ? format(new Date(link.created_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              Nenhum link salvo ainda. Crie seu primeiro link acima!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
