# Translation System - Automatic By Default

This translation system works **automatically** - no need to wrap every text element!

## Quick Start

### For UI Text (buttons, labels, static content)

Just use the `t()` function:

```tsx
import { useLanguage } from '@/lib/language';

export default function MyComponent() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t("Welcome to Saffron Lounge")}</h1>
      <p>{t("Experience authentic flavors")}</p>
      <button>{t("Order Now")}</button>
    </div>
  );
}
```

That's it! Text automatically translates when the language changes.

### For Database Content (products, descriptions, etc.)

Wrap the section with `<AutoTranslate>`:

```tsx
import { AutoTranslate } from '@/components/Translate';

export default function ProductCard({ product }) {
  return (
    <AutoTranslate>
      <div>
        <h2>{product.name}</h2>
        <p>{product.description}</p>
        <span>${product.price}</span>
      </div>
    </AutoTranslate>
  );
}
```

All text inside `<AutoTranslate>` translates automatically!

## Complete Examples

### Example 1: Simple Page

```tsx
'use client';

import { useLanguage } from '@/lib/language';

export default function AboutPage() {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t("About Us")}</h1>
      <p>{t("We serve authentic Indian cuisine")}</p>
      <p>{t("Open daily from 11 AM to 10 PM")}</p>
    </div>
  );
}
```

### Example 2: Product Listing with Database Content

```tsx
'use client';

import { useLanguage } from '@/lib/language';
import { AutoTranslate } from '@/components/Translate';

export default function MenuPage({ products }) {
  const { t } = useLanguage();
  
  return (
    <div>
      <h1>{t("Our Menu")}</h1>
      
      {products.map(product => (
        <div key={product.id}>
          {/* Database content auto-translates */}
          <AutoTranslate>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
          </AutoTranslate>
          
          {/* UI text uses t() */}
          <button>{t("Add to Cart")}</button>
        </div>
      ))}
    </div>
  );
}
```

### Example 3: Mixed Content

```tsx
'use client';

import { useLanguage } from '@/lib/language';
import { AutoTranslate } from '@/components/Translate';

export default function ProductDetail({ product }) {
  const { t } = useLanguage();
  
  return (
    <div>
      {/* Static UI text */}
      <h1>{t("Product Details")}</h1>
      
      {/* Database content */}
      <AutoTranslate>
        <h2>{product.name}</h2>
        <p>{product.description}</p>
        <p>{product.ingredients}</p>
      </AutoTranslate>
      
      {/* Mix of static and dynamic */}
      <div>
        <span>{t("Price:")}</span>
        <span>${product.price}</span>
      </div>
      
      <button>{t("Add to Cart")}</button>
      <button>{t("Save for Later")}</button>
    </div>
  );
}
```

### Example 4: Async Translation (when you need to wait)

```tsx
'use client';

import { useLanguage } from '@/lib/language';
import { useState } from 'react';

export default function ContactForm() {
  const { t, translateAsync } = useLanguage();
  const [status, setStatus] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    // Use translateAsync when you need the result immediately
    const successMsg = await translateAsync("Message sent successfully!");
    setStatus(successMsg);
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h1>{t("Contact Us")}</h1>
      <input placeholder={t("Your name")} />
      <textarea placeholder={t("Your message")} />
      <button>{t("Send")}</button>
      {status && <p>{status}</p>}
    </form>
  );
}
```

## How It Works

### The `t()` Function

- **Instant**: Returns text immediately (cached translations or original)
- **Smart**: Translates in background and updates automatically
- **Cached**: Remembers translations so they're instant next time

### The `<AutoTranslate>` Component

- **Automatic**: Translates all text children
- **Nested**: Works with complex component trees
- **Flexible**: Can specify wrapper element with `as` prop

```tsx
<AutoTranslate as="section" className="my-section">
  <div>All this text translates automatically</div>
</AutoTranslate>
```

## Language Switcher (Already in Header)

The EN/ES button in your header automatically switches languages:

```tsx
import { useLanguage } from '@/lib/language';

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  
  return (
    <button onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}>
      {language === 'en' ? '🇪🇸 ES' : '🇺🇸 EN'}
    </button>
  );
}
```

## Technical Details

### API Setup

⚠️ **Important:** The translation system now uses **LibreTranslate** (free, no API key needed).

For setup options and troubleshooting, see [TRANSLATION_SETUP.md](./TRANSLATION_SETUP.md)

### Caching

- Translations cached in memory for instant display
- Also cached in localStorage by the translator service
- Survives page refreshes

### API Endpoint

- **Primary**: LibreTranslate (free, open source)
- **Fallback**: Built-in dictionary for common words
- **No Auth Required**: Works out of the box
- **Auto Retry**: Falls back to dictionary on errors

For other API options (Google Translate, backend proxy), see [TRANSLATION_SETUP.md](./TRANSLATION_SETUP.md)

### Language Persistence

- User's language choice saved to localStorage
- Automatically restored on page load

## Best Practices

1. **UI Text**: Use `t()` for buttons, labels, headers
2. **Database Content**: Wrap sections with `<AutoTranslate>`
3. **Large Sections**: Wrap once at parent level, not each child
4. **Forms**: Use `t()` for placeholders and labels
5. **Alerts**: Use `translateAsync()` for messages you need immediately

## Quick Reference

```tsx
// Import
import { useLanguage } from '@/lib/language';
import { AutoTranslate } from '@/components/Translate';

// Use in component
const { t, language, setLanguage, translateAsync } = useLanguage();

// UI text - automatic translation
<h1>{t("Welcome")}</h1>

// Database content - wrap section
<AutoTranslate>
  <div>{product.description}</div>
</AutoTranslate>

// Get current language
{language} // 'en' or 'es'

// Switch language
setLanguage('es')

// Async translation (wait for result)
const translated = await translateAsync("Hello");
```

## That's It!

Just use `t()` for UI text and `<AutoTranslate>` for database content. Everything else happens automatically! 🎉
