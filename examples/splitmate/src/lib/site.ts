/** Site-wide facts, in one place. */
export const site = {
  name: "Splitmate",
  tagline: "Split shared costs and see who owes whom.",
  description:
    "Splitmate keeps a group's shared expenses, shows each person's balance, and works out the fewest payments that settle the group.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;
