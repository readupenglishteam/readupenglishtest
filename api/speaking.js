import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY_SPEAKING });

export default async function handler(req, res) {
  // 1. Thiết lập Header CORS ngay đầu hàm
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. Trả về kết quả 200/204 ngay lập tức nếu trình duyệt gửi request OPTIONS (Preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { question, topic, part, band } = req.body;

  const systemInstruction = `Bạn là giám khảo IELTS Speaking chuyên nghiệp. Người dùng cần gợi ý trả lời IELTS Speaking ${part} ở mục tiêu ${band}.
Yêu cầu theo từng Part:
- Part 1: Trả lời 3-4 câu ngắn gọn, tự nhiên, đúng trọng tâm.
- Part 2: Phân tích ý tưởng và bài mẫu có liên kết câu chuyện mạch lạc.
- Part 3: Thảo luận mang tính xã hội, tổng quan, ứng dụng mô hình R+E+E (Response + Explanation + Example), từ vựng thuộc dải Band ${band}.`;

  const promptContent = topic 
    ? `Chủ đề lớn: ${topic}\nCâu hỏi: ${question}` 
    : `Câu hỏi: ${question}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: promptContent,
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
    return res.status(500).json({ error: 'Failed to process speaking request' });
  }
}
