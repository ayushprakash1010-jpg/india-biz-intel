"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Search, ExternalLink, Calendar, Hash, DollarSign, Users, Globe, TrendingUp, Handshake, Building2, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

// ── Topic config ──────────────────────────────────────────────────────────────
const TOPIC_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  FUNDING:                  { label: "Funding",         color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30", icon: DollarSign },
  LEADERSHIP_CHANGE:        { label: "Leadership",      color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/30",  icon: Users },
  ENTRY_IN_INDIA:           { label: "Entry in India",  color: "text-blue-400",    bg: "bg-blue-500/10",    border: "border-blue-500/30",    icon: Globe },
  EXPANSION:                { label: "Expansion",       color: "text-orange-400",  bg: "bg-orange-500/10",  border: "border-orange-500/30",  icon: TrendingUp },
  MERGERS_AND_ACQUISITION:  { label: "M&A",             color: "text-rose-400",    bg: "bg-rose-500/10",    border: "border-rose-500/30",    icon: Handshake },
  GCC_SETUP:                { label: "GCC Setup",       color: "text-sky-400",     bg: "bg-sky-500/10",     border: "border-sky-500/30",     icon: Building2 },
  INDUSTRY_OUTLOOK:         { label: "Industry Outlook",color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/30",   icon: BarChart3 },
};

const FILTER_TOPICS = ["ALL", ...Object.keys(TOPIC_CONFIG)];

function TopicBadge({ topic }: { topic: string }) {
  const cfg = TOPIC_CONFIG[topic];
  if (!cfg) return <Badge variant="outline">{topic}</Badge>;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTopic, setActiveTopic] = useState("ALL");

  const fetchArticles = async (query?: string) => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      let url = `${apiUrl}/api/v1/articles`;
      if (query) url = `${apiUrl}/api/v1/articles/search?q=${encodeURIComponent(query)}`;
      const res = await axios.get(url);
      setArticles(res.data.items || res.data || []);
    } catch (error) {
      console.error("Failed to fetch articles", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchArticles(); }, []);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchArticles(searchQuery); };

  const handleSkip = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await axios.post(`${apiUrl}/api/v1/articles/${id}/skip`);
      setArticles(articles.map((a) => (a.id === id ? { ...a, status: "SKIPPED" } : a)));
    } catch (error) { console.error("Failed to skip", error); }
  };

  const handleAnalyze = async (id: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      await axios.post(`${apiUrl}/api/v1/articles/${id}/analyze`);
      setArticles(articles.map((a) => (a.id === id ? { ...a, status: "ANALYZED" } : a)));
    } catch (error) { console.error("Failed to analyze", error); }
  };

  // Client-side topic filter
  const filtered = activeTopic === "ALL"
    ? articles
    : articles.filter((a) => a.topic === activeTopic || a.analysis?.eventCategory === activeTopic);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Article Inbox</h1>
          <p className="text-muted-foreground mt-1">Review and classify discovered India business news.</p>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-4 items-center">
        <div className="relative flex-1 max-w-2xl">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search articles..."
            className="pl-8 bg-zinc-900 border-zinc-800"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button type="submit">Search</Button>
        {searchQuery && (
          <Button type="button" variant="ghost" onClick={() => { setSearchQuery(""); fetchArticles(); }}>Clear</Button>
        )}
      </form>

      {/* Topic filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTopic("ALL")}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
            activeTopic === "ALL"
              ? "bg-white text-gray-950 border-white"
              : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
          }`}
        >
          All Topics
        </button>
        {Object.entries(TOPIC_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon;
          const isActive = activeTopic === key;
          return (
            <button
              key={key}
              onClick={() => setActiveTopic(key)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                isActive ? `${cfg.bg} ${cfg.color} ${cfg.border}` : "bg-transparent text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Count */}
      {!loading && (
        <p className="text-xs text-gray-500">
          Showing <span className="text-white font-semibold">{filtered.length}</span> articles
          {activeTopic !== "ALL" && <> tagged <span className={`font-semibold ${TOPIC_CONFIG[activeTopic]?.color}`}>{TOPIC_CONFIG[activeTopic]?.label}</span></>}
        </p>
      )}

      {/* Article list */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-white">Loading articles...</p>
        ) : filtered.length === 0 ? (
          <p className="text-muted-foreground">No articles found for this topic.</p>
        ) : (
          filtered.map((article) => (
            <div
              key={article.id}
              className="p-4 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-700 flex flex-col md:flex-row gap-4 justify-between items-start transition-colors"
            >
              <div className="space-y-2 flex-1">
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <Link href={`/dashboard/articles/${article.id}`} className="hover:underline flex-1">
                    <h3 className="font-semibold text-lg text-white leading-snug">{article.title}</h3>
                  </Link>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {(article.topic || article.analysis?.eventCategory) && (
                      <TopicBadge topic={article.topic || article.analysis?.eventCategory} />
                    )}
                    <Badge variant="outline" className="whitespace-nowrap">{article.status}</Badge>
                  </div>
                </div>

                <p className="text-zinc-400 text-sm line-clamp-2">
                  {article.rawText?.substring(0, 200) || "No content available."}
                </p>

                <div className="flex items-center gap-4 text-xs text-zinc-500 pt-2">
                  {article.source && (
                    <span className="flex items-center gap-1">
                      <Hash className="h-3 w-3" /> {article.source.name}
                    </span>
                  )}
                  {article.publishedAt && (
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(article.publishedAt).toLocaleDateString()}
                    </span>
                  )}
                  <a href={article.externalUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                    <ExternalLink className="h-3 w-3" /> Original Source
                  </a>
                </div>
              </div>

              <div className="flex md:flex-col gap-2 min-w-[120px]">
                <Link href={`/dashboard/articles/${article.id}`}>
                  <Button size="sm">View Details</Button>
                </Link>
                <Button size="sm" variant="outline" onClick={() => handleAnalyze(article.id)}>Analyze Now</Button>
                <Button size="sm" variant="outline" onClick={() => handleSkip(article.id)}>Skip</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
