var UITextbox = function() {
	UIAbstractProxy.apply(this, arguments)
}
UITextbox.prototype = Object.create(UIAbstractProxy.prototype)
UITextbox.prototype.constructor = UITextbox

UITextbox.prototype.getAdapter = function(obj, propertyName){
	var that = this
	return {
		get value() {
			return obj[propertyName].toString()
		},
		set value(v) {
			obj[propertyName] = v.toString()
			this.updateView()
			return v
		},
		updateView: function () {
			that.element.value = this.value
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

UITextbox.prototype.onViewChange = function(e) {
	this.adapter.value = e.target.value
	this.element.blur()
}