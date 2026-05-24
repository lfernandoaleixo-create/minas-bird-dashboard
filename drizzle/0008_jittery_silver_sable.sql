CREATE TABLE `sale_installments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`purchaseId` int NOT NULL,
	`installmentNumber` int NOT NULL,
	`valueCents` int NOT NULL,
	`dueDate` timestamp NOT NULL,
	`paidAt` timestamp,
	`installmentStatus` enum('pendente','pago','atrasado') NOT NULL DEFAULT 'pendente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `sale_installments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `client_purchases` ADD `paymentMethod` enum('pix','dinheiro','cartao_debito','cartao_credito','boleto','transferencia');--> statement-breakpoint
ALTER TABLE `client_purchases` ADD `installments` int DEFAULT 1;