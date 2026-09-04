/// Deterministic pose-figure renderer: joint angles in, SVG string out.
///
/// No images, no randomness, no AI. The same angles always produce the same
/// picture, which is the whole point — a wrong-but-confident picture is how
/// patients learn the wrong movement.
///
/// The figure is a side-view schematic built from 2D kinematic chains:
/// spine (3 segments), one arm (2), one leg (2), a head circle with an
/// optional postural shift, a hand dot on a wrist angle, and a foot segment
/// on an ankle angle, plus a floor line. Every angle is absolute: 0 = up,
/// clockwise positive, so 180 = straight down.
module Physio.Figures

type Pt = float * float

let private rad (deg : float) : float = deg * System.Math.PI / 180.0

let private r1 (v : float) : string = string (System.Math.Round(v, 1))

let finite (x : float) : bool = x = x && abs x < 1e9

let finitePt ((x, y) : Pt) : bool = finite x && finite y

/// 2D kinematic chain: from a start point, walk (length, absolute angle)
/// segments.
let chain (sx : float, sy : float) (segments : (float * float) list) : Pt list =
    let (_, rev) =
        List.fold
            (fun ((x, y), acc) (len, ang) ->
                let a = rad ang
                let p = (x + len * sin a, y - len * cos a)
                (p, p :: acc))
            ((sx, sy), [])
            segments
    (sx, sy) :: List.rev rev

/// Authored joint angles for one pose. `HeadDx/HeadDy` is a postural glide
/// of the head (chin tuck family); everything else is a chain angle.
type PoseParams =
    { Lean : float
      ArmA1 : float
      ArmA2 : float
      LegA1 : float
      LegA2 : float
      Wrist : float
      FootA : float
      HeadDx : float
      HeadDy : float }

/// The neutral standing pose every arrow starts from unless a spec says
/// the movement begins elsewhere.
let neutralParams : PoseParams =
    { Lean = 0.0
      ArmA1 = 172.0
      ArmA2 = 176.0
      LegA1 = 178.0
      LegA2 = 178.0
      Wrist = 170.0
      FootA = 95.0
      HeadDx = 0.0
      HeadDy = 0.0 }

/// A built figure: resolved joint points ready to draw or validate.
type Figure =
    { Spine : Pt list
      Arm : Pt list
      Leg : Pt list
      Foot : Pt list
      HandC : Pt
      HeadC : Pt }

let buildFigure (p : PoseParams) : Figure =
    let hip = (0.0, 0.0)
    let spine = chain hip [ (34.0, p.Lean); (30.0, p.Lean); (16.0, p.Lean - 4.0) ]
    let shoulder = spine.[1]
    let neck = spine.[2]
    let headC = (fst neck + 9.0 + p.HeadDx, snd neck - 13.0 + p.HeadDy)
    let arm = chain shoulder [ (26.0, p.ArmA1); (24.0, p.ArmA2) ]
    let wristEnd = arm.[2]
    let wa = rad p.Wrist
    let handC = (fst wristEnd + 7.0 * sin wa, snd wristEnd - 7.0 * cos wa)
    let leg = chain hip [ (38.0, p.LegA1); (38.0, p.LegA2) ]
    let ankle = leg.[2]
    let fa = rad p.FootA
    let toe = (fst ankle + 13.0 * sin fa, snd ankle - 13.0 * cos fa)
    { Spine = spine
      Arm = arm
      Leg = leg
      Foot = [ ankle; toe ]
      HandC = handC
      HeadC = headC }

type Arrow = { From : Pt; To : Pt }

let arrowLength (a : Arrow) : float =
    let dx = fst a.To - fst a.From
    let dy = snd a.To - snd a.From
    sqrt (dx * dx + dy * dy)

let private figurePoints (fig : Figure) (arrow : Arrow option) : Pt list =
    let extra =
        match arrow with
        | Some a -> [ a.From; a.To ]
        | None -> []
    fig.Spine @ fig.Arm @ fig.Leg @ fig.Foot @ [ fig.HandC; fig.HeadC ] @ extra

/// Bounds (minX, minY, width, height) computed from the drawn points plus
/// padding, so a figure can never crop itself.
let figureBounds (fig : Figure) (arrow : Arrow option) : float * float * float * float =
    let all = figurePoints fig arrow
    let xs = all |> List.map fst
    let ys = all |> List.map snd
    let pad = 26.0
    let headPad = 13.0
    let minX = List.min xs - pad
    let minY = List.min ys - pad - headPad
    let w = List.max xs - List.min xs + pad * 2.0 + headPad
    let h = List.max ys - List.min ys + pad * 2.0 + headPad * 2.0
    (minX, minY, w, h)

/// Full standalone SVG document for one figure.
let figureSvg (fig : Figure) (arrow : Arrow option) (label : string) : string =
    let (minX, minY, w, h) = figureBounds fig arrow
    let (hx, hy) = fig.HeadC
    let (ndx, ndy) = fig.HandC
    let arrowSvg =
        match arrow with
        | Some a ->
            let (x1, y1) = a.From
            let (x2, y2) = a.To
            $"""<line x1="{r1 x1}" y1="{r1 y1}" x2="{r1 x2}" y2="{r1 y2}" class="f-brand" stroke-width="3.5" stroke-linecap="round" />
<circle cx="{r1 x2}" cy="{r1 y2}" r="4.5" class="f-brandfill" />"""
        | None -> ""
    let groundY = List.max (fig.Leg |> List.map snd) + 16.0
    $"""<svg viewBox="{r1 minX} {r1 minY} {r1 w} {r1 h}" role="img" aria-label="{label}" xmlns="http://www.w3.org/2000/svg">
<title>{label}</title>
<line x1="{r1 (minX + 6.0)}" y1="{r1 groundY}" x2="{r1 (minX + w - 6.0)}" y2="{r1 groundY}" class="f-faint" stroke-width="2" stroke-linecap="round" />
<polyline points="{fig.Leg |> List.map (fun (x, y) -> $"{r1 x},{r1 y}") |> String.concat " "}" class="f-ink" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
<polyline points="{fig.Foot |> List.map (fun (x, y) -> $"{r1 x},{r1 y}") |> String.concat " "}" class="f-ink" stroke-width="7" stroke-linecap="round" stroke-linejoin="round" />
<polyline points="{fig.Spine |> List.map (fun (x, y) -> $"{r1 x},{r1 y}") |> String.concat " "}" class="f-ink" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" />
<polyline points="{fig.Arm |> List.map (fun (x, y) -> $"{r1 x},{r1 y}") |> String.concat " "}" class="f-ink" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" />
<circle cx="{r1 ndx}" cy="{r1 ndy}" r="4.5" class="f-inkfill" />
<circle cx="{r1 hx}" cy="{r1 hy}" r="11" fill="none" class="f-ink" stroke-width="4" />
{arrowSvg}
</svg>"""
