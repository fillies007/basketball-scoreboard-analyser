define([
	"../../../messaging_system/event_listener",
	"../../../model/coordinate",
	"../../../messaging_system/events/selection_event",
	"../../../messaging_system/events/objects_moved_event",
	"../../../messaging_system/events/mouse_mode_changed_event"]
	, function(
		EventListener,
		Coordinate,
		SelectionEvent,
		ObjectsMovedEvent,
		MouseModeChangedEvent
	){
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
	SelectionRectangle.prototype.getBottomRight = function(){
		return new Coordinate(Math.max(this.start_coordinate.getX(), this.end_coordinate.getX()), Math.max(this.start_coordinate.getY(), this.end_coordinate.getY()));
	};
	SelectionRectangle.prototype.getHeight = function(){
		return Math.abs(this.start_coordinate.getY()-this.end_coordinate.getY());
	};
	SelectionRectangle.prototype.getWidth = function(){
		return Math.abs(this.start_coordinate.getX()-this.end_coordinate.getX());
	};
	SelectionRectangle.prototype.transformCanvasCoordinatesToRelativeImageCoordinates = function(transformation){
		var result = new SelectionRectangle();
		result.startSelection(transformation.transformCanvasCoordinateToRelativeImageCoordinate(this.start_coordinate));
		result.updateSelection(transformation.transformCanvasCoordinateToRelativeImageCoordinate(this.end_coordinate));
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
		this.canvas = canvas;
		this.messaging_system = messaging_system;

		this.previous_mouse_coordinate = new Coordinate();
		this.mouse_down = false;

		this.current_mouse_mode = CanvasMouseHandler.MouseModes.SelectionMode;
		this.previous_mouse_mode = CanvasMouseHandler.MouseModes.SelectionMode;
		//this.current_mouse_mode = CanvasMouseHandler.MouseModes.ViewEditMode;
		this.selection_rectangle = new SelectionRectangle;

		this.messaging_system.addEventListener(this.messaging_system.events.CanvasScrolled, new EventListener(this, this.canvasScrolled));
		this.messaging_system.addEventListener(this.messaging_system.events.CanvasMouseMove, new EventListener(this, this.mouseMove));
		this.messaging_system.addEventListener(this.messaging_system.events.CanvasMouseUp, new EventListener(this, this.mouseUp));
		this.messaging_system.addEventListener(this.messaging_system.events.CanvasMouseDown, new EventListener(this, this.mouseDown));
		this.messaging_system.addEventListener(this.messaging_system.events.CanvasFocusOut, new EventListener(this, this.focusOut));
		this.messaging_system.addEventListener(this.messaging_system.events.CanvasImageClick, new EventListener(this, this.click));
		this.messaging_system.addEventListener(this.messaging_system.events.CanvasImageDoubleClick, new EventListener(this, this.doubleClick));
		this.messaging_system.addEventListener(this.messaging_system.events.CanvasKeyDown, new EventListener(this, this.keyDown));

		this.messaging_system.addEventListener(this.messaging_system.events.MouseModeChanged, new EventListener(this, this.mouseModeChanged));
	};
	CanvasMouseHandler.MouseModes = {
		SelectionMode:"SelectionMode",
		ViewEditMode:"ViewEditMode",
		DragMode:"DragMode",
		CoordinateClickMode:"CoordinateClickMode"
	};
	CanvasMouseHandler.prototype.canvasScrolled = function(signal, data){
		var evt = data.event_data;
		var delta = evt.wheelDelta?evt.wheelDelta/40:evt.detail?-evt.detail : 0;
		var factor = 0;
		if(delta > 0){
			factor = 9/10;
		}else{
			factor = 10/9;
		}
		var mouse_coordinate = this.canvas.getTransformation().transformCanvasCoordinateToRelativeImageCoordinate(data.getCoordinate());
		this.canvas.getTransformation().setScale(this.canvas.getTransformation().getScale()*factor, mouse_coordinate);
		this.canvas.updateCanvas(signal, data);
		return data.event_data.preventDefault() && false;
	};
	CanvasMouseHandler.prototype.mouseMove = function(signal, data){
		switch(this.current_mouse_mode){
			case CanvasMouseHandler.MouseModes.ViewEditMode:
				if(this.mouse_down){
					var mv = new Coordinate(
						this.canvas.getTransformation().getCanvasWidth() / 2 - (data.getCoordinate().getX() - this.previous_mouse_coordinate.getX()),
						this.canvas.getTransformation().getCanvasHeight() / 2 - (data.getCoordinate().getY() - this.previous_mouse_coordinate.getY())
					);
					var transformed = this.canvas.getTransformation().transformCanvasCoordinateToRelativeImageCoordinate(mv);
					this.canvas.getTransformation().setCanvasCenter(transformed);
					this.canvas.updateCanvas(signal, data);
				}
				break;
			case CanvasMouseHandler.MouseModes.SelectionMode:
				if(this.mouse_down){
					this.updateSelection(data);
				}
				break;
			case CanvasMouseHandler.MouseModes.DragMode:
				if(this.mouse_down){
					var mv = new Coordinate(data.getCoordinate().getX()-this.previous_mouse_coordinate.getX(), data.getCoordinate().getY()-this.previous_mouse_coordinate.getY());
					var transformed = this.canvas.getTransformation().transformCanvasTranslationToRelativeImageTranslation(mv);
					this.messaging_system.fire(this.messaging_system.events.ObjectsMoved, new ObjectsMovedEvent(this.canvas.view.getCurrentSelectionTree(), transformed));
				}
				break;
		}
		this.previous_mouse_coordinate = data.getCoordinate();
	};
	CanvasMouseHandler.prototype.mouseUp = function(signal, data){
		this.mouse_down = false;
		switch(this.current_mouse_mode){
			case CanvasMouseHandler.MouseModes.SelectionMode:
				this.stopSelection(data);
				break;
		}
	};
	CanvasMouseHandler.prototype.mouseDown = function(signal, data){
		this.mouse_down = true;
		switch(this.current_mouse_mode){
			case CanvasMouseHandler.MouseModes.SelectionMode:
				if(!data.getEventData().shiftKey && !data.getEventData().ctrlKey){
					this.messaging_system.fire(this.messaging_system.events.SelectionReset, null);
				}
				this.startSelection(data.getCoordinate());
				break;
		}
	};
	CanvasMouseHandler.prototype.focusOut = function(signal, data){
		this.mouse_down = true;
	};
	CanvasMouseHandler.prototype.click = function(signal, data){
	};
	CanvasMouseHandler.prototype.doubleClick = function(signal, data){
	};
	CanvasMouseHandler.prototype.keyDown = function(signal, data){
		if(data.getEventData().which == 27){//escape
			this.messaging_system.fire(this.messaging_system.events.SelectionReset, null);
		}
	};
	CanvasMouseHandler.prototype.startSelection = function(coordinate){
		this.selection_rectangle.startSelection(coordinate);
	};
	CanvasMouseHandler.prototype.stopSelection = function(data){
		this.selection_rectangle.updateSelection(data.getCoordinate());
		var selected_tree = this.canvas.getSelectionTree(this.getSelectionRectangle());
		var selection_event = new SelectionEvent(selected_tree, false);
		if(data.getEventData().ctrlKey){//toggle selection
			this.messaging_system.fire(this.messaging_system.events.SelectionToggled, selection_event);
		}else if(data.getEventData().shiftKey){//add selection
			this.messaging_system.fire(this.messaging_system.events.SelectionAdded, selection_event);
		}else{//set selection
			this.messaging_system.fire(this.messaging_system.events.SelectionSet, selection_event);
		}
		this.selection_rectangle.stopSelection();
	};
	CanvasMouseHandler.prototype.updateSelection = function(data){
		this.selection_rectangle.updateSelection(data.getCoordinate());
		var selected_tree = this.canvas.getSelectionTree(this.getSelectionRectangle());
		var selection_event = new SelectionEvent(selected_tree, true);
		if(data.getEventData().ctrlKey){//toggle selection
			this.messaging_system.fire(this.messaging_system.events.SelectionToggled, selection_event);
		}else if(data.getEventData().shiftKey){//add selection
			this.messaging_system.fire(this.messaging_system.events.SelectionAdded, selection_event);
		}else{//set selection
			this.messaging_system.fire(this.messaging_system.events.SelectionSet, selection_event);
		}
		this.canvas.updateCanvas();
	};
	CanvasMouseHandler.prototype.getSelectionRectangle = function(){
		return this.selection_rectangle;
	};

	CanvasMouseHandler.prototype.mouseModeChanged = function(signal, data){
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
	};
	return CanvasMouseHandler;
});