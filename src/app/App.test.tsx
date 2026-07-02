import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  it("supports the manual reference calculation", async () => {
    render(<App />);
    await waitFor(() =>
      expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument(),
    );

    fireEvent.change(screen.getByLabelText(/Weight.*kg/i), {
      target: { value: "80" },
    });
    fireEvent.change(screen.getByLabelText(/Expected finishing time/i), {
      target: { value: "10:00" },
    });
    fireEvent.blur(screen.getByLabelText(/Expected finishing time/i));
    fireEvent.change(screen.getByLabelText(/Distance.*km/i), {
      target: { value: "10" },
    });
    fireEvent.change(screen.getByLabelText(/Elevation gain.*m/i), {
      target: { value: "1000" },
    });
    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "de" },
    });

    await waitFor(() => {
      expect(screen.getAllByText("1.600").length).toBeGreaterThan(0);
      expect(screen.getAllByText("480").length).toBeGreaterThan(0);
      expect(screen.getAllByText("120").length).toBeGreaterThan(0);
      expect(screen.getAllByText("1,5").length).toBeGreaterThan(0);
      expect(screen.getAllByText("750").length).toBeGreaterThan(0);
    });
  });

  it("switches language without losing the race name", async () => {
    render(<App />);
    const raceName = await screen.findByLabelText("Race name");
    fireEvent.change(raceName, { target: { value: "Alpine 100" } });
    fireEvent.change(screen.getByLabelText("Language"), {
      target: { value: "de" },
    });
    expect(screen.getByLabelText("Rennname")).toHaveValue("Alpine 100");
  });
});
