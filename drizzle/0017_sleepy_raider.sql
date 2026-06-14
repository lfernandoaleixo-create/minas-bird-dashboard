CREATE TABLE `breeding_pairs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`speciesId` varchar(128) NOT NULL,
	`speciesName` varchar(255) NOT NULL,
	`maleId` int NOT NULL,
	`femaleId` int NOT NULL,
	`pairName` varchar(255),
	`enclosure` varchar(128),
	`pairStatus` enum('ativo','separado','em_descanso') NOT NULL DEFAULT 'ativo',
	`startDate` timestamp,
	`endDate` timestamp,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `breeding_pairs_id` PRIMARY KEY(`id`)
);
