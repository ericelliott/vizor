var UINodeProperties = function(domElement){

	UIAbstractProperties.apply(this, arguments)
	domElement = domElement || document.getElementById('nodePropertiesPane')
	var that = this

	this.dom = {
		container: $(domElement),
		nodeProps: {

		},
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

		var update = this.queueUpdate.bind(this)
		node.on('pluginStateChanged', update)
		node.on('pluginInputSlotValueChanged', update)
		node.on('renamed', update)
		node.on('connected', update)
		node.on('disconnected', update)
		this.detachQueue.push(function(){node.off('pluginStateChanged', update)})
		this.detachQueue.push(function(){node.off('pluginInputSlotValueChanged', update)})
		this.detachQueue.push(function(){node.off('renamed', update)})
		this.detachQueue.push(function(){node.off('connected', update)})
		this.detachQueue.push(function(){node.off('disconnected', update)})
	}
}

UIObjectProperties.prototype.onDetach = function() {
	delete this.controls
	this.controls = {}
}

UINodeProperties.prototype.onSelectedNodeChanged = function(selected) {
	if (!selected) return
	if (!this.selected.length  &&  !selected.length) return
	this.selected = selected
	this.render()
	console.log('selected node changed ', selected)
}

UINodeProperties.prototype.getAdapter = function() {
	var that = this

	var adapter = {
		common: {
			get enabled() {
				var s = that.getSelectedSingleRef()
				return !!s
			},
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
	if (node && node.plugin && (typeof node.plugin.getInspectorProperties === 'function')) {
		adapter.nodeProps = node.plugin.getInspectorProperties()
		adapter.nodeProps.enabled = true
	} else {
		adapter.nodeProps = {}
		adapter.nodeProps.enabled = false
	}

	if (node && node.plugin && (typeof node.plugin.getInspectorSlots === 'function')) {
		adapter.slotProps = node.plugin.getInspectorSlots()
		adapter.slotProps.enabled = true
	} else {
		adapter.slotProps = {}
		adapter.slotProps.enabled = false
	}

	return adapter
}
UINodeProperties.prototype.getControls = function() {
	var controls = {}
	var node = this.getSelectedNodeRef()

	function makeControl(key, prop) {
		switch (prop.dt) {
			case E2.dt.BOOL:
				c = new UICheckbox(prop, 'value', null, function(e, value, oldValue){
					node.plugin.undoableSetState(key, value, oldValue)
				})
		}
		return c
	}


	if (this.adapter.nodeProps && this.adapter.nodeProps.enabled) {
		var np = this.adapter.nodeProps
		var c = makeControl('always_update', np.always_update)
		controls.nodeProps = {
			always_update : {
				dt : np.always_update.dt.name,
				label : np.always_update.label,
				control : c
			}
		}
		this.detachQueue.push(c.destroy.bind(c))
	}

	if (this.adapter.slotProps && this.adapter.slotProps.enabled) {
		var sp = this.adapter.slotProps

		controls.slotProps = {}
		if (sp.a) {
			var c2 = new UICheckbox(sp.a, 'value', null, function (e, v, o) {
				this.onSourceChange()	// if the slot is connected
			})
			controls.slotProps.a = {
				dt: sp.a.dt.name,
				label: sp.a.label,
				control: c2
			}
			this.detachQueue.push(c2.destroy.bind(c2))
		}

		if (sp.float) {
			var c3 = new UITextField(sp.float, 'value', null, function(e,v,o){
				v = parseFloat(v)
				o = parseFloat(o)
				if (isNaN(v)) v = null
				if (isNaN(o)) o = null
				E2.app.graphApi.changeInputSlotValue(node.parent_graph, node, 'float', v, o)
			})
			controls.slotProps.float = {
				dt: sp.float.dt.name,
				label : sp.float.label,
				control : c3
			}
			this.detachQueue.push(c3.destroy.bind(c3))
		}
	}

	if (this.adapter.common && this.adapter.common.enabled) {
		controls.common = {}
		var t = new UITextField(this.adapter.common, 'nodeName')
		controls.common.nodeName = t
		this.detachQueue.push(t.destroy.bind(t))
	}

	return controls
}

UINodeProperties.prototype.update = function() {	// soft updates the template already in place
	var that = this
	console.log('update...')
	if (that.controls.nodeProps) {
		Object.keys(that.controls.nodeProps).forEach(function (k) {
			that.controls.nodeProps[k].control.onSourceChange()
		})
	}

	if (that.controls.slotProps) {
		Object.keys(that.controls.slotProps).forEach(function (k) {
			console.log('controls ...' + k)
			that.controls.slotProps[k].control.onSourceChange()
		})
	}

	if (that.controls.common) {
		Object.keys(that.controls.common).forEach(function (k) {
			that.controls.common[k].onSourceChange()
		})
	}

	return this
}