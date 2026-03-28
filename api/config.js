export default function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_KEY;
  if (!url || !key) {
    return res.status(500).json({ error: "Config manquante" });
  }
  res.json({ url, key });
}
