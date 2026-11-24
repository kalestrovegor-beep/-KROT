const MODEL = "@cf/black-forest-labs/flux-1-schnell";
const encoder = new TextEncoder();

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders() });
    }

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ status: "ok", service: "krot-api" });
    }

    if (url.pathname !== "/v1/images/generations") {
      return json({ error: { message: "Not found", type: "not_found" } }, 404);
    }

    if (request.method !== "POST") {
      return json({ error: { message: "Method not allowed", type: "method_not_allowed" } }, 405, {
        Allow: "POST, OPTIONS",
      });
    }

    if (env.API_KEY && request.headers.get("Authorization") !== `Bearer ${env.API_KEY}`) {
      return json({ error: { message: "Invalid or missing API key", type: "authentication_error" } }, 401);
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return json({ error: { message: "Request body must be valid JSON", type: "invalid_request_error" } }, 400);
    }

    const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
    if (!prompt) {
      return json({ error: { message: "prompt is required", type: "invalid_request_error" } }, 400);
    }
    if (prompt.length > 2000) {
      return json({ error: { message: "prompt must be 2000 characters or fewer", type: "invalid_request_error" } }, 400);
    }

    const inputs = { prompt };
    if (Number.isInteger(body.seed) && body.seed >= 0) inputs.seed = body.seed;
    if (Number.isInteger(body.steps)) inputs.steps = Math.min(8, Math.max(1, body.steps));

    try {
      const result = await env.AI.run(MODEL, inputs);
      const bytes = await imageBytes(result);
      if (!bytes) {
        return json({ error: { message: "Image provider returned an unsupported response", type: "upstream_error" } }, 502);
      }

      return json({
        created: Math.floor(Date.now() / 1000),
        data: [{ b64_json: bytesToBase64(bytes) }],
      });
    } catch (error) {
      console.error("Image generation failed", error);
      return json({ error: { message: "Image generation failed", type: "upstream_error" } }, 502);
    }
  },
};

async function imageBytes(result) {
  if (result instanceof ReadableStream) {
    return new Uint8Array(await new Response(result).arrayBuffer());
  }
  if (result instanceof ArrayBuffer) return new Uint8Array(result);
  if (ArrayBuffer.isView(result)) return new Uint8Array(result.buffer, result.byteOffset, result.byteLength);
  if (result && typeof result.image === "string") {
    const encoded = result.image.replace(/^data:image\/[^;]+;base64,/, "");
    const binary = atob(encoded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }
  return null;
}

function bytesToBase64(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function json(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };
}
