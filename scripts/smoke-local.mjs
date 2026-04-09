const baseUrl = process.argv[2] || "http://localhost:3000";

const routes = [
  { path: "/", expect: 200 },
  { path: "/plans", expect: 200 },
  { path: "/support", expect: 200 },
  { path: "/privacy", expect: 200 },
  { path: "/terms", expect: 200 },
  { path: "/login", expect: 200 },
  { path: "/player", expect: 307 },
  { path: "/player/workout", expect: 307 },
  { path: "/admin", expect: 307 },
];

async function checkRoute({ path, expect }) {
  const response = await fetch(`${baseUrl}${path}`, { redirect: "manual" });
  return {
    path,
    status: response.status,
    location: response.headers.get("location"),
    ok: response.status === expect,
    expect,
  };
}

const results = await Promise.all(routes.map(checkRoute));
const failed = results.filter((result) => !result.ok);

for (const result of results) {
  const suffix = result.location ? ` -> ${result.location}` : "";
  console.log(`${result.ok ? "PASS" : "FAIL"} ${result.path} (${result.status}, expected ${result.expect})${suffix}`);
}

if (failed.length) {
  console.error(`\nSmoke check failed on ${failed.length} route(s).`);
  process.exit(1);
}

console.log("\nSmoke check passed.");
