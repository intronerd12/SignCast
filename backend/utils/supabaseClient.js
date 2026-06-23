const { createClient } = require("@supabase/supabase-js");

const required = ["SUPABASE_URL", "SUPABASE_SECRET_KEY"];
const publicRequired = ["SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"];

const getMissingSupabaseEnv = () =>
  required.filter((name) => !process.env[name] || !String(process.env[name]).trim());

const ensureSupabaseEnv = () => {
  const missing = getMissingSupabaseEnv();
  if (missing.length > 0) {
    throw new Error(`Missing Supabase env vars: ${missing.join(", ")}`);
  }
};

const createSupabaseAdminClient = () => {
  ensureSupabaseEnv();
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const getMissingSupabasePublicEnv = () =>
  publicRequired.filter((name) => !process.env[name] || !String(process.env[name]).trim());

const ensureSupabasePublicEnv = () => {
  const missing = getMissingSupabasePublicEnv();
  if (missing.length > 0) {
    throw new Error(`Missing Supabase public env vars: ${missing.join(", ")}`);
  }
};

const createSupabasePublicClient = () => {
  ensureSupabasePublicEnv();
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

const verifySupabaseConnection = async () => {
  try {
    const client = createSupabaseAdminClient();
    const { error } = await client.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      return { ok: false, error: error.message };
    }
    return { ok: true, error: null };
  } catch (error) {
    return { ok: false, error: error.message };
  }
};

const verifySupabaseTables = async () => {
  try {
    const client = createSupabaseAdminClient();
    const checks = [
      { table: "user_profiles", query: client.from("user_profiles").select("id").limit(1) },
      { table: "app_events", query: client.from("app_events").select("id").limit(1) },
    ];

    const results = [];
    for (const check of checks) {
      const { error } = await check.query;
      results.push({
        table: check.table,
        ok: !error,
        error: error ? error.message : null,
      });
    }

    const ok = results.every((item) => item.ok);
    return { ok, results };
  } catch (error) {
    return {
      ok: false,
      results: [
        {
          table: "unknown",
          ok: false,
          error: error.message,
        },
      ],
    };
  }
};

module.exports = {
  createSupabaseAdminClient,
  createSupabasePublicClient,
  getMissingSupabaseEnv,
  getMissingSupabasePublicEnv,
  verifySupabaseConnection,
  verifySupabaseTables,
};