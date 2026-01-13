import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Package, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductWizard } from "@/components/products/ProductWizard";

export default function Produtos() {
  const [wizardOpen, setWizardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("todos");

  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(id, name, slug)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

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

  const filterProducts = (categorySlug: string | null) => {
    if (!products) return [];
    if (!categorySlug) return products;
    
    return products.filter((p) => {
      const category = p.product_categories as { slug: string } | null;
      return category?.slug === categorySlug;
    });
  };

  const getFilteredProducts = () => {
    switch (activeTab) {
      case "basicos":
        return filterProducts("basicos");
      case "intermediarios":
        return filterProducts("intermediarios");
      case "avancados":
        return filterProducts("avancados");
      default:
        return filterProducts(null);
    }
  };

  const filteredProducts = getFilteredProducts();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-secondary" />
          <h1 className="text-3xl font-bold text-primary">Produtos</h1>
        </div>
        
        <Button 
          onClick={() => setWizardOpen(true)}
          className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-muted">
          <TabsTrigger value="todos">Todos</TabsTrigger>
          <TabsTrigger value="basicos">Básicos</TabsTrigger>
          <TabsTrigger value="intermediarios">Intermediários</TabsTrigger>
          <TabsTrigger value="avancados">Avançados</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {productsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <p className="text-muted-foreground">
                {activeTab === "todos" 
                  ? "Nenhum produto cadastrado. Clique em \"Novo Produto\" para começar."
                  : `Nenhum produto nesta categoria.`}
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProductWizard open={wizardOpen} onOpenChange={setWizardOpen} />
    </div>
  );
}
