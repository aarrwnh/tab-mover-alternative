export class Notifications {
	public showNotification(opts: browser.notifications.CreateNotificationOptions | void) {
		if (opts) {
			return browser.notifications.create(opts);
		}
	}
}