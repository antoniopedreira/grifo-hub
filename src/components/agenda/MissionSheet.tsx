import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, Target, X, Pencil, User, Clock, Building2, Crosshair, FileText, Users } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { Tables, Enums } from "@/integrations/supabase/types";

type Mission = Tables<"team_missions">;
type TeamMember = Tables<"team_members">;
type MissionStatus = Enums<"mission_status">;

const statuses: MissionStatus[] = ["Pendente", "Em Andamento", "Em Revisão", "Concluído", "Stand-by"];

const statusColors: Record<MissionStatus, string> = {
  "Pendente": "bg-yellow-100 text-yellow-800 border-yellow-200",
  "Em Andamento": "bg-blue-100 text-blue-800 border-blue-200",
  "Em Revisão": "bg-purple-100 text-purple-800 border-purple-200",
  "Concluído": "bg-green-100 text-green-800 border-green-200",
  "Stand-by": "bg-gray-100 text-gray-800 border-gray-200",
};

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
  const isExistingMission = !!mission;
  const [isEditMode, setIsEditMode] = useState(false);

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

  // Reset edit mode when sheet closes or mission changes
  useEffect(() => {
    if (!open) {
      setIsEditMode(false);
    }
  }, [open]);

  // For new missions, start in edit mode
  useEffect(() => {
    if (open && !isExistingMission) {
      setIsEditMode(true);
    }
  }, [open, isExistingMission]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload: Record<string, any> = {
        mission: data.mission,
        department: data.department || null,
        target_goal: data.target_goal || null,
        owner_id: data.owner_id || null,
        support_ids: data.support_ids || [],
        deadline: data.deadline ? data.deadline.toISOString() : null,
        status: data.status,
        notes: data.notes || null,
      };

      if (isExistingMission) {
        // Preserve order_index when editing (only status changes via drag should modify it)
        if (mission.order_index !== null && mission.order_index !== undefined) {
          payload.order_index = mission.order_index;
        }
        const { error } = await supabase
          .from("team_missions")
          .update(payload)
          .eq("id", mission.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("team_missions").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team_missions"] });
      toast.success(isExistingMission ? "Missão atualizada!" : "Missão criada!");
      onOpenChange(false);
    },
    onError: () => {
      toast.error("Erro ao salvar missão.");
    },
  });

  const onSubmit = (data: FormData) => {
    mutation.mutate(data);
  };

  const getMemberName = (memberId: string | null) => {
    if (!memberId) return "Não definido";
    const member = members.find((m) => m.id === memberId);
    return member?.name || "Desconhecido";
  };

  const getSupportNames = (supportIds: string[] | null) => {
    if (!supportIds || supportIds.length === 0) return null;
    return supportIds.map((id) => getMemberName(id));
  };

  // Detail View Component
  const DetailView = () => {
    if (!mission) return null;
    const missionData = mission as any;
    const supportNames = getSupportNames(missionData.support_ids);

    return (
      <div className="space-y-6 mt-6">
        {/* Mission Title */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-primary leading-tight">
            {mission.mission}
          </h3>
          <Badge className={cn("border", statusColors[mission.status || "Pendente"])}>
            {mission.status || "Pendente"}
          </Badge>
        </div>

        <Separator />

        {/* Details Grid */}
        <div className="space-y-4">
          {mission.department && (
            <div className="flex items-start gap-3">
              <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Setor</p>
                <p className="font-medium">{mission.department}</p>
              </div>
            </div>
          )}

          {mission.target_goal && (
            <div className="flex items-start gap-3">
              <Crosshair className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Meta Alvo</p>
                <p className="font-medium">{mission.target_goal}</p>
              </div>
            </div>
          )}

          <div className="flex items-start gap-3">
            <User className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="text-sm text-muted-foreground">Responsável</p>
              <p className="font-medium">{getMemberName(mission.owner_id)}</p>
            </div>
          </div>

          {supportNames && supportNames.length > 0 && (
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Apoio(s)</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {supportNames.map((name, index) => (
                    <Badge key={index} variant="secondary">
                      {name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mission.deadline && (
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Prazo Final</p>
                <p className="font-medium">
                  {format(new Date(mission.deadline), "PPP", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          {mission.notes && (
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Observação</p>
                <p className="font-medium whitespace-pre-wrap">{mission.notes}</p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Action Buttons */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
          <Button
            onClick={() => setIsEditMode(true)}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            <Pencil className="h-4 w-4 mr-2" />
            Editar
          </Button>
        </div>
      </div>
    );
  };

  // Edit Form Component
  const EditForm = () => (
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
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              if (isExistingMission) {
                setIsEditMode(false);
              } else {
                onOpenChange(false);
              }
            }}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="bg-secondary hover:bg-secondary/90 text-secondary-foreground"
          >
            {mutation.isPending ? "Salvando..." : isExistingMission ? "Salvar" : "Criar Missão"}
          </Button>
        </div>
      </form>
    </Form>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-primary flex items-center gap-2">
            <Target className="h-5 w-5" />
            {!isExistingMission ? "Nova Missão" : isEditMode ? "Editar Missão" : "Detalhes da Missão"}
          </SheetTitle>
          <SheetDescription>
            {!isExistingMission
              ? "Cadastre uma nova missão para a equipe."
              : isEditMode
              ? "Atualize os detalhes da missão."
              : "Visualize as informações da missão."}
          </SheetDescription>
        </SheetHeader>

        {isExistingMission && !isEditMode ? <DetailView /> : <EditForm />}
      </SheetContent>
    </Sheet>
  );
}