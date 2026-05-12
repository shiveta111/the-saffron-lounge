/**
 * Migration Script: Generate slugs for existing products and menus
 * 
 * Run this after applying the schema migration to populate slug fields
 * for existing database records.
 * 
 * Usage:
 *   npx ts-node src/scripts/generateSlugs.ts
 */

import prisma from '../config/prisma';
import { createSlugFromName } from '../utils/slugGenerator';

async function generateSlugsForMenus() {
    console.log('Generating slugs for menu items...');

    const menus = await prisma.menu.findMany({
        where: {
            slug: null
        },
        select: {
            id: true,
            name: true
        }
    });

    console.log(`Found ${menus.length} menu items without slugs`);

    // Get all existing slugs to ensure uniqueness
    const existingMenus = await prisma.menu.findMany({
        where: {
            slug: { not: null }
        },
        select: { slug: true }
    });
    const existingSlugs = existingMenus.map(m => m.slug!);

    for (const menu of menus) {
        const slug = createSlugFromName(menu.name, menu.id, existingSlugs);
        await prisma.menu.update({
            where: { id: menu.id },
            data: { slug }
        });
        existingSlugs.push(slug);
        console.log(`✓ Menu "${menu.name}" -> "${slug}"`);
    }

    console.log('✓ Menu slugs generated successfully\n');
}

async function generateSlugsForProducts() {
    console.log('Generating slugs for products...');

    const products = await prisma.product.findMany({
        where: {
            slug: null
        },
        select: {
            id: true,
            name: true
        }
    });

    console.log(`Found ${products.length} products without slugs`);

    // Get all existing slugs to ensure uniqueness
    const existingProducts = await prisma.product.findMany({
        where: {
            slug: { not: null }
        },
        select: { slug: true }
    });
    const existingSlugs = existingProducts.map(p => p.slug!);

    for (const product of products) {
        const slug = createSlugFromName(product.name, product.id, existingSlugs);
        await prisma.product.update({
            where: { id: product.id },
            data: { slug }
        });
        existingSlugs.push(slug);
        console.log(`✓ Product "${product.name}" -> "${slug}"`);
    }

    console.log('✓ Product slugs generated successfully\n');
}

async function main() {
    try {
        console.log('Starting slug generation...\n');

        await generateSlugsForMenus();
        await generateSlugsForProducts();

        console.log('All slugs generated successfully!');
    } catch (error) {
        console.error('Error generating slugs:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
