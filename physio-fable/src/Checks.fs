/// Build-time figure gate: the F# equivalent of check:figures.
///
/// Coverage resolves specs by item id through `specFor` — the exact lookup
/// the page renderer uses — so the gate cannot pass while a page renders an
/// item without a figure. Angles are range-checked, geometry is sanity
/// checked, and every arrow must be long enough to actually communicate.
module Physio.Checks

open Physio.Content
open Physio.Figures
open Physio.Specs

type GateReport =
    { Errors : string list
      Items : int
      Specs : int }

let specFor (itemId : string) : Spec option =
    specs |> List.tryFind (fun s -> s.ItemId = itemId)

let private inRange (lo : float) (hi : float) (v : float) : bool = v >= lo && v <= hi

let private checkAngles (tag : string) (p : PoseParams) : string list =
    let req ok msg = if ok then None else Some msg
    [ req (inRange -30.0 45.0 p.Lean) $"{tag}: lean {p.Lean} out of range -30..45."
      req (inRange 0.0 270.0 p.ArmA1) $"{tag}: ArmA1 {p.ArmA1} out of range 0..270."
      req (inRange 0.0 270.0 p.ArmA2) $"{tag}: ArmA2 {p.ArmA2} out of range 0..270."
      req (inRange 100.0 220.0 p.LegA1) $"{tag}: LegA1 {p.LegA1} out of range 100..220."
      req (inRange 100.0 280.0 p.LegA2) $"{tag}: LegA2 {p.LegA2} out of range 100..280."
      req (inRange 90.0 250.0 p.Wrist) $"{tag}: Wrist {p.Wrist} out of range 90..250."
      req (inRange 0.0 270.0 p.FootA) $"{tag}: FootA {p.FootA} out of range 0..270."
      req (inRange -20.0 20.0 p.HeadDx) $"{tag}: HeadDx {p.HeadDx} out of range -20..20."
      req (inRange -20.0 20.0 p.HeadDy) $"{tag}: HeadDy {p.HeadDy} out of range -20..20."
      req
          (finite p.Lean && finite p.ArmA1 && finite p.ArmA2 && finite p.LegA1 && finite p.LegA2 && finite p.Wrist
           && finite p.FootA && finite p.HeadDx && finite p.HeadDy)
          $"{tag}: non-finite angle." ]
    |> List.choose id

let private jointOf (fig : Figure) (joint : ArrowJoint) : Pt =
    match joint with
    | Head -> fig.HeadC
    | Hand -> fig.HandC
    | Foot -> fig.Foot.[1]

let arrowFor (spec : Spec) : Arrow =
    let fromFig = buildFigure spec.Start
    let toFig = buildFigure spec.End
    { From = jointOf fromFig spec.Joint
      To = jointOf toFig spec.Joint }

let private checkItem (itemId : string) : string list =
    match specFor itemId with
    | None -> [ $"No figure spec for item \"{itemId}\" (render resolves by item id)." ]
    | Some spec ->
        let angleErrors = checkAngles $"{itemId}.start" spec.Start @ checkAngles $"{itemId}.end" spec.End
        let fig = buildFigure spec.End
        let arrow = arrowFor spec
        let (minX, minY, w, h) = figureBounds fig (Some arrow)
        let allPts =
            fig.Spine @ fig.Arm @ fig.Leg @ fig.Foot @ [ fig.HandC; fig.HeadC; arrow.From; arrow.To ]
        let req ok msg = if ok then None else Some msg
        angleErrors
        @ ([ req (allPts |> List.forall finitePt) $"{itemId}: non-finite coordinate."
             req (w > 40.0 && w < 400.0 && h > 40.0 && h < 400.0) $"{itemId}: degenerate bounds {w}x{h}."
             req (arrowLength arrow >= 3.0) $"{itemId}: arrow too short to communicate movement."
             req
                 (fst arrow.From >= minX - 40.0 && fst arrow.From <= minX + w + 40.0
                  && snd arrow.From >= minY - 40.0 && snd arrow.From <= minY + h + 40.0)
                 $"{itemId}: arrow starts far outside the figure." ]
            |> List.choose id)

/// Full gate: orphan specs, then every item.
let validateAll () : GateReport =
    let itemIds = items |> List.map (fun i -> i.Id)
    let orphans =
        specs
        |> List.filter (fun s -> not (List.contains s.ItemId itemIds))
        |> List.map (fun s -> $"Figure spec \"{s.ItemId}\" matches no item.")
    let missing = itemIds |> List.collect checkItem
    { Errors = orphans @ missing
      Items = itemIds.Length
      Specs = specs.Length }
