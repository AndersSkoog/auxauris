(function(){
    Math.roundByDecimal = function(num,decimals){
    	return Math.round(num*Math.pow(10,decimals))/Math.pow(10,decimals);
    };
    Math.normalize = function(num,min,max,decimals){
	let v = Math.clamp(num,min,max);
	let r = max - min;
	let i = 1 - (r - num) / r;
	return decimals !=0 ? parseFloat((i).toFixed(decimals)) : parseInt((i).toFixed());
    }
    // Math.scale = function(normal,min,max){
    // 	return ((normal * 100) * Math.abs(max - min)) / 100;
    // };
    Math.scale = function(normal,min,max){
        return min + (Math.abs(max - min) * normal);
    };
    Math.clamp = function(input,min,max){
    	return input <= max && input >= min ? input : input < min ? min : max;
    };
    Math.closest = function(a,v){
    	return a.reduce((p,c)=> {return (Math.abs(c - v) < Math.abs(p - v)) ? c : p;});
    };
    Math.curve = function(base,range,scale,points){
	let min = base - range;
	let max = base + range;
	return points.map((v)=> {
		if(v == 0){return base;}
		if(v < 0){return base - range * (Math.abs(v) * scale);}
		if(v > 0){return base + range * (Math.abs(v) * scale);}
	});
    };
    Math.fix = function(normal,min,max,step,decimals){
	let pc = (max / step).toFixed();
  	let pi = Math.scale(normal,min,pc).toFixed(decimals);
	return Math.clamp((step * pi).toFixed(decimals),min,max);
    };
    Math.nthroot = function(x,n) {
        return Math.exp((1/n)*Math.log(x));
    };
    Math.slope = function(normal,min,max,thresholds,scales){
    	return Math.clamp((normal * max) * scales[thresholds.indexOf(Math.closest(thresholds,normal))],min,max);
    };
    Math.mix = function(left,right,balancenormal){
	let a = 1 - Math.clamp(balancenormal,0,1);
	let b = 0 + Math.clamp(balancenormal,0,1);
	return Array.from({length: left.length}, (v, k) => k).map((index)=> {
		return Math.abs((left[index] * a) - (right[index] * b));
	});
    };
    Math.sum = function(arr){
        return arr.reduce((a,b)=> a + b);   
    }}());
