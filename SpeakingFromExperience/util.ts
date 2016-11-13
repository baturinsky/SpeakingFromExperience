type NumberMap = { [key: string]: number }

function joinArrays(array: any[]): any[] {
  return Array.prototype.concat.apply([], array)
}

function arrayify(it): any {
  if (Array.isArray(it))
    return it
  else
    return [it]
}

/*function asArray(it): any[] {
    return Array.prototype.slice.call(it)
}*/

function dot2(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
}

function dot3(n: number): string {
  return n.toLocaleString('en-US', { maximumFractionDigits: 3 })
}

function putInBetweens(arr: any[], delimeter) {
  return joinArrays(arr.map((e) => [delimeter, e])).slice(1)
}

function setPropToAttr(object, property, attribute = 'value') {
  return m.withAttr(attribute, (value) => { object[property] = value })
}

function bindPropWithAttr(object, property, attribute = 'value') {
  var r = { oninput: setPropToAttr(object, property, attribute) }
  r[attribute] = object[property]
  return r
}

function downloadFile(url, success) {
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.responseType = "text";
  xhr.onreadystatechange = function () {
    if (xhr.readyState == 4) {
      if (success) success(xhr.response);
    }
  };
  xhr.send(null);
}

function applyMixins(derivedCtor: any, baseCtors: any[]) {
  baseCtors.forEach(baseCtor => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
      derivedCtor.prototype[name] = baseCtor.prototype[name];
    });
  });
}

function bindMethod(obj, key: string) {
  return function () { return obj[key].apply(obj, arguments) }
}

class WeightedList {
  static reg = /(\w+)[:=]?(-?\d+\.?\d*)?/g
  weights: [any, number][] = []
  signature: string
  total = 0

  constructor(weights: any = null, defaultWeight = 1) {
    if(weights != null)
      this.setWeights(weights, defaultWeight)
  }

  add(value: any, weight: number) {
    this.weights.push([value, weight])
  }

  setWeights(weights: any, defaultWeight = 1) {
    if (weights instanceof WeightedList) {
      weights = weights.weights
    } else if (typeof weights === "string") {
      var split
      var w = []
      while (split = WeightedList.reg.exec(weights)) {
        w.push([split[1], split[2] == undefined ? defaultWeight : parseFloat(split[2])])
      }
      weights = w
    } else if (!Array.isArray(weights)) {
      var w = []
      for (let k in weights) {
        w.push([k, weights[k] == null ? defaultWeight : weights[k]])
      }
      weights = w
    }
    for (let item of weights)
      this.weights.push(Array.isArray(item) ? [item[0], item[1]] : [item, defaultWeight])
    this.complete()
  }

  complete() {
    for (let item of this.weights)
      this.total += item[1] * 1
    this.weights = this.weights.sort((a, b) => { return a[0] > b[0] ? 1 : -1 })
    this.signature = (this.weights.map((x) => { return x[0] + (x[1] == 1 ? "" : (":" + x[1])) })).join(" ")
  }

  toString(): string {
    return this.signature
  }

  toMap(): NumberMap {
    var o: NumberMap = {}
    for (let item of this.weights) {
      o[item[0]] = item[1]
    }
    return o
  }

  random() {
    var i, sum = 0, r = Math.random() * this.total
    for (let item of this.weights) {
      sum += item[1]
      if (r <= sum)
        return item[0]
    }
  }

  static parseNumberMap(s:string): NumberMap {
    return new WeightedList(s).toMap()
  }
}

function objToPairs<T>(object: { [key: string]: T }): [string, T][] {
  var key, value, results = []
  for (key in object) {
    value = object[key]
    results.push([key, value])
  }
  return results
}

function newNumberMap(a: any): NumberMap {
  return new WeightedList(a).toMap()
}

function addNumberMap(a: NumberMap, b: NumberMap) {
  for (var key in b)
    a[key] = (a[key] || 0) + b[key]
}

function addNumberMapTimes(a: NumberMap, b: NumberMap, n:number = 1) {
  for (var key in b) {
    a[key] = (a[key] || 0) + b[key] * n
  }
}

function mulNumberMap(a: NumberMap, b: NumberMap): NumberMap {
  var c: NumberMap = {}
  for (var key in b)
    c[key] = (a[key] || 0) * b[key]
  return c
}


function numberMapToString(a: NumberMap) {
  return mapValues(a, (v, k) => { return k + (v == 1 ? "" : (":" + v)) }).join(" ")
}

function assert(value, message = "Assert failed") {
  if (!value)
    throw message;
}

var seed: number = 0

function randi() {
  seed = (seed * 9301 + 49297) % 233280
  return seed
}

function random() { return randi() / 233280.0 }
function randomRange(min: number, max: number): number { return random() * (max - min) + min }
function randomInt(min: number, max: number): number { return randi() % (max - min) + min }
function randomIntInclusive(min: number, max: number): number { return randi() % (max - min + 1) + min }
function randomMember<T>(a: Array<T>): T { return a[randomInt(0, a.length)] }
function randomObjMember<T>(a: { [key: string]: T }): T {
  return a[randomMember(Object.keys(a))]
}

function capitalize(str) {
  return str.replace(/\b\w/g, (l) => l.toUpperCase())
}

Object["map"] = function (o, f, ctx) {
  ctx = ctx || this;
  var result = {};
  Object.keys(o).forEach(function (k) {
    result[k] = f.call(ctx, o[k], k, o);
  });
  return result;
}

function mapValues<T>(obj: { [key: string]: T }, f:(v:T, k:string) => any = (v) => (v)) {
  var a = []
  for (var k in obj) {
    a.push(f(obj[k], k))
  }
  return a
}

function abbreviateName(n: string) {
  n = n.replace(/( \w+)/g, (s) => (s.charAt(1)))
  return n
}

function keySortedNumberMap(n:NumberMap): [string, number][] {
  return objToPairs(n).sort((a, b) => a[0] > b[0]?1:-1)
}

function valueSortedNumberMap(n: NumberMap): [string, number][] {
  return objToPairs(n).sort((a, b) => b[1] - a[1])
}

function randomNumberMap(nm: NumberMap):string {
  var total = 0
  for (let i in nm)
    total += nm[i]
  var i, sum = 0, r = Math.random() * total
  for (let i in nm) {
    sum += nm[i]
    if (r <= sum)
      return i
  }
  return null
}

function span(x){
  return m("span", x)
}