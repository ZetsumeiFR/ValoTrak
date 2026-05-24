import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@valorant-tracker/ui/components/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@valorant-tracker/ui/components/tooltip";
import type { Agent } from "@valorant-tracker/valorant";

export function AgentAvatar({
	agent,
	size = "default",
	className,
}: {
	agent?: Agent;
	size?: "sm" | "default" | "lg";
	className?: string;
}) {
	const avatar = (
		<Avatar size={size} className={className}>
			{agent?.displayIcon ? (
				<AvatarImage src={agent.displayIcon} alt={agent.displayName} />
			) : null}
			<AvatarFallback>
				{agent ? agent.displayName.slice(0, 2) : "?"}
			</AvatarFallback>
		</Avatar>
	);

	if (!agent) {
		return avatar;
	}

	return (
		<Tooltip>
			<TooltipTrigger render={avatar} />
			<TooltipContent>{agent.displayName}</TooltipContent>
		</Tooltip>
	);
}
