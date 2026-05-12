'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translator } from './translator';

type Language = 'en' | 'es';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (text: string) => string;
  translateAsync: (text: string) => Promise<string>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// In-memory cache for instant translations
const translationCache = new Map<string, string>();

// Instant fallback translations (Spanish)
const fallbackTranslations: { [key: string]: string } = {
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
  'Reserve Your Table': 'Reserve Su Mesa',
  'Book your table at The Saffron Lounge and enjoy an unforgettable culinary experience': 'Reserve su mesa en The Saffron Lounge y disfrute de una experiencia culinaria inolvidable',
  'Full Name *': 'Nombre Completo *',
  'Email Address *': 'Correo Electrónico *',
  'Phone Number *': 'Número de Teléfono *',
  'Select guests': 'Seleccionar invitados',
  'System Admin': 'Administrador del Sistema',
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
  "Biryani & Rice": 'Biryani y Arroz',
  "Non-Vegetarian Specialties": 'Especialidades No Vegetarianas',
  'Squid Rings': 'Aros de Calamar',
  'Delicate squid rings with a light, crunchy coating, sprinkled with zesty chaat masala. A coastal classic brought to life with bold, tangy spice.': 'Delicados aros de calamar con un recubrimiento ligero y crujiente, espolvoreados con picante chaat masala. Un clásico costero traído a la vida con un sabor audaz y picante.',
  
  // featured list
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

// informative section
  'WELCOME TO': 'BIENVENIDO A',
  'The Saffron Lounge': 'The Saffron Lounge',
  'Modern India, Served Gracefully': 'India Moderna, Servida con Gracia', 
  'Where contemporary design meets the spirit of Indian hospitality.': 'Donde el diseno contemporaneo se encuentra con el espiritu de la hospitalidad india.',
  'redefines fine dining through a perfect blend of rich flavours, elegant presentation, and soulful ambience.': 'redefine la alta cocina a traves de una perfecta combinacion de ricos sabores, presentacion elegante y ambiente lleno de alma.',
  'View Menu': 'Ver Menu',
  'Contact us': 'Contactanos',
  'Store Location': 'Ubicacion de la tienda',
  'where contemporary design meets the spirit of Indian hospitality:': 'donde el diseño contemporáneo se encuentra con el espíritu de la hospitalidad india.',

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

  // cart page
  'Shopping Cart': 'Carrito de Compras',
  'Cart updated': 'Carrito actualizado',
  'Failed to update cart': 'No se pudo actualizar el carrito',
  'Item removed from cart': 'Articulo eliminado del carrito',
  'Failed to remove item': 'No se pudo eliminar el articulo',
  'Cart cleared': 'Carrito vaciado',
  'Failed to clear cart': 'No se pudo vaciar el carrito',
  'Remove this item from cart?': 'Eliminar este articulo del carrito?',
  'Clear all items from cart?': 'Vaciar todos los articulos del carrito?',
  'Your cart is empty': 'Tu carrito esta vacio',
  "Looks like you haven't added anything to your cart yet.": 'Parece que aun no has agregado nada a tu carrito.',
  'Explore our menu and find something delicious!': 'Explora nuestro menu y encuentra algo delicioso!',
  'Browse Menu': 'Ver Menu',
  'Items': 'Articulos',
  'Clear Cart': 'Vaciar Carrito',
  'Unknown Item': 'Articulo desconocido',
  'Combo Pack': 'Paquete Combo',
  'Includes:': 'Incluye:',
  'more': 'mas',
  'Order Summary': 'Resumen del Pedido',
  'View Offers': 'Ver Ofertas',
  'Subtotal': 'Subtotal',
  'Discount': 'Descuento',
  'Tax (8%)': 'Impuesto (8%)',
  'Total': 'Total',
  'Proceed to Checkout': 'Proceder al Pago',
  'Coupon': 'Cupon',
  'applied successfully!': 'aplicado correctamente!',
  'Discount:': 'Descuento:',
  'Invalid coupon code': 'Codigo de cupon invalido',
  'Failed to validate coupon code': 'No se pudo validar el codigo de cupon',
  'Please enter a coupon code': 'Por favor ingresa un codigo de cupon',
  'Coupon removed': 'Cupon eliminado',
  'Coupon Code': 'Codigo de Cupon',
  'Coupon Applied:': 'Cupon Aplicado:',
  'Enter coupon code': 'Ingresa codigo de cupon',
  'Apply': 'Aplicar',
  'Available Offers': 'Ofertas Disponibles',
  'Special Offer': 'Oferta Especial',
  'OFF': 'DESC',
  'Special Offers & Promotions': 'Ofertas Especiales y Promociones',
  "Don't miss out on these amazing deals!": 'No te pierdas estas ofertas increibles!',
  'Loading offers...': 'Cargando ofertas...',
  'Promotions are currently disabled.': 'Las promociones estan desactivadas actualmente.',
  'Failed to load promotions.': 'No se pudieron cargar las promociones.',
  'Please try refreshing the page or contact support if the issue persists.': 'Intenta recargar la pagina o contacta soporte si el problema continua.',
  'Loading promotions...': 'Cargando promociones...',
  'Unable to load promotions at the moment.': 'No se pueden cargar las promociones en este momento.',
  'Please try again later.': 'Por favor intenta de nuevo mas tarde.',
  'No active promotions at the moment.': 'No hay promociones activas en este momento.',
  'Check back soon for exciting offers!': 'Vuelve pronto para ver ofertas emocionantes!',
  'Promotion': 'Promocion',
  'Copy code': 'Copiar codigo',
  'Use this code at checkout': 'Usa este codigo al pagar',
  'Valid from:': 'Valido desde:',
  'Until:': 'Hasta:',
  'No product identifier provided': 'No se proporciono identificador de producto',
  'Uncategorized': 'Sin categoria',
  'Product not found': 'Producto no encontrado',
  'Failed to load product': 'No se pudo cargar el producto',
  'Added to cart successfully': 'Agregado al carrito correctamente',
  'Product Not Found': 'Producto No Encontrado',
  'reviews': 'resenas',
  'Dietary Information': 'Informacion Dietetica',
  'Preparation Time': 'Tiempo de Preparacion',
  'minutes': 'minutos',
  'Included Products': 'Productos Incluidos',
  'Qty:': 'Cant.:',
  'Nutritional Information': 'Informacion Nutricional',
  'Decrease quantity': 'Disminuir cantidad',
  'Increase quantity': 'Aumentar cantidad',
  
  // blog detail page
  'Loading blog post...': 'Cargando articulo del blog...',
  'Blog Post Not Found': 'Articulo del Blog No Encontrado',
  "The blog post you're looking for doesn't exist.": 'El articulo del blog que buscas no existe.',
  'min read': 'min de lectura',
  'Written by': 'Escrito por',
  'Related Posts': 'Articulos Relacionados',
  
  // shop page error messages
  'Please login to add items to cart': 'Por favor inicia sesion para agregar articulos al carrito',
  'Failed to add to cart. Please try again.': 'No se pudo agregar al carrito. Por favor intenta de nuevo.',
  
  
};

function getFallback(text: string): string {
  const lowerText = text.toLowerCase();
  for (const [eng, esp] of Object.entries(fallbackTranslations)) {
    if (lowerText === eng.toLowerCase()) {
      // Preserve original casing
      if (text === text.toUpperCase()) return esp.toUpperCase();
      if (text[0] === text[0].toUpperCase()) {
        return esp.charAt(0).toUpperCase() + esp.slice(1);
      }
      return esp;
    }
  }
  return text;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en');
  const [, forceUpdate] = useState(0);

  // Load language from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('language') as Language;
      if (saved === 'en' || saved === 'es') {
        setLanguageState(saved);
      }
    }
  }, []);

  // Save language to localStorage when it changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('language', lang);
    }
    // Force re-render all components to update translations
    forceUpdate(prev => prev + 1);
  };

  // Synchronous translation function - returns cached or fallback
  const t = useCallback((text: string): string => {
    if (!text || language === 'en') return text;
    
    const cacheKey = `${language}:${text}`;
    
    // Return cached translation if available
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }
    
    // Get instant fallback while API loads
    const fallback = getFallback(text);
    
    // Trigger async translation in background
    translator.translate(text, language).then(translated => {
      translationCache.set(cacheKey, translated);
      // Force re-render to show API translation
      forceUpdate(prev => prev + 1);
    }).catch(() => {
      // Cache fallback on error
      translationCache.set(cacheKey, fallback);
    });
    
    // Return fallback immediately (or original if no fallback)
    return fallback;
  }, [language]);

  // Async translation for when you need to wait for the result
  const translateAsync = useCallback(async (text: string): Promise<string> => {
    if (!text || language === 'en') return text;
    
    const cacheKey = `${language}:${text}`;
    
    if (translationCache.has(cacheKey)) {
      return translationCache.get(cacheKey)!;
    }
    
    try {
      const translated = await translator.translate(text, language);
      translationCache.set(cacheKey, translated);
      return translated;
    } catch (error) {
      translationCache.set(cacheKey, text);
      return text;
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateAsync }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
