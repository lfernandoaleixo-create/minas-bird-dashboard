CREATE TABLE `topic_comments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicKey` varchar(255) NOT NULL,
	`comment` text NOT NULL,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `topic_comments_id` PRIMARY KEY(`id`),
	CONSTRAINT `topic_comments_topicKey_unique` UNIQUE(`topicKey`)
);
