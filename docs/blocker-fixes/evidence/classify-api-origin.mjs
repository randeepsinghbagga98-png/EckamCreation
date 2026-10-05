const raw = process.env.API_INTERNAL_URL?.trim() || "";
if (!raw) {
  console.log("API_INTERNAL_URL=UNSET");
  process.exit(0);
}
try {
  const url = new URL(raw);
  const port = url.port || (url.protocol === "https:" ? "443" : "80");
  const webPorts = new Set(["3000", "3047", "3050"]);
  const kind = port === "3002" ? "API_PORT" : webPorts.has(port) ? "WEB_PORT" : "OTHER_PORT";
  console.log(`API_INTERNAL_URL=${kind}`);
} catch {
  console.log("API_INTERNAL_URL=INVALID");
}
