"use client";

import { useSession, signIn } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import apiClient from "@/lib/api/api-client";
import { Sliders, Sparkles, Shield, Info } from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [isLinkedInConnected, setIsLinkedInConnected] = useState(false);
  const [isBufferConfigured, setIsBufferConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Quality Thresholds
  const [analysisThreshold, setAnalysisThreshold] = useState("8.5");
  const [hunterThreshold, setHunterThreshold] = useState("7.0");
  const [thresholdLoading, setThresholdLoading] = useState(false);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await apiClient.get("/auth/me");
        setIsLinkedInConnected(res.data.hasLinkedInConnection === true);
        setIsBufferConfigured(res.data.isBufferConfigured === true);

        try {
          const tRes: any = await apiClient.get(
            "/admin/feature-flags/thresholds",
          );
          const t = tRes?.data || tRes;
          if (t?.analysisThreshold !== undefined) {
            setAnalysisThreshold(t.analysisThreshold.toString());
          }
          if (t?.hunterThreshold !== undefined) {
            setHunterThreshold(t.hunterThreshold.toString());
          }
        } catch {
          // Non-admin or route not available
        }
      } catch (e) {
        console.error("Failed to check status", e);
      } finally {
        setLoading(false);
      }
    };
    fetchStatus();
  }, [session]);

  const handleDisconnect = async () => {
    try {
      await apiClient.post("/auth/oauth-disconnect/linkedin");
      setIsLinkedInConnected(false);
      toast.success("LinkedIn disconnected successfully.");
    } catch (e) {
      console.error("Failed to disconnect", e);
      toast.error("Failed to disconnect LinkedIn.");
    }
  };

  const handleSaveThresholds = async () => {
    const aVal = parseFloat(analysisThreshold);
    const hVal = parseFloat(hunterThreshold);
    if (
      isNaN(aVal) ||
      aVal < 1 ||
      aVal > 10 ||
      isNaN(hVal) ||
      hVal < 1 ||
      hVal > 10
    ) {
      toast.error("Thresholds must be numbers between 1 and 10.");
      return;
    }
    setThresholdLoading(true);
    try {
      await apiClient.put("/admin/feature-flags/thresholds", {
        analysisThreshold: aVal,
        hunterThreshold: hVal,
      });
      toast.success("Quality thresholds updated successfully!");
    } catch (e) {
      console.error("Failed to update thresholds", e);
      toast.error("Failed to update thresholds.");
    } finally {
      setThresholdLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    setPasswordLoading(true);
    try {
      await apiClient.post("/auth/password", { newPassword });
      toast.success("Password updated successfully.");
      setNewPassword("");
    } catch (e) {
      console.error("Failed to update password", e);
      toast.error("Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Integrations & Settings
        </h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* ── Quality & High-Value Article Filtering Card ── */}
        <Card className="border-emerald-500/30 bg-emerald-950/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sliders className="h-5 w-5 text-emerald-400" />
              Content Quality Thresholds
            </CardTitle>
            <CardDescription>
              Filter high-value corporate news and prevent low-signal draft
              overload.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-sm">
                <label className="font-medium text-white flex items-center gap-1.5">
                  Standard Feed Threshold
                  <span className="text-xs text-emerald-400 font-bold">
                    ({analysisThreshold}/10)
                  </span>
                </label>
              </div>
              <p className="text-xs text-zinc-400">
                Minimum Business Impact score required for RSS sources (Mint,
                ET, Moneycontrol) to trigger draft generation.
              </p>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                value={analysisThreshold}
                onChange={(e) => setAnalysisThreshold(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 pt-2 border-t border-zinc-800">
              <div className="flex justify-between items-center text-sm">
                <label className="font-medium text-white flex items-center gap-1.5">
                  AI Hunter Threshold
                  <span className="text-xs text-blue-400 font-bold">
                    ({hunterThreshold}/10)
                  </span>
                </label>
              </div>
              <p className="text-xs text-zinc-400">
                Minimum impact score for AI Hunter discovered articles to
                trigger draft generation.
              </p>
              <input
                type="number"
                step="0.1"
                min="1"
                max="10"
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                value={hunterThreshold}
                onChange={(e) => setHunterThreshold(e.target.value)}
              />
            </div>

            <Button
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium mt-2"
              onClick={handleSaveThresholds}
              disabled={thresholdLoading}
            >
              {thresholdLoading ? "Saving..." : "Save Quality Thresholds"}
            </Button>
          </CardContent>
        </Card>

        {/* ── LinkedIn Personal Profile Card ── */}
        <Card>
          <CardHeader>
            <CardTitle>LinkedIn Integration</CardTitle>
            <CardDescription>
              Connect your LinkedIn account to publish generated AI posts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Checking status...
              </p>
            ) : isLinkedInConnected ? (
              <div className="border rounded-md p-4 bg-muted/20">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-[#0a66c2] rounded-md flex items-center justify-center text-xl font-bold text-white">
                    in
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">LinkedIn Connected</h3>
                    <p className="text-sm text-muted-foreground">
                      Personal Profile Publishing Active
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                    onClick={handleDisconnect}
                  >
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  No LinkedIn account is currently connected. Connect your
                  account to publish scheduled posts.
                </p>
                <Button
                  onClick={() =>
                    signIn("linkedin", { redirectTo: "/dashboard/settings" })
                  }
                  className="w-full bg-[#0a66c2] hover:bg-[#004182] text-white"
                >
                  Connect LinkedIn
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Buffer Company Page Card ── */}
        <Card>
          <CardHeader>
            <CardTitle>LinkedIn Company Page</CardTitle>
            <CardDescription>
              Publish to your Company Page via Make.com or Zapier — no LinkedIn
              API approval needed.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">
                Checking status...
              </p>
            ) : isBufferConfigured ? (
              <div className="border rounded-md p-4 bg-muted/20">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-[#168ee1] rounded-md flex items-center justify-center text-2xl font-bold text-white">
                    B
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">Buffer Connected</h3>
                    <p className="text-sm text-muted-foreground">
                      Company Page Publishing Active
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Connect Make.com (free) to publish to your LinkedIn Company
                  Page without needing the Community Management API.
                </p>
                <ol className="text-sm text-muted-foreground list-decimal pl-4 space-y-1">
                  <li>
                    Create a free scenario at{" "}
                    <a
                      href="https://make.com"
                      target="_blank"
                      rel="noreferrer"
                      className="underline"
                    >
                      make.com
                    </a>
                  </li>
                  <li>
                    Add: <strong>Webhooks</strong> &rarr;{" "}
                    <strong>LinkedIn &rarr; Create a Company Update</strong>
                  </li>
                  <li>
                    Copy the webhook URL and add it to Render as{" "}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      COMPANY_PAGE_WEBHOOK_URL
                    </code>
                  </li>
                </ol>
                <Button
                  id="setup-make-btn"
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open("https://make.com", "_blank")}
                >
                  Set Up Make.com &rarr;
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Security Card ── */}
        <Card>
          <CardHeader>
            <CardTitle>Security</CardTitle>
            <CardDescription>Update your account password.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">New Password</label>
              <input
                type="password"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <Button
              className="w-full"
              onClick={handleChangePassword}
              disabled={passwordLoading || !newPassword}
            >
              {passwordLoading ? "Updating..." : "Update Password"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
