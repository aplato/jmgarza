String.prototype.fromRomanNumeral = function() {
	var roman = this.toUpperCase().split('');
	var lookup = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
	var num = 0;
	var val = 0;

	while (roman.length) {
		val = lookup[roman.shift()];
		num += val * (val < lookup[roman[0]] ? -1 : 1);
	}

	return num;
};
Number.prototype.toRomanNumeral = function() {
	var digits = String(this).split(""),
	    key = [
	    	"", "C", "CC", "CCC", "CD", "D", "DC", "DCC", "DCCC", "CM",
	    	"", "X", "XX", "XXX", "XL", "L", "LX", "LXX", "LXXX", "XC",
	    	"", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];
	roman = "";
	i = 3;
	while (i--)
		roman = (key[+digits.pop() + (i * 10)] || "") + roman;

	return Array(+digits.join("") + 1).join("M") + roman;
};
