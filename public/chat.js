// Configuración del Selector de Banderas
const inputWA = document.querySelector("#whatsapp");
const iti = window.intlTelInput(inputWA, {
    initialCountry: "auto",
    geoIpLookup: function(callback) {
        fetch('https://ipinfo.io/json')
            .then(res => res.json())
            .then(data => callback(data.country))
            .catch(() => callback("VE")); // Por defecto Venezuela
    },
    utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js",
});

document.getElementById('btn-consultar').addEventListener('click', async () => {
    const nombre = document.getElementById('nombre').value;
    const whatsapp = iti.getNumber(); // Captura número con código (+58...)
    const ubicacion = document.getElementById('ubicacion').value;

    if (!nombre || !iti.isValidNumber()) {
        alert("Por favor, ingresa tu nombre y un número de WhatsApp válido.");
        return;
    }

    document.getElementById('formulario').innerHTML = "<p>Consultando al Oráculo Espiritual...</p>";

    try {
        const respuesta = await fetch('/api/consultar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre, whatsapp, ubicacion })
        });

        const data = await respuesta.json();

        document.getElementById('formulario').style.display = 'none';
        document.getElementById('resultado').style.display = 'block';
        
        document.getElementById('carta-nombre').innerText = data.nombreCarta;
        document.getElementById('carta-img').src = data.imagen;
        
        // Efecto de máquina de escribir
        let i = 0;
        const informeDiv = document.getElementById('ia-informe');
        informeDiv.innerHTML = "";
        function escribir() {
            if (i < data.informe.length) {
                informeDiv.innerHTML += data.informe.charAt(i);
                i++;
                setTimeout(escribir, 25);
            }
        }
        escribir();

    } catch (err) {
        alert("Error en la conexión espiritual.");
        location.reload();
    }
});
