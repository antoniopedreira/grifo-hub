import { useState, useEffect } from "react";
import {
  DollarSign,
  Users,
  TrendingUp,
  Package,
  Loader2,
  ArrowUpRight,
  CalendarDays,
  Target,
  BarChart3,
  Filter,
  Crown,
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
import { format, parseISO, startOfMonth } from "date-fns";
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

interface TopCustomer {
  id: string;
  name: string;
  totalSpent: number;
  salesCount: number;
  lastPurchaseDate: string;
}

interface DashboardData {
  totalRevenue: number;
  ticketMedio: number;
  conversionRate: number;
  inNegotiation: number;
  totalLeads: number;
  monthlyRevenue: { month: string; value: number; count: number }[];
  salesByProduct: { name: string; value: number }[];
  dealsByStage: { name: string; count: number; value: number }[];
  topCustomers: TopCustomer[];
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
  text: "#FFFFFF",
};

const CHART_COLORS = [BRAND_COLORS.gold, BRAND_COLORS.navy, "#EAB308", "#64748B", "#0F172A"];

// --- TOOLTIP PERSONALIZADO ---
const CustomTooltip = ({ active, payload, label, type = "currency" }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#112232] border border-[#A47428]/30 p-3 rounded-lg shadow-xl outline-none min-w-[150px] z-50">
        <p className="text-sm font-semibold text-white mb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm font-medium flex items-center gap-2"
            style={{ color: entry.color === BRAND_COLORS.navy ? "#fff" : entry.color }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color === BRAND_COLORS.navy ? "#fff" : entry.color }}
            />
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
  const [timeRange, setTimeRange] = useState("all");
  const [greeting, setGreeting] = useState("");

  const [data, setData] = useState<DashboardData>({
    totalRevenue: 0,
    ticketMedio: 0,
    conversionRate: 0,
    inNegotiation: 0,
    totalLeads: 0,
    monthlyRevenue: [],
    salesByProduct: [],
    dealsByStage: [],
    topCustomers: [],
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
          { data: products },
          { data: allSales },
          { data: allStages },
        ] = await Promise.all([
          supabase.from("deals").select("*"),
          supabase.from("leads").select("id, full_name, status", { count: "exact" }),
          supabase.from("products").select("id, name"),
          supabase.from("sales").select("*, products(name), leads(full_name)"),
          supabase.from("pipeline_stages").select("id, name, order_index"),
        ]);

        // 1. KPIs FINANCEIROS
        const totalRevenue = (allSales || []).reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
        const totalSalesCount = allSales?.length || 0;
        const ticketMedio = totalSalesCount > 0 ? totalRevenue / totalSalesCount : 0;

        // 2. TAXA DE CONVERSÃO
        const totalClients = (allLeads || []).filter((l) => l.status === "Cliente").length;
        const conversionRate = leadsCount ? (totalClients / leadsCount) * 100 : 0;

        // 3. PIPELINE ATIVO
        const inNegotiationDeals = (allDeals || []).filter(
          (d) => d.status !== "won" && d.status !== "lost" && d.status !== "abandoned",
        );
        const inNegotiation = inNegotiationDeals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

        // 4. FUNIL DE VENDAS
        const dealsByStageMap = new Map<string, { count: number; value: number; index: number }>();
        (allStages || []).forEach((stage) => {
          dealsByStageMap.set(stage.name, { count: 0, value: 0, index: stage.order_index });
        });

        inNegotiationDeals.forEach((deal) => {
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
          .sort((a, b) => a.index - b.index)
          .filter((s) => s.count > 0);

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

        // 7. TOP CLIENTES (LTV RANKING)
        const customerMap = new Map<string, TopCustomer>();

        (allSales || []).forEach((sale) => {
          if (!sale.lead_id) return;

          const existing = customerMap.get(sale.lead_id);
          const amount = Number(sale.amount) || 0;
          const date = sale.transaction_date || "";

          if (existing) {
            customerMap.set(sale.lead_id, {
              ...existing,
              totalSpent: existing.totalSpent + amount,
              salesCount: existing.salesCount + 1,
              lastPurchaseDate: date > existing.lastPurchaseDate ? date : existing.lastPurchaseDate,
            });
          } else {
            customerMap.set(sale.lead_id, {
              id: sale.lead_id,
              name: sale.leads?.full_name || "Cliente Sem Nome",
              totalSpent: amount,
              salesCount: 1,
              lastPurchaseDate: date,
            });
          }
        });

        const topCustomers = Array.from(customerMap.values())
          .sort((a, b) => b.totalSpent - a.totalSpent)
          .slice(0, 5);

        setData({
          totalRevenue,
          ticketMedio,
          conversionRate,
          inNegotiation,
          totalLeads: leadsCount || 0,
          monthlyRevenue: sortedMonths,
          salesByProduct,
          dealsByStage,
          topCustomers,
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
    <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto animate-in fade-in duration-700 bg-[#112232] text-[#E1D8CF]">
      {/* --- HEADER EXECUTIVO --- */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-[#A47428]/20 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            {greeting}, {user?.email?.split("@")[0] || "Gestor"} <span className="text-2xl">👋</span>
          </h1>
          <p className="text-[#E1D8CF]/70 flex items-center gap-2 mt-2">
            <CalendarDays className="h-4 w-4 text-[#A47428]" />
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px] bg-[#1E3A50] border-[#A47428]/20 text-white">
              <Filter className="w-4 h-4 mr-2 text-[#A47428]" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent className="bg-[#112232] border-[#A47428]/20 text-white">
              <SelectItem value="all">Todo o Período</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Último Trimestre</SelectItem>
            </SelectContent>
          </Select>

          <Button className="bg-[#A47428] hover:bg-[#8a6120] text-white shadow-lg shadow-[#A47428]/20 transition-all hover:-translate-y-0.5 border-0">
            <ArrowUpRight className="mr-2 h-4 w-4" /> Relatório PDF
          </Button>
        </div>
      </div>

      {/* --- KPIS ESTRATÉGICOS --- */}
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
          subtext="LTV Médio por cliente"
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

      {/* --- ANÁLISE DE RECEITA --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        <Card className="lg:col-span-2 shadow-sm border-[#A47428]/20 bg-[#1E3A50]/50 hover:shadow-md transition-shadow">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Performance de Vendas</CardTitle>
                <CardDescription className="text-[#E1D8CF]/60">Evolução financeira mensal (Cash-in)</CardDescription>
              </div>
              <Badge variant="secondary" className="bg-[#A47428]/20 text-[#A47428] border-0">
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
                        <stop offset="5%" stopColor={BRAND_COLORS.gold} stopOpacity={0.4} />
                        <stop offset="95%" stopColor={BRAND_COLORS.gold} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: BRAND_COLORS.text, fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: BRAND_COLORS.text, fontSize: 12 }}
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

        {/* GRÁFICO DE DONUT CORRIGIDO */}
        <Card className="shadow-sm border-[#A47428]/20 bg-[#1E3A50]/50 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-white">Origem da Receita</CardTitle>
            <CardDescription className="text-[#E1D8CF]/60">Top 5 produtos vendidos</CardDescription>
          </CardHeader>
          <CardContent>
            {data.salesByProduct.length > 0 ? (
              <div className="h-[320px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, left: 0, right: 0, bottom: 0 }}>
                    <Pie
                      data={data.salesByProduct}
                      cx="50%"
                      cy="45%" // Gráfico levemente para cima
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
                      height={100} // Altura reservada para legenda
                      iconType="circle"
                      layout="vertical"
                      align="center"
                      wrapperStyle={{ width: "100%", bottom: 0 }}
                      formatter={(value, entry: any) => (
                        // TRUNCATE: Limita a largura do texto e adiciona reticências
                        <span
                          className="text-xs text-[#E1D8CF] font-medium ml-1 inline-flex items-center gap-1 max-w-[220px]"
                          title={value}
                        >
                          <span className="truncate">{value}</span>
                          <span className="text-[#E1D8CF]/60 whitespace-nowrap">
                            ({(entry.payload.percent * 100).toFixed(0)}%)
                          </span>
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>

                {/* Texto Central Alinhado com o Gráfico deslocado */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-[120px]">
                  <span className="text-3xl font-bold text-white">{data.salesByProduct.length}</span>
                  <span className="text-[10px] text-[#A47428] uppercase tracking-widest">Produtos</span>
                </div>
              </div>
            ) : (
              <EmptyState icon={Package} message="Sem dados de produtos." />
            )}
          </CardContent>
        </Card>
      </div>

      {/* --- GARGALOS E TOP CLIENTES (LEVEL 3) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* GRÁFICO 3: GARGALOS DO FUNIL */}
        <Card className="shadow-sm border-[#A47428]/20 bg-[#1E3A50]/50 hover:shadow-md transition-shadow">
          <CardHeader>
            <CardTitle className="text-white">Saúde do Pipeline</CardTitle>
            <CardDescription className="text-[#E1D8CF]/60">Volume financeiro travado em cada etapa</CardDescription>
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
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={true}
                      vertical={false}
                      stroke="rgba(255,255,255,0.05)"
                    />
                    <XAxis type="number" hide />
                    <YAxis
                      dataKey="name"
                      type="category"
                      axisLine={false}
                      tickLine={false}
                      width={100}
                      // Texto branco para contraste
                      tick={{ fill: "#FFFFFF", fontSize: 11, fontWeight: 500 }}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(164, 116, 40, 0.1)" }} />
                    <Bar dataKey="value" name="Volume" fill={BRAND_COLORS.gold} radius={[0, 4, 4, 0]} barSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyState icon={BarChart3} message="Pipeline vazio." />
            )}
          </CardContent>
        </Card>

        {/* LISTA: TOP CLIENTES (RANKING LTV) */}
        <Card className="shadow-sm border-[#A47428]/20 bg-[#1E3A50]/50 hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-4">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2 text-white">
                <Badge
                  variant="outline"
                  className="h-8 w-8 rounded-full flex items-center justify-center border-[#A47428] bg-[#A47428]/10"
                >
                  <Crown className="h-4 w-4 text-[#A47428]" />
                </Badge>
                Top Clientes (LTV)
              </CardTitle>
              <CardDescription className="text-[#E1D8CF]/60">Maiores compradores da base</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-[#A47428] hover:text-[#A47428]/80 hover:bg-[#A47428]/10">
              Ver todos
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            {data.topCustomers.length > 0 ? (
              <div className="space-y-0">
                {data.topCustomers.map((customer, index) => (
                  <div
                    key={customer.id}
                    className={`flex items-center gap-4 p-4 transition-colors hover:bg-[#112232]/50 ${
                      index !== data.topCustomers.length - 1 ? "border-b border-[#A47428]/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-center w-8 font-bold text-[#A47428] text-sm">
                      #{index + 1}
                    </div>

                    <Avatar className="h-10 w-10 border border-[#A47428]/30">
                      <AvatarFallback className="bg-[#A47428]/20 text-[#A47428] font-medium text-xs">
                        {getInitials(customer.name)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-white truncate mb-0.5">{customer.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[#E1D8CF]/60">
                        <span>{customer.salesCount} compras</span>
                        <span className="text-[#A47428]/30">•</span>
                        <span>
                          Última:{" "}
                          {customer.lastPurchaseDate
                            ? format(parseISO(customer.lastPurchaseDate), "dd MMM", { locale: ptBR })
                            : "-"}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <span className="font-bold text-sm text-green-400">{formatCurrency(customer.totalSpent)}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={Crown} message="Nenhum cliente com vendas registradas." />
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
    gold: { bg: "bg-[#A47428]/20", text: "text-[#A47428]", border: "border-[#A47428]/30" },
    navy: { bg: "bg-white/10", text: "text-white", border: "border-white/20" },
    success: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
    blue: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/20" },
    red: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/20" },
  };

  const style = colorStyles[color] || colorStyles.navy;

  return (
    <Card
      className={`border ${style.border} bg-[#1E3A50]/50 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 duration-300 relative overflow-hidden group`}
    >
      <div className={`absolute top-0 right-0 p-3 opacity-5 group-hover:opacity-10 transition-opacity ${style.text}`}>
        <Icon className="w-16 h-16 transform rotate-12 -mr-4 -mt-4" />
      </div>
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`p-2 rounded-lg ${style.bg} ${style.text}`}>
            <Icon className="w-5 h-5" />
          </div>
          <span className="text-sm font-medium text-[#E1D8CF]/80">{title}</span>
        </div>

        <div className="space-y-1 relative z-10">
          <h3 className="text-2xl font-bold tracking-tight text-white">{value}</h3>
          <div className="flex items-center gap-2">
            {trend && (
              <Badge
                variant="secondary"
                className={`h-5 px-1.5 text-[10px] font-normal border-0 ${trendUp ? "text-green-400 bg-green-500/10" : "text-[#E1D8CF]/60 bg-white/5"}`}
              >
                {trend}
              </Badge>
            )}
            <p className="text-xs text-[#E1D8CF]/60 truncate max-w-[120px]">{subtext}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ icon: Icon, message }: any) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 h-full">
      <div className="p-4 bg-white/5 rounded-full">
        <Icon className="h-8 w-8 text-[#E1D8CF]/20" />
      </div>
      <p className="text-sm text-[#E1D8CF]/40 font-medium max-w-[200px]">{message}</p>
    </div>
  );
}
