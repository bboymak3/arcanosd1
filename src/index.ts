export default {
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
