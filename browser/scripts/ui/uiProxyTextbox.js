var UITextbox = function() {
	UIAbstractProxy.apply(this, arguments)
}
UITextbox.prototype = Object.create(UIAbstractProxy.prototype)
UITextbox.prototype.constructor = UITextbox

UITextbox.prototype.getAdapter = function(obj, propertyName){
	var that = this
	return {
		get sourceValue() {
			return obj[propertyName].toString()
		},
		set sourceValue(v) {
			return obj[propertyName] = v.toString()
		},
		get targetValue() {
			return that.element.value
		},
		set targetValue(v) {
			return that.element.value = v
		}
	}
}

UITextbox.prototype.newElement = function() {
	var domElement = document.createElement('INPUT')
	domElement.setAttribute('type', 'text')
	return domElement
}

UITextbox.prototype.checkValidElement = function(domElement) {
	 return (domElement.tagName === 'INPUT')  &&  (domElement.getAttribute('type') === 'text')
}