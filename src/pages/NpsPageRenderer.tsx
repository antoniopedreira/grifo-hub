import { Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Home, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { getNpsTemplateComponent } from "@/components/templates/registry";
import NpsFormPublic from "@/components/nps/NpsFormPublic";

export default function NpsPageRenderer() {
  const { slug } = useParams<{ slug: string }>();

  // Fetch NPS form by slug (with product and template info)
  const { data: npsForm, isLoading, error } = useQuery({
    queryKey: ["nps-form-public", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nps_forms")
        .select("*, products(name), page_templates(component_key)")
        .eq("slug", slug)
        .eq("active", true)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  // Loading state
  if (isLoading) {
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
  if (error || !npsForm) {
    return <NotFoundPage />;
  }

  const productName = (npsForm.products as { name: string } | null)?.name;
  const componentKey = (npsForm.page_templates as { component_key: string } | null)?.component_key;
  
  // Get the template component from registry
  const TemplateComponent = componentKey ? getNpsTemplateComponent(componentKey) : null;

  // Use the template component if found, otherwise fallback to NpsFormPublic (legacy)
  if (TemplateComponent) {
    return (
      <Suspense
        fallback={
          <div className="min-h-screen bg-primary flex items-center justify-center">
            <Loader2 className="h-12 w-12 animate-spin text-secondary" />
          </div>
        }
      >
        <TemplateComponent
          form={{
            id: npsForm.id,
            title: npsForm.title,
            description: npsForm.description,
          }}
          productName={productName}
        />
      </Suspense>
    );
  }

  // Fallback to legacy component (NpsFormPublic) if no template is set
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-primary flex items-center justify-center">
          <Loader2 className="h-12 w-12 animate-spin text-secondary" />
        </div>
      }
    >
      <NpsFormPublic form={npsForm} productName={productName} />
    </Suspense>
  );
}

function NotFoundPage({ message = "Pesquisa não encontrada ou inativa" }: { message?: string }) {
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
