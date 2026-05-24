import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { FlaskConical } from "lucide-react";

export function DemoBanner() {
	return (
		<Alert>
			<FlaskConical />
			<AlertTitle>Demo mode</AlertTitle>
			<AlertDescription>
				Valorant isn't running (or this isn't Windows), so sample lobby data is
				shown. Launch the game on Windows to see live players.
			</AlertDescription>
		</Alert>
	);
}
