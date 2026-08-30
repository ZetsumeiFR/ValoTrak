import type {
	CurrentMatch as DomainCurrentMatch,
	LobbyPlayer as DomainLobbyPlayer,
	RiotShard as DomainRiotShard,
	RiotAuth,
} from "@valotrak/valorant";

import type { CurrentMatch } from "./bindings/CurrentMatch";
import type { LobbyPlayer } from "./bindings/LobbyPlayer";
import type { LocalTokens } from "./bindings/LocalTokens";
import type { RiotShard } from "./bindings/RiotShard";

/**
 * Compile-time contract between the Rust-generated bindings and the hand-written
 * domain types in `@valotrak/valorant`.
 *
 * The domain types stay richer than the wire types (`phase` is a union, not a
 * string), so they cannot simply be replaced by the generated ones. These
 * assertions instead pin the two together: the key sets must match exactly (any
 * Rust rename, addition or removal fails the build) and the domain shape must
 * remain assignable to the generated wire shape.
 *
 * This module has no runtime output; it exists purely to fail `tsc`.
 */
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

type AssertTrue<T extends true> = T;

type _SameCurrentMatchKeys = AssertTrue<
	Equal<keyof CurrentMatch, keyof DomainCurrentMatch>
>;
type _SameLobbyPlayerKeys = AssertTrue<
	Equal<keyof LobbyPlayer, keyof DomainLobbyPlayer>
>;
type _SameRiotShardKeys = AssertTrue<
	Equal<keyof RiotShard, keyof DomainRiotShard>
>;

type _DomainMatchIsWireCompatible = AssertTrue<
	DomainCurrentMatch extends CurrentMatch ? true : false
>;
type _DomainShardIsWireCompatible = AssertTrue<
	DomainRiotShard extends RiotShard ? true : false
>;

/** `enrichLobby` receives the command output directly as its auth context. */
type _TokensCoverRiotAuth = AssertTrue<
	LocalTokens extends RiotAuth ? true : false
>;
