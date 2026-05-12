/**
 * Slug generation utility for products and menu items
 * Generates URL-friendly slugs from names
 */

/**
 * Convert a string to a URL-friendly slug
 * @param text - The text to convert to a slug
 * @returns A URL-friendly slug
 */
export function generateSlug(text: string): string {
    return text
        .toLowerCase()
        .trim()
        // Replace spaces with hyphens
        .replace(/\s+/g, '-')
        // Remove special characters except hyphens
        .replace(/[^\w\-]+/g, '')
        // Replace multiple hyphens with single hyphen
        .replace(/\-\-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-+/, '')
        .replace(/-+$/, '');
}

/**
 * Generate a unique slug by appending a number if necessary
 * @param baseSlug - The base slug to make unique
 * @param existingSlugs - Array of existing slugs to check against
 * @returns A unique slug
 */
export function generateUniqueSlug(baseSlug: string, existingSlugs: string[]): string {
    let slug = baseSlug;
    let counter = 1;

    while (existingSlugs.includes(slug)) {
        slug = `${baseSlug}-${counter}`;
        counter++;
    }

    return slug;
}

/**
 * Generate slug from product/menu name with uniqueness check
 * @param name - Product or menu name
 * @param id - Product or menu ID (for fallback)
 * @param existingSlugs - Array of existing slugs
 * @returns A unique slug
 */
export function createSlugFromName(name: string, id: number, existingSlugs: string[] = []): string {
    const baseSlug = generateSlug(name);

    // If slug generation fails (empty string), use ID as fallback
    if (!baseSlug) {
        return `item-${id}`;
    }

    return generateUniqueSlug(baseSlug, existingSlugs);
}
