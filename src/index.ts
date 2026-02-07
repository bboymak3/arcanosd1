export interface Env {
  AI: any;
  DB: D1Database;
  KV: KVNamespace;
  ASSETS: Fetcher;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 1. Configuración de CORS
    // Esto permite que tu web en Cloudflare Pages hable con este Worker
    const corsHeaders = {
      "Access-Control-Allow-Origin": "https://amarresde.pages.dev",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Responder a peticiones de verificación del navegador
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. Servir la web (chatbot.html, etc.) desde /public
    if (url.pathname === "/" || url.pathname.endsWith(".html") || url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
      return await env.ASSETS.fetch(request);
    }

    // 3. Servir imágenes directamente desde el KV
    if (url.pathname.startsWith("/images/")) {
      const imageName = url.pathname.split("/").pop();
      if (!imageName) return new Response("No encontrado", { status: 404 });
      
      const image = await env.KV.get(imageName, { type: "arrayBuffer" });
      if (!image) return new Response("Imagen no encontrada", { status: 404 });

      return new Response(image, {
        headers: { "Content-Type": "image/png", ...corsHeaders }
      });
    }

    // 4. API de Consulta Espiritual (Lógica del Tarot)
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      try {
        const { nombre, whatsapp, ubicacion } = await request.json();

        // --- Lógica de selección de las 78 cartas ---
        const totalCartas = 78;
        const indiceAleatorio = Math.floor(Math.random() * totalCartas) + 1;
        let cardId: string;

        if (indiceAleatorio <= 22) {
          cardId = indiceAleatorio.toString().padStart(2, '0'); // Mayores (01-22)
        } else if (indiceAleatorio <= 36) {
          cardId = 'B' + (indiceAleatorio - 22).toString().padStart(2, '0'); // Bastos
        } else if (indiceAleatorio <= 50) {
          cardId = 'C' + (indiceAleatorio - 36).toString().padStart(2, '0'); // Copas
        } else if (indiceAleatorio <= 64) {
          cardId = 'E' + (indiceAleatorio - 50).toString().padStart(2, '0'); // Espadas
        } else {
          cardId = 'O' + (indiceAleatorio - 64).toString().padStart(2, '0'); // Oros
        }

        // --- Consulta a la Base de Datos D1 ---
        const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();
        
        if (!carta) {
          return new Response(JSON.stringify({ error: "Carta no encontrada en el mazo sagrado" }), { status: 404, headers: corsHeaders });
        }

        // --- Guardar usuario y obtener ID ---
        const userInsert: any = await env.DB.prepare(
          "INSERT INTO usuarios (nombre, whatsapp, ubicacion) VALUES (?, ?, ?) RETURNING id"
        ).bind(nombre, whatsapp, ubicacion).first();

        // --- Generar respuesta con la IA (Médium Grado 33) ---
        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { 
              role: "system", 
              content: "Eres un Gran Médium del Tarot Grado 33. Das consejos profundos, espirituales y directos. No menciones que eres una IA." 
            },
            { 
              role: "user", 
              content: `El consultante es ${nombre} de ${ubicacion}. Ha salido la carta "${carta.nombre}". Significado: ${carta.palabras_clave}. Haz su lectura.` 
            }
          ]
        });

        // --- Registrar la lectura en la DB ---
        await env.DB.prepare(
          "INSERT INTO lecturas (usuario_id, arcano_id, mensaje_ia) VALUES (?, ?, ?)"
        ).bind(userInsert.id, cardId, aiResponse.response).run();

        // --- Enviar respuesta al Front-end ---
        return new Response(JSON.stringify({
          nombreCarta: carta.nombre,
          imagen: `https://${url.hostname}/images/${carta.nombre_archivo}`,
          informe: aiResponse.response
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (err: any) {
        return new Response(JSON.stringify({ error: "Error espiritual: " + err.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return new Response("Portal no encontrado", { status: 404 });
  }
};
