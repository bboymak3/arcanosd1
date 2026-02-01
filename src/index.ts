export interface Env {
  AI: any;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Cabeceras CORS para permitir la comunicación desde tu dominio .pages.dev
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Responder a solicitudes OPTIONS (preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // --- RUTA DE CONSULTA DEL USUARIO ---
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      try {
        const { nombre, whatsapp, ubicacion } = await request.json();

        // 1. Selección aleatoria de 1 de las 78 cartas (Lógica validada)
        const totalCartas = 78;
        const indiceAleatorio = Math.floor(Math.random() * totalCartas) + 1;
        let cardId: string;

        if (indiceAleatorio <= 22) {
            cardId = indiceAleatorio.toString().padStart(2, '0'); // Mayores (01-22)
        } else if (indiceAleatorio <= 36) {
            cardId = 'B' + (indiceAleatorio - 22).toString().padStart(2, '0'); // Bastos (B01-B14)
        } else if (indiceAleatorio <= 50) {
            cardId = 'C' + (indiceAleatorio - 36).toString().padStart(2, '0'); // Copas (C01-C14)
        } else if (indiceAleatorio <= 64) {
            cardId = 'E' + (indiceAleatorio - 50).toString().padStart(2, '0'); // Espadas (E01-E14)
        } else {
            cardId = 'O' + (indiceAleatorio - 64).toString().padStart(2, '0'); // Oros (O01-O14)
        }

        // 2. Obtener datos de la carta de la tabla 'arcanos'
        const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();
        
        if (!carta) {
          return new Response(JSON.stringify({ error: "Carta no encontrada" }), { status: 404, headers: corsHeaders });
        }

        // 3. Registrar usuario en la tabla 'usuarios' (Estructura validada: nombre, whatsapp, ubicacion)
        const userResult = await env.DB.prepare(
          "INSERT INTO usuarios (nombre, whatsapp, ubicacion) VALUES (?, ?, ?) RETURNING id"
        ).bind(nombre, whatsapp, ubicacion).first();

        // 4. Generar informe místico con IA (Llama 3)
        const systemPrompt = `Eres un Gran Médium experto del Tarot Grado 33. 
        Has revelado la carta "${carta.nombre}" para ${nombre}. 
        Significado: ${carta.palabras_clave}. 
        Sabiduría: ${carta.descripcion_mistica}. 
        Genera una lectura espiritual profunda y reveladora.`;

        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [{ role: "system", content: systemPrompt }]
        });

        // 5. Registrar la lectura en la tabla 'lecturas'
        await env.DB.prepare(
          "INSERT INTO lecturas (usuario_id, arcano_id, mensaje_ia) VALUES (?, ?, ?)"
        ).bind(userResult.id, cardId, aiResponse.response).run();

        // 6. Respuesta final al chat.js
        return new Response(JSON.stringify({
          nombreCarta: carta.nombre,
          imagen: `https://arcanosd1.estilosgrado33.workers.dev/images/${carta.nombre_archivo}`,
          informe: aiResponse.response
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (err) {
        return new Response(JSON.stringify({ error: "Error interno: " + err.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // --- RUTA DEL PANEL DE ADMINISTRACIÓN ---
    if (url.pathname === "/api/admin/usuarios" && request.method === "GET") {
      // Validación del token de seguridad (?token=grado33)
      if (url.searchParams.get("token") !== "grado33") {
        return new Response("No autorizado", { status: 401, headers: corsHeaders });
      }

      try {
        const usuarios = await env.DB.prepare("SELECT * FROM usuarios ORDER BY id DESC").all();
        return new Response(JSON.stringify(usuarios.results), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
