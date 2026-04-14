CREATE TABLE `module_order` (
	`id` int AUTO_INCREMENT NOT NULL,
	`moduleId` varchar(128) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `module_order_id` PRIMARY KEY(`id`),
	CONSTRAINT `module_order_moduleId_unique` UNIQUE(`moduleId`)
);
