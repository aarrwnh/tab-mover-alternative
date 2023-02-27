interface ObjectKeys {
	[key: string]: string | undefined;
}

type FormChangeCallback = undefined | ((parsedSettings: () => Addon.Settings | void) => void);

declare namespace Addon {
	declare interface ImageSaverRule {
		idx: number;
		disabled: boolean;
		/** target is bassically the RegExp */
		target: string;
		folder: string;
		findLargest: boolean;
		findLargestTarget: string;
	}

	declare interface DefaultSettings {
		switchToTabAfterMoving: boolean;
		tabTravelDistance: number;
		debugMode: boolean;
		recentTabTimeout: number;
		movePinnedTabs: boolean;
		bookmarksCloseOnComplete: boolean;
		bookmarksAlwaysToChildFolder: string[];
		bookmarksSaveLocation: string;
		imageSaverRules: ImageSaverRule[];
		moveableContainers: string[];
		imageSaverCloseOnComplete: boolean;
	}

	declare interface Settings extends DefaultSettings, ObjectKeys {
		readonly reset: () => void;
	}


	declare interface ModuleOpts {
		notifications?: Omit<browser.notifications.CreateNotificationOptions, "message"> & Partial<{ message: string; }>;
		closeTabsOnComplete?: boolean;
		formatDateMonth?: boolean; // 2021-jan-2 => 2021-01-02
	}
}

