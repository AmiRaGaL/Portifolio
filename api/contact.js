// api/contact.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, message, title, time, company } = req.body || {};

    // Honeypot check
    if (company) {
      return res.status(200).json({ ok: true }); // silently succeed for bots
    }

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Prepare EmailJS REST payload
    const service_id = process.env.EMAILJS_SERVICE_ID;
    const template_id = process.env.EMAILJS_TEMPLATE_ID;
    const private_key = process.env.EMAILJS_PRIVATE_KEY; // server-only
    const public_key = process.env.EMAILJS_PUBLIC_KEY;   // optional if your EmailJS setup needs it

    if (!service_id || !template_id || !private_key) {
      return res.status(500).json({ error: "Email service not configured" });
    }

    const payload = {
      service_id,
      template_id,
      user_id: public_key || undefined, // some setups still require it
      accessToken: private_key,         // EmailJS REST API uses private key
      template_params: {
        from_name: name,
        from_email: email,
        message,
        form_title: title || "Contact from Portfolio Site",
        submitted_at: time || new Date().toISOString(),
      },
    };

    // Call EmailJS REST API
    const resp = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return res.status(502).json({ error: "Email service failed", detail: text });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
