type DefaultInputProps = {
	name: keyof Addon.DefaultSettings; // #id
	label?: string; // description
	annotation?: string;
	valid: boolean;
};

type TInput = {
	type: "String";
	value: string;
	placeholder?: string;
}

type TNumber = {
	type: "Number";
	value: number;
	placeholder?: string;
}

type InputCheckbox = {
	type: "Checkbox";
	value: boolean; // checked: boolean;
};

type InputArray = {
	type: "Array";
	value: string[];
	placeholder?: string;
};

export type InputRange = {
	type: "Range";
	value: number;
	min: number;
	max: number;
	step: number;
}

type ImageSaverRules = {
	type: "CustomObject";
	value: Addon.ImageSaverRule[];
}

export type TInputFields = DefaultInputProps & (
	TInput
	| InputCheckbox
	| InputRange
	| TNumber
	| InputArray
	| ImageSaverRules
)

export type TSettings = {
	[key: string]: {
		title: string;
		opts: TInputFields[];
	};
}