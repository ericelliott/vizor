/**
 * exposes a set of properties belonging to the selected object or node, on a UI dom surface (a panel)
 * the canonical variables are the object/node's internal (state) variables
 * the UI dom elements are slaved to them.
 * this panel listens to appropriate changes and brings them to the UI
 * the panel's controls set properties on its adapter on domElement onChange/onInput events.
 * @param domElement container to render in
 * @constructor
 */
var UIAbstractProperties = function(domElement) {
	EventEmitter.apply(this, arguments)
	var that = this

	this.detachQueue = []
	this._nodes = null	// holds selection

	// holds references to DOM elements tied to this.adapter properties
	this.dom = {}
	// holds references to UI controls tied to this.adapter properties
	this.controls = {}
	this.adapter = this.getAdapter()

	Object.defineProperty(this, 'selected', {
		get: function() {
			return this._nodes
		},
		set: function(nodes) {
			this.setSelected(nodes)
		}
	})
	this.selected = []

	Object.defineProperty(this, 'isInBuildMode', {
		get: function() {
			return E2.ui.isInBuildMode()
		}
	})

	Object.defineProperty(this, 'selectedIsCamera', {
		get: function() {
			var sel = that.getSelectedSingleRef()
			return sel && (sel.id === 'three_vr_camera')
		}
	})

	E2.ui.on('undo', this.onUndo.bind(this))
	E2.ui.on('redo', this.onRedo.bind(this))
	// E2.ui.state.on('changed:mode', this.onModeChanged.bind(this))
}
UIAbstractProperties.prototype = Object.create(EventEmitter.prototype)
UIAbstractProperties.prototype.constructor = UIAbstractProperties

UIAbstractProperties.prototype.onUndo = function() {
	if (!(this.selected && (this.selected.length > 0))) return
	this.render()
}
UIAbstractProperties.prototype.onRedo = UIAbstractProperties.prototype.onUndo
//UIAbstractProperties.prototype.onModeChanged = function() {this.render()}

UIAbstractProperties.prototype.setSelected = function(nodes) {
	if (!(nodes && (typeof nodes.length !== 'undefined')))
		return msg('ERROR: expected node[] for selection')
	this._reset()
	this._nodes = nodes
	this.emit('selected', {nodes: nodes})
	return this
}

UIAbstractProperties.prototype.getSelectedNodeRef = function() {
	return (E2.ui.state.selectedObjects.length === 1) ? E2.ui.state.selectedObjects[0] : null
}

UIAbstractProperties.prototype.getSelectedSingleRef = function() {
	return (this.selected && this.selected.length && this.selected.length === 1 && this.selected[0])  ? this.selected[0] : null
}

UIAbstractProperties.prototype.getSelectionStatePtr = function() {
	return (this.selected && this.selected.length && this.selected.length>0)  ? this.selected[0].state : null
}

UIAbstractProperties.prototype.onSelectedObjectChangedState = function() {
	if (!(this.selected && (this.selected.length > 0))) return
	this.update()
}



UIAbstractProperties.prototype.render = function() {	// hard-resets panel clearing container and rerendering template
	this._detach()

	var props = this.getTemplateData()

	this.dom.container.empty()
	this.dom.container.html(this.template({properties: props}))

	VizorUI.replaceSVGButtons(this.dom.container)

	this._attach()
	this.emit('rendered', {obj: this.selected})
	return this
}

UIAbstractProperties.prototype._detach = function() {
	this.onDetach()

	$('*', this.dom).off('.uiProperties')

	if (this.detachQueue && this.detachQueue.length) {
		var removeHandler
		while (removeHandler = this.detachQueue.pop()) {
			if (typeof removeHandler === 'function') removeHandler()
		}
	}

	this.emit('detached')
}

UIAbstractProperties.prototype._attach = function() {
	this.onAttach()
	this.emit('attached')
}

UIAbstractProperties.prototype._reset = function() {	// resets handling, clears interface
	this._nodes = []
	this.onReset()
	this._detach()
	this.emit('reset')
	return this
}

/**
 * the adapter bridges values for the selected object's state and the properties' UI controls
 * get() returns the authoritative source e.g. the object's properties
 * set() updates both the object and the UI display
 */
/* @abstract */ UIAbstractProperties.prototype.getAdapter = function() {return {}}
/* @abstract */ UIAbstractProperties.prototype.getTemplateData = function() {return {}}
/* @abstract */ UIAbstractProperties.prototype.onDetach 	= function() {}
/* @abstract */ UIAbstractProperties.prototype.onAttach 	= function() {}
/* @abstract */ UIAbstractProperties.prototype.onReset 	= function() {}
/* @abstract */ UIAbstractProperties.prototype.update 	= function() {}	// soft-update this.dom{} in place




