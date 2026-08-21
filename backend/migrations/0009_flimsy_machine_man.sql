CREATE TABLE `artifact_search_documents` (
	`rowid` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`artifact_id` text NOT NULL,
	`locale` text NOT NULL,
	`display_name` text NOT NULL,
	`summary` text NOT NULL,
	`keywords` text NOT NULL,
	`topics` text NOT NULL,
	`summary_hash` text NOT NULL,
	`readme_hash` text,
	FOREIGN KEY (`artifact_id`) REFERENCES `artifacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `artifact_search_documents_artifact_locale_idx` ON `artifact_search_documents` (`artifact_id`,`locale`);--> statement-breakpoint
CREATE INDEX `artifact_search_documents_locale_idx` ON `artifact_search_documents` (`locale`);--> statement-breakpoint
CREATE TABLE `artifact_topics` (
	`artifact_id` text NOT NULL,
	`topic_id` text NOT NULL,
	PRIMARY KEY(`artifact_id`, `topic_id`),
	FOREIGN KEY (`artifact_id`) REFERENCES `artifacts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `artifact_topics_topic_idx` ON `artifact_topics` (`topic_id`);--> statement-breakpoint
ALTER TABLE `artifacts` ADD `summary_hash` text;--> statement-breakpoint
ALTER TABLE `artifacts` ADD `readme_hash` text;--> statement-breakpoint
CREATE VIRTUAL TABLE `artifact_search_fts` USING fts5(
	`display_name`,
	`summary`,
	`keywords`,
	`topics`,
	content=`artifact_search_documents`,
	content_rowid=`rowid`,
	tokenize='unicode61 remove_diacritics 2'
);--> statement-breakpoint
CREATE TRIGGER `artifact_search_documents_ai` AFTER INSERT ON `artifact_search_documents` BEGIN
	INSERT INTO `artifact_search_fts` (`rowid`, `display_name`, `summary`, `keywords`, `topics`)
	VALUES (new.`rowid`, new.`display_name`, new.`summary`, new.`keywords`, new.`topics`);
END;--> statement-breakpoint
CREATE TRIGGER `artifact_search_documents_ad` AFTER DELETE ON `artifact_search_documents` BEGIN
	INSERT INTO `artifact_search_fts` (`artifact_search_fts`, `rowid`, `display_name`, `summary`, `keywords`, `topics`)
	VALUES ('delete', old.`rowid`, old.`display_name`, old.`summary`, old.`keywords`, old.`topics`);
END;--> statement-breakpoint
CREATE TRIGGER `artifact_search_documents_au` AFTER UPDATE ON `artifact_search_documents` BEGIN
	INSERT INTO `artifact_search_fts` (`artifact_search_fts`, `rowid`, `display_name`, `summary`, `keywords`, `topics`)
	VALUES ('delete', old.`rowid`, old.`display_name`, old.`summary`, old.`keywords`, old.`topics`);
	INSERT INTO `artifact_search_fts` (`rowid`, `display_name`, `summary`, `keywords`, `topics`)
	VALUES (new.`rowid`, new.`display_name`, new.`summary`, new.`keywords`, new.`topics`);
END;--> statement-breakpoint
INSERT INTO `artifact_search_fts` (`artifact_search_fts`) VALUES ('rebuild');
