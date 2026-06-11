CREATE TABLE `criatorio_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(255) NOT NULL,
	`category` varchar(128) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileName` varchar(255) NOT NULL,
	`mimeType` varchar(128),
	`fileSize` int,
	`description` text,
	`documentDate` timestamp,
	`expirationDate` timestamp,
	`status` enum('vigente','vencido','em_andamento','arquivado') NOT NULL DEFAULT 'vigente',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `criatorio_documents_id` PRIMARY KEY(`id`)
);
