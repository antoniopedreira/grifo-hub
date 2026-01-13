import { useState } from "react";
import { Eye, ExternalLink, Trash2, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { Tables } from "@/integrations/supabase/types";

interface ProductCardProps {
  product: Tables<"products">;
}

export function ProductCard({ product }: ProductCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();

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
          <div className="pt-2 border-t border-border flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex-1">
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
