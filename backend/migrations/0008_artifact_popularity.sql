ALTER TABLE `artifacts` ADD `popularity` real DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `artifacts` SET `popularity` = (`installs` * 3 + `stars` + `downloads` / 10.0)
  * (CASE WHEN `owner_account_id` IS NOT NULL THEN 1.25 ELSE 1 END)
  * (CASE WHEN `deprecated` THEN 0.1 ELSE 1 END);--> statement-breakpoint
CREATE INDEX `artifacts_popularity_idx` ON `artifacts` (`deprecated`,`popularity`);--> statement-breakpoint
CREATE INDEX `artifacts_kind_popularity_idx` ON `artifacts` (`kind`,`deprecated`,`popularity`);--> statement-breakpoint
CREATE INDEX `artifacts_rising_idx` ON `artifacts` (`deprecated`,`star_velocity_7d`,`popularity`);
