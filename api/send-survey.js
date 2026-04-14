export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { patientEmail, patientName, sessionDate } = req.body;

  if (!patientEmail) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  const surveyUrl = `https://contigodelamano.com/app.html?survey=true&email=${encodeURIComponent(patientEmail)}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'Contigo de la Mano <danielcardona@contigodelamano.com>',
        to: patientEmail,
        subject: '¿Cómo te pareció tu sesión? 💙',
        html: `
          <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f9f7f4;">
            <img src="https://contigodelamano.com/logo.png" alt="Contigo de la Mano" style="width: 80px; margin-bottom: 24px;" />
            <h2 style="color: #3d2c1e; font-size: 22px; margin-bottom: 8px;">Hola, ${patientName || 'te escribimos desde Contigo de la Mano'} 👋</h2>
            <p style="color: #6b5744; font-size: 16px; line-height: 1.6;">Gracias por tu sesión del <strong>${sessionDate || 'hoy'}</strong>. Nos importa mucho tu experiencia.</p>
            <p style="color: #6b5744; font-size: 16px; line-height: 1.6;">¿Nos regalas un momento para contarnos cómo te pareció?</p>
            <a href="${surveyUrl}" style="display: inline-block; margin-top: 16px; padding: 14px 28px; background: linear-gradient(135deg, #7a9e82, #5a7a62); color: white; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">Calificar mi sesión ⭐</a>
            <p style="color: #a0887a; font-size: 13px; margin-top: 32px;">Contigo de la Mano · <a href="https://contigodelamano.com" style="color: #7a9e82;">contigodelamano.com</a></p>
          </div>
        `
      })
    });

    const data = await response.json();
    if (data.id) {
      res.status(200).json({ success: true });
    } else {
      res.status(500).json({ error: 'Error al enviar email', details: data });
    }
  } catch (error) {
    res.status(500).json({ error: 'Error de conexión', details: error.message });
  }
}
