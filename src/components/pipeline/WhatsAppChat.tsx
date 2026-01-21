import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Send, Clock, Check, CheckCheck, AlertCircle, Loader2, Phone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { WhatsAppQuickReplies } from "./WhatsAppQuickReplies";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface WhatsAppMessage {
  id: string;
  deal_id: string | null;
  lead_id: string | null;
  phone: string;
  direction: "incoming" | "outgoing";
  content: string;
  status: "pending" | "sent" | "delivered" | "read" | "failed";
  external_id: string | null;
  created_at: string;
  updated_at: string;
}

interface WhatsAppChatProps {
  dealId: string;
  leadId: string | null;
  phone: string | null;
  leadName?: string | null;
}

const StatusIcon = ({ status }: { status: WhatsAppMessage["status"] }) => {
  switch (status) {
    case "pending":
      return <Clock className="h-3 w-3 text-muted-foreground" />;
    case "sent":
      return <Check className="h-3 w-3 text-muted-foreground" />;
    case "delivered":
      return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
    case "read":
      return <CheckCheck className="h-3 w-3 text-blue-500" />;
    case "failed":
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    default:
      return null;
  }
};

// Group messages by date
const groupMessagesByDate = (messages: WhatsAppMessage[]) => {
  const groups: { date: string; messages: WhatsAppMessage[] }[] = [];
  
  messages.forEach((msg) => {
    const dateKey = format(new Date(msg.created_at), "yyyy-MM-dd");
    const existingGroup = groups.find((g) => g.date === dateKey);
    
    if (existingGroup) {
      existingGroup.messages.push(msg);
    } else {
      groups.push({ date: dateKey, messages: [msg] });
    }
  });
  
  return groups;
};

const formatDateLabel = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (format(date, "yyyy-MM-dd") === format(today, "yyyy-MM-dd")) {
    return "Hoje";
  }
  if (format(date, "yyyy-MM-dd") === format(yesterday, "yyyy-MM-dd")) {
    return "Ontem";
  }
  return format(date, "dd 'de' MMMM", { locale: ptBR });
};

export function WhatsAppChat({ dealId, leadId, phone, leadName }: WhatsAppChatProps) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [isCleared, setIsCleared] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      const newHeight = Math.min(textarea.scrollHeight, 120); // Max 120px
      textarea.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [message, adjustTextareaHeight]);

  // Clear screen resets when new messages arrive
  useEffect(() => {
    if (isCleared) {
      setIsCleared(false);
    }
  }, []);

  // Fetch messages
  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["whatsapp-messages", dealId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_messages")
        .select("*")
        .eq("deal_id", dealId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as WhatsAppMessage[];
    },
    enabled: !!dealId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!dealId) return;

    const channel = supabase
      .channel(`whatsapp-messages-${dealId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_messages",
          filter: `deal_id=eq.${dealId}`,
        },
        (payload) => {
          console.log("WhatsApp message update:", payload);
          queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", dealId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [dealId, queryClient]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!phone) throw new Error("Telefone não disponível");

      // Remove country code for webhook (only national number)
      const fullCleanPhone = phone.replace(/\D/g, "");
      const cleanPhone = fullCleanPhone.replace(/^55/, ""); // Remove leading 55
      const trimmedContent = content.trim();
      
      // 1. Save to DB with "pending" status (store full phone with country code)
      const { data: savedMessage, error: dbError } = await supabase
        .from("whatsapp_messages")
        .insert({
          deal_id: dealId,
          lead_id: leadId,
          phone: fullCleanPhone, // Store with country code
          direction: "outgoing",
          content: trimmedContent,
          status: "pending",
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // 2. Send to n8n webhook
      try {
        await fetch("https://grifoworkspace.app.n8n.cloud/webhook/grifohub-wpp", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          mode: "no-cors",
          body: JSON.stringify({
            message_id: savedMessage.id,
            phone: cleanPhone, // Send WITHOUT country code to webhook
            content: trimmedContent,
            deal_id: dealId,
            lead_id: leadId,
          }),
        });

        console.log("Webhook enviado para n8n:", { message_id: savedMessage.id, phone: cleanPhone, fullPhone: fullCleanPhone });
      } catch (webhookError) {
        console.error("Erro ao enviar para webhook n8n:", webhookError);
      }

      return savedMessage;
    },
    onSuccess: () => {
      setMessage("");
      setIsCleared(false); // Reset clear state to show new message
      queryClient.invalidateQueries({ queryKey: ["whatsapp-messages", dealId] });
      textareaRef.current?.focus();
    },
  });

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || sendMessageMutation.isPending) return;
    sendMessageMutation.mutate(trimmed);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSelectTemplate = (content: string) => {
    setMessage(content);
    textareaRef.current?.focus();
  };

  const handleClearScreen = () => {
    setIsCleared(true);
  };

  if (!phone) {
    return (
      <div className="flex flex-col items-center justify-center h-[520px] text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Phone className="h-8 w-8 opacity-40" />
        </div>
        <p className="text-sm font-medium">Telefone não cadastrado</p>
        <p className="text-xs mt-1 text-center max-w-[200px]">
          Adicione um telefone ao lead na aba "Dados" para usar o WhatsApp.
        </p>
      </div>
    );
  }

  const messageGroups = groupMessagesByDate(isCleared ? [] : messages);

  return (
    <div className="flex flex-col h-[520px] -mx-2">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b bg-gradient-to-r from-green-50 to-background">
        <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5 text-green-600">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{leadName || "Lead"}</p>
          <p className="text-xs text-muted-foreground">{phone?.startsWith("+") ? phone : `+${phone}`}</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && !isCleared && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={handleClearScreen}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Limpar tela</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          <a 
            href={`https://wa.me/${phone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-green-600 hover:underline"
          >
            Abrir no app
          </a>
        </div>
      </div>

      {/* Chat Messages Area */}
      <ScrollArea ref={scrollRef} className="flex-1 px-3 py-3 bg-[#e5ddd5]/30">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-12">
            <svg 
              viewBox="0 0 24 24" 
              fill="currentColor" 
              className="h-16 w-16 mb-4 opacity-20"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            <p className="text-sm font-medium">Nenhuma mensagem ainda</p>
            <p className="text-xs mt-1">Use um template rápido ou escreva sua mensagem</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messageGroups.map((group) => (
              <div key={group.date} className="space-y-2">
                {/* Date Separator */}
                <div className="flex items-center justify-center">
                  <span className="bg-white/80 text-muted-foreground text-[11px] px-3 py-1 rounded-full shadow-sm">
                    {formatDateLabel(group.date)}
                  </span>
                </div>
                
                {/* Messages */}
                {group.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm",
                      msg.direction === "outgoing"
                        ? "ml-auto bg-[#dcf8c6] text-gray-900 rounded-tr-none"
                        : "mr-auto bg-white text-gray-900 rounded-tl-none"
                    )}
                  >
                    <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1 text-[10px]",
                        msg.direction === "outgoing" ? "justify-end text-gray-500" : "text-gray-400"
                      )}
                    >
                      <span>{format(new Date(msg.created_at), "HH:mm")}</span>
                      {msg.direction === "outgoing" && <StatusIcon status={msg.status} />}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Quick Replies */}
      <div className="px-3 py-2 border-t bg-muted/20">
        <WhatsAppQuickReplies onSelectTemplate={handleSelectTemplate} />
      </div>

      {/* Input Area */}
      <div className="border-t bg-muted/30 p-3 flex gap-2 items-end">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          className="min-h-[48px] max-h-[120px] resize-none bg-background rounded-2xl text-sm overflow-y-auto"
          style={{ height: "48px" }}
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim() || sendMessageMutation.isPending}
          size="icon"
          className="shrink-0 h-12 w-12 rounded-full bg-green-600 hover:bg-green-700"
        >
          {sendMessageMutation.isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Send className="h-5 w-5" />
          )}
        </Button>
      </div>
    </div>
  );
}
