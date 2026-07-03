export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // b-monster のページを Cloudflare 側で取得するためのプロキシ
    if (url.pathname === "/api/proxy") {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders() });
      }

      const target = url.searchParams.get("url");
      if (!target) return jsonResponse({ error: "missing url" }, 400);

      let targetUrl;
      try {
        targetUrl = new URL(target);
      } catch {
        return jsonResponse({ error: "invalid url" }, 400);
      }

      // 安全のため b-monster の hacomono だけ許可
      if (targetUrl.hostname !== "b-monster.hacomono.jp") {
        return jsonResponse({ error: "host not allowed" }, 403);
      }

      const upstream = await fetch(targetUrl.toString(), {
        headers: {
          "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "ja,en-US;q=0.9,en;q=0.8",
          "user-agent": "Mozilla/5.0 (compatible; bmonster-schedule/1.0)"
        }
      });

      const body = await upstream.text();

      return new Response(body, {
        status: upstream.status,
        headers: {
          ...corsHeaders(),
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store"
        }
      });
    }

    // それ以外は public/index.html などの静的ファイルを表示
    return env.ASSETS.fetch(request);
  }
};

function corsHeaders() {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, OPTIONS",
    "access-control-allow-headers": "content-type"
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders(),
      "content-type": "application/json; charset=utf-8"
    }
  });
}
