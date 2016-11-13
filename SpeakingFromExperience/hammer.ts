var log = console.log.bind(console)
var ownProp = {}.hasOwnProperty

function importProperties(obj, src) {
  for (var key in src)
    if (ownProp.call(src, key))
      obj[key] = src[key]
  return obj
}

class Uids {
  prefixes: { [key: string]: number } = {}

  static default = new Uids()

  make(prefix = '') {
    this.prefixes[prefix] = this.prefixes[prefix] || 0
    return prefix + " " + ++this.prefixes[prefix]
  }
}

class Graveyard<T> {
  deceased: T[] = []
  constructor(public type) {
  }
  bury(corpse: T) {
    this.deceased.push(corpse)
  }
  raise(): T {
    if (this.deceased.length)
      return this.deceased.pop()
    else
      return new this.type()
  }
}

class ChainLink<T> {
  prv: ChainLink<T>
  nxt: ChainLink<T>

  constructor(public value?: T) {
  }

  remove() {
    this.prv.nxt = this.nxt
    this.nxt.prv = this.prv
    return this
  }

  insertNodeBefore(node: ChainLink<T>) {
    node.nxt = this
    node.prv = this.prv
    this.prv.nxt = node
    this.prv = node
    return node
  }

  insertNodeAfter(node: ChainLink<T>) {
    node.prv = this
    node.nxt = this.nxt
    this.nxt.prv = node
    this.nxt = node
    return node
  }

  insertBefore(value: T) { return this.insertNodeBefore(new ChainLink(value)) }
  insertAfter(value: T) { return this.insertNodeAfter(new ChainLink(value)) }

  each(f: (t: T) => void) {
    var iter = this.nxt
    while (iter != this) {
      f(iter.value)
      iter = iter.nxt
    }
  }

  eachNode(f: (t: ChainLink<T>) => void) {
    var iter = this.nxt
    while (iter != this) {
      f(iter)
      iter = iter.nxt
    }
  }

  empty() { return this.nxt == this }
  purge() { this.nxt = this.prv = this }

  first() { return this.nxt }
  last() { return this.prv }

  pushNode: (l: ChainLink<T>) => ChainLink<T> = ChainLink.prototype.insertNodeBefore
  unshiftNode: (l: ChainLink<T>) => ChainLink<T> = ChainLink.prototype.insertNodeAfter

  push: (v: T) => ChainLink<T> = ChainLink.prototype.insertBefore
  unshift: (v: T) => ChainLink<T> = ChainLink.prototype.insertAfter

}

class Chain<T> extends ChainLink<T> {
  constructor() {
    super()
    this.nxt = this.prv = this
  }

  removeNode(node: ChainLink<T>) {
    return node.remove()
  }
}

class Channel {
  subs = new Chain<(any)>()

  subscribe(callback: (any) => void, parameters?: any) {
    var binding = this.subs.push(callback)
    if (parameters)
      importProperties(binding, parameters)
    return binding
  }

  static simpleEmitCallback(binding: ChainLink<any>) {
    binding.value.call(binding)
  }

  emit(parameters?: any) {
    if (parameters)
      this.subs.eachNode(function (binding) { binding.value.call(binding, parameters) })
    else
      this.subs.eachNode(Channel.simpleEmitCallback)
  }

  static doOnceAndRemove = function (...args) {
    this.TactualCallback(args)
    this.remove()
  }

  once(callback: (any) => void, parameters?: any) {
    (this.subscribe(Channel.doOnceAndRemove, parameters) as any).TactualCallback = callback
  }
}

class Channels {
  channel: { [key: string]: Channel } = {}

  on(event: string, callback: (any) => void, parameters?: any) {
    var relevant = this.channel[event] = (this.channel[event] || new Channel())
    relevant.subscribe(callback, parameters)
  }

  emit(event: string, parameters?: any) {
    var relevant = this.channel[event]
    if (relevant)
      relevant.emit(parameters)
  }

  once(event: string, callback: (any) => void, parameters?: any) {
    var relevant = this.channel[event]
    if (relevant)
      relevant.once(callback, parameters)
  }
}

class Freezer {
  constructors: { [key: string]: any } = {}
  staticObjects = []
  constructorLookups = []
  uids: Uids = Uids.default

  addFreezableClasses(...freezableClasses) {
    var uids = this.uids
    for (let C of freezableClasses) {
      this.constructors[C.name] = C
      C.prototype.Tid = C.prototype.Tid || function () {
        this.id = this.id || uids.make(C.name)
        return this.id
      }
    }
    return this
  }

  addStaticClasses(...staticClasses: Function[]) {
    var staticObjects = this.staticObjects
    var uids = this.uids
    for (let C of staticClasses) {
      C.prototype.Tstringifier = C.prototype.Tstringifier || function () {
        this.id = this.id || uids.make('Fuf')
        staticObjects[this.id] = this
        return { Fuf: this.id }
      }
    }
    return this
  }

  addStaticObjects(...staticObjects) {
    for (let o of staticObjects) {
      var id = o.id || this.uids.make('Fuf')
      this.staticObjects[id] = o
      o.Tstringifier = function () {
        return { Fuf: id }
      }
    }
    return this
  }

  addClassLookups(...lookups) {
    this.constructorLookups = this.constructorLookups.concat(lookups)
    return this
  }

  static voidFunction() { }

  addIgnoredClasses(...ignoredClasses: Function[]) {
    for (let C of ignoredClasses)
      C.prototype.Tstringifier = Freezer.voidFunction
    return this
  }

  addIgnoredObjects(...ignoredObjects) {
    for (let o of ignoredObjects)
      o.Tstringifier = Freezer.voidFunction
    return this
  }

  freeze(model: any): string {
    var Fclassed = []
    var processed = {}
    var buf = []

    var i = 0
    var freezer = this

    var primitives = { String: true, Number: true, Boolean: true, Array: true }

    function stringifier(k, v) {
      if (v) {
        if (v.Tstringifier) {
          return v.Tstringifier() //For static and ignored files
        } else if (v.Tid) {
          var Tid = v.Tid()
          if (k != "") {
            if (!processed[Tid]) {
              buf.push(v)
              processed[Tid] = true
            }
            return { Fref: Tid }
          }
        }

        var vcon = v.constructor
        if (vcon && vcon.name != "Object") {
          if (primitives[vcon.name]) {
            return v
          } else {
            v.Fclass = vcon.name
            Fclassed.push(v)
          }
        }

        return v
      }
    }

    buf.push(model)

    var bits = []

    while (buf.length > 0) {
      var a = buf.pop()
      var stringified = JSON.stringify(a, stringifier)
      bits.push(stringified)
    }

    for (var v of Fclassed)
      delete v["Fclass"]

    return "[" + bits.join(",") + "]"
  }


  thaw(source: string) {
    class Ref {
      constructor(public parent: any, public key: string, public ref: string) { }
    }

    var statics = this.staticObjects

    var objectsWithIds = {}
    var references: Ref[] = []
    var lookups = this.constructorLookups
    var constructors = this.constructors

    var list = JSON.parse(source, function (k: string, v) {
      if (k == 'id')
        objectsWithIds[v] = this
      if (k == 'Fclass') {
        var proto = constructors[v]
        if (!proto) {
          for (var lc of lookups) {
            proto = lc[v]
            if (proto) {
              constructors[v] = lc[v]
              break
            }
          }
        }
        if (proto)
          this.__proto__ = proto.prototype
        else {
          console.log("ALERT: Don't know where to find class constructor for")
          console.log(v)
        }
        return
      }
      if (v != null) {
        if (v.Fref)
          references.push(new Ref(this, k, v.Fref))
        if (v.Fuf)
          return statics[v.Fuf]
      }
      return v
    })

    for (let ref of references) {
      ref.parent[ref.key] = objectsWithIds[ref.parent[ref.key].Fref]
    }

    return list[0]
  }

}

function test() {
  class Fur {
  }

  class Slick extends Fur {
  }

  class Fluffy extends Fur {
  }

  class GameObject {
    constructor(public sprite: String) { }
  }

  class Animal {
    screams: () => any
    fur: Fur
    birthday: Date
    likes: Animal
    go: GameObject
    constructor(public name: string) { }
  }

  class House {
    animals: Animal[]
    constructor(list: Animal[]) {
      this.animals = [].concat(list)
    }
  }

  var dog = new Animal("dog")
  var cat = new Animal("cat")
  cat.birthday = new Date()
  var llama = new Animal("llama")

  log(cat.birthday.toJSON())
  log(new Date(cat.birthday.toJSON()))

  cat.fur = new Fluffy()
  dog.fur = new Slick()

  dog.likes = cat
  cat.likes = llama

  cat.go = new GameObject("cat.jpg")

  var house = new House([dog, cat, llama])

  function meow() { log("meow") }

  cat.screams = meow

  var fridge = new Freezer()
    .addFreezableClasses(Animal, House)
    .addStaticClasses(Fur)
    .addStaticObjects(meow)
    .addIgnoredClasses(GameObject)
    .addClassLookups(this)
    .addIgnoredObjects(llama)

  var frozen = fridge.freeze(house)

  var thawed: House = fridge.thaw(frozen)

  thawed.animals[1].screams()

  log(thawed.animals[1].fur)

  log(house)
  log(frozen)
  log(thawed)

}

//test()