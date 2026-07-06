import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { App } from "./App";

describe("App", () => {
  afterEach(() => {
    cleanup();
  });

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

  it("opens the nutrition catalogue and adds a custom option", async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nutrition options" }),
    );
    expect(
      await screen.findByRole("heading", { name: "Nutrition options" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Mynstry Gel 40")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Add option/ }));
    fireEvent.change(screen.getByLabelText("Brand"), {
      target: { value: "Homemade" },
    });
    fireEvent.change(screen.getByLabelText("Name"), {
      target: { value: "Rice cake" },
    });
    fireEvent.change(screen.getByLabelText("Carbohydrates (g)"), {
      target: { value: "30" },
    });
    fireEvent.change(screen.getByLabelText("Sodium (mg)"), {
      target: { value: "150" },
    });
    fireEvent.change(screen.getByLabelText("Water (L)"), {
      target: { value: "0.0" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Rice cake")).toBeInTheDocument();
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Nutrition option added.",
    );
  });

  it("filters the nutrition catalogue by brand", async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole("button", { name: "Nutrition options" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Nutrition options" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Filter by brand"), {
      target: { value: "Mynstry" },
    });

    expect(screen.getByText("Mynstry Gel 40")).toBeInTheDocument();
    expect(screen.queryByText("Water")).not.toBeInTheDocument();
  });

  it("adds whole servings directly to a calculated segment", async () => {
    render(<App />);
    fireEvent.change(await screen.findByLabelText(/Weight.*kg/i), {
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

    expect(
      await screen.findByRole("heading", { name: "Nutrition planning" }),
    ).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Add nutrition option"), {
      target: { value: "standard:mynstry:mynstry%20gel%2040" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Add$/ }));
    expect(screen.getByLabelText("Servings")).toHaveValue(1);
    fireEvent.change(screen.getByLabelText("Servings"), {
      target: { value: "3" },
    });
    expect(screen.getByRole("cell", { name: "3" })).toBeInTheDocument();
  });
});
