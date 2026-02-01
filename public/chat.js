// En public/chat.js cambia el fetch por esto:
const respuesta = await fetch('https://arcanosd1.estilosgrado33.workers.dev/api/consultar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, whatsapp, ubicacion })
});
