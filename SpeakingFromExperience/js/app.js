function glog(s) {
    world.gameLog.push([world.time, s]);
    world.commandLog.push(s);
    log(s);
    if (world.gameLog.length > 100) {
        world.gameLog = world.gameLog.splice(10);
    }
}
function resetWorld() {
    world = new World();
    world.char = world.you;
    saveWorld();
}
function saveWorld(slot) {
    if (slot === void 0) { slot = 0; }
    var worldString = freezer.freeze(world);
    var paked = pako.deflate(worldString, { to: 'string' });
    if (slot != 0) {
        glog("Saved to slot " + slot + ", size " + dot2(paked.length / 1024) + " kbytes");
    }
    localStorage["elder" + slot] = paked;
    localStorage["elderName" + slot] = world.you.name + " " + new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString();
}
function loadWorld(slot) {
    if (slot === void 0) { slot = 0; }
    var paked = localStorage["elder" + slot];
    if (paked) {
        var worldString = pako.inflate(paked, { to: 'string' });
        world = freezer.thaw(worldString);
        world.char = world.you;
        log(world);
        return true;
    }
    return false;
}
function onRedraw(element, isInit, context) {
}
var commandReply;
var executedCommand;
var executedCommandArguments;
function onPageClick(e) {
    var commandString = e.target.href + "";
    var args = commandString.substr(commandString.indexOf("#") + 2).split("/");
    switch (args[0]) {
        case "cmd":
            executedCommand = Command.byId[args[1]];
            executedCommandArguments = args.splice(2);
            world.commandLog = [];
            commandReply = executedCommand.execute(world.char, executedCommandArguments);
            saveWorld();
            break;
        case "discuss":
            world.commandLog = [];
            var discussionTopic = args.splice(1);
            world.char.discussWithGuests(discussionTopic);
            break;
        case "invite":
            world.commandLog = [];
            world.char.invite(world.characters[args[1]]);
            break;
        case "save":
            saveWorld(Number(args[1]));
            break;
        case "load":
            loadWorld(Number(args[1]));
            break;
        case "new":
            resetWorld();
            break;
    }
    m.route(m.route());
}
function mPage() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i - 0] = arguments[_i];
    }
    return m("div", { config: onRedraw, onclick: onPageClick }, m("table[width=100%]", m("thead", m("tr", m("td[width=66%]", m("input.subtleInput.xxlarge", bindPropWithAttr(world.you, "name"))), m("td.right", putInBetweens(["main", "skills", "items", "people", "menu"].map(function (page) { return m("a[href='#/page/" + page + "']", capitalize(page)); }), m("span.faint", " | "))))), m("tr", m("td", m.apply(null, ["div"].concat(joinArrays(args)))), m("td.log.right", m("div.log", world.gameLog.map(function (s) { return m("div", toM(s[1])); }))))));
}
function stickSeparated(args) {
    return putInBetweens(args, m("span.faint", " | "));
}
function mCommandLinks(commands, tip) {
    if (tip === void 0) { tip = function (command) { return "No comments"; }; }
    var stuff = stickSeparated(commands.map(function (command) { return m("a.tooltip.fade", { href: "#/cmd/" + command, "data-title": tip(command) }, command); }));
    return m("span", stuff);
}
function mCharCommandLinks(char) {
    return mCommandLinks(char.availableCommands().map(function (c) { return c.id; }), function (name) { return Command.byId[name].tooltip(char); });
}
function href(ref, text, tip) {
    if (tip)
        return m("a.tooltip.fade", { href: ref, "data-title": tip }, text);
    else
        return m("a", { href: ref }, text);
}
function charRef(c) {
    return href("#/discuss/person/" + c.id, c.name, "click to discuss " + c.name);
}
function commandRef(c) {
    return href("#/discuss/command/" + c.id, c.id, "click to discuss " + c.id);
}
function skillRef(s, v) {
    var sid = (s instanceof Skill) ? s.id : s;
    return href("#/discuss/skill/" + sid, sid + (v ? (": " + dot2(v)) : ""), "click to discuss " + sid);
}
function itemRef(i) {
    var its = i.toString();
    return href("#/discuss/item/" + its, its, "click to discuss " + its);
}
function traitRef(tid, v) {
    return href("#/discuss/trait/" + tid, tid + (v ? (": " + dot2(v)) : ""), "click to discuss " + tid);
}
function smartRef(something) {
    if (something instanceof Item)
        return itemRef(something);
    if (something instanceof Character)
        return charRef(something);
    if (something instanceof Command)
        return commandRef(something);
    if (something instanceof Skill)
        return skillRef(something);
    if (something instanceof Trait)
        return traitRef(something.id);
    if (typeof something === "string")
        return traitRef(something);
}
function toM(a) {
    if (typeof a === "string")
        return m("span", a);
    if (a instanceof Speech) {
        var s = a;
        var tail = [];
        switch (s.theme) {
            case "interest":
                if (s.more == s.speaker)
                    tail = [charRef(s.speaker), " likes ", smartRef(s.detail)];
                else
                    tail = [charRef(s.speaker), " says ", smartRef(s.more), " likes ", smartRef(s.detail)];
                break;
            case "skill":
                if (s.more == s.speaker)
                    tail = [charRef(s.speaker), " talks about ", smartRef(s.detail)];
                else
                    tail = [charRef(s.speaker), " says ", smartRef(s.more), " knows ", smartRef(s.detail)];
                break;
            case "teachSkill":
                tail = [charRef(s.speaker), " teaches you some ", smartRef(s.detail)];
                break;
            case "bored":
                tail = [charRef(s.speaker), " is bored with this theme"];
                break;
        }
        return m("span", tail);
    }
    if (a instanceof ActionMemory) {
        var am = a;
        switch (am.mode) {
            case "discuss":
                return m("span", "Discussed ", href("#/discuss/" + am.details[0] + "/" + am.details[1], am.details[1], "click to discuss " + am.details[1]));
            case "command":
                var params = [m("span", "Used "), commandRef(Command.byId[am.details[0]])];
                if (am.details.length > 1) {
                    params = params.concat([span(" with ")], putInBetweens(am.details.slice(1).map(function (d) { return itemRef(new Item(d)); }), ", "));
                }
                return m("span", params);
        }
    }
    return m("span", a.toString());
}
function peopleTable(people, local) {
    if (local === void 0) { local = true; }
    var guestTable = people.sort(function (a, b) { return (a.name > b.name ? 1 : -1); }).map(function (c) {
        var td = [m("td", charRef(c))];
        if (local)
            td.push(m("td", dot3(c.traits["Attention"] || 0)), m("td", dot3(c.traits["Tired"] || 0)));
        td.push(m("td", stickSeparated(c.knownSkills().map(function (s) { return skillRef(s); }))), m("td", stickSeparated(c.knownInterests().map(function (t) { return traitRef(t); }))));
        if (!local) {
            if (c.isMyGuest())
                td.push(m("td", "here"));
            else if (c.tired)
                td.push(m("td", "Tired: " + dot2(c.tired)));
            else
                td.push(m("td", (m("a", { href: "#/invite/" + c.id }, "invite"))));
        }
        return m("tr", td);
    });
    if (local)
        guestTable.unshift(m("tr", m("td", "Guest"), m("td", "Attention"), m("td", "Tiredness"), m("td", "Known skills"), m("td", "Known interests")));
    else
        guestTable.unshift(m("tr", m("td", "Person"), m("td", "Known skills"), m("td", "Known interests")));
    return m("table.people", guestTable);
}
var pageCommand = {
    view: function () {
        var guestTable;
        if (world.char.guests.length > 0)
            guestTable = peopleTable(world.char.guests);
        else
            guestTable = m("span", "You have no guests. ");
        var replyPiece = [
            m("div", m("span", "Traits: "), stickSeparated(world.char.sortedTraits().map(function (t) { return traitRef(t[0], t[1]); }))),
            m("div", m("span", "Skills: "), stickSeparated(world.char.sortedSkills().map(function (s) { return skillRef(s[0], s[1]); }))),
            m("div", m("span", "Items: "), stickSeparated(world.char.items.map(function (i) { return itemRef(i); }))),
            m("hr"),
            guestTable,
            m("a.invitemore", { href: "#/page/people", style: "padding-left: 5px" }, "Invite more guests"),
            m("hr"),
            m("div", m("span", "Commands: ", mCharCommandLinks(world.char))),
            m("hr")
        ];
        if (commandReply) {
            var reason = executedCommand.id + ": " + CommandOutcomeText[commandReply.outcome] + " ";
            replyPiece.push(m("span", reason));
            if (commandReply.outcome == CommandOutcome.NeedTargets) {
                replyPiece = replyPiece.concat(stickSeparated(commandReply.details.map(function (x) { return m("a", { href: window.location.href + "/" + x.signature }, x.toString()); })));
            }
            if (commandReply.outcome == CommandOutcome.NoTargets)
                replyPiece.push(m("span", numberMapToString(commandReply.details)));
        }
        if (world.commandLog.length > 0) {
            replyPiece.push(m("div.commandLog", stickSeparated(world.commandLog.map(function (s) { return toM(s); }))));
        }
        return mPage(replyPiece);
    }
};
var pageMain = pageCommand;
/*var pageMain = {
  view: function () {
    var replyPiece = [m("div", m("span", "Commands you have: ", mCharCommandLinks(world.char)))]
    return mPage(replyPiece)
  }
}*/
function hasSave(slot) {
    if (slot === void 0) { slot = 0; }
    return localStorage[("elderName" + slot)];
}
var pageMenu = {
    view: function (w) {
        world.commandLog = [];
        var saveList, saveName, save;
        saveList = [];
        saveList.push();
        var i;
        for (i = 0; saveName = hasSave(i); i++) {
            saveList.push(m("tr", { style: "border-top:solid 1px gray" }), m("td", m("a[href='#/save/" + i + "']", i > 0 ? "Save" : "")), m("td", (i > 0 ? i.toString() : "Auto")), m("td[width=300px]", saveName), m("td", m("a[href='#/load/" + i + "']", "Load")));
        }
        return mPage(m("table.savesTable", m("tr", m("td[colspan=4]", m("a[href='#/new']", "New Game"))), saveList, m("tr", m("td[colspan=4]", m("a[href='#/save/" + i + "']", "Save in a New Slot")))));
    }
};
var pagePeople = {
    view: function (w) {
        return mPage(m("span", "People existing:"), m("table", peopleTable(mapValues(world.characters), false)));
    }
};
var pageItems = {
    view: function (w) {
        world.commandLog = [];
        var itemList = world.char.items;
        return mPage(m("span", "Items owned:"), m("table", itemList.map(function (s) { return m("tr", m("td", s.signature), m("td", s.q == 1 ? "" : s.q.toString())); })));
    }
};
var pageSkills = {
    view: function (w) {
        return mPage(m("table", world.char.sortedSkills().map(function (s) { return m("tr", m("td", s[0]), m("td", s[1].toString())); })));
    }
};
window.onload = function () {
    downloadFile("universe/universe.yaml", main);
};
function main(universeYaml) {
    parseUniverse(jsyaml.load(universeYaml));
    resetWorld();
    m.route(document.body, '/', {
        '/': pageMain,
        '/cmd/:args...': pageCommand,
        '/page/main': pageMain,
        '/new/:args': pageMain,
        '/page/items': pageItems,
        '/page/skills': pageSkills,
        '/page/people': pagePeople,
        '/page/menu': pageMenu,
        '/save/:args': pageMenu,
        '/load/:args': pageMain,
        '/invite/:args': pageMain,
        '/discuss/:args': pageMain
    });
}
//# sourceMappingURL=app.js.map