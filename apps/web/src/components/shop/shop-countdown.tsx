import { useEffect, useState } from "react";

export function formatDuration(totalSeconds: number): string {
	const s = Math.max(0, Math.floor(totalSeconds));
	const days = Math.floor(s / 86400);
	const hours = Math.floor((s % 86400) / 3600);
	const minutes = Math.floor((s % 3600) / 60);
	const seconds = s % 60;
	if (days > 0) return `${days}d ${hours}h`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	if (minutes > 0) return `${minutes}m ${seconds}s`;
	return `${seconds}s`;
}

export function Countdown({ seconds }: { seconds: number }) {
	const [remaining, setRemaining] = useState(seconds);
	useEffect(() => {
		setRemaining(seconds);
		const id = setInterval(() => {
			setRemaining((r) => Math.max(0, r - 1));
		}, 1000);
		return () => clearInterval(id);
	}, [seconds]);
	return <>{formatDuration(remaining)}</>;
}
