"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/index.ts
var src_exports = {};
__export(src_exports, {
  default: () => src_default
});
module.exports = __toCommonJS(src_exports);

// src/lazyload.ts
var LazyLoadScripts = class _LazyLoadScripts {
  constructor() {
    this.lastBreath = 0;
    this._onTouchStart = (e) => {
      if (e.target instanceof HTMLElement && e.target.tagName !== "HTML") {
        window.addEventListener("touchend", this.touchEndHandler);
        window.addEventListener("mouseup", this.touchEndHandler);
        window.addEventListener("touchmove", this.touchMoveHandler, {
          passive: true
        });
        window.addEventListener("mousemove", this.touchMoveHandler);
        e.target.addEventListener("click", this.clickHandler);
        this._renameDOMAttribute(e.target, "onclick", "lazy-onclick");
      }
    };
    this._onTouchMove = (e) => {
      window.removeEventListener("touchend", this.touchEndHandler);
      window.removeEventListener("mouseup", this.touchEndHandler);
      window.removeEventListener("touchmove", this.touchMoveHandler);
      window.removeEventListener("mousemove", this.touchMoveHandler);
      if (e.target instanceof HTMLElement) {
        e.target.removeEventListener("click", this.clickHandler);
        this._renameDOMAttribute(e.target, "lazy-onclick", "onclick");
      }
    };
    this._onTouchEnd = (e) => {
      window.removeEventListener("touchend", this.touchEndHandler);
      window.removeEventListener("mouseup", this.touchEndHandler);
      window.removeEventListener("touchmove", this.touchMoveHandler);
      window.removeEventListener("mousemove", this.touchMoveHandler);
    };
    this._onClick = (e) => {
      if (e.target instanceof HTMLElement) {
        e.target.removeEventListener("click", this.clickHandler);
        this._renameDOMAttribute(e.target, "lazy-onclick", "onclick");
        this.interceptedClicks.push(e);
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };
    this.triggerEvents = [
      "keydown",
      "mousedown",
      "mousemove",
      "touchmove",
      "touchstart",
      "touchend",
      "wheel"
    ];
    this.userEventHandler = this._triggerListener.bind(this);
    this.touchStartHandler = this._onTouchStart.bind(this);
    this.touchMoveHandler = this._onTouchMove.bind(this);
    this.touchEndHandler = this._onTouchEnd.bind(this);
    this.clickHandler = this._onClick.bind(this);
    this.interceptedClicks = [];
    window.addEventListener("pageshow", (e) => {
      this.persisted = e.persisted;
    });
    window.addEventListener("DOMContentLoaded", () => {
      this._preconnect3rdParties();
    });
    this.delayedScripts = { normal: [], async: [], defer: [] };
    this.allJQueries = [];
  }
  _addUserInteractionListener(e) {
    document.hidden ? e._triggerListener() : (this.triggerEvents.forEach(
      (t) => window.addEventListener(t, e.userEventHandler, {
        passive: true
      })
    ), window.addEventListener("touchstart", e.touchStartHandler, {
      passive: true
    }), window.addEventListener("mousedown", e.touchStartHandler), document.addEventListener(
      "visibilitychange",
      e.userEventHandler
    ));
  }
  _removeUserInteractionListener() {
    this.triggerEvents.forEach(
      (e) => window.removeEventListener(e, this.userEventHandler, {})
    ), document.removeEventListener(
      "visibilitychange",
      this.userEventHandler
    );
  }
  _replayClicks() {
    window.removeEventListener("touchstart", this.touchStartHandler);
    window.removeEventListener("mousedown", this.touchStartHandler);
    this.interceptedClicks.forEach((e) => {
      if (e.target)
        e.target.dispatchEvent(
          new MouseEvent("click", {
            view: e.view,
            bubbles: true,
            cancelable: true
          })
        );
    });
  }
  _renameDOMAttribute(e, t, n) {
    if (e.hasAttribute(t)) {
      e.setAttribute(n, e.getAttribute(t));
      e.removeAttribute(t);
    }
  }
  _triggerListener() {
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
  _preconnect3rdParties() {
    let e = [];
    document.querySelectorAll("script[type=lazyloadscript]").forEach((el) => {
      const t = el;
      if (t.hasAttribute("src")) {
        const n = new URL(t.src).origin;
        if (n !== location.origin) {
          e.push({
            src: n,
            crossOrigin: t.crossOrigin || t.getAttribute("data-lazy-type") === "module"
          });
        }
      }
    });
    e = [
      ...new Map(e.map((item) => [JSON.stringify(item), item])).values()
    ];
    this._batchInjectResourceHints(e, "preconnect");
  }
  _loadEverythingNow() {
    return __async(this, null, function* () {
      this.domReadyFired = true;
      this.lastBreath = Date.now();
      this._delayEventListeners();
      this._delayJQueryReady(this);
      this._handleDocumentWrite();
      this._registerAllDelayedScripts();
      this._preloadAllScripts();
      yield this._loadScriptsFromList(this.delayedScripts.normal);
      yield this._loadScriptsFromList(this.delayedScripts.defer);
      yield this._loadScriptsFromList(this.delayedScripts.async);
      try {
        yield this._triggerDOMContentLoaded();
        yield this._triggerWindowLoad();
      } catch (e) {
      }
      window.dispatchEvent(new Event("lazy-allScriptsLoaded"));
      this._replayClicks();
    });
  }
  _registerAllDelayedScripts() {
    document.querySelectorAll("script[type=lazyloadscript]").forEach((el) => {
      const e = el;
      if (e.hasAttribute("src")) {
        if (e.hasAttribute("async") && e.async !== false) {
          this.delayedScripts.async.push(e);
        } else if (e.hasAttribute("defer") && e.defer !== false || e.getAttribute("data-lazy-type") === "module") {
          this.delayedScripts.defer.push(e);
        } else {
          this.delayedScripts.normal.push(e);
        }
      } else {
        this.delayedScripts.normal.push(e);
      }
    });
  }
  _transformScript(e) {
    return __async(this, null, function* () {
      yield this._littleBreath();
      return new Promise((resolve) => {
        var _a;
        const n = document.createElement("script");
        Array.from(e.attributes).forEach((attr) => {
          let t = attr.nodeName;
          if (t !== "type") {
            if (t === "data-lazy-type")
              t = "type";
            n.setAttribute(t, attr.nodeValue);
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
          (_a = e.parentNode) == null ? void 0 : _a.replaceChild(n, e);
        } catch (err) {
          resolve();
        }
      });
    });
  }
  _loadScriptsFromList(e) {
    return __async(this, null, function* () {
      const t = e.shift();
      if (t) {
        yield this._transformScript(t);
        return this._loadScriptsFromList(e);
      }
      return Promise.resolve();
    });
  }
  _preloadAllScripts() {
    this._batchInjectResourceHints(
      [
        ...this.delayedScripts.normal,
        ...this.delayedScripts.defer,
        ...this.delayedScripts.async
      ],
      "preload"
    );
  }
  _batchInjectResourceHints(scripts, rel) {
    const fragment = document.createDocumentFragment();
    scripts.forEach((script) => {
      if (script.src) {
        const link = document.createElement("link");
        link.href = script.src;
        link.rel = rel;
        if (rel !== "preconnect") {
          link.as = "script";
        }
        if (script.getAttribute && script.getAttribute("data-lazy-type") === "module") {
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
  _delayEventListeners() {
    const eventMap = {};
    function rewriteEventListeners(target, eventName) {
      if (!eventMap[target]) {
        eventMap[target] = {
          originalFunctions: {
            add: target.addEventListener.bind(target),
            remove: target.removeEventListener.bind(target)
          },
          eventsToRewrite: []
        };
        target.addEventListener = function(event, listener, options) {
          if (typeof event === "string") {
            const eventNameStr = eventMap[target].eventsToRewrite.indexOf(
              event
            ) >= 0 ? `lazy-${event}` : event;
            eventMap[target].originalFunctions.add(
              eventNameStr,
              listener,
              options
            );
          } else {
            eventMap[target].originalFunctions.add(
              event.type,
              listener,
              options
            );
          }
        };
        target.removeEventListener = function(event, listener, options) {
          if (typeof event === "string") {
            const eventNameStr = eventMap[target].eventsToRewrite.indexOf(
              event
            ) >= 0 ? `lazy-${event}` : event;
            eventMap[target].originalFunctions.remove(
              eventNameStr,
              listener,
              options
            );
          } else {
            eventMap[target].originalFunctions.remove(
              event.type,
              listener,
              options
            );
          }
        };
      }
      eventMap[target].eventsToRewrite.push(eventName);
    }
    function definePropertyWithLazyPrefix(obj, propName) {
      const originalValue = obj[propName];
      Object.defineProperty(obj, propName, {
        get: () => originalValue || function() {
        },
        set(value) {
          obj[`lazy${propName}`] = value;
        }
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
  _delayJQueryReady(e) {
    let originalJQuery = window.jQuery;
    Object.defineProperty(window, "jQuery", {
      get: () => originalJQuery,
      set(newJQuery) {
        if (newJQuery && newJQuery.fn && !e.allJQueries.includes(newJQuery)) {
          newJQuery.fn.ready = newJQuery.fn.init.prototype.ready = function(callback) {
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
          newJQuery.fn.on = newJQuery.fn.init.prototype.on = function(...args) {
            if (this[0] === window) {
              let transformEventNames2 = function(events) {
                return events.split(" ").map(
                  (event) => event === "load" || event.startsWith("load.") ? "lazy-jquery-load" : event
                ).join(" ");
              };
              var transformEventNames = transformEventNames2;
              if (typeof args[0] === "string" || args[0] instanceof String) {
                args[0] = transformEventNames2(
                  args[0]
                );
              } else if (typeof args[0] === "object") {
                Object.keys(args[0]).forEach((key) => {
                  const newKey = transformEventNames2(key);
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
      }
    });
  }
  _triggerDOMContentLoaded() {
    return __async(this, null, function* () {
      var _a;
      this.domReadyFired = true;
      yield this._littleBreath();
      document.dispatchEvent(new Event("lazy-DOMContentLoaded"));
      yield this._littleBreath();
      window.dispatchEvent(new Event("lazy-DOMContentLoaded"));
      yield this._littleBreath();
      document.dispatchEvent(new Event("lazy-readystatechange"));
      yield this._littleBreath();
      (_a = document.lazyonreadystatechange) == null ? void 0 : _a.call(document);
    });
  }
  _triggerWindowLoad() {
    return __async(this, null, function* () {
      var _a, _b;
      yield this._littleBreath();
      window.dispatchEvent(new Event("lazy-load"));
      yield this._littleBreath();
      (_a = window.lazyonload) == null ? void 0 : _a.call(window);
      yield this._littleBreath();
      this.allJQueries.forEach((e2) => e2(window).trigger("lazy-jquery-load"));
      yield this._littleBreath();
      const e = new Event("lazy-pageshow");
      e.persisted = this.persisted;
      window.dispatchEvent(e);
      yield this._littleBreath();
      (_b = window.lazyonpageshow) == null ? void 0 : _b.call(window, { persisted: this.persisted });
    });
  }
  _handleDocumentWrite() {
    let e = document.write;
    let t = document.writeln;
    document.write = document.writeln = function(...args) {
      if (document.readyState === "loading") {
        e.apply(document, args);
        t.apply(document, args);
      } else {
        console.log("document.write is disabled once DOM is loaded");
      }
    };
  }
  _littleBreath() {
    return __async(this, null, function* () {
      if (Date.now() - this.lastBreath > 45) {
        yield this._requestAnimFrame();
        this.lastBreath = Date.now();
      }
    });
  }
  _requestAnimFrame() {
    return __async(this, null, function* () {
      return document.hidden ? new Promise((e) => setTimeout(e)) : new Promise((e) => requestAnimationFrame(e));
    });
  }
  static run() {
    const e = new _LazyLoadScripts();
    e._addUserInteractionListener(e);
  }
};

// src/index.ts
var src_default = LazyLoadScripts;
//# sourceMappingURL=index.js.map