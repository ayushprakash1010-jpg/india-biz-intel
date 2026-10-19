"use client";

import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api/api-client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity, Calendar, FileText, CheckCircle, Brain,
  RefreshCw, Eye, ArrowRight, DollarSign, Users,
  Globe, TrendingUp, Handshake, Building2,
} from "lucide-react";
import Link from "next/link";
import { ElementType } from "react";

// ── Stat card ──────────────────────────────────────────────────────────────
interface StatCardProps { title: string; value: string | number; icon: ElementType; loading?: boolean; }
const StatCard = ({ title, value, icon: Icon, loading }: StatCardProps) => (
  <Card className="bg-card">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      <Icon className="h-4 w-4 text-muted-foreground" />
    </CardHeader>
    <CardContent>
      {loading ? <Skeleton className="h-8 w-20" /> : <div className="text-2xl font-bold">{value}</div>}
    </CardContent>
  </Card>
);

// ── Topic breakdown pill ────────────────────────────────────────────────────
const TOPICS = [
  { key: "FUNDING",                 label: "Funding",         color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", icon: DollarSign },
  { key: "LEADERSHIP_CHANGE",       label: "Leadership",      color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20",   icon: Users },
  { key: "ENTRY_IN_INDIA",          label: "Entry in India",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20",       icon: Globe },
  { key: "EXPANSION",               label: "Expansion",       color: "text-orange-400",  bg: "bg-orange-500/10 border-orange-500/20",   icon: TrendingUp },
  { key: "MERGERS_AND_ACQUISITION", label: "M&A",             color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/20",       icon: Handshake },
  { key: "GCC_SETUP",               label: "GCC Setup",       color: "text-sky-400",     bg: "bg-sky-500/10 border-sky-500/20",         icon: Building2 },
];

export default function DashboardPage() {
  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ["dashboard", "overview"],
    queryFn: async () => { const res = await apiClient.get("/analytics/overview?period=7d"); return res.data; },
  });

  const { data: drafts, isLoading: loadingDrafts } = useQuery({
    queryKey: ["dashboard", "drafts"],
    queryFn: async () => { const res = await apiClient.get("/content/drafts?status=APPROVED&limit=1"); return res.data; },
  });

  const { data: trends, isLoading: loadingTrends } = useQuery({
    queryKey: ["dashboard", "trends"],
    queryFn: async () => { const res = await apiClient.get("/trends?status=DETECTED&limit=1"); return res.data; },
  });

  return (
    <div className="p-8 space-y-8 animate-in fade-in zoom-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            India BizIntel — your daily corporate intelligence briefing.
          </p>
        </div>
        <div className="flex space-x-3">
          <Link href="/dashboard/sources" className="inline-flex items-center justify-center rounded-md text-sm font-medium bg-orange-600 text-white h-10 px-4 py-2 hover:bg-orange-700 transition-colors">
            <RefreshCw className="mr-2 h-4 w-4" /> Crawl Sources
          </Link>
          <Link href="/dashboard/content?tab=pending" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-800 bg-gray-900 text-white h-10 px-4 py-2 hover:bg-gray-800 transition-colors">
            <Eye className="mr-2 h-4 w-4" /> View Pending
          </Link>
          <Link href="/dashboard/calendar" className="inline-flex items-center justify-center rounded-md text-sm font-medium border border-gray-800 bg-gray-900 text-white h-10 px-4 py-2 hover:bg-gray-800 transition-colors">
            <Calendar className="mr-2 h-4 w-4" /> Calendar
          </Link>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Articles (7d)" value={overview?.totalArticles || 0} icon={FileText} loading={loadingOverview} />
        <StatCard title="Pending Review" value={overview?.pendingReview ?? 0} icon={CheckCircle} loading={loadingOverview} />
        <StatCard title="Scheduled This Week" value={overview?.postsScheduled || 0} icon={Calendar} loading={loadingOverview} />
        <StatCard title="Active Sources" value={overview?.sourcesActive || 0} icon={Activity} loading={loadingOverview} />
      </div>

      {/* Topic breakdown */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Topic Coverage (7d)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {TOPICS.map((t) => {
            const Icon = t.icon;
            const count = overview?.topicBreakdown?.[t.key] ?? "—";
            return (
              <Link key={t.key} href={`/dashboard/articles?topic=${t.key}`}>
                <div className={`p-4 rounded-xl border ${t.bg} hover:scale-[1.03] transition-transform cursor-pointer`}>
                  <Icon className={`w-5 h-5 mb-2 ${t.color}`} />
                  <div className={`text-2xl font-bold ${t.color}`}>{loadingOverview ? "—" : count}</div>
                  <div className="text-xs text-gray-400 mt-0.5 leading-tight">{t.label}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Trend + Draft row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Latest Trend */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Brain className="mr-2 h-5 w-5 text-orange-500" />
              Latest Trend Detected
            </CardTitle>
            <CardDescription>Recently identified narrative pattern</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingTrends ? (
              <div className="space-y-2"><Skeleton className="h-6 w-3/4" /><Skeleton className="h-4 w-1/2" /></div>
            ) : trends && trends.length > 0 ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{trends[0].name}</h3>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                      Score: {trends[0].score.toFixed(1)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {trends[0].articleCount} Articles
                    </span>
                  </div>
                </div>
                <Link href="/dashboard/trends" className="text-sm text-orange-500 hover:text-orange-400 flex items-center">
                  View full trend analysis <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No active trends detected yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Latest Approved Post */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CheckCircle className="mr-2 h-5 w-5 text-emerald-500" />
              Latest Approved Post
            </CardTitle>
            <CardDescription>Ready for publishing to LinkedIn</CardDescription>
          </CardHeader>
          <CardContent className="flex-1">
            {loadingDrafts ? (
              <div className="space-y-2"><Skeleton className="h-20 w-full" /></div>
            ) : drafts && drafts.length > 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg border border-border">
                  <p className="text-sm line-clamp-3 text-muted-foreground">
                    {drafts[0].versions[0]?.content || "No content preview available."}
                  </p>
                </div>
                <Link href={`/dashboard/content/${drafts[0].id}`} className="text-sm text-emerald-500 hover:text-emerald-400 flex items-center">
                  Review or schedule post <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No approved drafts currently.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
