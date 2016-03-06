/**
 * exposes a set of properties belonging to the selected object or node, on a UI dom surface (a panel)
 * the canonical variables are the object/node's internal (state) variables
 * the UI dom elements are slaved to them.
 * this panel listens to appropriate changes and brings them to the UI
 * the panel's controls set properties on its adapter on domElement onChange/onInput events.
 * @constructor
 */
var UIAbstractProperties = function(domElement) {
	EventEmitter.apply(this, arguments)
	var that = this

	this.attached = false
	this.updateQueued = false
	this.detachQueue = []

	this._nodes = null	// holds selection

	// holds references to DOM elements tied to this.adapter properties
	this.dom = {
		container: null		// typically $(domElement)
	}
	// holds references to any custom UI control objects, controlling this.adapter via this.dom events
	this.controls = {}

	// will be set at render-time, to allow nodes to expose properties
	this.adapter = null

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

/**
 * sometimes we need to wait the graph to complete a cycle so we request a call on next frame
 */
UIAbstractProperties.prototype.queueUpdate = function() {
	if (this.updateQueued) return
	this.updateQueued = true
	var that = this
	requestAnimFrame(function(){
		that.updateQueued = false
		if (that.attached) that.update()
	})
}

UIAbstractProperties.prototype.render = function() {	// hard-resets panel clearing container and rerendering template
	this._detach()
	var canRender = this.selected && this.selected.length === 1
	if (canRender) {
		this.adapter = this.getAdapter()
		this.controls = this.getControls()
		var props = this.getTemplateData()	// formatted etc
	} else {
		var props = {}
		this.adapter = {}
		this.controls = {}
	}

	this.dom.container.empty()
	this.dom.container.html(this.template({
		properties: props,
		controls: this.controls
	}))

	VizorUI.replaceSVGButtons(this.dom.container)

	this._attach()
	this.emit('rendered', {obj: this.selected})
	return this
}

UIAbstractProperties.prototype._detach = function() {

	$('*', this.dom).off('.uiProperties')

	if (this.detachQueue && this.detachQueue.length) {
		var removeHandler
		while (removeHandler = this.detachQueue.pop()) {
			removeHandler()
		}
	}

	this.onDetach()

	this.emit('detached')
	this.attached = false

}

UIAbstractProperties.prototype._attach = function() {
	this.onAttach()
	this.emit('attached')
	this.attached = true
}

UIAbstractProperties.prototype._reset = function() {	// resets handling, clears interface
	this._nodes = []
	this.onReset()
	this._detach()
	this.adapter = {}
	this.controls = {}
	this.emit('reset')
	return this
}

/********* methods to implement ***********/

/* strongly recommend implementing */
				UIAbstractProperties.prototype.getTemplateData = function() {return this.adapter}
/**
 * the adapter bridges values for the selected object's state and the properties' UI controls
 * get() returns the authoritative source e.g. the object's properties
 * set() updates both the object and the UI display
 */
/* @abstract */ UIAbstractProperties.prototype.getAdapter = function() {return {}}
/* @abstract */ UIAbstractProperties.prototype.getControls = function() {return {}}
/* @abstract */ UIAbstractProperties.prototype.onAttach 	= function() {}
/* @abstract */ UIAbstractProperties.prototype.onDetach 	= function() {}	// this.detachQueue is automatically processed
/* @abstract */ UIAbstractProperties.prototype.onReset 	= function() {}
/* @abstract */ UIAbstractProperties.prototype.update 	= function() {}	// soft-update this.dom{} in place




