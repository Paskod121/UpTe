export default function handler(req, res) {
    res.json({
      url: process.env.VITE_SUPABASE_URL,
      key: process.env.VITE_SUPABASE_KEY,
    });
  }