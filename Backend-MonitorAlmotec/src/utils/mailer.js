const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

const enviarAlertaCronCaido = async (nombreSistema, tareasCaidas) => {
    const listaHtml = tareasCaidas
        .map(t => `<li>${t.name} (frecuencia: ${t.frequency}s)</li>`)
        .join('');

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERTA_EMAIL_TO,
        subject: `Cron caido en ${nombreSistema}`,
        html: `<p>Se detecto que el/los siguiente(s) cron task(s) estan caidos (status 2) en <strong>${nombreSistema}</strong>:</p><ul>${listaHtml}</ul>`
    });
};

const enviarAlertaTareaLenta = async (nombreSistema, tareasLentas) => {
    const listaHtml = tareasLentas
        .map(t => {
            const minutos = Math.floor((Math.floor(Date.now() / 1000) - t.laststart) / 60);
            return `<li>${t.name} - corriendo hace ${minutos} minutos sin terminar</li>`;
        })
        .join('');

    await transporter.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.ALERTA_EMAIL_TO,
        subject: `Tarea sin terminar hace mas de 30 min en ${nombreSistema}`,
        html: `<p>La(s) siguiente(s) tarea(s) llevan corriendo mas de 30 minutos sin marcar fin en <strong>${nombreSistema}</strong>:</p><ul>${listaHtml}</ul>`
    });
};

module.exports = { enviarAlertaCronCaido, enviarAlertaTareaLenta };