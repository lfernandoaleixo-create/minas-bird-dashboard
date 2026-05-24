CREATE TABLE `client_purchases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`clientId` int NOT NULL,
	`species` varchar(255) NOT NULL,
	`quantity` int NOT NULL DEFAULT 1,
	`valueCents` int,
	`invoiceNumber` varchar(64),
	`saleDate` timestamp NOT NULL,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `client_purchases_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `clients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(32) NOT NULL,
	`phone2` varchar(32),
	`email` varchar(320),
	`cpf` varchar(14),
	`address` text,
	`city` varchar(128),
	`state` varchar(2),
	`cep` varchar(10),
	`speciesInterest` json,
	`referralSource` varchar(128),
	`notes` text,
	`status` enum('ativo','inativo','lista_espera') NOT NULL DEFAULT 'ativo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `clients_id` PRIMARY KEY(`id`)
);
