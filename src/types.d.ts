interface RuleType {
	name: string;
	target: string;
	folder: string;
	erase?: boolean;
}

interface ObjectKeys {
	[key: string]: string | undefined;
}

declare namespace Addon {
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

	declare interface ModuleOpts {
		folder: string;
		notifications?: Omit<browser.notifications.CreateNotificationOptions, "message"> & Partial<{ message: string }>;
		closeTabsOnComplete?: boolean;
		formatDateMonth?: boolean; // 2021-jan-2 => 2021-01-02
	}
}

