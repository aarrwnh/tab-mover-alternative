interface RuleType {
	name: string;
	target: string;
	folder: string;
	erase?: boolean;
}

interface ObjectKeys {
	[key: string]: string | undefined;
}

declare interface Settings extends ObjectKeys {
	switchToTabAfterMoving: boolean;
	showLastWindowIDBadge: boolean;
	moveableContainers: string[];
	tabTravelDistance: number;
	debugMode: boolean;
	recentTabTimeout: number;
	movePinnedTabs: boolean;
	bookmarkAlwaysToChildFolder: string[];
	imageSaverRules: RuleType[];
	readonly reset: () => void;
}