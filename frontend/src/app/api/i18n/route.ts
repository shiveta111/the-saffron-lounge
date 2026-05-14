import { NextRequest, NextResponse } from 'next/server';

// Mock i18n data - in production, this would come from database
const mockLanguages = [
  {
    id: 'en',
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    isDefault: true,
    isActive: true
  },
  {
    id: 'es',
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    flag: '🇪🇸',
    isDefault: false,
    isActive: true
  },
  {
    id: 'fr',
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    flag: '🇫🇷',
    isDefault: false,
    isActive: true
  },
  {
    id: 'de',
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    flag: '🇩🇪',
    isDefault: false,
    isActive: true
  },
  {
    id: 'hi',
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    flag: '🇮🇳',
    isDefault: false,
    isActive: true
  },
  {
    id: 'ar',
    code: 'ar',
    name: 'Arabic',
    nativeName: 'العربية',
    flag: '🇸🇦',
    isDefault: false,
    isActive: false
  }
];

const mockTranslations = [
  {
    id: 'nav.home',
    key: 'nav.home',
    category: 'navigation',
    translations: {
      en: 'Home',
      es: 'Inicio',
      fr: 'Accueil',
      de: 'Startseite',
      hi: 'होम',
      ar: 'الرئيسية'
    },
    lastModified: new Date().toISOString()
  },
  {
    id: 'nav.menu',
    key: 'nav.menu',
    category: 'navigation',
    translations: {
      en: 'Menu',
      es: 'Menú',
      fr: 'Menu',
      de: 'Speisekarte',
      hi: 'मेनू',
      ar: 'القائمة'
    },
    lastModified: new Date().toISOString()
  },
  {
    id: 'nav.about',
    key: 'nav.about',
    category: 'navigation',
    translations: {
      en: 'About',
      es: 'Acerca de',
      fr: 'À propos',
      de: 'Über uns',
      hi: 'हमारे बारे में',
      ar: 'حول'
    },
    lastModified: new Date().toISOString()
  },
  {
    id: 'nav.contact',
    key: 'nav.contact',
    category: 'navigation',
    translations: {
      en: 'Contact',
      es: 'Contacto',
      fr: 'Contact',
      de: 'Kontakt',
      hi: 'संपर्क',
      ar: 'اتصل'
    },
    lastModified: new Date().toISOString()
  },
  {
    id: 'common.save',
    key: 'common.save',
    category: 'common',
    translations: {
      en: 'Save',
      es: 'Guardar',
      fr: 'Enregistrer',
      de: 'Speichern',
      hi: 'सेव करें',
      ar: 'حفظ'
    },
    lastModified: new Date().toISOString()
  },
  {
    id: 'common.cancel',
    key: 'common.cancel',
    category: 'common',
    translations: {
      en: 'Cancel',
      es: 'Cancelar',
      fr: 'Annuler',
      de: 'Abbrechen',
      hi: 'रद्द करें',
      ar: 'إلغاء'
    },
    lastModified: new Date().toISOString()
  },
  {
    id: 'common.delete',
    key: 'common.delete',
    category: 'common',
    translations: {
      en: 'Delete',
      es: 'Eliminar',
      fr: 'Supprimer',
      de: 'Löschen',
      hi: 'मिटाएं',
      ar: 'حذف'
    },
    lastModified: new Date().toISOString()
  }
];

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'languages', 'translations', or specific category

    if (type === 'languages') {
      return NextResponse.json({
        success: true,
        data: mockLanguages,
        message: 'Languages retrieved successfully'
      });
    }

    if (type === 'translations') {
      const category = searchParams.get('category');
      let filteredTranslations = mockTranslations;

      if (category) {
        filteredTranslations = mockTranslations.filter(t => t.category === category);
      }

      return NextResponse.json({
        success: true,
        data: filteredTranslations,
        message: 'Translations retrieved successfully'
      });
    }

    // Return both languages and translations
    return NextResponse.json({
      success: true,
      data: {
        languages: mockLanguages,
        translations: mockTranslations
      },
      message: 'I18n data retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching i18n data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch i18n data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'language') {
      // Add new language
      const newLanguage = {
        ...data,
        isActive: data.isActive ?? true
      };
      mockLanguages.push(newLanguage);

      return NextResponse.json({
        success: true,
        data: newLanguage,
        message: 'Language added successfully'
      }, { status: 201 });
    }

    if (type === 'translation') {
      // Add new translation
      const newTranslation = {
        ...data,
        lastModified: new Date().toISOString()
      };
      mockTranslations.push(newTranslation);

      return NextResponse.json({
        success: true,
        data: newTranslation,
        message: 'Translation added successfully'
      }, { status: 201 });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid type specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error creating i18n data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create i18n data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, ...data } = body;

    if (type === 'language') {
      // Update language
      const index = mockLanguages.findIndex(lang => lang.code === data.code);
      if (index === -1) {
        return NextResponse.json(
          { success: false, message: 'Language not found' },
          { status: 404 }
        );
      }

      mockLanguages[index] = { ...mockLanguages[index], ...data };
      return NextResponse.json({
        success: true,
        data: mockLanguages[index],
        message: 'Language updated successfully'
      });
    }

    if (type === 'translation') {
      // Update translation
      const index = mockTranslations.findIndex(trans => trans.key === data.key);
      if (index === -1) {
        return NextResponse.json(
          { success: false, message: 'Translation not found' },
          { status: 404 }
        );
      }

      mockTranslations[index] = {
        ...mockTranslations[index],
        ...data,
        lastModified: new Date().toISOString()
      };

      return NextResponse.json({
        success: true,
        data: mockTranslations[index],
        message: 'Translation updated successfully'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid type specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error updating i18n data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update i18n data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const id = searchParams.get('id');

    if (!type || !id) {
      return NextResponse.json(
        { success: false, message: 'Type and ID are required' },
        { status: 400 }
      );
    }

    if (type === 'language') {
      const index = mockLanguages.findIndex(lang => lang.code === id);
      if (index === -1) {
        return NextResponse.json(
          { success: false, message: 'Language not found' },
          { status: 404 }
        );
      }

      const deletedLanguage = mockLanguages.splice(index, 1)[0];
      return NextResponse.json({
        success: true,
        data: deletedLanguage,
        message: 'Language deleted successfully'
      });
    }

    if (type === 'translation') {
      const index = mockTranslations.findIndex(trans => trans.key === id);
      if (index === -1) {
        return NextResponse.json(
          { success: false, message: 'Translation not found' },
          { status: 404 }
        );
      }

      const deletedTranslation = mockTranslations.splice(index, 1)[0];
      return NextResponse.json({
        success: true,
        data: deletedTranslation,
        message: 'Translation deleted successfully'
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid type specified' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error deleting i18n data:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete i18n data', error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}