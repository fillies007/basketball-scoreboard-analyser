define([
		'./canvas/canvas', 
		'./stateview/loadstatecomponent', 
		'./treeview/treeview', 
		'./detailsview/labelobject_detailsview', 
		'../messaging_system/event_listener',
		'./canvas/display_tree',
		'./stateview/current_state_component'
		]
	, function(
		MyCanvas, 
		LoadStateComponent, 
		TreeView, 
		LabelObjectDetailsView, 
		EventListener,
		DisplayTree,
		CurrentStateComponent
		){
    var View = function(controller, target_view, messaging_system){
    	this.messaging_system = messaging_system;
        this.controller = controller;
		this.element = target_view;
        this.element.html('');
        this.canvas_container_div = $('<div>').attr({
        		class: 'div_horizontal',
        		id: 'div_image'
        		});
        this.current_state_div = $('<div>').attr({
        		class:'div_state',
        		id: 'div_current_state'
        		}).text('to fill current state div');
      	this.load_state_div = $('<div>').attr({
  				class:'div_state',
  				id:'div_load_state'
      			});
        this.state_container_div = $('<div>').attr({
		    	class: 'div_horizontal',
		    	id: 'div_state_container'
		    	})
        	.append(this.current_state_div)
        	.append(this.load_state_div);
        this.left_container_div = $('<div>').attr({
        		class: 'div_vertical',
        		id:'div_main_container'
        		})
        	.append(this.canvas_container_div)
        	.append(this.state_container_div);
        this.toolbox_tree_div = $('<div>').attr({
        		id:'div_toolbox_objects_tree',
        		}).text('fill toolbox tree');
        this.toolbox_details_div = $('<div>').attr({
        		id:'div_toolbox_objects_details'
        		}).text('fill toolbox details');
        this.right_container_div = $('<div>').attr({
        		class:'div_vertical',
        		id:'div_toolbox'
        		})
        	.append(this.toolbox_tree_div)
        	.append($('<hr>'))
        	.append(this.toolbox_details_div);
        this.element.append(this.left_container_div)
        	.append(this.right_container_div);
        
        this.canvas = new MyCanvas(this.canvas_container_div, this.controller.getModel().getState().getProxy(), this.messaging_system);
		this.current_state_component = new CurrentStateComponent(this.current_state_div, this.controller.getModel().getState().getProxy(), this.messaging_system);
        this.loadStateComponent = new LoadStateComponent(this.load_state_div, this.messaging_system);
        this.tree_view = new TreeView(this.toolbox_tree_div, this.controller.getModel().getState().getProxy(), this.messaging_system);
        this.messaging_system.addEventListener(this.messaging_system.events.LabelObjectClicked, new EventListener(this,this.labelObjectClicked));
		this.messaging_system.addEventListener(this.messaging_system.events.StateChanged, new EventListener(this, this.stateChanged));
        window.addEventListener('resize', function(){
            messaging_system.fire(messaging_system.events.WindowResized, null);
        });
    };
    View.prototype.labelObjectClicked = function(signal, data){
		if(data.data_proxy.getType() == "label"){
	        this.loadLabelObjectDetails(data.data_proxy);
		}
    };
	View.prototype.clearLabelObjectDetails = function(){
		this.toolbox_details_div.empty();
	};
    View.prototype.loadLabelObjectDetails = function(data_proxy){
		this.clearLabelObjectDetails();
        this.toolbox_details_content = new LabelObjectDetailsView(this.toolbox_details_div,data_proxy, this.messaging_system);
    };
	View.prototype.stateChanged = function(signal, data){
		this.canvas.setProxy(this.controller.getModel().getState().getProxy());
		this.current_state_component.setProxy(this.controller.getModel().getState().getProxy());
		this.tree_view.setProxy(this.controller.getModel().getState().getProxy());
		this.clearLabelObjectDetails();
	};
    return View;
});

