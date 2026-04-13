export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const response = await fetch('https://api.daily.co/v1/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DAILY_API_KEY}`
      },
      body: JSON.stringify({
        properties: { exp, enable_chat: true, max_participants: 2 }
      })
    });
    const data = await response.json();
    res.status(200).json({ url: data.url });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo crear la sala' });
  }
}
