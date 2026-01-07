export class HTMLElement {
    constructor(tagName) {
        this.element = document.createElement(tagName);
    }

    get() {
        return this.element;
    }

    createChildElement(tagName) {
        let child = new HTMLElement(tagName);
        this.element.appendChild(child.get());
        return child;
    }

    attribute(qualifiedName, value) {
        this.element.setAttribute(qualifiedName, value);
        return this;
    }

    class(clazz) {
        this.element.className = clazz;
        return this;
    }

    id(id) {
        this.element.id = id;
        return this;
    }

    style(style) {
        this.element.style = style;
        return this;
    }

    innerHTML(text) {
        this.element.innerHTML = text;
        return this;
    }

    appendAsChild(element) {
        element.appendChild(this.element);
        return this;
    }
}