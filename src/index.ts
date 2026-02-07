export interface Env {
  AI: any;
  DB: D1Database;
}

export default {
  async fetch(request: export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);

    // 1. Manejo de CORS (Muy importante para evitar el Failed to Fetch)
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*", // O el dominio de tu página de Pages
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Responder a la petición de verificación del navegador
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 2. Ruta de la consulta
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      try {
        const { nombre, whatsapp, ubicacion } = await request.json();

        // Lógica de selección de carta (01-78)
        const randomNum = Math.floor(Math.random() * 78) + 1;
        let cardId = randomNum.toString().padStart(2, '0'); 
        // ... (Tu lógica de IDs B, C, E, O)

        // Consulta a D1
        const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();

        // Generar respuesta con IA
        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "Eres un médium experto en Tarot Grado 33." },
            { role: "user", content: `Haz una lectura para ${nombre} sobre la carta ${carta.nombre}` }
          ]
        });

        const respuestaFinal = {
          nombreCarta: carta.nombre,
          imagen: `https://arcanosd1.estilosgrado33.workers.dev/images/${carta.nombre_archivo}`,
          informe: aiResponse.response
        };

        return new Response(JSON.stringify(respuestaFinal), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    return new Response("No encontrado", { status: 404 });
  }
};
, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Endpoint para la consulta
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      try {
        const { nombre, whatsapp, ubicacion } = await request.json();

        // 1. Lógica para elegir 1 de las 78 cartas
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

        // 2. Buscar la carta en la base de datos D1
        const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();
        
        if (!carta) {
          return new Response("Error: Carta no encontrada", { status: 404 });
        }

        // 3. Guardar al usuario en la tabla 'usuarios'
        const userInsert = await env.DB.prepare(
          "INSERT INTO usuarios (nombre, whatsapp, ubicacion) VALUES (?, ?, ?) RETURNING id"
        ).bind(nombre, whatsapp, ubicacion).first();

        // 4. Generar el informe con la IA (Llama 3)
        const promptMistico = `
          Actúa como un Gran Médium del Tarot Grado 33. 
          El consultante se llama ${nombre} y está en ${ubicacion}.
          Ha salido la carta: "${carta.nombre}".
          Significado clave: ${carta.palabras_clave}.
          Esencia mística: ${carta.descripcion_mistica}.
          Genera una lectura espiritual profunda, directa y reveladora sobre su presente y futuro.
        `;

        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "Eres un experto místico del Tarot Grado 33." },
            { role: "user", content: promptMistico }
          ]
        });

        // 5. Registrar la lectura
        await env.DB.prepare(
          "INSERT INTO lecturas (usuario_id, arcano_id, mensaje_ia) VALUES (?, ?, ?)"
        ).bind(userInsert.id, cardId, aiResponse.response).run();

        // Enviar respuesta al Front-end
        return new Response(JSON.stringify({
          nombreCarta: carta.nombre,
          imagen: `/images/${carta.nombre_archivo}`,
          informe: aiResponse.response
        }), { headers: { "Content-Type": "application/json" } });

      } catch (err) {
        return new Response("Error en el servidor: " + err.message, { status: 500 });
      }
    }

    return new Response("Ruta no encontrada", { status: 404 });
  }
};