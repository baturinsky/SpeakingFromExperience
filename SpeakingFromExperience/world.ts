var uids = Uids.default

m.route.mode = "hash"

var surnames: string[], names: string[][]

class Traited {

  traits: NumberMap = {}
  //traitList: [Trait, number][] = []
  signature: string

  constructor(traits?: any) {
    if (traits) {
      var traitWeightedList: WeightedList = new WeightedList(traits)
      this.traits = traitWeightedList.toMap()
      this.signature = traitWeightedList.signature
    }
  }

  eachTrait(callback: (t: Trait) => void) {
    for (let t in this.traits) {
      var trait = Trait.byId[t]
      assert(trait, "No trait named " + t)
      callback(trait)
    }
  }

  hasTrait(name: string) {
    return name in this.traits
  }

  hasTraits(traits: NumberMap): boolean {
    for (var t in traits) {
      if (!(t in this.traits))
        return false
    }
    return true
  }

  gainTrait(name: string, dif: number = 1) {
    if (this.traits[name])
      this.traits[name] += dif
    else
      this.traits[name] = dif
  }

  loseTrait(name: string, dif: number = Number.MAX_VALUE) {
    if (this.traits[name]) {
      this.traits[name] = Math.max(0, this.traits[name] - dif)
    }
  }
}

var traitPropertyNames = { improves: true, removes: true }

class Trait extends Traited {
  improves: Skill[]
  removes: Trait[]
  parents: Trait[] = []
  children: Trait[] = []
  static byId: { [key: string]: Trait } = {}

  constructor(public id: string, src, parent?: Trait) {
    super()
    Trait.byId[id] = this
    this.read(src, parent)
  }

  read(src, parent?: Trait) {

    if (parent) {
      if (this.parents.indexOf(parent) != -1)
        this.parents.push(parent)
      this.traits[parent.id] = 1
      importProperties(this.traits, parent.traits)
    }

    for (var k in src) {
      if (traitPropertyNames[k])
        this[k] = arrayify(src[k])
      else {
        var child: Trait
        if (Trait.byId[k])
          child = Trait.byId[k].read(src[k], this)
        else
          child = new Trait(k, src[k], this)
        this.children.push(child)
      }
    }
    return this
  }

  static parseList(traits: string | string[]): Trait[] {
    var traitsList = (typeof traits == "string") ? (traits as string).split(" ") : (traits as string[])
    var t: Trait[] = traitsList.map((id) => Trait.byId[id])
    return t
  }

  relatedPeople(): NumberMap {
    var related: NumberMap = {}
    for (var v in world.characters) {
      var i = world.characters[v].interests[this.id]
      if (i)
        related[v] = i
    }
    return related
  }

  relatedCommands(): NumberMap {
    var related: NumberMap = {}
    for (var v in Command.byId) {
      var i = Command.byId[v].related[this.id]
      if (i)
        related[v] = i
    }
    return related
  }

  validInterest(): boolean {
    return !this.traits["Amount"]
  }
}

class Item extends Traited {
  q: number
  id: string
  static withq = /^(-?\d+\.?\d*)(.*)$/

  constructor(src?: any, quantity: number = 1) {
    if (typeof src == "string") {
      var m = (<string>src).match(Item.withq)
      if (m) {
        src = m[2]
        quantity = Number(m[1])
      }
    }
    super(src)
    if (!src)
      return
    this.id = uids.make(src.toString())
    this.q = quantity
    var impliedTraits: NumberMap = {}
    this.eachTrait((trait) => {
      impliedTraits[trait.id] = this.traits[trait.id]
      if (trait.hasTrait("ItemType")) {
        for (let a in trait.traits) {
          if (a != "ItemType") {
            impliedTraits[a] = 1
          }
        }
      }
    })
    this.traits = impliedTraits
  }

  copy(): Item {
    var newItem = new Item()
    newItem.id = uids.make(this.signature)
    newItem.signature = this.signature
    newItem.traits = this.traits
    newItem.q = this.q
    return newItem
  }

  deepCopy(): Item {
    return new Item(this.signature)
  }

  toString() {
    return (this.q == 1 ? "" : this.q + " ") + this.signature
  }

}


class Character extends Traited {
  skill: NumberMap = {}
  hat: Item
  shirt: Item
  pants: Item
  boots: Item
  weapon: Item
  tool: Item
  id: string
  guests: Character[] = []
  relations: NumberMap = {}
  interests: NumberMap = {}
  known: NumberMap = {}

  items: Item[] = []

  describe() { log('I am a person!') }

  constructor(public name = "bob") {
    super()
    this.id = uids.make(abbreviateName(name))
    this.items = [new Item("Floor")]
  }

  availableCommands() {
    var available = []
    for (var skill in this.skill) {
      for (var command of Skill.byId[skill].commands)
        if (command.availableFor(this))
          available.push(command)
    }
    return available
  }

  receive(item: Item): number {
    for (let my of this.items) {
      if (my.signature == item.signature) {
        my.q += item.q
        return my.q
      }
    }
    this.items.push(item.copy())
    return item.q
  }

  lose(signature: string, q: number = 1): number {
    for (var i = 0; i < this.items.length; i++) {
      var my = this.items[i]
      if (my.signature == signature) {
        my.q -= q
        if (my.q <= 0)
          this.items.splice(i, 1)
        return my.q
      }
    }
    return null
  }

  sortedSkills(): [string, number][] {
    return valueSortedNumberMap(this.skill)
  }


  sortedTraits(): [string, number][] {
    return keySortedNumberMap(this.traits)
  }

  invite(other?: Character, dt: number = 0.1): Character {
    if (!other) {
      other = randomObjMember(world.characters)
    }
    if (this.guests.indexOf(other) != -1)
      return null

    world.advance(dt)

    this.guests.push(other)
    other.traits["Attention"] = 0.5

    return other
  }

  leave(from: Character = world.you) {
    from.guests.splice[from.guests.indexOf(this), 1]
  }

  train(skill: Skill, amount: number = 0.1) {
    this.skill[skill.id] += amount / (1 + this.skill[skill.id])
  }

  discussWithGuests(topic: string[], duration: number = 0.02) {
    glog("Discussed " + topic[1])
    for (var g of this.guests) {
      var speech = g.speakAbout(topic)

      speech.know()

      speech.affect(duration, this)
      for (var l of this.guests)
        speech.affect(duration, l)

      glog(speech)
    }
    this.guests = this.guests.filter((g) => {
      if (g.tired < g.attention)
        return true
      else {
        glog(g.name + " is tired and has left")
      }
    })
    world.advance(duration)
  }

  randomInterest(): string {
    return randomNumberMap(this.interests)
  }

  speakAbout(topic: string[]): Speech {
    var c: Comment
    var theme = topic[0]
    var detail = topic[1]
    var reply = ""
    var interesting = 0
    switch (theme) {
      case "person":
        var char = world.characters[detail]
        if (char == this) {
          var it: string = this.randomInterest()
          return new Speech(this, "interest", it, this)
        } else {
          var rel = this.relations[char.id] || 0
          if (rel > 0) {
            var commonInterests = mulNumberMap(this.interests, char.interests)
            var hisInterest = randomNumberMap(commonInterests)
            return new Speech(this, "interest", Trait.byId[hisInterest], char)
          } else {
            var hisSkill = randomNumberMap(char.skill)
            return new Speech(this, "skill", Skill.byId[hisSkill], char)
          }
        }
      case "item":
        var item = new Item(detail)
        var it = randomNumberMap(item.traits)
        return new Speech(this, "interest", item, this)
      case "command":
        var command = Command.byId[detail]
        if (randi() % 2 == 0) {
          var it = randomNumberMap(command.related)
          return new Speech(this, "interest", Trait.byId[it], this)
        } else {
          return this.speakAbout(["skill", command.skill.id])
        }
      case "skill":
        var skill = Skill.byId[detail]
        if (this.skill[detail] > 1) {
          if (this.traits["Interested"] > random() * 2 + 1) {
            return new Speech(this, "teachSkill", skill)
          } else {
            return new Speech(this, "skill", skill, this)
          }
        } else {
          var it = randomNumberMap(skill.related)
          return this.speakAbout(["trait", it])
        }
      case "trait":
        var t = Trait.byId[detail]
        assert(t, "No trait " + detail)
        var rp = t.relatedPeople()
        for (var pi in rp) {
          var other = world.characters[pi]
          if (other == this)
            rp[pi] *= 10
          else if (this.relations[pi] > 0)
            rp[pi] *= 10 * this.relations[pi]
        }
        var otheri = randomNumberMap(rp)
        if (otheri == this.id) {
          return new Speech(this, "interest", t, this)
        } else {
          return new Speech(this, "interest", t, world.characters[otheri])
        }
    }
  }

  knownSkills(): Skill[] {
    var a: Skill[] = []
    for (var i in this.skill) {
      if (this.known[i])
        a.push(Skill.byId[i])
    }
    return a
  }

  knownTraits(): string[] {
    var a: string[] = []
    for (var i in this.traits) {
      if (this.known[i])
        a.push(i)
    }
    return a
  }

  knownInterests(): string[] {
    var a: string[] = []
    for (var i in this.interests) {
      if (this.known[i])
        a.push(i)
    }
    return a
  }

  isMyGuest() {
    return world.you.guests.indexOf(this) >= 0
  }

  trait(name: string): number {
    return this.traits[name] || 0
  }

  get tired(): number {
    return this.traits["Tired"] || 0
  }

  get attention(): number {
    return this.traits["Attention"] || 0
  }

}

class Speech {
  constructor(public speaker: Character, public theme, public detail, public more?) {
    assert(detail)
  }

  toString() {
    return `${this.speaker.name} talked about ${this.theme} ${this.detail}${this.more ? " " + this.more:""}`
  }

  know() {
    log("know")
    log(this)
    switch (this.theme) {
      case "teachSkill":
        this.speaker.known[this.theme] = 1
        break
      case "interest":
      case "skill":
        this.more.known[this.detail.id || this.detail] = 1
        break
    }
  }

  affect(duration: number, listener: Character) {
    var speakerTired: number = duration
    var listenerTired: number = duration
    var listenerAttention: number = -duration
    var speaker = this.speaker
    switch (this.theme) {
      case "teachSkill":
        if (listener == world.you) {
          var skillId = this.detail.id
          var mySkill = speaker.skill[skillId] || 0
          var charSkill = listener.skill[skillId]
          speakerTired += (mySkill + charSkill) / 20
          listener.skill[skillId] += speaker.skill[skillId] / (1 + listener.skill[skillId]) * 0.1
        }
        break
      case "interest":
        var trait = this.detail
        listenerAttention += (listener.interests[trait] || 0) / 100
        break
      case "skill":
        var skillId = this.detail.id
        var speakerSkill = speaker.skill[skillId] || 0
        var listenerSkill = speaker.skill[skillId] || 0
        var combinedSkill = speakerSkill + listenerSkill
        listenerAttention += combinedSkill / 100
        if (speakerSkill > 0) {
          speaker.skill[skillId] += listenerSkill / 1000
          listener.skill[skillId] += speakerSkill / 1000
        }
        break
    }

    //log(duration, speakerTired, listenerTired)

    speaker.gainTrait("Tired", speakerTired)
    listener.gainTrait("Tired", listenerTired)

    listenerAttention -= listener.tired * duration

    listener.gainTrait("Attention", listenerAttention)

    /*if (speaker.traits["Tired"] >= speaker.traits["Attention"])
      speaker.leave()*/
  }

}

var nothing: Item

class World {
  you: Character
  characters: { [key: string]: Character } = {}
  time: number = 0

  gameLog = []
  commandLog = []
  char: Character

  constructor() {
    world = this

    this.you = new Character("Elder")
    this.you.skill = { Foraging: 1, Generic: 1, Speaking: 1, Conservation: 1, Cooking: 1, Gardening: 1 }
    this.you.traits = { Old: 10000000 }

    for (var pi in Profession.byId) {
      var profession = Profession.byId[pi]
      var gender = randi() % 2
      var name = randomName(gender) + " the " + profession.id
      var char = new Character(name)
      this.characters[char.id] = char
      for (var skill of profession.skills) {
        char.skill[skill.id] = randomInt(3, 10)
      }
      for (var skillId in Skill.byId) {
        if (randi() % 5 == 0)
          char.skill[skillId] = randomInt(1, 5)
      }
      for (var skillId in char.skill) {
        var skill = Skill.byId[skillId]
        addNumberMapTimes(char.interests, skill.related, char.skill[skillId])
      }
    }

    for (var charA in this.characters) {
      for (var charB in this.characters) {
        if (randi() % 5 == 0) {
          this.characters[charA].relations[charB] = randomInt(1, 10)
          this.characters[charB].relations[charA] = randomInt(1, 10)
        }
      }
    }

    var totalInterests: NumberMap = {}
    for (var charName in this.characters) {
      addNumberMap(totalInterests, this.characters[charName].interests)
    }
    //log(JSON.stringify(valueSortedNumberMap(totalInterests)))
    for (var charName in this.characters) {
      var char = this.characters[charName]
      for (var key in char.interests) {
        char.interests[key] = Math.round(100 * char.interests[key] / totalInterests[key])
      }
      //log(char.name)
      //log(JSON.stringify(valueSortedNumberMap(char.interests)))
    }

    this.you.invite()
    this.you.invite()

    /*
    for (var t in Trait.byId) {
      log(Trait.byId[t].id)
      log(JSON.stringify(valueSortedNumberMap(Trait.byId[t].relatedPeople())))
    }*/
  }

  advance(dt: number = 0.1) {
    this.time += dt

    this.you.gainTrait("Hungry", dt)
    this.you.gainTrait("Tired", dt)

    for (var cid in world.characters) {
      var c = world.characters[cid]
      if (c.isMyGuest()) {
        c.gainTrait("Tired", dt)
      } else {
        c.loseTrait("Tired", dt)
      }
    }

    if (random() < dt) {
      var char = world.you.invite(null, 0)
      if(char)
        glog(char.name + " comes with a visit")
    }
  }
}

class Profession {
  skills: Skill[] = []
  static byId: { [key: string]: Profession } = {}

  constructor(public id: string, src) {
    for (let skillName of src) {
      if (Skill.byId[skillName])
        this.skills.push(Skill.byId[skillName])
      else
        log(skillName + " is not a skill")
    }
    Profession.byId[id] = this
  }
}

class Skill {
  commands: Command[] = []
  related: NumberMap = {}
  static byId: { [key: string]: Skill } = {}

  constructor(public id: string, src) {
    Skill.byId[id] = this
    for (let k in src) {
      var cmd = new Command(k, this, src[k])
    }
    Skill.byId[id] = this
  }
}

class Primary {
  shortcut: string
  constructor(public id: string, src) {
    importProperties(this, src)
  }
}

enum CommandOutcome { Success, NeedTargets, NoTargets }

const CommandOutcomeText = [
  "Done",
  "select object:",
  "can't be done without any "
]

class CommandReply {
  constructor(public outcome: CommandOutcome, public details?: any) { }
}

class Command {
  makes: Item
  uses: NumberMap[]
  requires: NumberMap[]
  needs: NumberMap[]
  removes: NumberMap
  grants: NumberMap
  related: NumberMap = {}
  static byId: { [key: string]: Command } = {}

  constructor(public id, public skill: Skill, src) {
    if (src) {
      if ("makes" in src) {
        this.makes = new Item(src.makes)
        addNumberMap(this.related, this.makes.traits)
      }
      if ("uses" in src) {
        var uses: string[] = arrayify(src.uses)
        this.uses = uses.map((a) => new Traited(a).traits)
        for (var u of this.uses)
          addNumberMap(this.related, u)
      }
      if ("requires" in src) {
        var requires: string[] = arrayify(src.requires)
        this.requires = requires.map((a) => new Traited(a).traits)
        for (var u of this.requires)
          addNumberMap(this.related, u)
      }
      if ("removes" in src) {
        this.removes = newNumberMap(src.removes)
        addNumberMap(this.related, this.removes)
      }
      if ("grants" in src) {
        this.grants = newNumberMap(src.grants)
        addNumberMap(this.related, this.grants)
      }
    }

    for (var ri in this.related) {
      var trait = Trait.byId[ri]
      if (trait && !trait.validInterest())
        delete this.related[ri]
    }

    this.needs = (this.uses || []).concat(this.requires || [])
    Command.byId[id] = this
    skill.commands.push(this)
    addNumberMap(skill.related, this.related)
  }

  execute(char: Character, subjects: string[] = []): CommandReply {
    if (this.needs.length > 0) {
      if (subjects.length < this.needs.length) {
        var requiredSubjectsIndex = subjects.length
        var requiredSubjects: NumberMap = this.needs[requiredSubjectsIndex]
        var possibleTargets: Item[] = char.items.filter((item) => (item.hasTraits(requiredSubjects)))
        if (possibleTargets.length > 0)
          return new CommandReply(CommandOutcome.NeedTargets, possibleTargets)
        else
          return new CommandReply(CommandOutcome.NoTargets, requiredSubjects)
      } else {
        for (var i = 0; i < subjects.length; i++) {
          var subjectSignature = subjects[i]
          if (this.uses && i < this.uses.length) {
            var nowHave = char.lose(subjectSignature)
            glog(`Used 1 of ${subjectSignature}, remaining with ${nowHave}`)
          } else {
            glog(`Used ${subjectSignature}`)
          }
        }
      }
    }

    if (this.id == "Rest") {
      world.advance(0.5)
    }

    if (this.makes) {
      var nowHave = char.receive(this.makes)
      if (char == world.you)
        glog(`Made ${this.makes.signature}. You now have ${nowHave}`)
    }

    if (this.removes)
      for (var t in this.removes)
        char.loseTrait(t, this.removes[t])

    if (this.grants)
      for (var t in this.grants)
        char.gainTrait(t, this.grants[t])

    var skill = this.skillFor(char)

    world.advance(1 / (10 + skill))
    char.train(this.skill)

    char.discussWithGuests(["command", this.id])

    return new CommandReply(CommandOutcome.Success)
  }

  skillFor(char: Character): number {
    return char.skill[this.skill.id]
  }

  tooltip(char: Character) {
    return this.id
  }

  availableFor(char: Character): boolean {
    return char.skill[this.skill.id] >= 1
  }
}

function parseUniverse(src) {
  for (let k in src.Primaries)
    new Primary(k, src.Primaries[k])

  for (let k in src.Traits)
    new Trait(k, src.Traits[k])

  for (let k in src.Skills) {
    var skill = new Skill(k, src.Skills[k])
  }

  for (let k in src.Professions)
    new Profession(k, src.Professions[k])

  for (let k in src.Categories)
    category[k] = new WeightedList(src.Categories[k])

  surnames = src.surnames.split(' ').map(capitalize)
  names = [src.maleNames.split(' ').map(capitalize), src.femaleNames.split(' ').map(capitalize)]

  nothing = new Item("Nothing")
}

function randomName(gender: number = -1) {
  if (gender == -1)
    gender = randi() % 2
  var name: string = randomMember(names[gender]) + " " + randomMember(surnames)
  return name
}

var category: { [key: string]: WeightedList } = {}

var world: World

var freezer = new Freezer()
  .addFreezableClasses(World, Character, Item, Speech)
  .addStaticClasses(Profession, Skill, Trait, Primary, Command)