import { TRPCError } from "@trpc/server";
import { db } from "@valotrak/db";
import {
	type PlayerSnapshotPayload,
	playerStatsCache,
	trackedPlayer,
} from "@valotrak/db/schema/valorant";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { protectedProcedure, router } from "../index";

const puuidSchema = z.string().min(1).max(80);
const regionSchema = z.string().min(1).max(16);

const riotIdSchema = z.object({
	gameName: z.string().min(1).max(64),
	tagLine: z.string().min(1).max(16),
});

const rankSchema = z.object({
	tier: z.number().int().min(0).max(50),
	rr: z.number().int().min(0).max(1000),
	peakTier: z.number().int().min(0).max(50).optional(),
});

const agentUsageSchema = z.object({
	agentId: z.string().min(1).max(80),
	games: z.number().int().min(0).max(1000),
	winRate: z.number().min(0).max(100),
});

const aggregatedStatsSchema = z.object({
	matchesAnalyzed: z.number().int().min(0).max(100),
	kd: z.number().min(0).max(1000),
	avgKills: z.number().min(0).max(100),
	avgDeaths: z.number().min(0).max(100),
	avgAssists: z.number().min(0).max(100),
	acs: z.number().min(0).max(2000),
	hsPercent: z.number().min(0).max(100),
	winRate: z.number().min(0).max(100),
	wins: z.number().int().min(0).max(100),
	losses: z.number().int().min(0).max(100),
	mainAgents: z.array(agentUsageSchema).max(20),
});

const snapshotSchema = z.object({
	riotId: riotIdSchema.optional(),
	rank: rankSchema.optional(),
	level: z.number().int().min(0).max(10_000).optional(),
	stats: aggregatedStatsSchema.optional(),
});

export const playerRouter = router({
	/** Follow (or update) a player for the current user. */
	follow: protectedProcedure
		.input(
			z.object({
				puuid: puuidSchema,
				gameName: z.string().min(1).max(64),
				tagLine: z.string().min(1).max(16),
				region: regionSchema,
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
		.input(z.object({ puuid: puuidSchema }))
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

	/**
	 * Append a stats snapshot for a player (history is kept for trends).
	 *
	 * Authorization: the caller MUST be following this `puuid` (i.e. have a row
	 * in `trackedPlayer` matching `userId` + `puuid`). This prevents anyone with
	 * a session from poisoning another user's history.
	 */
	saveCache: protectedProcedure
		.input(
			z.object({
				puuid: puuidSchema,
				region: regionSchema,
				snapshot: snapshotSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const followed = await db
				.select({ id: trackedPlayer.id })
				.from(trackedPlayer)
				.where(
					and(
						eq(trackedPlayer.userId, ctx.session.user.id),
						eq(trackedPlayer.puuid, input.puuid),
					),
				)
				.limit(1);
			if (followed.length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You must follow this player before saving snapshots",
				});
			}

			const { snapshot } = input;
			const [row] = await db
				.insert(playerStatsCache)
				.values({
					userId: ctx.session.user.id,
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

	/**
	 * Read recent snapshots for a player, newest first (for trends).
	 *
	 * Authorization: the caller MUST be following this `puuid`. Without this
	 * check anyone with a session could read trend history for any player
	 * whose PUUID they guessed or learned out-of-band.
	 */
	getCache: protectedProcedure
		.input(
			z.object({
				puuid: puuidSchema,
				limit: z.number().int().min(1).max(100).default(20),
			}),
		)
		.query(async ({ ctx, input }) => {
			const followed = await db
				.select({ id: trackedPlayer.id })
				.from(trackedPlayer)
				.where(
					and(
						eq(trackedPlayer.userId, ctx.session.user.id),
						eq(trackedPlayer.puuid, input.puuid),
					),
				)
				.limit(1);
			if (followed.length === 0) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "You must follow this player to read their history",
				});
			}

			return db
				.select()
				.from(playerStatsCache)
				.where(
					and(
						eq(playerStatsCache.userId, ctx.session.user.id),
						eq(playerStatsCache.puuid, input.puuid),
					),
				)
				.orderBy(desc(playerStatsCache.capturedAt))
				.limit(input.limit);
		}),
});
