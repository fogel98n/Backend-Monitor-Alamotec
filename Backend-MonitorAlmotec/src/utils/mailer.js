const nodemailer = require('nodemailer');

const UMBRAL_MINUTOS = 30;
const UMBRAL_SEGUNDOS = UMBRAL_MINUTOS * 60;

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const calcularDuracionEnMinutos = (laststart, now = Math.floor(Date.now() / 1000)) => {
    if (!laststart || Number(laststart) <= 0) return 0;
    return Math.max(0, Math.floor((Number(now) - Number(laststart)) / 60));
};

const obtenerTareasConEjecucionMayorOIgualHora = (tareas, now = Math.floor(Date.now() / 1000)) => {
    return (tareas || []).filter(t => {
        const duracionMinutos = calcularDuracionEnMinutos(t.laststart, now);
        return Number(t.laststart) > 0 && duracionMinutos >= UMBRAL_MINUTOS;
    });
};

const construirResumenSistemasCaidos = (sistemasConProblemas, now = Math.floor(Date.now() / 1000)) => {
    if (!Array.isArray(sistemasConProblemas) || sistemasConProblemas.length === 0) {
        return '<p>No se detectaron sistemas con tareas caidas o ejecutandose por mas de 1 hora.</p>';
    }

    const itemsHtml = sistemasConProblemas.map(({ nombreSistema, tareas }) => {
        const tareasHtml = tareas
            .map(t => {
                const minutos = calcularDuracionEnMinutos(t.laststart, now);
                const estado = Number(t.status) === 2 ? 'caida' : `ejecutando hace ${minutos} minutos`;
                return `<li><strong>${t.name}</strong> - ${estado}</li>`;
            })
            .join('');

        return `
            <div style="margin-bottom: 18px;">
                <h3>${nombreSistema}</h3>
                <ul>${tareasHtml}</ul>
            </div>
        `;
    }).join('');

    return `
        <p>Se detectaron tareas con ejecucion prolongada o caidas en los sistemas monitoreados.</p>
        <p>Umbral actual: ${UMBRAL_MINUTOS} minutos.</p>
${itemsHtml}
    `;
};

const enviarAlertaCronCaido = async (nombreSistema, tareasCaidas, now = Math.floor(Date.now() / 1000)) => {
    const tareasAEnviar = obtenerTareasConEjecucionMayorOIgualHora(tareasCaidas, now);
    if (tareasAEnviar.length === 0) return;

    await enviarResumenSistemasCaidos([{ nombreSistema, tareas: tareasAEnviar }], now);
};

const enviarAlertaTareaLenta = async (nombreSistema, tareasLentas, now = Math.floor(Date.now() / 1000)) => {
    const tareasAEnviar = obtenerTareasConEjecucionMayorOIgualHora(tareasLentas, now);
    if (tareasAEnviar.length === 0) return;

    await enviarResumenSistemasCaidos([{ nombreSistema, tareas: tareasAEnviar }], now);
};

const enviarResumenSistemasCaidos = async (sistemasConProblemas, now = Math.floor(Date.now() / 1000)) => {
    if (!Array.isArray(sistemasConProblemas) || sistemasConProblemas.length === 0) return;

    const resumenHtml = construirResumenSistemasCaidos(sistemasConProblemas, now);

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERTA_EMAIL_TO,
        subject: `Resumen de sistemas caidos o tareas ejecutandose mas de ${UMBRAL_MINUTOS} min`,
        html: resumenHtml
    });
};

module.exports = {
    UMBRAL_MINUTOS,
    UMBRAL_SEGUNDOS,
    calcularDuracionEnMinutos,
    obtenerTareasConEjecucionMayorOIgualHora,
    construirResumenSistemasCaidos,
    enviarAlertaCronCaido,
    enviarAlertaTareaLenta,
    enviarResumenSistemasCaidos
};