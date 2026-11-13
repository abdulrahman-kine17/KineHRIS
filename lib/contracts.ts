// Contract status flow: draft -> signed_by_employee -> countersigned -> filed.
import type { Tone } from "@/components/ui";
import { CONTRACT_STATUSES, type ContractStatus } from "./constants";

export const CONTRACT_TONE: Record<string, Tone> = {
  draft: "neutral",
  signed_by_employee: "warning",
  countersigned: "accent",
  filed: "success",
};

export const NEXT_STEP: Record<string, string> = {
  draft: "Waiting for employee signature",
  signed_by_employee: "Waiting for countersignature",
  countersigned: "Waiting to be filed",
  filed: "Complete",
};

export const ADVANCE_LABEL: Record<string, string> = {
  draft: "Mark signed by employee",
  signed_by_employee: "Mark countersigned",
  countersigned: "Mark filed",
};

export function nextStatus(status: string): ContractStatus | null {
  const i = CONTRACT_STATUSES.indexOf(status as ContractStatus);
  return i >= 0 && i < CONTRACT_STATUSES.length - 1 ? CONTRACT_STATUSES[i + 1] : null;
}

/** Statuses that are waiting on someone's signature. */
export const AWAITING_SIGNATURE = ["draft", "signed_by_employee"] as const;
