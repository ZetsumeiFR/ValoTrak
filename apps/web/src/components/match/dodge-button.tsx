import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@valotrak/ui/components/alert-dialog";
import { Button } from "@valotrak/ui/components/button";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useDodge } from "@/lib/valorant/use-dodge";
import type { LobbyData } from "@/lib/valorant/use-lobby";

export function DodgeButton({ lobby }: { lobby: LobbyData }) {
	const { t } = useTranslation();
	const [open, setOpen] = useState(false);
	const dodge = useDodge();

	return (
		<AlertDialog open={open} onOpenChange={setOpen}>
			<AlertDialogTrigger
				render={
					<Button variant="destructive" size="sm" disabled={dodge.isPending} />
				}
			>
				<LogOut data-icon="inline-start" />
				{t("match.dodge")}
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{t("match.dodgeConfirmTitle")}</AlertDialogTitle>
					<AlertDialogDescription>
						{t("match.dodgeConfirmDesc")}
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={() => {
							dodge.mutate(lobby);
							setOpen(false);
						}}
					>
						{t("match.dodge")}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
