define([], function(){
	//A few helper methods for working with coordinates
	var Coordinate = function(x, y){
		this.x = x;
		this.y = y;
		if(this.x){
			this.x = parseFloat(parseFloat(x).toPrecision(8));
		}
		if(this.y){
			this.y = parseFloat(parseFloat(y).toPrecision(8));
		}
	};
	Coordinate.prototype.setX = function(x){
		this.x = parseFloat(parseFloat(x).toPrecision(8));
	};
	Coordinate.prototype.setY = function(y){
		this.y = parseFloat(parseFloat(y).toPrecision(8));
	};
	Coordinate.prototype.getX = function(){
		if(this.x)
			return parseFloat(this.x);
		return this.x;
	};
	Coordinate.prototype.getY = function(){
		if(this.y)
			return parseFloat(this.y);
		return this.y;
	};
	Coordinate.prototype.isValid = function(){
		return $.isNumeric(this.x) && $.isNumeric(this.y);
	};
	Coordinate.prototype.type = "coordinate";
	//Calculates the center of the coordinates in an array (equal weights)
	Coordinate.getMiddle = function(arr){
		if(arr.length == 0)
			return new Coordinate('', '');
		var total_x = 0;
		var total_y = 0;
		for(var i = 0; i < arr.length; ++i){
			total_x += arr[i].getX();
			total_y += arr[i].getY();
		}
		total_x /= arr.length;
		total_y /= arr.length;
		return new Coordinate(total_x, total_y);
	};
	Coordinate.getDistance = function(c1, c2){
		return Math.sqrt(Coordinate.getSquareDistance(c1, c2));
	};
	Coordinate.getSquareDistance = function(c1, c2){
		var dx = c1.getX() - c2.getX();
		var dy = c1.getY() - c2.getY();
		return dx * dx + dy * dy;
	};
	//Convert floating point coordinates to integer coordinates for use on the canvas
	Coordinate.prototype.round = function(){
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
	};
	Coordinate.prototype.roundUp = function(){
		this.x = Math.ceil(this.x);
		this.y = Math.ceil(this.y);
	};
	Coordinate.prototype.roundDown = function(){
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
	};
	Coordinate.prototype.add = function(c2){
		return new Coordinate(c2.getX() + this.getX(), c2.getY() + this.getY());
	};
	Coordinate.prototype.subtract = function(c2){
		return this.add(c2.scalarMultiply(-1));
	};
	Coordinate.prototype.scalarMultiply = function(l){
		return new Coordinate(this.getX() * l, this.getY() * l);
	};
	Coordinate.prototype.clone = function(){
		return new Coordinate(this.getX(), this.getY());
	};
	Coordinate.prototype.equals = function(c){
		return c.getX() == this.getX() && c.getY() == this.getY();
	};
	return Coordinate;
});
