define(["jquery-1.10.2.min", "controller/application"], 
	function(jq, Controller){
       	this.c = new Controller($('body'));
        this.c.loadImage("./testdata/scoreboard-images/chalon.png");
    }
);
