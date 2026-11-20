import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">We couldn&apos;t find that group</h1>
      <p className="text-sm text-muted">
        The link may be old, or the group was never created. Nothing was changed.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 items-center justify-center rounded-full bg-accent px-4 text-sm font-medium text-accent-contrast hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Go to all groups
      </Link>
    </div>
  );
}
