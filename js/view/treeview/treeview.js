define([ "../../messaging_system/event_listener",
	"../../messaging_system/events/re_ordered_event",
	"../../messaging_system/events/add_element_event",
	"./group_tree_node",
	"./configuration_tree_node"], function(EventListener, ReOrderedEvent, AddElementEvent, GroupTreeNode, ConfigurationTreeNode){
	// Manages the whole tree
	var TreeView = function(target_view, state_proxy, messaging_system){
		var self = this;
		this.messaging_system = messaging_system;
		this.tree_element = $('<ul>').attr({
			'class' : 'list_toolbox_objects_tree'
		});
		this.nodes = new Array();
		target_view.append(this.tree_element);
		this.setProxy(state_proxy);

		this.groupChangedListener = new EventListener(this, this.groupChanged);
		this.messaging_system.addEventListener(this.messaging_system.events.GroupChanged, this.groupChangedListener);
	};
	TreeView.prototype.cleanUp = function(){
		this.messaging_system.removeEventListener(this.messaging_system.events.GroupChanged, this.groupChangedListener);
	};
	TreeView.prototype.addNode = function(dataProxy, id){
		var tree_node;
		switch(dataProxy.getType()){
			case "group":
				tree_node = new GroupTreeNode(null, dataProxy, this.messaging_system);
				break;
			case "configuration_key":
				tree_node = new ConfigurationTreeNode(null, dataProxy, this.messaging_system);
				break;
		}
		this.nodes.push(tree_node);
	};
	TreeView.prototype.setProxy = function(proxy){
		this.state_proxy = proxy;
		this.loadView();
	};
	TreeView.prototype.loadView = function(){
		var self = this;
		this.tree_element.empty();
		this.nodes.length = 0;
		var sub_nodes = this.state_proxy.getSubNodes();
		for(var i = 0; i < sub_nodes.length; ++i){
			this.addNode(sub_nodes[i], i);
		}
		for(var i = 0; i < this.nodes.length; ++i){
			var li = $('<li>');
			this.tree_element.append(li);
			this.nodes[i].loadContent(li);
		}
		this.tree_element.sortable('destroy');
		this.tree_element.sortable({
			forcePlaceholderSize : true
		}).bind(
			'sortupdate',
			function(e, ui){
				var new_order = new Array();
				self.tree_element.children('li').each(
					function(index){
						new_order.push($(this).children(
							'input[name=id]').val());
					});
				self.messaging_system.fire(
					self.messaging_system.events.ReOrdered,
					new ReOrderedEvent(new_order, self.state_proxy
						.getIdentification()));
			});
	};
	TreeView.prototype.groupChanged = function(signal, data){
		//update tree
		if(!this.state_proxy.isPossiblyAboutThis(data.getTargetIdentification())){
			return;
		}
		var sub_nodes = this.state_proxy.getSubNodes();
		for(var j = 0; j < this.nodes.length; ++j){
			this.nodes[j].detach();
		}
		this.tree_element.empty();
		for(var i = 0; i < sub_nodes.length; ++i){
			var found = false;
			for(var j = 0; j < this.nodes.length && !found; ++j){
				if(sub_nodes[i].isPossiblyAboutThis(this.nodes[j].getProxy().getIdentification()) && !this.nodes[j].getProxy().getDeleted()){
					this.nodes[j].appendTo(this.tree_element);
					found = true;
				}
			}
			if(!found){
				var element = $('<li>');
				this.addNode(sub_nodes[i]);
				this.nodes[this.nodes.length-1].loadContent(element);
				this.nodes[this.nodes.length-1].appendTo(this.tree_element);
			}
		}
		for(var j = this.nodes.length-1; j >= 0; --j){
			if(this.nodes[j].is_detached()){
				this.nodes.splice(j, 1);
			}
		}
	};
	return TreeView;
});
