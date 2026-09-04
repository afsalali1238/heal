/// Red-flag safety gate — pure decision logic, no DOM.
///
/// A-007 equivalent: saying nothing proceeds; "I'm not sure" stops; any
/// trigger stops. Stopping is always the safe default.
///
/// STATUS: draft content. Every string below needs clinician review before
/// it faces a patient.
module Physio.Safety

type Trigger =
    { Id : string
      Label : string
      StopTitle : string
      StopMessage : string
      Status : string }

let triggers : Trigger list =
    [ { Id = "chest"
        Label = "Chest pain, pressure or tightness"
        StopTitle = "This needs urgent medical assessment."
        StopMessage = "Chest pain or pressure can be an emergency. Seek urgent care now — do not use the exercises today."
        Status = "draft" }
      { Id = "breathing"
        Label = "Trouble breathing or shortness of breath"
        StopTitle = "This needs urgent medical assessment."
        StopMessage = "Breathing difficulty can be an emergency. Seek urgent care now — do not use the exercises today."
        Status = "draft" }
      { Id = "trauma"
        Label = "A recent fall, accident or blow to this area"
        StopTitle = "Get this checked before you start."
        StopMessage = "A recent injury needs a person to assess it first. Contact the clinic before doing the exercises."
        Status = "draft" }
      { Id = "fever"
        Label = "Fever, or feeling generally unwell"
        StopTitle = "Rest today, exercises can wait."
        StopMessage = "When you are unwell with fever, exercise can wait. Rest and try again when the fever has settled."
        Status = "draft" }
      { Id = "neuro"
        Label = "New numbness, weakness, or bladder/bowel changes"
        StopTitle = "This needs urgent medical assessment."
        StopMessage = "New numbness, weakness, or changes in bladder or bowel habits need urgent assessment. Seek care now."
        Status = "draft" }
      { Id = "surgery"
        Label = "Recent surgery on this area"
        StopTitle = "Follow your surgeon's instructions, not this page."
        StopMessage = "After surgery, only do what your surgical team cleared. Ask them before using these exercises."
        Status = "draft" }
      { Id = "weight"
        Label = "Unexplained weight loss or pain that never eases"
        StopTitle = "Get this checked before you start."
        StopMessage = "Weight loss you cannot explain, or pain that nothing eases, needs a clinician's assessment first."
        Status = "draft" }
      { Id = "severe-head"
        Label = "The worst headache of your life, fainting, or slurred speech"
        StopTitle = "This needs urgent medical assessment."
        StopMessage = "These can be emergency signs. Seek urgent care now — do not use the exercises today."
        Status = "draft" } ]

let unsure : Trigger =
    { Id = "unsure"
      Label = "I'm not sure"
      StopTitle = "Check with the clinic before you start."
      StopMessage = "If you are not sure whether one of these applies to you, contact the clinic and ask before doing the exercises."
      Status = "draft" }

type GateOutcome =
    | Proceed
    | Stop of title : string * message : string

/// Pure gate decision. Empty selection proceeds; anything else stops.
/// Unknown ids are treated as "not sure" — never as permission.
let decide (selectedIds : string list) : GateOutcome =
    match selectedIds with
    | [] -> Proceed
    | ids ->
        match triggers |> List.tryFind (fun t -> List.contains t.Id ids) with
        | Some t -> Stop(t.StopTitle, t.StopMessage)
        | None -> Stop(unsure.StopTitle, unsure.StopMessage)
