export interface Env {
  AI: any;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Cabeceras CORS esenciales para que tu web en .pages.dev se conecte sin errores
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    // Responder a peticiones de verificación del navegador (preflight)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // ÚNICA RUTA ACTIVA: CONSULTA DE TAROT
    if (url.pathname === "/api/consultar" && request.method === "POST") {
      try {
        const { nombre, whatsapp, ubicacion } = await request.json();

        // 1. Selección aleatoria de 1 de las 78 cartas (Lógica Grado 33)
        const totalCartas = 78;
        const indice = Math.floor(Math.random() * totalCartas) + 1;
        let cardId: string;

        if (indice <= 22) {
          cardId = indice.toString().padStart(2, '0'); // Arcanos Mayores
        } else if (indice <= 36) {
          cardId = 'B' + (indice - 22).toString().padStart(2, '0'); // Bastos
        } else if (indice <= 50) {
          cardId = 'C' + (indice - 36).toString().padStart(2, '0'); // Copas
        } else if (indice <= 64) {
          cardId = 'E' + (indice - 50).toString().padStart(2, '0'); // Espadas
        } else {
          cardId = 'O' + (indice - 64).toString().padStart(2, '0'); // Oros
        }

        // 2. Buscar datos de la carta en tu D1
        const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?").bind(cardId).first();
        if (!carta) throw new Error("Carta no encontrada");

        // 3. Registro básico del consultante (nombre, whatsapp, ubicacion)
        const userInsert = await env.DB.prepare(
          "INSERT INTO usuarios (nombre, whatsapp, ubicacion) VALUES (?, ?, ?) RETURNING id"
        ).bind(nombre, whatsapp, ubicacion).first();

        // 4. Generación de informe espiritual con IA (Llama 3)
        const promptIA = `Eres un Gran Médium experto del Tarot Grado 33.
        Realiza una lectura profunda para ${nombre} sobre la carta "${carta.nombre}".
        Significado: ${carta.palabras_clave}.
        Esencia: ${carta.descripcion_mistica}.`;

        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "Actúa como un médium místico y directo." },
            { role: "user", content: promptIA }
          ]
        });

        // 5. Guardar registro de la lectura en la tabla lecturas
        await env.DB.prepare(
          "INSERT INTO lecturas (usuario_id, arcano_id, mensaje_ia) VALUES (?, ?, ?)"
        ).bind(userInsert.id, cardId, aiResponse.response).run();

        // Respuesta final para mostrar en tu web
        return new Response(JSON.stringify({
          nombreCarta: carta.nombre,
          imagen: `https://arcanosd1.estilosgrado33.workers.dev/images/${carta.nombre_archivo}`,
          informe: aiResponse.response
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    // Cualquier otra ruta que no sea /api/consultar dará error 404
    return new Response("Not Found", { status: 404 });
  }
};
