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
	this.adapter.targetValue = this.adapter.sourceValue

	this._onTargetChange = function(e){
		if (this.adapter.targetValue !== this.adapter.sourceValue) {	// blur triggers onchange. avoid it.
			this.onTargetChange(e)
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
			return this.targetValue = this.sourceValue
		},
		get: function() {
			return this.sourceValue
		}
	})
	return a
}

UIAbstractProxy.prototype._update = function() {
	this.adapter.targetValue = this.adapter.sourceValue
}

UIAbstractProxy.prototype._attach = function() {
	this.element.addEventListener('change', this._onTargetChange)
}

UIAbstractProxy.prototype._detach = function() {
	this.element.removeEventListener('change', this._onTargetChange)
}

/* overloaded methods */
UIAbstractProxy.prototype.getAdapter = function(obj, propertyName){console.error('must override getAdapter')}
UIAbstractProxy.prototype.checkValidElement = function() {return true}
/* end overloaded methods */
UIAbstractProxy.prototype.onTargetChange = function() {
	this.adapter.sourceValue = this.adapter.targetValue
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