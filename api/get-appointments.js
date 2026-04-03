const CALENDLY_TOKEN = "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc1MjMxOTYxLCJqdGkiOiIyZGM1NTNlZC02ZjdkLTQ0YTgtYjg1Zi1hZWRiMzdhZGM3YTgiLCJ1c2VyX3V1aWQiOiI3MDIyNDFjMS1lMmUwLTRkYmEtOGNiYy0wZmQ1MTgxY2EyNmYiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.vqI8s0ln83Czv5gcDSNYWNkFoEHz_q3Qj-oTgVhpLUAOi3dyMpEMRK83E5JBXSG2wm6sbhN3d1k_SmguMqYbJw";
const DOCTOR_EMAIL = "dan.card1229@gmail.com";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  try {
    const userRes = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: "Bearer " + CALENDLY_TOKEN }
    });
    const userData = await userRes.json();
    const orgUri = userData.resource && userData.resource.current_organization;

    if (email === "debug") {
      return res.status(200).json({ orgUri });
    }

    const isDoctor = email.toLowerCase() === DOCTOR_EMAIL.toLowerCase();
    let url = "https://api.calendly.com/scheduled_events?organization=" + encodeURIComponent(orgUri) + "&status=active&count=100";
    if (!isDoctor) {
      url += "&invitee_email=" + encodeURIComponent(email);
    }

    const eventsRes = await fetch(url, { headers: { Authorization: "Bearer " + CALENDLY_TOKEN } });
    const eventsData = await eventsRes.json();
    const allEvents = eventsData.collection || [];

    const appointments = [];
    for (const event of allEvents) {
      let patientName = "Paciente";
      let patientEmail = "";
      let cancelUrl = null;

      try {
        const invRes = await fetch(event.uri + "/invitees", {
          headers: { Authorization: "Bearer " + CALENDLY_TOKEN }
        });
        const invData = await invRes.json();
        if (invData.collection && invData.collection.length > 0) {
          const inv = invData.collection[0];
          patientName = inv.name || "Paciente";
          patientEmail = inv.email || "";
          cancelUrl = inv.cancel_url || null;
        }
      } catch(e) {}

      appointments.push({
        id: event.uri,
        date: event.start_time,
        endTime: event.end_time,
        status: "confirmed",
        name: isDoctor ? patientName : (event.name || "Consulta psicologica"),
        patientName: patientName,
        patientEmail: patientEmail,
        cancelUrl: cancelUrl,
        doctor: "Dr. Daniel Cardona",
        duration: Math.round((new Date(event.end_time) - new Date(event.start_time)) / 60000)
      });
    }

    return res.status(200).json({ appointments: appointments });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
