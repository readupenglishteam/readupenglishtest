export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Chưa cài đặt GEMINI_API_KEY trên Vercel Environment Variables!' });
  }

  const { question, topic, part, band } = req.body;
  const promptContent = topic 
    ? `Chủ đề lớn: ${topic}\nCâu hỏi: ${question}` 
    : `Câu hỏi: ${question}`;

  const systemInstruction = `Bạn là giám khảo IELTS Speaking chuyên nghiệp. Gợi ý trả lời IELTS Speaking ${part} dải điểm target ${band}.
Yêu cầu:
- Part 1: Trả lời 3-4 câu ngắn gọn, tự nhiên.
- Part 2: Phân tích ý tưởng và bài mẫu kể chuyện mạch lạc.
- Part 3: Phân tích góc nhìn xã hội, mô hình R+E+E (Response + Explanation + Example), dùng từ vựng Band ${band}.`;

  try {
    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    
    const apiResponse = await fetch(geminiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptContent }] }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              structure_ree: {
                type: "OBJECT",
                properties: {
                  response: { type: "STRING" },
                  explanation: { type: "STRING" },
                  example: { type: "STRING" }
                },
                required: ["response", "explanation", "example"]
              },
              vocabulary: {
                type: "ARRAY",
                items: {
                  type: "OBJECT",
                  properties: {
                    word: { type: "STRING" },
                    meaning: { type: "STRING" },
                    band: { type: "STRING" }
                  },
                  required: ["word", "meaning", "band"]
                }
              },
              sample_answer: { type: "STRING" }
            },
            required: ["structure_ree", "vocabulary", "sample_answer"]
          }
        }
      })
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      return res.status(apiResponse.status).json({ error: `Gemini API Error: ${errText}` });
    }

    const data = await apiResponse.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!rawText) throw new Error("Không nhận được phản hồi từ Gemini API");

    return res.status(200).json(JSON.parse(rawText));
  } catch (error) {
    console.error('Backend Processing Error:', error);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
}
