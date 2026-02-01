/**
 * Conexión mística entre el Front-end y el Worker
 */

async function realizarConsulta() {
    // 1. Obtener valores del formulario
    const nombre = document.getElementById('nombre').value;
    const whatsapp = document.getElementById('whatsapp').value;
    const ubicacion = document.getElementById('ubicacion').value;

    // Validación simple
    if (!nombre || !whatsapp) {
        alert("Por favor, introduce tu nombre y contacto para iniciar la lectura.");
        return;
    }

    // 2. Mostrar estado de carga
    const formulario = document.getElementById('formulario');
    const originalContent = formulario.innerHTML;
    formulario.innerHTML = `
        <div style="padding: 20px;">
            <p>Canalizando energía espiritual...</p>
            <div class="spinner"></div>
        </div>
    `;

    try {
        // 3. Llamada al Worker (Pages Function / API)
        const respuesta = await fetch('/api/consultar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nombre, whatsapp, ubicacion })
        });

        if (!respuesta.ok) {
            throw new Error("El oráculo no responde en este momento.");
        }

        const data = await respuesta.json();

        // 4. Mostrar el resultado
        document.getElementById('formulario').style.display = 'none';
        document.getElementById('resultado').style.display = 'block';
        
        // Cargar datos en el HTML
        document.getElementById('carta-nombre').innerText = data.nombreCarta;
        document.getElementById('carta-img').src = data.imagen;
        
        // Efecto de texto para el informe de la IA
        const informeDiv = document.getElementById('ia-informe');
        informeDiv.innerText = data.informe;

    } catch (error) {
        alert("Error: " + error.message);
        formulario.innerHTML = originalContent;
    }
}
