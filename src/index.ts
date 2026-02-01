export interface Env {
  AI: any;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // --- RUTA DE CONSULTA (USUARIOS) ---
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      try {
        const { nombre, whatsapp, ubicacion } = await request.json();
        const indice = Math.floor(Math.random() * 78) + 1;
        // Lógica de cardId... (01-78)
        let cardId = indice.toString().padStart(2, '0'); 

        const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();

        await env.DB.prepare(
          "INSERT INTO usuarios (nombre, whatsapp, ubicacion) VALUES (?, ?, ?)"
        ).bind(nombre, whatsapp, ubicacion).run();

        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [{ role: "system", content: "Eres un médium místico." }, 
                     { role: "user", content: `Lectura para ${nombre} sobre ${carta.nombre}` }]
        });

        return new Response(JSON.stringify({
          nombreCarta: carta.nombre,
          imagen: `/images/${carta.nombre_archivo}`,
          informe: aiResponse.response
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      } catch (e) {
        return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
      }
    }

    // --- NUEVA RUTA: PANEL ADMIN (BÁSICO) ---
    if (url.pathname === "/api/admin/usuarios") {
      // Acceso: /api/admin/usuarios?token=grado33
      if (url.searchParams.get("token") !== "grado33") {
        return new Response("No autorizado", { status: 401, headers: corsHeaders });
      }

      const usuarios = await env.DB.prepare("SELECT * FROM usuarios ORDER BY id DESC").all();
      return new Response(JSON.stringify(usuarios.results), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
