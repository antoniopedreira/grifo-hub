import { useState } from "react";
import { Eye, Trash2, Loader2, Pencil, Zap, BarChart3 } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductEditSheet } from "./ProductEditSheet";
import NpsResultsSheet from "@/components/nps/NpsResultsSheet";
import type { Tables } from "@/integrations/supabase/types";

interface ProductCardProps {
  product: Tables<"products">;
}

export function ProductCard({ product }: ProductCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [npsResultsOpen, setNpsResultsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Check if product has linked NPS form
  const { data: linkedNpsForm } = useQuery({
    queryKey: ["nps_form_for_product", product.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_forms")
        .select("id, title, slug")
        .eq("product_id", product.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const hasSlug = !!product.slug;
  const hasTemplate = !!product.template_id;
  const canViewPage = hasSlug && hasTemplate;
  const isFormType = product.funnel_type === "internal_form";

  const handleViewPage = () => {
    if (canViewPage) {
      window.open(`/p/${product.slug}`, "_blank");
    }
  };

  const deleteProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", product.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produto excluído com sucesso!");
      setDeleteDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Erro ao excluir produto: " + error.message);
    },
  });

  return (
    <>
      <Card className="border-tertiary hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <CardTitle className="text-lg text-primary line-clamp-1">
              {product.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              {/* Create Deal Indicator */}
              {isFormType && product.create_deal && (
                <Tooltip>
                  <TooltipTrigger>
                    <Badge 
                      variant="outline"
                      className="border-secondary text-secondary bg-secondary/10"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Kanban
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    Gera card automaticamente no Pipeline de Vendas
                  </TooltipContent>
                </Tooltip>
              )}
              <Badge 
                variant={product.active ? "default" : "secondary"}
                className={product.active ? "bg-green-600 text-white" : ""}
              >
                {product.active ? "Ativo" : "Inativo"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Preço</span>
            <span className="font-semibold text-secondary">
              {formatPrice(product.price)}
            </span>
          </div>
          
          {product.external_id && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ID Lastlink</span>
              <code className="text-xs bg-muted px-2 py-1 rounded max-w-[120px] truncate text-muted-foreground">
                {product.external_id}
              </code>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Slug</span>
            <code className="text-xs bg-muted px-2 py-1 rounded max-w-[150px] truncate">
              {product.slug || "—"}
            </code>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Tipo</span>
            <Badge variant="outline" className="text-xs">
              {product.funnel_type === "external_link" ? "Página de Vendas" : "Formulário"}
            </Badge>
          </div>

          {/* Actions */}
          <div className="pt-2 border-t border-border flex flex-wrap gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1 min-w-[100px]">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleViewPage}
                    disabled={!canViewPage}
                    className="w-full border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground disabled:opacity-50"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Página
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {!hasSlug
                  ? "Configure um slug para visualizar"
                  : !hasTemplate
                  ? "Configure um template para visualizar"
                  : "Abrir página pública em nova aba"}
              </TooltipContent>
            </Tooltip>

            {linkedNpsForm && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setNpsResultsOpen(true)}
                    className="border-green-600 text-green-700 hover:bg-green-100"
                  >
                    <BarChart3 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Ver resultados NPS</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditSheetOpen(true)}
                  className="border-muted-foreground/30 text-muted-foreground hover:bg-muted"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Editar produto</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Excluir produto</TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      <ProductEditSheet
        product={product}
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
      />

      {/* NPS Results Sheet */}
      {linkedNpsForm && (
        <NpsResultsSheet
          open={npsResultsOpen}
          onOpenChange={setNpsResultsOpen}
          form={{
            id: linkedNpsForm.id,
            title: linkedNpsForm.title,
            slug: linkedNpsForm.slug,
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>"{product.name}"</strong>?
              <br /><br />
              Esta ação não pode ser desfeita. A página pública associada deixará de funcionar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProduct.mutate()}
              disabled={deleteProduct.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProduct.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
