async function realizarConsulta() {
    const nombre = document.getElementById('nombre').value;
    const whatsapp = document.getElementById('whatsapp').value;
    const ubicacion = document.getElementById('ubicacion').value;

    if (!nombre || !whatsapp || !ubicacion) {
        alert("Buscador, debes completar tus datos para que el oráculo responda.");
        return;
    }

    // Pantalla de carga
    const formulario = document.getElementById('formulario');
    formulario.innerHTML = `
        <div style="padding: 40px;">
            <h2 style="color: #d4af37;">Invocando a los Arcanos...</h2>
            <p>Mezclando el mazo místico de Grado 33</p>
        </div>
    `;

    try {
        const respuesta = await fetch('/api/consultar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, whatsapp, ubicacion })
        });

        if (!respuesta.ok) throw new Error("Conexión interrumpida con el plano espiritual.");

        const data = await respuesta.json();

        // Ocultar formulario y mostrar resultado
        formulario.style.display = 'none';
        const resDiv = document.getElementById('resultado');
        resDiv.style.display = 'block';

        document.getElementById('carta-nombre').innerText = data.nombreCarta;
        document.getElementById('carta-img').src = data.imagen; // Ruta: /images/13.png
        
        // Efecto de escritura progresiva
        const informeDiv = document.getElementById('ia-informe');
        typeWriter(data.informe, informeDiv);

    } catch (error) {
        alert("Error místico: " + error.message);
        window.location.reload();
    }
}

function typeWriter(text, element) {
    let i = 0;
    element.innerHTML = "";
    function type() {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            setTimeout(type, 25);
        }
    }
    type();
}