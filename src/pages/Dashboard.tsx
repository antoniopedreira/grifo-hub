import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  Package,
  Loader2,
  CheckSquare,
  ArrowUpRight,
  CalendarDays,
  MoreHorizontal,
  Target,
  BarChart3,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

// --- TYPES ---
interface DealWithRelations {
  id: string;
  value: number | null;
  status: string | null;
  created_at: string | null;
  lead_id: string | null;
  product_id: string | null;
  leads: { full_name: string | null } | null;
  products: { name: string } | null;
}

interface MissionWithOwner {
  id: string;
  mission: string;
  deadline: string | null;
  status: string | null;
  owner_id: string | null;
  team_members: { name: string } | null;
}

interface DashboardData {
  totalRevenue: number;
  ticketMedio: number; // NOVO
  conversionRate: number; // NOVO
  inNegotiation: number;
  totalLeads: number;
  pendingMissions: number;
  monthlyRevenue: { month: string; value: number; count: number }[];
  salesByProduct: { name: string; value: number }[];
  dealsByStage: { name: string; count: number; value: number }[]; // NOVO
  recentWonDeals: DealWithRelations[];
  upcomingMissions: MissionWithOwner[];
}

// --- DESIGN TOKENS ---
const BRAND_COLORS = {
  gold: "#A47428",
  goldLight: "#D4A048",
  navy: "#112232",
  navyLight: "#1E3A50",
  success: "#10B981",
  danger: "#EF4444",
  gray: "#6B7280",
};

const CHART_COLORS = [BRAND_COLORS.gold, BRAND_COLORS.navy, "#EAB308", "#64748B", "#0F172A"];

// --- TOOLTIP PERSONALIZADO (INTERATIVIDADE) ---
const CustomTooltip = ({ active, payload, label, type = "currency" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover border border-border p-3 rounded-lg shadow-xl outline-none min-w-[150px]">
        <p className="text-sm font-semibold text-popover-foreground mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm font-medium flex items-center gap-2" style={{ color: entry.color }}>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            {entry.name}:{" "}
            {type === "currency"
              ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("all"); // Simulação de filtro
  const [greeting, setGreeting] = useState("");

  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    ticketMedio: 0,
    conversionRate: 0,
    inNegotiation: 0,
    totalLeads: 0,
    pendingMissions: 0,
    monthlyRevenue: [],
    salesByProduct: [],
    dealsByStage: [],
    recentWonDeals: [],
    upcomingMissions: [],
  });

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bom dia");
    else if (hour < 18) setGreeting("Boa tarde");
    else setGreeting("Boa noite");

    const fetchDashboardData = async () => {
      try {
        const [
          { data: allDeals },
          { data: allLeads, count: leadsCount },
          { count: pendingMissionsCount },
          { data: wonDealsWithRelations },
          { data: upcomingMissions },
          { data: products },
          { data: allSales },
          { data: allStages },
        ] = await Promise.all([
          supabase.from("deals").select("*"),
          supabase.from("leads").select("*", { count: "exact" }),
          supabase.from("team_missions").select("*", { count: "exact", head: true }).neq("status", "Concluído"),
          supabase
            .from("deals")
            .select("*, leads(full_name), products(name)")
            .eq("status", "won")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("team_missions")
            .select("*, team_members!team_missions_owner_id_fkey(name)")
            .neq("status", "Concluído")
            .not("deadline", "is", null)
            .order("deadline", { ascending: true })
            .limit(5),
          supabase.from("products").select("id, name"),
          supabase.from("sales").select("*, products(name)"),
          supabase.from("pipeline_stages").select("id, name, order_index"),
        ]);

        // 1. KPIs FINANCEIROS
        const totalRevenue = (allSales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const totalSalesCount = allSales?.length || 0;
        const ticketMedio = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

        // 2. TAXA DE CONVERSÃO (Clientes / Leads Totais)
        const totalClients = (allLeads || []).filter((l) => l.status === "Cliente").length;
        const conversionRate = leadsCount ? (totalClients / leadsCount) * 100 : 0;

        // 3. PIPELINE ATIVO
        const inNegotiationDeals = (allDeals || []).filter(
          (d) => d.status !== "won" && d.status !== "lost" && d.status !== "abandoned",
        );
        const inNegotiation = inNegotiationDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

        // 4. FUNIL DE VENDAS (Deals by Stage)
        const dealsByStageMap = new Map<string, { count: number; value: number; index: number }>();

        // Inicializa com as etapas existentes para garantir ordem
        (allStages || []).forEach((stage) => {
          dealsByStageMap.set(stage.name, { count: 0, value: 0, index: stage.order_index });
        });

        // Popula com dados reais
        inNegotiationDeals.forEach((deal) => {
          // Precisamos achar o nome do stage pelo ID (cruzamento de dados)
          const stageName = allStages?.find((s) => s.id === deal.stage_id)?.name || "Outros";
          const current = dealsByStageMap.get(stageName) || { count: 0, value: 0, index: 999 };

          dealsByStageMap.set(stageName, {
            count: current.count + 1,
            value: current.value + (Number(deal.value) || 0),
            index: current.index,
          });
        });

        const dealsByStage = Array.from(dealsByStageMap.entries())
          .map(([name, data]) => ({ name, ...data }))
          .sort((a, b) => a.index - b.index) // Ordena pela sequência do funil
          .filter((s) => s.count > 0); // Opcional: esconder etapas vazias

        // 5. EVOLUÇÃO MENSAL
        const monthlyMap = new Map<string, { value: number; count: number }>();
        (allSales || []).forEach((sale) => {
          if (sale.transaction_date) {
            const monthKey = format(startOfMonth(parseISO(sale.transaction_date)), "yyyy-MM");
            const current = monthlyMap.get(monthKey) || { value: 0, count: 0 };
            monthlyMap.set(monthKey, {
              value: current.value + (Number(sale.amount) || 0),
              count: current.count + 1,
            });
          }
        });

        const sortedMonths = Array.from(monthlyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .slice(-6)
          .map(([month, data]) => ({
            month: format(parseISO(`${month}-01`), "MMM", { locale: ptBR }),
            value: data.value,
            count: data.count,
          }));

        // 6. PRODUTOS
        const productMap = new Map<string, number>();
        const productNames = new Map<string, string>();
        (products || []).forEach((p) => productNames.set(p.id, p.name));

        (allSales || []).forEach((sale) => {
          const productName =
            sale.products?.name ||
            (sale.product_id ? productNames.get(sale.product_id) : null) ||
            sale.product_name ||
            "Outros";
          productMap.set(productName, (productMap.get(productName) || 0) + (Number(sale.amount) || 0));
        });

        const salesByProduct = Array.from(productMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 5);

        setData({
          totalRevenue,
          ticketMedio,
          conversionRate,
          inNegotiation,
          totalLeads: leadsCount || 0,
          pendingMissions: pendingMissionsCount || 0,
          monthlyRevenue: sortedMonths,
          salesByProduct,
          dealsByStage,
          recentWonDeals: (wonDealsWithRelations || []) as DealWithRelations[],
          upcomingMissions: (upcomingMissions || []) as MissionWithOwner[],
        });
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(
      value,
    );
  };

  const getInitials = (name: string | null) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#A47428]" />
        <p className="text-muted-foreground animate-pulse">Consolidando inteligência de dados...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* --- HEADER EXECUTIVO --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-border/40 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
            {greeting}, {user?.email?.split("@")[0] || "Gestor"} <span className="text-2xl">👋</span>
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 mt-2">
            <CalendarDays className="h-4 w-4 text-[#A47428]" />
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Filtro Simulado - Drill Down futuro */}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px] bg-background">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo o Período</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Último Trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Button className="bg-[#A47428] hover:bg-[#8a6120] text-white shadow-lg shadow-[#A47428]/20 transition-all hover:-translate-y-0.5">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Relatório PDF
          </Button>
        </div>
      </div>

      {/* --- KPIS ESTRATÉGICOS (LEVEL 1) --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard
          title="Receita Confirmada"
          value={formatCurrency(data.totalRevenue)}
          subtext="Cash-in total acumulado"
          icon={DollarSign}
          trend="+12% vs mês anterior"
          trendUp={true}
          color="gold"
        />
        <KpiCard
          title="Ticket Médio"
          value={formatCurrency(data.ticketMedio)}
          subtext="Valor médio por venda"
          icon={Target}
          trend="Estável"
          color="navy"
        />
        <KpiCard
          title="Taxa de Conversão"
          value={`${data.conversionRate.toFixed(1)}%`}
          subtext="Leads que viraram clientes"
          icon={TrendingUp}
          trend="Meta: 10%"
          trendUp={data.conversionRate > 5}
          color="success"
        />
        <KpiCard
          title="Pipeline Ativo"
          value={formatCurrency(data.inNegotiation)}
          subtext="Forecast (Em negociação)"
          icon={BarChart3}
          color="blue"
        />
      </div>

      {/* --- ANÁLISE PROFUNDA (LEVEL 2) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* GRÁFICO 1: EVOLUÇÃO DE RECEITA (ÁREA) */}
        <Card className="lg:col-span-2 shadow-sm border-border/60 hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Performance de Vendas</CardTitle>
                <CardDescription>Evolução financeira mensal (Cash-in)</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-[#A47428]/10 text-[#A47428]">
                Semestral
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pl-0">
            {data.monthlyRevenue.length > 0 ? (
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.monthlyRevenue} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={BRAND_COLORS.gold} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={BRAND_COLORS.gold} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#6B7280", fontSize: 12 }}
                      tickFormatter={(val) => `R$${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: BRAND_COLORS.gold, strokeWidth: 1, strokeDasharray: "5 5" }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      name="Receita"
                      stroke={BRAND_COLORS.gold}
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: BRAND_COLORS.gold }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={TrendingUp} message="Sem dados suficientes." />
            )}
          </CardContent>
        </Card>

        {/* GRÁFICO 2: MIX DE PRODUTOS (DONUT) */}
        <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Origem da Receita</CardTitle>
            <CardDescription>Top 5 produtos vendidos</CardDescription>
          </CardHeader>
          <CardContent>
            {data.salesByProduct.length > 0 ? (
              <div className="h-[320px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.salesByProduct}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      stroke="none"
                    >
                      {data.salesByProduct.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={72}
                      iconType="circle"
                      layout="vertical"
                      align="center"
                      formatter={(value, entry: any) => (
                        <span className="text-xs text-foreground/80 font-medium ml-1">
                          {value}{" "}
                          <span className="text-muted-foreground">({(entry.payload.percent * 100).toFixed(0)}%)</span>
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-20">
                  <span className="text-3xl font-bold text-foreground">{data.salesByProduct.length}</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-widest">Produtos</span>
                </div>
              </div>
            ) : (
              <EmptyState icon={Package} message="Sem dados de produtos." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- GARGALOS E OPERAÇÃO (LEVEL 3) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* GRÁFICO 3: GARGALOS DO FUNIL (BAR CHART) */}
        <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle>Saúde do Pipeline</CardTitle>
            <CardDescription>Volume financeiro travado em cada etapa</CardDescription>
          </CardHeader>
          <CardContent>
            {data.dealsByStage.length > 0 ? (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.dealsByStage}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(0,0,0,0.05)" />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={100}
                      tick={{ fill: "#6B7280", fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
                    <Bar dataKey="value" name="Volume" fill={BRAND_COLORS.navy} radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={BarChart3} message="Pipeline vazio." />
            )}
          </CardContent>
        </Card>

        {/* LISTA: PRÓXIMAS ENTREGAS */}
        <Card className="shadow-sm border-border/60 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Radar Operacional
              </CardTitle>
              <CardDescription>Entregas com prazo próximo</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
              Ver tudo
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            {data.upcomingMissions.length > 0 ? (
              <div className="space-y-0">
                {data.upcomingMissions.map((mission, index) => (
                  <div
                    key={mission.id}
                    className={`flex items-center gap-4 p-4 transition-colors hover:bg-muted/30 ${
                      index !== data.upcomingMissions.length - 1 ? "border-b border-border/40" : ""
                    }`}
                  >
                    <div
                      className={`w-1 h-10 rounded-full ${
                        mission.deadline && new Date(mission.deadline) < new Date() ? "bg-red-500" : "bg-[#A47428]"
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground truncate mb-1">{mission.mission}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Avatar className="h-5 w-5 border border-border">
                          <AvatarFallback className="text-[9px] bg-secondary text-secondary-foreground">
                            {getInitials(mission.team_members?.name || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span>{mission.team_members?.name || "Sem dono"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase tracking-wide border-0 ${
                          mission.deadline && new Date(mission.deadline) < new Date()
                            ? "bg-red-100 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {mission.deadline ? format(parseISO(mission.deadline), "dd MMM", { locale: ptBR }) : "S/ Prazo"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={CheckSquare} message="Operação em dia." />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- SUBCOMPONENTES ---

function KpiCard({ title, value, subtext, icon: Icon, trend, trendUp, color }: any) {
  const colorStyles: any = {
    gold: { bg: "bg-amber-50/50", text: "text-[#A47428]", border: "border-[#A47428]/20" },
    navy: { bg: "bg-slate-50/50", text: "text-[#112232]", border: "border-[#112232]/20" },
    success: { bg: "bg-emerald-50/50", text: "text-emerald-600", border: "border-emerald-600/20" },
    blue: { bg: "bg-blue-50/50", text: "text-blue-600", border: "border-blue-600/20" },
    red: { bg: "bg-red-50/50", text: "text-red-600", border: "border-red-600/20" },
  };

  const style = colorStyles[color] || colorStyles.navy;

  return (
    <Card
      className={`border shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 relative overflow-hidden group`}
    >
      <div className={`absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity ${style.text}`}>
        <Icon className="w-16 h-16 transform rotate-12 -mr-4 -mt-4" />
      </div>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${style.bg} ${style.text}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
        </div>

        <div className="space-y-1 relative z-10">
          <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
          <div className="flex items-center gap-2">
            {trend && (
              <Badge
                variant="secondary"
                className={`h-5 px-1.5 text-[10px] font-normal ${trendUp ? "text-green-700 bg-green-50" : "text-muted-foreground bg-muted"}`}
              >
                {trend}
              </Badge>
            )}
            <p className="text-xs text-muted-foreground/80 truncate max-w-[120px]">{subtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 h-full">
      <div className="p-4 bg-muted/50 rounded-full">
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </div>
      <p className="text-sm text-muted-foreground font-medium max-w-[200px]">{message}</p>
    </div>
  );
}
