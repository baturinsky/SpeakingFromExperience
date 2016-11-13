var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var uids = Uids.default;
m.route.mode = "hash";
var surnames, names;
var Traited = (function () {
    function Traited(traits) {
        this.traits = {};
        if (traits) {
            var traitWeightedList = new WeightedList(traits);
            this.traits = traitWeightedList.toMap();
            this.signature = traitWeightedList.signature;
        }
    }
    Traited.prototype.eachTrait = function (callback) {
        for (var t in this.traits) {
            var trait = Trait.byId[t];
            assert(trait, "No trait named " + t);
            callback(trait);
        }
    };
    Traited.prototype.hasTrait = function (name) {
        return name in this.traits;
    };
    Traited.prototype.hasTraits = function (traits) {
        for (var t in traits) {
            if (!(t in this.traits))
                return false;
        }
        return true;
    };
    Traited.prototype.gainTrait = function (name, dif) {
        if (dif === void 0) { dif = 1; }
        if (this.traits[name])
            this.traits[name] += dif;
        else
            this.traits[name] = dif;
    };
    Traited.prototype.loseTrait = function (name, dif) {
        if (dif === void 0) { dif = Number.MAX_VALUE; }
        if (this.traits[name]) {
            this.traits[name] = Math.max(0, this.traits[name] - dif);
        }
    };
    return Traited;
}());
var traitPropertyNames = { improves: true, removes: true };
var Trait = (function (_super) {
    __extends(Trait, _super);
    function Trait(id, src, parent) {
        _super.call(this);
        this.id = id;
        this.parents = [];
        this.children = [];
        Trait.byId[id] = this;
        this.read(src, parent);
    }
    Trait.prototype.read = function (src, parent) {
        if (parent) {
            if (this.parents.indexOf(parent) != -1)
                this.parents.push(parent);
            this.traits[parent.id] = 1;
            importProperties(this.traits, parent.traits);
        }
        for (var k in src) {
            if (traitPropertyNames[k])
                this[k] = arrayify(src[k]);
            else {
                var child;
                if (Trait.byId[k])
                    child = Trait.byId[k].read(src[k], this);
                else
                    child = new Trait(k, src[k], this);
                this.children.push(child);
            }
        }
        return this;
    };
    Trait.parseList = function (traits) {
        var traitsList = (typeof traits == "string") ? traits.split(" ") : traits;
        var t = traitsList.map(function (id) { return Trait.byId[id]; });
        return t;
    };
    Trait.prototype.relatedPeople = function () {
        var related = {};
        for (var v in world.characters) {
            var i = world.characters[v].interests[this.id];
            if (i)
                related[v] = i;
        }
        return related;
    };
    Trait.prototype.relatedCommands = function () {
        var related = {};
        for (var v in Command.byId) {
            var i = Command.byId[v].related[this.id];
            if (i)
                related[v] = i;
        }
        return related;
    };
    Trait.prototype.validInterest = function () {
        return !this.traits["Amount"];
    };
    Trait.byId = {};
    return Trait;
}(Traited));
var Item = (function (_super) {
    __extends(Item, _super);
    function Item(src, quantity) {
        var _this = this;
        if (quantity === void 0) { quantity = 1; }
        if (typeof src == "string") {
            var m = src.match(Item.withq);
            if (m) {
                src = m[2];
                quantity = Number(m[1]);
            }
        }
        _super.call(this, src);
        if (!src)
            return;
        this.id = uids.make(src.toString());
        this.q = quantity;
        var impliedTraits = {};
        this.eachTrait(function (trait) {
            impliedTraits[trait.id] = _this.traits[trait.id];
            if (trait.hasTrait("ItemType")) {
                for (var a in trait.traits) {
                    if (a != "ItemType") {
                        impliedTraits[a] = 1;
                    }
                }
            }
        });
        this.traits = impliedTraits;
    }
    Item.prototype.copy = function () {
        var newItem = new Item();
        newItem.id = uids.make(this.signature);
        newItem.signature = this.signature;
        newItem.traits = this.traits;
        newItem.q = this.q;
        return newItem;
    };
    Item.prototype.deepCopy = function () {
        return new Item(this.signature);
    };
    Item.prototype.toString = function () {
        return (this.q == 1 ? "" : this.q + " ") + this.signature;
    };
    Item.withq = /^(-?\d+\.?\d*)(.*)$/;
    return Item;
}(Traited));
var Character = (function (_super) {
    __extends(Character, _super);
    function Character(name) {
        if (name === void 0) { name = "bob"; }
        _super.call(this);
        this.name = name;
        this.skill = {};
        this.guests = [];
        this.relations = {};
        this.interests = {};
        this.known = {};
        this.items = [];
        this.id = uids.make(abbreviateName(name));
        this.items = [new Item("Floor")];
    }
    Character.prototype.describe = function () { log('I am a person!'); };
    Character.prototype.availableCommands = function () {
        var available = [];
        for (var skill in this.skill) {
            for (var _i = 0, _a = Skill.byId[skill].commands; _i < _a.length; _i++) {
                var command = _a[_i];
                if (command.availableFor(this))
                    available.push(command);
            }
        }
        return available;
    };
    Character.prototype.receive = function (item) {
        for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
            var my = _a[_i];
            if (my.signature == item.signature) {
                my.q += item.q;
                return my.q;
            }
        }
        this.items.push(item.copy());
        return item.q;
    };
    Character.prototype.lose = function (signature, q) {
        if (q === void 0) { q = 1; }
        for (var i = 0; i < this.items.length; i++) {
            var my = this.items[i];
            if (my.signature == signature) {
                my.q -= q;
                if (my.q <= 0)
                    this.items.splice(i, 1);
                return my.q;
            }
        }
        return null;
    };
    Character.prototype.sortedSkills = function () {
        return valueSortedNumberMap(this.skill);
    };
    Character.prototype.sortedTraits = function () {
        return keySortedNumberMap(this.traits);
    };
    Character.prototype.invite = function (other, dt) {
        if (dt === void 0) { dt = 0.1; }
        if (!other) {
            other = randomObjMember(world.characters);
        }
        if (this.guests.indexOf(other) != -1)
            return null;
        world.advance(dt);
        this.guests.push(other);
        other.traits["Attention"] = 0.5;
        return other;
    };
    Character.prototype.leave = function (from) {
        if (from === void 0) { from = world.you; }
        from.guests.splice[from.guests.indexOf(this), 1];
    };
    Character.prototype.train = function (skill, amount) {
        if (amount === void 0) { amount = 0.1; }
        this.skill[skill.id] += amount / (1 + this.skill[skill.id]);
    };
    Character.prototype.discussWithGuests = function (topic, duration) {
        if (duration === void 0) { duration = 0.02; }
        glog("Discussed " + topic[1]);
        for (var _i = 0, _a = this.guests; _i < _a.length; _i++) {
            var g = _a[_i];
            var speech = g.speakAbout(topic);
            speech.know();
            speech.affect(duration, this);
            for (var _b = 0, _c = this.guests; _b < _c.length; _b++) {
                var l = _c[_b];
                speech.affect(duration, l);
            }
            glog(speech);
        }
        this.guests = this.guests.filter(function (g) {
            if (g.tired < g.attention)
                return true;
            else {
                glog(g.name + " is tired and has left");
            }
        });
        world.advance(duration);
    };
    Character.prototype.randomInterest = function () {
        return randomNumberMap(this.interests);
    };
    Character.prototype.speakAbout = function (topic) {
        var c;
        var theme = topic[0];
        var detail = topic[1];
        var reply = "";
        var interesting = 0;
        switch (theme) {
            case "person":
                var char = world.characters[detail];
                if (char == this) {
                    var it = this.randomInterest();
                    return new Speech(this, "interest", it, this);
                }
                else {
                    var rel = this.relations[char.id] || 0;
                    if (rel > 0) {
                        var commonInterests = mulNumberMap(this.interests, char.interests);
                        var hisInterest = randomNumberMap(commonInterests);
                        return new Speech(this, "interest", Trait.byId[hisInterest], char);
                    }
                    else {
                        var hisSkill = randomNumberMap(char.skill);
                        return new Speech(this, "skill", Skill.byId[hisSkill], char);
                    }
                }
            case "item":
                var item = new Item(detail);
                var it = randomNumberMap(item.traits);
                return new Speech(this, "interest", item, this);
            case "command":
                var command = Command.byId[detail];
                if (randi() % 2 == 0) {
                    var it = randomNumberMap(command.related);
                    return new Speech(this, "interest", Trait.byId[it], this);
                }
                else {
                    return this.speakAbout(["skill", command.skill.id]);
                }
            case "skill":
                var skill = Skill.byId[detail];
                if (this.skill[detail] > 1) {
                    if (this.traits["Interested"] > random() * 2 + 1) {
                        return new Speech(this, "teachSkill", skill);
                    }
                    else {
                        return new Speech(this, "skill", skill, this);
                    }
                }
                else {
                    var it = randomNumberMap(skill.related);
                    return this.speakAbout(["trait", it]);
                }
            case "trait":
                var t = Trait.byId[detail];
                assert(t, "No trait " + detail);
                var rp = t.relatedPeople();
                for (var pi in rp) {
                    var other = world.characters[pi];
                    if (other == this)
                        rp[pi] *= 10;
                    else if (this.relations[pi] > 0)
                        rp[pi] *= 10 * this.relations[pi];
                }
                var otheri = randomNumberMap(rp);
                if (otheri == this.id) {
                    return new Speech(this, "interest", t, this);
                }
                else {
                    return new Speech(this, "interest", t, world.characters[otheri]);
                }
        }
    };
    Character.prototype.knownSkills = function () {
        var a = [];
        for (var i in this.skill) {
            if (this.known[i])
                a.push(Skill.byId[i]);
        }
        return a;
    };
    Character.prototype.knownTraits = function () {
        var a = [];
        for (var i in this.traits) {
            if (this.known[i])
                a.push(i);
        }
        return a;
    };
    Character.prototype.knownInterests = function () {
        var a = [];
        for (var i in this.interests) {
            if (this.known[i])
                a.push(i);
        }
        return a;
    };
    Character.prototype.isMyGuest = function () {
        return world.you.guests.indexOf(this) >= 0;
    };
    Character.prototype.trait = function (name) {
        return this.traits[name] || 0;
    };
    Object.defineProperty(Character.prototype, "tired", {
        get: function () {
            return this.traits["Tired"] || 0;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Character.prototype, "attention", {
        get: function () {
            return this.traits["Attention"] || 0;
        },
        enumerable: true,
        configurable: true
    });
    return Character;
}(Traited));
var Speech = (function () {
    function Speech(speaker, theme, detail, more) {
        this.speaker = speaker;
        this.theme = theme;
        this.detail = detail;
        this.more = more;
        assert(detail);
    }
    Speech.prototype.toString = function () {
        return this.speaker.name + " talked about " + this.theme + " " + this.detail + (this.more ? " " + this.more : "");
    };
    Speech.prototype.know = function () {
        log("know");
        log(this);
        switch (this.theme) {
            case "teachSkill":
                this.speaker.known[this.theme] = 1;
                break;
            case "interest":
            case "skill":
                this.more.known[this.detail.id || this.detail] = 1;
                break;
        }
    };
    Speech.prototype.affect = function (duration, listener) {
        var speakerTired = duration;
        var listenerTired = duration;
        var listenerAttention = -duration;
        var speaker = this.speaker;
        switch (this.theme) {
            case "teachSkill":
                if (listener == world.you) {
                    var skillId = this.detail.id;
                    var mySkill = speaker.skill[skillId] || 0;
                    var charSkill = listener.skill[skillId];
                    speakerTired += (mySkill + charSkill) / 20;
                    listener.skill[skillId] += speaker.skill[skillId] / (1 + listener.skill[skillId]) * 0.1;
                }
                break;
            case "interest":
                var trait = this.detail;
                listenerAttention += (listener.interests[trait] || 0) / 100;
                break;
            case "skill":
                var skillId = this.detail.id;
                var speakerSkill = speaker.skill[skillId] || 0;
                var listenerSkill = speaker.skill[skillId] || 0;
                var combinedSkill = speakerSkill + listenerSkill;
                listenerAttention += combinedSkill / 100;
                if (speakerSkill > 0) {
                    speaker.skill[skillId] += listenerSkill / 1000;
                    listener.skill[skillId] += speakerSkill / 1000;
                }
                break;
        }
        //log(duration, speakerTired, listenerTired)
        speaker.gainTrait("Tired", speakerTired);
        listener.gainTrait("Tired", listenerTired);
        listenerAttention -= listener.tired * duration;
        listener.gainTrait("Attention", listenerAttention);
        /*if (speaker.traits["Tired"] >= speaker.traits["Attention"])
          speaker.leave()*/
    };
    return Speech;
}());
var nothing;
var World = (function () {
    function World() {
        this.characters = {};
        this.time = 0;
        this.gameLog = [];
        this.commandLog = [];
        world = this;
        this.you = new Character("Elder");
        this.you.skill = { Foraging: 1, Generic: 1, Speaking: 1, Conservation: 1, Cooking: 1, Gardening: 1 };
        this.you.traits = { Old: 10000000 };
        for (var pi in Profession.byId) {
            var profession = Profession.byId[pi];
            var gender = randi() % 2;
            var name = randomName(gender) + " the " + profession.id;
            var char = new Character(name);
            this.characters[char.id] = char;
            for (var _i = 0, _a = profession.skills; _i < _a.length; _i++) {
                var skill = _a[_i];
                char.skill[skill.id] = randomInt(3, 10);
            }
            for (var skillId in Skill.byId) {
                if (randi() % 5 == 0)
                    char.skill[skillId] = randomInt(1, 5);
            }
            for (var skillId in char.skill) {
                var skill = Skill.byId[skillId];
                addNumberMapTimes(char.interests, skill.related, char.skill[skillId]);
            }
        }
        for (var charA in this.characters) {
            for (var charB in this.characters) {
                if (randi() % 5 == 0) {
                    this.characters[charA].relations[charB] = randomInt(1, 10);
                    this.characters[charB].relations[charA] = randomInt(1, 10);
                }
            }
        }
        var totalInterests = {};
        for (var charName in this.characters) {
            addNumberMap(totalInterests, this.characters[charName].interests);
        }
        //log(JSON.stringify(valueSortedNumberMap(totalInterests)))
        for (var charName in this.characters) {
            var char = this.characters[charName];
            for (var key in char.interests) {
                char.interests[key] = Math.round(100 * char.interests[key] / totalInterests[key]);
            }
        }
        this.you.invite();
        this.you.invite();
        /*
        for (var t in Trait.byId) {
          log(Trait.byId[t].id)
          log(JSON.stringify(valueSortedNumberMap(Trait.byId[t].relatedPeople())))
        }*/
    }
    World.prototype.advance = function (dt) {
        if (dt === void 0) { dt = 0.1; }
        this.time += dt;
        this.you.gainTrait("Hungry", dt);
        this.you.gainTrait("Tired", dt);
        for (var cid in world.characters) {
            var c = world.characters[cid];
            if (c.isMyGuest()) {
                c.gainTrait("Tired", dt);
            }
            else {
                c.loseTrait("Tired", dt);
            }
        }
        if (random() < dt) {
            var char = world.you.invite(null, 0);
            if (char)
                glog(char.name + " comes with a visit");
        }
    };
    return World;
}());
var Profession = (function () {
    function Profession(id, src) {
        this.id = id;
        this.skills = [];
        for (var _i = 0, src_1 = src; _i < src_1.length; _i++) {
            var skillName = src_1[_i];
            if (Skill.byId[skillName])
                this.skills.push(Skill.byId[skillName]);
            else
                log(skillName + " is not a skill");
        }
        Profession.byId[id] = this;
    }
    Profession.byId = {};
    return Profession;
}());
var Skill = (function () {
    function Skill(id, src) {
        this.id = id;
        this.commands = [];
        this.related = {};
        Skill.byId[id] = this;
        for (var k in src) {
            var cmd = new Command(k, this, src[k]);
        }
        Skill.byId[id] = this;
    }
    Skill.byId = {};
    return Skill;
}());
var Primary = (function () {
    function Primary(id, src) {
        this.id = id;
        importProperties(this, src);
    }
    return Primary;
}());
var CommandOutcome;
(function (CommandOutcome) {
    CommandOutcome[CommandOutcome["Success"] = 0] = "Success";
    CommandOutcome[CommandOutcome["NeedTargets"] = 1] = "NeedTargets";
    CommandOutcome[CommandOutcome["NoTargets"] = 2] = "NoTargets";
})(CommandOutcome || (CommandOutcome = {}));
var CommandOutcomeText = [
    "Done",
    "select object:",
    "can't be done without any "
];
var CommandReply = (function () {
    function CommandReply(outcome, details) {
        this.outcome = outcome;
        this.details = details;
    }
    return CommandReply;
}());
var Command = (function () {
    function Command(id, skill, src) {
        this.id = id;
        this.skill = skill;
        this.related = {};
        if (src) {
            if ("makes" in src) {
                this.makes = new Item(src.makes);
                addNumberMap(this.related, this.makes.traits);
            }
            if ("uses" in src) {
                var uses = arrayify(src.uses);
                this.uses = uses.map(function (a) { return new Traited(a).traits; });
                for (var _i = 0, _a = this.uses; _i < _a.length; _i++) {
                    var u = _a[_i];
                    addNumberMap(this.related, u);
                }
            }
            if ("requires" in src) {
                var requires = arrayify(src.requires);
                this.requires = requires.map(function (a) { return new Traited(a).traits; });
                for (var _b = 0, _c = this.requires; _b < _c.length; _b++) {
                    var u = _c[_b];
                    addNumberMap(this.related, u);
                }
            }
            if ("removes" in src) {
                this.removes = newNumberMap(src.removes);
                addNumberMap(this.related, this.removes);
            }
            if ("grants" in src) {
                this.grants = newNumberMap(src.grants);
                addNumberMap(this.related, this.grants);
            }
        }
        for (var ri in this.related) {
            var trait = Trait.byId[ri];
            if (trait && !trait.validInterest())
                delete this.related[ri];
        }
        this.needs = (this.uses || []).concat(this.requires || []);
        Command.byId[id] = this;
        skill.commands.push(this);
        addNumberMap(skill.related, this.related);
    }
    Command.prototype.execute = function (char, subjects) {
        if (subjects === void 0) { subjects = []; }
        if (this.needs.length > 0) {
            if (subjects.length < this.needs.length) {
                var requiredSubjectsIndex = subjects.length;
                var requiredSubjects = this.needs[requiredSubjectsIndex];
                var possibleTargets = char.items.filter(function (item) { return (item.hasTraits(requiredSubjects)); });
                if (possibleTargets.length > 0)
                    return new CommandReply(CommandOutcome.NeedTargets, possibleTargets);
                else
                    return new CommandReply(CommandOutcome.NoTargets, requiredSubjects);
            }
            else {
                for (var i = 0; i < subjects.length; i++) {
                    var subjectSignature = subjects[i];
                    if (this.uses && i < this.uses.length) {
                        var nowHave = char.lose(subjectSignature);
                        glog("Used 1 of " + subjectSignature + ", remaining with " + nowHave);
                    }
                    else {
                        glog("Used " + subjectSignature);
                    }
                }
            }
        }
        if (this.id == "Rest") {
            world.advance(0.5);
        }
        if (this.makes) {
            var nowHave = char.receive(this.makes);
            if (char == world.you)
                glog("Made " + this.makes.signature + ". You now have " + nowHave);
        }
        if (this.removes)
            for (var t in this.removes)
                char.loseTrait(t, this.removes[t]);
        if (this.grants)
            for (var t in this.grants)
                char.gainTrait(t, this.grants[t]);
        var skill = this.skillFor(char);
        world.advance(1 / (10 + skill));
        char.train(this.skill);
        char.discussWithGuests(["command", this.id]);
        return new CommandReply(CommandOutcome.Success);
    };
    Command.prototype.skillFor = function (char) {
        return char.skill[this.skill.id];
    };
    Command.prototype.tooltip = function (char) {
        return this.id;
    };
    Command.prototype.availableFor = function (char) {
        return char.skill[this.skill.id] >= 1;
    };
    Command.byId = {};
    return Command;
}());
function parseUniverse(src) {
    for (var k in src.Primaries)
        new Primary(k, src.Primaries[k]);
    for (var k in src.Traits)
        new Trait(k, src.Traits[k]);
    for (var k in src.Skills) {
        var skill = new Skill(k, src.Skills[k]);
    }
    for (var k in src.Professions)
        new Profession(k, src.Professions[k]);
    for (var k in src.Categories)
        category[k] = new WeightedList(src.Categories[k]);
    surnames = src.surnames.split(' ').map(capitalize);
    names = [src.maleNames.split(' ').map(capitalize), src.femaleNames.split(' ').map(capitalize)];
    nothing = new Item("Nothing");
}
function randomName(gender) {
    if (gender === void 0) { gender = -1; }
    if (gender == -1)
        gender = randi() % 2;
    var name = randomMember(names[gender]) + " " + randomMember(surnames);
    return name;
}
var category = {};
var world;
var freezer = new Freezer()
    .addFreezableClasses(World, Character, Item, Speech)
    .addStaticClasses(Profession, Skill, Trait, Primary, Command);
//# sourceMappingURL=world.js.map