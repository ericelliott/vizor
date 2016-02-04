var UICheckbox = function() {
	UIAbstractProxy.apply(this, arguments)
}
UICheckbox.prototype = Object.create(UIAbstractProxy.prototype)
UICheckbox.prototype.constructor = UICheckbox

UICheckbox.prototype.getAdapter = function(obj, propertyName){
	var that = this
	return {
		get value() {
			return !!obj[propertyName]
		},
		set value(v) {
			obj[propertyName] = v
			this.updateView()
			return v
		},
		updateView: function () {
			that.element.checked = this.value
		}
	}
}

UICheckbox.prototype.newElement = function() {
	var domElement = document.createElement('INPUT')
	domElement.setAttribute('type', 'checkbox')
	return domElement
}

UICheckbox.prototype.checkValidElement = function(domElement) {
	 return (domElement.tagName === 'INPUT')  &&  (domElement.getAttribute('type') === 'checkbox')
}

UICheckbox.prototype.onViewChange = function(e) {
	this.adapter.value = e.target.checked
}
