"use client";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  Bot,
  CheckCircle2,
  Clock3,
  Cloud,
  Database,
  GitBranch,
  LogOut,
  MessageSquareText,
  Plus,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserRound,
  UsersRound
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  demoAgents,
  demoAiEvaluationLogs,
  demoConversationThreads,
  demoDeployments,
  demoTeams,
  demoTickets,
  demoUser
} from "@/lib/demo-data";
import {
  calculateSlaDueAt,
  countAssignedTickets,
  getAgentName,
  getSlaState,
  getTeamName
} from "@/lib/operations";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type {
  AiEvaluationLog,
  ChatMessage,
  ConversationThreads,
  DeploymentEvent,
  SupportTicket,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserProfile,
  UserRole
} from "@/lib/types";

const storageKeys = {
  user: "ai-support-dashboard:user",
  tickets: "ai-support-dashboard:tickets",
  threads: "ai-support-dashboard:threads",
  evaluations: "ai-support-dashboard:evaluations"
};

const categories: TicketCategory[] = [
  "Billing",
  "Bug",
  "Account Access",
  "Feature Request",
  "Technical Question"
];

const priorities: TicketPriority[] = ["Low", "Medium", "High", "Urgent"];

const statuses: TicketStatus[] = ["Open", "In Review", "Waiting", "Resolved"];

const nowIso = () => new Date().toISOString();

function makeId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStoredJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStoredJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browsers can block storage or run out of quota; the app should keep running.
  }
}

function removeStoredValue(key: string) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage cleanup failures for the same reason writes are best-effort.
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function priorityStyle(priority: TicketPriority) {
  const styles: Record<TicketPriority, string> = {
    Low: "border-moss/20 bg-moss/10 text-moss",
    Medium: "border-amber/25 bg-amber/10 text-amber",
    High: "border-coral/25 bg-coral/10 text-coral",
    Urgent: "border-red-500/25 bg-red-500/10 text-red-700"
  };

  return styles[priority];
}

function statusStyle(status: TicketStatus) {
  const styles: Record<TicketStatus, string> = {
    Open: "border-coral/25 bg-coral/10 text-coral",
    "In Review": "border-sea/25 bg-sea/10 text-sea",
    Waiting: "border-amber/25 bg-amber/10 text-amber",
    Resolved: "border-moss/25 bg-moss/10 text-moss"
  };

  return styles[status];
}

function slaStyle(state: ReturnType<typeof getSlaState>) {
  const styles: Record<ReturnType<typeof getSlaState>, string> = {
    Healthy: "border-moss/20 bg-moss/10 text-moss",
    "Due Soon": "border-amber/25 bg-amber/10 text-amber",
    Breached: "border-red-500/25 bg-red-500/10 text-red-700",
    Resolved: "border-moss/25 bg-moss/10 text-moss"
  };

  return styles[state];
}

function deploymentStyle(state: DeploymentEvent["state"]) {
  const styles: Record<DeploymentEvent["state"], string> = {
    READY: "border-moss/20 bg-moss/10 text-moss",
    BUILDING: "border-blueprint/20 bg-blueprint/10 text-blueprint",
    ERROR: "border-red-500/25 bg-red-500/10 text-red-700",
    CANCELED: "border-ink/15 bg-ink/10 text-ink/65",
    QUEUED: "border-amber/25 bg-amber/10 text-amber"
  };

  return styles[state];
}

function evaluationStyle(score: number) {
  if (score >= 90) return "border-moss/20 bg-moss/10 text-moss";
  if (score >= 75) return "border-sea/20 bg-sea/10 text-sea";
  if (score >= 60) return "border-amber/25 bg-amber/10 text-amber";
  return "border-red-500/25 bg-red-500/10 text-red-700";
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function defaultTeamForCategory(category: TicketCategory) {
  if (category === "Billing") return "team-revenue";
  if (category === "Account Access") return "team-access";
  return "team-platform";
}

function firstAgentForTeam(teamId: string) {
  return demoAgents.find((agent) => agent.teamId === teamId)?.id ?? demoAgents[0].id;
}

export function SupportDashboard() {
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [adminView, setAdminView] = useState<"teams" | "agents">("teams");
  const [authForm, setAuthForm] = useState({
    name: "Portfolio Admin",
    email: "admin@example.com",
    password: "portfolio-demo"
  });
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [tickets, setTickets] = useState<SupportTicket[]>(demoTickets);
  const [conversationThreads, setConversationThreads] =
    useState<ConversationThreads>(demoConversationThreads);
  const [deployments, setDeployments] =
    useState<DeploymentEvent[]>(demoDeployments);
  const [aiEvaluationLogs, setAiEvaluationLogs] =
    useState<AiEvaluationLog[]>(demoAiEvaluationLogs);
  const [deploymentSource, setDeploymentSource] = useState("demo");
  const [selectedTicketId, setSelectedTicketId] = useState(demoTickets[0]?.id);
  const [searchTerm, setSearchTerm] = useState("");
  const [assistantInput, setAssistantInput] = useState("");
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [notice, setNotice] = useState("Demo workspace ready.");
  const [newTicket, setNewTicket] = useState(() => {
    const teamId = "team-platform";
    return {
      subject: "",
      customer: "",
      email: "",
      category: "Technical Question" as TicketCategory,
      priority: "Medium" as TicketPriority,
      teamId,
      assignedAgentId: firstAgentForTeam(teamId),
      description: ""
    };
  });

  const isAdmin = currentUser?.role === "admin";
  const canManageAssignments = isAdmin;

  useEffect(() => {
    let cancelled = false;
    const fallbackUser = isSupabaseConfigured ? null : demoUser;
    const storedUser = readStoredJson<UserProfile | null>(
      storageKeys.user,
      fallbackUser
    );
    const storedTickets = readStoredJson<SupportTicket[]>(
      storageKeys.tickets,
      demoTickets
    );
    const storedThreads = readStoredJson<ConversationThreads>(
      storageKeys.threads,
      demoConversationThreads
    );
    const storedEvaluations = readStoredJson<AiEvaluationLog[]>(
      storageKeys.evaluations,
      demoAiEvaluationLogs
    );
    const nextUser =
      isSupabaseConfigured && storedUser && !isUuid(storedUser.id)
        ? null
        : storedUser;

    queueMicrotask(() => {
      if (cancelled) return;
      setCurrentUser(nextUser);
      setTickets(storedTickets);
      setConversationThreads(storedThreads);
      setAiEvaluationLogs(storedEvaluations);
      setSelectedTicketId(storedTickets[0]?.id);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      writeStoredJson(storageKeys.tickets, tickets);
    }
  }, [tickets]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      writeStoredJson(storageKeys.threads, conversationThreads);
    }
  }, [conversationThreads]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      writeStoredJson(storageKeys.evaluations, aiEvaluationLogs);
    }
  }, [aiEvaluationLogs]);

  useEffect(() => {
    if (currentUser && !isSupabaseConfigured) {
      writeStoredJson(storageKeys.user, currentUser);
      return;
    }

    if (!currentUser) {
      removeStoredValue(storageKeys.user);
    }
  }, [currentUser]);

  useEffect(() => {
    async function loadDeployments() {
      try {
        const response = await fetch("/api/vercel/deployments");
        const data = await response.json();
        setDeployments(data.deployments ?? demoDeployments);
        setDeploymentSource(data.source ?? "demo");
      } catch {
        setDeployments(demoDeployments);
        setDeploymentSource("demo");
      }
    }

    loadDeployments();
  }, []);

  useEffect(() => {
    async function loadSupabaseTickets() {
      if (!supabase || !currentUser) return;

      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setNotice(error.message);
        return;
      }

      if (!data?.length) return;

      const mappedTickets = data.map((row) => {
        const priority = row.priority as TicketPriority;
        return {
          id: row.id,
          subject: row.subject,
          customer: row.customer_name,
          email: row.customer_email,
          category: row.category,
          priority,
          status: row.status,
          description: row.description,
          assignedAgentId: row.assigned_agent_id ?? firstAgentForTeam("team-platform"),
          teamId: row.team_id ?? "team-platform",
          slaDueAt: row.sla_due_at ?? calculateSlaDueAt(row.created_at, priority),
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          sentiment: row.sentiment
        };
      }) as SupportTicket[];

      setTickets(mappedTickets);
      setSelectedTicketId(mappedTickets[0]?.id);
      setNotice("Loaded tickets from Supabase.");
    }

    loadSupabaseTickets();
  }, [currentUser]);

  useEffect(() => {
    async function loadSupabaseThread() {
      if (!supabase || !currentUser || !selectedTicketId) return;

      const { data, error } = await supabase
        .from("conversation_messages")
        .select("*")
        .eq("ticket_id", selectedTicketId)
        .order("created_at", { ascending: true });

      if (error || !data?.length) return;

      setConversationThreads((current) => ({
        ...current,
        [selectedTicketId]: data.map((row) => ({
          id: row.id,
          role: row.role,
          content: row.content,
          createdAt: row.created_at
        })) as ChatMessage[]
      }));
    }

    loadSupabaseThread();
  }, [currentUser, selectedTicketId]);

  useEffect(() => {
    async function loadSupabaseEvaluations() {
      if (!supabase || !currentUser) return;

      const { data, error } = await supabase
        .from("ai_evaluation_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (error || !data?.length) return;

      setAiEvaluationLogs(
        data.map((row) => ({
          id: row.id,
          requestId: row.request_id,
          ticketId: row.ticket_id ?? undefined,
          source: row.source,
          model: row.model,
          score: row.score,
          latencyMs: row.latency_ms,
          promptMessageCount: row.prompt_message_count,
          promptCharCount: row.prompt_char_count,
          responseCharCount: row.response_char_count,
          safetyPassed: row.safety_passed,
          groundedTicketContext: row.grounded_ticket_context,
          containsNextSteps: row.contains_next_steps,
          containsCustomerReply: row.contains_customer_reply,
          notes: row.notes,
          createdAt: row.created_at
        })) as AiEvaluationLog[]
      );
    }

    loadSupabaseEvaluations();
  }, [currentUser]);

  const selectedTicket = useMemo(
    () => tickets.find((ticketItem) => ticketItem.id === selectedTicketId),
    [selectedTicketId, tickets]
  );

  const selectedMessages = selectedTicket
    ? (conversationThreads[selectedTicket.id] ?? [])
    : [];

  const filteredTickets = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return tickets;

    return tickets.filter((ticketItem) =>
      [
        ticketItem.subject,
        ticketItem.customer,
        ticketItem.category,
        ticketItem.priority,
        ticketItem.status,
        getAgentName(demoAgents, ticketItem.assignedAgentId),
        getTeamName(demoTeams, ticketItem.teamId)
      ]
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [searchTerm, tickets]);

  const slaAlerts = useMemo(
    () =>
      tickets.filter((ticketItem) =>
        ["Breached", "Due Soon"].includes(getSlaState(ticketItem))
      ),
    [tickets]
  );

  const metrics = useMemo(() => {
    const open = tickets.filter((ticketItem) => ticketItem.status !== "Resolved");
    const urgent = tickets.filter(
      (ticketItem) =>
        ticketItem.priority === "Urgent" || ticketItem.sentiment === "At Risk"
    );
    const breached = tickets.filter(
      (ticketItem) => getSlaState(ticketItem) === "Breached"
    );
    const resolved = tickets.filter(
      (ticketItem) => ticketItem.status === "Resolved"
    );

    return {
      open: open.length,
      urgent: urgent.length,
      breached: breached.length,
      resolved: resolved.length
    };
  }, [tickets]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (supabase) {
      const authCall =
        authMode === "signup"
          ? supabase.auth.signUp({
              email: authForm.email,
              password: authForm.password,
              options: { data: { name: authForm.name } }
            })
          : supabase.auth.signInWithPassword({
              email: authForm.email,
              password: authForm.password
            });

      const { data, error } = await authCall;

      if (error) {
        setNotice(error.message);
        return;
      }

      const userId = data.user?.id ?? makeId("user");
      const { data: storedProfile } = data.user
        ? await supabase
            .from("profiles")
            .select("name,email,role,team")
            .eq("id", data.user.id)
            .maybeSingle()
        : { data: null };

      const profile: UserProfile = {
        id: userId,
        name:
          storedProfile?.name ??
          authForm.name ??
          data.user?.email?.split("@")[0] ??
          "Support User",
        email: storedProfile?.email ?? data.user?.email ?? authForm.email,
        role: (storedProfile?.role as UserRole | undefined) ?? "agent",
        team: storedProfile?.team ?? "Customer Operations"
      };

      await supabase.from("profiles").upsert({
        id: profile.id,
        name: profile.name,
        email: profile.email,
        team: profile.team
      });

      setCurrentUser(profile);
      setNotice("Signed in with Supabase.");
      return;
    }

    setCurrentUser({
      id: makeId("demo-user"),
      name: authForm.name || "Portfolio Admin",
      email: authForm.email,
      role: "admin",
      team: "Customer Operations"
    });
    setNotice("Signed in with the local demo profile.");
  }

  async function handleLogout() {
    if (supabase) {
      await supabase.auth.signOut();
    }

    setCurrentUser(null);
    removeStoredValue(storageKeys.user);
    setNotice("Signed out.");
  }

  function setDemoRole(role: UserRole) {
    if (isSupabaseConfigured) return;

    setCurrentUser((current) =>
      current
        ? {
            ...current,
            role,
            name: role === "admin" ? "Portfolio Admin" : "Support Agent"
          }
        : current
    );
  }

  async function persistTicket(ticket: SupportTicket) {
    if (!supabase || !currentUser) return;

    const { error } = await supabase.from("support_tickets").upsert({
      id: ticket.id,
      user_id: currentUser.id,
      subject: ticket.subject,
      customer_name: ticket.customer,
      customer_email: ticket.email,
      category: ticket.category,
      priority: ticket.priority,
      status: ticket.status,
      description: ticket.description,
      assigned_agent_id: ticket.assignedAgentId,
      team_id: ticket.teamId,
      sla_due_at: ticket.slaDueAt,
      sentiment: ticket.sentiment,
      created_at: ticket.createdAt,
      updated_at: ticket.updatedAt
    });

    setNotice(error ? error.message : "Ticket synced to Supabase.");
  }

  async function persistMessage(message: ChatMessage) {
    if (!supabase || !currentUser || !selectedTicket) return;

    const { error } = await supabase.from("conversation_messages").insert({
      id: message.id,
      user_id: currentUser.id,
      ticket_id: selectedTicket.id,
      role: message.role,
      content: message.content,
      created_at: message.createdAt
    });

    if (error) setNotice(error.message);
  }

  async function handleTicketSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const createdAt = nowIso();
    const teamId = newTicket.teamId;
    const ticket: SupportTicket = {
      id: makeId("tkt"),
      subject: newTicket.subject,
      customer: newTicket.customer,
      email: newTicket.email,
      category: newTicket.category,
      priority: newTicket.priority,
      status: "Open",
      description: newTicket.description,
      assignedAgentId: newTicket.assignedAgentId,
      teamId,
      slaDueAt: calculateSlaDueAt(createdAt, newTicket.priority),
      createdAt,
      updatedAt: createdAt,
      sentiment: newTicket.priority === "Urgent" ? "At Risk" : "Neutral"
    };

    setTickets((currentTickets) => [ticket, ...currentTickets]);
    setConversationThreads((current) => ({
      ...current,
      [ticket.id]: [
        {
          id: makeId("msg"),
          role: "assistant",
          content:
            "New ticket thread created. I can help draft the first response, assign investigation steps, or summarize escalation risk.",
          createdAt
        }
      ]
    }));
    setSelectedTicketId(ticket.id);
    setNewTicket({
      subject: "",
      customer: "",
      email: "",
      category: "Technical Question",
      priority: "Medium",
      teamId: "team-platform",
      assignedAgentId: firstAgentForTeam("team-platform"),
      description: ""
    });
    setNotice("Ticket created and assigned.");
    await persistTicket(ticket);
  }

  async function updateTicket(ticketId: string, patch: Partial<SupportTicket>) {
    let changedTicket: SupportTicket | undefined;

    setTickets((currentTickets) =>
      currentTickets.map((ticketItem) => {
        if (ticketItem.id !== ticketId) return ticketItem;
        changedTicket = {
          ...ticketItem,
          ...patch,
          updatedAt: nowIso()
        };
        return changedTicket;
      })
    );

    if (changedTicket) await persistTicket(changedTicket);
  }

  async function handleStatusChange(ticketId: string, status: TicketStatus) {
    await updateTicket(ticketId, { status });
  }

  async function handleTeamChange(ticketId: string, teamId: string) {
    await updateTicket(ticketId, {
      teamId,
      assignedAgentId: firstAgentForTeam(teamId)
    });
  }

  async function handleAgentChange(ticketId: string, assignedAgentId: string) {
    await updateTicket(ticketId, { assignedAgentId });
  }

  async function handleAssistantSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedInput = assistantInput.trim();
    if (!trimmedInput || !selectedTicket) return;

    const userMessage: ChatMessage = {
      id: makeId("msg"),
      role: "user",
      content: trimmedInput,
      createdAt: nowIso()
    };

    const nextMessages = [...selectedMessages, userMessage];
    setConversationThreads((current) => ({
      ...current,
      [selectedTicket.id]: nextMessages
    }));
    setAssistantInput("");
    setIsAssistantThinking(true);
    await persistMessage(userMessage);

    try {
      const session = supabase ? await supabase.auth.getSession() : null;
      const response = await fetch("/api/ai-support", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.data.session?.access_token
            ? { Authorization: `Bearer ${session.data.session.access_token}` }
            : {})
        },
        body: JSON.stringify({
          messages: nextMessages.slice(-10).map(({ role, content }) => ({
            role,
            content
          })),
          ticket: selectedTicket
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Assistant request failed.");
      }

      const assistantMessage: ChatMessage = {
        id: makeId("msg"),
        role: "assistant",
        content: data.reply,
        createdAt: nowIso()
      };

      setConversationThreads((current) => ({
        ...current,
        [selectedTicket.id]: [...nextMessages, assistantMessage]
      }));
      if (data.evaluation) {
        setAiEvaluationLogs((current) => [
          {
            id: makeId("eval"),
            requestId: data.requestId ?? makeId("req"),
            ticketId: selectedTicket.id,
            source: data.source,
            model: data.evaluation.model,
            score: data.evaluation.score,
            latencyMs: data.evaluation.latencyMs,
            promptMessageCount: data.evaluation.promptMessageCount,
            promptCharCount: data.evaluation.promptCharCount,
            responseCharCount: data.evaluation.responseCharCount,
            safetyPassed: data.evaluation.safetyPassed,
            groundedTicketContext: data.evaluation.groundedTicketContext,
            containsNextSteps: data.evaluation.containsNextSteps,
            containsCustomerReply: data.evaluation.containsCustomerReply,
            notes: data.evaluation.notes,
            createdAt: nowIso()
          },
          ...current
        ].slice(0, 6));
      }
      await persistMessage(assistantMessage);
      setNotice(
        data.source === "openai"
          ? "AI response generated by OpenAI."
          : "AI response generated in demo mode."
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Assistant request failed.";
      setNotice(message);
    } finally {
      setIsAssistantThinking(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-4 text-ink sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1540px] flex-col gap-5">
        <header className="glass-panel rounded-[28px] px-4 py-4 sm:px-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <div className="glass-button flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-sea">
                <Sparkles size={22} aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase text-ink/45">
                  AI support operations
                </p>
                <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">
                  AI Support Agent Dashboard
                </h1>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
              <StatusBadge
                icon={<Database size={16} aria-hidden="true" />}
                label={isSupabaseConfigured ? "Supabase" : "Demo mode"}
              />
              <StatusBadge
                icon={<ShieldCheck size={16} aria-hidden="true" />}
                label={currentUser ? currentUser.role : "Signed out"}
              />
              <StatusBadge
                icon={<Bell size={16} aria-hidden="true" />}
                label={
                  metrics.breached > 0
                    ? `${metrics.breached} SLA breached`
                    : "SLA stable"
                }
              />
              <StatusBadge
                icon={<CheckCircle2 size={16} aria-hidden="true" />}
                label="Audit clean"
              />
            </div>
          </div>
        </header>

        <section className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)_390px]">
          <aside className="flex flex-col gap-5">
            <Panel
              eyebrow="Workspace"
              title="Session"
              icon={<UserRound size={20} aria-hidden="true" />}
            >
              {currentUser ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-white/60 bg-white/35 p-4">
                    <p className="font-semibold">{currentUser.name}</p>
                    <p className="mt-1 truncate text-sm text-ink/58">
                      {currentUser.email}
                    </p>
                    <p className="mt-4 text-xs font-semibold uppercase text-sea">
                      {currentUser.team}
                    </p>
                  </div>
                  {!isSupabaseConfigured ? (
                    <Field label="Demo role view">
                      <select
                        value={currentUser.role}
                        onChange={(event) =>
                          setDemoRole(event.target.value as UserRole)
                        }
                        className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                      >
                        <option value="admin">Admin</option>
                        <option value="agent">Agent</option>
                      </select>
                    </Field>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="glass-button inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold text-ink"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    Sign out
                  </button>
                </div>
              ) : (
                <form className="space-y-3" onSubmit={handleAuthSubmit}>
                  <div className="grid grid-cols-2 gap-2">
                    <SegmentButton
                      active={authMode === "signin"}
                      onClick={() => setAuthMode("signin")}
                    >
                      Login
                    </SegmentButton>
                    <SegmentButton
                      active={authMode === "signup"}
                      onClick={() => setAuthMode("signup")}
                    >
                      Signup
                    </SegmentButton>
                  </div>
                  {authMode === "signup" ? (
                    <Field label="Name">
                      <input
                        value={authForm.name}
                        onChange={(event) =>
                          setAuthForm((current) => ({
                            ...current,
                            name: event.target.value
                          }))
                        }
                        className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                        required
                      />
                    </Field>
                  ) : null}
                  <Field label="Email">
                    <input
                      type="email"
                      value={authForm.email}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          email: event.target.value
                        }))
                      }
                      className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                      required
                    />
                  </Field>
                  <Field label="Password">
                    <input
                      type="password"
                      minLength={8}
                      value={authForm.password}
                      onChange={(event) =>
                        setAuthForm((current) => ({
                          ...current,
                          password: event.target.value
                        }))
                      }
                      className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                      required
                    />
                  </Field>
                  <button
                    type="submit"
                    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-3 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition hover:bg-sea"
                  >
                    <ShieldCheck size={16} aria-hidden="true" />
                    Continue
                  </button>
                </form>
              )}
            </Panel>

            <Panel
              eyebrow="Intake"
              title="New ticket"
              icon={<Plus size={20} aria-hidden="true" />}
            >
              <form className="space-y-3" onSubmit={handleTicketSubmit}>
                <Field label="Subject">
                  <input
                    value={newTicket.subject}
                    onChange={(event) =>
                      setNewTicket((current) => ({
                        ...current,
                        subject: event.target.value
                      }))
                    }
                    className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                    required
                  />
                </Field>
                <Field label="Customer">
                  <input
                    value={newTicket.customer}
                    onChange={(event) =>
                      setNewTicket((current) => ({
                        ...current,
                        customer: event.target.value
                      }))
                    }
                    className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                    required
                  />
                </Field>
                <Field label="Email">
                  <input
                    type="email"
                    value={newTicket.email}
                    onChange={(event) =>
                      setNewTicket((current) => ({
                        ...current,
                        email: event.target.value
                      }))
                    }
                    className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                    required
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Category">
                    <select
                      value={newTicket.category}
                      onChange={(event) => {
                        const category = event.target.value as TicketCategory;
                        const teamId = defaultTeamForCategory(category);
                        setNewTicket((current) => ({
                          ...current,
                          category,
                          teamId,
                          assignedAgentId: firstAgentForTeam(teamId)
                        }));
                      }}
                      className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                    >
                      {categories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Priority">
                    <select
                      value={newTicket.priority}
                      onChange={(event) =>
                        setNewTicket((current) => ({
                          ...current,
                          priority: event.target.value as TicketPriority
                        }))
                      }
                      className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                    >
                      {priorities.map((priority) => (
                        <option key={priority}>{priority}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Team">
                    <select
                      value={newTicket.teamId}
                      onChange={(event) => {
                        const teamId = event.target.value;
                        setNewTicket((current) => ({
                          ...current,
                          teamId,
                          assignedAgentId: firstAgentForTeam(teamId)
                        }));
                      }}
                      className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                    >
                      {demoTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Assign to">
                    <select
                      value={newTicket.assignedAgentId}
                      onChange={(event) =>
                        setNewTicket((current) => ({
                          ...current,
                          assignedAgentId: event.target.value
                        }))
                      }
                      className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                    >
                      {demoAgents
                        .filter((agent) => agent.teamId === newTicket.teamId)
                        .map((agent) => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name}
                          </option>
                        ))}
                    </select>
                  </Field>
                </div>
                <Field label="Description">
                  <textarea
                    rows={4}
                    value={newTicket.description}
                    onChange={(event) =>
                      setNewTicket((current) => ({
                        ...current,
                        description: event.target.value
                      }))
                    }
                    className="glass-input mt-1 w-full resize-none rounded-2xl px-3 py-2"
                    required
                  />
                </Field>
                <button
                  type="submit"
                  className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-coral px-3 text-sm font-semibold text-white shadow-lg shadow-coral/20 transition hover:bg-[#e95c4c]"
                >
                  <Ticket size={16} aria-hidden="true" />
                  Create ticket
                </button>
              </form>
            </Panel>
          </aside>

          <section className="flex min-w-0 flex-col gap-5">
            <section className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
              <MetricCard
                icon={<Ticket size={20} aria-hidden="true" />}
                label="Open queue"
                value={String(metrics.open)}
                tone="sea"
              />
              <MetricCard
                icon={<AlertTriangle size={20} aria-hidden="true" />}
                label="Escalations"
                value={String(metrics.urgent)}
                tone="coral"
              />
              <MetricCard
                icon={<Clock3 size={20} aria-hidden="true" />}
                label="SLA breaches"
                value={String(metrics.breached)}
                tone="amber"
              />
              <MetricCard
                icon={<CheckCircle2 size={20} aria-hidden="true" />}
                label="Resolved"
                value={String(metrics.resolved)}
                tone="moss"
              />
            </section>

            <section className="glass-panel flex min-h-[720px] flex-col rounded-[28px]">
              <div className="flex flex-col gap-3 border-b border-white/55 p-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase text-ink/45">
                    Copilot
                  </p>
                  <h2 className="mt-1 text-xl font-semibold">Ticket command</h2>
                </div>
                {selectedTicket ? (
                  <div className="flex flex-wrap gap-2">
                    <Pill className={priorityStyle(selectedTicket.priority)}>
                      {selectedTicket.priority}
                    </Pill>
                    <Pill className={statusStyle(selectedTicket.status)}>
                      {selectedTicket.status}
                    </Pill>
                    <Pill className={slaStyle(getSlaState(selectedTicket))}>
                      SLA {getSlaState(selectedTicket)}
                    </Pill>
                  </div>
                ) : null}
              </div>

              {selectedTicket ? (
                <div className="border-b border-white/55 bg-white/20 p-5">
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-ink">
                        {selectedTicket.subject}
                      </h3>
                      <p className="mt-1 text-sm text-ink/58">
                        {selectedTicket.customer} · {selectedTicket.email}
                      </p>
                      <p className="mt-3 max-w-3xl text-sm leading-6 text-ink/72">
                        {selectedTicket.description}
                      </p>
                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <SnapshotRow
                          label="Team"
                          value={getTeamName(demoTeams, selectedTicket.teamId)}
                        />
                        <SnapshotRow
                          label="Agent"
                          value={getAgentName(
                            demoAgents,
                            selectedTicket.assignedAgentId
                          )}
                        />
                        <SnapshotRow
                          label="SLA due"
                          value={formatTime(selectedTicket.slaDueAt)}
                        />
                      </div>
                    </div>
                    <div className="space-y-3">
                      <Field label="Status">
                        <select
                          value={selectedTicket.status}
                          onChange={(event) =>
                            handleStatusChange(
                              selectedTicket.id,
                              event.target.value as TicketStatus
                            )
                          }
                          className="glass-input mt-1 w-full rounded-2xl px-3 py-2"
                        >
                          {statuses.map((status) => (
                            <option key={status}>{status}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Team">
                        <select
                          value={selectedTicket.teamId}
                          disabled={!canManageAssignments}
                          onChange={(event) =>
                            handleTeamChange(selectedTicket.id, event.target.value)
                          }
                          className="glass-input mt-1 w-full rounded-2xl px-3 py-2 disabled:opacity-60"
                        >
                          {demoTeams.map((team) => (
                            <option key={team.id} value={team.id}>
                              {team.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Assign to">
                        <select
                          value={selectedTicket.assignedAgentId}
                          disabled={!canManageAssignments}
                          onChange={(event) =>
                            handleAgentChange(
                              selectedTicket.id,
                              event.target.value
                            )
                          }
                          className="glass-input mt-1 w-full rounded-2xl px-3 py-2 disabled:opacity-60"
                        >
                          {demoAgents
                            .filter((agent) => agent.teamId === selectedTicket.teamId)
                            .map((agent) => (
                              <option key={agent.id} value={agent.id}>
                                {agent.name}
                              </option>
                            ))}
                        </select>
                      </Field>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-5">
                {selectedMessages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <article
                      className={`max-w-[90%] rounded-[22px] border p-4 shadow-sm ${
                        message.role === "user"
                          ? "border-sea/20 bg-sea text-white"
                          : "border-white/65 bg-white/58 text-ink backdrop-blur-xl"
                      }`}
                    >
                      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase opacity-75">
                        {message.role === "assistant" ? (
                          <Bot size={14} aria-hidden="true" />
                        ) : (
                          <UserRound size={14} aria-hidden="true" />
                        )}
                        {message.role === "assistant" ? "Assistant" : "You"}
                      </div>
                      <p className="whitespace-pre-line text-sm leading-6">
                        {message.content}
                      </p>
                      <p className="mt-2 text-xs opacity-65">
                        {formatTime(message.createdAt)}
                      </p>
                    </article>
                  </div>
                ))}
                {selectedMessages.length === 0 ? (
                  <div className="rounded-[22px] border border-white/55 bg-white/35 p-4 text-sm text-ink/65">
                    This ticket has no conversation yet.
                  </div>
                ) : null}
                {isAssistantThinking ? (
                  <div className="glass-button inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm text-ink/70">
                    <Bot size={16} className="animate-pulse" aria-hidden="true" />
                    Drafting response
                  </div>
                ) : null}
              </div>

              <form
                className="border-t border-white/55 p-5"
                onSubmit={handleAssistantSubmit}
              >
                <div className="flex flex-col gap-3 sm:flex-row">
                  <label className="sr-only" htmlFor="assistant-input">
                    Message
                  </label>
                  <textarea
                    id="assistant-input"
                    rows={2}
                    value={assistantInput}
                    onChange={(event) => setAssistantInput(event.target.value)}
                    placeholder="Ask for triage, a customer reply, escalation notes, or next actions."
                    className="glass-input min-h-14 flex-1 resize-none rounded-[22px] px-4 py-3 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={isAssistantThinking || !selectedTicket}
                    className="inline-flex min-h-14 items-center justify-center gap-2 rounded-[22px] bg-ink px-5 text-sm font-semibold text-white shadow-lg shadow-ink/15 transition hover:bg-sea disabled:cursor-not-allowed disabled:bg-ink/40"
                    title="Send message"
                  >
                    <Send size={18} aria-hidden="true" />
                    Send
                  </button>
                </div>
              </form>
            </section>
          </section>

          <aside className="flex flex-col gap-5">
            <Panel
              eyebrow="Queue"
              title="Ticket list"
              icon={<MessageSquareText size={20} aria-hidden="true" />}
            >
              <label className="relative block">
                <Search
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/45"
                  aria-hidden="true"
                />
                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search queue"
                  className="glass-input w-full rounded-2xl py-2 pl-9 pr-3 text-sm"
                />
              </label>
              <div className="scrollbar-thin mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
                {filteredTickets.map((ticketItem) => (
                  <button
                    key={ticketItem.id}
                    type="button"
                    onClick={() => setSelectedTicketId(ticketItem.id)}
                    className={`w-full rounded-[22px] border p-4 text-left transition ${
                      selectedTicketId === ticketItem.id
                        ? "border-sea/45 bg-sea/10 shadow-lg shadow-sea/10"
                        : "border-white/55 bg-white/38 hover:border-sea/30 hover:bg-white/55"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-semibold leading-5">
                        {ticketItem.subject}
                      </p>
                      <Pill className={priorityStyle(ticketItem.priority)}>
                        {ticketItem.priority}
                      </Pill>
                    </div>
                    <p className="mt-2 text-sm text-ink/58">
                      {ticketItem.customer}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <Pill className={statusStyle(ticketItem.status)}>
                        {ticketItem.status}
                      </Pill>
                      <Pill className={slaStyle(getSlaState(ticketItem))}>
                        {getSlaState(ticketItem)}
                      </Pill>
                    </div>
                  </button>
                ))}
              </div>
            </Panel>

            <Panel
              eyebrow="SLA"
              title="Notifications"
              icon={<Bell size={20} aria-hidden="true" />}
            >
              <div className="space-y-3">
                {slaAlerts.length > 0 ? (
                  slaAlerts.map((ticketItem) => (
                    <div
                      key={ticketItem.id}
                      className="rounded-2xl border border-white/55 bg-white/35 p-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">{ticketItem.subject}</p>
                        <Pill className={slaStyle(getSlaState(ticketItem))}>
                          {getSlaState(ticketItem)}
                        </Pill>
                      </div>
                      <p className="mt-2 text-xs text-ink/58">
                        {getAgentName(demoAgents, ticketItem.assignedAgentId)} · due{" "}
                        {formatTime(ticketItem.slaDueAt)}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="rounded-2xl border border-white/55 bg-white/35 p-3 text-sm text-ink/65">
                    No active SLA breaches or near-term risks.
                  </p>
                )}
              </div>
            </Panel>

            {isAdmin ? (
              <Panel
                eyebrow="Admin"
                title="Teams and agents"
                icon={<UsersRound size={20} aria-hidden="true" />}
              >
                <div className="mb-3 grid grid-cols-2 gap-2">
                  <SegmentButton
                    active={adminView === "teams"}
                    onClick={() => setAdminView("teams")}
                  >
                    Teams
                  </SegmentButton>
                  <SegmentButton
                    active={adminView === "agents"}
                    onClick={() => setAdminView("agents")}
                  >
                    Agents
                  </SegmentButton>
                </div>
                <div className="space-y-3">
                  {adminView === "teams"
                    ? demoTeams.map((team) => (
                        <div
                          key={team.id}
                          className="rounded-2xl border border-white/55 bg-white/35 p-3"
                        >
                          <p className="font-semibold">{team.name}</p>
                          <p className="mt-1 text-sm text-ink/60">{team.focus}</p>
                          <p className="mt-3 text-xs font-semibold uppercase text-sea">
                            {team.lead} · {team.coverage}
                          </p>
                        </div>
                      ))
                    : demoAgents.map((agent) => (
                        <div
                          key={agent.id}
                          className="rounded-2xl border border-white/55 bg-white/35 p-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-semibold">{agent.name}</p>
                              <p className="mt-1 text-xs text-ink/55">
                                {agent.role} · {getTeamName(demoTeams, agent.teamId)}
                              </p>
                            </div>
                            <Pill
                              className={
                                agent.status === "Available"
                                  ? "border-moss/20 bg-moss/10 text-moss"
                                  : agent.status === "Busy"
                                    ? "border-amber/20 bg-amber/10 text-amber"
                                    : "border-ink/15 bg-ink/10 text-ink/60"
                              }
                            >
                              {agent.status}
                            </Pill>
                          </div>
                          <p className="mt-3 text-xs text-ink/55">
                            {countAssignedTickets(tickets, agent.id)} active tickets ·{" "}
                            {agent.capacity}% capacity
                          </p>
                        </div>
                      ))}
                </div>
              </Panel>
            ) : (
              <Panel
                eyebrow="Agent"
                title="My assignment view"
                icon={<UserRound size={20} aria-hidden="true" />}
              >
                <p className="rounded-2xl border border-white/55 bg-white/35 p-3 text-sm leading-6 text-ink/65">
                  Agent view hides team administration and keeps the focus on assigned
                  ticket status, SLA state, and conversation context.
                </p>
              </Panel>
            )}

            <Panel
              eyebrow="Vercel"
              title="Deployment events"
              icon={<Cloud size={20} aria-hidden="true" />}
            >
              <p className="mb-3 text-xs font-semibold uppercase text-ink/45">
                Source: {deploymentSource}
              </p>
              <div className="space-y-3">
                {deployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="rounded-2xl border border-white/55 bg-white/35 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-sm font-semibold">
                        {deployment.project}
                      </p>
                      <Pill className={deploymentStyle(deployment.state)}>
                        {deployment.state}
                      </Pill>
                    </div>
                    <p className="mt-2 truncate text-xs text-ink/55">
                      {deployment.url}
                    </p>
                    <div className="mt-3 flex items-center gap-2 text-xs text-ink/55">
                      <GitBranch size={13} aria-hidden="true" />
                      {deployment.branch} · {deployment.target} ·{" "}
                      {formatTime(deployment.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel
              eyebrow="AI quality"
              title="Evaluation logs"
              icon={<BarChart3 size={20} aria-hidden="true" />}
            >
              <div className="space-y-3">
                {aiEvaluationLogs.slice(0, 4).map((log) => (
                  <div
                    key={log.id}
                    className="rounded-2xl border border-white/55 bg-white/35 p-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold">{log.model}</p>
                      <Pill className={evaluationStyle(log.score)}>
                        {log.score}/100
                      </Pill>
                    </div>
                    <p className="mt-2 text-xs text-ink/55">
                      {log.source} · {log.latencyMs}ms ·{" "}
                      {formatTime(log.createdAt)}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-ink/60">
                      <span>{log.safetyPassed ? "Safe" : "Review"}</span>
                      <span>
                        {log.groundedTicketContext ? "Grounded" : "Weak context"}
                      </span>
                      <span>
                        {log.containsNextSteps ? "Next steps" : "No next steps"}
                      </span>
                      <span>
                        {log.containsCustomerReply ? "Reply draft" : "No reply"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </section>
      </div>
    </main>
  );
}

function Panel({
  eyebrow,
  title,
  icon,
  children
}: {
  eyebrow: string;
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="glass-panel rounded-[28px] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-ink/45">
            {eyebrow}
          </p>
          <h2 className="mt-1 text-lg font-semibold">{title}</h2>
        </div>
        <span className="glass-button flex h-10 w-10 items-center justify-center rounded-2xl text-sea">
          {icon}
        </span>
      </div>
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-ink/76">
      {label}
      {children}
    </label>
  );
}

function SegmentButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-2xl px-3 text-sm font-semibold transition ${
        active
          ? "bg-ink text-white shadow-lg shadow-ink/15"
          : "glass-button text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function StatusBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span className="glass-button inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-3 text-sm font-semibold text-ink">
      {icon}
      {label}
    </span>
  );
}

function MetricCard({
  icon,
  label,
  value,
  tone
}: {
  icon: ReactNode;
  label: string;
  value: string;
  tone: "sea" | "coral" | "amber" | "moss";
}) {
  const toneClass = {
    sea: "bg-sea/10 text-sea",
    coral: "bg-coral/10 text-coral",
    amber: "bg-amber/10 text-amber",
    moss: "bg-moss/10 text-moss"
  }[tone];

  return (
    <article className="glass-panel rounded-[24px] p-4">
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}
        >
          {icon}
        </span>
        <span className="text-3xl font-semibold">{value}</span>
      </div>
      <p className="mt-3 text-sm font-semibold text-ink/58">{label}</p>
    </article>
  );
}

function Pill({
  children,
  className
}: {
  children: ReactNode;
  className: string;
}) {
  return (
    <span
      className={`inline-flex min-h-7 items-center rounded-xl border px-2.5 py-1 text-xs font-semibold ${className}`}
    >
      {children}
    </span>
  );
}

function SnapshotRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-white/55 bg-white/35 p-3">
      <span className="text-sm font-medium text-ink/58">{label}</span>
      <span className="max-w-[190px] text-right text-sm font-semibold text-ink">
        {value}
      </span>
    </div>
  );
}
