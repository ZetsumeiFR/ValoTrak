import { db } from "@valotrak/db";
import {
	type PlayerSnapshotPayload,
	playerStatsCache,
	trackedPlayer,
} from "@valotrak/db/schema/valorant";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const riotIdSchema = z.object({
	gameName: z.string(),
	tagLine: z.string(),
});

const rankSchema = z.object({
	tier: z.number(),
	rr: z.number(),
	peakTier: z.number().optional(),
});

const agentUsageSchema = z.object({
	agentId: z.string(),
	games: z.number(),
	winRate: z.number(),
});

const aggregatedStatsSchema = z.object({
	matchesAnalyzed: z.number(),
	kd: z.number(),
	avgKills: z.number(),
	avgDeaths: z.number(),
	avgAssists: z.number(),
	acs: z.number(),
	hsPercent: z.number(),
	winRate: z.number(),
	wins: z.number(),
	losses: z.number(),
	mainAgents: z.array(agentUsageSchema),
});

const snapshotSchema = z.object({
	riotId: riotIdSchema.optional(),
	rank: rankSchema.optional(),
	stats: aggregatedStatsSchema.optional(),
});

export const playerRouter = router({
	/** Follow (or update) a player for the current user. */
	follow: protectedProcedure
		.input(
			z.object({
				puuid: z.string().min(1),
				gameName: z.string().min(1),
				tagLine: z.string().min(1),
				region: z.string().min(1),
				note: z.string().max(500).optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const [row] = await db
				.insert(trackedPlayer)
				.values({ userId: ctx.session.user.id, ...input })
				.onConflictDoUpdate({
					target: [trackedPlayer.userId, trackedPlayer.puuid],
					set: {
						gameName: input.gameName,
						tagLine: input.tagLine,
						region: input.region,
						note: input.note,
						updatedAt: new Date(),
					},
				})
				.returning();
			return row;
		}),

	/** Stop following a player. */
	unfollow: protectedProcedure
		.input(z.object({ puuid: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			await db
				.delete(trackedPlayer)
				.where(
					and(
						eq(trackedPlayer.userId, ctx.session.user.id),
						eq(trackedPlayer.puuid, input.puuid),
					),
				);
			return { success: true };
		}),

	/** List the current user's followed players. */
	listFollowed: protectedProcedure.query(async ({ ctx }) => {
		return db
			.select()
			.from(trackedPlayer)
			.where(eq(trackedPlayer.userId, ctx.session.user.id))
			.orderBy(desc(trackedPlayer.createdAt));
	}),

	/** Append a stats snapshot for a player (history is kept for trends). */
	saveCache: protectedProcedure
		.input(
			z.object({
				puuid: z.string().min(1),
				region: z.string().min(1),
				snapshot: snapshotSchema,
			}),
		)
		.mutation(async ({ input }) => {
			const { snapshot } = input;
			const [row] = await db
				.insert(playerStatsCache)
				.values({
					puuid: input.puuid,
					region: input.region,
					tier: snapshot.rank?.tier,
					rr: snapshot.rank?.rr,
					kd: snapshot.stats?.kd,
					acs: snapshot.stats?.acs,
					hsPercent: snapshot.stats?.hsPercent,
					winRate: snapshot.stats?.winRate,
					matchesAnalyzed: snapshot.stats?.matchesAnalyzed,
					payload: snapshot satisfies PlayerSnapshotPayload,
				})
				.returning();
			return row;
		}),

	/** Read recent snapshots for a player, newest first (for trends). */
	getCache: protectedProcedure
		.input(
			z.object({
				puuid: z.string().min(1),
				limit: z.number().min(1).max(100).default(20),
			}),
		)
		.query(async ({ input }) => {
			return db
				.select()
				.from(playerStatsCache)
				.where(eq(playerStatsCache.puuid, input.puuid))
				.orderBy(desc(playerStatsCache.capturedAt))
				.limit(input.limit);
		}),
});
