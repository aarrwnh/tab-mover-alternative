declare interface Settings {
	switchToTabAfterMoving: boolean;
	showLastWindowIDBadge: boolean;
	moveableContainers: string[];
	tabTravelDistance: number;
	debugMode: boolean;
	recentTabTimeout: number;
	movePinnedTabs: boolean;
	readonly reset: () => void;
}