define([],function(){
	return function LoadStateComponent(view_target, messaging_system){
		this.containerElement = view_target;
		var text_area = this.textArea = $('<textarea>')
            .attr({
                'class':'txt_state'
            });
        var btn_div = $('<div>')
            .attr({
                'class':'div_state_buttons'
            });
		this.btnApply = $('<button>')
			.text('apply')
			.click(function(){
				var t = text_area.val();
				var data = JSON.parse(t);
				messaging_system.fire(messaging_system.events.LoadState, data);
			});
        btn_div.append(this.btnApply);
		this.containerElement.append(this.textArea)
			.append(btn_div);
	};
});
