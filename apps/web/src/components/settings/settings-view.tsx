import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valorant-tracker/ui/components/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@valorant-tracker/ui/components/card";
import { Label } from "@valorant-tracker/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@valorant-tracker/ui/components/select";
import { TriangleAlert } from "lucide-react";

import {
	type EnemyRevealMode,
	setEnemyRevealMode,
	useEnemyRevealMode,
} from "@/lib/valorant/use-settings";

const MODE_OPTIONS: {
	value: EnemyRevealMode;
	label: string;
	description: string;
}[] = [
	{
		value: "off",
		label: "Off — allies only",
		description: "Never show enemies in the live lobby.",
	},
	{
		value: "coregame",
		label: "Coregame (recommended)",
		description: "Show enemies only once the match has loaded.",
	},
	{
		value: "pregame",
		label: "Pregame (risky)",
		description:
			"Also show enemies during agent select — the highest ban risk.",
	},
];

export function SettingsView() {
	const mode = useEnemyRevealMode();
	const active = MODE_OPTIONS.find((option) => option.value === mode);

	return (
		<div className="container mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
			<h1 className="font-semibold text-lg">Settings</h1>

			<Card>
				<CardHeader>
					<CardTitle>Enemy reveal</CardTitle>
					<CardDescription>
						Controls when opponents are shown in the live lobby.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="enemy-reveal-mode">Mode</Label>
						<Select
							value={mode}
							onValueChange={(value) =>
								setEnemyRevealMode(value as EnemyRevealMode)
							}
						>
							<SelectTrigger id="enemy-reveal-mode" className="w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MODE_OPTIONS.map((option) => (
									<SelectItem key={option.value} value={option.value}>
										{option.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{active ? (
							<p className="text-muted-foreground text-xs">
								{active.description}
							</p>
						) : null}
					</div>

					<Alert variant="destructive">
						<TriangleAlert />
						<AlertTitle>Ban risk</AlertTitle>
						<AlertDescription>
							Revealing client-hidden enemy data — especially during agent
							select (pregame) — is against Riot's policy and has led to
							temporary bans. This feature is used entirely at your own risk.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		</div>
	);
}
