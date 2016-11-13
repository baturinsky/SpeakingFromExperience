var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var log = console.log.bind(console);
var ownProp = {}.hasOwnProperty;
function importProperties(obj, src) {
    for (var key in src)
        if (ownProp.call(src, key))
            obj[key] = src[key];
    return obj;
}
var Uids = (function () {
    function Uids() {
        this.prefixes = {};
    }
    Uids.prototype.make = function (prefix) {
        if (prefix === void 0) { prefix = ''; }
        this.prefixes[prefix] = this.prefixes[prefix] || 0;
        return prefix + " " + ++this.prefixes[prefix];
    };
    Uids.default = new Uids();
    return Uids;
}());
var Graveyard = (function () {
    function Graveyard(type) {
        this.type = type;
        this.deceased = [];
    }
    Graveyard.prototype.bury = function (corpse) {
        this.deceased.push(corpse);
    };
    Graveyard.prototype.raise = function () {
        if (this.deceased.length)
            return this.deceased.pop();
        else
            return new this.type();
    };
    return Graveyard;
}());
var ChainLink = (function () {
    function ChainLink(value) {
        this.value = value;
        this.pushNode = ChainLink.prototype.insertNodeBefore;
        this.unshiftNode = ChainLink.prototype.insertNodeAfter;
        this.push = ChainLink.prototype.insertBefore;
        this.unshift = ChainLink.prototype.insertAfter;
    }
    ChainLink.prototype.remove = function () {
        this.prv.nxt = this.nxt;
        this.nxt.prv = this.prv;
        return this;
    };
    ChainLink.prototype.insertNodeBefore = function (node) {
        node.nxt = this;
        node.prv = this.prv;
        this.prv.nxt = node;
        this.prv = node;
        return node;
    };
    ChainLink.prototype.insertNodeAfter = function (node) {
        node.prv = this;
        node.nxt = this.nxt;
        this.nxt.prv = node;
        this.nxt = node;
        return node;
    };
    ChainLink.prototype.insertBefore = function (value) { return this.insertNodeBefore(new ChainLink(value)); };
    ChainLink.prototype.insertAfter = function (value) { return this.insertNodeAfter(new ChainLink(value)); };
    ChainLink.prototype.each = function (f) {
        var iter = this.nxt;
        while (iter != this) {
            f(iter.value);
            iter = iter.nxt;
        }
    };
    ChainLink.prototype.eachNode = function (f) {
        var iter = this.nxt;
        while (iter != this) {
            f(iter);
            iter = iter.nxt;
        }
    };
    ChainLink.prototype.empty = function () { return this.nxt == this; };
    ChainLink.prototype.purge = function () { this.nxt = this.prv = this; };
    ChainLink.prototype.first = function () { return this.nxt; };
    ChainLink.prototype.last = function () { return this.prv; };
    return ChainLink;
}());
var Chain = (function (_super) {
    __extends(Chain, _super);
    function Chain() {
        _super.call(this);
        this.nxt = this.prv = this;
    }
    Chain.prototype.removeNode = function (node) {
        return node.remove();
    };
    return Chain;
}(ChainLink));
var Channel = (function () {
    function Channel() {
        this.subs = new Chain();
    }
    Channel.prototype.subscribe = function (callback, parameters) {
        var binding = this.subs.push(callback);
        if (parameters)
            importProperties(binding, parameters);
        return binding;
    };
    Channel.simpleEmitCallback = function (binding) {
        binding.value.call(binding);
    };
    Channel.prototype.emit = function (parameters) {
        if (parameters)
            this.subs.eachNode(function (binding) { binding.value.call(binding, parameters); });
        else
            this.subs.eachNode(Channel.simpleEmitCallback);
    };
    Channel.prototype.once = function (callback, parameters) {
        this.subscribe(Channel.doOnceAndRemove, parameters).TactualCallback = callback;
    };
    Channel.doOnceAndRemove = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i - 0] = arguments[_i];
        }
        this.TactualCallback(args);
        this.remove();
    };
    return Channel;
}());
var Channels = (function () {
    function Channels() {
        this.channel = {};
    }
    Channels.prototype.on = function (event, callback, parameters) {
        var relevant = this.channel[event] = (this.channel[event] || new Channel());
        relevant.subscribe(callback, parameters);
    };
    Channels.prototype.emit = function (event, parameters) {
        var relevant = this.channel[event];
        if (relevant)
            relevant.emit(parameters);
    };
    Channels.prototype.once = function (event, callback, parameters) {
        var relevant = this.channel[event];
        if (relevant)
            relevant.once(callback, parameters);
    };
    return Channels;
}());
var Freezer = (function () {
    function Freezer() {
        this.constructors = {};
        this.staticObjects = [];
        this.staticClasses = [];
        this.constructorLookups = [];
        this.uids = Uids.default;
    }
    Freezer.prototype.addFreezableClasses = function () {
        var freezableClasses = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            freezableClasses[_i - 0] = arguments[_i];
        }
        var uids = this.uids;
        var _loop_1 = function(C) {
            this_1.constructors[C.name] = C;
            C.prototype.Tid = C.prototype.Tid || function () {
                this.id = this.id || uids.make(C.name);
                return this.id;
            };
        };
        var this_1 = this;
        for (var _a = 0, freezableClasses_1 = freezableClasses; _a < freezableClasses_1.length; _a++) {
            var C = freezableClasses_1[_a];
            _loop_1(C);
        }
        return this;
    };
    Freezer.prototype.addStaticClasses = function () {
        var staticClasses = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            staticClasses[_i - 0] = arguments[_i];
        }
        this.staticClasses = staticClasses;
        var staticObjects = this.staticObjects;
        var uids = this.uids;
        for (var _a = 0, staticClasses_1 = staticClasses; _a < staticClasses_1.length; _a++) {
            var C = staticClasses_1[_a];
            this.constructors[C.name] = C;
            C.prototype.Tstringifier = C.prototype.Tstringifier || function () {
                this.id = this.id || uids.make('Fuf');
                staticObjects[this.id] = this;
                return { Fuf: this.id };
            };
        }
        return this;
    };
    Freezer.prototype.addStaticObjects = function () {
        var staticObjects = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            staticObjects[_i - 0] = arguments[_i];
        }
        for (var _a = 0, staticObjects_1 = staticObjects; _a < staticObjects_1.length; _a++) {
            var o = staticObjects_1[_a];
            var id = o.id || this.uids.make('Fuf');
            this.staticObjects[id] = o;
            o.Tstringifier = function () {
                return { Fuf: id };
            };
        }
        return this;
    };
    Freezer.prototype.addClassLookups = function () {
        var lookups = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            lookups[_i - 0] = arguments[_i];
        }
        this.constructorLookups = this.constructorLookups.concat(lookups);
        return this;
    };
    Freezer.voidFunction = function () { };
    Freezer.prototype.addIgnoredClasses = function () {
        var ignoredClasses = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ignoredClasses[_i - 0] = arguments[_i];
        }
        for (var _a = 0, ignoredClasses_1 = ignoredClasses; _a < ignoredClasses_1.length; _a++) {
            var C = ignoredClasses_1[_a];
            C.prototype.Tstringifier = Freezer.voidFunction;
        }
        return this;
    };
    Freezer.prototype.addIgnoredObjects = function () {
        var ignoredObjects = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            ignoredObjects[_i - 0] = arguments[_i];
        }
        for (var _a = 0, ignoredObjects_1 = ignoredObjects; _a < ignoredObjects_1.length; _a++) {
            var o = ignoredObjects_1[_a];
            o.Tstringifier = Freezer.voidFunction;
        }
        return this;
    };
    Freezer.prototype.freeze = function (model) {
        var Fclassed = [];
        var processed = {};
        var buf = [];
        var i = 0;
        var freezer = this;
        for (var _i = 0, _a = this.staticClasses; _i < _a.length; _i++) {
            var staticClass = _a[_i];
            if (staticClass.byId) {
                for (var k in staticClass.byId) {
                    this.staticObjects[k] = staticClass.byId[k];
                }
            }
        }
        var primitives = { String: true, Number: true, Boolean: true, Array: true };
        function stringifier(k, v) {
            if (v) {
                if (v.Tstringifier) {
                    return v.Tstringifier(); //For static and ignored files
                }
                else if (v.Tid) {
                    var Tid = v.Tid();
                    if (k != "") {
                        if (!processed[Tid]) {
                            buf.push(v);
                            processed[Tid] = true;
                        }
                        return { Fref: Tid };
                    }
                }
                var vcon = v.constructor;
                if (vcon && vcon.name != "Object") {
                    if (primitives[vcon.name]) {
                        return v;
                    }
                    else {
                        v.Fclass = vcon.name;
                        Fclassed.push(v);
                    }
                }
                return v;
            }
        }
        buf.push(model);
        var bits = [];
        while (buf.length > 0) {
            var a = buf.pop();
            var stringified = JSON.stringify(a, stringifier);
            bits.push(stringified);
        }
        for (var _b = 0, Fclassed_1 = Fclassed; _b < Fclassed_1.length; _b++) {
            var v = Fclassed_1[_b];
            delete v["Fclass"];
        }
        return "[" + bits.join(",") + "]";
    };
    Freezer.prototype.thaw = function (source) {
        var Ref = (function () {
            function Ref(parent, key, ref) {
                this.parent = parent;
                this.key = key;
                this.ref = ref;
            }
            return Ref;
        }());
        var staticObjects = this.staticObjects;
        var objectsWithIds = {};
        var references = [];
        var lookups = this.constructorLookups;
        var constructors = this.constructors;
        var list = JSON.parse(source, function (k, v) {
            if (k == 'id')
                objectsWithIds[v] = this;
            if (k == 'Fclass') {
                var proto = constructors[v];
                if (!proto) {
                    for (var _i = 0, lookups_1 = lookups; _i < lookups_1.length; _i++) {
                        var lc = lookups_1[_i];
                        proto = lc[v];
                        if (proto) {
                            constructors[v] = lc[v];
                            break;
                        }
                    }
                }
                if (proto)
                    this.__proto__ = proto.prototype;
                else {
                    console.log("ALERT: Don't know where to find class constructor for");
                    console.log(v);
                }
                return;
            }
            if (v != null) {
                if (v.Fref)
                    references.push(new Ref(this, k, v.Fref));
                if (v.Fuf) {
                    return staticObjects[v.Fuf];
                }
            }
            return v;
        });
        for (var _i = 0, references_1 = references; _i < references_1.length; _i++) {
            var ref = references_1[_i];
            ref.parent[ref.key] = objectsWithIds[ref.parent[ref.key].Fref];
        }
        return list[0];
    };
    return Freezer;
}());
function test() {
    var Fur = (function () {
        function Fur() {
        }
        return Fur;
    }());
    var Slick = (function (_super) {
        __extends(Slick, _super);
        function Slick() {
            _super.apply(this, arguments);
        }
        return Slick;
    }(Fur));
    var Fluffy = (function (_super) {
        __extends(Fluffy, _super);
        function Fluffy() {
            _super.apply(this, arguments);
        }
        return Fluffy;
    }(Fur));
    var GameObject = (function () {
        function GameObject(sprite) {
            this.sprite = sprite;
        }
        return GameObject;
    }());
    var Animal = (function () {
        function Animal(name) {
            this.name = name;
        }
        return Animal;
    }());
    var House = (function () {
        function House(list) {
            this.animals = [].concat(list);
        }
        return House;
    }());
    var dog = new Animal("dog");
    var cat = new Animal("cat");
    cat.birthday = new Date();
    var llama = new Animal("llama");
    log(cat.birthday.toJSON());
    log(new Date(cat.birthday.toJSON()));
    cat.fur = new Fluffy();
    dog.fur = new Slick();
    dog.likes = cat;
    cat.likes = llama;
    cat.go = new GameObject("cat.jpg");
    var house = new House([dog, cat, llama]);
    function meow() { log("meow"); }
    cat.screams = meow;
    var fridge = new Freezer()
        .addFreezableClasses(Animal, House)
        .addStaticClasses(Fur)
        .addStaticObjects(meow)
        .addIgnoredClasses(GameObject)
        .addClassLookups(this)
        .addIgnoredObjects(llama);
    var frozen = fridge.freeze(house);
    var thawed = fridge.thaw(frozen);
    thawed.animals[1].screams();
    log(thawed.animals[1].fur);
    log(house);
    log(frozen);
    log(thawed);
}
//test() 
//# sourceMappingURL=hammer.js.map