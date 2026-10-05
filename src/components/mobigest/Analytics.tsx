import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  Minus,
  Sparkles,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "../ui/chart";
import { Card } from "../MobiGestShell";

export type Trend = {
  value: number;
  label: string;
};

export type DashboardRoute =
  | "/dashboard"
  | "/dashboard/motorizadas"
  | "/dashboard/carros"
  | "/dashboard/bicicletas"
  | "/veiculos"
  | "/veiculos/novo"
  | "/proprietarios"
  | "/proprietarios/novo"
  | "/taxistas"
  | "/taxistas/novo"
  | "/fiscalizacao"
  | "/fiscalizacao/nova"
  | "/multas"
  | "/multas/nova"
  | "/financeiro"
  | "/registos"
  | "/utilizadores";

export function ModuleHeader({
  eyebrow,
  title,
  description,
  icon,
  action,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--municipal-primary)_10%,white)] text-[var(--municipal-primary)] ring-1 ring-[color-mix(in_srgb,var(--municipal-primary)_12%,transparent)] [&>svg]:h-5 [&>svg]:w-5">
            {icon}
          </div>
        )}
        <div className="max-w-3xl">
          {eyebrow && (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--municipal-primary)]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-1 text-[26px] font-bold tracking-[-0.035em] text-slate-950">
            {title}
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>
      </div>
      {action}
    </div>
  );
}

export function AnalyticsKpiCard({
  label,
  value,
  icon,
  trend,
  note,
  to,
  formatter = (number) => number.toLocaleString("pt-MZ"),
  emphasis = false,
}: {
  label: string;
  value: number;
  icon: ReactNode;
  trend?: Trend | null;
  note?: string;
  to?: DashboardRoute;
  formatter?: (value: number) => string;
  emphasis?: boolean;
}) {
  const body = (
    <Card
      className={
        "group relative h-full overflow-hidden p-5 " +
        (emphasis
          ? "border-[color-mix(in_srgb,var(--municipal-primary)_22%,white)] bg-[linear-gradient(145deg,color-mix(in_srgb,var(--municipal-primary)_6%,white),white_68%)]"
          : "bg-white")
      }
    >
      <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-[color-mix(in_srgb,var(--municipal-primary)_7%,transparent)] blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--municipal-primary)_9%,white)] text-[var(--municipal-primary)] ring-1 ring-[color-mix(in_srgb,var(--municipal-primary)_10%,transparent)] [&>svg]:h-[19px] [&>svg]:w-[19px]">
          {icon}
        </span>
        {to && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 transition-all group-hover:bg-slate-50 group-hover:text-slate-600">
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>

      <p className="relative mt-4 text-[12px] font-semibold uppercase tracking-[0.06em] text-slate-400">
        {label}
      </p>
      <p className="relative mt-1 text-[28px] font-bold tracking-[-0.04em] text-slate-950">
        {formatter(value)}
      </p>

      <div className="relative mt-3 flex min-h-5 items-center gap-2">
        {trend ? (
          <TrendIndicator trend={trend} />
        ) : (
          <span className="text-[11px] font-medium text-slate-400">
            {note ?? "Total acumulado"}
          </span>
        )}
      </div>
    </Card>
  );

  return to ? (
    <Link to={to} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function CompactStat({
  label,
  value,
  icon,
  to,
  status = "neutral",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  to?: DashboardRoute;
  status?: "neutral" | "good" | "warning" | "danger";
}) {
  const dotClass =
    status === "good"
      ? "bg-emerald-400"
      : status === "warning"
        ? "bg-amber-400"
        : status === "danger"
          ? "bg-rose-400"
          : "bg-slate-300";

  const body = (
    <div className="group flex h-full items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.025)] transition hover:-translate-y-px hover:border-slate-300 hover:shadow-md">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-500 [&>svg]:h-[18px] [&>svg]:w-[18px]">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] font-medium text-slate-400">{label}</p>
        <p className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">
          {value.toLocaleString("pt-MZ")}
        </p>
      </div>
      <span className={"h-1.5 w-1.5 shrink-0 rounded-full " + dotClass} />
    </div>
  );

  return to ? <Link to={to}>{body}</Link> : body;
}

export function AnalyticsChartCard({
  title,
  description,
  children,
  action,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Card className={"overflow-hidden " + className}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {description && (
            <p className="mt-1 text-xs leading-5 text-slate-400">{description}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </Card>
  );
}

export function ChartEmptyState({
  title = "Sem dados para apresentar",
  description = "Os gráficos serão preenchidos automaticamente quando existirem movimentos.",
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="flex h-[250px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-6 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-slate-400 shadow-sm ring-1 ring-slate-100">
        <Sparkles className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
        {description}
      </p>
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="h-[250px] animate-pulse rounded-xl bg-[linear-gradient(110deg,#f8fafc_8%,#eef2f7_18%,#f8fafc_33%)] bg-[length:200%_100%]" />
  );
}

export function RegistrationsAreaChart({
  data,
}: {
  data: Array<{ label: string; total: number }>;
}) {
  if (!data.some((item) => item.total > 0)) return <ChartEmptyState />;

  const config = {
    total: {
      label: "Registos",
      color: "var(--municipal-primary)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-[270px] w-full aspect-auto">
      <AreaChart data={data} margin={{ left: 4, right: 8, top: 12, bottom: 0 }}>
        <defs>
          <linearGradient id="registrationsFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.28} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          allowDecimals={false}
          axisLine={false}
          tickLine={false}
          width={28}
        />
        <ChartTooltip
          cursor={{ stroke: "var(--municipal-primary)", strokeOpacity: 0.2 }}
          content={<ChartTooltipContent indicator="line" />}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="var(--color-total)"
          strokeWidth={2.5}
          fill="url(#registrationsFill)"
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

const PIE_COLORS = [
  "var(--municipal-primary)",
  "#38bdf8",
  "#94a3b8",
  "#f59e0b",
  "#10b981",
  "#f43f5e",
];

export function DistributionDonut({
  data,
  centerLabel,
}: {
  data: Array<{ name: string; value: number }>;
  centerLabel?: string;
}) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <ChartEmptyState />;

  const config = Object.fromEntries(
    data.map((item, index) => [
      item.name,
      {
        label: item.name,
        color: PIE_COLORS[index % PIE_COLORS.length],
      },
    ]),
  ) satisfies ChartConfig;

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
      <ChartContainer config={config} className="h-[230px] w-full aspect-auto">
        <PieChart>
          <ChartTooltip
            content={
              <ChartTooltipContent
                hideLabel
                formatter={(value, name) => (
                  <div className="flex min-w-28 items-center justify-between gap-4">
                    <span className="text-slate-500">{String(name)}</span>
                    <span className="font-semibold text-slate-900">
                      {Number(value).toLocaleString("pt-MZ")}
                    </span>
                  </div>
                )}
              />
            }
          />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius={62}
            outerRadius={88}
            paddingAngle={3}
            stroke="transparent"
          >
            {data.map((item, index) => (
              <Cell
                key={item.name}
                fill={PIE_COLORS[index % PIE_COLORS.length]}
              />
            ))}
          </Pie>
          <text
            x="50%"
            y="47%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-950 text-[22px] font-bold"
          >
            {total.toLocaleString("pt-MZ")}
          </text>
          <text
            x="50%"
            y="58%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-400 text-[10px] font-medium"
          >
            {centerLabel ?? "Total"}
          </text>
        </PieChart>
      </ChartContainer>

      <div className="grid min-w-36 gap-2.5">
        {data.map((item, index) => (
          <div key={item.name} className="flex items-center justify-between gap-4 text-xs">
            <span className="flex items-center gap-2 text-slate-500">
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
              />
              {item.name}
            </span>
            <span className="font-semibold tabular-nums text-slate-800">
              {item.value.toLocaleString("pt-MZ")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function RevenueBarChart({
  data,
  formatter,
}: {
  data: Array<{ label: string; total: number }>;
  formatter: (value: number) => string;
}) {
  if (!data.some((item) => item.total > 0)) {
    return (
      <ChartEmptyState
        title="Ainda não existem receitas no período"
        description="Os pagamentos confirmados aparecerão aqui automaticamente."
      />
    );
  }

  const config = {
    total: {
      label: "Receitas",
      color: "var(--municipal-primary)",
    },
  } satisfies ChartConfig;

  return (
    <ChartContainer config={config} className="h-[260px] w-full aspect-auto">
      <BarChart data={data} margin={{ left: 4, right: 8, top: 12, bottom: 0 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          axisLine={false}
          tickLine={false}
          tickMargin={10}
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          width={45}
          tickFormatter={(value) =>
            Number(value) >= 1000
              ? Math.round(Number(value) / 1000) + "k"
              : String(value)
          }
        />
        <ChartTooltip
          cursor={{ fill: "rgba(148,163,184,0.08)" }}
          content={
            <ChartTooltipContent
              formatter={(value) => (
                <span className="font-semibold text-slate-900">
                  {formatter(Number(value))}
                </span>
              )}
            />
          }
        />
        <Bar
          dataKey="total"
          fill="var(--color-total)"
          radius={[6, 6, 0, 0]}
          maxBarSize={38}
        />
      </BarChart>
    </ChartContainer>
  );
}

export function TrendIndicator({ trend }: { trend: Trend }) {
  const positive = trend.value > 0;
  const negative = trend.value < 0;
  const Icon = positive ? ArrowUpRight : negative ? ArrowDownRight : Minus;
  const tone = positive
    ? "text-emerald-600 bg-emerald-50"
    : negative
      ? "text-rose-600 bg-rose-50"
      : "text-slate-500 bg-slate-50";

  return (
    <span className={"inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold " + tone}>
      <Icon className="h-3 w-3" />
      {trend.value === 0 ? "Sem variação" : Math.abs(trend.value).toFixed(0) + "%"} · {trend.label}
    </span>
  );
}
