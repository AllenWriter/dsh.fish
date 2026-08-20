CREATE TABLE `artifact_summary_translations` (
	`artifact_id` text NOT NULL,
	`locale` text NOT NULL,
	`source_hash` text NOT NULL,
	`status` text NOT NULL,
	`text` text,
	`error` text,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`artifact_id`, `locale`),
	FOREIGN KEY (`artifact_id`) REFERENCES `artifacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `artifact_summary_translations_status_idx` ON `artifact_summary_translations` (`status`);