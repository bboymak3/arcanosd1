export interface Env {
  AI: any;
  DB: D1Database;
  KV: KVNamespace; // Coincide con tu binding en wrangler.json
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

    // --- 1. SERVIDOR DE IMÁGENES (Desde KV) ---
    if (url.pathname.startsWith("/images/")) {
      const imageName = url.pathname.split("/").pop();
      if (!imageName) return new Response("Not Found", { status: 404 });
      
      const image = await env.KV.get(imageName, { type: "arrayBuffer" });
      if (!image) return new Response("Imagen no encontrada", { status: 404 });

      return new Response(image, {
        headers: { "Content-Type": "image/png", ...corsHeaders }
      });
    }

    // --- 2. API DE CONSULTA (El Corazón del Sistema) ---
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      try {
        const { nombre, whatsapp, ubicacion } = await request.json();
        
        // Selección aleatoria de la carta (01-78)
        const indice = Math.floor(Math.random() * 78) + 1;
        let cardId = (indice <= 22) ? indice.toString().padStart(2, '0') : 
                     (indice <= 36) ? 'B' + (indice - 22).toString().padStart(2, '0') :
                     (indice <= 50) ? 'C' + (indice - 36).toString().padStart(2, '0') :
                     (indice <= 64) ? 'E' + (indice - 50).toString().padStart(2, '0') :
                                      'O' + (indice - 64).toString().padStart(2, '0');

        const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();

        // Registrar usuario
        const user = await env.DB.prepare(
          "INSERT INTO usuarios (nombre, whatsapp, ubicacion) VALUES (?, ?, ?) RETURNING id"
        ).bind(nombre, whatsapp, ubicacion).first();

        // Generar lectura mística con la IA
        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "Eres un médium experto del Tarot Grado 33. Das consejos profundos, místicos y alentadores." },
            { role: "user", content: `Lectura para ${nombre} que vive en ${ubicacion}. La carta revelada es: ${carta.nombre}.` }
          ]
        });

        // Guardar la lectura en el historial
        await env.DB.prepare(
          "INSERT INTO lecturas (usuario_id, arcano_id, mensaje_ia) VALUES (?, ?, ?)"
        ).bind(user.id, cardId, aiResponse.response).run();

        return new Response(JSON.stringify({
          nombreCarta: carta.nombre,
          // La URL ahora apunta a este mismo Worker
          imagen: `https://${url.hostname}/images/${carta.nombre_archivo}`,
          informe: aiResponse.response
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (err) {
        return new Response(JSON.stringify({ error: "Error en la conexión espiritual" }), { status: 500, headers: corsHeaders });
      }
    }

    // --- 3. API ADMIN (Historial para ti) ---
    if (url.pathname === "/api/admin/usuarios") {
      if (url.searchParams.get("token") !== "grado33") return new Response("Prohibido", { status: 401 });

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

    return new Response("Portal no encontrado", { status: 404 });
  }
};