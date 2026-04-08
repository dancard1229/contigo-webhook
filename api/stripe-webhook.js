const PRICE_INDIVIDUAL = "price_1TJnG6DPHdGGTGJ9ZIY5BQEU";
const PRICE_2SESSIONS  = "price_1TJnJkDPHdGGTGJ992cblRsh";
const PRICE_3SESSIONS  = "price_1TJnKVDPHdGGTGJ9JSlDUISY";

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
    }),
  });
}

const db = admin.firestore();

function getPlanInfo(priceId) {
  if (priceId === PRICE_INDIVIDUAL) return { sessions: 1, days: 30, name: "Sesión individual" };
  if (priceId === PRICE_2SESSIONS)  return { sessions: 2, days: 60, name: "Paquete 2 sesiones" };
  if (priceId === PRICE_3SESSIONS)  return { sessions: 3, days: 90, name: "Paquete 3 sesiones" };
  return null;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const event = req.body;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_details && session.customer_details.email;
      const priceId = session.metadata && session.metadata.priceId;
      const plan = getPlanInfo(priceId);

      if (!customerEmail || !plan) return res.status(200).json({ received: true });

      const usersSnap = await db.collection("users").where("email", "==", customerEmail).get();
      if (usersSnap.empty) return res.status(200).json({ received: true });

      const userDoc = usersSnap.docs[0];
      const currentData = userDoc.data();
      const now = new Date();
      const expiry = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);
      const currentSessions = currentData.sesionesDisponibles || 0;

      await userDoc.ref.update({
        sesionesDisponibles: currentSessions + plan.sessions,
        sesionesVencimiento: expiry.toISOString(),
        ultimoPlan: plan.name,
        ultimaCompra: now.toISOString(),
      });

      await db.collection("payments").add({
        patientEmail: customerEmail,
        patientId: userDoc.id,
        plan: plan.name,
        sessions: plan.sessions,
        amount: session.amount_total / 100,
        currency: session.currency,
        stripeSessionId: session.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
