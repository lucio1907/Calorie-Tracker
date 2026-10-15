#!/usr/bin/env node
/**
 * Creates the app's owner account through the Supabase Auth admin API.
 *
 * Public sign-ups are disabled (supabase/config.toml), so this is the only way
 * to create a user. It needs the service role / secret key, which must never be
 * exposed to the browser: keep it in SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix).
 *
 * Usage:
 *   npm run user:create -- --email owner@local.test [--password '...']
 *
 * Environment (read from the shell or .env.local):
 *   SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL  API URL, e.g. http://127.0.0.1:54321
 *   SUPABASE_SERVICE_ROLE_KEY                 local: the "Secret" key from `npx supabase status`
 *
 * When --password is omitted, a random password is generated and printed once.
 */
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { createClient } from "@supabase/supabase-js";

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{12,}$/;

function generatePassword() {
  for (;;) {
    const candidate = randomBytes(18).toString("base64url");
    if (PASSWORD_RULE.test(candidate)) return candidate;
  }
}

function fail(message) {
  console.error(`create-user: ${message}`);
  process.exit(1);
}

const { values } = parseArgs({
  options: {
    email: { type: "string" },
    password: { type: "string" },
  },
});

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url) fail("set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL).");
if (!serviceRoleKey) fail("set SUPABASE_SERVICE_ROLE_KEY.");
if (!values.email) fail("pass --email <address>.");

const generated = values.password === undefined;
const password = values.password ?? generatePassword();

if (!PASSWORD_RULE.test(password)) {
  fail("password needs 12+ characters with lowercase, uppercase and a digit.");
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email: values.email,
  password,
  email_confirm: true,
});

if (error) fail(error.message);

console.log(`Created user ${data.user.email} (${data.user.id}).`);
if (generated) console.log(`Generated password: ${password}`);
