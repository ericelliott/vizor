var UITextField = function() {
	UIAbstractProxy.apply(this, arguments)
}
UITextField.prototype = Object.create(UIAbstractProxy.prototype)
UITextField.prototype.constructor = UITextField

UITextField.prototype.getAdapter = function(obj, propertyName){
	var that = this
	return {
		get sourceValue() {
			var sv = obj[propertyName]
			return (sv || (sv === 0)) ? sv.toString() : ''
		},
		set sourceValue(v) {
			return obj[propertyName] = v.toString()
		},
		get uiValue() {
			return that.element.value
		},
		set uiValue(v) {
			return that.element.value = v
		}
	}
}

UITextField.prototype.newElement = function() {
	var domElement = document.createElement('INPUT')
	domElement.setAttribute('type', 'text')
	return domElement
}

UITextField.prototype.checkValidElement = function(domElement) {
	 return (domElement.tagName === 'INPUT')  &&  (domElement.getAttribute('type') === 'text')
}