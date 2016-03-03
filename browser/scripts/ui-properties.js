// -> create -> (reset: -> detach) -> select -> init -> render -> attach -> done

var rad2deg = 180 / 3.14159265358

var UIObjectProperties = function(domElement) {
	UIAbstractProperties.apply(this, arguments)

	var that = this

	this.template = E2.views.partials.editor.objectProperties

	domElement = domElement || document.getElementById('obj3dPropertiesPane')

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

	this.controls = {
		scaleLinked : null,
		enableTransformControls : null,
		objectName : null
	}

	E2.ui.on('worldeditor:selectionset', this.onObjectPicked.bind(this))
	E2.app.worldEditor.cameraSelector.transformControls.addEventListener('objectChange', this.onSelectedObjectChangedState.bind(this))

	this.emit('created')
	this.render()
}

UIObjectProperties.prototype = Object.create(UIAbstractProperties.prototype)
UIObjectProperties.prototype.constructor = UIObjectProperties

UIObjectProperties.prototype.getAdapter = function() {

	var that = this

	var objectFormatter = function() {	// chew data for handlebars
		return {
			linked: 	this.linked,
			enabled : 	this.enabled,
			x: this.format(this.x || 0.0),
			y: this.format(this.y || 0.0),
			z: this.format(this.z || 0.0)
		}
	}

	var adapter = {
		position: {
			get enabled() {
				var s = that.getSelectedSingleRef()
				return s && s.canEditPosition()
			},
			format: function(v) { return v ? v.toFixed(3) : v},
			getFormattedObject : objectFormatter
		},
		scale: {
			linked : true,
			get enabled() {
				var s = that.getSelectedSingleRef()
				return s && s.canEditScale()
			},
			format: function(v) { return v ? v.toFixed(2) : v},
			getFormattedObject : objectFormatter
		},
		rotation: {	// 3 x text/mouse input or span < (this) xyz degrees > xyz radians > quaternion
			_vec3 : null,
			format: function(v) { return v ? v.toFixed(1) : v},
			getFormattedObject : objectFormatter,
			get enabled() {
				var s = that.getSelectedSingleRef()
				return s && s.canEditQuaternion()
			},
			get source() {
				var s = that.getSelectionStatePtr()
				if (!(s && s.quaternion)) return null
				return new THREE.Quaternion(s.quaternion._x, s.quaternion._y, s.quaternion._z, s.quaternion._w)
			},
			set source(q) {
				var s = that.getSelectionStatePtr()
				if (!(s && s.quaternion)) return null
				s.quaternion = q
				that.selected[0].transientSetState('quaternion', s.quaternion)
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
			get enabled() {
				var s = that.getSelectedSingleRef()
				return !!s
			},
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

	// mods w/o conversion
	;['position', 'scale'].forEach(function(property){
		['x', 'y', 'z'].forEach(function(xyz) {
			Object.defineProperty(adapter[property], xyz, {
				get: function () {
					var s = that.getSelectionStatePtr()
					if (!(s && s[property])) return 0.0
					return s[property][xyz]
				},
				set: function(v) {
					var s = that.getSelectionStatePtr()
					if (!(s && s[property])) return
					if (this.linked) {
						var ol = this.linked
						var ov = s[property][xyz]
						var dv = v - ov
						this.linked = false	// avoid feedback
						s[property].x += dv * s[property].x / ( ov === 0 ? 1 : ov)
						s[property].y += dv * s[property].y / ( ov === 0 ? 1 : ov)
						s[property].z += dv * s[property].z / ( ov === 0 ? 1 : ov)
						// avoid zero scale when linked
						if (!s[property].x) s[property].x = 0.0001
						if (!s[property].y) s[property].y = 0.0001
						if (!s[property].z) s[property].z = 0.0001
						that.dom[property].x.innerText = this.format(s[property].x)
						that.dom[property].y.innerText = this.format(s[property].y)
						that.dom[property].z.innerText = this.format(s[property].z)
						this.linked = ol
					} else {
						s[property][xyz] = v
						that.dom[property][xyz].innerText = this.format(v)
					}
					that.selected[0].transientSetState(property, s[property])
				}
			})
		});
	});

	return adapter
}
UIObjectProperties.prototype.onReset = function() {
	this.adapter.rotation._vec3 = null
}
UIObjectProperties.prototype.render = function() {
	this.adapter.rotation._vec3 = null	// force refresh
	return UIAbstractProperties.prototype.render.call(this, arguments)
}

UIObjectProperties.prototype.onObjectPicked = function() {
	var o = E2.app.worldEditor.getSelectedObjectPlugin()
	if (o)
		this.selected = [o]
	else
		this.selected = []
	this.render()
}

UIObjectProperties.prototype.onAttach = function() {
	var o = {}, that = this

	if (! (this.getSelectedSingleRef() && this.getSelectionStatePtr())) {
		this.dom.container.toggleClass('noSelection', true)
		return
	}
	this.dom.container.toggleClass('noSelection', false)

	var secRotation = document.getElementById('propertiesSectionRotation'),
		secPosition = document.getElementById('propertiesSectionPosition'),
		secScale 	= document.getElementById('propertiesSectionScale')

	if (secPosition) {
		var positionFields = secPosition.getElementsByTagName('span')
		this.dom.position.x = positionFields[0]
		this.dom.position.y = positionFields[1]
		this.dom.position.z = positionFields[2]
		this.dom.position.reset = document.getElementById('propertiesResetPosition')
	}

	if (secRotation) {
		var rotationFields = secRotation.getElementsByTagName('span')
		this.dom.rotation.x = rotationFields[0]
		this.dom.rotation.y = rotationFields[1]
		this.dom.rotation.z = rotationFields[2]
		this.dom.rotation.reset = document.getElementById('propertiesResetRotation')
	}

	if (secScale) {
		var scaleFields = secScale.getElementsByTagName('span')
		this.dom.scale.x = scaleFields[0]
		this.dom.scale.y = scaleFields[1]
		this.dom.scale.z = scaleFields[2]
		this.dom.scale.reset = document.getElementById('propertiesResetScale')
		this.dom.scale.linked = document.getElementById('propertiesLinkScale')
	}

	this.dom.common.enableTransformControls = document.getElementById('propertiesEnableTransform')
	this.dom.common.objectName = document.getElementById('propertiesObjectName')

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

	if (this.adapter.position.enabled) {
		enableEntry(this.dom.position.x, 'position', 'x')
		enableEntry(this.dom.position.y, 'position', 'y')
		enableEntry(this.dom.position.z, 'position', 'z')

		$(this.dom.position.reset).on('click.uiProperties', function(e){
			e.preventDefault()
			e.stopPropagation()
			var s = that.getSelectionStatePtr(),
				o = that.getSelectedSingleRef()
			if (!s) return false
			var prop = 'position', undo = _.cloneDeep(s[prop])

			var pos = that.adapter.position
			if (!that.selectedIsCamera) {
				pos.x = pos.z = 0
				pos.y = 2
			} else {
				pos.x = 0
				pos.y = 0.8
				pos.z = 2
			}

			o.undoableSetState(prop, s[prop], undo)
			return false
		})

	}

	if (this.adapter.scale.enabled) {
		enableEntry(this.dom.scale.x, 'scale', 'x')
		enableEntry(this.dom.scale.y, 'scale', 'y')
		enableEntry(this.dom.scale.z, 'scale', 'z')
		this.controls.scaleLinked = new UIToggleButton(this.adapter.scale, 'linked', this.dom.scale.linked)

		$(this.dom.scale.reset).on('click.uiProperties', function(e){
			e.preventDefault()
			e.stopPropagation()
			var s = that.getSelectionStatePtr(),
				o = that.getSelectedSingleRef()
			if (!s) return false
			var prop = 'scale', undo = _.cloneDeep(s[prop])

			var scale = that.adapter.scale
			var l = scale.linked
			scale.linked = false
			scale.x = scale.y = scale.z = 1
			scale.linked = l

			o.undoableSetState(prop, s[prop], undo)
			return false
		})
	}

	if (this.adapter.rotation.enabled) {
		// rotation
		o.min = -36000.0
		o.max = 36000.0
		o.size = 72000	// 1px per deg

		enableEntry(this.dom.rotation.x, 'quaternion', 'x', o)	// undoManager needs correct name of property here
		enableEntry(this.dom.rotation.y, 'quaternion', 'y', o)
		enableEntry(this.dom.rotation.z, 'quaternion', 'z', o)
		$(this.dom.rotation.reset).on('click.uiProperties', function(e){
			e.preventDefault()
			e.stopPropagation()
			var s = that.getSelectionStatePtr(),
				o = that.getSelectedSingleRef()
			if (!s) return false
			var prop = 'quaternion', undo = _.cloneDeep(s[prop])

			var rot = that.adapter.rotation
			rot.x = rot.y = rot.z = 0

			o.undoableSetState(prop, s[prop], undo)
			return false
		})
	}


	if (this.adapter.common.enabled) {
		if (this.dom.common.objectName && !this.selectedIsCamera) {
			this.controls.objectName = new UITextField(this.adapter.common, 'objectName', this.dom.common.objectName)
			if (this.dom.common.enableTransformControls) {
				this.controls.enableTransformControls = new UICheckbox(
					this.adapter.common, 'enableTransformControls',
					this.dom.common.enableTransformControls, that.render.bind(that))
			}
		} else {
			this.dom.common.objectName.value = '(camera)'
			this.dom.common.objectName.disabled = true
			this.dom.common.enableTransformControls.checked = true
			this.dom.common.enableTransformControls.disabled = true
		}

		var node = this.getSelectedNodeRef()
		if (node) {
			var onRenamed = function() {
				that.controls.objectName.onSourceChange()
			}
			node.on('renamed', onRenamed)
			this.detachQueue.push(function(){node.off('renamed', onRenamed)})
		}

		var mesh = this.getSelectedSingleRef()
		if (mesh) {
			var meshNode = mesh.node
			var update = this.update.bind(this)
			meshNode.on('pluginStateChanged', update)
			this.detachQueue.push(function () {
				meshNode.off('pluginStateChanged', update)
			})
		}
	}
}


UIObjectProperties.prototype.onDetach = function() {

	// proxy things
	if (this.controls.enableTransformControls) {
		this.controls.enableTransformControls.destroy()
		this.controls.enableTransformControls = null
	}
	if (this.controls.objectName) {
		this.controls.objectName.destroy()
		this.controls.objectName = null
	}

	if (this.controls.scaleLinked) {
		this.controls.scaleLinked.destroy()
		this.controls.scaleLinked = null
	}

}



UIObjectProperties.prototype.getTemplateData = function() {
	var that = this
	return {
		position : 	that.adapter.position.getFormattedObject(),
		rotation : 	that.adapter.rotation.getFormattedObject(),
		scale : 	that.adapter.scale.getFormattedObject(),
		common : 	that.adapter.common
	}
}


UIObjectProperties.prototype.update = function() {	// soft updates the template already in place
	var that = this
	that.adapter.rotation._vec3 = null
	var update = function(prop) {
		that.dom[prop].x.innerText = that.adapter[prop].format(that.adapter[prop].x)
		that.dom[prop].y.innerText = that.adapter[prop].format(that.adapter[prop].y)
		that.dom[prop].z.innerText = that.adapter[prop].format(that.adapter[prop].z)
	}
	if (that.adapter.position.enabled)
		update('position')

	if (that.adapter.rotation.enabled)
		update('rotation')

	if (that.adapter.scale.enabled)
		update('scale')

	if (that.controls.objectName)
		that.controls.objectName.onSourceChange()

	if (that.controls.lockTransformControls)
		that.controls.lockTransformControls.onSourceChange()

	return this
}



/*****************************************************************************/


var UINodeProperties = function(){
	this.template = E2.views.partials.editor.nodeInspector
	E2.ui.state.on('changed:selectedObjects', this.onSelectedNodeChanged.bind(this))
}

UINodeProperties.prototype.onAttach = function() {
	var that = this
	var node = this.getSelectedNodeRef()
	if (node) {
		var onRenamed = function() {
			that.controls.objectName.onSourceChange()
		}
		node.on('renamed', onRenamed)
		this.detachQueue.push(function(){node.off('renamed', onRenamed)})

		var update = this.update.bind(this)
		node.on('pluginStateChanged', update)
		this.detachQueue.push(function(){node.off('pluginStateChanged', update)})
	}
}

UINodeProperties.prototype.onSelectedNodeChanged = function(selected) {
	if (!(this.selected && (this.selected.length > 0))) return
	this.render()
	console.log('selected node changed ', selected)
}