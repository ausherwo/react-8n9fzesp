// api/signup.js
// Vercel serverless function — writes signup to Airtable netwrkr-signups base

const AIRTABLE_BASE_ID = "appW57yuA3qaoLCPK";
const AIRTABLE_TABLE = "signups";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { firstName, lastName, email, title, company, source } = req.body;

  if (!email) {
    return res.status(400).json({ error: "Email is required" });
  }

  const apiKey = process.env.AIRTABLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Airtable API key not configured" });
  }

  try {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        typecast: true,
        records: [{
          fields: {
            "First Name": firstName || "",
            "Last Name": lastName || "",
            "Email": email,
            "Title": title || "",
            "Company": company || "",
            "Source": source || "gate",
            "Date Created": new Date().toISOString().split("T")[0],
          }
        }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Airtable error:", err);
      return res.status(500).json({ error: "Failed to save signup", detail: err });
    }

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error("Signup error:", err.message);
    return res.status(500).json({ error: err.message });
  }
}