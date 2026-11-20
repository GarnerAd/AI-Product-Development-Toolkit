import type { Metadata } from "next";
import Link from "next/link";

import { CreateGroupForm } from "@/components/forms/create-group-form";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { getRepository } from "@/lib/db/repository";
import { DEFAULT_CURRENCY, formatCents } from "@/lib/domain/money";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Groups",
};

export default function GroupsPage() {
  const groups = getRepository().listGroups();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Who owes whom, without the spreadsheet.
        </h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted sm:text-base">
          Create a group for your flat, trip or team. Add the people in it, record what
          each person paid, and Splitmate keeps the balances and the settling up.
        </p>
      </div>

      <Card
        title="Start a group"
        description="A name and a currency. You can add people right after."
      >
        <CreateGroupForm defaultCurrency={DEFAULT_CURRENCY} />
      </Card>

      <section aria-label="Your groups" className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
          Your groups
        </h2>

        {groups.length === 0 ? (
          <EmptyState>
            No groups yet. Create one above: a flat, a trip, or a shared project.
          </EmptyState>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {groups.map((group) => (
              <li key={group.id}>
                <Link
                  href={`/groups/${group.id}`}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 shadow-[0_1px_2px_rgba(23,23,20,0.04)] transition-colors hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold tracking-tight">{group.name}</h3>
                    <Badge>{group.currency}</Badge>
                  </div>
                  <p className="text-sm text-muted">
                    {group.memberCount === 1
                      ? "1 person"
                      : `${group.memberCount} people`}{" "}
                    ·{" "}
                    {group.expenseCount === 1
                      ? "1 expense"
                      : `${group.expenseCount} expenses`}
                  </p>
                  <p className="mt-auto text-sm">
                    <span className="text-muted">Total spent </span>
                    <span className="font-semibold tabular-nums">
                      {formatCents(group.totalCents, group.currency)}
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
