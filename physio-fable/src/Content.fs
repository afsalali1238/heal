/// Seed content: eight body areas, twenty-one items, production-level copy.
///
/// STATUS: draft. Written carefully, but no clinician has reviewed a word of
/// it, so everything stays Draft until one does.
module Physio.Content

open Physio.Domain

let areas : Area list =
    [ { Id = "neck"
        Name = "Neck"
        Lede = "Gentle mobility work for a stiff neck. Follow only what your physiotherapist went through with you."
        Education = "Neck stiffness usually eases with frequent gentle movement through the day rather than one long session. Pain that spreads down an arm, or comes with dizziness, deserves a clinician's eyes — not more repetitions." }
      { Id = "shoulder"
        Name = "Shoulder"
        Lede = "Easy pendulum and arm movements to keep a sore shoulder moving. Keep every movement small and pain-free."
        Education = "Shoulders stiffen quickly when they stop moving: small pain-free arcs, done often, beat rare big efforts. Sharp catching pain, or night pain that never eases, should be reviewed." }
      { Id = "elbow"
        Name = "Elbow"
        Lede = "Bend-and-straighten work for a stiff or achy elbow. Move slowly and never force the end of the movement."
        Education = "Tennis elbow and golfer's elbow are tendon irritations that calm with gradual loading — neither complete rest nor force. Numbness or tingling in the fingers needs assessment first." }
      { Id = "wrist"
        Name = "Wrist"
        Lede = "Gentle bends for a stiff wrist. Stretch to mild tension only — never into sharp pain."
        Education = "Wrist sprains and overuse calm fastest when gentle motion starts early and load builds slowly. Swelling that keeps growing, deformity after a fall, or numb fingers need urgent care." }
      { Id = "lowerback"
        Name = "Lower back"
        Lede = "Basic trunk control and gentle mobility for the lower back. Stop if pain spreads down a leg."
        Education = "Most back pain improves by staying active and returning to normal movement — bed rest slows recovery. Spreading leg pain, numbness, or bladder and bowel changes need urgent assessment." }
      { Id = "hip"
        Name = "Hip"
        Lede = "Sit-to-stand strength and easy leg movements. Hold something sturdy if your balance is unsure."
        Education = "Hips love regular walking and sit-to-stand practice, and hate long uninterrupted sitting. Groin pain with clicking or locking, or pain after a fall, should be checked." }
      { Id = "knee"
        Name = "Knee"
        Lede = "Front and back of thigh stretches that protect the knee. Hold something sturdy while you stretch."
        Education = "Knees are protected by strong thighs: mini squats and sit-to-stands help more than avoiding stairs. A knee that locks, gives way, or swells fast after an injury needs review." }
      { Id = "ankle"
        Name = "Ankle"
        Lede = "Point-and-flex work to wake up stiff ankles. Sit or hold support so you cannot lose balance."
        Education = "Ankle sprains recover with early gentle movement and balance practice, not weeks of stillness unless advised. If you cannot bear weight, or swelling is major after an injury, get assessed." } ]

let items : Item list =
    [ // ── neck ──
      { Id = "ex-neck-01"
        AreaId = "neck"
        Section = Exercise
        Name = "Chin tuck"
        Start = "Sit tall in a firm chair with your back supported. Look straight ahead, shoulders relaxed and down."
        Movement = "Glide your chin straight back, as if making a double chin."
        Direction = "Straight back, keeping your eyes level — do not tip your head up or down."
        Return = "Hold, then relax your chin forward to the start."
        Dose = { HoldSeconds = Some 5; Reps = Some 10; Sets = Some 2; EachSide = false }
        Target = "Deep neck flexor muscles at the front of the neck."
        Safety = "Stop if you feel sharp pain, dizziness, or tingling down an arm."
        ImageAlt = "Person sitting tall, gliding the chin straight back with eyes level."
        Status = Draft }
      { Id = "str-neck-01"
        AreaId = "neck"
        Section = Stretching
        Name = "Chin-to-chest stretch"
        Start = "Sit tall in a firm chair with your back supported. Look straight ahead, shoulders relaxed and down."
        Movement = "Slowly lower your chin toward your chest until you feel a gentle stretch at the back of the neck."
        Direction = "Straight down — do not force it, and keep your shoulders still."
        Return = "Hold, then slowly lift your head back to the start."
        Dose = { HoldSeconds = Some 20; Reps = Some 3; Sets = Some 1; EachSide = false }
        Target = "Muscles and soft tissue at the back of the neck."
        Safety = "Stretch to gentle tension only — never into sharp pain, dizziness, or tingling."
        ImageAlt = "Person sitting tall, head bowed forward with chin toward the chest."
        Status = Draft }
      { Id = "ex-neck-02"
        AreaId = "neck"
        Section = Exercise
        Name = "Look-up practice"
        Start = "Sit tall in a firm chair with your back supported. Tuck your chin in gently first."
        Movement = "Keeping the chin tucked, slowly tip your head back to look up at the ceiling."
        Direction = "Straight back — move only as far as stays comfortable, keeping shoulders down."
        Return = "Hold, then bring your head back to level."
        Dose = { HoldSeconds = Some 5; Reps = Some 8; Sets = Some 2; EachSide = false }
        Target = "Neck extensor muscles and upper-back posture."
        Safety = "Stop if you feel dizzy, sharp pain, or tingling in the arms or hands."
        ImageAlt = "Person sitting tall with chin tucked, head tipped back to look upward."
        Status = Draft }
      // ── shoulder ──
      { Id = "ex-shoulder-01"
        AreaId = "shoulder"
        Section = Exercise
        Name = "Pendulum swing"
        Start = "Stand beside a table. Lean forward and rest your good hand on the table, letting the sore arm hang loose."
        Movement = "Gently sway your body so the hanging arm swings forward and back like a pendulum."
        Direction = "Forward and back — let the arm hang dead loose, do not lift it with muscle."
        Return = "Let the swing die down to stillness, then stand up slowly."
        Dose = { HoldSeconds = None; Reps = Some 20; Sets = Some 2; EachSide = false }
        Target = "Shoulder joint mobility without loading the sore muscles."
        Safety = "Keep the swing small. Stop if pain rises above a mild ache."
        ImageAlt = "Person leaning on a table, sore arm hanging and swinging gently forward and back."
        Status = Draft }
      { Id = "ex-shoulder-02"
        AreaId = "shoulder"
        Section = Exercise
        Name = "Arm raise forward"
        Start = "Stand tall with your arms hanging, thumbs pointing forward."
        Movement = "Slowly raise the sore arm forward and up, as high as stays comfortable."
        Direction = "Straight forward and up in front of you — do not shrug the shoulder to your ear."
        Return = "Hold briefly, then lower slowly to the start."
        Dose = { HoldSeconds = Some 3; Reps = Some 10; Sets = Some 2; EachSide = false }
        Target = "Front shoulder and shoulder-blade muscles."
        Safety = "Never push through a painful arc — work below the painful point."
        ImageAlt = "Person standing, raising one arm forward and upward with thumb leading."
        Status = Draft }
      { Id = "ex-shoulder-03"
        AreaId = "shoulder"
        Section = Exercise
        Name = "Hands behind the back"
        Start = "Stand tall with your arms hanging loosely at your sides."
        Movement = "Slowly move the sore hand behind your back, as if reaching for a back pocket."
        Direction = "Back and slightly up — keep your trunk upright, do not lean forward."
        Return = "Hold, then bring the hand back to your side."
        Dose = { HoldSeconds = Some 5; Reps = Some 8; Sets = Some 2; EachSide = false }
        Target = "Shoulder extension and the muscles across the front of the shoulder."
        Safety = "Stop if you feel pinching at the front of the shoulder."
        ImageAlt = "Person standing upright, one hand reaching behind the back."
        Status = Draft }
      // ── elbow ──
      { Id = "ex-elbow-01"
        AreaId = "elbow"
        Section = Exercise
        Name = "Elbow bend"
        Start = "Stand or sit tall with the sore arm hanging, palm facing forward."
        Movement = "Slowly bend the elbow, bringing your hand up toward your shoulder."
        Direction = "Straight up in front of you — keep the upper arm still at your side."
        Return = "Hold, then lower slowly until the arm is straight again."
        Dose = { HoldSeconds = Some 3; Reps = Some 12; Sets = Some 2; EachSide = false }
        Target = "Biceps and elbow bending strength."
        Safety = "Move within comfort — do not force a stiff elbow straight or bent."
        ImageAlt = "Person standing, bending one elbow to bring the hand toward the shoulder."
        Status = Draft }
      { Id = "ex-elbow-02"
        AreaId = "elbow"
        Section = Exercise
        Name = "Elbow straightening"
        Start = "Stand or sit tall with the sore elbow bent, hand near the shoulder, palm facing you."
        Movement = "Slowly straighten the elbow, pushing the hand down toward the floor."
        Direction = "Straight down — keep the upper arm still at your side."
        Return = "Hold, then bend back up to the start."
        Dose = { HoldSeconds = Some 3; Reps = Some 12; Sets = Some 2; EachSide = false }
        Target = "Triceps and elbow straightening strength."
        Safety = "Straighten to comfort only — never force a locked elbow."
        ImageAlt = "Person standing, straightening a bent elbow to push the hand downward."
        Status = Draft }
      { Id = "str-elbow-01"
        AreaId = "elbow"
        Section = Stretching
        Name = "Overhead triceps stretch"
        Start = "Stand tall. Raise the sore arm overhead, then bend the elbow so your hand drops behind your head."
        Movement = "With the other hand, gently press the bent elbow further down behind your head."
        Direction = "Down behind the head — keep your ribs down, do not arch your back."
        Return = "Hold, release the pressure, then lower the arm."
        Dose = { HoldSeconds = Some 20; Reps = Some 3; Sets = Some 1; EachSide = false }
        Target = "Triceps along the back of the upper arm."
        Safety = "Gentle tension only — stop if the shoulder pinches."
        ImageAlt = "Person standing with one arm overhead and bent, hand resting behind the head."
        Status = Draft }
      // ── wrist ──
      { Id = "str-wrist-01"
        AreaId = "wrist"
        Section = Stretching
        Name = "Wrist bend stretch"
        Start = "Hold the sore arm out in front, palm facing down."
        Movement = "With the other hand, gently press the back of the sore hand downward until you feel a stretch at the wrist."
        Direction = "Downward — keep the elbow of the sore arm straight."
        Return = "Hold, then release and shake the hand loose."
        Dose = { HoldSeconds = Some 20; Reps = Some 3; Sets = Some 1; EachSide = false }
        Target = "Wrist extensors on the back of the forearm."
        Safety = "Mild tension only — stop with any sharp pain or tingling in the fingers."
        ImageAlt = "Person holding one arm out, pressing the back of that hand downward."
        Status = Draft }
      { Id = "str-wrist-02"
        AreaId = "wrist"
        Section = Stretching
        Name = "Wrist extension stretch"
        Start = "Hold the sore arm out in front, palm facing up."
        Movement = "With the other hand, gently press the fingers back and down until you feel a stretch in the wrist and forearm."
        Direction = "Back and down — keep the elbow of the sore arm straight."
        Return = "Hold, then release and shake the hand loose."
        Dose = { HoldSeconds = Some 20; Reps = Some 3; Sets = Some 1; EachSide = false }
        Target = "Wrist flexors on the front of the forearm."
        Safety = "Mild tension only — stop with any sharp pain or tingling in the fingers."
        ImageAlt = "Person holding one arm out palm up, pressing the fingers gently backward."
        Status = Draft }
      // ── lower back ──
      { Id = "ex-lowerback-01"
        AreaId = "lowerback"
        Section = Exercise
        Name = "Standing pelvic tilt"
        Start = "Stand tall with your back against a wall, feet a small step away, knees soft."
        Movement = "Gently flatten your lower back into the wall by tightening your stomach muscles."
        Direction = "The pelvis rocks slightly — your chest stays still and tall."
        Return = "Hold, then relax and let the natural arch return."
        Dose = { HoldSeconds = Some 5; Reps = Some 10; Sets = Some 2; EachSide = false }
        Target = "Deep abdominal muscles that support the lower back."
        Safety = "Stop if pain spreads down a leg or below the knee."
        ImageAlt = "Person standing against a wall, flattening the lower back into it."
        Status = Draft }
      { Id = "ex-lowerback-02"
        AreaId = "lowerback"
        Section = Exercise
        Name = "Standing back extension"
        Start = "Stand tall with your hands resting on your lower back, elbows pointing back."
        Movement = "Slowly arch backward over your hands, looking slightly upward."
        Direction = "Straight back — a small movement, never forced."
        Return = "Hold, then return upright."
        Dose = { HoldSeconds = Some 5; Reps = Some 8; Sets = Some 2; EachSide = false }
        Target = "Lower-back extensor muscles."
        Safety = "A small movement only. Stop if pain shoots down a leg."
        ImageAlt = "Person standing with hands on the lower back, arching gently backward."
        Status = Draft }
      { Id = "ex-lowerback-03"
        AreaId = "lowerback"
        Section = Exercise
        Name = "Hip hinge practice"
        Start = "Stand tall with feet hip-width apart, hands resting on your thighs."
        Movement = "Push your hips straight back and slide your hands down your thighs, keeping your back flat."
        Direction = "Hips go back, chest stays proud — stop when your back wants to round."
        Return = "Squeeze your buttocks and stand back up tall."
        Dose = { HoldSeconds = None; Reps = Some 10; Sets = Some 2; EachSide = false }
        Target = "Glutes, hamstrings, and safe bending pattern."
        Safety = "Keep the back flat throughout — stop with any sharp back pain."
        ImageAlt = "Person standing, pushing hips back with a flat back, hands sliding down the thighs."
        Status = Draft }
      // ── hip ──
      { Id = "ex-hip-01"
        AreaId = "hip"
        Section = Exercise
        Name = "Mini squat"
        Start = "Stand tall holding a sturdy chair or counter, feet hip-width apart."
        Movement = "Bend your knees and sit back a little, as if starting to sit down."
        Direction = "Straight down a few inches — keep knees over your feet, chest up."
        Return = "Push through your heels and stand back up tall."
        Dose = { HoldSeconds = None; Reps = Some 10; Sets = Some 2; EachSide = false }
        Target = "Quadriceps and glutes for stair and chair strength."
        Safety = "Keep your knees tracking over your feet — stop with sharp knee pain."
        ImageAlt = "Person holding a chair, knees bent in a shallow squat with chest up."
        Status = Draft }
      { Id = "ex-hip-02"
        AreaId = "hip"
        Section = Exercise
        Name = "Sit-to-stand practice"
        Start = "Sit on the front half of a firm chair, feet flat and slightly back, hands on your thighs."
        Movement = "Lean your chest forward over your knees, then push up to standing."
        Direction = "Nose over toes first, then stand — do not pull on furniture with your arms."
        Return = "Stand fully tall, then sit back down slowly with control."
        Dose = { HoldSeconds = None; Reps = Some 8; Sets = Some 2; EachSide = false }
        Target = "Leg strength for getting out of chairs and cars."
        Safety = "Use armrests if you feel unsteady — never risk a fall."
        ImageAlt = "Person rising from a chair, chest forward over the knees."
        Status = Draft }
      { Id = "ex-hip-03"
        AreaId = "hip"
        Section = Exercise
        Name = "Gentle marching"
        Start = "Stand tall holding a sturdy chair or counter with one hand."
        Movement = "Slowly lift one knee toward hip height, then place it back down. Alternate legs."
        Direction = "Straight up and down — keep your trunk tall, do not lean sideways."
        Return = "Each step down is the end of one repetition."
        Dose = { HoldSeconds = None; Reps = Some 10; Sets = Some 2; EachSide = true }
        Target = "Hip flexors and single-leg balance."
        Safety = "Keep a support in reach — stop if your balance feels unsafe."
        ImageAlt = "Person holding a chair, lifting one knee toward hip height."
        Status = Draft }
      // ── knee ──
      { Id = "str-knee-01"
        AreaId = "knee"
        Section = Stretching
        Name = "Standing quadriceps stretch"
        Start = "Stand tall holding a sturdy chair. Bend the sore knee and take hold of your ankle behind you."
        Movement = "Gently pull the heel toward your buttock until you feel a stretch down the front of the thigh."
        Direction = "Straight back — keep your knees together and stand tall, do not arch."
        Return = "Hold, then lower the foot slowly to the floor."
        Dose = { HoldSeconds = Some 20; Reps = Some 3; Sets = Some 1; EachSide = false }
        Target = "Quadriceps on the front of the thigh."
        Safety = "Stretch, not pain — stop with any sharp knee pain."
        ImageAlt = "Person holding a chair, one foot pulled up behind toward the buttock."
        Status = Draft }
      { Id = "str-knee-02"
        AreaId = "knee"
        Section = Stretching
        Name = "Hamstring stretch"
        Start = "Stand facing a low step. Rest the sore heel on the step with the knee straight and toes up."
        Movement = "Keeping your back straight, lean gently forward from the hips until you feel a stretch behind the thigh."
        Direction = "Forward from the hips — do not round your back to reach further."
        Return = "Hold, then stand back upright."
        Dose = { HoldSeconds = Some 20; Reps = Some 3; Sets = Some 1; EachSide = false }
        Target = "Hamstrings at the back of the thigh."
        Safety = "Mild pulling only — stop with pain behind the knee."
        ImageAlt = "Person with one heel on a low step, leaning gently forward with a straight back."
        Status = Draft }
      // ── ankle ──
      { Id = "ex-ankle-01"
        AreaId = "ankle"
        Section = Exercise
        Name = "Ankle pumps"
        Start = "Sit in a firm chair with the sore heel resting on the floor, toes pointing up."
        Movement = "Slowly point your toes away from you, then pull them back toward your shin."
        Direction = "Full slow range both ways — point, then flex, like pressing and releasing a pedal."
        Return = "Each flex back to the start completes one repetition."
        Dose = { HoldSeconds = None; Reps = Some 15; Sets = Some 2; EachSide = false }
        Target = "Calf and shin muscles that move the ankle."
        Safety = "Stop with cramping that does not ease or any sharp pain."
        ImageAlt = "Person seated, foot pointing away then pulling back toward the shin."
        Status = Draft }
      { Id = "ex-ankle-02"
        AreaId = "ankle"
        Section = Exercise
        Name = "Toe raises"
        Start = "Stand tall holding a sturdy chair or counter, feet flat on the floor."
        Movement = "Keeping your heels down, slowly lift the front of both feet off the floor."
        Direction = "Toes rise toward the shins — hold the support lightly for balance."
        Return = "Hold briefly, then lower the forefeet slowly back down."
        Dose = { HoldSeconds = Some 3; Reps = Some 12; Sets = Some 2; EachSide = false }
        Target = "Shin muscles that lift the foot when walking."
        Safety = "Keep support in reach — stop if balance feels unsafe."
        ImageAlt = "Person holding a chair, lifting the fronts of the feet while heels stay down."
        Status = Draft } ]

/// Convenience: items the demo page renders (everything, grouped by area).
let itemsForArea (areaId : string) : Item list =
    items |> List.filter (fun i -> i.AreaId = areaId)

