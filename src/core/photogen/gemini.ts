// GeminiProvider — the only ImageGenProvider implementation today. Wraps
// @google/genai's image-capable model (gemini-2.5-flash-image, a.k.a.
// nano-banana). SERVER-ONLY (network + API key). To swap vendors, add another
// class implementing ImageGenProvider; the recipes never change.
import { GoogleGenAI } from '@google/genai';
import type { ImageGenProvider } from './provider';
import type { ImageBytes } from './types';

const MODEL = 'gemini-2.5-flash-image';

// The model edits images via a multimodal generateContent call: the prompt text
// plus the source image as inline base64. The edited image comes back as an
// inlineData part, which we decode to a Buffer.
export class GeminiProvider implements ImageGenProvider {
  private readonly apiKey: string;

  constructor(apiKey = process.env.GEMINI_API_KEY) {
    // Fail loudly and early, mirroring the ADMIN_SESSION_SECRET guard — a silent
    // empty key would surface as an opaque 400 from Google deep in a request.
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY не задан. Добавьте его в .env.local (dev) или .env (prod) — ' +
          'ключ Gemini для генерации фото в админке.',
      );
    }
    this.apiKey = apiKey;
  }

  async editImage(image: ImageBytes, prompt: string): Promise<Buffer> {
    const ai = new GoogleGenAI({ apiKey: this.apiKey });
    const base64 = Buffer.from(image).toString('base64');

    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            // mimeType is advisory; the model sniffs the actual format. webp is
            // what our store produces and what these sources will be.
            { inlineData: { mimeType: 'image/webp', data: base64 } },
          ],
        },
      ],
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.data);
    if (!imagePart?.inlineData?.data) {
      // No image came back — usually a safety block or a refusal. Surface any
      // text the model returned so the admin sees why.
      const text = parts
        .map((p) => p.text)
        .filter(Boolean)
        .join(' ')
        .trim();
      throw new Error(
        `Gemini не вернул изображение${text ? `: ${text}` : '. Попробуйте другой исходник или повторите.'}`,
      );
    }
    return Buffer.from(imagePart.inlineData.data, 'base64');
  }
}
