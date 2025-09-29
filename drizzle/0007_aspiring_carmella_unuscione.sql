DROP INDEX `user_date_unique`;--> statement-breakpoint
CREATE UNIQUE INDEX `submission_user_date_unique` ON `submissions` (`user_id`,`date`);