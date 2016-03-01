var UICheckbox = function() {
	UIAbstractProxy.apply(this, arguments)
}
UICheckbox.prototype = Object.create(UIAbstractProxy.prototype)
UICheckbox.prototype.constructor = UICheckbox

UICheckbox.prototype.getAdapter = function(obj, propertyName){
	var that = this
	return {
		get sourceValue() {
			return !!obj[propertyName]
		},
		set sourceValue(v) {
			return obj[propertyName] = !!v
		},
		get targetValue() {
			return that.element.checked
		},
		set targetValue(v) {
			return that.element.checked = !!v
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
