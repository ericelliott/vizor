// -> create -> (reset: -> detach) -> select -> init -> render -> attach -> done

var rad2deg = 180 / 3.14159265358
var UIProperties = function(domElement) {
	EventEmitter.apply(this, arguments)
	domElement = domElement || document.getElementById('propertiesPane')

	var that = this;

	this.dom = {	// elements
		container: $(domElement),
		position: {},
		rotation: {},
		scale: {},
		common: {
			objectName: false,
			enableInteraction: false,
			enableTransformControls : false
		}
	}

	// holds references to UI controls tied to this.adapter properties
	this.controls = {
		enableTransformControls : null,
		objectName : null
	}

	this._nodes = null	// holds selection
	Object.defineProperty(this, 'selected', {
		get: function() {
			return this._nodes
		},
		set: function(nodes) {
			this.setSelected(nodes)
		}
	})
	Object.defineProperty(this, 'isInBuildMode', {
		get: function() {
			return E2.ui.isInBuildMode()
		}
	})


	var objectFormatter = function() {
		return {
			x: this.format(this.x || 0.0),
			y: this.format(this.y || 0.0),
			z: this.format(this.z || 0.0)
		}
	}

	this.adapter = {
		position: {
			format: function(v) { return v ? v.toFixed(3) : v},
			getFormattedObject : objectFormatter
		},
		scale: {
			format: function(v) { return v ? v.toFixed(2) : v},
			getFormattedObject : objectFormatter
		},
		rotation: {	// 3 x text/mouse input or span < (this) xyz degrees > xyz radians > quaternion
			_vec3 : null,
			format: function(v) { return v ? v.toFixed(3) : v},
			getFormattedObject : objectFormatter,
			get source() {
				var s = that.getSelectionStatePtr()
				if (!(s && s.quaternion)) return null
				return new THREE.Quaternion(s.quaternion._x, s.quaternion._y, s.quaternion._z, s.quaternion._w)
			},
			set source(q) {
				var s = that.getSelectionStatePtr()
				if (!(s && s.quaternion)) return null
				s.quaternion = q
				that.selected[0].updated = true
				return q
			},
			get vec3() {	// radians
				if (this._vec3) return this._vec3
				var q = this.source
				this._vec3 = q ? new THREE.Euler().setFromQuaternion(q, "YZX").toVector3()  : q
				return this._vec3
			},
			set vec3(v) {
				this.source = new THREE.Quaternion().setFromEuler(new THREE.Euler(v.x , v.y , v.z, "YZX"))
				that.dom.rotation.x.innerText = this.format(v.x * rad2deg)	// let's not scour the stack
				that.dom.rotation.y.innerText = this.format(v.y * rad2deg)
				that.dom.rotation.z.innerText = this.format(v.z * rad2deg)
				return this.source
			},
			get x() {	// deg
				var v = this.vec3
				return v ? v.x * rad2deg  : 0.0
			},
			set x(deg) { // deg
				var v = this.vec3
				if (!v) return
				v.x = deg / rad2deg
				this.vec3 = v
				return deg
			},
			get y() {
				var v = this.vec3
				return v ? v.y * rad2deg  : 0.0
			},
			set y(deg) {
				var v = this.vec3
				if (!v) return
				v.y = deg / rad2deg
				this.vec3 = v
				return deg
			},
			get z() {
				var v = this.vec3
				return v ? v.z * rad2deg  : 0.0
			},
			set z(deg) {
				var v = this.vec3
				if (!v) return
				v.z = deg / rad2deg
				this.vec3 = v
				return deg
			}
		},
		get quaternion() {
			return this.rotation
		},
		common : {
			get canLockTransformControls() {
				return true
			},
			get canEditName() {
				return true
			},
			get enableTransformControls() {
				var s = that.getSelectedSingleRef()
				return (s) ? !s.lockTransformControls : null
			},
			set enableTransformControls(v) {
				var s = that.getSelectedSingleRef()
				return (s) ? s.lockTransformControls = !v : null
			},
			get objectName() {
				var n = that.getSelectedNodeRef()
				return (n && n.title) ? n.title : ''
			},
			set objectName(v) {
				var n = that.getSelectedNodeRef()
				if (!n) return null
				E2.app.graphApi.renameNode(E2.core.active_graph, n, v);
				E2.ui.refreshBreadcrumb()
				return v
			}
		}
	}

	// straightforward mods w/o conversion
	;['position', 'scale'].forEach(function(property){
		['x', 'y', 'z'].forEach(function(xyz) {
			Object.defineProperty(that.adapter[property], xyz, {
				get: function () {
					var s = that.getSelectionStatePtr()
					if (!(s && s[property])) return 0.0
					return s[property][xyz]
				},
				set: function(v) {
					var s = that.getSelectionStatePtr()
					if (!(s && s[property])) return
					s[property][xyz] = v
					that.dom[property][xyz].innerText = this.format(v)
					that.selected[0].updated = true
				}
			})
		});
	});

	this.selected = []
	this.state 		= _.extend({},UIProperties.defaultState)

	E2.ui.on('worldeditor:selectionset', this.onObjectPicked.bind(this))
	E2.app.worldEditor.cameraSelector.transformControls.addEventListener('objectChange', this.onObjectChanged.bind(this))
	E2.ui.on('undo', this.onUndo.bind(this))
	E2.ui.on('redo', this.onUndo.bind(this))

	this.emit('created')
	this._render()

	E2.ui.state.on('changed:mode', this.onModeChanged.bind(this))
	E2.ui.state.on('changed:selectedObjects', this.onSelectedNodeChanged.bind(this))
}

UIProperties.prototype = Object.create(EventEmitter.prototype)

UIProperties.defaultState = {
	enabled				 : false,
	scaleTransformLinked : true
}

UIProperties.prototype.getSelectedNodeRef = function() {
	return (E2.ui.state.selectedObjects.length === 1) ? E2.ui.state.selectedObjects[0] : null
}

UIProperties.prototype.getSelectedSingleRef = function() {
	return (this.selected && this.selected.length && this.selected.length === 1)  ? this.selected[0] : null
}

UIProperties.prototype.getSelectionStatePtr = function() {
	return (this.selected && this.selected.length && this.selected.length>0)  ? this.selected[0].state : null
}

UIProperties.prototype.onObjectChanged = function() {
	if (!(this.selected && (this.selected.length > 0))) return
	this.update()
}

UIProperties.prototype.onSelectedNodeChanged = function(selected) {
	//if (!(this.selected && (this.selected.length > 0))) return
	//this._render()
	console.log('selected node changed ', selected)
}

UIProperties.prototype.onModeChanged = function() {
	this._render()
}

UIProperties.prototype.onUndo = function() {
	if (!(this.selected && (this.selected.length > 0))) return
	this._render()
}

UIProperties.prototype.onObjectPicked = function(selected) {
	if (!this.isInBuildMode) return
	this.selected = [E2.app.worldEditor.getSelectedObjectPlugin()]
	this._render()
}

UIProperties.prototype._detach = function() {
	$('*', this.dom).off('.uiProperties')

	// proxy checkboxes
	if (this.controls.enableTransformControls) {
		this.controls.enableTransformControls.destroy()
		this.controls.enableTransformControls = null
	}
	if (this.controls.objectName) {
		this.controls.objectName.destroy()
		this.controls.objectName = null
	}
	return this
}

UIProperties.prototype._attachForPatchEditor = function() {
	return false
}

UIProperties.prototype._attachFor3dEditor = function() {
	var o = {}, that = this

	if (this.selected.length < 1) return

	var positionFields = document.getElementById('propertiesSectionPosition').getElementsByTagName('span')
	this.dom.position.x = positionFields[0]
	this.dom.position.y = positionFields[1]
	this.dom.position.z = positionFields[2]

	var rotationFields = document.getElementById('propertiesSectionRotation').getElementsByTagName('span')
	this.dom.rotation.x = rotationFields[0]
	this.dom.rotation.y = rotationFields[1]
	this.dom.rotation.z = rotationFields[2]

	var scaleFields = document.getElementById('propertiesSectionScale').getElementsByTagName('span')
	this.dom.scale.x = scaleFields[0]
	this.dom.scale.y = scaleFields[1]
	this.dom.scale.z = scaleFields[2]

	function enableEntry(domElement, propertyName, propertyPart, o) {
		if (!domElement) return
		o = _.extend({
			min : -1000.0,
			max : 1000.0,
			step : 0.01,
			size : 100000,
			textInputParentNode : domElement.parentElement,

			getValue : function () {
				return that.adapter[propertyName][propertyPart]
			}
		}, o)

		var undo = null
		var statePtr = that.getSelectionStatePtr()

		var onStart = function(){
			undo = _.cloneDeep(statePtr[propertyName])
		}
		var onChange = function(v) {
			that.adapter[propertyName][propertyPart] = v
		}
		var onEnd = function(){
			that.selected[0].undoableSetState(propertyName, statePtr[propertyName], undo)
		}
		NodeUI.makeUIAdjustableValue(domElement, onStart, onChange, onEnd, o)
	}

	enableEntry(this.dom.position.x, 'position', 'x')
	enableEntry(this.dom.position.y, 'position', 'y')
	enableEntry(this.dom.position.z, 'position', 'z')

	if (this.selected[0].state.scale) {
		enableEntry(this.dom.scale.x, 'scale', 'x')
		enableEntry(this.dom.scale.y, 'scale', 'y')
		enableEntry(this.dom.scale.z, 'scale', 'z')
	}

	// rotation
	o.min = -36000.0
	o.max = 36000.0
	o.size = 72000	// 1px per deg

	enableEntry(this.dom.rotation.x, 'quaternion', 'x', o)	// undoManager needs correct name of property here
	enableEntry(this.dom.rotation.y, 'quaternion', 'y', o)
	enableEntry(this.dom.rotation.z, 'quaternion', 'z', o)

	this.dom.common.enableTransformControls = document.getElementById('propertiesEnableTransform')

	if (this.dom.common.enableTransformControls) {
		this.controls.enableTransformControls = new UICheckbox(this.adapter.common, 'enableTransformControls', this.dom.common.enableTransformControls)
	}

	this.dom.common.objectName = document.getElementById('propertiesObjectName')

	if (this.dom.common.objectName) {
		this.controls.objectName = new UITextbox(this.adapter.common, 'objectName', this.dom.common.objectName)
	}
}

UIProperties.prototype._attach = function() {
	if (this.isInBuildMode)
		return this._attachFor3dEditor()
	else
		return this._attachForPatchEditor()

}

UIProperties.prototype._reset = function() {	// resets handling, clears interface
	this._nodes = []
	this.state 		= _.cloneDeep(UIProperties.defaultState)
	this.adapter.rotation._vec3 = null
	this._detach()
	this.emit('reset')
	return this
}


UIProperties.prototype.setSelected = function(nodes) {
	if (!(nodes && (typeof nodes.length !== 'undefined')))
		return msg('ERROR: expected node[] for selection')
	this._reset()
	this._nodes = nodes
	this.emit('selected', {nodes: nodes})
	return this
}

UIProperties.prototype.getTemplate = function() {
	return this.isInBuildMode ? E2.views.partials.editor.properties : E2.views.partials.editor.nodeInspector
}

UIProperties.prototype.getTemplateData = function() {
	return {
		position : 	this.adapter.position.getFormattedObject(),
		rotation : 	this.adapter.rotation.getFormattedObject(),
		scale : 	this.adapter.scale.getFormattedObject(),
		common : 	this.adapter.common
	}
}

UIProperties.prototype._render = function() {	// hard-resets panel clearing container and rerendering template
	this._detach()

	this.adapter.rotation._vec3 = null	// force refresh

	var template = this.getTemplate()
	var props = this.getTemplateData()

	this.dom.container.empty()
	this.dom.container.html(template({
		properties: props,
		state: this.state
	}))
	VizorUI.replaceSVGButtons(this.dom.container)

	this._attach()
	this.emit('rendered', {obj: this.selected})
	return this
}

UIProperties.prototype.update = function() {	// soft updates the template already in place
	var that = this
	this.adapter.rotation._vec3 = null
	var update = function(prop) {
		that.dom[prop].x.innerText = that.adapter[prop].format(that.adapter[prop].x)
		that.dom[prop].y.innerText = that.adapter[prop].format(that.adapter[prop].y)
		that.dom[prop].z.innerText = that.adapter[prop].format(that.adapter[prop].z)
	}
	update('position')
	update('rotation')
	update('scale')

	if (that.controls.lockTransformControls) that.controls.lockTransformControls.sync()

	return this
}

