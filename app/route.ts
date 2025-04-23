import { NextRequest, NextResponse } from "next/server";

const CLOUDFLARE_API = "https://api.cloudflare.com/client/v4/";

async function cfFetch(
  url: string,
  cf_key: string,
  method: "GET" | "POST" | "PUT" = "GET",
  body?: any
) {
  const res = await fetch(CLOUDFLARE_API + url, {
    method,
    headers: {
      Authorization: `Bearer ${cf_key}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return res.json();
}

function isValidIPv4(ip: string) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
}
function isValidIPv6(ip: string) {
  return /^[a-fA-F0-9:]+$/.test(ip);
}

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());
  const { cf_key, domain, ipv4, ipv6, log, proxy } = params;

  // Logging helper (console only)
  function wlog(level: string, msg: string) {
    if (log === "true") {
      // Optionally, write to a file or external log here
      console.log(`${new Date().toISOString()} - ${level} - ${msg}`);
    }
  }

  wlog("INFO", "===== Starting Script =====");

  if (!cf_key || !domain) {
    wlog("ERROR", "Parameter(s) missing or invalid");
    wlog("INFO", "Script aborted");
    return NextResponse.json(
      { error: "Parameter(s) missing or invalid" },
      { status: 400 }
    );
  }

  let validIPv4 = ipv4 && isValidIPv4(ipv4) ? ipv4 : null;
  let validIPv6 = ipv6 && isValidIPv6(ipv6) ? ipv6 : null;

  if (!validIPv4 && !validIPv6) {
    wlog("ERROR", "Neither IPv4 nor IPv6 available.");
    wlog("INFO", "Script aborted");
    return NextResponse.json(
      { error: "Neither IPv4 nor IPv6 available." },
      { status: 400 }
    );
  }

  const proxied = proxy === "true";
  wlog("INFO", `Record will${proxied ? "" : " not"} be proxied by Cloudflare`);

  // Test authentication
  const auth = await cfFetch("zones", cf_key);
  if (!auth.success) {
    wlog("ERROR", "Cloudflare authentication failed: " + (auth.errors?.[0]?.message || ""));
    wlog("INFO", "Script aborted");
    return NextResponse.json(
      { error: "Cloudflare authentication failed: " + (auth.errors?.[0]?.message || "") },
      { status: 401 }
    );
  }
  wlog("INFO", "Cloudflare authentication successful");

  wlog("INFO", "Found records to set: " + domain);
  const domains = domain.split(",");
  let result = "success";

  for (const dom of domains) {
    wlog("INFO", `Find zone for record '${dom}'`);
    const parts = dom.split(".").reverse();
    if (parts.length < 2) {
      wlog("ERROR", `Invalid domain: ${dom}`);
      result = "failure";
      continue;
    }
    const zoneName = parts[1] + "." + parts[0];
    const zoneResp = await cfFetch(`zones?name=${zoneName}&status=active`, cf_key);
    if (!zoneResp.success || !zoneResp.result?.[0]?.id) {
      wlog("ERROR", `Could not set record '${dom}', could not determine zone id.`);
      result = "failure";
      continue;
    }
    const zoneId = zoneResp.result[0].id;
    wlog("INFO", `Found zone id (${zoneId}) for '${dom}'.`);

    // Get existing DNS records
    const recResp = await cfFetch(`zones/${zoneId}/dns_records?name=${dom}`, cf_key);
    const records = recResp.result || [];

    // Helper to create or update record
    async function upsertRecord(type: "A" | "AAAA", content: string) {
      const existing = records.find((r: any) => r.type === type);
      if (existing) {
        if (existing.content === content) {
          wlog("INFO", `Skipped record, because ${type === "A" ? "ipv4" : "ipv6"} is already up-to-date.`);
          return;
        }
        // Update
        const upd = await cfFetch(
          `zones/${zoneId}/dns_records/${existing.id}`,
          cf_key,
          "PUT",
          {
            type,
            name: dom,
            content,
            ttl: 1,
            proxied,
          }
        );
        if (!upd.success) {
          wlog("ERROR", `Could not update record for '${dom}'.`);
          result = "failure";
        } else {
          wlog("INFO", `Updated ${type}-Record with ip '${content}' successfully.`);
        }
      } else {
        // Create
        const crt = await cfFetch(
          `zones/${zoneId}/dns_records`,
          cf_key,
          "POST",
          {
            type,
            name: dom,
            content,
            ttl: 1,
            proxied,
          }
        );
        if (!crt.success) {
          wlog("ERROR", `Could not create record for '${dom}'.`);
          result = "failure";
        } else {
          wlog("INFO", `Created new ${type}-Record for '${dom}' with ip '${content}' successfully.`);
        }
      }
    }

    if (validIPv4) await upsertRecord("A", validIPv4);
    if (validIPv6) await upsertRecord("AAAA", validIPv6);
  }

  wlog("INFO", "===== Script completed =====");
  return NextResponse.json({ result });
}
