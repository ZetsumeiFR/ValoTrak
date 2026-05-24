import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@valotrak/ui/components/card";
import { Label } from "@valotrak/ui/components/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@valotrak/ui/components/select";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
	type EnemyRevealMode,
	setEnemyRevealMode,
	useEnemyRevealMode,
} from "@/lib/valorant/use-settings";

const MODE_OPTIONS: {
	value: EnemyRevealMode;
	labelKey:
		| "settings.optOffLabel"
		| "settings.optCoregameLabel"
		| "settings.optPregameLabel";
	descriptionKey:
		| "settings.optOffDesc"
		| "settings.optCoregameDesc"
		| "settings.optPregameDesc";
}[] = [
	{
		value: "off",
		labelKey: "settings.optOffLabel",
		descriptionKey: "settings.optOffDesc",
	},
	{
		value: "coregame",
		labelKey: "settings.optCoregameLabel",
		descriptionKey: "settings.optCoregameDesc",
	},
	{
		value: "pregame",
		labelKey: "settings.optPregameLabel",
		descriptionKey: "settings.optPregameDesc",
	},
];

export function SettingsView() {
	const { t } = useTranslation();
	const mode = useEnemyRevealMode();
	const active = MODE_OPTIONS.find((option) => option.value === mode);

	return (
		<div className="container mx-auto flex max-w-2xl flex-col gap-4 px-4 py-4">
			<h1 className="font-semibold text-lg">{t("settings.title")}</h1>

			<Card>
				<CardHeader>
					<CardTitle>{t("settings.enemyRevealTitle")}</CardTitle>
					<CardDescription>{t("settings.enemyRevealDesc")}</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<div className="flex flex-col gap-1.5">
						<Label htmlFor="enemy-reveal-mode">{t("settings.modeLabel")}</Label>
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
										{t(option.labelKey)}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{active ? (
							<p className="text-muted-foreground text-xs">
								{t(active.descriptionKey)}
							</p>
						) : null}
					</div>

					<Alert variant="destructive">
						<TriangleAlert />
						<AlertTitle>{t("settings.banRiskTitle")}</AlertTitle>
						<AlertDescription>{t("settings.banRiskDesc")}</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		</div>
	);
}
