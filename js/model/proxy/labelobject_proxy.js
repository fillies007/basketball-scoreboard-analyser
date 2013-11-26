define([],function(){
    var LabelObjectProxy = function(label_object){
        this.label_object = label_object;
    };
    LabelObjectProxy.prototype.getTitle = function(){
        return this.label_object.getTitle();
    };
    LabelObjectProxy.prototype.getSubNodes = function(){
        return this.label_object.getSubNodesProxies();
    };
    LabelObjectProxy.prototype.getId = function(){
        return this.label_object.getId();
    };
    return LabelObjectProxy;
});
