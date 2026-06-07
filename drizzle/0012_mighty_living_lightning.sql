CREATE TABLE `bird_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`birdId` int NOT NULL,
	`docType` varchar(64) NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileKey` varchar(512) NOT NULL,
	`mimeType` varchar(128),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `bird_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `plantel` ADD `invoiceNumber` varchar(128);