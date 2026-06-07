CREATE TABLE `financial_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`transactionType` enum('aporte','venda','despesa') NOT NULL,
	`category` varchar(128) NOT NULL,
	`description` text,
	`valueCents` int NOT NULL,
	`transactionDate` timestamp NOT NULL,
	`paymentMethod` varchar(64),
	`reference` varchar(255),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financial_transactions_id` PRIMARY KEY(`id`)
);
