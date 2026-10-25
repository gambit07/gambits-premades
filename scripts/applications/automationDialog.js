import { activateDialogTokenFocus } from "../utils/dialogTokenFocus.js";

/** A shared ApplicationV2 window for automation choices and timed reactions. */
export class AutomationDialog extends foundry.applications.api.ApplicationV2 {
    static DEFAULT_OPTIONS = {
        id: "gps-automation-{id}",
        tag: "form",
        classes: ["gps-automation-dialog", "gps-dialog-timer"],
        window: {icon: "fa-solid fa-dice-d20", resizable: false, minimizable: false},
        position: {width: 520, height: "auto"},
        form: {handler: AutomationDialog.submitChoice, closeOnSubmit: false, submitOnChange: false}
    };

    #resolve;
    #reject;
    #settled = false;
    #selected = false;
    #result;
    #failure;
    #submission;
    #closing;
    #listeners;
    #ticker;
    #expiry;
    #animation;
    #deadline;
    #remaining;
    #started = false;
    #lastLabel;

    constructor(prompt = {}) {
        super({window: {title: prompt.window?.title ?? prompt.title ?? "Gambit's Premades"}, ...(prompt.position ? {position: prompt.position} : {})});
        this.prompt = prompt;
        this.buttons = prompt.buttons ?? [];
        const duration = Number(prompt.initialTimeLeft);
        this.duration = Number.isFinite(duration) && duration > 0 ? duration : 0;
        this.#remaining = this.duration;
        this.isPaused = false;
        this._closing = false;
        this.result = new Promise((resolve, reject) => {this.#resolve = resolve;this.#reject = reject;});
    }

    static async wait(prompt = {}) {
        const dialog = new this(prompt);
        try {
            prompt.created?.(dialog);
            if(!dialog._closing) await dialog.render({force: true});
            if(dialog._closing && dialog.rendered) await dialog.#finishClosedRender();
        } catch(error) {
            dialog.#failure = error;
            await dialog.close();
        }
        return dialog.result;
    }

    static async submitChoice(event, form) {
        if(event.submitter && event.submitter.dataset.gpsChoice === undefined) return;
        const button = event.submitter ?? form.querySelector("[data-gps-default]");
        if(button) await this.choose(Number(button.dataset.gpsChoice), event, button);
    }

    async #finishClosedRender() {
        await super.close({animate: false});
    }

    async _renderHTML() {
        const fragment = document.createElement("div");
        const body = document.createElement("section");
        body.className = "gps-prompt-body";
        body.innerHTML = foundry.utils.cleanHTML(String(this.prompt.content ?? ""));
        for(const form of body.querySelectorAll("form")) form.replaceWith(...form.childNodes);
        for(const button of body.querySelectorAll('button[id^="pauseButton_"]')) {
            const group = button.closest(".gps-dialog-button-container");
            if(group && group.querySelectorAll("button").length === 1) group.remove();
            else button.remove();
        }
        for(const button of body.querySelectorAll("button:not([type])")) button.type = "button";
        fragment.append(body);
        const footer = document.createElement("footer");
        footer.className = "gps-prompt-footer";
        if(this.duration > 0) {
            const timer = document.createElement("div");
            timer.className = "gps-prompt-timer";
            const remaining = document.createElement("span");
            remaining.className = "gps-time-remaining";
            remaining.setAttribute("aria-live", "off");
            const pause = document.createElement("button");
            pause.type = "button";
            pause.className = "gps-pause-btn";
            pause.dataset.gpsPause = "";
            timer.append(remaining, pause);
            footer.append(timer);
        }
        const actions = document.createElement("div");
        actions.className = "gps-prompt-actions";
        actions.classList.toggle("gps-prompt-actions-list", this.prompt.buttonLayout === "list");
        const requestedDefault = typeof this.prompt.default === "string" ? this.buttons.findIndex(button => button.action?.toLowerCase() === this.prompt.default.toLowerCase()) : -1;
        const explicitDefault = this.buttons.findIndex(button => button.default);
        const cancelDefault = this.buttons.findIndex(button => ["no", "cancel", "close"].includes(button.action?.toLowerCase()));
        const defaultIndex = requestedDefault >= 0 ? requestedDefault : explicitDefault >= 0 ? explicitDefault : Math.max(0, cancelDefault);
        this.buttons.forEach((choice, index) => {
            const button = document.createElement("button");
            button.type = "submit";
            button.formNoValidate = choice.formNoValidate ?? ["no", "cancel", "close"].includes(choice.action?.toLowerCase());
            button.dataset.gpsChoice = index;
            button.classList.add("gps-prompt-choice", ...(choice.classes ?? []));
            if(index === defaultIndex) button.dataset.gpsDefault = "";
            if(choice.icon) {
                const icon = document.createElement("i");
                icon.className = choice.icon;
                icon.setAttribute("aria-hidden", "true");
                button.append(icon);
            }
            if(choice.image) {
                const image = document.createElement("img");
                image.src = choice.image;
                image.alt = "";
                button.append(image);
            }
            const label = document.createElement("span");
            label.className = "gps-choice-label";
            label.textContent = choice.label ?? choice.action;
            const text = document.createElement("span");
            text.className = "gps-choice-text";
            text.append(label);
            if(choice.description) {
                const description = document.createElement("span");
                description.className = "gps-choice-description";
                description.textContent = choice.description;
                text.append(description);
            }
            button.append(text);
            actions.append(button);
        });
        footer.append(actions);
        fragment.append(footer);
        return fragment;
    }

    _replaceHTML(result, content) {
        content.replaceChildren(...result.childNodes);
    }

    async _onRender(context, options) {
        await super._onRender(context, options);
        if(this._closing) return;
        this.#listeners?.abort();
        this.#listeners = new AbortController();
        const signal = this.#listeners.signal;
        const root = this.element;
        const header = root.querySelector(".window-header");
        let progress = header?.querySelector(".gps-titlebar-progress");
        if(header && !progress) {
            progress = document.createElement("div");
            progress.className = "gps-titlebar-progress";
            progress.setAttribute("aria-hidden", "true");
            header.prepend(progress);
        }
        const full = game.settings.get("gambits-premades", "enableTimerFullAnim");
        root.classList.toggle("gps-timer-full", !!full);
        root.classList.toggle("gps-timer-thin", !full);
        root.classList.toggle("gps-dialog-untimed", !this.duration);
        root.classList.toggle("gps-dialog-mirror", this.prompt.source === "gm" && this.prompt.type === "multiDialog");
        progress?.classList.toggle("gps-titlebar-progress--thin", !full);
        root.querySelector("[data-gps-pause]")?.addEventListener("click", () => {
            this.setPaused(!this.isPaused);
            this.prompt.onPause?.({isPaused: this.isPaused, timeLeft: this.getTimeLeft()});
        }, {signal});
        root.addEventListener("keydown", event => {
            if(event.key !== "Enter" || event.isComposing || event.target.closest("button, textarea, select")) return;
            const button = root.querySelector("[data-gps-default]");
            if(button) {event.preventDefault();root.requestSubmit(button);}
        }, {signal});
        this.#attachSelections(signal);
        await this.prompt.render?.({target: this}, this);
        if(this._closing) return;
        if(!this.#started) {
            this.#started = true;
            if(this.duration && !this.isPaused) this.#deadline = performance.now() + this.#remaining * 1000;
        }
        this.#schedule();
        this.updateUI(true);
        const focus = root.querySelector("[autofocus], .gps-prompt-body input:not([type=hidden]), .gps-prompt-body select, .gps-prompt-body textarea") ?? root.querySelector("[data-gps-default]");
        focus?.focus({preventScroll: true});
        activateDialogTokenFocus(this, signal);
    }

    #attachSelections(signal) {
        const root = this.element;
        root.addEventListener("click", event => {
            const label = event.target.closest("label[for]");
            if(!label || event.target.closest("input, select, textarea, button, a")) return;
            const control = root.querySelector(`#${CSS.escape(label.htmlFor)}`);
            if(!control || control === label.control) return;
            event.preventDefault();
            control.focus();
            if(control.matches('input[type="checkbox"], input[type="radio"]')) control.click();
        }, {signal});
        const select = root.querySelector('select[id^="item-select_"]');
        const image = root.querySelector('img[id^="weapon-img_"]');
        const updateImage = () => {const src = select?.selectedOptions[0]?.dataset.img;if(image && src) image.src = src;};
        updateImage();
        select?.addEventListener("change", updateImage, {signal});
        root.addEventListener("change", event => {
            if(!event.target.matches("input.enemy-tokens") || !Number.isFinite(this.prompt.numTargets)) return;
            if(root.querySelectorAll("input.enemy-tokens:checked").length <= this.prompt.numTargets) return;
            event.target.checked = false;
            ui.notifications.warn(game.i18n.format("GAMBITSPREMADES.Notifications.Helpers.CanOnlySelectUp", {numTargets: this.prompt.numTargets}));
        }, {signal});
        const list = root.querySelector("#damage-list");
        let dragged;
        list?.addEventListener("dragstart", event => {
            dragged = event.target.closest("li");
            if(!dragged) return;
            event.dataTransfer.setData("text/plain", dragged.textContent);
            event.dataTransfer.effectAllowed = "move";
        }, {signal});
        list?.addEventListener("dragover", event => {
            const target = event.target.closest("li");
            if(!dragged || !target || target === dragged || !list.contains(target)) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            const bounds = target.getBoundingClientRect();
            list.insertBefore(dragged, event.clientY > bounds.top + bounds.height / 2 ? target.nextSibling : target);
        }, {signal});
        list?.addEventListener("dragend", () => dragged = null, {signal});
        const title = root.querySelector(".window-title");
        title?.addEventListener("mousedown", () => this.prompt.token?.object?.control({releaseOthers: true}), {signal});
    }

    async choose(index, event, button) {
        if(this._closing || this.#submission || !this.buttons[index]) return;
        if(this.duration && this.#started && this.getTimeLeft() <= 0) return this.close();
        if(!button.formNoValidate && !this.element.reportValidity()) return;
        this.#selected = true;
        this.#stopTimer();
        for(const control of this.element.querySelectorAll(".window-content button, .window-content input, .window-content select, .window-content textarea")) control.disabled = true;
        this.element.setAttribute("aria-busy", "true");
        const choice = this.buttons[index];
        this.#submission = Promise.resolve().then(async () => {
            try {
                const result = await choice.callback?.(event, button, this);
                this.#result = result === undefined ? choice.action : result;
            } catch(error) {this.#failure = error;}
        });
        await this.#submission;
        await this.close();
    }

    getTimeLeft() {
        if(!this.#started || this.isPaused || !this.#deadline) return this.#remaining;
        return Math.max(0, Math.min(this.duration, (this.#deadline - performance.now()) / 1000));
    }

    setTimeLeft(seconds) {
        this.#remaining = Math.min(this.duration, Math.max(0, Number(seconds) || 0));
        if(this.#started && !this.isPaused) this.#deadline = performance.now() + this.#remaining * 1000;
        this.#schedule();
        this.updateUI(true);
    }

    setPaused(paused) {
        const remaining = this.getTimeLeft();
        this.isPaused = !!paused;
        this.#remaining = remaining;
        this.#deadline = this.isPaused ? null : performance.now() + remaining * 1000;
        this.#schedule();
        this.updateUI(true);
    }

    #stopTimer() {
        clearInterval(this.#ticker);
        clearTimeout(this.#expiry);
        this.#animation?.cancel();
        this.#ticker = this.#expiry = this.#animation = undefined;
    }

    #schedule() {
        this.#stopTimer();
        if(!this.#started || !this.duration || this._closing || this.#selected) return;
        const remaining = this.getTimeLeft();
        const progress = this.element?.querySelector(".gps-titlebar-progress");
        if(progress) {
            progress.style.transform = `scaleX(${remaining / this.duration})`;
            if(!this.isPaused && remaining && progress.animate) this.#animation = progress.animate([
                {transform: `scaleX(${remaining / this.duration})`}, {transform: "scaleX(0)"}
            ], {duration: remaining * 1000, easing: "linear", fill: "forwards"});
        }
        if(remaining <= 0) {void this.close();return;}
        if(this.isPaused) return;
        this.#ticker = setInterval(() => this.updateUI(), 200);
        this.#expiry = setTimeout(() => {void this.close();}, remaining * 1000);
    }

    updateUI(force = false) {
        const root = this.element;
        if(!root || this._closing) return;
        const remaining = this.getTimeLeft();
        const label = `${Math.ceil(remaining)}:${this.isPaused}`;
        if(!force && label === this.#lastLabel) return;
        this.#lastLabel = label;
        const title = root.querySelector(".window-title");
        if(title) title.textContent = this.duration ? game.i18n.format("GAMBITSPREMADES.Dialogs.Window.TimedTitle", {title: this.title, seconds: Math.ceil(remaining)}) : this.title;
        const timer = root.querySelector(".gps-time-remaining");
        if(timer) timer.textContent = this.isPaused ? game.i18n.localize("GAMBITSPREMADES.Dialogs.Window.Paused") : game.i18n.format("GAMBITSPREMADES.Dialogs.Window.Remaining", {seconds: Math.ceil(remaining)});
        const pause = root.querySelector("[data-gps-pause]");
        if(pause) {
            pause.replaceChildren();
            const icon = document.createElement("i");
            icon.className = this.isPaused ? "fas fa-play" : "fas fa-pause";
            icon.setAttribute("aria-hidden", "true");
            pause.append(icon, document.createTextNode(game.i18n.localize(this.isPaused ? "GAMBITSPREMADES.Dialogs.Window.Resume" : "GAMBITSPREMADES.Dialogs.Common.Pause")));
            pause.setAttribute("aria-pressed", String(this.isPaused));
        }
        const colors = game.gps.getDialogColors({type: this.prompt.type, source: this.prompt.source, timeLeft: this.duration ? remaining : 1, initialTimeLeft: this.duration || 1});
        root.style.setProperty("--gps-timer-color", colors.borderColorStop);
        root.style.setProperty("--gps-accent", colors.borderColorStop);
        root.style.setProperty("--gps-select-color", colors.selectColor);
        root.style.setProperty("--gps-option-color", colors.optionColor);
        root.style.setProperty("--gps-pause-color", colors.pauseColor);
        const channels = colors.optionColor.match(/[\d.]+/g)?.slice(0, 3).map(value => {
            const channel = Number(value) / 255;
            return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
        });
        const luminance = channels?.length === 3 ? channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 : 0;
        root.style.setProperty("--gps-option-text-color", luminance > 0.179 ? "#000" : "#fff");
        if(this.duration && !this.#animation) root.querySelector(".gps-titlebar-progress")?.style.setProperty("transform", `scaleX(${remaining / this.duration})`);
    }

    async close(options = {}) {
        if(this.#closing) return this.#closing;
        this._closing = true;
        this.#stopTimer();
        this.#listeners?.abort();
        this.#closing = (async () => {
            if(this.#submission) await this.#submission;
            try {
                await super.close(options);
                const result = await this.prompt.close?.({target: this}, this);
                if(!this.#selected) this.#result = result ?? null;
            } catch(error) {this.#failure ??= error;}
            if(!this.#settled) {
                this.#settled = true;
                if(this.#failure) this.#reject(this.#failure);
                else this.#resolve(this.#result);
            }
            return this;
        })();
        return this.#closing;
    }
}
