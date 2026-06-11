ALTER TABLE `client_purchases` MODIFY COLUMN `paymentMethod` enum('pix','dinheiro','cartao_debito','cartao_credito','boleto','transferencia','parcelado_informal');--> statement-breakpoint
ALTER TABLE `client_purchases` ADD `birdId` int;--> statement-breakpoint
ALTER TABLE `client_purchases` ADD `purchaseMutation` varchar(255);--> statement-breakpoint
ALTER TABLE `client_purchases` ADD `docsDelivered` json;--> statement-breakpoint
ALTER TABLE `client_purchases` ADD `saleStatus` enum('concluida','em_andamento','cancelada') DEFAULT 'em_andamento' NOT NULL;