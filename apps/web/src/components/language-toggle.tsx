import { Button } from "@valotrak/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@valotrak/ui/components/dropdown-menu";
import { Check, Languages } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES } from "@/lib/i18n";

export function LanguageToggle() {
	const { i18n, t } = useTranslation();
	const current = i18n.resolvedLanguage;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger render={<Button variant="outline" size="icon" />}>
				<Languages className="h-[1.2rem] w-[1.2rem]" />
				<span className="sr-only">{t("language.toggle")}</span>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{SUPPORTED_LANGUAGES.map((lng) => (
					<DropdownMenuItem
						key={lng}
						onClick={() => i18n.changeLanguage(lng)}
						className="justify-between gap-4"
					>
						{t(`language.${lng}`)}
						{current === lng ? <Check className="size-4" /> : null}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
