export type UserRole = "admin" | "agent" | "customer";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  team: string;
};

export type SupportTeam = {
  id: string;
  name: string;
  focus: string;
  lead: string;
  coverage: string;
};

export type SupportAgent = {
  id: string;
  name: string;
  email: string;
  role: "Lead" | "Tier 2" | "AI Ops" | "Billing";
  teamId: string;
  status: "Available" | "Busy" | "Offline";
  capacity: number;
};

export type TicketPriority = "Low" | "Medium" | "High" | "Urgent";

export type TicketStatus = "Open" | "In Review" | "Waiting" | "Resolved";

export type TicketCategory =
  | "Billing"
  | "Bug"
  | "Account Access"
  | "Feature Request"
  | "Technical Question";

export type SupportTicket = {
  id: string;
  subject: string;
  customer: string;
  email: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  assignedAgentId: string;
  teamId: string;
  slaDueAt: string;
  createdAt: string;
  updatedAt: string;
  sentiment: "Positive" | "Neutral" | "Frustrated" | "At Risk";
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type ConversationThreads = Record<string, ChatMessage[]>;

export type DeploymentEvent = {
  id: string;
  project: string;
  url: string;
  target: "production" | "preview" | "development";
  state: "READY" | "BUILDING" | "ERROR" | "CANCELED" | "QUEUED";
  branch: string;
  creator: string;
  createdAt: string;
};

export type AiEvaluationLog = {
  id: string;
  requestId: string;
  ticketId?: string;
  source: "demo" | "openai";
  model: string;
  score: number;
  latencyMs: number;
  promptMessageCount: number;
  promptCharCount: number;
  responseCharCount: number;
  safetyPassed: boolean;
  groundedTicketContext: boolean;
  containsNextSteps: boolean;
  containsCustomerReply: boolean;
  notes: string;
  createdAt: string;
};
