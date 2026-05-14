'use client';

/**
 * Translation Service
 * Uses: https://translate-pa.googleapis.com/v1/translateHtml
 * For translating dynamic database content
 */

interface TranslationCache {
  [key: string]: string;
}

class TranslationService {
  // Centralized free translation provider selection.
  // Set NEXT_PUBLIC_TRANSLATE_PROVIDER to "google-free" to use Google web endpoint first.
  private provider = 'google-free';
  //private provider = process.env.NEXT_PUBLIC_TRANSLATE_PROVIDER === 'google-free' ? 'google-free' : 'libre';
  private apiUrl = 'https://libretranslate.de/translate';
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
    return `${lang}:${text}`;
  }

  /**
   * Secondary translation provider when primary API fails
   */
  private async translateViaGoogle(text: string, targetLang: string): Promise<string | null> {
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${encodeURIComponent(targetLang)}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);

      if (!response.ok) {
        return null;
      }

      const data = await response.json();

      if (!Array.isArray(data) || !Array.isArray(data[0])) {
        return null;
      }

      const translated = data[0]
        .map((part: unknown) => (Array.isArray(part) ? String(part[0] ?? '') : ''))
        .join('');

      return translated || null;
    } catch {
      return null;
    }
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
   * Translate text
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

    // Try fallback first (instant for common words)
    const fallback = this.getFallbackTranslation(text, targetLang);
    if (fallback !== text) {
      // Cache the fallback
      this.cache[cacheKey] = fallback;
      this.saveCache();
      return fallback;
    }

    const format = /<[^>]+>/.test(text) ? 'html' : 'text';

    try {
      if (this.provider === 'google-free') {
        const googleTranslated = await this.translateViaGoogle(text, targetLang);
        if (googleTranslated) {
          this.cache[cacheKey] = googleTranslated;
          this.saveCache();
          return googleTranslated;
        }

        return fallback;
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: targetLang,
          format,
        }),
      });

      if (!response.ok) {
        const secondary = await this.translateViaGoogle(text, targetLang);
        if (secondary) {
          this.cache[cacheKey] = secondary;
          this.saveCache();
          return secondary;
        }

        console.warn('Translation APIs failed, using fallback');
        return fallback;
      }

      const data = await response.json();
      const translated = data.translatedText || text;

      // Cache result
      this.cache[cacheKey] = translated;
      this.saveCache();

      return translated;
    } catch (error) {
      console.error('Translation error:', error);

      const secondary = await this.translateViaGoogle(text, targetLang);
      if (secondary) {
        this.cache[cacheKey] = secondary;
        this.saveCache();
        return secondary;
      }

      return fallback;
    }
  }

  /**
   * Fallback translations for common words (Spanish)
   */
  private getFallbackTranslation(text: string, targetLang: string): string {
    if (targetLang !== 'es') return text;

    const commonTranslations: { [key: string]: string } = {
     
      'about': 'acerca de',
      'menu': 'menú',
      'shop': 'tienda',
      'contact': 'contacto',
      'reserve table': 'reservar mesa',
      'Art Of': 'Arte De',
      'Delightful': 'Delicioso',
      'EXQUISITE': 'EXQUISITO',
      'Flavors & Heritage': 'Sabores y Herencia',
      '• Book Now • Book Now • Book Now • Book Now': '• Reservar Ahora • Reservar Ahora • Reservar Ahora • Reservar Ahora',
      'Welcome to Saffron Lounge': 'Bienvenido a Saffron Lounge',
      'Order Now': 'Ordenar Ahora',
      'Add to Cart': 'Agregar al Carrito',
      'Price:': 'Precio:',
      'Description': 'Descripción',
      'Ingredients': 'Ingredientes',
      
      // Reservation form
      'System Admin': 'Administrador del Sistema',
      'Reserve Your Table': 'Reserve Su Mesa',
      'Book your table at The Saffron Lounge and enjoy an unforgettable culinary experience': 'Reserve su mesa en The Saffron Lounge y disfrute de una experiencia culinaria inolvidable',
      'Full Name *': 'Nombre Completo *',
      'Email Address *': 'Correo Electrónico *',
      'Phone Number *': 'Número de Teléfono *',
      'Select guests': 'Seleccionar invitados',
      'Guest': 'Invitado',
      'Guests': 'Invitados',
      'Select time': 'Seleccionar hora',
      'Loading times...': 'Cargando horarios...',
      'Please select date and guest first to view time slots': 'Por favor seleccione fecha e invitados primero para ver horarios disponibles',
      'No times available': 'No hay horarios disponibles',
      'Special Requests or Dietary Notes': 'Solicitudes Especiales o Notas Dietéticas',
      'Reserving...': 'Reservando...',
      'Reserve Table': 'Reservar Mesa',
      'Please log in to make a reservation.': 'Por favor inicie sesión para hacer una reserva.',
      
      // Validation errors
      'Name is required': 'El nombre es requerido',
      'Email is required': 'El correo electrónico es requerido',
      'Please enter a valid email address': 'Por favor ingrese un correo electrónico válido',
      'Phone number is required': 'El número de teléfono es requerido',
      'Please enter a valid phone number': 'Por favor ingrese un número de teléfono válido',
      'Please select a date': 'Por favor seleccione una fecha',
      'Please select a future date': 'Por favor seleccione una fecha futura',
      'Please select a time': 'Por favor seleccione una hora',
      'Please select number of guests': 'Por favor seleccione el número de invitados',
      
      // Success confirmation
      'Reservation Request Received!': '¡Solicitud de Reserva Recibida!',
      'Thank you for choosing The Saffron Lounge. Your reservation request is currently': 'Gracias por elegir The Saffron Lounge. Su solicitud de reserva está actualmente',
      'Pending Confirmation': 'Pendiente de Confirmación',
      'by our admin team.': 'por nuestro equipo de administración.',
      'Reservation ID': 'ID de Reserva',
      'Name': 'Nombre',
      'Date & Time': 'Fecha y Hora',
      'at': 'a las',
      'people': 'personas',

      // about section
      'WELCOME TO THE SAFFRON LOUNGE': 'BIENVENIDO A THE SAFFRON LOUNGE',
      'Where Flavor Meets Elegance': 'Donde el Sabor se Encuentra con la Elegancia',
      "At The Saffron Lounge, we bring you a celebration of India's culinary heritage—timeless recipes reimagined with flair, tradition served with a touch of luxury. Every dish on our menu tells a story, carefully crafted with hand-ground spices, fresh ingredients, and authentic passion. From vibrant street-style starters to regal curries and tandoori feasts, prepare yourself for an experience that delights the senses and warms the soul.": "En The Saffron Lounge, te ofrecemos una celebración de la herencia culinaria de la India—recetas atemporales reinventadas con estilo, tradición servida con un toque de lujo. Cada plato de nuestro menú cuenta una historia, cuidadosamente elaborado con especias molidas a mano, ingredientes frescos y una pasión auténtica. Desde vibrantes entrantes al estilo callejero hasta curries majestuosos y festines tandoori, prepárate para una experiencia que deleita los sentidos y reconforta el alma.",
      "Whether you're here to savor a quick bite or to indulge in a grand feast, we welcome you to sit back, unwind, and let the flavors of India take you on a journey.": "Ya sea que estés aquí para disfrutar de un bocado rápido o para darte un gran festín, te invitamos a relajarte, desconectar y dejar que los sabores de la India te lleven en un viaje.",
      'Read More': 'Leer Más',
      'Master Chef at The Saffron Lounge': 'Maestro Chef en The Saffron Lounge',
      'home': 'inicio',

      // menu showcase
      'From Our': 'De Nuestro',
      'Restaurant Menu': 'Menú del Restaurante',
      'Main dish': 'Plato Principal',
      'View All Menu': 'Ver Todo el Menú',
      'Loading menu from API...': 'Cargando menú desde la API...',
      'Retry': 'Reintentar',
      'No menu items available from API.': 'No hay elementos de menú disponibles desde la API.',
      'Refresh': 'Actualizar',
      
      // Common menu categories
      'Appetizers': 'Aperitivos',
      'Starters': 'Entrantes',
      'Main Course': 'Plato Principal',
      'Desserts': 'Postres',
      'Beverages': 'Bebidas',
      'Drinks': 'Bebidas',
      'Curries': 'Curries',
      'Tandoori': 'Tandoori',
      'Biryani': 'Biryani',
      'Bread': 'Pan',
      'Naan': 'Naan',
      'Sides': 'Acompañamientos',
      'Vegetarian': 'Vegetariano',
      'Non-Vegetarian': 'No Vegetariano',
      'Vegan': 'Vegano',
      'Gluten-Free': 'Sin Gluten',
      'Dairy-Free': 'Sin Lácteos',
      'Spicy': 'Picante',
      'Mild': 'Suave',
      'Medium': 'Medio',
      'Hot': 'Picante',
      "Quick Bites": 'Bocados Rápidos',
      //Biryani & Rice : 'Biryani y Arroz',
      'Biryani & Rice': 'Biryani y Arroz',
      "Non-Vegetarian Specialties": 'Especialidades No Vegetarianas',
      'Squid Rings': 'Aros de Calamar',
      'Delicate squid rings with a light, crunchy coating, sprinkled with zesty chaat masala. A coastal classic brought to life with bold, tangy spice.': 'Delicados aros de calamar con un recubrimiento ligero y crujiente, espolvoreados con picante chaat masala. Un clásico costero traído a la vida con un sabor audaz y picante.',

      //featured list
      'Farm-Fresh Ingredients': 'Ingredientes Frescos de la Granja',
      'Sourced daily to ensure every dish bursts with natural flavor and quality': 'Suministrados diariamente para garantizar que cada plato estalle con sabor natural y calidad',
      'Expert Culinary Team': 'Equipo Culinario Experto',
      'Crafting each recipe with passion, precision, and years of culinary mastery': 'Elaborando cada receta con pasión, precisión y años de maestría culinaria',
      'Signature Drinks Lounge': 'Lounge de Bebidas Exclusivas',
      'Offering a curated selection of unique cocktails, wines, and refreshing blends': 'Ofreciendo una selección curada de cócteles únicos, vinos y mezclas refrescantes',
      'Healthy Choices': 'Opciones Saludables',
      'Nutritious, balanced meals designed to nourish body and mind': 'Comidas nutritivas y equilibradas diseñadas para nutrir el cuerpo y la mente', 

    
      'Discover More': 'Descubre Más',

      // testimonials section
      'What Our Guest Are Saying': 'Lo que dicen nuestros invitados',
      'Previous testimonial': 'Testimonio anterior',
      'Next testimonial': 'Siguiente testimonio',
      'Go to testimonial': 'Ir al testimonio',
      'Anonymous': 'Anonimo',

      // information section
        'WELCOME TO': 'BIENVENIDO A',
        'The Saffron Lounge': 'The Saffron Lounge',
        'Modern India, Served Gracefully': 'India Moderna, Servida con Gracia',
        'Where contemporary design meets the spirit of Indian hospitality.': 'Donde el diseno contemporaneo se encuentra con el espiritu de la hospitalidad india.',
        'redefines fine dining through a perfect blend of rich flavours, elegant presentation, and soulful ambience.': 'redefine la alta cocina a traves de una perfecta combinacion de ricos sabores, presentacion elegante y ambiente lleno de alma.',
        'View Menu': 'Ver Menu',
        'Contact us': 'Contactanos',
        'Store Location': 'Ubicacion de la tienda',
        'where contemporary design meets the spirit of Indian hospitality:': 'donde el diseño contemporáneo se encuentra con el espíritu de la hospitalidad india.',
        'The Saffron Lounge redefines fine dining through a perfect blend of rich flavours, elegant presentation, and soulful ambience.': 'The Saffron Lounge redefine la alta cocina a través de una perfecta combinación de sabores ricos, presentación elegante y ambiente lleno de alma.',

      // footer section
      'Indian Restaurant': 'Restaurante Indio',
      'Cocktails': 'Cocteles',
      'Join Our Newsletter': 'Unete a nuestro boletin',
      'Your Email Address': 'Tu correo electronico',
      'Subscribe': 'Suscribete',
      'Quick Link': 'Enlaces rapidos',
      'Homepage': 'Pagina principal',
      'Menu': 'Menu',
      'About Us': 'Sobre nosotros',
      'Contact': 'Contacto',
      'Company Link': 'Enlaces de la empresa',
      'Blog': 'Blog',
      'Privacy Policy': 'Politica de privacidad',
      'Terms & Conditions': 'Terminos y condiciones',
      'Working Hours': 'Horario de trabajo',
      'Tuesday- Sunday': 'Martes- Domingo',
      'Monday': 'Lunes',
      'Closed': 'Cerrado',
      'Contact Us': 'Contactanos',
      'Av. del Mediterraneo, 51, 03503 Benidorm, Alicante, Spain': 'Av. del Mediterraneo, 51, 03503 Benidorm, Alicante, Espana',
      'All rights reserved.': 'Todos los derechos reservados.',
      'Facebook': 'Facebook',
      'X': 'X',
      'LinkedIn': 'LinkedIn',

      // header section
      'Switch to Spanish': 'Cambiar a espanol',
      'Switch to English': 'Cambiar a ingles',
      'Spanish': 'Espanol',
      'English': 'Ingles',
      'Search menu items...': 'Buscar elementos del menu...',
      'No results found for': 'No se encontraron resultados para',
      'Hi,': 'Hola,',
      'User': 'Usuario',
      'My Profile': 'Mi perfil',
      'My Orders': 'Mis pedidos',
      'Logout': 'Cerrar sesion',
      'Login': 'Iniciar sesion',
      'Search Menu': 'Buscar en el menu',

      // topbar section
      'Welcome to The Saffron Lounge - Experience Authentic Indian Cuisine & Premium Cocktails': 'Bienvenido a The Saffron Lounge - Disfruta autentica cocina india y cocteles premium',
      'Welcome to The Saffron Lounge': 'Bienvenido a The Saffron Lounge',

      // breadcrumb labels
      'Home': 'Inicio',
      'About': 'Acerca de',
      
      'Shop': 'Tienda',
      'Cart': 'Carrito',
      'Checkout': 'Pagar',
     
      'FAQ': 'Preguntas frecuentes',
      'Gallery': 'Galeria',
      'Chef': 'Chef',
      'Team': 'Equipo',
      'Private Dining': 'Cena privada',
      'Wine List': 'Carta de vinos',
      'Terms': 'Terminos',
      'Testimonials': 'Testimonios',
      'Services': 'Servicios',
      'Profile': 'Perfil',
    };

    const lowerText = text.toLowerCase();
    for (const [eng, esp] of Object.entries(commonTranslations)) {
      if (lowerText === eng.toLowerCase()) {
        // Preserve original casing style
        if (text === text.toUpperCase()) return esp.toUpperCase();
        if (text[0] === text[0].toUpperCase()) {
          return esp.charAt(0).toUpperCase() + esp.slice(1);
        }
        return esp;
      }
    }

    return text; // Return original if no translation found
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

export const translator = new TranslationService();
