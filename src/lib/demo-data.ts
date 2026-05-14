import type {
  AiEvaluationLog,
  ChatMessage,
  ConversationThreads,
  DeploymentEvent,
  SupportAgent,
  SupportTeam,
  SupportTicket,
  UserProfile
} from "@/lib/types";

export const demoUser: UserProfile = {
  id: "demo-admin",
  name: "Portfolio Admin",
  email: "admin@example.com",
  role: "admin",
  team: "Customer Operations"
};

export const demoTickets: SupportTicket[] = [
  {
    id: "tkt-1007",
    subject: "Unable to access billing invoice",
    customer: "Amina Cole",
    email: "amina.cole@example.com",
    category: "Billing",
    priority: "High",
    status: "In Review",
    description:
      "Customer cannot download the April invoice and needs it for finance close today.",
    assignedAgentId: "agent-maya",
    teamId: "team-revenue",
    slaDueAt: "2026-05-14T10:25:00.000Z",
    createdAt: "2026-05-14T08:25:00.000Z",
    updatedAt: "2026-05-14T09:10:00.000Z",
    sentiment: "At Risk"
  },
  {
    id: "tkt-1006",
    subject: "Workspace invite link expired",
    customer: "Jon Bell",
    email: "jon.bell@example.com",
    category: "Account Access",
    priority: "Medium",
    status: "Waiting",
    description:
      "A teammate cannot join the workspace because the original invitation expired.",
    assignedAgentId: "agent-jonah",
    teamId: "team-access",
    slaDueAt: "2026-05-14T20:40:00.000Z",
    createdAt: "2026-05-13T16:40:00.000Z",
    updatedAt: "2026-05-14T07:15:00.000Z",
    sentiment: "Neutral"
  },
  {
    id: "tkt-1005",
    subject: "Webhook retries are duplicating events",
    customer: "Nora Systems",
    email: "ops@norasystems.example",
    category: "Bug",
    priority: "Urgent",
    status: "Open",
    description:
      "Production webhook events are being processed twice when retry attempts overlap with slow acknowledgements.",
    assignedAgentId: "agent-ife",
    teamId: "team-platform",
    slaDueAt: "2026-05-14T06:20:00.000Z",
    createdAt: "2026-05-14T06:05:00.000Z",
    updatedAt: "2026-05-14T06:05:00.000Z",
    sentiment: "Frustrated"
  }
];

export const demoTeams: SupportTeam[] = [
  {
    id: "team-platform",
    name: "Platform Response",
    focus: "Bugs, webhooks, API incidents",
    lead: "Ife Morgan",
    coverage: "24/7 critical"
  },
  {
    id: "team-revenue",
    name: "Revenue Support",
    focus: "Billing, invoices, payment issues",
    lead: "Maya Chen",
    coverage: "Business hours"
  },
  {
    id: "team-access",
    name: "Access Desk",
    focus: "Login, invites, workspace permissions",
    lead: "Jonah Price",
    coverage: "18h weekdays"
  }
];

export const demoAgents: SupportAgent[] = [
  {
    id: "agent-ife",
    name: "Ife Morgan",
    email: "ife.morgan@example.com",
    role: "Lead",
    teamId: "team-platform",
    status: "Busy",
    capacity: 82
  },
  {
    id: "agent-maya",
    name: "Maya Chen",
    email: "maya.chen@example.com",
    role: "Billing",
    teamId: "team-revenue",
    status: "Available",
    capacity: 54
  },
  {
    id: "agent-jonah",
    name: "Jonah Price",
    email: "jonah.price@example.com",
    role: "Tier 2",
    teamId: "team-access",
    status: "Available",
    capacity: 46
  },
  {
    id: "agent-nadia",
    name: "Nadia Fox",
    email: "nadia.fox@example.com",
    role: "AI Ops",
    teamId: "team-platform",
    status: "Offline",
    capacity: 0
  }
];

export const demoMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "assistant",
    content:
      "I am ready to help triage the active queue. Choose a ticket or describe the support issue you want to analyze.",
    createdAt: "2026-05-14T09:00:00.000Z"
  }
];

export const demoConversationThreads: ConversationThreads = {
  "tkt-1007": demoMessages,
  "tkt-1006": [
    {
      id: "msg-1006-1",
      role: "assistant",
      content:
        "This looks like an account-access issue. Confirm whether the invite is expired or blocked by workspace policy before resending.",
      createdAt: "2026-05-14T07:20:00.000Z"
    }
  ],
  "tkt-1005": [
    {
      id: "msg-1005-1",
      role: "assistant",
      content:
        "Urgent bug signal detected. Escalate to Platform Response and collect request IDs, webhook event IDs, and retry timestamps.",
      createdAt: "2026-05-14T06:08:00.000Z"
    }
  ]
};

export const demoDeployments: DeploymentEvent[] = [
  {
    id: "dpl-demo-1",
    project: "ai-support-dashboard",
    url: "ai-support-dashboard.vercel.app",
    target: "production",
    state: "READY",
    branch: "main",
    creator: "Portfolio Admin",
    createdAt: "2026-05-14T18:42:00.000Z"
  },
  {
    id: "dpl-demo-2",
    project: "ai-support-dashboard",
    url: "ai-support-dashboard-git-glass-ui.vercel.app",
    target: "preview",
    state: "BUILDING",
    branch: "glass-ui",
    creator: "Portfolio Admin",
    createdAt: "2026-05-14T18:10:00.000Z"
  },
  {
    id: "dpl-demo-3",
    project: "ai-support-dashboard",
    url: "ai-support-dashboard-git-security-pass.vercel.app",
    target: "preview",
    state: "READY",
    branch: "security-pass",
    creator: "Portfolio Admin",
    createdAt: "2026-05-13T21:30:00.000Z"
  }
];

export const demoAiEvaluationLogs: AiEvaluationLog[] = [
  {
    id: "eval-demo-1",
    requestId: "req-demo-1007",
    ticketId: "tkt-1007",
    source: "openai",
    model: "gpt-4o-mini",
    score: 92,
    latencyMs: 1180,
    promptMessageCount: 3,
    promptCharCount: 1420,
    responseCharCount: 860,
    safetyPassed: true,
    groundedTicketContext: true,
    containsNextSteps: true,
    containsCustomerReply: true,
    notes:
      "Grounded in the active billing ticket, included escalation timing, investigation steps, and a customer-safe reply.",
    createdAt: "2026-05-14T18:46:00.000Z"
  },
  {
    id: "eval-demo-2",
    requestId: "req-demo-1005",
    ticketId: "tkt-1005",
    source: "openai",
    model: "gpt-4o-mini",
    score: 88,
    latencyMs: 1345,
    promptMessageCount: 4,
    promptCharCount: 1680,
    responseCharCount: 790,
    safetyPassed: true,
    groundedTicketContext: true,
    containsNextSteps: true,
    containsCustomerReply: false,
    notes:
      "Strong incident triage with concrete webhook evidence requests; response draft was intentionally deferred for engineering confirmation.",
    createdAt: "2026-05-14T18:20:00.000Z"
  }
];
