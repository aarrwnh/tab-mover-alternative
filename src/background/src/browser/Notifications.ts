export class Notifications {
	public showNotification(id: string = "", opts: browser.notifications.CreateNotificationOptions) {
		if (id !== "") {
			browser.notifications.clear(id);
		}
		return browser.notifications.create(id, opts);
	}
}
