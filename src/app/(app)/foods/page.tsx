import type { Metadata } from "next";
import { FoodsPage, foodsStrings } from "@/features/foods";

export const metadata: Metadata = { title: foodsStrings.title };

export default function FoodsRoute() {
  return <FoodsPage />;
}
