const [baseUrl = "http://localhost:3000", email, password, ...routeSpecs] = process.argv.slice(2);

if (!email || !password || routeSpecs.length === 0) {
  console.error(
    "Usage: node scripts/signed-in-qa.mjs <baseUrl> <email> <password> <path::expectedText> [...]",
  );
  process.exit(1);
}

const loginResponse = await fetch(`${baseUrl}/auth/password-login`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ email, password }),
  redirect: "manual",
});

if (!loginResponse.ok) {
  const body = await loginResponse.text();
  console.error(`Login failed for ${email}: ${loginResponse.status} ${body}`);
  process.exit(1);
}

const cookies = loginResponse.headers
  .getSetCookie()
  .map((value) => value.split(";")[0])
  .join("; ");

if (!cookies) {
  console.error(`Login succeeded for ${email} but no auth cookies were returned.`);
  process.exit(1);
}

for (const spec of routeSpecs) {
  const [path, expectedText] = spec.split("::");
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      Cookie: cookies,
    },
    redirect: "manual",
  });

  const body = await response.text();
  const passed = response.ok && (!expectedText || body.includes(expectedText));

  console.log(
    `${passed ? "PASS" : "FAIL"} ${email} ${path} (${response.status})${
      expectedText ? ` contains "${expectedText}"` : ""
    }`,
  );

  if (!passed) {
    console.error(body.slice(0, 600));
    process.exit(1);
  }
}

console.log(`Signed-in QA passed for ${email}.`);
