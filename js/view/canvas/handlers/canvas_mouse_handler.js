define([
		"../../../messaging_system/event_listener",
		"../../../model/coordinate",
		"../../../messaging_system/events/selection_event",
		"../../../messaging_system/events/objects_moved_event",
		"../../../messaging_system/events/mouse_mode_changed_event",
		"../../../messaging_system/events/auto_detect_digit_area_selected_event",
		"../../../image_processing/digit_detector",
		"../../../messaging_system/events/digit_added_event",
		"../../../messaging_system/events/edit_mode_selection_event",
		"../../../messaging_system/events/submit_group_details_event",
		"../../../messaging_system/events/remove_group_event",
		"../../../messaging_system/events/dot_added_event",
		"../../../messaging_system/events/group_changed_event",
		"../../../messaging_system/events/digit_corners_listen_event",
		"../../../messaging_system/events/add_element_event",
		"../../../messaging_system/events/move_mode_objects_moved_event",
		"../../../messaging_system/events/tree_node_expand_event",
		"require",
		"../../view"]
	, function(EventListener, Coordinate, SelectionEvent, ObjectsMovedEvent, MouseModeChangedEvent, AutoDetectDigitAreaSelectedEvent, DigitDetector, DigitAddedEvent, EditModeSelectionEvent, SubmitGroupDetailsEvent, RemoveGroupEvent, DotAddedEvent, GroupChangedEvent, DigitCornersListenEvent, AddElementEvent, MoveModeObjectsMovedEvent, TreeNodeExpandEvent, require, View){
		var SelectionRectangle = function(){
			this.start_coordinate = new Coordinate();
			this.end_coordinate = new Coordinate();
			this.active = false;
		};
		SelectionRectangle.prototype.getActive = function(){
			return this.active;
		};
		SelectionRectangle.prototype.getTopLeft = function(){
			return new Coordinate(Math.min(this.start_coordinate.getX(), this.end_coordinate.getX()), Math.min(this.start_coordinate.getY(), this.end_coordinate.getY()));
		};
		SelectionRectangle.prototype.getTopRight = function(){
			return new Coordinate(Math.max(this.start_coordinate.getX(), this.end_coordinate.getX()), Math.min(this.start_coordinate.getY(), this.end_coordinate.getY()));
		};
		SelectionRectangle.prototype.getBottomRight = function(){
			return new Coordinate(Math.max(this.start_coordinate.getX(), this.end_coordinate.getX()), Math.max(this.start_coordinate.getY(), this.end_coordinate.getY()));
		};
		SelectionRectangle.prototype.getBottomLeft = function(){
			return new Coordinate(Math.min(this.start_coordinate.getX(), this.end_coordinate.getX()), Math.max(this.start_coordinate.getY(), this.end_coordinate.getY()));
		};
		SelectionRectangle.prototype.getHeight = function(){
			return Math.abs(this.start_coordinate.getY() - this.end_coordinate.getY());
		};
		SelectionRectangle.prototype.getWidth = function(){
			return Math.abs(this.start_coordinate.getX() - this.end_coordinate.getX());
		};
		SelectionRectangle.prototype.transformCanvasCoordinatesToRelativeImageCoordinates = function(transformation){
			var result = new SelectionRectangle();
			result.startSelection(transformation.transformCanvasCoordinateToRelativeImageCoordinate(this.start_coordinate));
			result.updateSelection(transformation.transformCanvasCoordinateToRelativeImageCoordinate(this.end_coordinate));
			return result;
		};
		SelectionRectangle.prototype.transformCanvasCoordinatesToAbsoluteCoordinates = function(transformation){
			var result = new SelectionRectangle();
			result.startSelection(transformation.transformCanvasCoordinateToAbsoluteImageCoordinate(this.start_coordinate));
			result.updateSelection(transformation.transformCanvasCoordinateToAbsoluteImageCoordinate(this.end_coordinate));
			return result;
		};
		SelectionRectangle.prototype.startSelection = function(coordinate){
			this.start_coordinate = coordinate.clone();
			this.end_coordinate = coordinate.clone();
			this.active = true;
		};
		SelectionRectangle.prototype.updateSelection = function(coordinate){
			this.end_coordinate = coordinate.clone();
		};
		SelectionRectangle.prototype.stopSelection = function(){
			this.active = false;
		};
		var CanvasMouseHandler = function(canvas, messaging_system){

			View = require('../../view');

			this.canvas = canvas;
			this.messaging_system = messaging_system;

			this.previous_mouse_coordinate = new Coordinate();
			this.mouse_down_time = 0;
			this.mouse_down = false;

			this.current_mouse_mode = CanvasMouseHandler.MouseModes.EditMode;
			this.previous_mouse_mode = CanvasMouseHandler.MouseModes.EditMode;
			this.selection_rectangle = new SelectionRectangle;
			this.current_selected_group_proxy = null;

			this.messaging_system.addEventListener(this.messaging_system.events.CanvasScrolled, new EventListener(this, this.canvasScrolled));
			this.messaging_system.addEventListener(this.messaging_system.events.CanvasMouseMove, new EventListener(this, this.mouseMove));
			this.messaging_system.addEventListener(this.messaging_system.events.CanvasMouseUp, new EventListener(this, this.mouseUp));
			this.messaging_system.addEventListener(this.messaging_system.events.CanvasMouseDown, new EventListener(this, this.mouseDown));
			this.messaging_system.addEventListener(this.messaging_system.events.CanvasFocusOut, new EventListener(this, this.focusOut));
			this.messaging_system.addEventListener(this.messaging_system.events.CanvasImageClick, new EventListener(this, this.click));
			this.messaging_system.addEventListener(this.messaging_system.events.CanvasImageDoubleClick, new EventListener(this, this.doubleClick));
			this.messaging_system.addEventListener(this.messaging_system.events.CanvasKeyDown, new EventListener(this, this.keyDown));
			this.messaging_system.addEventListener(this.messaging_system.events.CanvasKeyUp, new EventListener(this, this.keyUp));

			this.messaging_system.addEventListener(this.messaging_system.events.MouseModeChanged, new EventListener(this, this.mouseModeChanged));

			this.messaging_system.addEventListener(this.messaging_system.events.AutoDetectDigit, new EventListener(this, this.autoDetectDigitRequested));
			this.messaging_system.addEventListener(this.messaging_system.events.DigitCornersListen, new EventListener(this, this.digitCornersListenRequested));
			this.messaging_system.addEventListener(this.messaging_system.events.CoordinateListen, new EventListener(this, this.coordinateListenRequested));

			this.messaging_system.addEventListener(this.messaging_system.events.SelectionChanged, new EventListener(this, this.selectionChanged));
		};
		CanvasMouseHandler.MouseModes = {
			EditMode : "EditMode",
			CanvasMode : "CanvasMode",
			SelectionMode : "SelectionMode",
			AutoDetectDigitMode : "AutoDetectDigitMode",
			SingleCoordinateListenMode : "SingleCoordinateListenMode",
			DigitCornersListenMode : "DigitCornersListenMode",
			Other : "Other"
		};
		CanvasMouseHandler.prototype.canvasScrolled = function(signal, data){
			var evt = data.event_data;
			var delta = evt.wheelDelta ? evt.wheelDelta / 40 : evt.detail ? -evt.detail : 0;
			var factor = 0;
			if(delta > 0){
				factor = 9 / 10;
			}else{
				factor = 10 / 9;
			}
			var mouse_coordinate = this.canvas.getTransformation().transformCanvasCoordinateToRelativeImageCoordinate(data.getCoordinate());
			this.canvas.getTransformation().setScale(this.canvas.getTransformation().getScale() * factor, mouse_coordinate);
			this.canvas.updateCanvas(signal, data);
			return data.event_data.preventDefault() && false;
		};
		CanvasMouseHandler.prototype.coordinateDebugInfo = function(c){
			var relative = this.canvas.getTransformation().transformCanvasCoordinateToRelativeImageCoordinate(c);
			var absolute = this.canvas.getTransformation().transformCanvasCoordinateToAbsoluteImageCoordinate(c);
			console.log("canvas                     = "+JSON.stringify(c));
			var rel_canvas = this.canvas.getTransformation().transformRelativeImageCoordinateToCanvasCoordinate(relative);
			var abs_canvas = this.canvas.getTransformation().transformAbsoluteImageCoordinateToCanvasCoordinate(absolute);
			console.log("canvas based on absolute   = "+JSON.stringify(abs_canvas));
			console.log("canvas based on relative   = "+JSON.stringify(rel_canvas));
			var rel_abs = this.canvas.getTransformation().transformAbsoluteImageCoordinateToRelativeImageCoordinate(absolute);
			var abs_rel = this.canvas.getTransformation().transformRelativeImageCoordinateToAbsoluteImageCoordinate(relative);
			console.log("relative                   = "+JSON.stringify(relative));
			console.log("relative based on absolute = "+JSON.stringify(rel_abs));
			console.log("absolute                   = "+JSON.stringify(absolute));
			console.log("absolute based on relative = "+JSON.stringify(abs_rel));
		};
		CanvasMouseHandler.prototype.mouseMove = function(signal, data){
			//this.coordinateDebugInfo(data.getCoordinate())
			if(this.mouse_down){
				this.mouse_dragged = true;
			}
			this.updateCursor();
			var application_state = this.getCanvas().getView().getApplicationState();
			var transformed = this.canvas.getTransformation().transformCanvasTranslationToRelativeImageTranslation(data.getCoordinate().add(this.previous_mouse_coordinate.scalarMultiply(-1.0)));
			console.log("application state: "+application_state);
			switch(this.current_mouse_mode){
				case CanvasMouseHandler.MouseModes.EditMode:
					if(this.mouse_down){
						switch(application_state){
							case View.ApplicationStates.MULTI_SELECTION:
								this.messaging_system.fire(this.messaging_system.events.ObjectsMoved, new ObjectsMovedEvent(this.getCanvas().getView().getCurrentSelectionTree(), transformed));
								break;
							case View.ApplicationStates.SINGLE_SELECTION:
								if(this.mouse_down_object != null){
									if(this.getCanvas().getView().getCurrentSelectionTree().hasSelectedParent(this.mouse_down_object.getIdentification())){
										this.messaging_system.fire(this.messaging_system.events.ObjectsMoved, new ObjectsMovedEvent(this.mouse_down_object.getProxy().getSelectionTree(), transformed));
									}
								}else if(this.getCurrentGroupProxy().getGroupType() == "digit"){
									this.startAutoDetectDigit(null);
									this.selection_rectangle.startSelection(data.getCoordinate());
								}
								break;
							case View.ApplicationStates.NO_SELECTION:
								if(this.mouse_down_object != null){

								}else if(this.getCurrentGroupProxy() != null && this.getCurrentGroupProxy().getGroupType() == "digit"){
									this.startAutoDetectDigit(null);
									this.selection_rectangle.startSelection(data.getCoordinate());
								}
								break;
						}
						this.canvas.updateCanvas(signal, data);
					}
					break;
				case CanvasMouseHandler.MouseModes.CanvasMode:
					//move canvast
					if(this.mouse_down){
						var old_center = this.canvas.getTransformation().getCanvasCenter();
						var mv = this.canvas.getTransformation().transformCanvasTranslationToRelativeImageTranslation(data.getCoordinate().add(this.previous_mouse_coordinate.scalarMultiply(-1.0))).scalarMultiply(-1.0);
						this.canvas.getTransformation().setCanvasCenter(old_center.add(mv));
						this.canvas.updateCanvas(signal, data);
					}
					break;
				case CanvasMouseHandler.MouseModes.AutoDetectDigitMode:
					if(this.mouse_down){
						this.selection_rectangle.updateSelection(data.getCoordinate());
						this.canvas.updateCanvas(signal, data);
					}
					break;
				case CanvasMouseHandler.MouseModes.SelectionMode:
					//move selected digits at once
					if(this.mouse_down){
						this.updateSelection(data);
						//this.canvas.updateCanvas(signal, data);
					}
					break;
				case CanvasMouseHandler.MouseModes.DigitCornersListenMode:
					this.canvas.updateCanvas(signal, data);
					break;
				case CanvasMouseHandler.MouseModes.Other:
					//let another handler handle these events
					break;
			}
			this.previous_mouse_coordinate = data.getCoordinate();
		};
		CanvasMouseHandler.prototype.coordinateListenRequested = function(signal, data){
			//this.coordinate_proxy = data.getProxy();
			//this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(CanvasMouseHandler.MouseModes.SingleCoordinateListenMode));
			this.setSelection(data.getProxy().getSelectionTree(), false);
			this.setMouseMode(CanvasMouseHandler.MouseModes.SingleCoordinateListenMode);
		}
		CanvasMouseHandler.prototype.getTemporaryDigitCoordinates = function(){
			if(this.current_mouse_mode != CanvasMouseHandler.MouseModes.DigitCornersListenMode){
				return null;
			}
			var coordinates = new Array();
			var sub_nodes = this.current_listening_digit.getSubNodes();
			for(var i = 0; i < sub_nodes.length; ++i){
				if(sub_nodes[i].getCoordinate().isValid()){
					coordinates.push(sub_nodes[i].getCoordinate());
				}
			}
			return coordinates;
		};
		CanvasMouseHandler.prototype.digitCornersListenRequested = function(signal, data){
			this.setSelection(data.getProxy().getSelectionTree());
			this.startDigitCornersListening(null, true);
		};
		CanvasMouseHandler.prototype.autoDetectDigitRequested = function(signal, data){
			this.startAutoDetectDigit(data.getProxy());
			//this.auto_detect_digit_proxy = data.getProxy();
			//this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(CanvasMouseHandler.MouseModes.AutoDetectDigitMode));
		};
		CanvasMouseHandler.prototype.stopAutoDetectDigit = function(){
			//TODO: if user tried to create a new digit by using auto-detection, that digit should be removed
			//if the user tried to modify an existing digit, that digit should be kept
			this.setMouseMode(null);
			this.selection_rectangle.stopSelection();
			this.canvas.updateCanvas();
		};
		CanvasMouseHandler.prototype.startAutoDetectDigit = function(proxy){
			this.setMouseMode(CanvasMouseHandler.MouseModes.AutoDetectDigitMode);
			console.log("proxy = "+proxy);
			if(proxy != null){
				this.setSelection(proxy.getSelectionTree(), false);
			}else{
				//this.messaging_system.fire(this.messaging_system.events.AddElement, new AddElementEvent("digit", this.getSingleSelectedElementProxy().getParentOfTypeProxy('group').getIdentification(), null, true));
				this.messaging_system.fire(this.messaging_system.events.AddElement, new AddElementEvent("digit", this.getCurrentGroupProxy().getIdentification(), null, true));
				console.log("group subnodes.length = "+this.getCurrentGroupProxy().getSubNodes().length);
				console.log("currently selected proxy = "+JSON.stringify(this.getSingleSelectedElementProxy().getIdentification()));
			}
		};
		CanvasMouseHandler.prototype.autoDetectDigit = function(){
			if(this.getSingleSelectedElementProxy().getType() != "digit"){
				return;
			}
			//console.log("current group type = "+this.getCurrentGroupProxy().getGroupType());
			//if(this.getCurrentGroupProxy().getGroupType() != "digit")
			//	return;
			var selection_rectangle = this.selection_rectangle.transformCanvasCoordinatesToAbsoluteCoordinates(this.canvas.getTransformation());
			var img = this.canvas.getImage();
			var top_left = selection_rectangle.getTopLeft();
			var bottom_right = selection_rectangle.getBottomRight();
			top_left.round();
			bottom_right.round();
			var image_part = new Array();
			var canvas = $('<canvas>')[0];
			var context = canvas.getContext("2d");
			canvas.width = img.width;
			canvas.height = img.height;
			context.mozImageSmoothingEnabled = false;
			context.webkitImageSmoothingEnabled = false;
			context.drawImage(img, 0, 0);
			var imageData = context.getImageData(0, 0, img.width, img.height);
			for(var i = top_left.getY(); i <= bottom_right.getY(); ++i){
				image_part.push(new Array());
				for(var j = top_left.getX(); j <= bottom_right.getX(); ++j){
					var index = (i * 4) * imageData.width + (j * 4);
					var r = imageData.data[index];
					var g = imageData.data[index + 1];
					var b = imageData.data[index + 2];
					var y = (r + g + b) / 3.0;
					image_part[parseInt(i - top_left.getY())].push(y);
				}
			}
			var corners = DigitDetector.digit_corners(image_part);
			if(corners == null){
				return null;
			}
			var result = new Array();
			for(var index = 0; index < 4; ++index){
				var x = corners[index].x + top_left.getX();
				var y = corners[index].y + top_left.getY();
				var coord = this.canvas.getTransformation().transformAbsoluteImageCoordinateToRelativeImageCoordinate(new Coordinate(x, y));
				result.push({'coordinate':coord});
			}
			var data = new Object();
			data.corners = result;
			this.messaging_system.fire(this.messaging_system.events.SubmitGroupDetails, new SubmitGroupDetailsEvent(this.getSingleSelectedElementProxy().getIdentification(), data));
			//var group_identification = this.getSingleSelectedElementProxy().getParent().getIdentification();
			//this.messaging_system.fire(this.messaging_system.events.DigitAdded, new DigitAddedEvent(group_identification, result));
			//var parent_children = this.getSingleSelectedElementProxy().getParent().getSubNodes();
			//return parent_children[parent_children.length-1];
		};
		CanvasMouseHandler.prototype.cancelDragging = function(){
			if(this.mouse_down){
				this.mouse_down = false;
				this.selection_rectangle.stopSelection();
				this.canvas.updateCanvas(null, null);
			}
		};
		CanvasMouseHandler.prototype.mouseUp = function(signal, data){
			if(!this.mouse_down){
				return;
			}
			this.mouse_down = false;
			this.updateCursor();
			var mouse_release_time = new Date();
			var time_down = mouse_release_time.getTime() - this.mouse_down_time.getTime();
			var application_state = this.getCanvas().getView().getApplicationState();
			console.log("application state: "+application_state);
			switch(this.current_mouse_mode){
				case CanvasMouseHandler.MouseModes.EditMode:
					switch(application_state){
						case View.ApplicationStates.MULTI_SELECTION:

							break;
						case View.ApplicationStates.SINGLE_SELECTION:
							break;
						case View.ApplicationStates.NO_SELECTION:
							break;
					}
					break;
				case CanvasMouseHandler.MouseModes.CanvasMode:
					//this.canvas.getElement().css('cursor', '-webkit-grab');
					break;
				case CanvasMouseHandler.MouseModes.AutoDetectDigitMode:
					this.autoDetectDigit();
					this.stopAutoDetectDigit();
					//this.autoDetectDigit(this.auto_detect_digit_proxy);
					//this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(null));
					//this.selection_rectangle.stopSelection();
					break;
				case CanvasMouseHandler.MouseModes.SelectionMode:
					this.stopSelection(data);
					this.canvas.drawCanvas();
					break;
				case CanvasMouseHandler.MouseModes.Other:
					break;
			}
		};
		CanvasMouseHandler.prototype.getPreviousMouseCoordinate = function(){
			return this.previous_mouse_coordinate;
		};
		CanvasMouseHandler.prototype.mouseDown = function(signal, data){
			this.mouse_down = true;
			this.updateCursor();
			var application_state = this.getCanvas().getView().getApplicationState();
			var identification = null;
			if(application_state == View.ApplicationStates.SINGLE_SELECTION){
				identification = this.getSingleSelectedElementProxy().getIdentification();
			}
			var clicked_object = this.canvas.getObjectAroundCanvasCoordinate(data.getCoordinate(), identification);
			var parent_group = null;
			if(clicked_object){
				if(clicked_object.getProxy().hasParentOfType('digit')){
					parent_group = clicked_object.getProxy().getParentOfTypeProxy("digit");
				}else if(clicked_object.getProxy().hasParentOfType('dot')){
					parent_group = clicked_object.getProxy().getParentOfTypeProxy("dot");
				}
			}
			this.mouse_down_object = clicked_object;
			this.mouse_dragged = false;
			this.mouse_down_time = new Date();
			this.previous_mouse_coordinate = data.getCoordinate();
			switch(this.current_mouse_mode){
				case CanvasMouseHandler.MouseModes.EditMode:
					switch(application_state){
						case View.ApplicationStates.MULTI_SELECTION:
							//if not -> clear selection

							if(parent_group != null && this.getCanvas().getView().getCurrentSelectionTree().isSelected(parent_group.getIdentification())){
								//if parent_group selected, no worries
							}else{
								this.resetSelection();
							}
							break;
						case View.ApplicationStates.SINGLE_SELECTION:
							if(parent_group != null && this.getCanvas().getView().getCurrentSelectionTree().isSelected(parent_group.getIdentification())){
								//this object will be moved
							}else{
								//a new digit will be automatically added to this group (either by auto-detecting or by consecutively clicking)
								this.mouse_down_object = null;
								//this.selection_rectangle.startSelection(data.getCoordinate());
							}
							break;
						case View.ApplicationStates.NO_SELECTION:
							break;
					}
					break;
				case CanvasMouseHandler.MouseModes.CanvasMode:
					//this.canvas.getElement().css('cursor', '-webkit-grabbing');
					break;
				case CanvasMouseHandler.MouseModes.SelectionMode:
					this.startSelection(data.getCoordinate());
					break;
				case CanvasMouseHandler.MouseModes.AutoDetectDigitMode:
					this.selection_rectangle.startSelection(data.getCoordinate());
					break;
			}
		};
		CanvasMouseHandler.prototype.focusOut = function(signal, data){
			this.mouse_down = false;
		};
		CanvasMouseHandler.prototype.resetSelection = function(temporary){
			this.messaging_system.fire(this.messaging_system.events.SelectionReset, new SelectionEvent(null, temporary));
		};
		CanvasMouseHandler.prototype.setSelection = function(selection_tree, temporary){
			this.messaging_system.fire(this.messaging_system.events.SelectionSet, new SelectionEvent(selection_tree, temporary));
		};
		CanvasMouseHandler.prototype.toggleSelection = function(selection_tree, temporary){
			this.messaging_system.fire(this.messaging_system.events.SelectionToggled, new SelectionEvent(selection_tree, temporary));
		};
		CanvasMouseHandler.prototype.selectionChanged = function(signal, data){
			if(this.getCanvas().getView().getCurrentSelectionTree().getSingleSelectedElementProxy() == null)
				return;
			var new_group = this.getCanvas().getView().getCurrentSelectionTree().getSingleSelectedElementProxy().getParentOfTypeProxy('group');
			if(new_group == null){
				return;
			}
			this.current_selected_group_proxy = new_group;
		};
		CanvasMouseHandler.prototype.getSingleSelectedElementProxy = function(){
			return this.getCanvas().getView().getCurrentSelectionTree().getSingleSelectedElementProxy();
		};
		CanvasMouseHandler.prototype.getCurrentGroupProxy = function(){
			if(this.current_selected_group_proxy == null)
				return null;
			if(this.current_selected_group_proxy.getDeleted()){
				this.current_selected_group_proxy = null;
			}
			return this.current_selected_group_proxy;
		};
		CanvasMouseHandler.prototype.click = function(signal, data){
			var clicked_object = this.canvas.getObjectAroundCanvasCoordinate(data.getCoordinate());
			var parent_group = null;
			if(clicked_object){
				if(clicked_object.getProxy().hasParentOfType('digit')){
					parent_group = clicked_object.getProxy().getParentOfTypeProxy("digit");
				}else if(clicked_object.getProxy().hasParentOfType('dot')){
					parent_group = clicked_object.getProxy().getParentOfTypeProxy("dot");
				}
			}
			var application_state = this.getCanvas().getView().getApplicationState();
			switch(this.current_mouse_mode){
				case CanvasMouseHandler.MouseModes.EditMode:
					switch(application_state){
						case View.ApplicationStates.MULTI_SELECTION:
							if(this.mouse_dragged){

							}else{
								if(parent_group && !this.mouse_dragged){
									this.setSelection(parent_group.getSelectionTree(true, null), false);
								}else{
									this.resetSelection(false);
								}
							}
							break;
						case View.ApplicationStates.SINGLE_SELECTION:
							if(this.mouse_dragged)
								break;
							var currently_selected_object = this.getSingleSelectedElementProxy();
							if(parent_group != null){
								if(currently_selected_object.isPossiblyAboutThis(parent_group.getIdentification())){
								}else{
									this.setSelection(parent_group.getSelectionTree(true, null), false);
								}
							}else{
								if(this.getCurrentGroupProxy().getGroupType() == "digit"){
									//this.startDigitCornersListening(currently_selected_object.getParentOfTypeProxy("group"));
									this.startDigitCornersListening(this.getCurrentGroupProxy());
									this.addDigitCorner(data.getCoordinate());
								}else{
									this.addDot(data.getCoordinate());
								}
							}
							break;
						case View.ApplicationStates.NO_SELECTION:
							if(parent_group != null){
								this.setSelection(parent_group.getSelectionTree(true, null), false);
							}else{
								if(this.getCurrentGroupProxy() != null){
									if(this.getCurrentGroupProxy().getGroupType() == "digit"){
										this.startDigitCornersListening(this.getCurrentGroupProxy());
										this.addDigitCorner(data.getCoordinate());
									}else{
										this.addDot(data.getCoordinate());
									}
								}
							}
							break;
					}
					break;
				case CanvasMouseHandler.MouseModes.SelectionMode:
					if(!this.mouse_dragged){
						if(parent_group != null){
							this.toggleSelection(parent_group.getSelectionTree(true, null), false);
						}
					}
					break;
				case CanvasMouseHandler.MouseModes.SingleCoordinateListenMode:
					var coordinate_data = new Object();
					coordinate_data.coordinate = this.canvas.getTransformation().transformCanvasCoordinateToRelativeImageCoordinate(data.getCoordinate());
					var identification = this.getSingleSelectedElementProxy().getIdentification();
					this.messaging_system.fire(this.messaging_system.events.SubmitGroupDetails, new SubmitGroupDetailsEvent(identification, coordinate_data));
					this.setMouseMode(null);
					this.canvas.updateCanvas();
					break;
				case CanvasMouseHandler.MouseModes.DigitCornersListenMode:
					this.addDigitCorner(data.getCoordinate());
					break;
			}
		};
		CanvasMouseHandler.prototype.startDigitCornersListening = function(group, existing_digit){
			if(existing_digit == true){
				this.current_listening_digit = this.getSingleSelectedElementProxy();
				this.messaging_system.fire(this.messaging_system.events.GroupReset, new GroupChangedEvent(this.current_listening_digit.getIdentification()));
				if(this.current_listening_digit.getType() != "digit"){
					console.log("current listening digit actually isn't a digit");
				}
			}else{
				this.messaging_system.fire(this.messaging_system.events.AddElement, new AddElementEvent("digit", group.getIdentification(), null, false));
				var subnodes = group.getSubNodes();
				this.current_listening_digit = subnodes[subnodes.length-1];
			}
			this.current_digit_corner_index = 0;
			this.setSelection(this.current_listening_digit.getSelectionTree(), false);
			this.setMouseMode(CanvasMouseHandler.MouseModes.DigitCornersListenMode);
		};
		CanvasMouseHandler.prototype.stopDigitCornersListening = function(){
			//TODO: if newly added digit -> remove
			//TODO: if not newly added digit -> reset?
			this.setMouseMode(null);
			this.canvas.updateCanvas();
		};
		CanvasMouseHandler.prototype.addDigitCorner = function(coordinate){
			var relative_coordinate = this.getCanvas().getTransformation().transformCanvasCoordinateToRelativeImageCoordinate(coordinate);
			var corner_data = new Object();
			corner_data.coordinate = relative_coordinate;
			var identification = this.current_listening_digit.getSubNodes()[this.current_digit_corner_index].getIdentification();
			this.messaging_system.fire(this.messaging_system.events.SubmitGroupDetails, new SubmitGroupDetailsEvent(identification, corner_data));
			this.current_digit_corner_index++;
			if(this.current_digit_corner_index >= this.current_listening_digit.getSubNodes().length){
				this.stopDigitCornersListening();
			}
			this.canvas.updateCanvas();
		};
		CanvasMouseHandler.prototype.addDot = function(coordinate){
			var relative_coordinate = this.getCanvas().getTransformation().transformCanvasCoordinateToRelativeImageCoordinate(coordinate);
			var corner_data = new Object();
			corner_data.coordinate = relative_coordinate;
			this.messaging_system.fire(this.messaging_system.events.AddElement, new AddElementEvent("dot", this.getCurrentGroupProxy().getIdentification(), null, true));
			var identification = this.getCurrentGroupProxy().getSubNodes()[this.getCurrentGroupProxy().getSubNodes().length-1].getIdentification();
			this.messaging_system.fire(this.messaging_system.events.SubmitGroupDetails, new SubmitGroupDetailsEvent(identification, corner_data));
			this.canvas.updateCanvas();
		};
		CanvasMouseHandler.prototype.setMouseMode = function(mouse_mode){
			this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(mouse_mode));
		};
		CanvasMouseHandler.prototype.doubleClick = function(signal, data){
			var res = this.canvas.getObjectAroundCanvasCoordinate(data.getCoordinate());
			if(res){
				this.messaging_system.fire(this.messaging_system.events.ExpandTreeNode, new TreeNodeExpandEvent(res.getProxy().getIdentification()));
			}
		};
		CanvasMouseHandler.prototype.keyDown = function(signal, data){
			switch(data.getEventData().which){
				case 27://escape
					switch(this.getMouseMode()){
						case CanvasMouseHandler.MouseModes.DigitCornersListenMode:
							this.stopDigitCornersListening();
							break;
						case CanvasMouseHandler.MouseModes.SingleCoordinateListenMode:
							this.setMouseMode(null);
							break;
						case CanvasMouseHandler.MouseModes.AutoDetectDigitMode:
							this.stopAutoDetectDigit();
							break;
					}
					break;
				case 17://control
					this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(CanvasMouseHandler.MouseModes.CanvasMode));
					break;
				case 16://shift
					this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(CanvasMouseHandler.MouseModes.SelectionMode));
					break;
				case 46://delete
					var elements = this.getCanvas().getView().getCurrentSelectionTree().getSelectedFlat();
					this.resetSelection();
					for(var i = 0; i < elements.length; ++i){
						this.messaging_system.fire(this.messaging_system.events.RemoveGroup, new RemoveGroupEvent(elements[i].getIdentification()));
					}
					break;
			}
		};
		CanvasMouseHandler.prototype.keyUp = function(signal, data){
			switch(data.getEventData().which){
				case 17://control
					this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(null));
					break;
				case 16:
					this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(null));
					break;
			}
		};
		CanvasMouseHandler.prototype.startSelection = function(coordinate){
			this.selection_rectangle.startSelection(coordinate);
		};
		CanvasMouseHandler.prototype.stopSelection = function(data){
			this.selection_rectangle.updateSelection(data.getCoordinate());
			var selected_tree = this.canvas.getSelectionTree(this.getSelectionRectangle(), "digit");
			this.toggleSelection(selected_tree, false);
			this.selection_rectangle.stopSelection();
		};
		CanvasMouseHandler.prototype.updateSelection = function(data){
			this.selection_rectangle.updateSelection(data.getCoordinate());
			var selected_tree = this.canvas.getSelectionTree(this.getSelectionRectangle(), "digit");
			this.toggleSelection(selected_tree, true);
			this.canvas.updateCanvas();
		};
		CanvasMouseHandler.prototype.getSelectionRectangle = function(){
			return this.selection_rectangle;
		};
		CanvasMouseHandler.prototype.mouseModeChanged = function(signal, data){
			//TODO: keep stack of 3 levels
			if(data.getMode() == null){
				data.setMode(this.previous_mouse_mode);
				this.current_mouse_mode = this.previous_mouse_mode;
			}else{
				if(this.current_mouse_mode == data.getMode()){
					return;
				}
				this.previous_mouse_mode = this.current_mouse_mode;
				this.current_mouse_mode = data.getMode();
			}
			this.messaging_system.fire(this.messaging_system.events.MouseModeChanged, new MouseModeChangedEvent(this.current_mouse_mode));
			this.updateCursor();
		};
		CanvasMouseHandler.prototype.updateCursor = function(){
			switch(this.getMouseMode()){
				case CanvasMouseHandler.MouseModes.EditMode:
					this.canvas.getElement().css('cursor', 'default');
					break;
				case CanvasMouseHandler.MouseModes.CanvasMode:
					if(this.mouse_down){
						this.canvas.getElement().css('cursor', '-webkit-grabbing');
					}else{
						this.canvas.getElement().css('cursor', '-webkit-grab');
					}
					break;
				case CanvasMouseHandler.MouseModes.SelectionMode:
					this.canvas.getElement().css('cursor', 'copy');
					break;
				case CanvasMouseHandler.MouseModes.AutoDetectDigitMode:
					this.canvas.getElement().css('cursor', 'crosshair');
					break;
				case CanvasMouseHandler.MouseModes.SingleCoordinateListenMode:
					this.canvas.getElement().css('cursor', 'crosshair');
					break;
				case CanvasMouseHandler.MouseModes.DigitCornersListenMode:
					this.canvas.getElement().css('cursor', 'crosshair');
					break;
				default:
					this.canvas.getElement().css('cursor', 'default');
					break;
			}
		};
		CanvasMouseHandler.prototype.getMouseMode = function(){
			return this.current_mouse_mode;
		};
		CanvasMouseHandler.prototype.getCanvas = function(){
			return this.canvas;
		};
		return CanvasMouseHandler;
	});