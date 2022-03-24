import { Writable, writable } from "svelte/store";

export function validatePath(node: HTMLInputElement, _: any) {
	return {
		update(value: string): void {
			if (/\\/.test(value)) {
				node.value = value.replace("\\", "/");
			}
		}
	};
}

export function validateRegExp(_node: HTMLInputElement, _: any) {
	return {
		update(value: string) {
			try {
				new RegExp(value);
			}
			catch (error) {
				console.log((error as Error).message);
			}
		}
	};
}


type ValidateResult = {
	dirty: boolean;
	valid: boolean;
	message?: string | boolean | null;
}

function buildValidator(validators: ((value: string) => string | boolean)[]) {
	return function validate(value: string, dirty: boolean): ValidateResult {
		if (!validators || validators.length === 0) {
			return { dirty, valid: true, message: null };
		}

		const failing = validators.find((v) => v(value) !== true);

		return {
			dirty,
			valid: !failing,
			message: failing && failing(value)
		};
	};
}

// https://svelte.dev/repl/54d159b954d9412c8247807125d9fe1b?version=3.12.1
// https://svelte.dev/repl/83d4c06ff8ed4844b3c3ad150191ca3c?version=3.12.1
export function createFieldValidator(...validators: ((value: string) => string | boolean)[]): [
	Writable<ValidateResult>,
	(_node: HTMLInputElement, binding: string) => {
		update(value: string): void;
	}
] {
	const store = writable<ValidateResult>({ dirty: false, valid: false, message: null });
	const { set } = store;
	const validator = buildValidator(validators);

	function action(_node: HTMLInputElement, binding: string) {
		function validate(value: string, dirty: boolean) {
			const result = validator(value, dirty);

			set(result);
		}

		validate(binding, false);

		return {
			update(value: string) {
				validate(value, true);
			}
		};
	}

	return [store, action];
}


enum ValidatorOutputErrors {
	RequiredField = "This field is required",
	BadPath = "Incorrect path",
}

export function requiredValidator() {
	return function (value: string) {
		return (value !== undefined && value !== null && value !== "")
			|| ValidatorOutputErrors.RequiredField;
	};
}

export function pathValidator() {
	return function (value: string) {
		return (!/\/{2,}/.test(value))
			|| ValidatorOutputErrors.BadPath;
	};
}

export function regExpValidator() {
	return function (value: string) {
		try {
			new RegExp(value);
			return true;
		}
		catch (error) {
			return (error as Error).message;
		}
	};
}