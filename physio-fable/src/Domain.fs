/// Core content model for the patient library.
///
/// Deliberately boring: records of strings, options and small unions.
/// Everything here must survive Fable compilation to plain JS, so no
/// reflection, no SRTP, no classes — data in, data out.
module Physio.Domain

/// The two library sections. No other sections exist.
type Section =
    | Stretching
    | Exercise

type Dose =
    { HoldSeconds : int option
      Reps : int option
      Sets : int option
      EachSide : bool }

/// Nothing reaches a patient route unless Published with a named reviewer.
/// Anything else is invisible to patients, full stop.
type ItemStatus =
    | Published of reviewer : string
    | Draft

/// One exercise or stretch. The written steps are authoritative; any picture
/// illustrates them and never replaces them.
type Item =
    { Id : string
      AreaId : string
      Section : Section
      Name : string
      Start : string
      Movement : string
      Direction : string
      Return : string
      Dose : Dose
      Target : string
      Safety : string
      ImageAlt : string
      Status : ItemStatus }

type Area =
    { Id : string
      Name : string
      Lede : string
      /// One short education note. Draft until a clinician reviews it,
      /// like everything else in Content.
      Education : string }
