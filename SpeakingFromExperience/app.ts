function glog(s) {
  world.gameLog.push(s)
  world.commandLog.push(s)
  log(s)
}

function resetWorld() {
  world = new World()
  world.char = world.you
  saveWorld()
}

function saveWorld(slot = 0) {
  var worldString = freezer.freeze(world)
  var paked = pako.deflate(worldString, { to: 'string' })
  if (slot != 0) {
    glog(`Saved to slot ${slot}, size ${dot2(paked.length/1024)} kbytes`)
  }
  localStorage["elder" + slot] = paked
  localStorage["elderName" + slot] = `${world.you.name} ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`
}

function loadWorld(slot = 0) {
  var paked = localStorage["elder" + slot]

  if (paked) {
    var worldString: string = pako.inflate(paked, { to: 'string' }) as string
    world = freezer.thaw(worldString)
    world.char = world.you
    return true
  }

  return false
}

function onRedraw(element, isInit, context) {
}

var commandReply: CommandReply
var executedCommand: Command
var executedCommandArguments:string[]

function onPageClick(e) {
  var commandString = e.target.href + ""
  var args = commandString.substr(commandString.indexOf("#") + 2).split("/")
  switch (args[0]) {
    case "cmd":
      executedCommand = Command.byId[args[1]]
      executedCommandArguments = args.splice(2)
      world.commandLog = []
      commandReply = executedCommand.execute(world.char, executedCommandArguments)
      saveWorld()
      break
    case "discuss":
      world.commandLog = []
      var discussionTopic = args.splice(1)
      world.char.discussWithGuests(discussionTopic)
      break
    case "invite":
      world.commandLog = []
      world.char.invite(world.characters[args[1]])
      break
    case "save":
      saveWorld(Number(args[1]))
      break
    case "load":
      loadWorld(Number(args[1]))
      break
    case "new":
      resetWorld()
      break
  }
  m.route(m.route())
}

function mPage(...args) {
  return m("div", { config: onRedraw, onclick: onPageClick },
    m("table[width=100%]",
      m("thead", m("tr",
        m("td[width=50%]", m("input.subtleInput.xxlarge", bindPropWithAttr(world.you, "name"))),
        m("td.right",
          putInBetweens(
            ["main", "skills", "items", "people", "menu"].map((page) => m(`a[href='#/page/${page}']`, capitalize(page))),
            m("span.faint", " | ")
          )
        )
      )),
      m("tr",
        m("td", m.apply(null, ["div"].concat(joinArrays(args)))),
        m("td.log.right", m("div", world.gameLog.map((s) => m("div", toM(s)))))
      )
    )
  )
}

function stickSeparated(args: Mithril.VirtualElement[]): Mithril.VirtualElement[] {
  return putInBetweens(args, m("span.faint", " | "))
}

function mCommandLinks(commands, tip = (command) => "No comments") {
  var stuff = stickSeparated( commands.map((command) => m("a.tooltip.fade", { href: "#/cmd/" + command, "data-title": tip(command) }, command) ) )
  return m("span", stuff)
}

function mCharCommandLinks(char: Character) {
  return mCommandLinks(char.availableCommands().map((c) => c.id), (name) => Command.byId[name].tooltip(char))
}

function href(ref: string, text: string, tip?: string) {
  if(tip)
    return m("a.tooltip.fade", { href: ref, "data-title": tip }, text)
  else
    return m("a", { href: ref }, text)
}

function charRef(c: Character){
  return href("#/discuss/person/" + c.id, c.name, "click to discuss " + c.name)
}

function commandRef(c: Command) {
  return href("#/discuss/command/" + c.id, c.id, "click to discuss " + c.id)
}

function skillRef(s: Skill | string, v?: number) {
  var sid:String = (s instanceof Skill)?s.id:s
  return href("#/discuss/skill/" + sid, sid + (v ? (": " + dot2(v)) : ""), "click to discuss " + sid)
}

function itemRef(i: Item) {
  var its = i.toString()
  return href("#/discuss/item/" + its, its, "click to discuss " + its)
}

function traitRef(tid: string, v?: number) {
  return href("#/discuss/trait/" + tid, tid + (v?(": " + dot2(v)):""), "click to discuss " + tid)
}

function smartRef(something) {
  if (something instanceof Item)
    return itemRef(something)
  if (something instanceof Character)
    return charRef(something)
  if (something instanceof Command)
    return commandRef(something)
  if (something instanceof Skill)
    return skillRef(something)
  if (something instanceof Trait)
    return traitRef(something.id)
  if (typeof something === "string")
    return traitRef(something)
}

function toM(a) {
  if (typeof a === "string")
    return m("span", a)
  if (a instanceof Speech) {
    var s = a as Speech
    var tail = []
    switch (s.theme) {
      case "interest":
        if (s.more == s.speaker)
          tail = [charRef(s.speaker), " likes ", smartRef(s.detail)]
        else
          tail = [charRef(s.speaker), " says ", smartRef(s.more), " likes ", smartRef(s.detail)]
        break
      case "skill":
        if (s.more == s.speaker)
          tail = [charRef(s.speaker), " knows ", smartRef(s.detail)]
        else
          tail = [charRef(s.speaker), " says ", smartRef(s.more), " knows ", smartRef(s.detail)]
        break
      case "teachSkill":
        tail = [charRef(s.speaker), " teaches you some ", smartRef(s.detail)]
        break
    }
    return m("span", tail)
  }
  return a.toString()
}

function peopleTable(people:Character[], local:boolean = true) {
  var guestTable = people.sort((a,b)=>(a.name > b.name?1:-1)).map((c) => {
    var td = [m("td", charRef(c))]
    if (local)
      td.push(
        m("td", dot3(c.traits["Attention"] || 0)),
        m("td", dot3(c.traits["Tired"] || 0))
      )
    td.push(
      m("td", stickSeparated(c.knownSkills().map(skillRef))),
      m("td", stickSeparated(c.knownInterests().map(traitRef)))
    )
    if (!local) {
      if (c.isMyGuest())
        td.push(m("td", "here"))
      else if(c.tired)
        td.push(m("td", "Tired: " + dot2(c.tired)))
      else
        td.push(m("td", (m("a", { href: "#/invite/" + c.id }, "invite"))))
    }
    return m("tr", td)
  })

  if(local)
    guestTable.unshift(m("tr", m("td", "Guest"), m("td", "Attention"), m("td", "Tiredness"), m("td", "Known skills"), m("td", "Known interests")))
  else
    guestTable.unshift(m("tr", m("td", "Person"), m("td", "Known skills"), m("td", "Known interests")))

  return m("table.people",guestTable)
}

var pageCommand = {
  view: function () {
    var guestTable: Mithril.VirtualElement

    if (world.char.guests.length > 0)
      guestTable = peopleTable(world.char.guests)
    else
      guestTable = m("span", "You have no guests. ")

    var replyPiece = [
      m("div", m("span", "Traits: "), stickSeparated(world.char.sortedTraits().map(
        (t) => traitRef(t[0], t[1])
      ))),
      m("div", m("span", "Skills: "), stickSeparated(world.char.sortedSkills().map(
        (s) => skillRef(s[0], s[1]))
      )),
      m("div", m("span", "Items: "), stickSeparated(world.char.items.map(
        (i) => itemRef(i)
      ))),
      m("hr"),
      guestTable,
      m("a.invitemore", { href: "#/page/people", style: "padding-left: 5px" }, "Invite more guests"),
      m("hr"),
      m("div", m("span", "Commands: ", mCharCommandLinks(world.char))),
      m("hr")
    ]
    if (commandReply) {
      var reason = `${executedCommand.id}: ${CommandOutcomeText[commandReply.outcome]} `
      replyPiece.push(m("span", reason))
      if (commandReply.outcome == CommandOutcome.NeedTargets) {
        replyPiece = replyPiece.concat(stickSeparated(commandReply.details.map((x: Item) => m("a", { href: window.location.href + "/" + x.signature }, x.toString()))))
      }
      if (commandReply.outcome == CommandOutcome.NoTargets)
        replyPiece.push(m("span", numberMapToString(commandReply.details as NumberMap)))
    }
    if (world.commandLog.length > 0) {
      replyPiece.push(m("div.commandLog", stickSeparated(world.commandLog.map((s) => toM(s)))))
    }
    return mPage(replyPiece)
  }
}

var pageMain = pageCommand

/*var pageMain = {
  view: function () {
    var replyPiece = [m("div", m("span", "Commands you have: ", mCharCommandLinks(world.char)))]
    return mPage(replyPiece)
  }
}*/

function hasSave(slot = 0) {
  return localStorage[`elderName${slot}`]
}

var pageMenu = {
  view: function (w) {
    world.commandLog = []
    var saveList: any[], saveName: string, save
    saveList = []
    saveList.push()
    var i:number
    for (i = 0; saveName = hasSave(i); i++) {
      saveList.push(m("tr", { style: "border-top:solid 1px gray" }),
        m("td", m("a[href='#/load/" + i + "']", "Load")),
        m("td", (i > 0 ? i.toString() : "Auto")),
        m("td[width=300px]", saveName),
        m("td", m("a[href='#/save/" + i + "']", i > 0 ? "Save" : ""))
      )
    }
    return mPage(
      m("table.savesTable",
        m("tr", m("td[colspan=4]", m("a[href='#/new']", "New Game"))),
        saveList,
        m("tr", m("td[colspan=4]", m("a[href='#/save/" + i + "']", "Save in a New Slot")))
      )
    )
  }
}

var pagePeople = {
  view: function (w) {
    return mPage(
      m("span", "People existing:"),
      m("table", peopleTable(mapValues(world.characters), false))
    )
  }
}

var pageItems = {
  view: function (w) {
    world.commandLog = []
    var itemList = world.char.items
    return mPage(
      m("span", "Items owned:"),
      m("table",
        itemList.map((s) => { return m("tr", m("td", s.signature), m("td", s.q == 1 ? "" : s.q.toString())) })
      )
    )
  }
}

var pageSkills = {
  view: (w) => {
    return mPage(
      m("table",
        world.char.sortedSkills().map((s) => m("tr", m("td", s[0]), m("td", s[1].toString())))
      )
    )
  }
};

window.onload = () => {
  downloadFile("universe/universe.yaml", main)
}

function main(universeYaml) {
  parseUniverse(jsyaml.load(universeYaml))

  resetWorld()

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
  })
}