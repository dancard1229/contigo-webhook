export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const admin = await import('firebase-admin');
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
      });
    }

    const db = admin.firestore();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);

    // Get all users with sessions available
    const usersSnap = await db.collection('users').where('sesionesDisponibles', '>', 0).get();
    
    let emailsSent = 0;

    for (const userDoc of usersSnap.docs) {
      const user = userDoc.data();
      if (!user.email) continue;

      // Check last appointment
      const aptsSnap = await db.collection('users').doc(userDoc.id)
        .collection('appointments').orderBy('date', 'desc').limit(1).get();
      
      let lastDate = user.createdAt?.toDate() || new Date(0);
      if (!aptsSnap.empty) {
        lastDate = aptsSnap.docs[0].data().date?.toDate() || lastDate;
      }

      if (lastDate < cutoff) {
        // Send reminder email
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
          },
          body: JSON.stringify({
            from: 'Contigo de la Mano <danielcardona@contigodelamano.com>',
            to: user.email,
            subject: 'Tienes sesiones disponibles esperándote 💙',
            html: `
              <div style="font-family: Georgia, serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #f9f7f4;">
                <img src="https://contigodelamano.com/logo.png" alt="Contigo de la Mano" style="width: 80px; margin-bottom: 24px;" />
                <h2 style="color: #3d2c1e; font-size: 22px; margin-bottom: 8px;">Hola, ${user.name || 'te escribimos'} 👋</h2>
                <p style="color: #6b5744; font-size: 16px; line-height: 1.6;">Han pasado algunos días desde tu última sesión. Queremos recordarte que tienes <strong>${user.sesionesDisponibles} sesión${user.sesionesDisponibles > 1 ? 'es' : ''} disponible${user.sesionesDisponibles > 1 ? 's' : ''}</strong> esperándote.</p>
                <p style="color: #6b5744; font-size: 16px; line-height: 1.6;">Agendar solo toma un momento — estamos aquí cuando estés listo.</p>
                <a href="https://contigodelamano.com/app.html" style="display: inline-block; margin-top: 16px; padding: 14px 28px; background: linear-gradient(135deg, #7a9e82, #5a7a62); color: white; text-decoration: none; border-radius: 12px; font-size: 16px; font-weight: 600;">Agendar mi sesión →</a>
                <p style="color: #a0887a; font-size: 13px; margin-top: 32px;">Contigo de la Mano · <a href="https://contigodelamano.com" style="color: #7a9e82;">contigodelamano.com</a></p>
              </div>
            `
          })
        });
        emailsSent++;
      }
    }

    res.status(200).json({ success: true, emailsSent });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
