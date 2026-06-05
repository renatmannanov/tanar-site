// FakeProvider — a deterministic ImageGenProvider for tests. Returns the source
// bytes unchanged (a tiny valid image stays a valid image through sharp), so
// e2e can exercise the full action → upload → gallery flow without calling
// Gemini (cost + flakiness). Activated via PHOTOGEN_FAKE=1 (see index.ts).
import type { ImageGenProvider } from './provider';
import type { ImageBytes } from './types';

export class FakeProvider implements ImageGenProvider {
  async editImage(image: ImageBytes): Promise<Buffer> {
    // Echo the source through — the upload pipeline (sharp → webp) still runs,
    // proving the wiring without a real generation.
    return Buffer.from(image);
  }
}
