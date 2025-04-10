const availableModels = [
  "llama3.1-70b",
  "llama2-70b-chat",
  "phi-2",
];

Deno.serve(async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const clientAuth = req.headers.get("authorization");

  if (!clientAuth) {
    return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // GET /v1/models: 返回可用模型列表
  if (pathname === "/v1/models" && req.method === "GET") {
    const models = availableModels.map((id) => ({
      id,
      object: "model",
      created: Date.now(),
      owned_by: "you",
    }));

    return new Response(
      JSON.stringify({ object: "list", data: models }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  // POST /v1/chat/completions: 原样转发
  if (pathname === "/v1/chat/completions" && req.method === "POST") {
    const body = await req.text(); // 不解析为 JSON，避免破坏 stream 结构

    const forwardReq = new Request("https://api.llmapi.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": clientAuth,
      },
      body,
    });

    try {
      const llmRes = await fetch(forwardReq);
      const isStream = llmRes.headers.get("content-type")?.includes("text/event-stream");

      if (isStream && llmRes.body) {
        return new Response(llmRes.body, {
          status: llmRes.status,
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }

      const respBody = await llmRes.text();
      return new Response(respBody, {
        status: llmRes.status,
        headers: {
          "Content-Type": llmRes.headers.get("Content-Type") || "application/json",
        },
      });
    } catch (err) {
      console.error("LLMAPI proxy error:", err);
      return new Response(JSON.stringify({ error: "Proxy failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 未匹配路径
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
});
