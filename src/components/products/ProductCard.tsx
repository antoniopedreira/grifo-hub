import { Eye, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { Tables } from "@/integrations/supabase/types";

interface ProductCardProps {
  product: Tables<"products">;
}

export function ProductCard({ product }: ProductCardProps) {
  const formatPrice = (price: number | null) => {
    if (price === null) return "—";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const hasSlug = !!product.slug;
  const isInternalForm = product.funnel_type === "internal_form";
  const canViewPage = hasSlug && isInternalForm;

  const handleViewPage = () => {
    if (canViewPage) {
      window.open(`/p/${product.slug}`, "_blank");
    }
  };

  return (
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
          <span className="text-sm text-muted-foreground">Funil</span>
          <Badge variant="outline" className="text-xs">
            {product.funnel_type === "external_link" ? "Link Externo" : "Formulário"}
          </Badge>
        </div>

        {/* View Page Button */}
        <div className="pt-2 border-t border-border">
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewPage}
                  disabled={!canViewPage}
                  className="w-full border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground disabled:opacity-50"
                >
                  {isInternalForm ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Página
                    </>
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Link Externo
                    </>
                  )}
                </Button>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              {!hasSlug
                ? "Configure um slug para visualizar a página"
                : !isInternalForm
                ? "Produto usa link de checkout externo"
                : "Abrir página pública em nova aba"}
            </TooltipContent>
          </Tooltip>
        </div>
      </CardContent>
    </Card>
  );
}
