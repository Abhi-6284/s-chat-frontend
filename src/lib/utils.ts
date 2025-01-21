import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import moment from "moment";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMessageDate(dateObj: Date): string {
	const now = moment();
	const date = moment(dateObj);
	const today = now.clone().startOf("day");
	const yesterday = now.clone().subtract(1, "days").startOf("day");

	if (date.isSameOrAfter(today)) {
		return date.format("HH:mm A");
	} else if (date.isSameOrAfter(yesterday)) {
		return date.format("[Yesterday] HH:mm A");
	} else {
		return date.format("MMM D, YYYY");
	}
}