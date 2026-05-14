import type {
  DeploymentEvent,
  SupportAgent,
  SupportTeam,
  SupportTicket,
  TicketPriority
} from "@/lib/types";

const SLA_HOURS: Record<TicketPriority, number> = {
  Urgent: 0.25,
  High: 2,
  Medium: 8,
  Low: 24
};

export function calculateSlaDueAt(createdAt: string, priority: TicketPriority) {
  const created = new Date(createdAt);
  const due = new Date(created.getTime() + SLA_HOURS[priority] * 60 * 60 * 1000);
  return due.toISOString();
}

export function getSlaState(
  ticket: SupportTicket,
  now: Date = new Date()
): "Resolved" | "Breached" | "Due Soon" | "Healthy" {
  if (ticket.status === "Resolved") return "Resolved";

  const dueAt = new Date(ticket.slaDueAt);
  const minutesRemaining = (dueAt.getTime() - now.getTime()) / 60000;

  if (minutesRemaining < 0) return "Breached";
  if (minutesRemaining <= 60) return "Due Soon";
  return "Healthy";
}

export function getAgentName(agents: SupportAgent[], agentId: string) {
  return agents.find((agent) => agent.id === agentId)?.name ?? "Unassigned";
}

export function getTeamName(teams: SupportTeam[], teamId: string) {
  return teams.find((team) => team.id === teamId)?.name ?? "Unassigned";
}

export function countAssignedTickets(tickets: SupportTicket[], agentId: string) {
  return tickets.filter(
    (ticket) =>
      ticket.assignedAgentId === agentId && ticket.status !== "Resolved"
  ).length;
}

export function normalizeDeploymentState(state: string): DeploymentEvent["state"] {
  if (state === "READY") return "READY";
  if (state === "BUILDING") return "BUILDING";
  if (state === "ERROR") return "ERROR";
  if (state === "CANCELED") return "CANCELED";
  if (state === "QUEUED") return "QUEUED";
  return "QUEUED";
}
