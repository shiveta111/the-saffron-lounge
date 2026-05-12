# Translation System - Setup Guide

## The Problem

The Google Translate API endpoint `https://translate-pa.googleapis.com/v1/translateHtml` requires authentication and cannot be used without an API key.

## Solutions

You now have **3 working options**:

---

## ✅ Option 1: LibreTranslate (Current - Free & Working)

**Status:** Already configured and working!

Uses the free LibreTranslate API with fallback translations for common words.

### Pros:
- ✅ No API key needed
- ✅ Already working
- ✅ Free
- ✅ Fallback dictionary included

### Cons:
- ⚠️ Rate limited
- ⚠️ May be slower than paid services

### No setup needed - it's ready to use!

---

## 🔧 Option 2: Backend API (Recommended for Production)

**Status:** Files created, needs integration

Securely handles translation on your backend server.

### Setup Steps:

#### 1. Add route to your backend server:

In `backend/src/server.ts` (or wherever you define routes):

```typescript
import translateRoutes from './routes/translate.routes';

// Add this with your other routes
app.use('/api/translate', translateRoutes);
```

#### 2. (Optional) Add Google Translate API Key to `.env`:

```env
# Optional: For better translation quality
GOOGLE_TRANSLATE_API_KEY=your_api_key_here
```

Without the API key, it will use LibreTranslate (free).

#### 3. Switch frontend to use backend:

In `forntend/src/lib/language.tsx`, change the import:

```typescript
// Change this line:
import { translator } from './translator';

// To this:
import { backendTranslator as translator } from './translator-backend';
```

#### 4. Restart both servers:

```bash
# Backend
cd backend
npm run dev

# Frontend
cd forntend
npm run dev
```

### Pros:
- ✅ API keys secured on backend
- ✅ Can use Google Translate (high quality)
- ✅ Falls back to LibreTranslate if no API key
- ✅ More control

---

## 💰 Option 3: Use Google Translate API Directly (Paid)

If you want to use Google Translate directly:

### 1. Get API Key:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project
3. Enable "Cloud Translation API"
4. Create credentials (API Key)

### 2. Update translator.ts:

```typescript
private apiUrl = 'https://translation.googleapis.com/language/translate/v2';

async translate(text: string, targetLang: string): Promise<string> {
  // ... existing code ...
  
  const response = await fetch(
    `${this.apiUrl}?key=${process.env.NEXT_PUBLIC_GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang,
        format: 'text',
      }),
    }
  );
  
  const data = await response.json();
  return data.data.translations[0].translatedText;
}
```

### 3. Add to `.env.local`:

```env
NEXT_PUBLIC_GOOGLE_API_KEY=your_api_key_here
```

⚠️ **Security Warning:** This exposes your API key to the frontend. Use Option 2 instead for production!

---

## 🎯 Recommended Approach

**For Development/Testing:**
✅ Use **Option 1** (LibreTranslate) - it's already working!

**For Production:**
✅ Use **Option 2** (Backend API) - secure and scalable

---

## Current Fallback Translations (Spanish)

These work immediately without any API:

| English | Spanish |
|---------|---------|
| home | inicio |
| about | acerca de |
| menu | menú |
| shop | tienda |
| contact | contacto |
| reserve table | reservar mesa |
| Art Of | Arte De |
| Delightful | Delicioso |
| EXQUISITE | EXQUISITO |
| Flavors & Heritage | Sabores y Herencia |
| Add to Cart | Agregar al Carrito |

### Adding More Fallbacks:

Edit `forntend/src/lib/translator.ts` and add to the `commonTranslations` object:

```typescript
const commonTranslations: { [key: string]: string } = {
  'Your English Text': 'Su Texto en Español',
  'Another phrase': 'Otra frase',
  // ... add more ...
};
```

---

## Testing

1. Start the dev server:
```bash
cd forntend
npm run dev
```

2. Open your browser
3. Click the EN/ES button in the header
4. Watch the translation happen!

---

## Troubleshooting

### "Translation API failed"
- ✅ Fallback translations will be used
- Check browser console for specific error
- Common words will still translate

### "CORS Error"
- If using backend API, make sure CORS is enabled:
```typescript
// In backend/src/server.ts
app.use(cors({
  origin: 'http://localhost:3000', // Your frontend URL
  credentials: true
}));
```

### Translations not updating
1. Clear cache: `localStorage.clear()` in browser console
2. Hard refresh: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)

---

## Files Created

✅ Frontend:
- `forntend/src/lib/translator.ts` - LibreTranslate + fallbacks (current)
- `forntend/src/lib/translator-backend.ts` - Backend API option
- `forntend/src/lib/language.tsx` - Language context (uses translator)
- `forntend/src/components/Translate.tsx` - AutoTranslate component

ℹ️ Backend:
- `backend/src/controllers/translateController.ts` - Translation controller
- `backend/src/routes/translate.routes.ts` - API routes

---

## Next Steps

1. ✅ **Test current setup** - it's already working with LibreTranslate!
2. ⏳ If you want better quality, set up **Option 2** (Backend API)
3. ⏳ Add more fallback translations as needed

Your translation system is **ready to use right now** with LibreTranslate! 🎉
