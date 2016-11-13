function joinArrays(array) {
    return Array.prototype.concat.apply([], array);
}
function arrayify(it) {
    if (Array.isArray(it))
        return it;
    else
        return [it];
}
/*function asArray(it): any[] {
    return Array.prototype.slice.call(it)
}*/
function dot2(n) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}
function dot3(n) {
    return n.toLocaleString('en-US', { maximumFractionDigits: 3 });
}
function putInBetweens(arr, delimeter) {
    return joinArrays(arr.map(function (e) { return [delimeter, e]; })).slice(1);
}
function setPropToAttr(object, property, attribute) {
    if (attribute === void 0) { attribute = 'value'; }
    return m.withAttr(attribute, function (value) { object[property] = value; });
}
function bindPropWithAttr(object, property, attribute) {
    if (attribute === void 0) { attribute = 'value'; }
    var r = { oninput: setPropToAttr(object, property, attribute) };
    r[attribute] = object[property];
    return r;
}
function downloadFile(url, success) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = "text";
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            if (success)
                success(xhr.response);
        }
    };
    xhr.send(null);
}
function applyMixins(derivedCtor, baseCtors) {
    baseCtors.forEach(function (baseCtor) {
        Object.getOwnPropertyNames(baseCtor.prototype).forEach(function (name) {
            derivedCtor.prototype[name] = baseCtor.prototype[name];
        });
    });
}
function bindMethod(obj, key) {
    return function () { return obj[key].apply(obj, arguments); };
}
var WeightedList = (function () {
    function WeightedList(weights, defaultWeight) {
        if (weights === void 0) { weights = null; }
        if (defaultWeight === void 0) { defaultWeight = 1; }
        this.weights = [];
        this.total = 0;
        if (weights != null)
            this.setWeights(weights, defaultWeight);
    }
    WeightedList.prototype.add = function (value, weight) {
        this.weights.push([value, weight]);
    };
    WeightedList.prototype.setWeights = function (weights, defaultWeight) {
        if (defaultWeight === void 0) { defaultWeight = 1; }
        if (weights instanceof WeightedList) {
            weights = weights.weights;
        }
        else if (typeof weights === "string") {
            var split;
            var w = [];
            while (split = WeightedList.reg.exec(weights)) {
                w.push([split[1], split[2] == undefined ? defaultWeight : parseFloat(split[2])]);
            }
            weights = w;
        }
        else if (!Array.isArray(weights)) {
            var w = [];
            for (var k in weights) {
                w.push([k, weights[k] == null ? defaultWeight : weights[k]]);
            }
            weights = w;
        }
        for (var _i = 0, weights_1 = weights; _i < weights_1.length; _i++) {
            var item = weights_1[_i];
            this.weights.push(Array.isArray(item) ? [item[0], item[1]] : [item, defaultWeight]);
        }
        this.complete();
    };
    WeightedList.prototype.complete = function () {
        for (var _i = 0, _a = this.weights; _i < _a.length; _i++) {
            var item = _a[_i];
            this.total += item[1] * 1;
        }
        this.weights = this.weights.sort(function (a, b) { return a[0] > b[0] ? 1 : -1; });
        this.signature = (this.weights.map(function (x) { return x[0] + (x[1] == 1 ? "" : (":" + x[1])); })).join(" ");
    };
    WeightedList.prototype.toString = function () {
        return this.signature;
    };
    WeightedList.prototype.toMap = function () {
        var o = {};
        for (var _i = 0, _a = this.weights; _i < _a.length; _i++) {
            var item = _a[_i];
            o[item[0]] = item[1];
        }
        return o;
    };
    WeightedList.prototype.random = function () {
        var i, sum = 0, r = Math.random() * this.total;
        for (var _i = 0, _a = this.weights; _i < _a.length; _i++) {
            var item = _a[_i];
            sum += item[1];
            if (r <= sum)
                return item[0];
        }
    };
    WeightedList.parseNumberMap = function (s) {
        return new WeightedList(s).toMap();
    };
    WeightedList.reg = /(\w+)[:=]?(-?\d+\.?\d*)?/g;
    return WeightedList;
}());
function objToPairs(object) {
    var key, value, results = [];
    for (key in object) {
        value = object[key];
        results.push([key, value]);
    }
    return results;
}
function newNumberMap(a) {
    return new WeightedList(a).toMap();
}
function addNumberMap(a, b) {
    for (var key in b)
        a[key] = (a[key] || 0) + b[key];
}
function addNumberMapTimes(a, b, n) {
    if (n === void 0) { n = 1; }
    for (var key in b) {
        a[key] = (a[key] || 0) + b[key] * n;
    }
}
function mulNumberMap(a, b) {
    var c = {};
    for (var key in b)
        c[key] = (a[key] || 0) * b[key];
    return c;
}
function numberMapToString(a) {
    return mapValues(a, function (v, k) { return k + (v == 1 ? "" : (":" + v)); }).join(" ");
}
function assert(value, message) {
    if (message === void 0) { message = "Assert failed"; }
    if (!value)
        throw message;
}
var seed = 0;
function randi() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed;
}
function random() { return randi() / 233280.0; }
function randomRange(min, max) { return random() * (max - min) + min; }
function randomInt(min, max) { return randi() % (max - min) + min; }
function randomIntInclusive(min, max) { return randi() % (max - min + 1) + min; }
function randomMember(a) { return a[randomInt(0, a.length)]; }
function randomObjMember(a) {
    return a[randomMember(Object.keys(a))];
}
function capitalize(str) {
    return str.replace(/\b\w/g, function (l) { return l.toUpperCase(); });
}
Object["map"] = function (o, f, ctx) {
    ctx = ctx || this;
    var result = {};
    Object.keys(o).forEach(function (k) {
        result[k] = f.call(ctx, o[k], k, o);
    });
    return result;
};
function mapValues(obj, f) {
    if (f === void 0) { f = function (v) { return (v); }; }
    var a = [];
    for (var k in obj) {
        a.push(f(obj[k], k));
    }
    return a;
}
function abbreviateName(n) {
    n = n.replace(/( \w+)/g, function (s) { return (s.charAt(1)); });
    return n;
}
function keySortedNumberMap(n) {
    return objToPairs(n).sort(function (a, b) { return a[0] > b[0] ? 1 : -1; });
}
function valueSortedNumberMap(n) {
    return objToPairs(n).sort(function (a, b) { return b[1] - a[1]; });
}
function randomNumberMap(nm) {
    var total = 0;
    for (var i_1 in nm)
        total += nm[i_1];
    var i, sum = 0, r = Math.random() * total;
    for (var i_2 in nm) {
        sum += nm[i_2];
        if (r <= sum)
            return i_2;
    }
    return null;
}
function span(x) {
    return m("span", x);
}
//# sourceMappingURL=util.js.map