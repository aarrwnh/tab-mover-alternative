const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

export function formatDateToReadableFormat(str: string): string {
	return str.replace(
		/([0-9]{4})-([\w]+)-([0-9]+)/,
		function (_: string, year: string, month: string, day: string) {
			const index = months.indexOf(month);
			if (index !== -1) {
				return [
					year,
					String(index + 1).padStart(2, "0"),
					day.padStart(2, "0")
				].join("-");
			}
			return _;
		}
	);

}