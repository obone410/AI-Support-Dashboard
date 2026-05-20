import {
  ArrowUpRight,
  Bot,
  Cloud,
  Code2,
  Download,
  ExternalLink,
  Mail,
  ShieldCheck
} from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Eyitayo Oyedo | AI Operations Portfolio",
  description:
    "AI operations, prompt engineering, deployment monitoring, and technical systems portfolio."
};

const projects = [
  {
    name: "AI Support Agent Dashboard",
    focus:
      "Role-based support workflows, ticket management, SLA monitoring, deployment observability, and secure server-side AI integration.",
    live: "https://ai-support-dashboard-navy.vercel.app",
    github: "https://github.com/obone410/AI-Support-Dashboard",
    stack: ["Next.js", "Supabase", "Vercel", "OpenAI SDK"]
  },
  {
    name: "PromptDeck AI",
    focus:
      "Prompt versioning, benchmarking, workflow organization, agents, traces, and release tracking for AI operations.",
    live: "https://ai-prompt-management-platform.vercel.app",
    github: "https://github.com/obone410/AI-Prompt-Management-Platform",
    stack: ["Next.js", "Prompt Engineering", "AI Workflows", "Vercel"]
  },
  {
    name: "ResearchOS",
    focus:
      "Multi-document research workspace for synthesis, cited Q&A, file ingestion, and knowledge extraction.",
    live: "https://ai-research-assistant-liart.vercel.app",
    github: "https://github.com/obone410/AI-Research-Assistant",
    stack: ["AI Research", "File Workflows", "Technical Research", "Vercel"]
  },
  {
    name: "Aegis-Monitor",
    focus:
      "Cloud operations and deployment observability console for release health, telemetry, incident context, SLO burn, and CI/CD visibility.",
    live: "https://devops-monitoring-dashboard-psi.vercel.app",
    github: "https://github.com/obone410/Aegis-Monitor",
    stack: ["DevOps", "Observability", "CI/CD", "Vercel"]
  }
];

const highlights = [
  {
    icon: Bot,
    title: "AI Operations",
    text: "AI-assisted workflows, prompt systems, support operations, and research automation."
  },
  {
    icon: Cloud,
    title: "Cloud Deployment",
    text: "Production-style deployments, Vercel workflows, monitoring concepts, and release visibility."
  },
  {
    icon: ShieldCheck,
    title: "Security Awareness",
    text: "Server-side API handling, authentication concepts, rate limiting, and safe credential boundaries."
  },
  {
    icon: Code2,
    title: "Technical Systems",
    text: "Practical interfaces built with Next.js, Supabase, TypeScript, GitHub, and Tailwind CSS."
  }
];

export default function PortfolioPage() {
  return (
    <main className="min-h-screen bg-[#f7faf9] text-[#101816]">
      <section className="border-b border-[#d9e3e0] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[1.1fr_0.9fr] md:py-14">
          <div className="flex flex-col justify-center">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#007a78]">
              AI Operations Portfolio
            </p>
            <h1 className="mt-3 max-w-3xl text-4xl font-semibold leading-tight text-[#0f1715] md:text-6xl">
              Eyitayo Oyedo
            </h1>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-[#3b4845]">
              Computer Engineering graduate building AI-assisted operational
              dashboards, prompt systems, research workflows, and deployment
              monitoring projects.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                className="inline-flex items-center gap-2 rounded-md bg-[#0f1715] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d2a27]"
                href="/resume/Eyitayo_Oyedo_AI_Technical_Resume.pdf"
              >
                <Download size={18} />
                Download Resume
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-md border border-[#b8c8c3] bg-white px-4 py-3 text-sm font-semibold text-[#0f1715] transition hover:border-[#007a78]"
                href="https://github.com/obone410"
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={18} />
                GitHub
              </a>
              <a
                className="inline-flex items-center gap-2 rounded-md border border-[#b8c8c3] bg-white px-4 py-3 text-sm font-semibold text-[#0f1715] transition hover:border-[#007a78]"
                href="https://linkedin.com/in/eyitayo-oyedo"
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={18} />
                LinkedIn
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-[#d7e3df] bg-[#edf4f2]">
            <img
              alt="AI Support Dashboard interface screenshot"
              className="h-full min-h-[280px] w-full object-cover"
              src="https://raw.githubusercontent.com/obone410/AI-Support-Dashboard/main/docs/assets/screenshots/dashboard-overview.png"
            />
          </div>
        </div>
      </section>

      <section className="border-b border-[#d9e3e0] bg-[#eef5f3]">
        <div className="mx-auto grid max-w-6xl gap-4 px-5 py-8 md:grid-cols-4">
          {highlights.map((item) => {
            const Icon = item.icon;
            return (
              <article
                className="rounded-lg border border-[#d4e0dc] bg-white p-5"
                key={item.title}
              >
                <Icon className="text-[#007a78]" size={24} />
                <h2 className="mt-4 text-base font-semibold text-[#0f1715]">
                  {item.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#4b5a56]">
                  {item.text}
                </p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="flex flex-col justify-between gap-4 border-b border-[#d9e3e0] pb-5 md:flex-row md:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#007a78]">
              Selected Projects
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#0f1715]">
              Recruiter-ready builds
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-6 text-[#4b5a56]">
            Four deployed systems focused on support operations, prompt
            management, research workflows, and deployment observability.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <article
              className="rounded-lg border border-[#d9e3e0] bg-white p-5"
              key={project.name}
            >
              <div className="flex items-start justify-between gap-4">
                <h3 className="text-xl font-semibold text-[#0f1715]">
                  {project.name}
                </h3>
                <a
                  aria-label={`Open ${project.name} live deployment`}
                  className="rounded-md border border-[#c8d6d1] p-2 text-[#0f1715] transition hover:border-[#007a78] hover:text-[#007a78]"
                  href={project.live}
                  rel="noreferrer"
                  target="_blank"
                >
                  <ArrowUpRight size={18} />
                </a>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#43514d]">
                {project.focus}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {project.stack.map((item) => (
                  <span
                    className="rounded-md bg-[#eef5f3] px-2.5 py-1 text-xs font-semibold text-[#22443f]"
                    key={item}
                  >
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-5 flex flex-wrap gap-3 text-sm font-semibold">
                <a
                  className="text-[#006b69] underline-offset-4 hover:underline"
                  href={project.live}
                  rel="noreferrer"
                  target="_blank"
                >
                  Live deployment
                </a>
                <a
                  className="text-[#006b69] underline-offset-4 hover:underline"
                  href={project.github}
                  rel="noreferrer"
                  target="_blank"
                >
                  GitHub repo
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-[#d9e3e0] bg-white">
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-10 md:grid-cols-[0.8fr_1.2fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#007a78]">
              Skills
            </p>
            <h2 className="mt-2 text-3xl font-semibold text-[#0f1715]">
              Technical direction
            </h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <SkillGroup
              title="AI & Automation"
              value="ChatGPT, Claude Code, Prompt Engineering, Generative AI, OpenAI SDKs"
            />
            <SkillGroup
              title="Development"
              value="Next.js, React, TypeScript, Tailwind CSS, Supabase, REST APIs"
            />
            <SkillGroup
              title="Cloud & DevOps"
              value="Vercel, Docker fundamentals, Kubernetes fundamentals, CI/CD, monitoring concepts"
            />
            <SkillGroup
              title="Professional"
              value="Technical research, technical support, communication, documentation, problem solving"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10">
        <div className="rounded-lg border border-[#d9e3e0] bg-[#0f1715] p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-[#75d6ca]">
            Contact
          </p>
          <h2 className="mt-2 text-3xl font-semibold">Recruiter hub</h2>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              className="inline-flex items-center gap-2 rounded-md bg-white px-4 py-3 text-sm font-semibold text-[#0f1715]"
              href="mailto:oyedoeyitayoidowu@gmail.com"
            >
              <Mail size={18} />
              Email
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-white/30 px-4 py-3 text-sm font-semibold text-white"
              href="https://github.com/obone410"
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={18} />
              GitHub
            </a>
            <a
              className="inline-flex items-center gap-2 rounded-md border border-white/30 px-4 py-3 text-sm font-semibold text-white"
              href="https://linkedin.com/in/eyitayo-oyedo"
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={18} />
              LinkedIn
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

function SkillGroup({ title, value }: { title: string; value: string }) {
  return (
    <article className="rounded-lg border border-[#d9e3e0] bg-[#f8fbfa] p-4">
      <h3 className="text-base font-semibold text-[#0f1715]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-[#4b5a56]">{value}</p>
    </article>
  );
}
