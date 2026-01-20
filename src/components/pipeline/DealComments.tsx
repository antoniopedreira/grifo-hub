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

interface DealCommentsProps {
  dealId: string;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  user_email?: string; // Vamos tentar buscar o email via join ou função auxiliar
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

  // 2. Busca Comentários
  const { data: comments, isLoading } = useQuery({
    queryKey: ["deal-comments", dealId],
    queryFn: async () => {
      // Nota: Idealmente faríamos um join com uma tabela de perfis.
      // Aqui vamos buscar os dados brutos e podemos tratar o display do nome depois.
      const { data, error } = await supabase
        .from("deal_comments")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as Comment[];
    },
  });

  // 3. Enviar Comentário
  const addComment = useMutation({
    mutationFn: async (content: string) => {
      if (!currentUser) throw new Error("Usuário não logado");

      const { error } = await supabase.from("deal_comments").insert({
        deal_id: dealId,
        user_id: currentUser.id,
        content: content,
      });

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
    <div className="flex flex-col h-[500px] border rounded-lg bg-background">
      {/* Header */}
      <div className="p-4 border-b flex items-center gap-2 bg-muted/30">
        <MessageSquare className="h-4 w-4 text-primary" />
        <h3 className="font-semibold text-sm">Histórico de Conversa</h3>
      </div>

      {/* Lista de Mensagens */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : comments?.length === 0 ? (
          <div className="text-center text-muted-foreground py-10 text-sm">
            Nenhum comentário ainda. Inicie a conversa!
          </div>
        ) : (
          <div className="space-y-4">
            {comments?.map((comment) => {
              const isMe = currentUser?.id === comment.user_id;
              
              return (
                <div
                  key={comment.id}
                  className={`flex gap-3 ${isMe ? "flex-row-reverse" : "flex-row"}`}
                >
                  <Avatar className="h-8 w-8 mt-1 border">
                    <AvatarFallback className={isMe ? "bg-primary text-primary-foreground" : ""}>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  
                  <div
                    className={`
                      max-w-[80%] rounded-lg p-3 text-sm
                      ${isMe 
                        ? "bg-primary text-primary-foreground rounded-tr-none" 
                        : "bg-muted text-foreground rounded-tl-none border"
                      }
                    `}
                  >
                    <p className="whitespace-pre-wrap">{comment.content}</p>
                    <div 
                      className={`text-[10px] mt-1 opacity-70 flex justify-end gap-2
                      ${isMe ? "text-primary-foreground" : "text-muted-foreground"}`}
                    >
                      <span>
                        {formatDistanceToNow(new Date(comment.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input de Envio */}
      <div className="p-4 border-t bg-muted/10">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <Textarea
            placeholder="Escreva um comentário ou atualização..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[60px] resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={addComment.isPending || !newComment.trim()}
            className="h-[60px] w-[60px]"
          >
            {addComment.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
