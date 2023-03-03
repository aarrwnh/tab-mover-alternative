type Task<T> = () => Promise<void | T>;

export class Queue<T> {
	protected queue: Task<T>[] = [];
	protected concurrentTasks = 0;

	constructor(protected maxConcurrentTasks = 1) { }

	async exec(task: Task<T>): Promise<void> {
		if (this.concurrentTasks < this.maxConcurrentTasks) {
			this.concurrentTasks++;
			await task();
			this.concurrentTasks--;

			if (this.queue.length > 0) {
				await this.exec(this.queue.shift()!);
			}
		}
		else {
			this.queue.push(task);
		}
	}
}
