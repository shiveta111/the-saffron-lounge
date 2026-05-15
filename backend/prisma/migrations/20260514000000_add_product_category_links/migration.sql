-- CreateTable: product_category_links (many-to-many between products and categories)
CREATE TABLE `product_category_links` (
    `productId` INTEGER NOT NULL,
    `categoryId` INTEGER NOT NULL,

    INDEX `product_category_links_categoryId_fkey`(`categoryId`),
    PRIMARY KEY (`productId`, `categoryId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_category_links` ADD CONSTRAINT `product_category_links_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_category_links` ADD CONSTRAINT `product_category_links_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `categories`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;