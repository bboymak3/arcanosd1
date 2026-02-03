export interface Env {
  AI: any;
  DB: D1Database;
  IMG_BUCKET: KVNamespace; // Debes crear este binding en el panel de Cloudflare
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

    // --- NUEVA FUNCIÓN: SERVIDOR DE IMÁGENES DESDE KV ---
    if (url.pathname.startsWith("/images/")) {
      try {
        // Extraemos el nombre del archivo (ej: E12.png)
        const imageName = url.pathname.split("/").pop();
        if (!imageName) return new Response("Nombre de imagen no válido", { status: 400 });

        // Buscamos la imagen en el KV
        const image = await env.IMG_BUCKET.get(imageName, { type: "arrayBuffer" });

        if (!image) {
          return new Response("Imagen no encontrada en el Oráculo", { status: 404, headers: corsHeaders });
        }

        // Devolvemos la imagen con el tipo de contenido correcto
        return new Response(image, {
          headers: {
            "Content-Type": "image/png",
            "Cache-Control": "public, max-age=604800", // Cache por 1 semana
            ...corsHeaders
          }
        });
      } catch (e) {
        return new Response("Error al recuperar imagen", { status: 500 });
      }
    }

    // --- API DE CONSULTA ---
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      const { nombre, whatsapp, ubicacion } = await request.json();
      const indice = Math.floor(Math.random() * 78) + 1;
      
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
        // Apuntamos al propio Worker para que la nueva función de arriba sirva la imagen
        imagen: `https://${url.hostname}/images/${carta.nombre_archivo}`,
        informe: aiResponse.response
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // --- API ADMIN PROFESIONAL (CON HISTORIAL) ---
    if (url.pathname === "/api/admin/usuarios") {
      if (url.searchParams.get("token") !== "grado33") return new Response("Error", { status: 401 });

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