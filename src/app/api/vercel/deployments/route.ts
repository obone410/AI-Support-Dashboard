import { NextResponse } from "next/server";
import { demoDeployments } from "@/lib/demo-data";
import { normalizeDeploymentState } from "@/lib/operations";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import type { DeploymentEvent } from "@/lib/types";

export const runtime = "nodejs";

const deploymentCacheHeaders = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300"
};

type VercelDeployment = {
  uid?: string;
  id?: string;
  name?: string;
  url?: string;
  target?: "production" | "preview" | "development";
  state?: string;
  createdAt?: number;
  creator?: {
    username?: string;
    email?: string;
  };
  meta?: {
    githubCommitRef?: string;
    gitlabCommitRef?: string;
    bitbucketCommitRef?: string;
  };
};

export async function GET(request: Request) {
  const limit = rateLimit(`vercel-deployments:${getClientIp(request)}`, {
    limit: 120,
    windowMs: 60_000
  });
  const headers = {
    ...deploymentCacheHeaders,
    ...limit.headers
  };

  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many deployment monitoring requests. Please retry shortly." },
      {
        status: 429,
        headers: {
          "Cache-Control": "no-store, max-age=0",
          ...limit.headers,
          "Retry-After": String(limit.retryAfter)
        }
      }
    );
  }

  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  const teamId = process.env.VERCEL_TEAM_ID;

  if (!token || !projectId) {
    return NextResponse.json(
      {
        source: "demo",
        deployments: demoDeployments
      },
      { headers }
    );
  }

  const params = new URLSearchParams({
    projectId,
    limit: "5"
  });

  if (teamId) params.set("teamId", teamId);

  try {
    const response = await fetch(
      `https://api.vercel.com/v6/deployments?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
        next: { revalidate: 60 }
      }
    );

    if (!response.ok) {
      throw new Error(`Vercel API returned ${response.status}`);
    }

    const data = (await response.json()) as {
      deployments?: VercelDeployment[];
    };

    const deployments: DeploymentEvent[] = (data.deployments ?? []).map(
      (deployment) => ({
        id: deployment.uid ?? deployment.id ?? deployment.url ?? "deployment",
        project: deployment.name ?? "Vercel project",
        url: deployment.url ?? "",
        target: deployment.target ?? "preview",
        state: normalizeDeploymentState(deployment.state ?? "QUEUED"),
        branch:
          deployment.meta?.githubCommitRef ??
          deployment.meta?.gitlabCommitRef ??
          deployment.meta?.bitbucketCommitRef ??
          "unknown",
        creator:
          deployment.creator?.username ??
          deployment.creator?.email ??
          "Vercel",
        createdAt: deployment.createdAt
          ? new Date(deployment.createdAt).toISOString()
          : new Date().toISOString()
      })
    );

    return NextResponse.json(
      {
        source: "vercel",
        deployments
      },
      { headers }
    );
  } catch (error) {
    console.error("Vercel deployment fetch failed", error);
    return NextResponse.json(
      {
        source: "demo",
        deployments: demoDeployments,
        warning: "Unable to load Vercel deployments. Showing demo data."
      },
      { status: 200, headers }
    );
  }
}
