
/**
 *
 */
Array.prototype.forLoop = function(worker, callBack) {
	var self = this;
	
	var returnData = [];
	
	var loop = function(i) {
		
		if(i === self.length) {
			return callBack(returnData);
		}
		
		process.nextTick(function() {
			worker.call(self, self[i], function(d) {
				returnData.push(d);
				loop(++i);
			});
		});
		
	};
	
	loop(0);
	
};



require('colors');