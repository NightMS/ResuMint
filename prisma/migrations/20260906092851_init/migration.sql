-- CreateTable
CREATE TABLE `ResumeVersion` (
    `id` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `jsonPayload` TEXT NOT NULL,
    `pdfPath` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AtsEvaluation` (
    `id` VARCHAR(191) NOT NULL,
    `resumeVersionId` VARCHAR(191) NOT NULL,
    `targetRole` VARCHAR(191) NOT NULL,
    `score` INTEGER NOT NULL,
    `isApproved` BOOLEAN NOT NULL,
    `feedback` TEXT NOT NULL,
    `evaluatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CoverLetter` (
    `id` VARCHAR(191) NOT NULL,
    `resumeVersionId` VARCHAR(191) NOT NULL,
    `targetRole` VARCHAR(191) NOT NULL,
    `companyName` VARCHAR(191) NULL,
    `content` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `AtsEvaluation` ADD CONSTRAINT `AtsEvaluation_resumeVersionId_fkey` FOREIGN KEY (`resumeVersionId`) REFERENCES `ResumeVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CoverLetter` ADD CONSTRAINT `CoverLetter_resumeVersionId_fkey` FOREIGN KEY (`resumeVersionId`) REFERENCES `ResumeVersion`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
