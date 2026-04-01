const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Initialize Firebase Admin
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = getFirestore();

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { event, payload } = req.body;

    if (event === "invitee.created") {
      const invitee = payload.invitee;
      const scheduledEvent = payload.scheduled_event;

      // Extract data
      const appointmentData = {
        patientEmail: invitee.email,
        patientName: invitee.name,
        date: scheduledEvent.start_time,
        endTime: scheduledEvent.end_time,
        status: "confirmed",
        calendlyEventUri: scheduledEvent.uri,
        calendlyInviteeUri: invitee.uri,
        createdAt: new Date(),
      };

      // Save to Firestore under the patient's email
      const appointmentsRef = db.collection("appointments");
      await appointmentsRef.add(appointmentData);

      console.log("Cita guardada:", appointmentData.patientEmail);
      return res.status(200).json({ success: true });
    }

    if (event === "invitee.canceled") {
      const invitee = payload.invitee;
      // Find and update the appointment
      const snapshot = await db.collection("appointments")
        .where("calendlyInviteeUri", "==", invitee.uri)
        .get();

      snapshot.forEach(doc => {
        doc.ref.update({ status: "cancelled" });
      });

      return res.status(200).json({ success: true });
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: error.message });
  }
};
