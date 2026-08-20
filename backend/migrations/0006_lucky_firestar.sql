CREATE TABLE `artifact_reviews` (
	`artifact_id` text NOT NULL,
	`account_id` text NOT NULL,
	`author_name` text NOT NULL,
	`author_avatar_url` text,
	`rating` integer NOT NULL,
	`comment` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`artifact_id`, `account_id`),
	FOREIGN KEY (`artifact_id`) REFERENCES `artifacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `artifact_reviews_account_idx` ON `artifact_reviews` (`account_id`);