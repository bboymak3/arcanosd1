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

    // --- API DE CONSULTA ---
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      const { nombre, whatsapp, ubicacion } = await request.json();
      const indice = Math.floor(Math.random() * 78) + 1;
      
      // Lógica de IDs (01-78, B, C, E, O)
      let cardId = (indice <= 22) ? indice.toString().padStart(2, '0') : 
                   (indice <= 36) ? 'B' + (indice - 22).toString().padStart(2, '0') :
                   (indice <= 50) ? 'C' + (indice - 36).toString().padStart(2, '0') :
                   (indice <= 64) ? 'E' + (indice - 50).toString().padStart(2, '0') :
                                    'O' + (indice - 64).toString().padStart(2, '0');

      const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();

      const user = await env.DB.prepare(
        "INSERT INTO usuarios (nombre, whatsapp, ubicacion) VALUES (?, ?, ?) RETURNING id"
      ).bind(nombre, whatsapp, ubicacion).first();

      const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
        messages: [{ role: "system", content: "Eres un médium Grado 33." }, 
                   { role: "user", content: `Lectura para ${nombre} sobre ${carta.nombre}` }]
      });

      await env.DB.prepare(
        "INSERT INTO lecturas (usuario_id, arcano_id, mensaje_ia) VALUES (?, ?, ?)"
      ).bind(user.id, cardId, aiResponse.response).run();

      return new Response(JSON.stringify({
        nombreCarta: carta.nombre,
        imagen: `https://arcanosd1.estilosgrado33.workers.dev/images/${carta.nombre_archivo}`,
        informe: aiResponse.response
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- API ADMIN PROFESIONAL (CON HISTORIAL) ---
    if (url.pathname === "/api/admin/usuarios") {
      if (url.searchParams.get("token") !== "grado33") return new Response("Error", { status: 401 });

      // Consultamos uniendo las tablas para ver la carta de cada usuario
      const query = `
        SELECT u.id, u.nombre, u.whatsapp, u.ubicacion, u.fecha_registro, a.nombre as carta
        FROM usuarios u
        JOIN lecturas l ON u.id = l.usuario_id
        JOIN arcanos a ON l.arcano_id = a.id
        ORDER BY u.id DESC
      `;
      const { results } = await env.DB.prepare(query).all();
      
      return new Response(JSON.stringify(results), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response("Not Found", { status: 404 });
  }
};
