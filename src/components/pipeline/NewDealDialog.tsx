import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, User, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

interface NewDealDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pipelineId: string;
  firstStageId: string;
}

export function NewDealDialog({
  open,
  onOpenChange,
  pipelineId,
  firstStageId,
}: NewDealDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [leadTab, setLeadTab] = useState<"existing" | "new">("existing");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [estimatedValue, setEstimatedValue] = useState("");
  const [priority, setPriority] = useState("Medium");

  // New lead fields
  const [newLeadName, setNewLeadName] = useState("");
  const [newLeadEmail, setNewLeadEmail] = useState("");
  const [newLeadPhone, setNewLeadPhone] = useState("");

  // Fetch leads
  const { data: leads } = useQuery({
    queryKey: ["leads-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, email")
        .order("full_name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch products
  const { data: products } = useQuery({
    queryKey: ["products-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Create deal mutation
  const createDeal = useMutation({
    mutationFn: async () => {
      let leadId = selectedLeadId;

      // Create new lead if needed
      if (leadTab === "new") {
        const { data: newLead, error: leadError } = await supabase
          .from("leads")
          .insert({
            full_name: newLeadName,
            email: newLeadEmail || null,
            phone: newLeadPhone || null,
            status: "Novo",
            origin: "crm_manual",
          })
          .select("id")
          .single();

        if (leadError) throw leadError;
        leadId = newLead.id;
      }

      // Get product price as default value if not set
      const product = products?.find((p) => p.id === selectedProductId);
      const value = estimatedValue
        ? parseFloat(estimatedValue.replace(",", "."))
        : product?.price || null;

      const { error } = await supabase.from("deals").insert({
        lead_id: leadId,
        product_id: selectedProductId || null,
        pipeline_id: pipelineId,
        stage_id: firstStageId,
        value,
        priority,
        status: "open",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["deals"] });
      queryClient.invalidateQueries({ queryKey: ["leads-list"] });
      toast({
        title: "Negócio criado!",
        description: "O card foi adicionado ao pipeline.",
      });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Erro ao criar negócio",
        description: "Não foi possível criar o card.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setLeadTab("existing");
    setSelectedLeadId("");
    setSelectedProductId("");
    setEstimatedValue("");
    setPriority("Medium");
    setNewLeadName("");
    setNewLeadEmail("");
    setNewLeadPhone("");
  };

  const canSubmit =
    (leadTab === "existing" && selectedLeadId) ||
    (leadTab === "new" && newLeadName.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Novo Negócio
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Lead Selection */}
          <div className="space-y-3">
            <Label className="text-primary font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Lead
            </Label>

            <Tabs
              value={leadTab}
              onValueChange={(v) => setLeadTab(v as "existing" | "new")}
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Lead Existente</TabsTrigger>
                <TabsTrigger value="new">Criar Novo</TabsTrigger>
              </TabsList>

              <TabsContent value="existing" className="mt-3">
                <Select value={selectedLeadId} onValueChange={setSelectedLeadId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um lead..." />
                  </SelectTrigger>
                  <SelectContent>
                    {leads?.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.full_name || lead.email || "Lead sem nome"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </TabsContent>

              <TabsContent value="new" className="mt-3 space-y-3">
                <Input
                  placeholder="Nome completo *"
                  value={newLeadName}
                  onChange={(e) => setNewLeadName(e.target.value)}
                />
                <Input
                  type="email"
                  placeholder="Email"
                  value={newLeadEmail}
                  onChange={(e) => setNewLeadEmail(e.target.value)}
                />
                <Input
                  placeholder="Telefone"
                  value={newLeadPhone}
                  onChange={(e) => setNewLeadPhone(e.target.value)}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Product Selection */}
          <div className="space-y-2">
            <Label className="text-primary font-medium flex items-center gap-2">
              <Package className="h-4 w-4" />
              Produto
            </Label>
            <Select value={selectedProductId} onValueChange={setSelectedProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um produto..." />
              </SelectTrigger>
              <SelectContent>
                {products?.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}{" "}
                    {product.price && (
                      <span className="text-muted-foreground">
                        (R$ {product.price.toFixed(2)})
                      </span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Estimated Value */}
          <div className="space-y-2">
            <Label className="text-primary font-medium">Valor Estimado (R$)</Label>
            <Input
              type="text"
              placeholder="0,00"
              value={estimatedValue}
              onChange={(e) => setEstimatedValue(e.target.value)}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label className="text-primary font-medium">Prioridade</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="High">Alta</SelectItem>
                <SelectItem value="Medium">Média</SelectItem>
                <SelectItem value="Low">Baixa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={() => createDeal.mutate()}
            disabled={!canSubmit || createDeal.isPending}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            {createDeal.isPending ? "Criando..." : "Criar Negócio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
