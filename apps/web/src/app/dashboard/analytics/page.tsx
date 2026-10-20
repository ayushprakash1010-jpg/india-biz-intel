"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ComposedChart,
} from "recharts";
import {
  useAnalyticsOverview,
  useAnalyticsFunnel,
  useAnalyticsTimeSeries,
  useAnalyticsTopCompanies,
  useAnalyticsTopCities,
  useAnalyticsCategories,
  useAnalyticsSources,
  useAnalyticsAiUsage,
  useAnalyticsPromptPerformance,
} from "@/lib/api/hooks/useAnalytics";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Brain, CheckCircle, Database, FileText } from "lucide-react";

import { ElementType } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ElementType;
  loading?: boolean;
}

const StatCard = ({ title, value, icon: Icon, loading }: StatCardProps) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">
        {title}
      </CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? (
        <Skeleton className="h-8 w-20" />
      ) : (
        <div className="text-2xl font-bold">{value}</div>
      )}
    </CardContent>
  </Card>
);

export default function AnalyticsPage() {
  const [period, setPeriod] = useState("30d");

  const { data: overview, isLoading: loadingOverview } =
    useAnalyticsOverview(period);
  const { data: funnel, isLoading: loadingFunnel } = useAnalyticsFunnel(period);
  const { data: timeSeries, isLoading: loadingTimeSeries } =
    useAnalyticsTimeSeries(period);
  const { data: companies, isLoading: loadingCompanies } =
    useAnalyticsTopCompanies(period);
  const { data: cities, isLoading: loadingCities } =
    useAnalyticsTopCities(period);
  const { data: categories, isLoading: loadingCategories } =
    useAnalyticsCategories(period);
  const { data: sources, isLoading: loadingSources } =
    useAnalyticsSources(period);
  const { data: aiUsage, isLoading: loadingAi } = useAnalyticsAiUsage(period);
  const { data: prompts, isLoading: loadingPrompts } =
    useAnalyticsPromptPerformance(period);

  return (
    <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground mt-2">
            India BizIntel intelligence metrics - topic coverage, source health,
            and AI usage.
          </p>
        </div>
        <Tabs
          value={period}
          onValueChange={setPeriod}
          className="w-[400px] justify-end"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
            <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
            <TabsTrigger value="90d">Last 90 Days</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <StatCard
          title="Total Articles"
          value={overview?.totalArticles || 0}
          icon={Database}
          loading={loadingOverview}
        />
        <StatCard
          title="Posts Generated"
          value={overview?.postsGenerated || 0}
          icon={FileText}
          loading={loadingOverview}
        />
        <StatCard
          title="Approval Rate"
          value={`${(overview?.approvalRate || 0).toFixed(1)}%`}
          icon={CheckCircle}
          loading={loadingOverview}
        />
        <StatCard
          title="Active Sources"
          value={overview?.sourcesActive || 0}
          icon={Activity}
          loading={loadingOverview}
        />
        <StatCard
          title="AI Tokens Used"
          value={(aiUsage?.totalTokens || 0).toLocaleString()}
          icon={Brain}
          loading={loadingAi}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Content Pipeline Funnel */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Content Processing Pipeline</CardTitle>
            <CardDescription>
              Article discovery through publication funnel
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loadingFunnel ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={funnel}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="step" type="category" width={100} />
                  <RechartsTooltip />
                  <Bar
                    dataKey="count"
                    fill="#8b5cf6"
                    radius={[0, 4, 4, 0]}
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Topic Health */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Topic Health</CardTitle>
            <CardDescription>
              Event category distribution vs. manager targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingCategories ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <div className="space-y-3">
                {(() => {
                  const targets: Record<string, number> = {
                    FUNDING: 20,
                    EXPANSION: 15,
                    MERGERS_AND_ACQUISITION: 15,
                    LEADERSHIP_CHANGE: 15,
                    GCC_SETUP: 15,
                    ENTRY_IN_INDIA: 10,
                    INDUSTRY_OUTLOOK: 10,
                  };
                  const colorMap: Record<string, string> = {
                    FUNDING: "#10b981",
                    EXPANSION: "#0ea5e9",
                    MERGERS_AND_ACQUISITION: "#8b5cf6",
                    LEADERSHIP_CHANGE: "#f59e0b",
                    GCC_SETUP: "#ec4899",
                    ENTRY_IN_INDIA: "#06b6d4",
                    INDUSTRY_OUTLOOK: "#64748b",
                  };
                  const labelMap: Record<string, string> = {
                    FUNDING: "Funding",
                    EXPANSION: "Expansion",
                    MERGERS_AND_ACQUISITION: "M&A",
                    LEADERSHIP_CHANGE: "Leadership",
                    GCC_SETUP: "GCC Setup",
                    ENTRY_IN_INDIA: "Entry in India",
                    INDUSTRY_OUTLOOK: "Industry Outlook",
                  };
                  const ORDER = [
                    "FUNDING",
                    "EXPANSION",
                    "MERGERS_AND_ACQUISITION",
                    "LEADERSHIP_CHANGE",
                    "GCC_SETUP",
                    "ENTRY_IN_INDIA",
                    "INDUSTRY_OUTLOOK",
                  ];
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const total =
                    (categories ?? []).reduce(
                      (s: number, c: any) => s + c.count,
                      0,
                    ) || 1;
                  return ORDER.map((key) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const row = (categories ?? []).find(
                      (c: any) => c.category === key,
                    );
                    const count = row?.count ?? 0;
                    const pct = Math.round((count / total) * 100);
                    const target = targets[key] ?? 10;
                    const isHealthy = pct >= Math.round(target * 0.6);
                    const color = colorMap[key] ?? "#64748b";
                    const barWidth = Math.min(
                      Math.round((pct / target) * 100),
                      100,
                    );
                    return (
                      <div key={key}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="font-medium">{labelMap[key]}</span>
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span
                              className={
                                isHealthy
                                  ? "text-emerald-400 font-semibold"
                                  : "text-rose-400 font-semibold"
                              }
                            >
                              {pct}%
                            </span>
                            <span>target {target}%</span>
                            <span className="text-foreground/60">
                              {count} art.
                            </span>
                          </span>
                        </div>
                        <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${barWidth}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Time Series */}
        <Card className="lg:col-span-7">
          <CardHeader>
            <CardTitle>Article Discovery & AI Usage Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loadingTimeSeries || loadingAi ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={timeSeries}
                  margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" orientation="left" stroke="#0ea5e9" />
                  <YAxis yAxisId="right" orientation="right" stroke="#ec4899" />
                  <RechartsTooltip />
                  <Bar
                    yAxisId="left"
                    dataKey="count"
                    name="Articles Discovered"
                    fill="#0ea5e9"
                    opacity={0.3}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    data={aiUsage?.dailyTokens}
                    dataKey="tokens"
                    name="AI Tokens"
                    stroke="#ec4899"
                    strokeWidth={3}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Entity Intelligence */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Entity Intelligence (Top 10)</CardTitle>
            <CardDescription>
              Most frequently mentioned companies
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loadingCompanies ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={companies}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={100} />
                  <RechartsTooltip />
                  <Bar
                    dataKey="count"
                    fill="#10b981"
                    radius={[0, 4, 4, 0]}
                    barSize={25}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Top Cities */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Top Locations</CardTitle>
          </CardHeader>
          <CardContent className="h-[350px]">
            {loadingCities ? (
              <Skeleton className="h-full w-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={cities}
                  layout="vertical"
                  margin={{ left: 60, right: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <RechartsTooltip />
                  <Bar
                    dataKey="count"
                    fill="#f59e0b"
                    radius={[0, 4, 4, 0]}
                    barSize={25}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Source Performance & AI Prompt Performance Tables */}
        <div className="lg:col-span-7 grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Source Health</CardTitle>
              <CardDescription>
                Articles ingested, trust score & last crawl per source
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSources ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted">
                      <tr>
                        <th className="px-4 py-3">Source</th>
                        <th className="px-4 py-3">Articles</th>
                        <th className="px-4 py-3">Score</th>
                        <th className="px-4 py-3">Last Crawled</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {sources?.slice(0, 10).map((s: any) => (
                        <tr
                          key={s.id}
                          className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                        >
                          <td
                            className="px-4 py-3 font-medium max-w-[160px] truncate"
                            title={s.name}
                          >
                            {s.name}
                          </td>
                          <td className="px-4 py-3 font-bold text-emerald-400">
                            {s.articlesCount}
                          </td>
                          <td className="px-4 py-3">
                            {(s.compositeScore ?? 0).toFixed(1)}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {s.lastCrawled
                              ? new Date(s.lastCrawled).toLocaleDateString(
                                  "en-IN",
                                  { day: "2-digit", month: "short" },
                                )
                              : "Never"}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                s.status === "ACTIVE"
                                  ? "bg-emerald-500/15 text-emerald-400"
                                  : "bg-rose-500/15 text-rose-400"
                              }`}
                            >
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Prompt Performance & Latency</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingPrompts ? (
                <Skeleton className="h-48" />
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase bg-muted">
                      <tr>
                        <th className="px-6 py-3">Prompt Key</th>
                        <th className="px-6 py-3">Success Rate</th>
                        <th className="px-6 py-3">Avg Latency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {prompts?.slice(0, 8).map((p: any) => (
                        <tr
                          key={`${p.promptKey}-${p.version}`}
                          className="border-b border-border/50"
                        >
                          <td className="px-6 py-4 font-medium">
                            {p.promptKey} (v{p.version})
                          </td>
                          <td className="px-6 py-4 text-emerald-500">
                            {p.successRate.toFixed(1)}%
                          </td>
                          <td className="px-6 py-4">
                            {p.avgLatency.toFixed(0)} ms
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
