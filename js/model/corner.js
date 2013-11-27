define(['./coordinate','./proxy/corner_proxy', './data_base_class'], function(Coordinate, CornerProxy, DataBaseClass){
    var Corner = function(parent_digit, coordinate, id, messaging_system){
		this.init();
        this.messaging_system = messaging_system;
        this.id = id;
        this.setCoordinate(coordinate);
        this.parent_digit = parent_digit;
        this.proxy = new CornerProxy(this);
    };
	DataBaseClass.applyMethods(Corner.prototype);
	Corner.prototype.type = "corner";
    Corner.prototype.getCoordinate = function(){
        return this.coordinate;
    };
    Corner.prototype.setCoordinate = function(coordinate){
        this.coordinate = coordinate;
    };
    Corner.prototype.getTitle = function(){
        return "x: "+this.getCoordinate().x+" y: "+this.getCoordinate().y;
    };
	Corner.prototype.load = function(corner_data, warn_listeners=true){
		this.id = corner_data.id;
		this.setCoordinate(corner_data.coordinate);
		if(warn_listeners){
			this.notifyLabelChanged();
		}
	};
    return Corner;
});