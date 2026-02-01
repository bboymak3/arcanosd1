export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

    // --- RUTA DE CONSULTA (USUARIO) ---
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      const { nombre, whatsapp, ubicacion } = await request.json();
      
      // Selección de carta (Lógica 01-78)
      const randomNum = Math.floor(Math.random() * 78) + 1;
      let cardId = randomNum.toString().padStart(2, '0'); // Ejemplo simplificado

      const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();

      // GUARDAR EN DB (Incluyendo la carta revelada)
      await env.DB.prepare(
        "INSERT INTO usuarios (nombre, whatsapp, ubicacion, carta_revelada) VALUES (?, ?, ?, ?)"
      ).bind(nombre, whatsapp, ubicacion, carta.nombre).run();

      const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [{ role: "system", content: "Eres un médium experto." }, 
                   { role: "user", content: `Lectura para ${nombre} sobre ${carta.nombre}` }]
      });

      return new Response(JSON.stringify({
        nombreCarta: carta.nombre,
        imagen: `https://arcanosd1.estilosgrado33.workers.dev/images/${carta.nombre_archivo}`,
        informe: aiResponse.response
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- RUTA DE ADMIN (TU PANEL) ---
    if (url.pathname === "/api/admin/usuarios" && request.method === "GET") {
      if (url.searchParams.get("token") !== "grado33") {
        return new Response("No autorizado", { status: 401 });
      }

      const usuarios = await env.DB.prepare("SELECT * FROM usuarios ORDER BY id DESC").all();
      return new Response(JSON.stringify(usuarios.results), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};