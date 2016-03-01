// allows a button to toggle an object var directly
var UIToggleButton = function() {
	this._toggle = function(e) {
		this.adapter.targetValue = !this.adapter.targetValue
		this._onTargetChange(e)
	}.bind(this)
	UIAbstractProxy.apply(this, arguments)
}
UIToggleButton.prototype = Object.create(UIAbstractProxy.prototype)
UIToggleButton.prototype.constructor = UIToggleButton

UIToggleButton.prototype.getAdapter = function(obj, propertyName){
	var that = this
	return {
		get sourceValue() {
			return !!obj[propertyName]
		},
		set sourceValue(v) {
			return obj[propertyName] = !!v
		},
		get targetValue() {
			return that.element.dataset.state === 'on'
		},
		set targetValue(v) {
			that.element.dataset.state = (v) ? 'on' : 'off'
			that.element.classList.toggle('uiToggle_on', !!v)
			that.element.classList.toggle('uiToggle_off', !v)
			return that.element.dataset.state
		}
	}
}

UIToggleButton.prototype.newElement = function() {
	var domElement = document.createElement('BUTTON')
	domElement.dataset.state = 'off'
	domElement.dataset.className = 'uiToggle'
	return domElement
}

UIToggleButton.prototype.checkValidElement = function(domElement) {
	var typ = domElement.getAttribute('type') || ''
	return (domElement.tagName === 'BUTTON')  &&  (typ.toLowerCase() !== 'submit')
}

UIToggleButton.prototype._attach = function() {
	this.element.addEventListener('click', this._toggle)
}

UIToggleButton.prototype._detach = function() {
	this.element.removeEventListener('click', this._toggle)
}