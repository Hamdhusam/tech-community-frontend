CREATE TABLE `submissions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`attendance_class` text,
	`file_academics` text,
	`qd_official` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_date_unique` ON `submissions` (`user_id`,`date`);