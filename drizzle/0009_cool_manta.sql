CREATE TABLE `diet_calc_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`speciesId` varchar(128) NOT NULL,
	`racaoId` varchar(128),
	`racaoPct` int NOT NULL DEFAULT 70,
	`enclosureMultiplierX100` int NOT NULL DEFAULT 100,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `diet_calc_config_id` PRIMARY KEY(`id`),
	CONSTRAINT `diet_calc_config_speciesId_unique` UNIQUE(`speciesId`)
);
--> statement-breakpoint
CREATE TABLE `food_calendar_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`checkKey` varchar(255) NOT NULL,
	`checked` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_calendar_checks_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_calendar_checks_checkKey_unique` UNIQUE(`checkKey`)
);
--> statement-breakpoint
CREATE TABLE `food_calendar_foods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`quality` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_calendar_foods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_calendar_species_checks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`speciesId` varchar(128) NOT NULL,
	`checkKey` varchar(255) NOT NULL,
	`checked` int NOT NULL DEFAULT 1,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_calendar_species_checks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_calendar_species_foods` (
	`id` int AUTO_INCREMENT NOT NULL,
	`speciesId` varchar(128) NOT NULL,
	`name` varchar(255) NOT NULL,
	`category` varchar(64) NOT NULL,
	`quality` varchar(32) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `food_calendar_species_foods_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `food_calendar_species_phase` (
	`id` int AUTO_INCREMENT NOT NULL,
	`speciesId` varchar(128) NOT NULL,
	`phaseId` varchar(64) NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `food_calendar_species_phase_id` PRIMARY KEY(`id`),
	CONSTRAINT `food_calendar_species_phase_speciesId_unique` UNIQUE(`speciesId`)
);
--> statement-breakpoint
CREATE TABLE `topic_order` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` varchar(128) NOT NULL,
	`orderJson` json NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topic_order_id` PRIMARY KEY(`id`),
	CONSTRAINT `topic_order_moduleId_unique` UNIQUE(`moduleId`)
);
