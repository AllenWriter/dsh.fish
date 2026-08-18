CREATE TABLE `artifact_metrics` (
	`artifact_id` text NOT NULL,
	`stars` integer NOT NULL,
	`downloads` integer NOT NULL,
	`installs` integer NOT NULL,
	`captured_at` integer NOT NULL,
	PRIMARY KEY(`artifact_id`, `captured_at`),
	FOREIGN KEY (`artifact_id`) REFERENCES `artifacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `artifacts` ADD `star_velocity_7d` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `artifacts` ADD `star_velocity_30d` integer DEFAULT 0 NOT NULL;
