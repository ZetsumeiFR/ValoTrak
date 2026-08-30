--> Orphan rows (no owner) can no longer exist: drop them before the constraint.
DELETE FROM "player_stats_cache" WHERE "user_id" IS NULL;--> statement-breakpoint
DELETE FROM "tracked_player" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "player_stats_cache" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "tracked_player" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
--> Added nullable, backfilled with the row id (unique, so existing history is
--> preserved and cannot collide), then locked to NOT NULL.
ALTER TABLE "player_stats_cache" ADD COLUMN "match_id" text;--> statement-breakpoint
UPDATE "player_stats_cache" SET "match_id" = "id" WHERE "match_id" IS NULL;--> statement-breakpoint
ALTER TABLE "player_stats_cache" ALTER COLUMN "match_id" SET NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "player_stats_cache_user_puuid_match_idx" ON "player_stats_cache" USING btree ("user_id","puuid","match_id");
