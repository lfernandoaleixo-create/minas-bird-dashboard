CREATE TABLE `calendar_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`speciesId` varchar(128) NOT NULL,
	`dayKey` varchar(10) NOT NULL,
	`dietLegacyId` varchar(64) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `calendar_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `diets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`legacyId` varchar(64) NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(255) NOT NULL,
	`speciesId` varchar(128) NOT NULL,
	`speciesName` varchar(255) NOT NULL,
	`racaoId` varchar(128) NOT NULL,
	`racaoName` varchar(255) NOT NULL,
	`vegetaisIds` json NOT NULL,
	`frutasIds` json NOT NULL,
	`proteicosIds` json NOT NULL,
	`weight` int NOT NULL,
	`phaseId` varchar(64) NOT NULL,
	`enclosureId` varchar(64) NOT NULL,
	`birdCount` int NOT NULL DEFAULT 1,
	`merX10` int NOT NULL,
	`totalGramsX10` int NOT NULL,
	`totalKcalX10` int NOT NULL,
	`items` json NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diets_id` PRIMARY KEY(`id`),
	CONSTRAINT `diets_legacyId_unique` UNIQUE(`legacyId`)
);
