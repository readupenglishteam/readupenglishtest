import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export default async function handler(req, res) {
  // Bật CORS để cho phép gọi API từ frontend
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, part, band } = req.body;

  const systemInstruction = `Bạn là giám khảo IELTS Speaking chuyên nghiệp. Người dùng cần gợi ý trả lời IELTS Speaking ${part} với mục tiêu ${band}.
Quy tắc trả lời:
- Part 1: Trả lời 3-4 câu ngắn gọn, tự nhiên, đi thẳng vào vấn đề.
- Part 2: Dàn ý 5W1H ngắn gọn và câu trả lời mẫu có liên kết câu chuyện.
- Part 3: Phân tích sâu, góc nhìn xã hội, sử dụng mô hình Response + Explanation + Example (R+E+E) và từ nối Academic.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Câu hỏi: "${question}"`,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            brainstorm: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            structure_ree: {
              type: Type.OBJECT,
              properties: {
                response: { type: Type.STRING },
                explanation: { type: Type.STRING },
                example: { type: Type.STRING }
              },
              required: ['response', 'explanation', 'example']
            },
            vocabulary: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  band: { type: Type.STRING }
                },
                required: ['word', 'meaning', 'band']
              }
            },
            sample_answer: { type: Type.STRING }
          },
          required: ['structure_ree', 'vocabulary', 'sample_answer']
        }
      }
    });

    const result = JSON.parse(response.text);
    return res.status(200).json(result);
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Failed to process request' });
  }
}
