import Link from "next/link";
import { ArrowRight, Globe, Send, Network, Zap, TrendingUp, Users, Building2, DollarSign, Handshake, Briefcase } from "lucide-react";

const TOPICS = [
  { label: "Funding", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  { label: "Leadership Change", icon: Users, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  { label: "Entry in India", icon: Globe, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
  { label: "Expansion", icon: TrendingUp, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
  { label: "M&A", icon: Handshake, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
  { label: "GCC Setup", icon: Building2, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
];

const SOURCES = ["MoneyControl", "Economic Times", "Business Standard", "BCG", "Bain", "Kearney"];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white font-sans selection:bg-indigo-500/30">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center font-bold text-sm shadow-lg shadow-orange-500/20">
            IB
          </div>
          <span className="font-bold text-xl tracking-tight">India BizIntel</span>
        </div>
        <div className="flex items-center space-x-6">
          <Link href="/login" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/dashboard" className="px-4 py-2 text-sm font-medium bg-white text-gray-950 rounded-full hover:bg-gray-100 transition-colors shadow-lg shadow-white/10">
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative flex flex-col items-center justify-center px-6 pt-28 pb-20 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[500px] bg-orange-500/10 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[400px] h-[300px] bg-rose-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-300 text-xs font-medium mb-8">
          <Zap className="w-3.5 h-3.5" />
          <span>Powered by Gemini AI &bull; Live on MoneyControl, ET &amp; BS</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl bg-clip-text text-transparent bg-gradient-to-b from-white to-gray-400">
          India&apos;s Corporate Intelligence, Automated
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mb-10">
          India BizIntel crawls MoneyControl, Economic Times, and Business Standard every day.
          Gemini AI filters, classifies, and summarises the deals, moves, and milestones that matter.
        </p>

        {/* Topic pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-10 max-w-2xl">
          {TOPICS.map((t) => (
            <div key={t.label} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium ${t.bg} ${t.color}`}>
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 z-10">
          <Link href="/dashboard" className="inline-flex items-center justify-center px-8 py-4 text-base font-semibold bg-orange-600 text-white rounded-full hover:bg-orange-700 transition-all shadow-xl shadow-orange-600/20 w-full sm:w-auto group">
            Launch Dashboard
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Source logos row */}
        <div className="mt-16 flex flex-col items-center gap-4">
          <p className="text-xs text-gray-600 uppercase tracking-widest">Tracking signals from</p>
          <div className="flex flex-wrap justify-center gap-6">
            {SOURCES.map((s) => (
              <span key={s} className="text-sm font-semibold text-gray-500 hover:text-gray-300 transition-colors cursor-default">{s}</span>
            ))}
          </div>
        </div>
      </main>

      {/* Features Section */}
      <section className="py-24 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              An autonomous pipeline — from raw news feed to classified, summarised, publish-ready insight.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Globe className="w-6 h-6 text-blue-400" />}
              title="Multi-Source Crawling"
              description="Hourly crawls of MoneyControl, Economic Times, Business Standard, and daily scraping of BCG, Bain, and Kearney for industry outlook."
            />
            <FeatureCard
              icon={<Network className="w-6 h-6 text-orange-400" />}
              title="AI Topic Classification"
              description="Gemini AI classifies every article into one of 6 corporate event categories and deduplicates across sources automatically."
            />
            <FeatureCard
              icon={<Send className="w-6 h-6 text-emerald-400" />}
              title="LinkedIn Publishing"
              description="Review AI-drafted LinkedIn posts in the dashboard, approve, schedule, and publish — directly from your browser."
            />
          </div>
        </div>
      </section>

      {/* Topic Grid Section */}
      <section className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">6 Categories. Every day.</h2>
          <p className="text-gray-400 max-w-xl mx-auto">Every article is tagged to one of these corporate event types so your feed stays focused.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {TOPICS.map((t) => (
            <div key={t.label} className={`p-6 rounded-2xl border ${t.bg} group hover:scale-[1.02] transition-transform`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${t.bg}`}>
                <t.icon className={`w-5 h-5 ${t.color}`} />
              </div>
              <h3 className={`text-lg font-bold mb-1 ${t.color}`}>{t.label}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {t.label === "Funding" && "VC, PE, Series A–D, debt rounds — named company and deal size required."}
                {t.label === "Leadership Change" && "CEO, CXO, MD, Director appointments and exits at India-operating companies."}
                {t.label === "Entry in India" && "Global companies officially launching, entering, or forming a JV in India for the first time."}
                {t.label === "Expansion" && "New offices, geographies, plants, or significant headcount additions."}
                {t.label === "M&A" && "Mergers, acquisitions, buyouts, stake purchases — all named deals."}
                {t.label === "GCC Setup" && "Multinational companies setting up or expanding Global Capability Centers in India."}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 text-sm border-t border-gray-800">
        <p>© {new Date().getFullYear()} India BizIntel. All rights reserved.</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-700 transition-colors group">
      <div className="w-12 h-12 rounded-lg bg-gray-800 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}
