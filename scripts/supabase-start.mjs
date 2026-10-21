#!/usr/bin/env node
/**
 * Starts the local Supabase stack with its ports published on 127.0.0.1 only.
 *
 * By default Docker publishes the stack's host ports (API, Postgres, Studio,
 * Mailpit, analytics) on every interface, so any peer on the same network can
 * reach Studio and Mailpit (no auth) and Postgres (default credentials). The
 * Supabase docs fix this with a Docker network whose default host binding is
 * 127.0.0.1, passed to `supabase start --network-id`:
 * https://supabase.com/docs/guides/local-development (Quickstart)
 *
 * The network uses the CLI's own default name (supabase_network_<project_id>),
 * so commands that start containers without --network-id (`supabase test db`,
 * `supabase db reset`) join the same network. `supabase stop` leaves it in place.
 *
 * Usage:
 *   npm run db:start [-- -x studio,mailpit]   extra arguments go to `supabase start`
 */
import { execFileSync, spawnSync } from "node:child_process";

// supabase/config.toml project_id = "contador-calorias".
const NETWORK = "supabase_network_contador-calorias";
const BINDING_OPTION = "com.docker.network.bridge.host_binding_ipv4";

function fail(message) {
  console.error(`supabase-start: ${message}`);
  process.exit(1);
}

function networkBinding() {
  try {
    const options = execFileSync("docker", ["network", "inspect", NETWORK, "--format", "{{json .Options}}"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return JSON.parse(options)?.[BINDING_OPTION] ?? "";
  } catch {
    return null; // No such network.
  }
}

const binding = networkBinding();
if (binding === null) {
  execFileSync("docker", ["network", "create", "-o", `${BINDING_OPTION}=127.0.0.1`, NETWORK], { stdio: "ignore" });
} else if (binding !== "127.0.0.1") {
  // A plain `supabase start` created it (bound to every interface); the CLI removes it on stop.
  fail(`network ${NETWORK} is not loopback-only. Run \`npx supabase stop\`, then try again.`);
}

const result = spawnSync("npx", ["supabase", "start", "--network-id", NETWORK, ...process.argv.slice(2)], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
