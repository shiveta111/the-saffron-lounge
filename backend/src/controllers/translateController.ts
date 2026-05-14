import { Request, Response } from 'express';

/**
 * Translation Controller
 * Handles translation requests securely on the backend
 */

interface TranslateRequest {
  text: string;
  source?: string;
  target: string;
}

interface GoogleTranslateResponse {
  data: {
    translations: Array<{
      translatedText: string;
    }>;
  };
}

interface LibreTranslateResponse {
  translatedText: string;
}

/**
 * Translate text using Google Translate API
 * You can also use other services like DeepL, Azure, etc.
 */
export const translateText = async (req: Request, res: Response) => {
  try {
    const { text, source = 'en', target }: TranslateRequest = req.body;

    // Validate input
    if (!text || !target) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: text and target',
      });
    }

    // If target is English, return original
    if (target === 'en') {
      return res.json({
        success: true,
        translatedText: text,
      });
    }

    // Option 1: Use Google Translate API (requires API key in .env)
    if (process.env.GOOGLE_TRANSLATE_API_KEY) {
      const googleResponse = await fetch(
        `https://translation.googleapis.com/language/translate/v2?key=${process.env.GOOGLE_TRANSLATE_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            q: text,
            source,
            target,
            format: 'text',
          }),
        }
      );

      if (googleResponse.ok) {
        const data = await googleResponse.json() as GoogleTranslateResponse;
        if (data.data?.translations?.[0]?.translatedText) {
          return res.json({
            success: true,
            translatedText: data.data.translations[0].translatedText,
          });
        }
      }
    }

    // Option 2: Use LibreTranslate (free, no API key needed)
    const libreResponse = await fetch('https://libretranslate.de/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source,
        target,
        format: 'text',
      }),
    });

    if (libreResponse.ok) {
      const data = await libreResponse.json() as LibreTranslateResponse;
      return res.json({
        success: true,
        translatedText: data.translatedText,
      });
    }

    // Fallback: return original text
    return res.json({
      success: true,
      translatedText: text,
      note: 'Translation service unavailable, returning original text',
    });
  } catch (error) {
    console.error('Translation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Translation failed',
      translatedText: req.body.text, // Return original on error
    });
  }
};

/**
 * Batch translate multiple texts
 */
export const translateBatch = async (req: Request, res: Response) => {
  try {
    const { texts, source = 'en', target } = req.body;

    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid texts array',
      });
    }

    // Translate all texts
    const translations = await Promise.all(
      texts.map(async (text: string) => {
        // Use the same logic as translateText
        // For simplicity, returning original for now
        return { original: text, translated: text };
      })
    );

    return res.json({
      success: true,
      translations,
    });
  } catch (error) {
    console.error('Batch translation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Batch translation failed',
    });
  }
};
