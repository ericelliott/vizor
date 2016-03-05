var UIAbstractProxy = function(obj, propertyName, domElement, onChange) {

	var that = this
	this.uid = 'uiproxy_'+E2.uid()
	this.htmlId = false
	this.obj = obj
	this.propertyName = propertyName
	this._onChange = onChange
	this.element = null

	if (domElement) {
		this.element = this.render(domElement)
		this._attach()
	}

	return this
}

UIAbstractProxy.prototype.render = function(domElement) {
	this.createdElement = false
	if (domElement) {
		if (domElement.id) {
			this.htmlId = domElement.id
		} else {
			this.htmlId = this.uid
			domElement.id = this.uid
		}
		if (!this.checkValidElement(domElement))
			return null
		domElement.dataset.uid = this.uid
		return domElement
	} else {
		this.createdElement = true
		var el = this.newElement()
		this.htmlId = el.id = this.uid
		el.dataset.uid = this.uid
		return el
	}
}

// render this in handlebars, attaching automatically upon render
UIAbstractProxy.prototype.toString = function() {
	var that = this

	if (this.element) return ''	// already rendered some place else
	var c = document.createElement('template')
	var el = this.render()
	c.content.appendChild(el)
	var str = c.innerHTML
	el.remove()
	c.remove()

	var d = {}
	d.listener = function(e) {
		if (!(e.detail && e.detail.htmlId === that.htmlId)) return
		document.removeEventListener('uiproxy_rendered', d.listener)
		document.getElementById('_js_'+that.uid).remove()
		that._attach()
		console.info('uiproxy: attached for...' + that.htmlId)
		d = null
	}
	document.addEventListener('uiproxy_rendered', d.listener)

	str += "<script id='_js_"+ this.uid +"'>document.dispatchEvent(new CustomEvent('uiproxy_rendered', {detail:{htmlId:'" + this.htmlId + "'}}))</script>"
	return str
}

UIAbstractProxy.prototype._getAdapter = function() {
	var a = this.getAdapter(this.obj, this.propertyName)
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
	var el = document.getElementById(this.htmlId)
	if (el !== this.element) {
		console.log('element has changed', el, this.htmlId)
		this.element = el
	}
	this.adapter = this._getAdapter()
	console.log('got adapter', this.adapter)
	this._onUIChange = function(e){
		var oldSourceValue = this.adapter.sourceValue
		if (this.adapter.uiValue !== oldSourceValue) {	// blur triggers onchange. avoid it.
			this.onUIChange(e)
			if (this._onChange) this._onChange.call(this, e, this.adapter.sourceValue, oldSourceValue)
		}
	}.bind(this)
	this.attach()
	this.adapter.uiValue = this.adapter.sourceValue

	this.obj = null
	this.propertyName = null
}

UIAbstractProxy.prototype._detach = function() {
	console.log('detaching... ' + this.htmlId)
	this.detach()
}


UIAbstractProxy.prototype.attach = function() {
	this.element.addEventListener('change', this._onUIChange)
}

UIAbstractProxy.prototype.detach = function() {
	this.element.removeEventListener('change', this._onUIChange)
}


/* overloaded methods */
UIAbstractProxy.prototype.getAdapter = function(obj, propertyName){console.error('must override getAdapter')}
UIAbstractProxy.prototype.checkValidElement = function() {return true}
/* end overloaded methods */
UIAbstractProxy.prototype.onUIChange = function() {
	console.log('uichange', this.adapter.sourceValue, this.adapter.uiValue)
	this.adapter.sourceValue = this.adapter.uiValue
	if (this.element && this.element.blur)
		this.element.blur()
}

UIAbstractProxy.prototype.onSourceChange = function() {
	this._update()
	return true
}

UIAbstractProxy.prototype.destroy = function() {
	console.log('destroying')
	this._detach()
	if (this.createdElement) {
		var p = this.element.parentElement
		if (p) p.removeChild(this.element)
		this.element = null
	}
}