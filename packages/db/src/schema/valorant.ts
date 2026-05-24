import type {
	AggregatedStats,
	RankInfo,
	RiotId,
} from "@valotrak/valorant";
import { relations } from "drizzle-orm";
import {
	index,
	integer,
	jsonb,
	pgTable,
	real,
	text,
	timestamp,
	uniqueIndex,
} from "drizzle-orm/pg-core";

import { user } from "./auth";

/** A player a user has chosen to follow / favourite. */
export const trackedPlayer = pgTable(
	"tracked_player",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		userId: text("user_id")
			.notNull()
			.references(() => user.id, { onDelete: "cascade" }),
		puuid: text("puuid").notNull(),
		gameName: text("game_name").notNull(),
		tagLine: text("tag_line").notNull(),
		region: text("region").notNull(),
		note: text("note"),
		createdAt: timestamp("created_at").defaultNow().notNull(),
		updatedAt: timestamp("updated_at")
			.defaultNow()
			.$onUpdate(() => /* @__PURE__ */ new Date())
			.notNull(),
	},
	(table) => [
		uniqueIndex("tracked_player_user_puuid_idx").on(table.userId, table.puuid),
		index("tracked_player_user_idx").on(table.userId),
	],
);

/** Full snapshot stored as JSONB alongside the indexed trend columns. */
export interface PlayerSnapshotPayload {
	riotId?: RiotId;
	rank?: RankInfo;
	stats?: AggregatedStats;
}

/**
 * Append-only, timestamped snapshots of a player's stats. One row per refresh
 * so RR / KD / ACS trends can be charted over time. Indexed columns are
 * duplicated out of `payload` for cheap trend queries.
 */
export const playerStatsCache = pgTable(
	"player_stats_cache",
	{
		id: text("id")
			.primaryKey()
			.$defaultFn(() => crypto.randomUUID()),
		puuid: text("puuid").notNull(),
		region: text("region").notNull(),
		capturedAt: timestamp("captured_at").defaultNow().notNull(),
		tier: integer("tier"),
		rr: integer("rr"),
		kd: real("kd"),
		acs: real("acs"),
		hsPercent: real("hs_percent"),
		winRate: real("win_rate"),
		matchesAnalyzed: integer("matches_analyzed"),
		payload: jsonb("payload").$type<PlayerSnapshotPayload>().notNull(),
	},
	(table) => [
		index("player_stats_cache_puuid_captured_idx").on(
			table.puuid,
			table.capturedAt,
		),
	],
);

export const trackedPlayerRelations = relations(trackedPlayer, ({ one }) => ({
	user: one(user, {
		fields: [trackedPlayer.userId],
		references: [user.id],
	}),
}));
