E2.p = E2.plugins["xor_modulator"] = function(core, node)
{
	this.desc = 'Emits true when the values of the two inputs are different and false when they\'re identical.';
	
	this.input_slots = [ 
		{ name: 'a', dt: core.datatypes.BOOL, desc: 'The first operand.', def: false },
		{ name: 'b', dt: core.datatypes.BOOL, desc: 'The second operand.', def: false } 
	];
	
	this.output_slots = [
		{ name: 'bool', dt: core.datatypes.BOOL, desc: 'Emits true if <b>first</b> does not equal <b>second</b> and false otherwise.', def: false }
	];
};

E2.p.prototype.getInspectorSlots = function() {
	var s = this.input_slots[0]
	var n = this.parentNode
	var that = this
	return {
		'a' : {
			dt : s.dt,
			label : 'Input A',
			get value() {
				if (s.is_connected) return that.conds[0]
				return n.getInputSlotValue('a') },
			set value(v) {
				E2.app.graphApi.changeInputSlotValue(n.parent_graph, n, 'a', v)
				return n.getInputSlotValue('a')
			}
		}
	}
}

E2.p.prototype.reset = function()
{
	this.conds = [ false, false ];
	this.state = false;
};

E2.p.prototype.update_input = function(slot, data)
{
	this.conds[slot.index] = data;
};	

E2.p.prototype.update_state = function()
{
	this.state = this.conds[0] ? !this.conds[1] : this.conds[1];
};

E2.p.prototype.update_output = function(slot)
{
	return this.state;
};
