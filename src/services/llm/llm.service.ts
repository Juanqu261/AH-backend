import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/utils/logger';

export interface PrincipalNotes {
    top?: string;
    heart?: string;
    base?: string;
}

export class LlmService {
    private anthropic: Anthropic;
    private initialized: boolean = false;

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            logger.warn('ANTHROPIC_API_KEY is not set. LLM features will be disabled.');
            this.anthropic = new Anthropic({ apiKey: 'dummy' }); // Create dummy client if missing
        } else {
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
            this.initialized = true;
        }
    }

    /**
     * Extracts principal notes (Top, Heart, Base) from a product description
     */
    async extractPrincipalNotes(description: string, productName: string): Promise<PrincipalNotes | null> {
        if (!this.initialized) {
            logger.warn('Skipping extractPrincipalNotes because Anthropic API key is not configured.');
            return null;
        }

        if (!description || description.trim() === '') {
            return null;
        }

        try {
            const prompt = `Investigate the following fragrance description for "${productName}" to deduce its principal notes (Estructura Olfativa). 
Identify the 'Top Notes' (Notas de Salida), 'Heart Notes' (Notas de Corazón), and 'Base Notes' (Notas de Fondo). 
If the description explicitly states them, extract them. If they are not fully stated, use your expertise as a perfumer and investigative capabilities on the web's knowledge base to deduce the most accurate structural notes for this specific product.
Do not format as markdown. Your response must be purely a valid JSON object with the keys "top", "heart", and "base" containing the derived text (in Spanish).

Description:
${description}

JSON Output:`;

            const response = await this.anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 300,
                temperature: 0.4, // Slightly higher to allow deduction 
                system: "You are an expert fragrance investigator. You deduce the correct structural notes of perfumes from their descriptions or industry knowledge, outputting valid JSON only.",
                messages: [
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
            });

            // Parse response correctly handling Anthropic's message format
            const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
            if (!responseText) {
                return null;
            }

            try {
                // Find potential JSON block in case it outputs extra characters
                const startIdx = responseText.indexOf('{');
                const endIdx = responseText.lastIndexOf('}');
                
                if (startIdx === -1 || endIdx === -1) {
                    throw new Error("No JSON found in response");
                }
                
                const jsonStr = responseText.substring(startIdx, endIdx + 1);
                const result = JSON.parse(jsonStr) as PrincipalNotes;
                return result;
            } catch (parseError) {
                logger.error(`Failed to parse LLM response into JSON. Raw response: ${responseText}`);
                return null;
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('Error during LLM extraction', { error: errorMsg });
            return null;
        }
    }
}

export const llmService = new LlmService();
