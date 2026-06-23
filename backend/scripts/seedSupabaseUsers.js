require("dotenv").config();

const { createSupabaseAdminClient } = require("../utils/supabaseClient");

const EXAMPLE_USERS = [
  {
    email: "admin@signcast.com",
    password: "Admin123",
    isAdmin: true,
    name: "SignCast Admin",
    phone: "09000000001",
  },
  {
    email: "user@signcast.com",
    password: "User123",
    isAdmin: false,
    name: "SignCast User",
    phone: "09000000002",
  },
];

const findUserByEmail = async (client, email) => {
  let page = 1;

  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      throw new Error(`Unable to list Supabase users: ${error.message}`);
    }

    const users = data?.users || [];
    const existing = users.find((item) => (item.email || "").toLowerCase() === email.toLowerCase());
    if (existing) {
      return existing;
    }

    if (users.length < 200) {
      return null;
    }

    page += 1;
  }
};

const upsertExampleUser = async (client, account) => {
  const existing = await findUserByEmail(client, account.email);

  if (existing) {
    const { error } = await client.auth.admin.updateUserById(existing.id, {
      password: account.password,
      email_confirm: true,
      app_metadata: { isAdmin: account.isAdmin },
      user_metadata: {
        name: account.name,
        phone: account.phone,
      },
    });

    if (error) {
      throw new Error(`Failed to update ${account.email}: ${error.message}`);
    }

    return { action: "updated", id: existing.id };
  }

  const { data, error } = await client.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    app_metadata: { isAdmin: account.isAdmin },
    user_metadata: {
      name: account.name,
      phone: account.phone,
    },
  });

  if (error) {
    throw new Error(`Failed to create ${account.email}: ${error.message}`);
  }

  return { action: "created", id: data.user?.id || "" };
};

const run = async () => {
  const client = createSupabaseAdminClient();

  for (const account of EXAMPLE_USERS) {
    const result = await upsertExampleUser(client, account);
    console.log(`[${result.action}] ${account.email} (${account.isAdmin ? "admin" : "user"})`);
  }

  console.log("Example Supabase accounts are ready.");
};

run().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});