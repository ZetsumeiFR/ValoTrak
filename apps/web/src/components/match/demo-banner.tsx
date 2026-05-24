import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@valotrak/ui/components/alert";
import { FlaskConical } from "lucide-react";
import { useTranslation } from "react-i18next";

export function DemoBanner() {
	const { t } = useTranslation();
	return (
		<Alert>
			<FlaskConical />
			<AlertTitle>{t("match.demoBannerTitle")}</AlertTitle>
			<AlertDescription>{t("match.demoBannerDesc")}</AlertDescription>
		</Alert>
	);
}
