import type { FormState } from "@/app/actions";
import { cx } from "@/lib/cx";

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  const success = state.status === "success";
  return (
    <p
      role="status"
      aria-live="polite"
      className={cx("text-sm font-medium", success ? "text-positive" : "text-negative")}
    >
      {success ? "Saved. " : ""}
      {state.message}
    </p>
  );
}
