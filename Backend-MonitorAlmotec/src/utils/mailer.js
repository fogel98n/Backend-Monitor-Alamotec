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

module.exports = { enviarAlertaCronCaido };
