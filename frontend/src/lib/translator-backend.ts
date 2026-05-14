'use client';

/**
 * Backend Translation Service
 * Uses your own backend API endpoint for secure translation
 */

interface TranslationCache {
  [key: string]: string;
}

class BackendTranslationService {
  // Use your backend API endpoint
  private apiUrl = '/api/translate';
  private cache: TranslationCache = {};
  
  constructor() {
    // Load cache from localStorage
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('translations');
        if (cached) {
          this.cache = JSON.parse(cached);
        }
      } catch (e) {
        // Ignore errors
      }
    }
  }

  /**
   * Get cache key
   */
  private getCacheKey(text: string, lang: string): string {
    return `${lang}:${text.substring(0, 50)}`;
  }

  /**
   * Save cache
   */
  private saveCache(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('translations', JSON.stringify(this.cache));
      } catch (e) {
        // Ignore errors
      }
    }
  }

  /**
   * Translate text via backend
   */
  async translate(text: string, targetLang: string): Promise<string> {
    if (!text || targetLang === 'en') {
      return text;
    }

    // Check cache
    const cacheKey = this.getCacheKey(text, targetLang);
    if (this.cache[cacheKey]) {
      return this.cache[cacheKey];
    }

    try {
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          source: 'en',
          target: targetLang,
        }),
      });

      if (!response.ok) {
        console.warn('Backend translation failed');
        return text;
      }

      const data = await response.json();
      const translated = data.translatedText || text;

      // Cache result
      this.cache[cacheKey] = translated;
      this.saveCache();

      return translated;
    } catch (error) {
      console.error('Translation error:', error);
      return text;
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache = {};
    if (typeof window !== 'undefined') {
      localStorage.removeItem('translations');
    }
  }
}

export const backendTranslator = new BackendTranslationService();
