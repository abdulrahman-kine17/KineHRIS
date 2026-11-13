import { EmptyState, LinkButton } from "@/components/ui";

/** Rendered by a page when the signed-in person may not see it. */
export function Forbidden({ what = "this page" }: { what?: string }) {
  return (
    <EmptyState
      title="No access"
      description={`Your role does not include ${what}. Switch user from the sidebar if you are testing another role.`}
      action={<LinkButton href="/">Back to home</LinkButton>}
    />
  );
}
