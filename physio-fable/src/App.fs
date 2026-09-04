/// Page assembly: content + specs + figures -> static HTML documents.
///
/// This module is the seam the static-site generator calls (see
/// scripts/render.mjs): `areaRoutes` lists the routes; `renderHome`,
/// `renderArea` and `renderGallery` return plain strings. No framework, no
/// runtime — patients get static files plus small hand-written islands.
module Physio.App

open Physio.Domain
open Physio.Content
open Physio.Safety
open Physio.Figures
open Physio.Specs
open Physio.Checks

let private esc (s : string) : string =
    s.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;")

/// Attribute escaping: element escaping plus double quotes.
let private attrEsc (s : string) : string = (esc s).Replace("\"", "&quot;")

/// Build-time gate, re-exported so the render script fails the build on
/// any figure problem before writing a single file.
let validateAll () : GateReport = Checks.validateAll ()

/// All area routes the generator must write.
let areaRoutes () : string list = areas |> List.map (fun a -> a.Id)

let private figureFor (id : string) : Figure * Arrow =
    match specFor id with
    | None -> failwith $"No figure spec for item \"{id}\". Run the gate first."
    | Some spec ->
        let fig = buildFigure spec.End
        fig, arrowFor spec

/// Area thumbnail: the first item's end-range figure, drawn from the same
/// geometry as every other picture, so it can never disagree with them.
let private thumbnailFor (areaId : string) : string =
    match itemsForArea areaId with
    | [] -> ""
    | first :: _ ->
        let fig, _ = figureFor first.Id
        let art = figureSvg fig None $"{areaId} area illustration"
        $"""<span class="thumb" aria-hidden="true">{art}</span>"""

let private optRow (label : string) (fmt : int -> string) (value : int option) : string =
    match value with
    | Some v -> $"""<div class="d"><dt>{label}</dt><dd>{fmt v}</dd></div>"""
    | None -> ""

let private holdStatic (dose : Dose) : string =
    match dose.HoldSeconds with
    | Some s -> $"""<p class="hold" data-hold="{s}">Hold {s} seconds — a timer appears here.</p>"""
    | None -> ""

let private itemCard (item : Item) : string =
    let fig, arrow = figureFor item.Id
    let art = figureSvg fig (Some arrow) item.ImageAlt
    let sectionName =
        match item.Section with
        | Stretching -> "Stretch"
        | Exercise -> "Exercise"
    let dose =
        optRow "Hold" (fun s -> $"{s} sec") item.Dose.HoldSeconds
        + optRow "Repeat" (fun r -> $"{r} times") item.Dose.Reps
        + optRow "Sets" string item.Dose.Sets
        + (if item.Dose.EachSide then
               """"<div class="d"><dt>Each side</dt><dd>Yes</dd></div>"""
           else
               "")
    $"""<article class="item" id="{item.Id}">
<div class="fig">{art}</div>
<div class="ibody">
<div class="ihead"><p class="chip">{sectionName}</p><h3>{esc item.Name}</h3></div>
<dl class="dose">{dose}</dl>
{holdStatic item.Dose}
<dl class="steps">
<div><dt>Start</dt><dd>{esc item.Start}</dd></div>
<div><dt>Move</dt><dd>{esc item.Movement}</dd></div>
<div><dt>Direction</dt><dd>{esc item.Direction}</dd></div>
<div><dt>Return</dt><dd>{esc item.Return}</dd></div>
</dl>
<p class="target"><b>Target:</b> {esc item.Target}</p>
<p class="safety">{esc item.Safety}</p>
</div>
</article>"""

/// Safety gate markup. Every trigger carries its own stop copy as data
/// attributes so the client island (scripts/gate.js) needs no duplicated
/// strings; without JS this renders as an honest static list.
let private gateSection (blocking : bool) : string =
    let blockingAttr = if blocking then " data-blocking" else ""
    let lis =
        triggers
        |> List.map (fun t ->
            $"""<li data-id="{t.Id}" data-title="{attrEsc t.StopTitle}" data-message="{attrEsc t.StopMessage}">{esc t.Label}</li>""")
        |> String.concat ""
    $"""<section class="gate" data-gate{blockingAttr}>
<p class="step">Before you start</p>
<h2>Do any of these apply to you right now?</h2>
<ul data-triggers>{lis}</ul>
<div class="stop" data-stop hidden>
<h3 data-stop-title tabindex="-1"></h3>
<p data-stop-message></p>
</div>
<p class="cleared" data-cleared hidden>None of these apply — you can continue to the exercises below.</p>
<p class="gate-note">These need a person, not a web page. If any of them describe you, do not use the exercises today.</p>
</section>"""

/// Page stylesheet. Plain string, deliberately NOT interpolated:
/// CSS braces must stay braces, so this never goes inside $"...".
let private pageCss = """
:root { color-scheme: light dark; --fig-ink: #1f2937; --fig-faint: #cbd5e1; --fig-brand: #1f8ac9; --scale: 1; --brand: #1f8ac9; --ink: #1f2937; --ink-2: #475569; --line: #e2e8f0; --bg: #ffffff; --soft: #f8fafc; --warn-bg: #fef3c7; --warn: #92400e; --go-bg: #dcfce7; --go: #15803d; }
body { margin: 0; background: var(--bg); color: var(--ink); font: calc(17px * var(--scale, 1))/1.55 system-ui, sans-serif; }
.wrap { max-width: 760px; margin: 0 auto; padding: 0 20px 64px; }
.banner { background: var(--warn-bg); color: var(--warn); text-align: center; font-size: 14px; padding: 10px 16px; }
header.top { background: var(--brand); color: #fff; padding: 12px 20px; }
.top-in { display: flex; align-items: center; gap: 10px; max-width: 860px; margin: 0 auto; }
.brand { flex: 1; min-width: 0; line-height: 1.2; }
.brand b { display: block; font-size: 12px; letter-spacing: .15em; font-weight: 500; opacity: .8; }
.brand span { font-size: 20px; font-weight: 700; }
.top-actions { display: flex; gap: 8px; }
.tbtn { background: transparent; color: #fff; border: 1px solid currentColor; border-radius: 999px; min-height: 44px; min-width: 44px; padding: 0 14px; font-weight: 600; font-size: 14px; cursor: pointer; white-space: nowrap; }
.vh { position: absolute; width: 1px; height: 1px; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.demoband { background: #eff6ff; color: #1d4ed8; border-bottom: 1px solid #bfdbfe; padding: 10px 20px; font-size: 14px; }
.back { display: inline-block; margin-top: 18px; color: var(--brand); font-weight: 600; }
h1 { font-size: calc(clamp(30px, 7vw, 40px) * var(--scale, 1)); letter-spacing: -.02em; margin: 14px 0 8px; }
h2 { font-size: calc(24px * var(--scale, 1)); }
h3 { font-size: calc(20px * var(--scale, 1)); }
.lede { color: var(--ink-2); max-width: 56ch; }
.area h2, .acard h3 { letter-spacing: -.015em; }
.area h2 { font-size: calc(27px * var(--scale, 1)); margin: 34px 0 6px; padding-top: 22px; border-top: 1px solid var(--line); }
.count { font-size: 14px; color: var(--ink-2); font-weight: 400; }
.starthere { background: var(--go-bg); color: var(--go); border-radius: 12px; padding: 14px 17px; margin: 20px 0; }
.gate { border: 1px solid var(--line); border-radius: 14px; padding: 18px 20px; margin: 22px 0; }
.step { font-size: 12px; letter-spacing: .14em; text-transform: uppercase; color: var(--ink-2); margin: 0 0 6px; }
.gate h2 { margin: 0 0 10px; }
.gate ul { list-style: none; margin: 0 0 4px; padding: 0; display: grid; gap: 7px; }
.gate li { margin: 0; padding: 0; }
.trigger { width: 100%; text-align: left; cursor: pointer; background: #fff; color: var(--ink); border: 1px solid var(--line); border-radius: 11px; padding: 13px 15px; min-height: 48px; font-size: 15.5px; line-height: 1.4; }
.trigger:hover { border-color: var(--warn); color: var(--warn); }
.gate-clear { display: block; width: 100%; cursor: pointer; min-height: 56px; background: var(--brand); color: #fff; border: 1px solid var(--brand); border-radius: 12px; padding: 14px 20px; font-weight: 700; font-size: 17px; margin-top: 12px; }
.stop { background: var(--warn-bg); color: var(--warn); border: 1px solid currentColor; border-radius: 12px; padding: 16px 18px; margin-top: 14px; }
.stop h3 { margin: 0 0 6px; }
.stop h3:focus { outline: none; }
.stop p { margin: 0; }
.cleared { background: var(--go-bg); color: var(--go); border-radius: 10px; padding: 11px 13px; margin: 14px 0 0; }
.gate-note { color: var(--ink-2); font-size: 14.5px; }
.acards { display: grid; gap: 12px; margin-top: 18px; }
.acard { display: grid; grid-template-columns: 120px 1fr; gap: 16px; align-items: center; border: 1px solid var(--line); border-radius: 14px; padding: 14px 16px; text-decoration: none; color: inherit; }
.acard:hover { border-color: var(--brand); }
.acard h3 { margin: 0 0 4px; }
.acard p { margin: 0 0 6px; color: var(--ink-2); font-size: 15px; }
.acard .n { font-size: 12.5px; color: var(--ink-2); }
.thumb { display: block; background: var(--soft); border: 1px solid var(--line); border-radius: 10px; padding: 6px; }
.thumb svg { width: 100%; height: auto; display: block; }
.item { border: 1px solid var(--line); border-radius: 14px; overflow: hidden; margin: 0 0 18px; }
.item.is-done { border-color: var(--go); }
.fig { background: var(--soft); border-bottom: 1px solid var(--line); padding: 14px; }
.fig svg { width: 100%; max-height: 300px; display: block; }
.ibody { padding: 18px 20px 22px; display: grid; gap: 12px; }
.ihead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ihead h3 { flex: 1; min-width: 160px; margin: 0; }
.chip { display: inline-block; margin: 0; font-size: 11px; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; background: #e0f2fe; color: #0369a1; border-radius: 999px; padding: 3px 10px; white-space: nowrap; }
.share-btn, .done-toggle { min-height: 44px; border: 1px solid var(--line); background: #fff; color: var(--ink); border-radius: 999px; padding: 8px 14px; font-weight: 600; font-size: 14px; cursor: pointer; }
.share-btn:hover, .done-toggle:hover { border-color: var(--brand); color: var(--brand); }
.done-toggle[aria-pressed="true"] { background: var(--go-bg); color: var(--go); border-color: currentColor; }
.progress { margin: 0; font-size: 14px; color: var(--ink-2); min-height: 0; }
.dose { display: flex; flex-wrap: wrap; gap: 1px; background: var(--line); border: 1px solid var(--line); border-radius: 11px; overflow: hidden; margin: 0; }
.dose .d { flex: 1 1 100px; background: var(--soft); padding: 10px 12px; }
.dose dt { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-2); }
.dose dd { margin: 0; font-weight: 600; }
.hold { margin: 0; color: var(--ink-2); }
.timer { border: 1px solid var(--line); border-radius: 11px; padding: 12px 14px; background: var(--soft); display: grid; gap: 8px; }
.timer-display { margin: 0; font-size: 30px; font-weight: 700; font-variant-numeric: tabular-nums; }
.timer-row { display: flex; gap: 8px; flex-wrap: wrap; }
.timer-row button { min-height: 44px; border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 8px 16px; font-weight: 600; font-size: 15px; cursor: pointer; }
.timer-row button:hover { border-color: var(--brand); color: var(--brand); }
.steps { display: grid; gap: 8px; margin: 0; }
.steps div { display: grid; grid-template-columns: 74px 1fr; gap: 10px; }
.steps dt { font-size: 10.5px; letter-spacing: .11em; text-transform: uppercase; color: var(--ink-2); padding-top: 3px; }
.steps dd { margin: 0; }
.target { margin: 0; color: var(--ink-2); border-top: 1px solid var(--line); padding-top: 11px; }
.safety { margin: 0; background: var(--warn-bg); color: var(--warn); border-radius: 10px; padding: 11px 13px; font-size: 15px; }
.search-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, .55); display: grid; place-items: start center; padding: 12vh 16px 16px; z-index: 50; }
.search-overlay[hidden] { display: none; }
.search-box { background: #fff; border-radius: 14px; padding: 18px; width: min(560px, 100%); display: grid; gap: 10px; }
.search-box input { min-height: 48px; font-size: 17px; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; }
.search-box ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; max-height: 40vh; overflow: auto; }
.search-box a { color: var(--brand); font-weight: 600; }
.search-box > button { min-height: 44px; }
.gal-grid { display: grid; gap: 18px; margin-top: 18px; }
.gal-card { border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; }
.gal-card h3 { margin: 0 0 4px; }
.gal-card .move { margin: 0 0 10px; color: var(--ink-2); }
.gal-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.gal-pair figure { margin: 0; background: var(--soft); border: 1px solid var(--line); border-radius: 10px; padding: 8px; }
.gal-pair svg { width: 100%; height: auto; display: block; }
.gal-pair figcaption { text-align: center; color: var(--ink-2); font-size: 13px; margin-top: 4px; }
.gal-meta { color: var(--ink-2); font-size: 12.5px; font-family: ui-monospace, monospace; margin: 10px 0 0; }
.cta { display: block; text-align: center; background: var(--brand); color: #fff; font-weight: 700; font-size: calc(19px * var(--scale, 1)); border-radius: 12px; padding: 16px 20px; text-decoration: none; margin-top: 18px; }
.howto { display: grid; gap: 10px; margin: 20px 0 0; padding: 0; list-style: none; counter-reset: step; }
.howto li { counter-increment: step; display: grid; grid-template-columns: 34px 1fr; gap: 10px; align-items: start; }
.howto li::before { content: counter(step); display: grid; place-items: center; width: 30px; height: 30px; border-radius: 50%; background: #e0f2fe; color: #0369a1; font-weight: 700; }
.edu { border-left: 4px solid var(--brand); background: var(--soft); border-radius: 0 10px 10px 0; padding: 12px 16px; margin: 16px 0 0; }
.edu b { display: block; margin-bottom: 2px; }
.edu p { margin: 0; color: var(--ink-2); }
.f-ink { fill: none; stroke: var(--fig-ink); }
.f-inkfill { fill: var(--fig-ink); stroke: none; }
.f-faint { stroke: var(--fig-faint); }
.f-brand { stroke: var(--fig-brand); }
.f-brandfill { fill: var(--fig-brand); stroke: none; }
@media (prefers-color-scheme: dark) {
:root { color-scheme: dark; --brand: #38bdf8; --ink: #e2e8f0; --ink-2: #94a3b8; --line: #334155; --bg: #0f172a; --soft: #1e293b; --warn-bg: #451a03; --warn: #fcd34d; --go-bg: #052e16; --go: #86efac; --fig-ink: #e2e8f0; --fig-faint: #475569; --fig-brand: #38bdf8; }
header.top { background: #0369a1; }
.chip { background: #0c4a6e; color: #7dd3fc; }
.demoband { background: #172554; color: #93c5fd; border-bottom-color: #1e3a8a; }
.trigger, .timer-row button, .share-btn, .done-toggle { background: var(--soft); color: var(--ink); }
.search-box { background: var(--bg); }
.howto li::before { background: #0c4a6e; color: #7dd3fc; }
}
.foot { max-width: 760px; margin: 0 auto; padding: 0 20px 40px; }
.foot a { color: var(--ink-2); font-size: 14px; }
.badge { display: inline-block; font-size: 12.5px; letter-spacing: .04em; text-transform: uppercase; color: var(--warn); background: var(--warn-bg); border: 1px solid #fcd34d; border-radius: 999px; padding: 4px 11px; }
"""

/// Pre-paint scale restore: invisible, unconditional, safe without JS UI.
let private scaleInline = """<script>try{var s=localStorage.getItem("physio-fable-scale");if(s){document.documentElement.style.setProperty("--scale",s)}}catch(e){}</script>"""

/// JSON string escaping for the search index (built by concatenation, so
/// no brace-escaping hazards at all).
let private jstr (s : string) : string =
    "\"" + s.Replace("\\", "\\\\").Replace("\"", "\\\"").Replace("\n", " ") + "\""

/// Client search index: areas + items with plain-language text. URLs are
/// root-relative; the island resolves them per page depth.
let searchIndex () : string =
    let areaName (id : string) : string =
        match areas |> List.tryFind (fun a -> a.Id = id) with
        | Some a -> a.Name
        | None -> failwith $"search index: unknown area \"{id}\"."
    let secName (s : Section) : string =
        match s with
        | Stretching -> "Stretching"
        | Exercise -> "Exercise"
    let areaEntries =
        areas
        |> List.map (fun a ->
            "{\"kind\":" + jstr "area" + ",\"name\":" + jstr a.Name + ",\"area\":" + jstr a.Name + ",\"text\":"
            + jstr a.Lede + ",\"url\":" + jstr (a.Id + "/") + "}")
    let itemEntries =
        items
        |> List.map (fun i ->
            "{\"kind\":" + jstr "item" + ",\"name\":" + jstr i.Name + ",\"area\":" + jstr (areaName i.AreaId)
            + ",\"text\":" + jstr (i.Movement + " " + i.Target) + ",\"url\":" + jstr (i.AreaId + "/#" + i.Id)
            + ",\"section\":" + jstr (secName i.Section) + "}")
    let json = "[" + String.concat "," (areaEntries @ itemEntries) + "]"
    if json.Contains("</script") then
        failwith "search index would break out of its script tag"
    else
        json

/// Search index embedded beside the body (scripts read it, patients never see it).
let indexScript () : string =
    "<script type=\"application/json\" data-index>" + searchIndex () + "</scr" + "ipt>"

let private layout (title : string) (depth : int) (scripts : string list) (body : string) : string =
    let prefix = if depth = 0 then "" else "../"
    let tags =
        scripts
        |> List.map (fun f -> $"""<script src="{prefix}{f}" defer></script>""")
        |> String.concat ""
    $"""<!doctype html>
<html lang="en" data-depth="{depth}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="description" content="{title} — physiotherapy patient library demonstration build." />
<title>{title} | Physiotherapy Patient Library (Fable demo)</title>
<style>{pageCss}</style>
{scaleInline}
</head>
<body>
<div class="banner">NOT MEDICAL ADVICE · STOP IF YOU FEEL SHARP PAIN</div>
<header class="top"><div class="top-in"><div class="brand"><b>PHYSIOTHERAPY</b><span>Patient Library</span></div><div class="top-actions" data-top-actions></div></div></header>
<div class="demoband">Fable demonstration build — content and figures are drafts awaiting clinician review. Not for patient use.</div>
<main class="wrap">
{body}
</main>
<footer class="foot"><a href="{prefix}legal/">Important notice — read before exercising</a></footer>
{indexScript ()}
{tags}
</body>
</html>"""

let private areaCard (area : Area) : string =
    let count = itemsForArea area.Id |> List.length
    let itemWord = if count = 1 then "item" else "items"
    $"""<a class="acard" href="{area.Id}/">
{thumbnailFor area.Id}
<div><h3>{esc area.Name}</h3><p>{esc area.Lede}</p><span class="n">{count} {itemWord}</span></div>
</a>"""

/// Home page: the front door. One job — send the patient to the locator.
let renderHome () : string =
    let body =
        $"""<h1>Exercises and stretches</h1>
<p class="lede">Your physiotherapist pointed to a body area and gave you movements for it. This library holds the instructions, pictures and timers — start by finding your area.</p>
<a class="cta" href="find-my-area/">Find my body area</a>
<ol class="howto">
<li>Check the safety list — it comes first, every time.</li>
<li>Choose the area your physiotherapist pointed to.</li>
<li>Follow only the movements they went through with you.</li>
</ol>"""
    layout "Physiotherapy patient library" 0 [ "textsize.js"; "search.js" ] body

/// Locator route: blocking safety gate, then the area grid. The grid is
/// marked data-gated so the island keeps it hidden until the gate clears;
/// without JS it simply shows, with the static gate copy above it.
let renderFindMyArea () : string =
    let cards = areas |> List.map areaCard |> String.concat ""
    let body =
        $"""<a class="back" href="../">← Home</a>
<h1>Find your body area</h1>
<p class="lede">First the safety check, then choose the area your physiotherapist pointed to.</p>
{gateSection true}
<div data-gated>
<div class="starthere"><b>Start slowly</b> — perform only the movements your physiotherapist reviewed with you.</div>
<div class="acards">{cards}</div>
</div>"""
    layout "Find your body area" 1 [ "gate.js"; "textsize.js"; "search.js" ] body

/// Legal notice: what this site is, what it is not, and what it remembers.
let renderLegal () : string =
    let body =
        $"""<a class="back" href="../">← Home</a>
<h1>Important notice</h1>
<p class="lede">Please read this before using the exercises.</p>
<div class="edu"><b>Not medical advice</b><p>These pages support — never replace — your physiotherapist's instructions. They do not diagnose anything.</p></div>
<div class="edu"><b>Stop rules</b><p>Stop any movement that causes sharp pain, dizziness, tingling, or pain spreading down a limb. If a red-flag trigger applies to you, do not use the exercises that day.</p></div>
<div class="edu"><b>Your data stays yours</b><p>This site has no accounts and sends nothing anywhere. It remembers two preferences in your own browser only: text size and which items you marked done. Clearing your browser data removes them.</p></div>
<div class="edu"><b>Draft content</b><p>Every exercise text and illustration here is a draft awaiting clinician review. Follow only what your physiotherapist personally went through with you.</p></div>
<div class="edu"><b>Emergencies</b><p>Chest pain, trouble breathing, new numbness or weakness, or fainting are emergencies — seek urgent care, do not browse exercises.</p></div>"""
    layout "Important notice" 1 [ "textsize.js" ] body

/// 404: no dead ends — every wrong turn offers the way home.
let renderNotFound () : string =
    let body =
        $"""<h1>That page is not here</h1>
<p class="lede">The link may be old or mistyped. Your exercises are one tap away.</p>
<a class="cta" href="/">All areas</a>"""
    layout "Page not found" 0 [ "textsize.js" ] body

/// One area page. Unknown ids fail the build loudly, never a blank page.
let renderArea (areaId : string) : string =
    match areas |> List.tryFind (fun a -> a.Id = areaId) with
    | None -> failwith $"Unknown area \"{areaId}\"."
    | Some area ->
        let cards =
            itemsForArea area.Id |> List.map itemCard |> String.concat ""
        let body =
            $"""<a class="back" href="../">← All areas</a>
<h1>{esc area.Name}</h1>
<p class="lede">{esc area.Lede}</p>
<div class="edu"><b>Good to know</b><p>{esc area.Education}</p></div>
<div data-share-area></div>
{gateSection false}
<div class="starthere"><b>Start slowly</b> — perform only the movements your physiotherapist reviewed with you.</div>
<p class="progress" data-progress role="status"></p>
{cards}"""
        layout area.Name 1 [ "gate.js"; "timers.js"; "done.js"; "share.js"; "textsize.js"; "search.js" ] body

/// Clinician review gallery: start/end figure pairs for every item,
/// draft-badged, noindexed. NOT a patient route.
let renderGallery () : string =
    let jointName (j : ArrowJoint) : string =
        match j with
        | Head -> "head"
        | Hand -> "hand"
        | Foot -> "foot"
    let card (item : Item) : string =
        match specFor item.Id with
        | None -> failwith $"gallery: no figure spec for item \"{item.Id}\"."
        | Some spec ->
            let start = figureSvg (buildFigure spec.Start) None (item.ImageAlt + " (start)")
            let finish = figureSvg (buildFigure spec.End) (Some(arrowFor spec)) (item.ImageAlt + " (end)")
            $"""<section class="gal-card">
<h3>{esc item.Id} · {esc item.Name}</h3>
<p class="move">{esc item.Movement}</p>
<div class="gal-pair">
<figure>{start}<figcaption>Start</figcaption></figure>
<figure>{finish}<figcaption>End</figcaption></figure>
</div>
<p class="gal-meta">tracks {jointName spec.Joint} · {esc item.ImageAlt}</p>
</section>"""
    let cards = items |> List.map card |> String.concat ""
    let body =
        $"""<h1>Exercise figures — review draft</h1>
<p><span class="badge">Draft · not clinically reviewed</span></p>
<p class="lede">Deterministic schematics of each item's written movement, start and end positions side by side.</p>
<div class="gal-grid">{cards}</div>"""
    layout "Figure review gallery" 1 [ "textsize.js"; "search.js" ] body


/// Backwards-compatible single-page render (kept for the demo artifact).
let renderPage () : string = renderHome ()
