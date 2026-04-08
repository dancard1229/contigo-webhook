const PRICE_INDIVIDUAL = "price_1TJnG6DPHdGGTGJ9ZIY5BQEU";
const PRICE_2SESSIONS  = "price_1TJnJkDPHdGGTGJ992cblRsh";
const PRICE_3SESSIONS  = "price_1TJnKVDPHdGGTGJ9JSlDUISY";
const FIREBASE_PROJECT = "contigo-de-la-mano-dd63f";

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
    console.log("Event type:", event.type);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_details && session.customer_details.email;
      const priceId = session.metadata && session.metadata.priceId;
      
      console.log("Customer email:", customerEmail);
      console.log("Price ID:", priceId);
      
      const plan = getPlanInfo(priceId);
      console.log("Plan:", plan);

      if (!customerEmail || !plan) {
        console.log("Missing email or plan - returning");
        return res.status(200).json({ received: true, note: "missing email or plan" });
      }

      const apiKey = process.env.FIREBASE_API_KEY;
      const projectId = FIREBASE_PROJECT;
      
      console.log("API Key exists:", !!apiKey);

      const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
      
      const queryBody = {
        structuredQuery: {
          from: [{ collectionId: "users" }],
          where: {
            fieldFilter: {
              field: { fieldPath: "email" },
              op: "EQUAL",
              value: { stringValue: customerEmail }
            }
          },
          limit: 1
        }
      };

      const queryRes = await fetch(queryUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(queryBody)
      });

      const queryData = await queryRes.json();
      console.log("Query result:", JSON.stringify(queryData[0] ? "found" : "not found"));
      
      if (!queryData || !queryData[0] || !queryData[0].document) {
        console.log("User not found for email:", customerEmail);
        return res.status(200).json({ received: true, note: "user not found" });
      }

      const userDoc = queryData[0].document;
      const userId = userDoc.name.split("/").pop();
      const currentSessions = userDoc.fields && userDoc.fields.sesionesDisponibles ? 
        parseInt(userDoc.fields.sesionesDisponibles.integerValue || 0) : 0;

      console.log("User ID:", userId, "Current sessions:", currentSessions);

      const now = new Date();
      const expiry = new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000);

      const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?key=${apiKey}&updateMask.fieldPaths=sesionesDisponibles&updateMask.fieldPaths=sesionesVencimiento&updateMask.fieldPaths=ultimoPlan&updateMask.fieldPaths=ultimaCompra`;

      const updateRes = await fetch(updateUrl, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            sesionesDisponibles: { integerValue: currentSessions + plan.sessions },
            sesionesVencimiento: { stringValue: expiry.toISOString() },
            ultimoPlan: { stringValue: plan.name },
            ultimaCompra: { stringValue: now.toISOString() }
          }
        })
      });

      const updateData = await updateRes.json();
      console.log("Update status:", updateRes.status);

      if (updateRes.status !== 200) {
        console.log("Update error:", JSON.stringify(updateData));
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.log("Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
