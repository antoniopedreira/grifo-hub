import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, ChevronRight, ChevronLeft, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type FunnelType = Database["public"]["Enums"]["product_funnel_type"];

interface ProductWizardProps {
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
}

const initialForm: ProductForm = {
  name: "",
  price: "",
  category_id: "",
  funnel_type: "external_link",
  checkout_url: "",
  template_id: "",
  slug: "",
};

export function ProductWizard({ open, onOpenChange }: ProductWizardProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<ProductForm>(initialForm);
  
  const queryClient = useQueryClient();

  const { data: categories } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["page_templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_templates")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data;
    },
  });

  const createProduct = useMutation({
    mutationFn: async () => {
      const productData = {
        name: form.name,
        price: form.price ? parseFloat(form.price) : null,
        category_id: form.category_id || null,
        funnel_type: form.funnel_type,
        checkout_url: form.funnel_type === "external_link" ? form.checkout_url : null,
        template_id: form.funnel_type === "internal_form" ? form.template_id : null,
        slug: form.slug || null,
        active: true,
      };

      const { data, error } = await supabase
        .from("products")
        .insert(productData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto criado com sucesso!");
      handleClose();
    },
    onError: (error) => {
      toast.error("Erro ao criar produto: " + error.message);
    },
  });

  const handleClose = () => {
    setStep(1);
    setForm(initialForm);
    onOpenChange(false);
  };

  const canProceedStep1 = form.name.trim() !== "";
  const canProceedStep2 = 
    form.funnel_type === "external_link" 
      ? form.checkout_url.trim() !== "" 
      : form.template_id !== "";

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    if (!form.name) {
      toast.error("Nome do produto é obrigatório");
      return;
    }
    createProduct.mutate();
  };

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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[500px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary">Novo Produto</SheetTitle>
          <SheetDescription>
            Etapa {step} de 3
          </SheetDescription>
        </SheetHeader>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mt-4 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-secondary" : "bg-muted"
              }`}
            />
          ))}
        </div>

        <div className="space-y-6 py-4">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Informações Básicas</h3>
              
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
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={form.category_id}
                  onValueChange={(value) => setForm({ ...form, category_id: value })}
                >
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
            </div>
          )}

          {/* Step 2: Funnel */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">Configuração do Funil</h3>
              
              <div className="space-y-2">
                <Label htmlFor="funnel_type">Tipo de Funil *</Label>
                <Select
                  value={form.funnel_type}
                  onValueChange={(value: FunnelType) => setForm({ ...form, funnel_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="external_link">Link Externo (Checkout)</SelectItem>
                    <SelectItem value="internal_form">Formulário Interno</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {form.funnel_type === "external_link" && (
                <div className="space-y-2">
                  <Label htmlFor="checkout_url">URL do Checkout *</Label>
                  <Input
                    id="checkout_url"
                    type="url"
                    placeholder="https://checkout.exemplo.com/produto"
                    value={form.checkout_url}
                    onChange={(e) => setForm({ ...form, checkout_url: e.target.value })}
                  />
                </div>
              )}
              
              {form.funnel_type === "internal_form" && (
                <div className="space-y-2">
                  <Label htmlFor="template">Template Visual *</Label>
                  <Select
                    value={form.template_id}
                    onValueChange={(value) => setForm({ ...form, template_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {templates?.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Nenhum template disponível. Crie um em Templates.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Slug */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold text-primary">URL Amigável</h3>
              
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <div className="flex gap-2">
                  <Input
                    id="slug"
                    placeholder="meu-produto"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={generateSlug}
                    className="shrink-0"
                  >
                    Gerar
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  URL final: /p/{form.slug || "slug-do-produto"}
                </p>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-muted rounded-lg space-y-2">
                <h4 className="font-medium text-sm">Resumo</h4>
                <div className="text-sm space-y-1">
                  <p><span className="text-muted-foreground">Nome:</span> {form.name}</p>
                  <p><span className="text-muted-foreground">Preço:</span> {form.price ? `R$ ${form.price}` : "—"}</p>
                  <p><span className="text-muted-foreground">Funil:</span> {form.funnel_type === "external_link" ? "Link Externo" : "Formulário Interno"}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? handleClose : handleBack}
          >
            {step === 1 ? (
              "Cancelar"
            ) : (
              <>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Voltar
              </>
            )}
          </Button>
          
          {step < 3 ? (
            <Button
              type="button"
              onClick={handleNext}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              Próximo
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={createProduct.isPending}
              className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
            >
              {createProduct.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Criar Produto
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
