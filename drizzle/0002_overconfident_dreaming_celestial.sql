CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`confirmed_notion` integer DEFAULT false NOT NULL,
	`notes` text,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `user` ADD `strikes` integer DEFAULT 0 NOT NULL;