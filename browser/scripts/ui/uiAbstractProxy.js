var UIAbstractProxy = function(obj, propertyName, domElement, onChange) {

	this.createdElement = false
	if (typeof domElement === 'undefined') {
		domElement = this.newElement()
		this.createdElement = true
	}

	if (!this.checkValidElement(domElement))
		return null

	var that = this
	this.uid = 'uiproxy_'+E2.uid()

	if (domElement.id) {
		this.htmlId = domElement.id
	} else {
		this.htmlId = this.uid
		domElement.id = this.uid
	}

	this.element = domElement
	this.element.dataset.uid = this.uid

	this.adapter = this._getAdapter(obj, propertyName)
	this.adapter.uiValue = this.adapter.sourceValue

	this._onUIChange = function(e){
		if (this.adapter.uiValue !== this.adapter.sourceValue) {	// blur triggers onchange. avoid it.
			this.onUIChange(e)
			if (onChange) onChange(e)
		}
	}.bind(this)

	this._attach()
	return this
}

UIAbstractProxy.prototype._getAdapter = function(obj, propertyName) {
	var a = this.getAdapter(obj, propertyName)
	// shorthand for setting both values at the same time
	Object.defineProperty(a, 'value', {
		set: function (v) {
			this.sourceValue = v
			return this.uiValue = this.sourceValue
		},
		get: function() {
			return this.sourceValue
		}
	})
	return a
}

UIAbstractProxy.prototype._update = function() {
	this.adapter.uiValue = this.adapter.sourceValue
}

UIAbstractProxy.prototype._attach = function() {
	this.element.addEventListener('change', this._onUIChange)
}

UIAbstractProxy.prototype._detach = function() {
	this.element.removeEventListener('change', this._onUIChange)
}

/* overloaded methods */
UIAbstractProxy.prototype.getAdapter = function(obj, propertyName){console.error('must override getAdapter')}
UIAbstractProxy.prototype.checkValidElement = function() {return true}
/* end overloaded methods */
UIAbstractProxy.prototype.onUIChange = function() {
	this.adapter.sourceValue = this.adapter.uiValue
	if (this.element.blur) this.element.blur()
}

UIAbstractProxy.prototype.onSourceChange = function() {
	this._update()
	return true
}

UIAbstractProxy.prototype.destroy = function() {
	this._detach()
	if (this.createdElement) {
		var p = this.element.parentElement
		if (p) p.removeChild(this.element)
		this.element = null
	}
}