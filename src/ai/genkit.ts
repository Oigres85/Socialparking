import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

/**
 * Inizializzazione di Genkit con il plugin Google AI.
 * Questo oggetto 'ai' viene utilizzato per definire flussi e prompt nell'applicazione.
 */
export const ai = genkit({
  plugins: [googleAI()],
});
