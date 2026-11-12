"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CalendarIcon,
  Clock,
  Link as LinkIcon,
  Trash,
  Pencil,
  Check,
  X,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import apiClient from "@/lib/api/api-client";

export default function CalendarPage() {
  const [calendar, setCalendar] = useState<Record<string, unknown[]>>({});
  const [loading, setLoading] = useState(true);
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);
  const [newTime, setNewTime] = useState<string>("");

  const fetchCalendar = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/schedule/calendar");
      setCalendar(res.data || res);
    } catch (_err) {
      console.error(_err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
  }, []);

  const handleCancel = async (id: string) => {
    try {
      await apiClient.delete(`/schedule/${id}`);
      toast.success("Post canceled", {
        description: "Draft reverted to APPROVED.",
      });
      fetchCalendar();
    } catch {
      toast.error("An error occurred");
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const startReschedule = (post: any) => {
    setReschedulingId(post.id);
    // Pre-fill with the current scheduled time in datetime-local format
    const d = new Date(post.scheduledFor);
    const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setNewTime(localIso);
  };

  const handleReschedule = async (id: string) => {
    if (!newTime) return;
    try {
      await apiClient.put(`/schedule/${id}`, {
        scheduledFor: new Date(newTime).toISOString(),
      });
      toast.success("Post rescheduled successfully!");
      setReschedulingId(null);
      setNewTime("");
      fetchCalendar();
    } catch {
      toast.error("Failed to reschedule post.");
    }
  };

  const [sortOrder, setSortOrder] = useState<"desc" | "asc">("desc");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "QUEUED" | "PUBLISHED" | "FAILED"
  >("ALL");

  // Flatten posts to compute counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allPosts = Object.values(calendar).flat() as any[];
  const queuedCount = allPosts.filter((p) => p.status === "QUEUED").length;
  const publishedCount = allPosts.filter(
    (p) => p.status === "PUBLISHED",
  ).length;
  const failedCount = allPosts.filter((p) => p.status === "FAILED").length;

  // Sort dates: default DESCENDING (newest upcoming dates on top)
  const allDates = Object.keys(calendar).sort((a, b) => {
    const timeA = new Date(a).getTime();
    const timeB = new Date(b).getTime();
    return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
  });

  const filteredDates = allDates.filter((date) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const posts = (calendar[date] as any[]) || [];
    if (statusFilter === "ALL") return posts.length > 0;
    return posts.some((p) => p.status === statusFilter);
  });

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Content Calendar
          </h2>
          <p className="text-muted-foreground mt-1">
            Manage scheduled posts across all platforms. AI automatically spaces
            posts to optimize reach.
          </p>
        </div>

        {/* Filter & Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === "ALL"
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              All ({allPosts.length})
            </button>
            <button
              onClick={() => setStatusFilter("QUEUED")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === "QUEUED"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Queued ({queuedCount})
            </button>
            <button
              onClick={() => setStatusFilter("PUBLISHED")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                statusFilter === "PUBLISHED"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Published ({publishedCount})
            </button>
            {failedCount > 0 && (
              <button
                onClick={() => setStatusFilter("FAILED")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                  statusFilter === "FAILED"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Failed ({failedCount})
              </button>
            )}
          </div>

          {/* Sort Order Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSortOrder(sortOrder === "desc" ? "asc" : "desc")}
            className="gap-1.5 text-xs border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800 hover:text-white cursor-pointer h-8"
            title="Toggle chronological sorting"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-blue-400" />
            {sortOrder === "desc" ? "Newest First" : "Oldest First"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-8">Loading calendar...</div>
      ) : allDates.length === 0 ? (
        <div className="text-muted-foreground py-8 border-2 border-dashed rounded-lg p-8 text-center flex flex-col items-center justify-center">
          <CalendarIcon className="h-10 w-10 mb-4 text-muted-foreground/50" />
          <p>No posts scheduled yet.</p>
          <p className="text-sm">
            Approve and schedule drafts from the Content section.
          </p>
        </div>
      ) : filteredDates.length === 0 ? (
        <div className="text-muted-foreground py-8 border-2 border-dashed border-zinc-800 rounded-lg p-8 text-center flex flex-col items-center justify-center">
          <CalendarIcon className="h-10 w-10 mb-4 text-muted-foreground/50" />
          <p>No {statusFilter.toLowerCase()} posts in the calendar.</p>
          <Button
            variant="link"
            size="sm"
            onClick={() => setStatusFilter("ALL")}
            className="text-xs text-blue-400 mt-2 cursor-pointer"
          >
            Show All Posts
          </Button>
        </div>
      ) : (
        <div className="space-y-8 mt-6">
          {filteredDates.map((date) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const posts = ((calendar[date] as any[]) || [])
              .filter((p) =>
                statusFilter === "ALL" ? true : p.status === statusFilter,
              )
              .sort((a, b) => {
                const timeA = new Date(a.scheduledFor).getTime();
                const timeB = new Date(b.scheduledFor).getTime();
                return sortOrder === "desc" ? timeB - timeA : timeA - timeB;
              });

            if (posts.length === 0) return null;

            return (
              <div key={date}>
                <h3 className="text-xl font-semibold mb-4 border-b pb-2 flex items-center justify-between">
                  <span className="flex items-center">
                    <CalendarIcon className="w-5 h-5 mr-2 text-muted-foreground" />
                    {new Date(date).toLocaleDateString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                  <span className="text-xs font-normal text-zinc-500">
                    {posts.length} {posts.length === 1 ? "post" : "posts"}
                  </span>
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {posts.map((post: any) => (
                    <Card key={post.id}>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start mb-2">
                          <Badge
                            variant={
                              post.status === "PUBLISHED"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {post.status}
                          </Badge>
                          <div className="flex items-center gap-1">
                            <Badge variant="outline">
                              {post.draft?.targetPlatform}
                            </Badge>
                            {post.status === "QUEUED" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-muted-foreground hover:text-blue-500"
                                  onClick={() => startReschedule(post)}
                                  title="Reschedule"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="w-7 h-7 text-muted-foreground hover:text-red-500"
                                  onClick={() => handleCancel(post.id)}
                                  title="Cancel Schedule"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                        <CardTitle className="text-base leading-tight line-clamp-2">
                          {post.draft?.versions?.[0]?.content?.substring(
                            0,
                            100,
                          )}
                          ...
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Clock className="w-4 h-4 mr-2" />
                          {new Date(post.scheduledFor).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>

                        {/* Inline Reschedule UI */}
                        {post.status === "QUEUED" &&
                          reschedulingId === post.id && (
                            <div className="space-y-2.5 p-3.5 bg-zinc-50 rounded-lg border border-zinc-200">
                              <p className="text-xs font-semibold text-zinc-900">
                                Select new date &amp; time:
                              </p>
                              <input
                                type="datetime-local"
                                value={newTime}
                                onChange={(e) => setNewTime(e.target.value)}
                                className="w-full text-sm rounded-md border border-zinc-300 bg-white text-zinc-900 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                              />
                              <div className="flex gap-2 pt-1">
                                <Button
                                  size="sm"
                                  onClick={() => handleReschedule(post.id)}
                                  className="flex-1 gap-1 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                                >
                                  <Check className="w-3.5 h-3.5" /> Confirm
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setReschedulingId(null)}
                                  className="flex-1 gap-1 border-zinc-300 text-zinc-700 hover:bg-zinc-100"
                                >
                                  <X className="w-3.5 h-3.5" /> Cancel
                                </Button>
                              </div>
                            </div>
                          )}

                        {post.scheduleRationale && (
                          <div className="bg-blue-50/70 border border-blue-100 p-3 rounded-lg text-xs text-blue-900 leading-relaxed">
                            <span className="font-bold text-blue-950 block mb-1">
                              AI Recommendation
                            </span>
                            {post.scheduleRationale}
                          </div>
                        )}

                        {post.status === "PUBLISHED" && post.publishedUrl && (
                          <a
                            href={post.publishedUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center text-sm text-blue-500 hover:underline"
                          >
                            <LinkIcon className="w-4 h-4 mr-2" /> View Post
                          </a>
                        )}
                        {post.status === "QUEUED" && post.draftId && (
                          <a
                            href={`/dashboard/content/${post.draftId}`}
                            className="flex items-center text-sm text-blue-500 hover:underline"
                          >
                            <LinkIcon className="w-4 h-4 mr-2" /> Review Draft
                          </a>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
