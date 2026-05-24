import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@valotrak/ui/components/avatar";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@valotrak/ui/components/tooltip";
import type { Agent } from "@valotrak/valorant";

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
