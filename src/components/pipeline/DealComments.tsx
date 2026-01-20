import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Send, User, Loader2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DealComment } from "@/types/database";

interface DealCommentsProps {
  dealId: string;
}

export function DealComments({ dealId }: DealCommentsProps) {
  const [newComment, setNewComment] = useState("");
  const queryClient = useQueryClient();

  // 1. Busca usuário atual
  const { data: currentUser } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user;
    },
  });

  // 2. Busca Comentários (tabela deal_comments não está no types.ts auto-gerado)
  const { data: comments, isLoading } = useQuery({
    queryKey: ["deal-comments", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_comments" as "deals") // Type workaround para tabela não tipada
        .select("*")
        .eq("deal_id" as "id", dealId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as unknown as DealComment[];
    },
  });

  // 3. Enviar Comentário
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser) throw new Error("Usuário não logado");

      const { error } = await supabase
        .from("deal_comments" as "deals") // Type workaround para tabela não tipada
        .insert({
          deal_id: dealId,
          user_id: currentUser.id,
          content: content,
        } as never);

      if (error) throw error;
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["deal-comments", dealId] });
      toast.success("Comentário enviado!");
    },
    onError: () => toast.error("Erro ao enviar comentário"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    addComment.mutate(newComment);
  };

  return (
    <div className="space-y-4">
      {/* Input no topo */}
      <div className="border rounded-xl p-4 bg-card">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            placeholder="   
               Escrever um comentário..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[100px] resize-y border-0 shadow-none focus-visible:ring-0 p-0 text-sm"
          />
          <div className="flex justify-end">
            <Button type="submit" disabled={addComment.isPending || !newComment.trim()} className="gap-2">
              {addComment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Enviar
            </Button>
          </div>
        </form>
      </div>

      {/* Lista de Comentários */}
      <div className="border rounded-xl bg-card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-3 opacity-30" />
            <p className="font-medium">Nenhum comentário ainda</p>
            <p className="text-sm">Seja o primeiro a comentar!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="divide-y">
              {comments?.map((comment) => (
                <div key={comment.id} className="p-4">
                  <p className="text-sm whitespace-pre-wrap">{comment.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(comment.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  );
}
