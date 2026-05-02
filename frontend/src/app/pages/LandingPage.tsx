import { Button } from "../components/ui/button";
import { Database } from "lucide-react";
import { Link } from "react-router";
import { motion } from "motion/react";

const metrics = [
  { value: "320ms", label: "QUERY LATENCY" },
  { value: "8ms", label: "RESPONSE TIME" },
  { value: "120+", label: "INTEGRATIONS" },
];

const features = ["INSTANT SEARCH", "REAL-TIME SYNC", "AI-POWERED"];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-hidden">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
              <Database className="w-4 h-4 text-black" />
            </div>
            <span className="text-sm font-medium tracking-tight">ULDA</span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-xs text-white/50 hover:text-white transition-colors tracking-wide">
              FEATURES
            </a>
          </nav>

          <Link to="/login">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 px-4"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-32 md:pt-40 pb-24 md:pb-28 px-6 md:px-8">
        {/* Subtle gradient glow */}
        <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/[0.02] rounded-full blur-3xl"></div>

        <div className="relative max-w-[1000px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            {/* Small badge */}
            <div className="inline-flex items-center gap-2 mb-8">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
              <span className="text-xs text-white/60 tracking-widest uppercase">Universal Data Assistant</span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl md:text-8xl font-bold mb-6 leading-[0.95] tracking-tight">
              Welcome to intelligent
              <br />
              <span className="text-white/40">data exploration</span>
            </h1>

            <p className="text-lg text-white/50 mb-12 max-w-2xl mx-auto leading-relaxed font-light">
              Connect your data sources and query everything in natural language.
              <br />
              AI-powered insights across documents, databases, and apps without leaving your workflow.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <Link to="/login">
                <Button
                  size="lg"
                  className="h-11 px-6 text-sm font-medium"
                >
                  LAUNCH STUDIO →
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="h-11 px-6 text-sm font-medium"
              >
                Explore stories
              </Button>
            </div>

            {/* Feature badges */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 mb-14">
              {features.map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
                  className="text-xs text-white/40 tracking-widest uppercase"
                >
                  {feature}
                </motion.div>
              ))}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-10 max-w-3xl mx-auto">
              {metrics.map((metric, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.5 + i * 0.1 }}
                  className="text-center"
                >
                  <p className="text-xs text-white/30 tracking-widest mb-3 uppercase">{metric.label}</p>
                  <p className="text-4xl font-bold tracking-tight">{metric.value}</p>
                  <div className="mt-5 mx-auto h-px w-20 bg-white/12" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 md:py-32 px-6 md:px-8 border-t border-white/10">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-white/10">
            {[
              {
                title: "Connect Everything",
                desc: "Notion, Drive, Slack, Gmail — unified search across all your data",
              },
              {
                title: "Natural Language",
                desc: "Ask questions like you would to a colleague, get instant cited answers",
              },
              {
                title: "Private & Secure",
                desc: "End-to-end encrypted. Your data never leaves your control",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="bg-[#0a0a0a] p-12 hover:bg-white/[0.05] transition-colors"
              >
                <h3 className="text-xl font-medium mb-3 tracking-tight">{item.title}</h3>
                <p className="text-sm text-white/40 leading-relaxed font-light">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6 md:px-8">
        <div className="max-w-[1400px] mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 bg-white rounded-md flex items-center justify-center">
              <Database className="w-3.5 h-3.5 text-black" />
            </div>
            <span className="text-xs font-medium tracking-tight">ULDA</span>
          </div>

          <p className="text-xs text-white/30">
            © 2026 ULDA. Universal LLM-Powered Data Assistant
          </p>
        </div>
      </footer>
    </div>
  );
}
