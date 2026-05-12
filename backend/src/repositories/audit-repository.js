import { getSupabaseClient } from "../supabase.js";

async function insertIfClient(table, payload) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from(table).insert(payload);
  if (error) {
    throw new Error(`Audit write failed for ${table}`);
  }
}

async function saveApprovalAudit(payload) {
  await insertIfClient("scholarship_approvals", payload);
}

async function saveReleaseAudit(payload) {
  await insertIfClient("scholarship_releases", payload);
}

export { saveApprovalAudit, saveReleaseAudit };
