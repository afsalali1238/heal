/// Figure specs: one per item, keyed by item id — the same key the page
/// renderer uses, so coverage can never drift from what patients see.
///
/// A spec is a START pose and an END pose over the shared skeleton. The
/// movement arrow runs from the chosen joint's start position to its end
/// position, so the picture always shows the item's own written movement.
/// Most movements start from neutral; the exceptions (like straightening
/// an elbow that begins bent) say so explicitly.
module Physio.Specs

open Physio.Figures

/// Which joint the movement arrow tracks.
type ArrowJoint =
    | Head
    | Hand
    | Foot

type Spec =
    { ItemId : string
      Start : PoseParams
      End : PoseParams
      Joint : ArrowJoint }

let private n = neutralParams

let specs : Spec list =
    [ // ── neck ──
      { ItemId = "ex-neck-01"
        Start = n
        End = { n with HeadDx = -10.0 }
        Joint = Head }
      { ItemId = "str-neck-01"
        Start = n
        End = { n with Lean = 22.0; LegA2 = 183.0 }
        Joint = Head }
      { ItemId = "ex-neck-02"
        Start = n
        End = { n with Lean = -10.0; HeadDx = 3.0; HeadDy = -3.0 }
        Joint = Head }
      // ── shoulder ──
      { ItemId = "ex-shoulder-01"
        Start = n
        End = { n with Lean = 12.0; ArmA1 = 150.0; ArmA2 = 155.0 }
        Joint = Hand }
      { ItemId = "ex-shoulder-02"
        Start = n
        End = { n with ArmA1 = 95.0; ArmA2 = 100.0 }
        Joint = Hand }
      { ItemId = "ex-shoulder-03"
        Start = n
        End = { n with ArmA1 = 195.0; ArmA2 = 200.0 }
        Joint = Hand }
      // ── elbow ──
      { ItemId = "ex-elbow-01"
        Start = n
        End = { n with ArmA1 = 175.0; ArmA2 = 100.0 }
        Joint = Hand }
      { ItemId = "ex-elbow-02"
        Start = { n with ArmA1 = 175.0; ArmA2 = 100.0 }
        End = { n with ArmA1 = 170.0; ArmA2 = 172.0 }
        Joint = Hand }
      { ItemId = "str-elbow-01"
        Start = n
        End = { n with ArmA1 = 10.0; ArmA2 = 25.0 }
        Joint = Hand }
      // ── wrist ──
      { ItemId = "str-wrist-01"
        Start = n
        End = { n with ArmA1 = 160.0; ArmA2 = 165.0; Wrist = 200.0 }
        Joint = Hand }
      { ItemId = "str-wrist-02"
        Start = n
        End = { n with ArmA1 = 160.0; ArmA2 = 165.0; Wrist = 135.0 }
        Joint = Hand }
      // ── lower back ──
      { ItemId = "ex-lowerback-01"
        Start = n
        End = { n with Lean = -4.0 }
        Joint = Head }
      { ItemId = "ex-lowerback-02"
        Start = n
        End = { n with Lean = -12.0 }
        Joint = Head }
      { ItemId = "ex-lowerback-03"
        Start = n
        End = { n with Lean = 28.0; LegA2 = 188.0 }
        Joint = Head }
      // ── hip ──
      { ItemId = "ex-hip-01"
        Start = n
        End = { n with Lean = 8.0; LegA1 = 165.0; LegA2 = 150.0 }
        Joint = Head }
      { ItemId = "ex-hip-02"
        Start = n
        End = { n with Lean = 18.0; LegA1 = 170.0; LegA2 = 155.0 }
        Joint = Head }
      { ItemId = "ex-hip-03"
        Start = n
        End = { n with LegA1 = 150.0; LegA2 = 175.0 }
        Joint = Foot }
      // ── knee ──
      { ItemId = "str-knee-01"
        Start = n
        End = { n with LegA1 = 185.0; LegA2 = 255.0 }
        Joint = Foot }
      { ItemId = "str-knee-02"
        Start = n
        End = { n with Lean = 15.0; LegA1 = 160.0; LegA2 = 175.0 }
        Joint = Foot }
      // ── ankle ──
      { ItemId = "ex-ankle-01"
        Start = n
        End = { n with FootA = 165.0 }
        Joint = Foot }
      { ItemId = "ex-ankle-02"
        Start = n
        End = { n with FootA = 55.0 }
        Joint = Foot } ]
