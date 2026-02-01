async function realizarConsulta() {
    // Obtener elementos del DOM
    const nombre = document.getElementById('nombre').value;
    const whatsapp = document.getElementById('whatsapp').value;
    const ubicacion = document.getElementById('ubicacion').value;
    const formulario = document.getElementById('formulario');
    const resultado = document.getElementById('resultado');

    // Validación: Si faltan datos, no hace nada
    if (!nombre || !whatsapp) {
        alert("Buscador, introduce tu nombre y contacto.");
        return;
    }

    // Cambiar estado a "Cargando"
    formulario.innerHTML = "<h3>Conectando con los Arcanos...</h3>";

    try {
        // La petición debe ir a la ruta que configuraste en tu index.ts
        const respuesta = await fetch('/api/consultar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, whatsapp, ubicacion })
        });

        if (!respuesta.ok) throw new Error("El oráculo no responde.");

        const data = await respuesta.json();

        // Ocultar formulario y mostrar resultado
        document.getElementById('box').style.display = 'none';
        resultado.style.display = 'block';
        
        // Cargar los datos recibidos del Worker
        document.getElementById('carta-nombre').innerText = data.nombreCarta;
        document.getElementById('carta-img').src = data.imagen;
        document.getElementById('ia-informe').innerText = data.informe;

    } catch (error) {
        console.error("Error místico:", error);
        alert("Hubo un error en la conexión espiritual: " + error.message);
        location.reload(); // Recargar para reintentar
    }
}
