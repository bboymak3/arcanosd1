document.getElementById('btn-consultar').addEventListener('click', async () => {
    const nombre = document.getElementById('nombre').value;
    const whatsapp = document.getElementById('whatsapp').value;
    const ubicacion = document.getElementById('ubicacion').value;

    if (!nombre || !whatsapp) {
        alert("Faltan datos");
        return;
    }

    // 1. Mostrar carga y ocultar formulario
    document.getElementById('formulario').style.display = 'none';
    document.getElementById('pantalla-carga').style.display = 'block';

    try {
        const respuesta = await fetch('/api/consultar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, whatsapp, ubicacion })
        });

        const data = await respuesta.json();

        if (data.error) throw new Error(data.error);

        // 2. Mostrar resultado
        document.getElementById('pantalla-carga').style.display = 'none';
        document.getElementById('resultado').style.display = 'block';
        
        document.getElementById('carta-nombre').innerText = data.nombreCarta;
        document.getElementById('carta-img').src = data.imagen;
        document.getElementById('ia-informe').innerText = data.informe;

    } catch (err) {
        alert("Error: " + err.message);
        reiniciar();
    }
});

function reiniciar() {
    // Limpiar campos y volver al estado inicial
    document.getElementById('resultado').style.display = 'none';
    document.getElementById('pantalla-carga').style.display = 'none';
    document.getElementById('formulario').style.display = 'block';
    document.getElementById('nombre').value = '';
    document.getElementById('whatsapp').value = '';
    document.getElementById('ubicacion').value = '';
}
