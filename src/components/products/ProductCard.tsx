import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  return (
    <Card className="border-tertiary hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg text-primary line-clamp-1">
            {product.name}
          </CardTitle>
          <Badge 
            variant={product.active ? "default" : "secondary"}
            className={product.active ? "bg-green-600 text-white" : ""}
          >
            {product.active ? "Ativo" : "Inativo"}
          </Badge>
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
      </CardContent>
    </Card>
  );
}
