// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { BalanceBoard, TransferList } from "@/components/group/balances";

afterEach(cleanup);

const names = new Map([
  ["ana", "Ana"],
  ["ben", "Ben"],
]);

describe("BalanceBoard", () => {
  it("reads each balance as a sentence with the group's currency", () => {
    render(
      <BalanceBoard
        balances={[
          { memberId: "ana", netCents: 1000 },
          { memberId: "ben", netCents: -1000 },
        ]}
        memberNames={names}
        currency="EUR"
        totalCents={2000}
      />,
    );

    expect(screen.getByText("Ana is owed €10.00")).toBeInTheDocument();
    expect(screen.getByText("Ben owes €10.00")).toBeInTheDocument();
    expect(screen.getByText("Total spent")).toBeInTheDocument();
    expect(screen.getByText("Balances add up to")).toBeInTheDocument();
    expect(screen.getAllByText("€0.00")).toHaveLength(1);
  });

  it("tells the owner what to do when there is nobody yet", () => {
    render(
      <BalanceBoard
        balances={[]}
        memberNames={new Map()}
        currency="EUR"
        totalCents={0}
      />,
    );
    expect(screen.getByText(/Add the people who share costs/)).toBeInTheDocument();
  });
});

describe("TransferList", () => {
  it("shows one payment per row, with a way to record it", () => {
    render(
      <TransferList
        transfers={[{ fromMember: "ben", toMember: "ana", amountCents: 1000 }]}
        memberNames={names}
        currency="EUR"
        groupId="group-1"
      />,
    );

    expect(screen.getByText("Ben")).toBeInTheDocument();
    expect(screen.getByText("pays")).toBeInTheDocument();
    expect(screen.getByText("Ana")).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /Record that Ben paid Ana €10\.00/ });
    expect(link).toHaveAttribute(
      "href",
      "/groups/group-1?from=ben&to=ana&amount=10.00#record-payment",
    );
  });

  it("says so when there is nothing to pay", () => {
    render(
      <TransferList transfers={[]} memberNames={names} currency="EUR" groupId="group-1" />,
    );
    expect(screen.getByText(/Everyone is settled up/)).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});
