
const ALLOWED_ORIGINS = [
  "https://contigodelamano.com",
  "https://www.contigodelamano.com"
];

function setCORS(req, res) {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  setCORS(req, res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { priceId, customerEmail, successUrl, cancelUrl } = req.body;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      customer_email: customerEmail,
      success_url: successUrl || "https://contigodelamano.com/app.html?payment=success",
      cancel_url: cancelUrl || "https://contigodelamano.com/app.html?payment=cancelled",
      metadata: { priceId: priceId },
    });

    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
