// EU 14 Major Food Allergens mapping
export const allergenMap: Record<number, string> = {
  1: 'Cereals containing gluten',
  2: 'Crustaceans',
  3: 'Eggs',
  4: 'Fish',
  5: 'Peanuts',
  6: 'Soybeans',
  7: 'Milk',
  8: 'Nuts',
  9: 'Celery',
  10: 'Mustard',
  11: 'Sesame seeds',
  12: 'Sulphur dioxide and sulphites',
  13: 'Lupin',
  14: 'Molluscs'
};

export const getAllergenNames = (codes: number[]): string[] => {
  return codes.map(code => allergenMap[code]).filter(Boolean);
};

export const formatAllergenCodes = (codes: number[]): string => {
  return codes.join(', ');
};

export const formatAllergenNames = (codes: number[]): string => {
  return codes.map(code => allergenMap[code]).filter(Boolean).join(', ');
};

// Interface for menu items with allergen information
export interface MenuItemWithAllergens {
   name: string;
   dietaryNotes?: string[];
   allergenCodes?: number[];
   [key: string]: any;
 }

// Get allergen information for a menu item
export const getMenuItemAllergens = (item: MenuItemWithAllergens) => {
  if (!item.allergenCodes || item.allergenCodes.length === 0) {
    return null;
  }

  return {
    codes: item.allergenCodes,
    names: getAllergenNames(item.allergenCodes),
    formatted: formatAllergenNames(item.allergenCodes)
  };
};

// Check if a menu item contains specific allergens
export const hasAllergen = (item: MenuItemWithAllergens, allergenCode: number): boolean => {
  return item.allergenCodes?.includes(allergenCode) ?? false;
};

// Get all allergens for a category of menu items
export const getCategoryAllergens = (items: MenuItemWithAllergens[]) => {
  const allAllergens = new Set<number>();
  items.forEach(item => {
    item.allergenCodes?.forEach(code => allAllergens.add(code));
  });
  return Array.from(allAllergens).sort((a, b) => a - b);
};

// Independent allergen notes system
export interface AllergenNote {
  code: number;
  name: string;
  description?: string;
  severity?: 'high' | 'medium' | 'low';
}

// Create allergen notes from codes
export const createAllergenNotes = (codes: number[]): AllergenNote[] => {
  return codes.map(code => ({
    code,
    name: allergenMap[code],
    description: getAllergenDescription(code),
    severity: getAllergenSeverity(code)
  })).filter(note => note.name);
};

// Get detailed description for an allergen
const getAllergenDescription = (code: number): string => {
  const descriptions: Record<number, string> = {
    1: 'Wheat, rye, barley, oats, spelt, kamut',
    2: 'Shrimp, crab, lobster, crayfish',
    3: 'Chicken eggs, duck eggs, etc.',
    4: 'Salmon, tuna, cod, etc.',
    5: 'Groundnuts and products thereof',
    6: 'Soybeans and products thereof',
    7: 'Cow\'s milk, goat\'s milk, etc.',
    8: 'Almonds, hazelnuts, walnuts, etc.',
    9: 'Celery stalks, leaves, seeds',
    10: 'Mustard seeds and products',
    11: 'Sesame seeds and products',
    12: 'Used as preservative in foods',
    13: 'Lupin seeds and products',
    14: 'Clams, mussels, oysters, etc.'
  };
  return descriptions[code] || '';
};

// Get severity level for an allergen
const getAllergenSeverity = (code: number): 'high' | 'medium' | 'low' => {
  const highSeverity = [1, 2, 3, 4, 5, 7, 8]; // Most common severe allergens
  const mediumSeverity = [6, 9, 10, 11, 14]; // Moderately common
  const lowSeverity = [12, 13]; // Less common

  if (highSeverity.includes(code)) return 'high';
  if (mediumSeverity.includes(code)) return 'medium';
  return 'low';
};

// Format allergen notes for display
export const formatAllergenNotes = (notes: AllergenNote[]): string => {
  return notes.map(note => `${note.code}. ${note.name}`).join(', ');
};
