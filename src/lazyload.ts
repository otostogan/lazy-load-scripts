export class LazyLoadScripts {
	private triggerEvents: string[];
	private userEventHandler: EventListener;
	private touchStartHandler: EventListener;
	private touchMoveHandler: EventListener;
	private touchEndHandler: EventListener;
	private clickHandler: EventListener;
	private interceptedClicks: MouseEvent[];
	private delayedScripts: {
		normal: HTMLScriptElement[];
		async: HTMLScriptElement[];
		defer: HTMLScriptElement[];
	};
	private allJQueries: any[];
	private persisted?: boolean;
	private lastBreath: number = 0;
	private domReadyFired?: boolean;

	constructor() {
		this.triggerEvents = [
			"keydown",
			"mousedown",
			"mousemove",
			"touchmove",
			"touchstart",
			"touchend",
			"wheel",
		];
		this.userEventHandler = this._triggerListener.bind(this);
		this.touchStartHandler = this._onTouchStart.bind(this);
		this.touchMoveHandler = this._onTouchMove.bind(this);
		this.touchEndHandler = this._onTouchEnd.bind(this);
		this.clickHandler = this._onClick.bind(this);
		this.interceptedClicks = [];
		window.addEventListener("pageshow", (e: PageTransitionEvent) => {
			this.persisted = e.persisted;
		});
		window.addEventListener("DOMContentLoaded", () => {
			this._preconnect3rdParties();
		});
		this.delayedScripts = { normal: [], async: [], defer: [] };
		this.allJQueries = [];
	}

	private _addUserInteractionListener(e: LazyLoadScripts): void {
		document.hidden
			? e._triggerListener()
			: (this.triggerEvents.forEach((t) =>
					window.addEventListener(t, e.userEventHandler, {
						passive: !0,
					})
			  ),
			  window.addEventListener("touchstart", e.touchStartHandler, {
					passive: !0,
			  }),
			  window.addEventListener("mousedown", e.touchStartHandler),
			  document.addEventListener(
					"visibilitychange",
					e.userEventHandler
			  ));
	}
	private _removeUserInteractionListener(): void {
		this.triggerEvents.forEach((e) =>
			window.removeEventListener(e as string, this.userEventHandler, {})
		),
			document.removeEventListener(
				"visibilitychange",
				this.userEventHandler
			);
	}
	private _onTouchStart: EventListener = (e: Event) => {
		if (e.target instanceof HTMLElement && e.target.tagName !== "HTML") {
			window.addEventListener("touchend", this.touchEndHandler);
			window.addEventListener("mouseup", this.touchEndHandler);
			window.addEventListener("touchmove", this.touchMoveHandler, {
				passive: true,
			});
			window.addEventListener("mousemove", this.touchMoveHandler);
			e.target.addEventListener("click", this.clickHandler);
			this._renameDOMAttribute(e.target, "onclick", "lazy-onclick");
		}
	};
	private _onTouchMove: EventListener = (e: Event) => {
		window.removeEventListener("touchend", this.touchEndHandler);
		window.removeEventListener("mouseup", this.touchEndHandler);
		window.removeEventListener("touchmove", this.touchMoveHandler);
		window.removeEventListener("mousemove", this.touchMoveHandler);
		if (e.target instanceof HTMLElement) {
			e.target.removeEventListener("click", this.clickHandler);
			this._renameDOMAttribute(e.target, "lazy-onclick", "onclick");
		}
	};
	private _onTouchEnd: EventListener = (e: Event) => {
		window.removeEventListener("touchend", this.touchEndHandler);
		window.removeEventListener("mouseup", this.touchEndHandler);
		window.removeEventListener("touchmove", this.touchMoveHandler);
		window.removeEventListener("mousemove", this.touchMoveHandler);
	};
	private _onClick: EventListener = (e: Event) => {
		if (e.target instanceof HTMLElement) {
			e.target.removeEventListener("click", this.clickHandler);
			this._renameDOMAttribute(e.target, "lazy-onclick", "onclick");
			this.interceptedClicks.push(e as MouseEvent);
			e.preventDefault();
			e.stopPropagation();
			e.stopImmediatePropagation();
		}
	};
	private _replayClicks(): void {
		window.removeEventListener("touchstart", this.touchStartHandler);
		window.removeEventListener("mousedown", this.touchStartHandler);
		this.interceptedClicks.forEach((e) => {
			if (e.target)
				e.target.dispatchEvent(
					new MouseEvent("click", {
						view: e.view,
						bubbles: true,
						cancelable: true,
					})
				);
		});
	}
	private _renameDOMAttribute(e: HTMLElement, t: string, n: string): void {
		if (e.hasAttribute(t)) {
			e.setAttribute(n, e.getAttribute(t)!);
			e.removeAttribute(t);
		}
	}
	private _triggerListener(): void {
		this._removeUserInteractionListener();
		if (document.readyState === "loading") {
			document.addEventListener(
				"DOMContentLoaded",
				this._loadEverythingNow.bind(this)
			);
		} else {
			this._loadEverythingNow();
		}
	}
	private _preconnect3rdParties(): void {
		let e: Array<{ src: string; crossOrigin: string | boolean }> = [];
		document
			.querySelectorAll("script[type=lazyloadscript]")
			.forEach((el) => {
				const t = el as HTMLScriptElement;
				if (t.hasAttribute("src")) {
					const n = new URL(t.src).origin;
					if (n !== location.origin) {
						e.push({
							src: n,
							crossOrigin:
								t.crossOrigin ||
								t.getAttribute("data-lazy-type") === "module",
						});
					}
				}
			});
		e = [
			...new Map(e.map((item) => [JSON.stringify(item), item])).values(),
		];
		this._batchInjectResourceHints(e as HTMLScriptElement[], "preconnect");
	}
	private async _loadEverythingNow(): Promise<void> {
		this.domReadyFired = true;
		this.lastBreath = Date.now();
		this._delayEventListeners();
		this._delayJQueryReady(this);
		this._handleDocumentWrite();
		this._registerAllDelayedScripts();
		this._preloadAllScripts();
		await this._loadScriptsFromList(this.delayedScripts.normal);
		await this._loadScriptsFromList(this.delayedScripts.defer);
		await this._loadScriptsFromList(this.delayedScripts.async);
		try {
			await this._triggerDOMContentLoaded();
			await this._triggerWindowLoad();
		} catch (e) {}
		window.dispatchEvent(new Event("lazy-allScriptsLoaded"));
		this._replayClicks();
	}

	private _registerAllDelayedScripts(): void {
		document
			.querySelectorAll("script[type=lazyloadscript]")
			.forEach((el) => {
				const e = el as HTMLScriptElement;
				if (e.hasAttribute("src")) {
					if (e.hasAttribute("async") && e.async !== false) {
						this.delayedScripts.async.push(e);
					} else if (
						(e.hasAttribute("defer") && e.defer !== false) ||
						e.getAttribute("data-lazy-type") === "module"
					) {
						this.delayedScripts.defer.push(e);
					} else {
						this.delayedScripts.normal.push(e);
					}
				} else {
					this.delayedScripts.normal.push(e);
				}
			});
	}

	private async _transformScript(e: HTMLScriptElement): Promise<void> {
		await this._littleBreath();
		return new Promise((resolve) => {
			const n = document.createElement("script");
			Array.from(e.attributes).forEach((attr) => {
				let t = attr.nodeName;
				if (t !== "type") {
					if (t === "data-lazy-type") t = "type";
					n.setAttribute(t, attr.nodeValue!);
				}
			});
			if (e.hasAttribute("src")) {
				n.addEventListener("load", () => resolve());
				n.addEventListener("error", () => resolve());
			} else {
				n.text = e.text;
				resolve();
			}
			try {
				e.parentNode?.replaceChild(n, e);
			} catch (err) {
				resolve();
			}
		});
	}

	private async _loadScriptsFromList(e: HTMLScriptElement[]): Promise<void> {
		const t = e.shift();
		if (t) {
			await this._transformScript(t);
			return this._loadScriptsFromList(e);
		}
		return Promise.resolve();
	}

	private _preloadAllScripts(): void {
		this._batchInjectResourceHints(
			[
				...this.delayedScripts.normal,
				...this.delayedScripts.defer,
				...this.delayedScripts.async,
			],
			"preload"
		);
	}

	private _batchInjectResourceHints(
		scripts: HTMLScriptElement[],
		rel: string
	): void {
		const fragment = document.createDocumentFragment();

		scripts.forEach((script) => {
			if (script.src) {
				const link = document.createElement("link");
				link.href = script.src;
				link.rel = rel;
				if (rel !== "preconnect") {
					link.as = "script";
				}
				if (
					script.getAttribute &&
					script.getAttribute("data-lazy-type") === "module"
				) {
					link.crossOrigin = "true";
				}
				if (script.crossOrigin) {
					link.crossOrigin = script.crossOrigin;
				}
				fragment.appendChild(link);
			}
		});

		document.head.appendChild(fragment);
	}

	private _delayEventListeners(): void {
		const eventMap: {
			[key: string]: {
				originalFunctions: {
					add: typeof EventTarget.prototype.addEventListener;
					remove: typeof EventTarget.prototype.removeEventListener;
				};
				eventsToRewrite: string[];
			};
		} = {};

		function rewriteEventListeners(
			target: EventTarget,
			eventName: string
		): void {
			if (!eventMap[target as any]) {
				eventMap[target as any] = {
					originalFunctions: {
						add: target.addEventListener.bind(target),
						remove: target.removeEventListener.bind(target),
					},
					eventsToRewrite: [],
				};
				target.addEventListener = function (
					event: string | Event,
					listener: EventListenerOrEventListenerObject,
					options?: boolean | AddEventListenerOptions
				): void {
					if (typeof event === "string") {
						const eventNameStr =
							eventMap[target as any].eventsToRewrite.indexOf(
								event
							) >= 0
								? `lazy-${event}`
								: event;
						eventMap[target as any].originalFunctions.add(
							eventNameStr,
							listener,
							options
						);
					} else {
						eventMap[target as any].originalFunctions.add(
							event.type,
							listener,
							options
						);
					}
				};
				target.removeEventListener = function (
					event: string | Event,
					listener: EventListenerOrEventListenerObject,
					options?: boolean | EventListenerOptions
				): void {
					if (typeof event === "string") {
						const eventNameStr =
							eventMap[target as any].eventsToRewrite.indexOf(
								event
							) >= 0
								? `lazy-${event}`
								: event;
						eventMap[target as any].originalFunctions.remove(
							eventNameStr,
							listener,
							options
						);
					} else {
						eventMap[target as any].originalFunctions.remove(
							event.type,
							listener,
							options
						);
					}
				};
			}
			eventMap[target as any].eventsToRewrite.push(eventName);
		}

		function definePropertyWithLazyPrefix(
			obj: any,
			propName: string
		): void {
			const originalValue = obj[propName];
			Object.defineProperty(obj, propName, {
				get: () => originalValue || function () {},
				set(value) {
					obj[`lazy${propName}`] = value;
				},
			});
		}

		rewriteEventListeners(document, "DOMContentLoaded");
		rewriteEventListeners(window, "DOMContentLoaded");
		rewriteEventListeners(window, "load");
		rewriteEventListeners(window, "pageshow");
		rewriteEventListeners(document, "readystatechange");

		definePropertyWithLazyPrefix(document, "onreadystatechange");
		definePropertyWithLazyPrefix(window, "onload");
		definePropertyWithLazyPrefix(window, "onpageshow");
	}

	private _delayJQueryReady(e: this): void {
		let originalJQuery = window.jQuery;

		Object.defineProperty(window, "jQuery", {
			get: () => originalJQuery,
			set(newJQuery) {
				if (
					newJQuery &&
					newJQuery.fn &&
					!e.allJQueries.includes(newJQuery)
				) {
					newJQuery.fn.ready = newJQuery.fn.init.prototype.ready =
						function (callback: (context: any) => void) {
							if (e.domReadyFired) {
								callback.bind(document)(newJQuery);
							} else {
								document.addEventListener(
									"lazy-DOMContentLoaded",
									() => callback.bind(document)(newJQuery)
								);
							}
						};

					const originalOn = newJQuery.fn.on;
					newJQuery.fn.on = newJQuery.fn.init.prototype.on =
						function (...args: any[]) {
							if (this[0] === window) {
								function transformEventNames(
									events: string
								): string {
									return events
										.split(" ")
										.map((event) =>
											event === "load" ||
											event.startsWith("load.")
												? "lazy-jquery-load"
												: event
										)
										.join(" ");
								}

								if (
									typeof args[0] === "string" ||
									args[0] instanceof String
								) {
									args[0] = transformEventNames(
										args[0] as string
									);
								} else if (typeof args[0] === "object") {
									Object.keys(args[0]).forEach((key) => {
										const newKey = transformEventNames(key);
										if (newKey !== key) {
											args[0][newKey] = args[0][key];
											delete args[0][key];
										}
									});
								}
							}
							return originalOn.apply(this, args);
						};

					e.allJQueries.push(newJQuery);
				}
				originalJQuery = newJQuery;
			},
		});
	}

	private async _triggerDOMContentLoaded(): Promise<void> {
		this.domReadyFired = true;
		await this._littleBreath();
		document.dispatchEvent(new Event("lazy-DOMContentLoaded"));
		await this._littleBreath();
		window.dispatchEvent(new Event("lazy-DOMContentLoaded"));
		await this._littleBreath();
		document.dispatchEvent(new Event("lazy-readystatechange"));
		await this._littleBreath();
		(document as any).lazyonreadystatechange?.();
	}

	private async _triggerWindowLoad(): Promise<void> {
		await this._littleBreath();
		window.dispatchEvent(new Event("lazy-load"));
		await this._littleBreath();
		(window as any).lazyonload?.();
		await this._littleBreath();
		this.allJQueries.forEach((e) => e(window).trigger("lazy-jquery-load"));
		await this._littleBreath();
		const e = new Event("lazy-pageshow");
		(e as any).persisted = this.persisted;
		window.dispatchEvent(e);
		await this._littleBreath();
		(window as any).lazyonpageshow?.({ persisted: this.persisted });
	}

	private _handleDocumentWrite(): void {
		let e = document.write;
		let t = document.writeln;
		document.write = document.writeln = function (...args: string[]): void {
			if (document.readyState === "loading") {
				e.apply(document, args);
				t.apply(document, args);
			} else {
				console.log("document.write is disabled once DOM is loaded");
			}
		};
	}

	async _littleBreath() {
		if (Date.now() - this.lastBreath > 45) {
			await this._requestAnimFrame();
			this.lastBreath = Date.now();
		}
	}
	async _requestAnimFrame() {
		return document.hidden
			? new Promise((e) => setTimeout(e))
			: new Promise((e) => requestAnimationFrame(e));
	}
	static run() {
		const e = new LazyLoadScripts();
		e._addUserInteractionListener(e);
	}
}
