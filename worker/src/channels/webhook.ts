import type { SendResult } from "../types";

// Generic outbound webhook — POSTs a JSON payload to any URL.
// Use this to integrate Discord, Slack, Bark, n8n, or your own endpoint.
export interface WebhookConfig {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  // Optional template; {{title}}, {{body}} and {{timestamp}} are substituted.
  // When omitted a default { title, body, timestamp } JSON body is sent.
  template?: string;
}

function getCustomTimezoneISO(date, timeZone) {
    // 使用瑞典语格式化，它会返回类似 "2026-06-15 09:38:24" 的字符串
    const formattedString = date.toLocaleString('sv-SE', { 
        timeZone: timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
    
    // 将中间的空格替换为 'T'
    return formattedString.replace(' ', 'T');
}


export async function sendWebhook(
  config: WebhookConfig,
  title: string,
  body: string,
): Promise<SendResult> {
  if (!config.url) return { ok: false, detail: "Missing webhook URL" };
  const now = new Date();
  const timestamp = getCustomTimezoneISO(now, 'Asia/Shanghai')
  let payload: string;
  if (config.template) {
    payload = config.template
      .replaceAll("{{title}}", jsonEscape(title))
      .replaceAll("{{body}}", jsonEscape(body))
      .replaceAll("{{timestamp}}", timestamp);
  } else {
    payload = JSON.stringify({ title, body, timestamp });
  }
  try {
    const res = await fetch(config.url, {
      method: config.method || "POST",
      headers: { "Content-Type": "application/json", ...(config.headers || {}) },
      body: payload,
    });
    if (res.ok) return { ok: true };
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    return { ok: false, detail: detail || `HTTP ${res.status}` };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : "Network error" };
  }
}

function jsonEscape(s: string): string {
  return JSON.stringify(s).slice(1, -1);
}
