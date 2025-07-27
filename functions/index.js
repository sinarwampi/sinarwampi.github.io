const functions = require("firebase-functions");
const fetch = require("node-fetch");

exports.ringkasan = functions.https.onRequest(async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  const { kelas, mapel, bab, subbab } = req.body;
  const prompt = `Buatkan ringkasan materi ${kelas} ${mapel} ${bab} ${subbab} sesuai kurikulum merdeka sekolah dasar. Hasilkan ringkasan dalam 3 sampai 4 paragraf. Jika ada poin atau istilah yang penting, tolong beri tanda tebal (gunakan **teks tebal**). Setelah menuliskan poin penting tersebut, uraikan lagi secara lebih jelas dan detail agar mudah dipahami anak SD. Jawab hanya dalam bahasa Indonesia. Hindari penggunaan bullet point, nomor urut, heading (seperti #, ##), tanda khusus seperti +, *, -, atau garis bawah (_), kecuali untuk penebalan. Fokus pada narasi paragraf saja.`;

  const GEMINI_API_KEY = functions.config().gemini.key;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ ringkasan: "Server error: Gemini API Key is not configured." });
  }

  try {
    const geminiRes = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );
    const geminiData = await geminiRes.json();
    let ringkasan = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "Ringkasan tidak tersedia.";

    // Pembersihan hasil (seperti sebelumnya)
    ringkasan = ringkasan.replace(/__/g, "");
    ringkasan = ringkasan.replace(/\*/g, "");
    ringkasan = ringkasan.replace(/_/g, "");
    ringkasan = ringkasan.replace(/`/g, "");
    ringkasan = ringkasan.replace(/^#+\s*/gm, "");
    ringkasan = ringkasan.replace(/^[*-+]\s*/gm, "");
    ringkasan = ringkasan.replace(/^\s*\d+\.\s*/gm, "");
    ringkasan = ringkasan.replace(/\s{2,}/g, " ");
    ringkasan = ringkasan.replace(/(\r\n|\r|\n)+/g, "@@NEWLINE@@");
    ringkasan = ringkasan
      .split("@@NEWLINE@@")
      .map((p) => p.trim())
      .filter((p) => p.length > 0)
      .join("\n\n");
    ringkasan = ringkasan.trim();

    res.json({ ringkasan });
  } catch (e) {
    console.error("Error fetching from Gemini:", e);
    res.status(500).json({ ringkasan: "Gagal mengambil ringkasan dari Gemini AI." });
  }
});