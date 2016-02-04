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

	this.adapter = this.getAdapter(obj, propertyName)

	this._onViewChange = function(e){
		this.onViewChange(e)
		if (onChange) onChange()
	}.bind(this)

	this._attach()
	return this
}

UIAbstractProxy.prototype._update = function() {
	this.adapter.updateView()
}

UIAbstractProxy.prototype._attach = function() {
	this.element.addEventListener('change', this._onViewChange)
}

UIAbstractProxy.prototype._detach = function() {
	this.element.removeEventListener('change', this._onViewChange)
}

UIAbstractProxy.prototype.checkValidElement = function() {} // overloaded

UIAbstractProxy.prototype.onSourceChange = function() {
	this._update()
	return true
}

UIAbstractProxy.prototype.sync = UIAbstractProxy.prototype.onSourceChange


UIAbstractProxy.prototype.destroy = function() {
	this._detach()
	if (this.createdElement) {
		var p = this.element.parentElement
		if (p) p.removeChild(this.element)
		this.element = null
	}
}