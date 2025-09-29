DROP INDEX `submission_user_date_unique`;--> statement-breakpoint
ALTER TABLE `submissions` ADD `submission_date` text NOT NULL;--> statement-breakpoint
ALTER TABLE `submissions` ADD `updated_at` text;--> statement-breakpoint
CREATE UNIQUE INDEX `submission_user_date_unique` ON `submissions` (`user_id`,`submission_date`);