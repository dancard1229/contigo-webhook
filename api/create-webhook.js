const CALENDLY_TOKEN = "eyJraWQiOiIxY2UxZTEzNjE3ZGNmNzY2YjNjZWJjY2Y4ZGM1YmFmYThhNjVlNjg0MDIzZjdjMzJiZTgzNDliMjM4MDEzNWI0IiwidHlwIjoiUEFUIiwiYWxnIjoiRVMyNTYifQ.eyJpc3MiOiJodHRwczovL2F1dGguY2FsZW5kbHkuY29tIiwiaWF0IjoxNzc1MjMxOTYxLCJqdGkiOiIyZGM1NTNlZC02ZjdkLTQ0YTgtYjg1Zi1hZWRiMzdhZGM3YTgiLCJ1c2VyX3V1aWQiOiI3MDIyNDFjMS1lMmUwLTRkYmEtOGNiYy0wZmQ1MTgxY2EyNmYiLCJzY29wZSI6ImF2YWlsYWJpbGl0eTpyZWFkIGF2YWlsYWJpbGl0eTp3cml0ZSBldmVudF90eXBlczpyZWFkIGV2ZW50X3R5cGVzOndyaXRlIGxvY2F0aW9uczpyZWFkIHJvdXRpbmdfZm9ybXM6cmVhZCBzaGFyZXM6d3JpdGUgc2NoZWR1bGVkX2V2ZW50czpyZWFkIHNjaGVkdWxlZF9ldmVudHM6d3JpdGUgc2NoZWR1bGluZ19saW5rczp3cml0ZSBncm91cHM6cmVhZCBvcmdhbml6YXRpb25zOnJlYWQgb3JnYW5pemF0aW9uczp3cml0ZSB1c2VyczpyZWFkIGFjdGl2aXR5X2xvZzpyZWFkIGRhdGFfY29tcGxpYW5jZTp3cml0ZSBvdXRnb2luZ19jb21tdW5pY2F0aW9uczpyZWFkIHdlYmhvb2tzOnJlYWQgd2ViaG9va3M6d3JpdGUifQ.vqI8s0ln83Czv5gcDSNYWNkFoEHz_q3Qj-oTgVhpLUAOi3dyMpEMRK83E5JBXSG2wm6sbhN3d1k_SmguMqYbJw";

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  try {
    // First check existing webhooks
    const listRes = await fetch(
      "https://api.calendly.com/webhook_subscriptions?organization=https://api.calendly.com/organizations/f9fffc53-0627-4341-b67f-d7bf62c218be&scope=organization",
      { headers: { Authorization: "Bearer " + CALENDLY_TOKEN } }
    );
    const listData = await listRes.json();

    if (req.method === "GET") {
      return res.status(200).json({ existing: listData });
    }

    // Create webhook
    const createRes = await fetch("https://api.calendly.com/webhook_subscriptions", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + CALENDLY_TOKEN,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        url: "https://contigo-webhook.vercel.app/api/calendly-webhook",
        events: ["invitee.created", "invitee.canceled"],
        organization: "https://api.calendly.com/organizations/f9fffc53-0627-4341-b67f-d7bf62c218be",
        user: "https://api.calendly.com/users/702241c1-e2e0-4dba-8cbc-0fd5181ca26f",
        scope: "user"
      })
    });
    const createData = await createRes.json();
    return res.status(200).json({ result: createData });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
