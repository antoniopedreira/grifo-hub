import { useState, useMemo } from "react";
import { Megaphone, Copy, Save, ExternalLink, Pencil, Trash2 } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Tables } from "@/integrations/supabase/types";

export default function Marketing() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [utmSource, setUtmSource] = useState("");
  const [utmMedium, setUtmMedium] = useState("");
  const [utmCampaign, setUtmCampaign] = useState("");
  const [utmTerm, setUtmTerm] = useState("");
  const [utmContent, setUtmContent] = useState("");

  // Edit/Delete state
  const [editingLink, setEditingLink] = useState<Tables<"marketing_links"> | null>(null);
  const [deletingLinkId, setDeletingLinkId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    utm_source: "",
    utm_medium: "",
    utm_campaign: "",
    utm_term: "",
    utm_content: "",
  });

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

  // Update link mutation
  const updateLink = useMutation({
    mutationFn: async (link: Tables<"marketing_links">) => {
      // Recalculate destination_url with new UTM params
      const baseUrl = `${window.location.origin}/p/${link.slug}`;
      const params = new URLSearchParams();
      
      if (editForm.utm_source) params.append("utm_source", editForm.utm_source);
      if (editForm.utm_medium) params.append("utm_medium", editForm.utm_medium);
      if (editForm.utm_campaign) params.append("utm_campaign", editForm.utm_campaign);
      if (editForm.utm_term) params.append("utm_term", editForm.utm_term);
      if (editForm.utm_content) params.append("utm_content", editForm.utm_content);

      const queryString = params.toString();
      const newDestinationUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

      const { error } = await supabase
        .from("marketing_links")
        .update({
          utm_source: editForm.utm_source || null,
          utm_medium: editForm.utm_medium || null,
          utm_campaign: editForm.utm_campaign || null,
          destination_url: newDestinationUrl,
        })
        .eq("id", link.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-links"] });
      setEditingLink(null);
      toast({
        title: "Link atualizado!",
        description: "As alterações foram salvas com sucesso.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar o link.",
        variant: "destructive",
      });
    },
  });

  // Delete link mutation
  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_links").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketing-links"] });
      setDeletingLinkId(null);
      toast({
        title: "Link excluído!",
        description: "O link foi removido do histórico.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir o link.",
        variant: "destructive",
      });
    },
  });

  // Open edit dialog
  const handleOpenEdit = (link: Tables<"marketing_links">) => {
    // Parse UTM params from destination_url
    let parsedTerm = "";
    let parsedContent = "";
    try {
      const url = new URL(link.destination_url);
      parsedTerm = url.searchParams.get("utm_term") || "";
      parsedContent = url.searchParams.get("utm_content") || "";
    } catch {
      // Ignore parsing errors
    }

    setEditForm({
      utm_source: link.utm_source || "",
      utm_medium: link.utm_medium || "",
      utm_campaign: link.utm_campaign || "",
      utm_term: parsedTerm,
      utm_content: parsedContent,
    });
    setEditingLink(link);
  };

  // Copy link from table
  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copiado com sucesso!",
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
                    <TableHead className="text-right">Ações</TableHead>
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
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(link.destination_url)}
                            className="h-8 w-8 hover:text-secondary"
                            title="Copiar URL"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEdit(link)}
                            className="h-8 w-8 hover:text-secondary"
                            title="Editar"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingLinkId(link.id)}
                            className="h-8 w-8 hover:text-destructive"
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Edit Dialog */}
      <Dialog open={!!editingLink} onOpenChange={(open) => !open && setEditingLink(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-primary">Editar Link</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Slug (readonly) */}
            <div className="space-y-2">
              <Label className="text-primary font-medium">Slug/Produto</Label>
              <Input
                readOnly
                value={editingLink?.slug || ""}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O slug não pode ser alterado para manter a integridade do link.
              </p>
            </div>

            {/* UTM Source */}
            <div className="space-y-2">
              <Label className="text-primary font-medium">Origem (utm_source)</Label>
              <Input
                value={editForm.utm_source}
                onChange={(e) => setEditForm((f) => ({ ...f, utm_source: e.target.value }))}
                placeholder="ex: google, instagram"
              />
            </div>

            {/* UTM Medium */}
            <div className="space-y-2">
              <Label className="text-primary font-medium">Mídia (utm_medium)</Label>
              <Input
                value={editForm.utm_medium}
                onChange={(e) => setEditForm((f) => ({ ...f, utm_medium: e.target.value }))}
                placeholder="ex: cpc, stories"
              />
            </div>

            {/* UTM Campaign */}
            <div className="space-y-2">
              <Label className="text-primary font-medium">Campanha (utm_campaign)</Label>
              <Input
                value={editForm.utm_campaign}
                onChange={(e) => setEditForm((f) => ({ ...f, utm_campaign: e.target.value }))}
                placeholder="ex: black_friday"
              />
            </div>

            {/* UTM Term */}
            <div className="space-y-2">
              <Label className="text-primary font-medium">Termo (utm_term)</Label>
              <Input
                value={editForm.utm_term}
                onChange={(e) => setEditForm((f) => ({ ...f, utm_term: e.target.value }))}
                placeholder="ex: construcao_civil"
              />
            </div>

            {/* UTM Content */}
            <div className="space-y-2">
              <Label className="text-primary font-medium">Conteúdo (utm_content)</Label>
              <Input
                value={editForm.utm_content}
                onChange={(e) => setEditForm((f) => ({ ...f, utm_content: e.target.value }))}
                placeholder="ex: banner_v2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingLink(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => editingLink && updateLink.mutate(editingLink)}
              disabled={updateLink.isPending}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {updateLink.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete AlertDialog */}
      <AlertDialog open={!!deletingLinkId} onOpenChange={(open) => !open && setDeletingLinkId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-primary">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza? Este link deixará de aparecer no seu histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingLinkId && deleteLink.mutate(deletingLinkId)}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {deleteLink.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
