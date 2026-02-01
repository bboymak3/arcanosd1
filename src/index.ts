export interface Env {
  AI: any;
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Cabeceras CORS esenciales para comunicación sin bloqueos
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/api/consultar" && request.method === "POST") {
      try {
        const { nombre, whatsapp, ubicacion } = await request.json();

        // 1. Selección aleatoria de la carta (Lógica Grado 33)
        const indice = Math.floor(Math.random() * 78) + 1;
        let cardId: string;

        if (indice <= 22) {
          cardId = indice.toString().padStart(2, '0');
        } else if (indice <= 36) {
          cardId = 'B' + (indice - 22).toString().padStart(2, '0');
        } else if (indice <= 50) {
          cardId = 'C' + (indice - 36).toString().padStart(2, '0');
        } else if (indice <= 64) {
          cardId = 'E' + (indice - 50).toString().padStart(2, '0');
        } else {
          cardId = 'O' + (indice - 64).toString().padStart(2, '0');
        }

        // 2. Obtener la carta directamente
        const carta = await env.DB.prepare("SELECT * FROM arcanos WHERE id = ?")
          .bind(cardId)
          .first();

        if (!carta) throw new Error("Carta no encontrada");

        // 3. Registro simple del usuario (Sin RETURNING para evitar conflictos)
        await env.DB.prepare(
          "INSERT INTO usuarios (nombre, whatsapp, ubicacion) VALUES (?, ?, ?)"
        ).bind(nombre, whatsapp, ubicacion).run();

        // 4. Generación del informe con IA
        const aiResponse = await env.AI.run("@cf/meta/llama-3-8b-instruct", {
          messages: [
            { role: "system", content: "Eres un médium místico del Tarot Grado 33." },
            { role: "user", content: `Lectura para ${nombre} sobre la carta ${carta.nombre}` }
          ]
        });

        // 5. Respuesta directa al usuario
        return new Response(JSON.stringify({
          nombreCarta: carta.nombre,
          imagen: `https://arcanosd1.estilosgrado33.workers.dev/images/${carta.nombre_archivo}`,
          informe: aiResponse.response
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });

      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { 
          status: 500, 
          headers: corsHeaders 
        });
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
