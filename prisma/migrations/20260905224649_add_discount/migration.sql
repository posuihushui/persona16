-- CreateTable
CREATE TABLE `Discount` (
    `id` VARCHAR(191) NOT NULL,
    `attemptId` VARCHAR(191) NOT NULL,
    `sessionKey` VARCHAR(191) NOT NULL,
    `openId` VARCHAR(191) NULL,
    `kind` ENUM('SHARE', 'TIMED') NOT NULL,
    `percent` INTEGER NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedByOrderId` VARCHAR(191) NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `Discount_usedByOrderId_key`(`usedByOrderId`),
    INDEX `Discount_expiresAt_idx`(`expiresAt`),
    UNIQUE INDEX `Discount_attemptId_sessionKey_key`(`attemptId`, `sessionKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Discount` ADD CONSTRAINT `Discount_attemptId_fkey` FOREIGN KEY (`attemptId`) REFERENCES `Attempt`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
