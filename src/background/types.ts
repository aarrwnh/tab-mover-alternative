export type AllowedAttributes = "textContent" | "href" | "content" | "src"

type QueryXPath = {
	type: "XPath";
	attribute?: "href" | "src";
	target: string;
}

type Deufalt = {
	type: "RegExp" | "selector";
	target: string;
	attribute?: AllowedAttributes;
}

export type MessageQuery = {
	context: Deufalt | QueryXPath;
}