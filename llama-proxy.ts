import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

// ✅ 请在这里替换成你的 EXA API Key
const EXA_API_KEY = "fb1167bd-fca7-44ce-9164-7a556c0c7085";

serve(async (req: Request) => {
  const url = new URL(req.url);
  const query = url.searchParams.get("q");

  if (!query) {
    return new Response(JSON.stringify({ error: "Missing query 'q'" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const exaRes = await fetch("https://api.exa.ai/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${EXA_API_KEY}`,
      },
      body: JSON.stringify({
        query,
        numResults: 5,
      }),
    });

    if (!exaRes.ok) {
      const errText = await exaRes.text();
      return new Response(
        JSON.stringify({ error: "EXA API error", detail: errText }),
        {
          status: 502,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const exaJson = await exaRes.json();

    // 🔍 日志输出（部署后可在 dash.deno.com logs 中查看）
    console.log("EXA 原始返回：", JSON.stringify(exaJson, null, 2));

    const results = (exaJson.results ?? []).map((r: any) => ({
      title: r.title ?? "No title",
      url: r.url ?? "",
      // ⚠️ 自动兜底 content 内容字段，确保 OpenWebUI 能正常显示
      content: r.text ?? r.snippet ?? r.description ?? r.title ?? "(No content)",
    }));

    return new Response(JSON.stringify({ results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Server error", detail: String(e) }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
