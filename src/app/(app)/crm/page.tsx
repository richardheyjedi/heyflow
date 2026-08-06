import { CrmBoard } from "@/components/crm/crm-board";
import { getLeads } from "@/lib/data/leads";

export default async function CrmPage() {
  const leads = await getLeads();
  return <CrmBoard leads={leads} />;
}
