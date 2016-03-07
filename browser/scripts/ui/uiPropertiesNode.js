var UINodeProperties = function(domElement){

	UIAbstractProperties.apply(this, arguments)
	domElement = domElement || document.getElementById('nodePropertiesPane')
	var that = this

	this.dom = {
		container: $(domElement),
		// stateProps: {}
		// slotProps: {}
		common: {
			nodeName 		: false
		}
	}

	this.controls = {}

	this.template = E2.views.partials.editor.nodeInspector
	E2.ui.state.on('changed:selectedObjects', this.onSelectedNodeChanged.bind(this))

	this.emit('created')
	this.render()
}
UINodeProperties.prototype = Object.create(UIAbstractProperties.prototype)
UINodeProperties.prototype.constructor = UINodeProperties

UINodeProperties.prototype.onAttach = function() {
	var that = this
	var node = this.getSelectedNodeRef()

	this.dom.common.nodeName = document.getElementById('propertiesNodeName')

	if (node) {
		var onRenamed = function() {
			that.controls.common.nodeName.onSourceChange()
		}
		node.on('renamed', onRenamed)
		this.detachQueue.push(function(){node.off('renamed', onRenamed)})

		// if anything is connected we wait a frame
		var update = this.queueUpdate.bind(this)
		node.on('connected', update)
		this.detachQueue.push(function(){node.off('connected', update)})
		node.on('disconnected', update)
		this.detachQueue.push(function(){node.off('disconnected', update)})
	}
}

UIObjectProperties.prototype.onDetach = function() {
	delete this.controls
	delete this.adapter
	this.controls = {}
	this.adapter = {}
}

UINodeProperties.prototype.onSelectedNodeChanged = function(selected) {
	this.selected = selected
	this.render()
}



UINodeProperties.prototype.getAdapter = function() {
	var that = this

	var adapter = {
		common: {
			get nodeName() {
				var n = that.getSelectedNodeRef()
				if (n) {
					return n.get_disp_name()
				}
				return ''
			},
			set nodeName(v) {
				var n = that.getSelectedNodeRef()
				if (!n) return null
				E2.app.graphApi.renameNode(E2.core.active_graph, n, v);
				E2.ui.refreshBreadcrumb()
				return v
			}
		}
	}

	var node = this.getSelectedNodeRef()

	if (node) {
		var stateprops = node.getInspectorStateProps()
		if (!_.isEmpty(stateprops)) {
			adapter.stateProps = {}
			Object.keys(stateprops).forEach(function(name){
				var proxy = stateprops[name]		// a slot from node.getInspectorSlots {dt:,label:,canEdit:, value:}
				adapter.stateProps[name] = UINodeProperties.uifyStateProxy(node, name, proxy)
			})
		}


		var slotprops = node.getInspectorSlotProps()
		if (!_.isEmpty(slotprops)) {
			adapter.slotProps = {}
			Object.keys(slotprops).forEach(function(name){
				var proxy = slotprops[name]		// a slot from node.getInspectorSlots {dt:,label:,canEdit:, value:}
				adapter.slotProps[name] = UINodeProperties.uifySlotProxy(node, name, proxy)
			})
		}
	}

	return adapter
}

// we can read direct from the proxy, but setting the values has to go via the graph API
// when the node actually changes its input slot value (via graph call / event), control must update
UINodeProperties.uifySlotProxy = function(node, slotName, inspectorSlotProxy) {	//
	var proxy = inspectorSlotProxy
	Object.defineProperty(proxy, 'value', {
		get: function() {
			return proxy.canEdit ? proxy._value : proxy.default
		},
		set: function(v) {
			if (proxy.canEdit)
				E2.app.graphApi.changeInputSlotValue(node.parent_graph, node, slotName, v)
			return v
		}
	})
	Object.defineProperty(proxy, 'eventName', {value: 'pluginInputSlotValueChanged'})
	return proxy
}

// as with uifySlot, this one goes via the undoManager
UINodeProperties.uifyStateProxy = function(node, varName, inspectorStateProxy) {	//
	var proxy = inspectorStateProxy
	Object.defineProperty(proxy, 'value', {
		get: function() {
			return proxy._value
		},
		set: function(v) {
			var ov = this._value
			if (proxy.canEdit)
				node.plugin.undoableSetState(varName, v, ov)
			return v
		}
	})
	Object.defineProperty(proxy, 'eventName', {value: 'pluginStateChanged'})
	return proxy
}

UINodeProperties.prototype.getControls = function() {
	var that = this
	var controls = {}
	var node = this.getSelectedNodeRef()

	// props and state vars
	var makeProp = function(props, propName, onChange) {
		var controlType = VizorUI.getControlTypeForDT(props[propName].dt)
		if (!controlType) {
			console.error('could not get control type for dt of prop:'+propName, props)
			return
		}
		if (!props[propName]) {
			console.error('no ' + propName + ' in slotProps', props)
			return
		}
		var prop = props[propName]
		var control = new controlType(prop, 'value', null, onChange)

		var changeHandler = function(key){
			if (key.name && key.name !== propName) return	// this is a slot and it's not for us
			control.onSourceChange()
		}
		control.__attach = control.attach
		control.attach = function() {
			control.__attach()
			node.on(prop.eventName, changeHandler)
		}
		control.__detach = control.detach
		control.detach = function() {
			node.off(prop.eventName, changeHandler)
			control.__detach()
		}
		if (prop.canEdit !== undefined) {
			if (!prop.canEdit) control.disable()
		}

		return {
			dt: prop.dt.name,
			label: prop.label,
			control: control
		}
	}
	if (this.adapter.stateProps) {
		var np = this.adapter.stateProps
		controls.stateProps = {_enabled: true}

		Object.keys(np).forEach(function(key){
			var c = makeProp(np, key)
			if (!c) return
			controls.stateProps[key] = c
			that.detachQueue.push(c.control.destroy.bind(c.control))
		})
	}

	if (this.adapter.slotProps) {
		var sp = this.adapter.slotProps
		controls.slotProps = {_enabled: true}

		Object.keys(sp).forEach(function(key){
			var c = makeProp(sp, key)
			if (!c) return
			controls.slotProps[key] = c
			that.detachQueue.push(c.control.destroy.bind(c.control))
		})
	}

	if (node && this.adapter.common) {
		controls.common = {_enabled:true}
		var t = new UITextField(this.adapter.common, 'nodeName')
		controls.common.nodeName = t
		this.detachQueue.push(t.destroy.bind(t))
	}

	return controls
}

UINodeProperties.prototype.update = function() {	// soft updates the template already in place
	var that = this
	var updateControls = function(controlProps, adapterProps) {
		Object.keys(controlProps).forEach(function (key) {
			var control = controlProps[key].control
			if (!control) return	// _enabled
			control.onSourceChange()
			if (adapterProps[key].canEdit)
				control.enable()
			else
				control.disable()
		})
	}
	if (that.controls.stateProps)
		updateControls(that.controls.stateProps, that.adapter.stateProps)

	if (that.controls.slotProps)
		updateControls(that.controls.slotProps, that.adapter.slotProps)

	if (that.controls.common) {
		Object.keys(that.controls.common).forEach(function (k) {
			if (!that.controls.common[k].onSourceChange) return		// _enabled
			that.controls.common[k].onSourceChange()
		})
	}

	return this
}