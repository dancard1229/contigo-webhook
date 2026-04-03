const CALENDLY_TOKEN = "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc1MjI5OTgxLCJqdGkiOiI0N2VjNTM0My1jNmI3LTRkNzItYmUzMS00MzYwZDk2NTljMzQiLCJ1c2VyX3V1aWQiOiI3MDIyNDFjMS1lMmUwLTRkYmEtOGNiYy0wZmQ1MTgxY2EyNmYiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSB3ZWJob29rczp3cml0ZSB3ZWJob29rczpyZWFkIn0.soxXeexwHEkeST3DNmB5BsfgkzYz6Hbgz8zR4zoeIWKzEQoWw_v4CxAAOAqnZjkoxsdn1KIdYVZdQ_cuCiOYiQ";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  if (req.method === "OPTIONS") return res.status(200).end();

  const { email } = req.query;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  try {
    // Get user info
    const userRes = await fetch("https://api.calendly.com/users/me", {
      headers: { Authorization: "Bearer " + CALENDLY_TOKEN }
    });
    const userData = await userRes.json();
    
    // Show full user data for debugging
    if (email === "debug") {
      return res.status(200).json({ userData });
    }

    const orgUri = userData.resource && userData.resource.current_organization;
    const userUri = userData.resource && userData.resource.uri;

    // Try invitee_email filter directly
    const eventsRes = await fetch(
      "https://api.calendly.com/scheduled_events?organization=" + encodeURIComponent(orgUri) + "&invitee_email=" + encodeURIComponent(email) + "&status=active&count=100",
      { headers: { Authorization: "Bearer " + CALENDLY_TOKEN } }
    );
    const eventsData = await eventsRes.json();
    const allEvents = eventsData.collection || [];

    const appointments = allEvents.map(function(event) {
      return {
        id: event.uri,
        date: event.start_time,
        endTime: event.end_time,
        status: "confirmed",
        name: event.name || "Consulta psicológica",
        doctor: "Dr. Daniel Cardona",
        duration: Math.round((new Date(event.end_time) - new Date(event.start_time)) / 60000)
      };
    });

    return res.status(200).json({ 
      appointments,
      debug: { totalEvents: allEvents.length, orgUri, userUri, error: eventsData.message }
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
