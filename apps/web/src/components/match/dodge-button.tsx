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
} from "@valorant-tracker/ui/components/alert-dialog";
import { Button } from "@valorant-tracker/ui/components/button";
import { LogOut } from "lucide-react";
import { useState } from "react";

import { useDodge } from "@/lib/valorant/use-dodge";
import type { LobbyData } from "@/lib/valorant/use-lobby";

export function DodgeButton({ lobby }: { lobby: LobbyData }) {
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
				Dodge
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Dodge agent select?</AlertDialogTitle>
					<AlertDialogDescription>
						This leaves the current agent select without closing Valorant.
						Dodging costs RR and triggers a temporary queue restriction.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						onClick={() => {
							dodge.mutate(lobby);
							setOpen(false);
						}}
					>
						Dodge
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
}
