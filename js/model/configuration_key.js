define(["./data_base_class",
		"./proxy/configuration_key_proxy"],
	function(DataBaseClass, ConfigurationKeyProxy){
		var ConfigurationKey = function(key, value, messaging_system){
			this.messaging_system = messaging_system;
			this.init();
			this.key = key;
			this.value = value;
			this.setProxy(new ConfigurationKeyProxy(this));
		};
		ConfigurationKey.prototype = new DataBaseClass("configuration_key");
		ConfigurationKey.KeyValues = {
			"parse_function" : "text",
			"read_function" : "text",
			"sync_function" : "text",
			"first_digit_restricted" : ["0", "1"],
			"must_be_on" : ["true", "false"],
			"dtype" : ["1", "2", "3"],
			"luminance_threshold" : "numeric",
			"requested_stability_ms" : "numeric",
			"luminance_differential_threshold" : "numeric"
		};
		ConfigurationKey.getKeyOptions = function(){
			var res = new Array();
			for(var k in ConfigurationKey.KeyValues){
				if(ConfigurationKey.KeyValues.hasOwnProperty(k)){
					res.push(k);
				}
			}
			return res;
		};
		ConfigurationKey.prototype.getKeyOptions = function(){
			return ConfigurationKey.getKeyOptions();
		};
		ConfigurationKey.getPossibleValues = function(key){
			return ConfigurationKey.KeyValues[key];
		};
		ConfigurationKey.prototype.getPossibleValues = function(key){
			return ConfigurationKey.getPossibleValues(key);
		};
		ConfigurationKey.prototype.getKey = function(){
			return this.key;
		};
		ConfigurationKey.prototype.getValue = function(){
			return this.value;
		};
		ConfigurationKey.prototype.setValue = function(value){
			this.value = value;
		};
		ConfigurationKey.prototype.getStringifyData = function(){
			var d = new Object();
			d.type = this.getType();
			d.key = this.getKey();
			d.value = this.getValue();
			return d;
		};
		ConfigurationKey.prototype.getTitle = function(){
			return "Configuration key: " + this.getKey() + " = " + this.getValue();
		};
		ConfigurationKey.prototype.update = function(data){
			this.key = data.key;
			this.value = data.value;
			this.notifyGroupChanged();
		};
		ConfigurationKey.prototype.applyGlobalConfiguration = function(current_configuration, end_index){
			current_configuration[this.getKey()] = this.getValue();
			return current_configuration;
		};
		ConfigurationKey.prototype.isComplete = function(){
			return this.key != null && this.value != null;
		};
		return ConfigurationKey;
	});
