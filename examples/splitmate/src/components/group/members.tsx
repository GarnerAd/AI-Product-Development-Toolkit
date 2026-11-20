import { EmptyState } from "@/components/ui/card";
import type { Member } from "@/lib/types";

import { RemoveMemberForm } from "../forms/remove-member-form";

export function MemberList({ groupId, members }: { groupId: string; members: Member[] }) {
  if (members.length === 0) {
    return <EmptyState>No people yet. Add someone below and they can share costs.</EmptyState>;
  }

  return (
    <ul className="divide-y divide-border">
      {members.map((member) => (
        <li key={member.id} className="flex flex-wrap items-start justify-between gap-2 py-2">
          <span className="text-sm">{member.name}</span>
          <RemoveMemberForm groupId={groupId} memberId={member.id} name={member.name} />
        </li>
      ))}
    </ul>
  );
}
