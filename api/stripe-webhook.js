onst FIREBASE_PROJECT = "contigo-de-la-mano-dd63f";

async function findAndUpdateUser(email, sessionsDelta, apiKey) {
  const projectId = FIREBASE_PROJECT;
  const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

  const queryRes = await fetch(queryUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "email" },
            op: "EQUAL",
            value: { stringValue: email }
          }
        },
        limit: 1
      }
    })
  });

  const queryData = await queryRes.json();
  if (!queryData || !queryData[0] || !queryData[0].document) {
    console.log("User not found:", email);
    return false;
  }

  const userDoc = queryData[0].document;
  const userId = userDoc.name.split("/").pop();
  const currentSessions = userDoc.fields && userDoc.fields.sesionesDisponibles ?
    parseInt(userDoc.fields.sesionesDisponibles.integerValue || 0) : 0;

  const newSessions = Math.max(0, currentSessions + sessionsDelta);

  const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?key=${apiKey}&updateMask.fieldPaths=sesionesDisponibles`;

  await fetch(updateUrl, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        sesionesDisponibles: { integerValue: newSessions }
      }
    })
  });

  console.log(`Updated ${email}: ${currentSessions} -> ${newSessions}`);
  return true;
}

function getSessionsByAmount(amount) {
  if (amount === 4500) return 1;
  if (amount === 7600) return 2;
  if (amount === 9900) return 3;
  return 0;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const event = req.body;
    const apiKey = process.env.FIREBASE_API_KEY;
    console.log("Event type:", event.type);

    // Payment completed - add sessions
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_details && session.customer_details.email;
      const amount = session.amount_total;
      const sessions = getSessionsByAmount(amount);

      console.log("Payment - email:", customerEmail, "amount:", amount, "sessions:", sessions);

      if (customerEmail && sessions > 0) {
        const now = new Date();
        const planInfo = {
          4500: { days: 30, name: "Sesión individual" },
          7600: { days: 60, name: "Paquete 2 sesiones" },
          9900: { days: 90, name: "Paquete 3 sesiones" }
        };
        const plan = planInfo[amount];
        const expiry = plan ? new Date(now.getTime() + plan.days * 24 * 60 * 60 * 1000) : null;

        const projectId = FIREBASE_PROJECT;
        const queryUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;

        const queryRes = await fetch(queryUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            structuredQuery: {
              from: [{ collectionId: "users" }],
              where: { fieldFilter: { field: { fieldPath: "email" }, op: "EQUAL", value: { stringValue: customerEmail } } },
              limit: 1
            }
          })
        });

        const queryData = await queryRes.json();
        if (queryData && queryData[0] && queryData[0].document) {
          const userDoc = queryData[0].document;
          const userId = userDoc.name.split("/").pop();
          const currentSessions = userDoc.fields && userDoc.fields.sesionesDisponibles ?
            parseInt(userDoc.fields.sesionesDisponibles.integerValue || 0) : 0;

          const updateFields = {
            sesionesDisponibles: { integerValue: currentSessions + sessions },
            ultimoPlan: { stringValue: plan ? plan.name : "Plan" },
            ultimaCompra: { stringValue: now.toISOString() }
          };
          if (expiry) updateFields.sesionesVencimiento = { stringValue: expiry.toISOString() };

          const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${userId}?key=${apiKey}&updateMask.fieldPaths=sesionesDisponibles&updateMask.fieldPaths=sesionesVencimiento&updateMask.fieldPaths=ultimoPlan&updateMask.fieldPaths=ultimaCompra`;

          await fetch(updateUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fields: updateFields })
          });

          console.log("Sessions added:", currentSessions, "->", currentSessions + sessions);
        }
      }
    }

    // Refund - remove sessions
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      const customerEmail = charge.billing_details && charge.billing_details.email;
      const amount = charge.amount_refunded;
      const sessions = getSessionsByAmount(amount);

      console.log("Refund - email:", customerEmail, "amount:", amount, "sessions to remove:", sessions);

      if (customerEmail && sessions > 0) {
        await findAndUpdateUser(customerEmail, -sessions, apiKey);
      }
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.log("Error:", error.message);
    return res.status(500).json({ error: error.message });
  }
};
