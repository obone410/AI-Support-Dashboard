import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SupportDashboard } from "./support-dashboard";

describe("SupportDashboard ticket flow", () => {
  it("creates a ticket with assignment and a per-ticket conversation thread", async () => {
    const user = userEvent.setup();
    render(<SupportDashboard />);

    await user.type(screen.getByLabelText("Subject"), "API latency spike");
    await user.type(screen.getByLabelText("Customer"), "Tempo Labs");
    await user.type(screen.getByLabelText("Email"), "ops@tempo.example");
    await user.selectOptions(screen.getByLabelText("Priority"), "Urgent");
    await user.type(
      screen.getByLabelText("Description"),
      "Customer reports intermittent 504s on the billing API."
    );
    await user.click(screen.getByRole("button", { name: "Create ticket" }));

    await waitFor(() => {
      expect(screen.getAllByText("API latency spike").length).toBeGreaterThan(0);
    });

    expect(screen.getByText(/New ticket thread created/i)).toBeInTheDocument();
    expect(screen.getAllByText("Breached").length).toBeGreaterThan(0);
  });
});
