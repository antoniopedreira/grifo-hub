import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import type { Database, Tables } from "@/integrations/supabase/types";

type FunnelType = Database["public"]["Enums"]["product_funnel_type"];

interface ProductEditSheetProps {
  product: Tables<"products"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductForm {
  name: string;
  price: string;
  category_id: string;
  funnel_type: FunnelType;
  checkout_url: string;
  template_id: string;
  slug: string;
  create_deal: boolean;
  active: boolean;
  external_id: string;
  pipeline_id: string;
  is_crm_trigger: boolean; // ADICIONADO AQUI
}

export function ProductEditSheet({ product, open, onOpenChange }: ProductEditSheetProps) {
  const [form, setForm] = useState<ProductForm>({
    name: "",
    price: "",
    category_id: "",
    funnel_type: "external_link",
    checkout_url: "",
    template_id: "",
    slug: "",
    create_deal: false,
    active: true,
    external_id: "",
    pipeline_id: "",
    is_crm_trigger: false, // VALOR INICIAL
  });

  const queryClient = useQueryClient();

  // Populate form when product changes
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || "",
        price: product.price?.toString() || "",
        category_id: product.category_id || "",
        funnel_type: product.funnel_type || "external_link",
        checkout_url: product.checkout_url || "",
        template_id: product.template_id || "",
        slug: product.slug || "",
        create_deal: product.create_deal || false,
        active: product.active ?? true,
        external_id: product.external_id || "",
        pipeline_id: (product as any).pipeline_id || "",
        is_crm_trigger: (product as any).is_crm_trigger ?? false, // CARREGA DO BANCO
      });
    }
  }, [product]);

  const { data: categories } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_categories").select("*").order("name");

      if (error) throw error;
      return data;
    },
  });

  // Fetch pipelines for the pipeline selector
  const { data: pipelines } = useQuery({
    queryKey: ["pipelines"],
    queryFn: async () => {
      const { data, error } = await supabase.from("pipelines").select("*").eq("archived", false).order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: landingPageTemplates } = useQuery({
    queryKey: ["page_templates", "landing_page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_templates")
        .select("*")
        .eq("type", "landing_page")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const { data: formTemplates } = useQuery({
    queryKey: ["page_templates", "application_form"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_templates")
        .select("*")
        .eq("type", "application_form")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  const updateProduct = useMutation({
    mutationFn: async () => {
      if (!product) throw new Error("Produto não encontrado");

      const productData = {
        name: form.name,
        price: form.price ? parseFloat(form.price) : null,
        category_id: form.category_id || null,
        funnel_type: form.funnel_type,
        checkout_url: form.funnel_type === "external_link" ? form.checkout_url : null,
        template_id: form.template_id || null,
        slug: form.slug || null,
        create_deal: form.create_deal,
        active: form.active,
        external_id: form.external_id || null,
        pipeline_id: form.create_deal && form.pipeline_id ? form.pipeline_id : null,
        is_crm_trigger: form.is_crm_trigger, // ENVIA PARA O BANCO
      };

      const { data, error } = await supabase
        .from("products")
        .update(productData)
        .eq("id", product.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto atualizado com sucesso!");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });

  const generateSlug = () => {
    if (form.name) {
      const slug = form.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      setForm({ ...form, slug });
    }
  };

  const handleSubmit = () => {
    if (!form.name) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    updateProduct.mutate();
  };

  if (!product) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary">Editar Produto</SheetTitle>
          <SheetDescription>Altere as configurações do produto</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-primary text-sm">Informações Básicas</h3>

            <div className="space-y-2">
              <Label htmlFor="name">Nome do Produto *</Label>
              <Input
                id="name"
                placeholder="Ex: Curso de Marketing Digital"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="external_id">ID do Produto na Lastlink</Label>
              <Input
                id="external_id"
                placeholder="Ex: 98273-abcde..."
                value={form.external_id}
                onChange={(e) => setForm({ ...form, external_id: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Cole aqui o ID do produto na Lastlink. Isso permitirá que o n8n identifique a venda automaticamente.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={form.category_id} onValueChange={(value) => setForm({ ...form, category_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma categoria" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-lg border border-border">
              <Switch
                id="active"
                checked={form.active}
                onCheckedChange={(checked) => setForm({ ...form, active: checked })}
              />
              <div>
                <Label htmlFor="active" className="cursor-pointer">
                  Produto Ativo
                </Label>
                <p className="text-xs text-muted-foreground">Produtos inativos não aparecem na página pública</p>
              </div>
            </div>
          </div>

          {/* Funnel Config */}
          <div className="space-y-4">
            <h3 className="font-semibold text-primary text-sm">Configuração do Funil</h3>

            <div className="space-y-2">
              <Label htmlFor="funnel_type">Tipo de Página *</Label>
              <Select
                value={form.funnel_type}
                onValueChange={(value: FunnelType) =>
                  setForm({ ...form, funnel_type: value, template_id: "", checkout_url: "" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external_link">Página de Vendas (Landing Pages)</SelectItem>
                  <SelectItem value="internal_form">Formulários</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.funnel_type === "external_link" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="template">Template Visual</Label>
                  <Select value={form.template_id} onValueChange={(value) => setForm({ ...form, template_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma Landing Page" />
                    </SelectTrigger>
                    <SelectContent>
                      {landingPageTemplates?.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="checkout_url">Link do CTA (Checkout)</Label>
                  <Input
                    id="checkout_url"
                    type="url"
                    placeholder="https://lastlink.com/p/XXXXX"
                    value={form.checkout_url}
                    onChange={(e) => setForm({ ...form, checkout_url: e.target.value })}
                  />
                </div>
              </>
            )}

            {form.funnel_type === "internal_form" && (
              <div className="space-y-2">
                <Label htmlFor="template">Template do Formulário</Label>
                <Select value={form.template_id} onValueChange={(value) => setForm({ ...form, template_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um formulário" />
                  </SelectTrigger>
                  <SelectContent>
                    {formTemplates?.map((tpl) => (
                      <SelectItem key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Create Deal Switch */}
            <div className="flex items-start gap-4 p-4 rounded-lg border border-border bg-muted/50">
              <Switch
                id="create_deal"
                checked={form.create_deal}
                onCheckedChange={(checked) =>
                  setForm({ ...form, create_deal: checked, pipeline_id: checked ? form.pipeline_id : "" })
                }
              />
              <div className="space-y-1">
                <Label htmlFor="create_deal" className="font-medium cursor-pointer">
                  Gerar Card no Kanban de Vendas?
                </Label>
                <p className="text-xs text-muted-foreground">
                  {form.funnel_type === "internal_form"
                    ? 'Se ativado, cada resposta do formulário criará automaticamente um negócio na coluna "Novo Lead".'
                    : "Se ativado, futuras integrações criarão automaticamente um negócio no Kanban quando uma venda for registrada."}
                </p>
              </div>
            </div>

            {/* Pipeline Selector */}
            {form.create_deal && (
              <div className="space-y-2 pl-4 border-l-2 border-secondary/50">
                <Label htmlFor="pipeline_id">Funil de Destino Automático</Label>
                <Select
                  value={form.pipeline_id}
                  onValueChange={(value) => setForm({ ...form, pipeline_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um funil..." />
                  </SelectTrigger>
                  <SelectContent className="min-w-[--radix-select-trigger-width]">
                    <SelectItem value="none">Sem funil padrão</SelectItem>
                    {pipelines?.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Ao ocorrer uma venda deste produto, o sistema enviará o card automaticamente para este funil.
                </p>
              </div>
            )}

            {/* NOVO CAMPO: Ativa Onboarding (CRM) */}
            <div className="flex items-start gap-4 p-4 rounded-lg border border-blue-200 bg-blue-50/50">
              <Switch
                id="is_crm_trigger"
                checked={form.is_crm_trigger}
                onCheckedChange={(checked) => setForm({ ...form, is_crm_trigger: checked })}
                className="data-[state=checked]:bg-blue-600"
              />
              <div className="space-y-1">
                <Label htmlFor="is_crm_trigger" className="font-medium cursor-pointer text-blue-900">
                  Ativa Onboarding (CRM)?
                </Label>
                <p className="text-xs text-blue-700/80">
                  Se ativado, vendas deste produto criarão automaticamente um card na aba "CRM" (fase Q1) para
                  acompanhamento da jornada do cliente.
                </p>
              </div>
            </div>
          </div>

          {/* Slug */}
          <div className="space-y-4">
            <h3 className="font-semibold text-primary text-sm">URL Amigável</h3>

            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <div className="flex gap-2">
                <Input
                  id="slug"
                  placeholder="meu-produto"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                />
                <Button type="button" variant="outline" onClick={generateSlug} className="shrink-0">
                  Gerar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">URL final: /p/{form.slug || "slug-do-produto"}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={updateProduct.isPending || !form.name}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            {updateProduct.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
