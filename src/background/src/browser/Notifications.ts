export class Notifications {
	public showNotification(opts: browser.notifications.CreateNotificationOptions) {
		return browser.notifications.create(opts);
	}
}