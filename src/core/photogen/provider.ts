// The single seam between photogen's recipes and the underlying AI service.
// Recipes build a prompt; the provider turns (image + prompt) into a new image.
// Swapping AI vendors later = a new class implementing this interface, with the
// recipes untouched.
import type { ImageBytes } from './types';

export interface ImageGenProvider {
  /**
   * Edit a single source image per the prompt, returning the generated image
   * bytes (decoded, ready to write). Throws on a missing image in the response
   * or a provider error.
   */
  editImage(image: ImageBytes, prompt: string): Promise<Buffer>;
}
