/**
 * Source: https://github.com/srdavo/liquid-glass
 * Licensed by its original author. Vendored locally for Tapixxo.
 */

class GlassElement extends HTMLElement {
  constructor() {
    super();
    this.clicked = false;
    this.attachShadow({ mode: "open" });

    if (GlassElement._svgFilterSupport === undefined) {
      GlassElement._svgFilterSupport = this.detectSVGFilterSupport();
    }
  }

  detectSVGFilterSupport() {
    const testElement = document.createElement("div");
    testElement.style.backdropFilter = "blur(1px)";
    if (!testElement.style.backdropFilter) return false;

    const userAgent = navigator.userAgent.toLowerCase();
    const isChrome = /chrome|chromium|crios|edg/.test(userAgent) && !/firefox|fxios/.test(userAgent);
    const isFirefox = /firefox|fxios/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|chromium|crios|edg/.test(userAgent);

    if (isChrome) return true;
    if (isFirefox || isSafari) return false;

    try {
      testElement.style.backdropFilter = "url(#test)";
      return testElement.style.backdropFilter.includes("url");
    } catch {
      return false;
    }
  }

  get hasSVGFilterSupport() {
    return GlassElement._svgFilterSupport;
  }

  static get observedAttributes() {
    return ["width", "height", "radius", "depth", "blur", "strength", "chromatic-aberration", "debug", "background-color", "responsive", "base-width", "base-height", "auto-size", "min-width", "min-height", "interactive"];
  }

  connectedCallback() {
    this.render();
    this.setupEventListeners();
    this.setupResponsive();
    if (this.autoSize) this.setupAutoSizeObserver();
  }

  setupAutoSizeObserver() {
    const observer = new MutationObserver(() => setTimeout(() => this.updateStyles(), 0));
    observer.observe(this, { childList: true, subtree: true, characterData: true });

    if (window.ResizeObserver) {
      const resizeObserver = new ResizeObserver(() => this.updateStyles());
      resizeObserver.observe(this.shadowRoot.querySelector(".glass-box"));
    }
  }

  setupResponsive() {
    if (this.hasAttribute("responsive")) {
      this.updateResponsiveSize();
      window.addEventListener("resize", () => this.updateResponsiveSize());
    }
  }

  updateResponsiveSize() {
    const baseWidth = parseInt(this.getAttribute("base-width") || this.getAttribute("width")) || 200;
    const baseHeight = parseInt(this.getAttribute("base-height") || this.getAttribute("height")) || 200;
    const viewport = window.innerWidth;
    const scale = viewport < 480 ? 0.6 : viewport < 768 ? 0.8 : viewport < 1024 ? 0.9 : 1;
    const newWidth = Math.round(baseWidth * scale);
    const newHeight = Math.round(baseHeight * scale);

    if (newWidth !== this.width || newHeight !== this.height) {
      this.setAttribute("width", newWidth);
      this.setAttribute("height", newHeight);
    }
  }

  attributeChangedCallback() {
    if (this.shadowRoot) this.render();
  }

  get width() { return parseInt(this.getAttribute("width")) || 200; }
  get height() { return parseInt(this.getAttribute("height")) || 200; }
  get radius() { return parseInt(this.getAttribute("radius")) || 50; }
  get baseDepth() { return parseInt(this.getAttribute("depth")) || 10; }
  get blur() { return parseInt(this.getAttribute("blur")) || 2; }
  get strength() { return parseInt(this.getAttribute("strength")) || 100; }
  get chromaticAberration() { return parseInt(this.getAttribute("chromatic-aberration")) || 0; }
  get debug() { return this.getAttribute("debug") === "true"; }
  get backgroundColor() { return this.getAttribute("background-color") || "rgba(255, 255, 255, 0.4)"; }
  get autoSize() { return this.hasAttribute("auto-size"); }
  get minWidth() { return parseInt(this.getAttribute("min-width")) || 0; }
  get minHeight() { return parseInt(this.getAttribute("min-height")) || 0; }
  get interactive() { return this.hasAttribute("interactive"); }
  get depth() { return this.baseDepth / (this.clicked ? 0.7 : 1); }

  setupEventListeners() {
    if (!this.interactive) return;

    const glassBox = this.shadowRoot.querySelector(".glass-box");
    glassBox.addEventListener("mousedown", () => {
      this.clicked = true;
      this.updateStyles();
    });
    glassBox.addEventListener("mouseup", () => {
      this.clicked = false;
      this.updateStyles();
    });
    glassBox.addEventListener("mouseleave", () => {
      this.clicked = false;
      this.updateStyles();
    });
    document.addEventListener("mouseup", () => {
      if (this.clicked) {
        this.clicked = false;
        this.updateStyles();
      }
    });
  }

  updateStyles() {
    const glassBox = this.shadowRoot.querySelector(".glass-box");
    if (glassBox) this.applyDynamicStyles(glassBox);
  }

  applyDynamicStyles(element) {
    const { getDisplacementFilter, getDisplacementMap } = window.DisplacementUtils;
    element.style.borderRadius = `${this.radius}px`;

    if (this.autoSize) {
      element.style.backdropFilter = "none";
      element.style.background = "rgba(255, 255, 255, 0.4)";
      void element.offsetWidth;
      void element.offsetHeight;
      const rect = element.getBoundingClientRect();
      let actualWidth = Math.ceil(rect.width);
      let actualHeight = Math.ceil(rect.height);
      if (actualWidth === 0 || actualHeight === 0) {
        requestAnimationFrame(() => this.updateStyles());
        return;
      }

      actualWidth = Math.max(actualWidth, this.minWidth, 50);
      actualHeight = Math.max(actualHeight, this.minHeight, 30);
      this.applyEffect(element, actualWidth, actualHeight, getDisplacementFilter, getDisplacementMap);
      return;
    }

    element.style.height = `${this.height}px`;
    element.style.width = `${this.width}px`;
    this.applyEffect(element, this.width, this.height, getDisplacementFilter, getDisplacementMap);
  }

  applyEffect(element, width, height, getDisplacementFilter, getDisplacementMap) {
    if (this.debug) {
      element.style.background = `url("${getDisplacementMap({ height, width, radius: this.radius, depth: this.depth })}")`;
      element.style.boxShadow = "none";
      element.style.backdropFilter = "none";
      return;
    }

    if (!this.hasSVGFilterSupport) {
      element.style.backdropFilter = `blur(${this.blur * 2}px)`;
      element.style.background = this.backgroundColor;
      element.style.boxShadow = "1px 1px 1px 0 rgba(255,255,255,.60) inset, -1px -1px 1px 0 rgba(255,255,255,.60) inset, 0 0 16px rgba(0,0,0,.04)";
      element.style.border = "1px solid rgba(255, 255, 255, 0.3)";
      return;
    }

    element.style.backdropFilter = `blur(${this.blur / 2}px) url('${getDisplacementFilter({ height, width, radius: this.radius, depth: this.depth, strength: this.strength, chromaticAberration: this.chromaticAberration })}') blur(${this.blur}px) brightness(1.1) saturate(1.5)`;
    element.style.background = this.backgroundColor;
    element.style.boxShadow = "1px 1px 1px 0 rgba(255,255,255,.60) inset, -1px -1px 1px 0 rgba(255,255,255,.60) inset, 0 0 16px rgba(0,0,0,.04)";
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: ${this.autoSize ? "inline-block" : "block"}; }
        .glass-box {
          background: rgba(255, 255, 255, 0.4);
          box-shadow: 1px 1px 1px 0 rgba(255,255,255,.60) inset, -1px -1px 1px 0 rgba(255,255,255,.60) inset, 0 0 16px rgba(0,0,0,.04);
          cursor: ${this.interactive ? "pointer" : "default"};
          transition: transform .1s ease;
          position: relative;
          ${this.autoSize ? `display: inline-block; width: fit-content; min-width: ${this.minWidth}px; min-height: ${this.minHeight}px;` : ""}
        }
        ${this.interactive ? ".glass-box:active { transform: scale(.98); }" : ""}
        .content {
          ${this.autoSize ? "" : "width: 100%; height: 100%;"}
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          text-align: center;
          font-family: sans-serif;
          ${this.autoSize ? "padding: var(--glass-padding, 16px 24px);" : ""}
        }
      </style>
      <div class="glass-box"><div class="content"><slot></slot></div></div>
    `;

    const glassBox = this.shadowRoot.querySelector(".glass-box");
    if (this.autoSize) {
      requestAnimationFrame(() => requestAnimationFrame(() => this.applyDynamicStyles(glassBox)));
    } else {
      this.applyDynamicStyles(glassBox);
    }
  }
}

customElements.define("glass-element", GlassElement);
