import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

const variants = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-strong",
  secondary: "border border-border bg-surface text-foreground hover:bg-background",
  ghost: "text-muted hover:text-foreground",
  danger: "bg-negative text-white hover:bg-negative/90",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({ variant = "primary", className, type = "submit", ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx(
        "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-60",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

const linkVariants = {
  primary: "bg-accent text-accent-contrast hover:bg-accent-strong",
  secondary: "border border-border bg-surface text-foreground hover:bg-background",
} as const;

export function LinkButton({
  variant = "secondary",
  className,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant?: keyof typeof linkVariants;
}) {
  return (
    <a
      className={cx(
        "inline-flex h-9 items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        linkVariants[variant],
        className,
      )}
      {...props}
    />
  );
}
