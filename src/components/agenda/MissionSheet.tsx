import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Target, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;
type TeamMember = Tables<"team_members">;
type MissionStatus = Enums<"mission_status">;

const statuses: MissionStatus[] = ["Pendente", "Em Andamento", "Em Revisão", "Concluído", "Stand-by"];

const formSchema = z.object({
  mission: z.string().min(3, "Missão deve ter pelo menos 3 caracteres"),
  department: z.string().optional(),
  target_goal: z.string().optional(),
  owner_id: z.string().optional(),
  support_ids: z.array(z.string()).optional(),
  deadline: z.date().optional(),
  status: z.enum(["Pendente", "Em Andamento", "Em Revisão", "Concluído", "Stand-by"]),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MissionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mission: Mission | null;
}

export function MissionSheet({ open, onOpenChange, mission }: MissionSheetProps) {
  const queryClient = useQueryClient();
  const isEditing = !!mission;

  const { data: members = [] } = useQuery({
    queryKey: ["team_members", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("team_members")
        .select("*")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data as TeamMember[];
    },
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      mission: "",
      department: "",
      target_goal: "",
      owner_id: "",
      support_ids: [],
      deadline: undefined,
      status: "Pendente",
      notes: "",
    },
  });

  useEffect(() => {
    if (mission) {
      const missionData = mission as any;
      form.reset({
        mission: mission.mission,
        department: mission.department || "",
        target_goal: mission.target_goal || "",
        owner_id: mission.owner_id || "",
        support_ids: missionData.support_ids || [],
        deadline: mission.deadline ? new Date(mission.deadline) : undefined,
        status: mission.status || "Pendente",
        notes: mission.notes || "",
      });
    } else {
      form.reset({
        mission: "",
        department: "",
        target_goal: "",
        owner_id: "",
        support_ids: [],
        deadline: undefined,
        status: "Pendente",
        notes: "",
      });
    }
  }, [mission, form, open]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        mission: data.mission,
        department: data.department || null,
        target_goal: data.target_goal || null,
        owner_id: data.owner_id || null,
        support_ids: data.support_ids || [],
        deadline: data.deadline ? data.deadline.toISOString() : null,
        status: data.status,
        notes: data.notes || null,
      };

      if (isEditing) {
        const { error } = await supabase
          .from("team_missions")
          .update(payload as any)
          .eq("id", mission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_missions").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_missions"] });
      toast.success(isEditing ? "Missão atualizada!" : "Missão criada!");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar missão.");
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary flex items-center gap-2">
            <Target className="h-5 w-5" />
            {isEditing ? "Editar Missão" : "Nova Missão"}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? "Atualize os detalhes da missão." : "Cadastre uma nova missão para a equipe."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-6">
            <FormField
              control={form.control}
              name="mission"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Missão *</FormLabel>
                  <FormControl>
                    <Input placeholder="Descreva a missão..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="department"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Setor</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Marketing, Obras, Financeiro..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="target_goal"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Meta Alvo</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Aumentar vendas em 20%" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="owner_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Responsável</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {members.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="support_ids"
                render={({ field }) => {
                  const selectedIds = field.value || [];
                  const availableMembers = members.filter((m) => !selectedIds.includes(m.id));
                  
                  const handleAddSupport = (memberId: string) => {
                    field.onChange([...selectedIds, memberId]);
                  };
                  
                  const handleRemoveSupport = (memberId: string) => {
                    field.onChange(selectedIds.filter((id) => id !== memberId));
                  };
                  
                  return (
                    <FormItem>
                      <FormLabel>Apoio(s)</FormLabel>
                      <Select onValueChange={handleAddSupport} value="">
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Adicionar apoio" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {availableMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedIds.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {selectedIds.map((id) => {
                            const member = members.find((m) => m.id === id);
                            return (
                              <Badge key={id} variant="secondary" className="gap-1 pr-1">
                                {member?.name || "Desconhecido"}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSupport(id)}
                                  className="ml-1 hover:bg-muted rounded-full p-0.5"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
            </div>

            <FormField
              control={form.control}
              name="deadline"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Prazo Final</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: ptBR })
                          ) : (
                            <span>Selecione uma data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione observações..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              >
                {mutation.isPending ? "Salvando..." : isEditing ? "Salvar" : "Criar Missão"}
              </Button>
            </div>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
