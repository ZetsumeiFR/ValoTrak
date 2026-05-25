import { createFileRoute } from "@tanstack/react-router";

import { ShopPage } from "@/components/shop/shop-page";

export const Route = createFileRoute("/shop")({
	component: ShopPage,
});
