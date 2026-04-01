const CALENDLY_TOKEN = "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc0OTkyNDg2LCJqdGkiOiI0NTg2MjUzMy1mOTlmLTRiODAtYmNkOC00MjcyMjM2MGI1ODMiLCJ1c2VyX3V1aWQiOiI3MDIyNDFjMS1lMmUwLTRkYmEtOGNiYy0wZmQ1MTgxY2EyNmYiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSJ9.HPFSlGABmUKUDfvURBVt4dvwJRETcAoU5O9zYpDvMyrDwB9pompwJf0SFa-oepjGCZh3fd2BnVl6Fi8PG_Ob5Q";

module.exports = async (req, res) => {
  // Allow CORS
  res.setHeader("Access-Control-Allow-Origin", "https://contigodelamano.com");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  try {
    // Get user info first
    const userRes = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` }
    });
    const userData = await userRes.json();
    const orgUri = userData.resource?.current_organization;
    const userUri = userData.resource?.uri;

    // Get scheduled events for this invitee email
    const eventsRes = await fetch(
      `https://api.calendly.com/scheduled_events?organization=${encodeURIComponent(orgUri)}&invitee_email=${encodeURIComponent(email)}&status=active&count=20`,
      { headers: { Authorization: `Bearer ${CALENDLY_TOKEN}` } }
    );
    const eventsData = await eventsRes.json();
    const events = eventsData.collection || [];

    // Format appointments
    const appointments = events.map(event => ({
      id: event.uri,
      date: event.start_time,
      endTime: event.end_time,
      status: event.status === "active" ? "confirmed" : "cancelled",
      name: event.name || "Consulta psicológica",
      doctor: "Dr. Daniel Cardona",
      avatar: "DC",
      color: "#1565C0",
      duration: Math.round((new Date(event.end_time) - new Date(event.start_time)) / 60000)
    }));

    return res.status(200).json({ appointments });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }
};
