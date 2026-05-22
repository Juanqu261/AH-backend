import Anthropic from '@anthropic-ai/sdk';
import { logger } from '@/utils/logger';
import { PrincipalNotes } from '@/services/llm/llm.service';

export interface ProductTranslationInput {
    name: string;
    description: string | null;
    principalNotes: PrincipalNotes | null;
}

export interface ProductTranslationResult {
    nameEs: string;
    descriptionEs: string | null;
    principalNotesEs: PrincipalNotes | null;
}

const SYSTEM_PROMPT = `You are an expert translator specialized in luxury fragrance and perfumery copy.
Translate the provided English product fields into natural, elegant Spanish (neutral — avoid strong regionalisms).

CRITICAL RULES:
1. DO NOT translate commercial/proper names of fragrances, perfume houses, or brands.
   Examples that must remain identical in the Spanish output:
   "Aventus", "Black Opium", "Sauvage", "Creed", "Tom Ford", "Baccarat Rouge 540",
   "Le Labo", "Jo Malone", "Maison Francis Kurkdjian", "Santal 33", "Oud Wood".
   If in doubt about whether something is a brand/product name, leave it untranslated.
2. Ingredient and note names: translate to their natural Spanish equivalent when one
   exists ("bergamot" → "bergamota", "rose" → "rosa"), but keep terms conventionally
   left in their original form in Spanish fragrance copy ("oud", "musk" can stay as
   "oud" / "musk" if that's how the trade uses them; "ambergris" → "ámbar gris").
3. Preserve any HTML tags exactly as they appear.
4. Preserve the structure of principalNotes — translate the VALUES of "top", "heart",
   and "base" but keep those keys in English.
5. Tone: refined, sensorial, evocative — match the original register.

Return ONLY a valid JSON object in this exact shape (no markdown, no commentary):
{ "nameEs": "...", "descriptionEs": "..." | null, "principalNotesEs": { "top": "...", "heart": "...", "base": "..." } | null }`;

export class TranslationService {
    private anthropic: Anthropic;
    private initialized: boolean = false;

    constructor() {
        if (!process.env.ANTHROPIC_API_KEY) {
            logger.warn('ANTHROPIC_API_KEY is not set. Translation features will be disabled.');
            this.anthropic = new Anthropic({ apiKey: 'dummy' });
        } else {
            this.anthropic = new Anthropic({
                apiKey: process.env.ANTHROPIC_API_KEY,
            });
            this.initialized = true;
        }
    }

    async translateProductToSpanish(
        input: ProductTranslationInput,
    ): Promise<ProductTranslationResult | null> {
        if (!this.initialized) {
            logger.warn('Skipping translateProductToSpanish because Anthropic API key is not configured.');
            return null;
        }

        if (!input.name || input.name.trim() === '') {
            return null;
        }

        try {
            const userPayload = {
                name: input.name,
                description: input.description ?? null,
                principalNotes: input.principalNotes ?? null,
            };

            const userMessage = `Translate the following product into Spanish, following all rules in the system prompt.

Source (English):
${JSON.stringify(userPayload, null, 2)}

JSON Output:`;

            const response = await this.anthropic.messages.create({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1500,
                temperature: 0.2,
                system: SYSTEM_PROMPT,
                messages: [
                    {
                        role: 'user',
                        content: userMessage,
                    },
                ],
            });

            const responseText = response.content[0].type === 'text' ? response.content[0].text : '';
            if (!responseText) {
                return null;
            }

            try {
                const startIdx = responseText.indexOf('{');
                const endIdx = responseText.lastIndexOf('}');

                if (startIdx === -1 || endIdx === -1) {
                    throw new Error('No JSON found in response');
                }

                const jsonStr = responseText.substring(startIdx, endIdx + 1);
                const parsed = JSON.parse(jsonStr) as ProductTranslationResult;

                if (!parsed.nameEs || typeof parsed.nameEs !== 'string') {
                    throw new Error('Missing or invalid nameEs in translation response');
                }

                return {
                    nameEs: parsed.nameEs,
                    descriptionEs: parsed.descriptionEs ?? null,
                    principalNotesEs: parsed.principalNotesEs ?? null,
                };
            } catch (_parseError) {
                logger.error(`Failed to parse translation response into JSON. Raw response: ${responseText}`);
                return null;
            }
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error);
            logger.error('Error during product translation', { error: errorMsg });
            return null;
        }
    }
}

export const translationService = new TranslationService();
