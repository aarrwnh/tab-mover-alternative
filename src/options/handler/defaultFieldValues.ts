import type { TSettings } from "../types/FormElements";

export const defaultFormFieldValues: TSettings = {
	global: {
		title: "Tab Mover",
		opts: [
			{
				type: "Checkbox",
				name: "debugMode",
				value: false,
				label: "Enable debug mode",
				valid: true,
			},
			{
				type: "Checkbox",
				name: "switchToTabAfterMoving",
				value: false,
				label: "Switch to active tab after move to another window",
				annotation: "middle clicking on the toolbar icon ignores this options",
				valid: true,
			},
			{
				type: "Checkbox",
				name: "movePinnedTabs",
				value: false,
				label: "(not implemented) Move pinned tabs between windows (was added in version-9 for some reason...)",
				valid: true,
			},
			{
				type: "Range",
				name: "tabTravelDistance",
				value: 1,
				label: "Tab travel distance",
				min: 1,
				max: 10,
				step: 1,
				valid: true,
			},
			{
				type: "Range",
				name: "recentTabTimeout",
				value: 0,
				label: "Recent tab timeout (seconds)",
				min: 0,
				max: 3600,
				step: 10,
				valid: true
			},
		]
	},

	bookmarks: {
		title: "Bookmarks",
		opts: [
			{
				type: "Checkbox",
				name: "bookmarksCloseOnComplete",
				value: true,
				label: "Close tab when bookmarks have been saved",
				valid: true
			},
			{
				type: "String",
				name: "bookmarksSaveLocation",
				value: "",
				label: "Relative folder path location where to save bookmarks",
				valid: true
			},
			{
				type: "Array",
				name: "bookmarksAlwaysToChildFolder",
				value: [],
				label: "Always create subfolder and put bookmarks for the listed hostnames/domains: ",
				valid: true
			},
		]
	},

	multiAccountContainers: {
		title: "Multi Account Containers",
		opts: [
			{
				type: "Array",
				name: "moveableContainers",
				value: [],
				valid: true
			},
		]
	},

	imageSaver: {
		title: "Image Saver",
		opts: [
			{
				type: "Checkbox",
				name: "imageSaverCloseOnComplete",
				value: true,
				label: "Close tab when images have been saved",
				valid: true
			},
			{
				type: "CustomObject",
				name: "imageSaverRules",
				value: [],
				valid: true
			}
		]
	}
};

export const defaultImageSaverRuleObject: Addon.ImageSaverRule = {
	idx: -1,
	disabled: false,
	target: "",
	folder: "",
	findLargest: false,
	findLargestTarget: ""
};

// export let formFieldValues: TInputFields[] = [];

// export function resetFormValues() {
// 	formFieldValues = [];
// 	// for (let idx = 0; idx < defaultFormFieldValues.length; idx++) {
// 	// 	const field = { ...defaultFormFieldValues[idx] };

// 	// 	formFieldValues.push(field);
// 	// }

// 	// return formFieldValues;
// }

// resetFormValues();
