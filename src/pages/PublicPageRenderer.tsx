import { Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Home, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getTemplateComponent } from "@/components/templates/registry";
import { Button } from "@/components/ui/button";

export default function PublicPageRenderer() {
  const { slug } = useParams<{ slug: string }>();

  // Fetch product by slug
  const { data: product, isLoading: productLoading, error: productError } = useQuery({
    queryKey: ["public-product", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, page_templates(*)")
        .eq("slug", slug)
        .eq("active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Loading state
  if (productLoading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-secondary mx-auto" />
          <p className="mt-4 text-white/70">Carregando...</p>
        </div>
      </div>
    );
  }

  // Error or not found state
  if (productError || !product) {
    return <NotFoundPage />;
  }

  // Get template from product
  const template = product.page_templates as { component_key: string } | null;
  
  if (!template?.component_key) {
    return <NotFoundPage message="Este produto não possui um template configurado." />;
  }

  // Get the component from registry
  const TemplateComponent = getTemplateComponent(template.component_key);

  if (!TemplateComponent) {
    return <NotFoundPage message="Template não encontrado no sistema." />;
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-primary flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-secondary" />
        </div>
      }
    >
      <TemplateComponent product={product} />
    </Suspense>
  );
}

function NotFoundPage({ message = "Página não encontrada" }: { message?: string }) {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-secondary/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertTriangle className="h-10 w-10 text-secondary" />
        </div>
        
        <h1 className="text-4xl font-bold text-white mb-4">404</h1>
        <p className="text-white/70 text-lg mb-8">{message}</p>
        
        <Link to="/">
          <Button 
            variant="outline" 
            className="border-secondary text-secondary hover:bg-secondary hover:text-secondary-foreground"
          >
            <Home className="h-4 w-4 mr-2" />
            Voltar ao Início
          </Button>
        </Link>
      </div>
    </div>
  );
}
