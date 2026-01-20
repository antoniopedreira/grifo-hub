import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface IncomingMessagePayload {
  action: "incoming";
  phone: string;
  content: string;
  external_id?: string;
}

interface UpdateStatusPayload {
  action: "update_status";
  message_id: string;
  status: "sent" | "delivered" | "read" | "failed";
  external_id?: string;
}

interface OutgoingMessagePayload {
  action: "get_pending";
}

type WebhookPayload = IncomingMessagePayload | UpdateStatusPayload | OutgoingMessagePayload;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: WebhookPayload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload));

    // ========================================
    // ACTION: get_pending
    // Retorna mensagens pendentes para o n8n enviar via Uazapi
    // ========================================
    if (payload.action === "get_pending") {
      const { data: pendingMessages, error } = await supabase
        .from("whatsapp_messages")
        .select(`
          id,
          phone,
          content,
          deal_id,
          lead_id,
          created_at
        `)
        .eq("direction", "outgoing")
        .eq("status", "pending")
        .order("created_at", { ascending: true })
        .limit(50);

      if (error) {
        console.error("Error fetching pending messages:", error);
        throw error;
      }

      // Formata para o n8n/Uazapi
      const formattedMessages = pendingMessages?.map((msg) => ({
        message_id: msg.id,
        phone: msg.phone, // Telefone do lead (já limpo)
        content: msg.content,
        deal_id: msg.deal_id,
        lead_id: msg.lead_id,
      })) || [];

      return new Response(
        JSON.stringify({
          success: true,
          count: formattedMessages.length,
          messages: formattedMessages,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // ACTION: update_status
    // Atualiza o status da mensagem após envio via Uazapi
    // ========================================
    if (payload.action === "update_status") {
      const { message_id, status, external_id } = payload as UpdateStatusPayload;

      if (!message_id || !status) {
        return new Response(
          JSON.stringify({ success: false, error: "message_id e status são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, unknown> = { status };
      if (external_id) {
        updateData.external_id = external_id;
      }

      const { error } = await supabase
        .from("whatsapp_messages")
        .update(updateData)
        .eq("id", message_id);

      if (error) {
        console.error("Error updating message status:", error);
        throw error;
      }

      console.log(`Message ${message_id} updated to status: ${status}`);

      return new Response(
        JSON.stringify({ success: true, message_id, status }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ========================================
    // ACTION: incoming
    // Recebe mensagem do cliente (via Uazapi → n8n → aqui)
    // ========================================
    if (payload.action === "incoming") {
      const { phone, content, external_id } = payload as IncomingMessagePayload;

      if (!phone || !content) {
        return new Response(
          JSON.stringify({ success: false, error: "phone e content são obrigatórios" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Limpa o telefone para busca
      const cleanPhone = phone.replace(/\D/g, "");

      // Busca o deal mais recente com esse telefone
      const { data: lead } = await supabase
        .from("leads")
        .select("id")
        .or(`phone.eq.${cleanPhone},phone.ilike.%${cleanPhone.slice(-9)}%`)
        .maybeSingle();

      let dealId: string | null = null;
      let leadId: string | null = lead?.id || null;

      // Se encontrou lead, busca deal aberto mais recente
      if (leadId) {
        const { data: deal } = await supabase
          .from("deals")
          .select("id")
          .eq("lead_id", leadId)
          .eq("status", "open")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        dealId = deal?.id || null;
      }

      // Insere a mensagem recebida
      const { data: newMessage, error } = await supabase
        .from("whatsapp_messages")
        .insert({
          deal_id: dealId,
          lead_id: leadId,
          phone: cleanPhone,
          direction: "incoming",
          content,
          status: "read", // Mensagens recebidas já são consideradas lidas
          external_id: external_id || null,
        })
        .select()
        .single();

      if (error) {
        console.error("Error inserting incoming message:", error);
        throw error;
      }

      console.log(`Incoming message saved: ${newMessage.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          message_id: newMessage.id,
          deal_id: dealId,
          lead_id: leadId,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Action não reconhecida
    return new Response(
      JSON.stringify({
        success: false,
        error: "Action inválida. Use: get_pending, update_status, ou incoming",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err as Error;
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
