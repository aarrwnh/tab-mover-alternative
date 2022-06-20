export const recentFocusedWindows = (new class _<T extends number> {
	private _incognitoHistory = new Map<T, boolean>();
	private _windowIdHistory = new Set<T>();

	public get(id: T): boolean | void {
		return this._incognitoHistory.get(id);
	}

	public set(id: T, isIncognito = false): void {
		this._windowIdHistory.add(id);
		this._incognitoHistory.set(id, isIncognito);
	}

	public delete(id: T): void {
		this._windowIdHistory.delete(id);
		this._incognitoHistory.delete(id);
	}

	public sizeof(isIncognito = false): number {
		return this.filter(isIncognito).length;
	}

	get size(): number {
		return this._incognitoHistory.size;
	}

	private filter(isIncognito: boolean): T[] {
		const a: T[] = [];
		for (const [id, incognito] of this._incognitoHistory.entries()) {
			if (incognito === isIncognito) {
				a.push(id);
			}
		}
		return [...this._windowIdHistory].filter((id) => a.includes(id));
	}

	public first(isIncognito = false): T {
		return this.filter(isIncognito)[0];
	}

	public last(isIncognito = false): T {
		return this.filter(isIncognito).reverse()[0];
	}

	public recent(isIncognito = false): T {
		return this.filter(isIncognito).reverse()[1];
	}
});
