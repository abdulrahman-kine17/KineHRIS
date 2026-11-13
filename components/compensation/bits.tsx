import { Segmented } from "@/components/ui";

export const COMP_TABS = [
  { href: "/compensation", label: "Salaries" },
  { href: "/compensation/benefits", label: "Benefits" },
  { href: "/compensation/payroll", label: "Payroll sheet" },
];

export function CompTabs({ active }: { active: string }) {
  return <Segmented items={COMP_TABS} active={active} />;
}
