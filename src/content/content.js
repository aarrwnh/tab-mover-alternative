
function querySelector(selector) {
	/** @type {HTMLElement} */
	const el = document.querySelector(selector);
	if (el && el.nodeName === "META") {
		return el.content;
	}
	return "";
}

browser.runtime.onConnect.addListener(function (port) {
	port.onMessage.addListener(function (msg) {
		if (msg.context.querySelector) {
			port.postMessage({
				text: querySelector(msg.context.querySelector)
			});
		}
	});
});
