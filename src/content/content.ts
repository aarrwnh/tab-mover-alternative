import type { MessageQuery, AllowedAttributes } from "../background/types";

function useQuerySelector(
	selector: string,
	attr?: AllowedAttributes
): string {
	const el = document.querySelector<HTMLElement>(selector);

	if (el && !attr) {
		switch (el.nodeName) {
			case "META": attr = "content"; break;
		}

		if (attr) {
			return el.getAttribute(attr) || "";
		}
	}

	return "";
}

function findTextOnPage(regex: string): RegExpMatchArray[] {
	try {
		const matchAll = [...document.body.innerHTML.matchAll(new RegExp(regex, "gim"))];

		if (matchAll.length > 0) {
			// filter duplicate matches
			const duplicates: string[] = [];

			return matchAll.filter((r) => {
				if (duplicates.includes(r[0])) {
					return false;
				}

				duplicates.push(r[0]);

				return true;
			});
		}
	}
	catch (err) {
		console.error("invalid regural expression");
	}

	return [];
}

function evaluateXPath<T extends Node>(aNode: HTMLElement | Document, aExpr: string): T[] {

	if (!aExpr) throw new SyntaxError("expression can't be empty");

	const xpe = new XPathEvaluator();

	const nsResolver = xpe.createNSResolver(
		aNode.ownerDocument == null
			? aNode.documentElement
			: aNode.ownerDocument.documentElement
	);

	const result = xpe.evaluate(aExpr, aNode, nsResolver, XPathResult.ANY_TYPE, null);

	const found: Node[] = [];

	let res;

	while ((res = result.iterateNext())) {
		found.push(res);
	}

	return found as T[];
}

function queryXPath(XPath: string, attr?: AllowedAttributes): string[] {
	if (!attr) return [];

	const foundElement = evaluateXPath(document, XPath);

	return foundElement.length > 0
		? foundElement
			.map((x) => (x as HTMLElement).getAttribute(attr) || "")
			.filter((x) => x !== "")
		: [];
}

browser.runtime.onConnect.addListener(function (port) {
	port.onMessage.addListener(function (_) {
		const msg = _ as MessageQuery;

		if (!msg.context) return;

		const { target, attribute } = msg.context;

		switch (msg.context.type) {
			case "RegExp": {
				port.postMessage({ result: findTextOnPage(target) });
				break;
			}

			case "XPath": {
				port.postMessage({ result: queryXPath(target, attribute) });
				break;
			}

			case "selector": {
				port.postMessage({ result: useQuerySelector(target, attribute) });
				break;
			}
		}
	});
});
