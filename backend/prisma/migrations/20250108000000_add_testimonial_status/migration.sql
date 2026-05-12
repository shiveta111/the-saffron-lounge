-- AlterTable
ALTER TABLE `testimonials` ADD COLUMN `status` VARCHAR(50) NOT NULL DEFAULT 'pending';

-- CreateIndex
CREATE INDEX `testimonials_status_idx` ON `testimonials`(`status`);


















