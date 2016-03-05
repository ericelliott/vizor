E2.p = E2.plugins.float_display = function(core, node)
{
	this.desc = 'Display the supplied float value on the plugin surface.';
	
	this.input_slots = [ 
		{ name: 'float', dt: core.datatypes.FLOAT, desc: 'Input value to be displayed.', def: null }
	];
	
	this.output_slots = [];
};

E2.p.prototype.getInspectorSlots = function() {
	var s = this.input_slots[0]
	var n = this.parentNode
	var that = this
	return {
		'float' : {
			dt : s.dt,
			label : 'Float input',
			get value() { return n.getInputSlotValue('float') },
			set value(v) {
				v = parseFloat(v)
				if (isNaN(v)) v = null
				n.setInputSlotValue('float', v)
				return n.getInputSlotValue('float')
			}
		}
	}
}

E2.p.prototype.reset = function()
{
	this.update_value(null);
}

E2.p.prototype.create_ui = function()
{
	this.label = make('div');
	this.label.css('text-align', 'right'); 
	this.update_value(null);
	
	return this.label;
};

E2.p.prototype.update_input = function(slot, data)
{
	this.update_value(data);
};

E2.p.prototype.update_value = function(value)
{
	if(this.label)
		this.label[0].innerHTML = value === null ? '-' : value.toFixed(2);
	else
		this.value = value
};
