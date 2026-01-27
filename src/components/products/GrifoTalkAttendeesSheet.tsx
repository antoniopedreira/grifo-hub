import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, Loader2, Phone, Mail, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GrifoTalkAttendeesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
}

interface Attendee {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  origin: string | null;
  created_at: string | null;
  isGuest: boolean;
  hostName?: string;
}

export function GrifoTalkAttendeesSheet({
  open,
  onOpenChange,
  productId,
  productName,
}: GrifoTalkAttendeesSheetProps) {
  // Fetch all leads with GrifoTalk related origins
  const { data: leads, isLoading } = useQuery({
    queryKey: ["grifotalk_attendees", productId],
    queryFn: async () => {
      // Fetch leads where origin contains "grifo-talk" or "Grifo Talks" (case insensitive)
      const { data, error } = await supabase
        .from("leads")
        .select("id, full_name, email, phone, origin, created_at")
        .or(`origin.ilike.%grifo-talk%,origin.ilike.%grifo talks%,origin.ilike.%${productName}%`)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Fetch form submissions for this product to get confirmation status
  const { data: submissions } = useQuery({
    queryKey: ["grifotalk_submissions", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("form_submissions")
        .select("lead_id, answers")
        .eq("product_id", productId);

      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  // Process leads into main attendees and guests
  const { mainAttendees, guests, confirmedCount, declinedCount } = useMemo(() => {
    if (!leads) return { mainAttendees: [], guests: [], confirmedCount: 0, declinedCount: 0 };

    const submissionMap = new Map<string, { confirmation: string }>();
    submissions?.forEach((sub) => {
      if (sub.lead_id) {
        const answers = sub.answers as { confirmation?: string };
        submissionMap.set(sub.lead_id, { confirmation: answers?.confirmation || "" });
      }
    });

    const processedAttendees: Attendee[] = [];
    const processedGuests: Attendee[] = [];
    let confirmed = 0;
    let declined = 0;

    leads.forEach((lead) => {
      const isGuest = lead.origin?.includes("Convidado de") || false;
      
      // Extract host name from origin like "Grifo Talks (Convidado de João Silva)"
      let hostName: string | undefined;
      if (isGuest && lead.origin) {
        const match = lead.origin.match(/Convidado de (.+)\)/);
        if (match) hostName = match[1];
      }

      const attendee: Attendee = {
        id: lead.id,
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        origin: lead.origin,
        created_at: lead.created_at,
        isGuest,
        hostName,
      };

      if (isGuest) {
        processedGuests.push(attendee);
      } else {
        // Check confirmation status from submissions
        const submission = submissionMap.get(lead.id);
        if (submission?.confirmation?.includes("Confirmou")) {
          confirmed++;
        } else if (submission?.confirmation?.includes("Não")) {
          declined++;
        }
        processedAttendees.push(attendee);
      }
    });

    return {
      mainAttendees: processedAttendees,
      guests: processedGuests,
      confirmedCount: confirmed,
      declinedCount: declined,
    };
  }, [leads, submissions]);

  const formatPhone = (phone: string | null) => {
    if (!phone) return "-";
    return phone;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getConfirmationStatus = (leadId: string) => {
    const submission = submissions?.find((s) => s.lead_id === leadId);
    if (!submission) return null;
    const answers = submission.answers as { confirmation?: string };
    return answers?.confirmation;
  };

  const AttendeeCard = ({ attendee }: { attendee: Attendee }) => {
    const confirmationStatus = !attendee.isGuest ? getConfirmationStatus(attendee.id) : null;
    const isConfirmed = confirmationStatus?.includes("Confirmou");
    const isDeclined = confirmationStatus?.includes("Não");

    return (
      <div className="p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-foreground truncate">
                {attendee.full_name || "Sem nome"}
              </span>
              {attendee.isGuest && (
                <Badge variant="outline" className="shrink-0 text-xs">
                  <UserPlus className="h-3 w-3 mr-1" />
                  Convidado
                </Badge>
              )}
            </div>
            
            {attendee.hostName && (
              <p className="text-xs text-muted-foreground mb-2">
                Convidado de: <span className="font-medium">{attendee.hostName}</span>
              </p>
            )}

            <div className="flex flex-col gap-1 text-sm text-muted-foreground">
              {attendee.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{attendee.email}</span>
                </div>
              )}
              {attendee.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 shrink-0" />
                  <span>{formatPhone(attendee.phone)}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Registrado em: {formatDate(attendee.created_at)}
            </p>
          </div>

          {!attendee.isGuest && confirmationStatus && (
            <div className="shrink-0">
              {isConfirmed ? (
                <Badge className="bg-green-600 text-white">
                  <Check className="h-3 w-3 mr-1" />
                  Confirmado
                </Badge>
              ) : isDeclined ? (
                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                  <X className="h-3 w-3 mr-1" />
                  Não vai
                </Badge>
              ) : (
                <Badge variant="outline">{confirmationStatus}</Badge>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-secondary" />
            Confirmados - {productName}
          </SheetTitle>
          <SheetDescription>
            Lista de participantes e convidados do evento
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="mt-6">
            {/* Stats Summary */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-foreground">{mainAttendees.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-green-600/10">
                <p className="text-2xl font-bold text-green-600">{confirmedCount}</p>
                <p className="text-xs text-muted-foreground">Confirmados</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-secondary/10">
                <p className="text-2xl font-bold text-secondary">{guests.length}</p>
                <p className="text-xs text-muted-foreground">Convidados</p>
              </div>
            </div>

            <Separator className="mb-4" />

            <Tabs defaultValue="attendees">
              <TabsList className="w-full mb-4">
                <TabsTrigger value="attendees" className="flex-1">
                  Participantes ({mainAttendees.length})
                </TabsTrigger>
                <TabsTrigger value="guests" className="flex-1">
                  Convidados ({guests.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="attendees">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="space-y-3 pr-4">
                    {mainAttendees.length > 0 ? (
                      mainAttendees.map((attendee) => (
                        <AttendeeCard key={attendee.id} attendee={attendee} />
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum participante registrado ainda.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="guests">
                <ScrollArea className="h-[calc(100vh-380px)]">
                  <div className="space-y-3 pr-4">
                    {guests.length > 0 ? (
                      guests.map((guest) => (
                        <AttendeeCard key={guest.id} attendee={guest} />
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhum convidado registrado ainda.
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
