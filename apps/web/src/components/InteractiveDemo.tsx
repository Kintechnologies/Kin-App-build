"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef, useCallback } from "react";

type BusyLevel = "light" | "moderate" | "packed";
type KidAge = "toddler" | "school" | "teen";
type Household = "single" | "two";

type KidConfig = { age: KidAge };

type Config = {
  household: Household;
  busy1: BusyLevel;
  busy2: BusyLevel;
  kids: KidConfig[];
};

type Reply = {
  prompt: string;
  kinReply: string;
};

type Scenario = {
  briefing: string;
  round1: Reply[];
  round2: Reply[];
  closer: { prompt: string; kinReply: string };
};

type ChatItem =
  | { id: string; role: "kin" | "user"; text: string }
  | { id: string; role: "typing" };

const ACCENT = "#7CB87A";
const KID_NAMES: Record<KidAge, string[]> = {
  school: ["Emma", "Liam", "Mia"],
  toddler: ["Ava", "Noah", "Wren"],
  teen: ["Maya", "Jonah", "Theo"],
};
const P2_NAME = "Sarah";

type Kid = { age: KidAge; name: string };

function assignNames(kids: KidConfig[]): Kid[] {
  const counters = { school: 0, toddler: 0, teen: 0 };
  return kids.map((k) => {
    const idx = counters[k.age]++;
    return { age: k.age, name: KID_NAMES[k.age][idx] ?? KID_NAMES[k.age][0] };
  });
}

function leadLine(kid: Kid, p1: BusyLevel, p2: BusyLevel | null): string {
  const isTwo = p2 !== null;

  if (kid.age === "school") {
    if (p1 === "packed" && isTwo && p2 !== "packed") {
      return `${kid.name}'s got soccer at 4. You're back-to-back until 4:30 — but ${P2_NAME}'s clear after 3, she could grab pickup. Say the word and I'll loop her in.`;
    }
    if (p1 === "packed" && isTwo && p2 === "packed") {
      return `${kid.name}'s got soccer at 4. Both of you are slammed — your gap at 4:00 is the cleanest window, ${P2_NAME}'s free 4:15–4:45. One of you covers, I'll work the rest.`;
    }
    if (p1 === "packed" && !isTwo) {
      return `${kid.name}'s got soccer at 4. Your only window is between your 3pm call and 4:30 standup — I'll ping you 20 min before so you don't get caught.`;
    }
    if (p1 === "moderate" && isTwo && p2 === "packed") {
      return `${kid.name}'s got soccer at 4. ${P2_NAME}'s wall-to-wall today, but you wrap your 2:30 by 3:45 — pickup's on you. I'll set the reminder.`;
    }
    if (p1 === "moderate") {
      return `${kid.name}'s got soccer at 4. You've got a 2:30 call but it should wrap clean — pickup's tight but workable.`;
    }
    return `${kid.name}'s got soccer at 4. Your day's open — easy run, no juggling.`;
  }

  if (kid.age === "toddler") {
    if (p1 === "packed" && isTwo && p2 !== "packed") {
      return `${kid.name}'s daycare pickup is at 5:30. You're slammed all afternoon — ${P2_NAME}'s clear after 4, she's the one. I'll confirm with her.`;
    }
    if (p1 === "packed" && !isTwo) {
      return `${kid.name}'s daycare pickup is at 5:30. You've got back-to-back until 5 — I've already moved your 5:15 call to 5:50 to buy you the runway.`;
    }
    if (p1 === "packed" && isTwo && p2 === "packed") {
      return `${kid.name}'s daycare pickup is at 5:30. You're both buried — your 5pm wraps fastest, you've got the best shot. I'll flag at 5:10.`;
    }
    if (p1 === "moderate") {
      return `${kid.name}'s daycare pickup is at 5:30. Your 4pm runs long sometimes — I'll watch it and bump your 5:15 if it slides past 5.`;
    }
    return `${kid.name}'s daycare pickup is at 5:30. Day's open — plenty of room. Nap window's 1–3 if you want quiet hours.`;
  }

  if (p1 === "packed" && isTwo && p2 !== "packed") {
    return `${kid.name}'s got lacrosse 4–6. You're booked through 5:30 — but ${P2_NAME}'s clear after 4, she could swing by and watch the back half.`;
  }
  if (p1 === "packed" && !isTwo) {
    return `${kid.name}'s got lacrosse 4–6. You're booked through 5:30 — ${kid.name}'s old enough to ride home with Coach Devon, he offered last week. I can confirm.`;
  }
  if (p1 === "moderate") {
    return `${kid.name}'s got lacrosse 4–6. You've got a 5pm call — drop-off's clean, ${kid.name} can ride home with the Petersons.`;
  }
  return `${kid.name}'s got lacrosse 4–6. Your day's clear — go watch the back half if you can, ${kid.name} mentioned wanting you there.`;
}

function secondaryLine(
  kid: Kid,
  slotIdx: number,
  p2: BusyLevel | null,
): string {
  const isTwo = p2 !== null;

  if (kid.age === "school") {
    if (slotIdx === 1) {
      return isTwo
        ? `${kid.name}'s got the dentist at 3:30. ${P2_NAME}'s planning to handle that one.`
        : `${kid.name}'s got the dentist at 3:30. I've slid your 3pm to 3:15 so you've got a clean 30-min buffer.`;
    }
    return isTwo
      ? `${kid.name} has a playdate at the Kims' 5–7. ${P2_NAME}'ll do drop-off, you've got pickup.`
      : `${kid.name}'s at the Kims' 5–7. Pickup's on you — I'll remind at 6:45.`;
  }

  if (kid.age === "toddler") {
    if (slotIdx === 1) {
      return isTwo
        ? `${kid.name}'s nap window is 1–3. ${P2_NAME}'s home — protected hours, no calls scheduled there.`
        : `${kid.name}'s nap window is 1–3. I've blocked it on your calendar already — only your 2pm with Marcus is in there, want me to push it?`;
    }
    return isTwo
      ? `${kid.name}'s got swim at 4. ${P2_NAME}'s on it, she's bringing snacks.`
      : `${kid.name}'s got swim at 4. I've laid out the gear bag in your reminders so you don't forget the goggles again.`;
  }

  if (slotIdx === 1) {
    return isTwo
      ? `${kid.name}'s SAT prep is 6–8. ${P2_NAME}'s doing the drop, just keep dinner light.`
      : `${kid.name}'s SAT prep is 6–8. Drop-off's on you — leave by 5:40, traffic's been ugly this week.`;
  }
  return isTwo
    ? `${kid.name} has driver's ed at 5. ${P2_NAME}'ll handle it.`
    : `${kid.name} has driver's ed at 5. You'll need to leave your 4:30 by 4:45 sharp.`;
}

function headsUp(c: Config, kids: Kid[]): string {
  const isTwo = c.household === "two";
  const anyPacked = c.busy1 === "packed" || (isTwo && c.busy2 === "packed");
  const allLight = c.busy1 === "light" && (!isTwo || c.busy2 === "light");

  if (allLight) {
    return `Heads up: nothing on fire. Quiet day. Want me to slot in something nice — coffee, a walk, the thing you've been putting off?`;
  }

  if (anyPacked && kids.length >= 2) {
    return `Heads up: tight stretch 4–6. I'll watch the seams and flag if anything slides.`;
  }

  if (anyPacked) {
    return `Heads up: dinner's still TBD — you haven't decided since Tuesday. Want a few options?`;
  }

  if (kids.some((k) => k.age === "teen")) {
    return `Heads up: ${kids.find((k) => k.age === "teen")!.name}'s big game is Friday. Calendar's clear if you want to go.`;
  }

  return `Heads up: pickup's the only pressure point today. Otherwise smooth.`;
}

function buildBriefing(c: Config): string {
  const kids = assignNames(c.kids);
  const p2 = c.household === "two" ? c.busy2 : null;

  let out = "Morning. Here's today —\n\n";
  out += leadLine(kids[0], c.busy1, p2);

  if (kids.length >= 2) {
    out += `\n\n${secondaryLine(kids[1], 1, p2)}`;
  }
  if (kids.length >= 3) {
    out += `\n\n${secondaryLine(kids[2], 2, p2)}`;
  }

  out += `\n\n${headsUp(c, kids)}`;
  return out;
}

function buildReplies(c: Config): { round1: Reply[]; round2: Reply[]; closer: Reply } {
  const kids = assignNames(c.kids);
  const k1 = kids[0];
  const isTwo = c.household === "two";
  const anyPacked = c.busy1 === "packed" || (isTwo && c.busy2 === "packed");

  const round1: Reply[] = [];
  const round2: Reply[] = [];

  // Round 1 option A: handoff or coverage question
  if (isTwo && c.busy1 === "packed" && c.busy2 !== "packed") {
    round1.push({
      prompt: `Yes, ask ${P2_NAME} to grab ${k1.name}`,
      kinReply: `On it. Just messaged ${P2_NAME} — she's locked in for 4. I'll send you both a heads-up at 3:45 so neither of you blanks on it.`,
    });
  } else if (!isTwo && c.busy1 === "packed") {
    round1.push({
      prompt: `Who can grab ${k1.name} if I'm late?`,
      kinReply: `I've got Mike on speed-dial — he picked up last month, said anytime. Want me to text him a soft heads-up so he's around?`,
    });
  } else if (isTwo && c.busy1 === "packed" && c.busy2 === "packed") {
    round1.push({
      prompt: `I'll grab ${k1.name}`,
      kinReply: `Locked in. Telling ${P2_NAME} she's clear. I'll buffer your 3:30 to end at 3:50 so you've got runway.`,
    });
  } else {
    round1.push({
      prompt: `What time does ${k1.age === "toddler" ? "daycare" : k1.age === "teen" ? "lacrosse" : "soccer"} actually end?`,
      kinReply:
        k1.age === "toddler"
          ? `Daycare closes at 6 sharp — they charge after. ${k1.name}'s usually ready by 5:15 if you want to grab early.`
          : k1.age === "teen"
            ? `6:00 on paper, closer to 6:20 if Coach Devon runs scrimmage. I'll watch and ping if it slips.`
            : `5:15 official, but Coach usually wraps closer to 5:30 if there's a scrimmage. I'll watch and let you know.`,
    });
  }

  // Round 1 option B: meeting management
  if (c.busy1 === "packed" || c.busy1 === "moderate") {
    round1.push({
      prompt: `Move my 3pm meeting`,
      kinReply: `Done — pushed to 3:30 with Marcus. He confirmed. That gives you a clean 45-min runway before pickup.`,
    });
  } else {
    round1.push({
      prompt: `Add a coffee with ${isTwo ? P2_NAME : "Mom"} at 2`,
      kinReply: `Booked. ${isTwo ? `Told ${P2_NAME} — she's in. Sent you both a calendar invite.` : `Texted her — she'll meet you at Mercato. Confirmed.`}`,
    });
  }

  // Round 1 option C: read the day / what am I forgetting
  round1.push({
    prompt: `Anything I'm forgetting?`,
    kinReply:
      kids.find((k) => k.age === "school")
        ? `Permission slip for ${kids.find((k) => k.age === "school")!.name}'s field trip — due Friday. Reminder set for tonight after bedtime so you're not scrambling.`
        : kids.find((k) => k.age === "toddler")
          ? `${kids.find((k) => k.age === "toddler")!.name}'s diapers are running low — I added them to your grocery list and pushed it to ${isTwo ? P2_NAME : "Instacart"}.`
          : `${kids[0].name}'s recommendation letter for the summer program — deadline's next Thursday. I drafted three teacher options if you want to look.`,
  });

  // Round 2: follow-ups (always 2)
  if (isTwo) {
    round2.push({
      prompt: `Tell ${P2_NAME} I owe her`,
      kinReply: `Done — and she said "you owe me bedtime." I'm on the bedtime reminder for 7:45.`,
    });
  } else {
    round2.push({
      prompt: anyPacked ? `Push everything tomorrow` : `Block 30 min for me to breathe`,
      kinReply: anyPacked
        ? `Walked your calendar. Tomorrow's actually lighter — kept your 9am, slid the rest to Thursday. Three meetings cleared.`
        : `Blocked 2:30–3:00, no notifications. Coffee, walk, whatever. I'll hold the line.`,
    });
  }

  round2.push({
    prompt: `What's tomorrow look like?`,
    kinReply: anyPacked
      ? `Lighter — ${kids[0].name}'s free, you've got one 9am and a 2pm. ${isTwo ? `${P2_NAME}'s wall-to-wall but only morning. ` : ""}I'll send the full briefing at 6.`
      : `Calm. ${kids[0].name}'s got ${kids[0].age === "toddler" ? "swim 9am" : "school as usual"}, you've got the afternoon open. Real shot at a slow morning.`,
  });

  return {
    round1,
    round2,
    closer: {
      prompt: `Sounds good`,
      kinReply: `I'll keep watch. Talk in a bit.`,
    },
  };
}

function generateScenario(c: Config): Scenario {
  const briefing = buildBriefing(c);
  const { round1, round2, closer } = buildReplies(c);
  return { briefing, round1, round2, closer };
}

// ---- UI components ----

function ConfigStep({ onSubmit }: { onSubmit: (c: Config) => void }) {
  const [household, setHousehold] = useState<Household>("two");
  const [busy1, setBusy1] = useState<BusyLevel>("packed");
  const [busy2, setBusy2] = useState<BusyLevel>("moderate");
  const [kids, setKids] = useState<KidConfig[]>([{ age: "school" }]);

  const setKidCount = (n: number) => {
    setKids((prev) => {
      if (n === prev.length) return prev;
      if (n > prev.length) {
        const additions: KidConfig[] = [];
        for (let i = prev.length; i < n; i++) {
          additions.push({ age: i === 1 ? "toddler" : "teen" });
        }
        return [...prev, ...additions];
      }
      return prev.slice(0, n);
    });
  };

  const setKidAge = (idx: number, age: KidAge) => {
    setKids((prev) => prev.map((k, i) => (i === idx ? { age } : k)));
  };

  const submit = () => {
    onSubmit({ household, busy1, busy2, kids });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      style={{
        width: "100%",
        maxWidth: "560px",
        margin: "0 auto",
        background: "#141810",
        border: "1px solid rgba(255,255,255,0.07)",
        borderRadius: "20px",
        padding: "clamp(20px, 5vw, 32px)",
        boxShadow:
          "-3px -3px 8px rgba(255,255,255,0.025), 4px 4px 18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      <ConfigGroup label="Your household">
        <SegRow>
          <SegBtn active={household === "single"} onClick={() => setHousehold("single")}>
            Single parent
          </SegBtn>
          <SegBtn active={household === "two"} onClick={() => setHousehold("two")}>
            Two parents
          </SegBtn>
        </SegRow>
      </ConfigGroup>

      <ConfigGroup label={household === "two" ? "How busy are you today?" : "How busy is today?"}>
        <SegRow>
          {(["light", "moderate", "packed"] as BusyLevel[]).map((lvl) => (
            <SegBtn key={lvl} active={busy1 === lvl} onClick={() => setBusy1(lvl)}>
              {lvl[0].toUpperCase() + lvl.slice(1)}
            </SegBtn>
          ))}
        </SegRow>
      </ConfigGroup>

      <AnimatePresence>
        {household === "two" && (
          <motion.div
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 0 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            transition={{ duration: 0.3 }}
            style={{ overflow: "hidden" }}
          >
            <ConfigGroup label={`How busy is ${P2_NAME}?`}>
              <SegRow>
                {(["light", "moderate", "packed"] as BusyLevel[]).map((lvl) => (
                  <SegBtn key={lvl} active={busy2 === lvl} onClick={() => setBusy2(lvl)}>
                    {lvl[0].toUpperCase() + lvl.slice(1)}
                  </SegBtn>
                ))}
              </SegRow>
            </ConfigGroup>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfigGroup label="How many kids?">
        <SegRow>
          {[1, 2, 3].map((n) => (
            <SegBtn key={n} active={kids.length === n} onClick={() => setKidCount(n)}>
              {n}
            </SegBtn>
          ))}
        </SegRow>
      </ConfigGroup>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}>
        {kids.map((k, i) => (
          <ConfigGroup
            key={i}
            label={`Kid ${i + 1} age`}
            inline
          >
            <SegRow>
              {(["toddler", "school", "teen"] as KidAge[]).map((age) => (
                <SegBtn key={age} active={k.age === age} onClick={() => setKidAge(i, age)}>
                  {age === "toddler" ? "Toddler" : age === "school" ? "School-age" : "Teen"}
                </SegBtn>
              ))}
            </SegRow>
          </ConfigGroup>
        ))}
      </div>

      <motion.button
        whileHover={{ scale: 1.015 }}
        whileTap={{ scale: 0.985 }}
        onClick={submit}
        style={{
          width: "100%",
          fontSize: "15px",
          fontWeight: 500,
          color: "#0C0F0A",
          background: ACCENT,
          padding: "14px 28px",
          borderRadius: "12px",
          letterSpacing: "-0.2px",
          boxShadow: "0 0 24px rgba(124,184,122,0.28), 0 0 48px rgba(124,184,122,0.08)",
          cursor: "pointer",
          border: "none",
        }}
      >
        Try it
      </motion.button>
    </motion.div>
  );
}

function ConfigGroup({
  label,
  children,
  inline,
}: {
  label: string;
  children: React.ReactNode;
  inline?: boolean;
}) {
  return (
    <div
      style={{
        marginBottom: inline ? 0 : "22px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 500,
          color: "rgba(240,237,230,0.45)",
          fontFamily: "var(--font-geist-mono), monospace",
          letterSpacing: "1.2px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
}

function SegRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        flexWrap: "wrap",
      }}
    >
      {children}
    </div>
  );
}

function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: "1 1 0",
        minWidth: "60px",
        background: active ? "rgba(124,184,122,0.12)" : "#1c211a",
        border: active
          ? "1px solid rgba(124,184,122,0.5)"
          : "1px solid rgba(255,255,255,0.07)",
        borderRadius: "10px",
        padding: "10px 14px",
        fontSize: "13px",
        fontWeight: 500,
        color: active ? ACCENT : "rgba(240,237,230,0.78)",
        cursor: "pointer",
        letterSpacing: "-0.1px",
        transition: "all 180ms ease",
        boxShadow: active
          ? "inset 0 0 0 1px rgba(124,184,122,0.1), 0 0 18px rgba(124,184,122,0.08)"
          : "inset -1px -1px 2px rgba(255,255,255,0.015), inset 1px 1px 2px rgba(0,0,0,0.3)",
      }}
    >
      {children}
    </button>
  );
}

// ---- Phone mockup ----

function PhoneMockup({
  config,
  onReset,
}: {
  config: Config;
  onReset: () => void;
}) {
  const scenario = useRef<Scenario>(generateScenario(config));
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [stage, setStage] = useState<
    "boot" | "round1" | "round2" | "closer" | "done"
  >("boot");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const idCounter = useRef(0);

  const nextId = () => `m${idCounter.current++}`;

  const pushTyping = useCallback(() => {
    const id = nextId();
    setChat((prev) => [...prev, { id, role: "typing" }]);
    return id;
  }, []);

  const replaceTyping = useCallback((typingId: string, role: "kin" | "user", text: string) => {
    setChat((prev) =>
      prev.map((m) => (m.id === typingId ? { id: typingId, role, text } : m)),
    );
  }, []);

  const append = useCallback((role: "kin" | "user", text: string) => {
    setChat((prev) => [...prev, { id: nextId(), role, text }]);
  }, []);

  // Boot sequence: typing → briefing
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setBusy(true);
      const tid = pushTyping();
      await wait(1200);
      if (cancelled) return;
      replaceTyping(tid, "kin", scenario.current.briefing);
      await wait(700);
      if (cancelled) return;
      setStage("round1");
      setBusy(false);
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [chat]);

  const onSelect = async (reply: Reply, nextStage: "round2" | "closer" | "done") => {
    if (busy) return;
    setBusy(true);
    append("user", reply.prompt);
    await wait(450);
    const tid = pushTyping();
    await wait(1100);
    replaceTyping(tid, "kin", reply.kinReply);
    await wait(500);
    setStage(nextStage);
    setBusy(false);
  };

  const currentOptions: Reply[] =
    stage === "round1"
      ? scenario.current.round1
      : stage === "round2"
        ? scenario.current.round2
        : stage === "closer"
          ? [scenario.current.closer]
          : [];

  const advanceTo: "round2" | "closer" | "done" =
    stage === "round1" ? "round2" : stage === "round2" ? "closer" : "done";

  const isMobile = useIsMobile();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "20px",
      }}
    >
      <div
        style={
          isMobile
            ? {
                width: "100%",
                maxWidth: "440px",
                background: "#0d0d0d",
                borderRadius: "20px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                height: "min(680px, 85vh)",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.06), 0 0 40px rgba(124,184,122,0.08), 0 16px 40px rgba(0,0,0,0.6)",
                position: "relative",
              }
            : {
                width: "360px",
                aspectRatio: "9 / 19",
                background: "#0a0a0a",
                borderRadius: "44px",
                padding: "10px",
                boxShadow:
                  "0 0 0 2px rgba(255,255,255,0.06), 0 0 60px rgba(124,184,122,0.1), 0 30px 80px rgba(0,0,0,0.7)",
                position: "relative",
              }
        }
      >
        {/* Notch — desktop only */}
        {!isMobile && (
          <div
            style={{
              position: "absolute",
              top: "18px",
              left: "50%",
              transform: "translateX(-50%)",
              width: "100px",
              height: "26px",
              background: "#000",
              borderRadius: "16px",
              zIndex: 5,
            }}
          />
        )}

        {/* Screen */}
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "#0d0d0d",
            borderRadius: isMobile ? "0" : "36px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            position: "relative",
          }}
        >
          {/* Status bar — desktop only (drop on mobile so the chat owns vertical space) */}
          {!isMobile && (
            <div
              style={{
                padding: "16px 28px 10px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "13px",
                fontWeight: 600,
                color: "#fff",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span>6:02</span>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <SignalIcon />
                <WifiIcon />
                <BatteryIcon />
              </div>
            </div>
          )}

          {/* Header */}
          <div
            style={{
              padding: isMobile ? "14px 16px 12px" : "10px 16px 12px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "rgba(20,20,22,0.6)",
              backdropFilter: "blur(20px)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                background: "rgba(124,184,122,0.14)",
                border: "1px solid rgba(124,184,122,0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="18" height="18" viewBox="0 0 64 64" fill="none">
                <circle cx="32" cy="20" r="8" fill={ACCENT} />
                <circle cx="21.75" cy="37.9" r="9" fill={ACCENT} />
                <circle cx="42.25" cy="37.9" r="9" fill={ACCENT} />
              </svg>
            </div>
            <span
              style={{
                fontSize: "13px",
                fontWeight: 500,
                color: "#fff",
                letterSpacing: "-0.1px",
              }}
            >
              Kin
            </span>
            <span
              style={{
                fontSize: "10px",
                color: "rgba(255,255,255,0.38)",
                fontFamily: "var(--font-geist-mono), monospace",
                letterSpacing: "0.5px",
              }}
            >
              SMS
            </span>
          </div>

          {/* Chat area */}
          <div
            ref={scrollRef}
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "16px 12px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              scrollbarWidth: "none",
              minHeight: 0,
            }}
          >
            <div
              style={{
                textAlign: "center",
                fontSize: "10px",
                color: "rgba(255,255,255,0.32)",
                margin: "4px 0 12px",
                fontWeight: 500,
              }}
            >
              Today 6:02 AM
            </div>

            <AnimatePresence initial={false}>
              {chat.map((item) => (
                <Bubble key={item.id} item={item} />
              ))}
            </AnimatePresence>
          </div>

          {/* Reply chips area */}
          <div
            style={{
              padding: "10px 12px 16px",
              borderTop: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(15,15,17,0.7)",
              minHeight: "62px",
              display: "flex",
              flexDirection: "column",
              gap: "6px",
            }}
          >
            {!busy && currentOptions.length > 0 && stage !== "done" && (
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "6px",
                }}
              >
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.32)",
                    fontFamily: "var(--font-geist-mono), monospace",
                    letterSpacing: "1px",
                    textTransform: "uppercase",
                    paddingLeft: "4px",
                  }}
                >
                  Tap to reply
                </span>
                <div
                  style={{
                    display: "flex",
                    gap: "6px",
                    flexWrap: "wrap",
                  }}
                >
                  {currentOptions.map((opt, i) => (
                    <ReplyChip
                      key={`${stage}-${i}`}
                      text={opt.prompt}
                      onClick={() => onSelect(opt, advanceTo)}
                      index={i}
                    />
                  ))}
                </div>
              </motion.div>
            )}
            {stage === "done" && (
              <motion.div
                key="done"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    color: "rgba(255,255,255,0.4)",
                    fontStyle: "italic",
                    letterSpacing: "-0.1px",
                  }}
                >
                  That&apos;s a real morning with Kin.
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onReset}
        style={{
          background: "transparent",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "8px",
          padding: "8px 16px",
          fontSize: "12px",
          color: "rgba(240,237,230,0.6)",
          cursor: "pointer",
          letterSpacing: "-0.1px",
          transition: "all 180ms ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "rgba(124,184,122,0.4)";
          e.currentTarget.style.color = ACCENT;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)";
          e.currentTarget.style.color = "rgba(240,237,230,0.6)";
        }}
      >
        ← Try a different setup
      </button>
    </motion.div>
  );
}

function Bubble({ item }: { item: ChatItem }) {
  if (item.role === "typing") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        style={{
          display: "flex",
          justifyContent: "flex-start",
          padding: "2px 0",
        }}
      >
        <div
          style={{
            background: "#1f1f22",
            borderRadius: "18px 18px 18px 4px",
            padding: "10px 14px",
            display: "flex",
            gap: "4px",
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              animate={{ opacity: [0.3, 0.85, 0.3], y: [0, -2, 0] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.18,
              }}
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.6)",
              }}
            />
          ))}
        </div>
      </motion.div>
    );
  }

  const isKin = item.role === "kin";
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      style={{
        display: "flex",
        justifyContent: isKin ? "flex-start" : "flex-end",
        padding: "1px 0",
      }}
    >
      <div
        style={{
          background: isKin ? "#1f1f22" : "#34C759",
          color: isKin ? "#F0EDE6" : "#0a1f0a",
          borderRadius: isKin ? "18px 18px 18px 4px" : "18px 18px 4px 18px",
          padding: "9px 14px",
          maxWidth: "78%",
          fontSize: "14px",
          lineHeight: 1.42,
          letterSpacing: "-0.1px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontWeight: isKin ? 400 : 500,
          boxShadow: isKin
            ? "0 1px 2px rgba(0,0,0,0.35)"
            : "0 1px 2px rgba(0,0,0,0.4), 0 0 18px rgba(52,199,89,0.18)",
        }}
      >
        {item.text}
      </div>
    </motion.div>
  );
}

function ReplyChip({
  text,
  onClick,
  index,
}: {
  text: string;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.06 }}
      whileTap={{ scale: 0.96 }}
      whileHover={{ y: -1 }}
      onClick={onClick}
      style={{
        background: "rgba(124,184,122,0.1)",
        border: "1px solid rgba(124,184,122,0.35)",
        borderRadius: "16px",
        padding: "7px 12px",
        fontSize: "12.5px",
        color: "#9DD49B",
        cursor: "pointer",
        letterSpacing: "-0.1px",
        fontWeight: 500,
        textAlign: "left",
        lineHeight: 1.3,
      }}
    >
      {text}
    </motion.button>
  );
}

// ---- Status bar icons ----

function SignalIcon() {
  return (
    <svg width="16" height="10" viewBox="0 0 16 10" fill="none">
      {[2, 4, 6, 8].map((h, i) => (
        <rect key={i} x={i * 3.5} y={10 - h} width="2.5" height={h} fill="#fff" rx="0.5" />
      ))}
    </svg>
  );
}
function WifiIcon() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
      <path d="M7 2.5C9.5 2.5 11.7 3.4 13 4.6L11.5 6.2C10.3 5.2 8.7 4.5 7 4.5C5.3 4.5 3.7 5.2 2.5 6.2L1 4.6C2.3 3.4 4.5 2.5 7 2.5Z" fill="#fff"/>
      <path d="M7 5.5C8.4 5.5 9.6 6 10.4 6.7L8.9 8.1C8.4 7.7 7.7 7.5 7 7.5C6.3 7.5 5.6 7.7 5.1 8.1L3.6 6.7C4.4 6 5.6 5.5 7 5.5Z" fill="#fff"/>
      <circle cx="7" cy="9" r="1" fill="#fff"/>
    </svg>
  );
}
function BatteryIcon() {
  return (
    <svg width="22" height="10" viewBox="0 0 22 10" fill="none">
      <rect x="0.5" y="0.5" width="18" height="9" rx="2" stroke="#fff" strokeOpacity="0.5"/>
      <rect x="2" y="2" width="15" height="6" rx="1" fill="#fff"/>
      <rect x="19.5" y="3" width="1.5" height="4" rx="0.5" fill="#fff" fillOpacity="0.5"/>
    </svg>
  );
}

// ---- Helpers ----

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [breakpoint]);
  return isMobile;
}

// ---- Main exported section ----

export function InteractiveDemo() {
  const [config, setConfig] = useState<Config | null>(null);

  return (
    <section
      id="demo"
      style={{
        padding: "clamp(64px, 10vw, 100px) clamp(16px, 4vw, 24px) 60px",
        maxWidth: "920px",
        margin: "0 auto",
        position: "relative",
      }}
    >
      {/* Divider */}
      <motion.div
        initial={{ scaleX: 0 }}
        whileInView={{ scaleX: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(124,184,122,0.3), transparent)",
          marginBottom: "64px",
          transformOrigin: "center",
        }}
      />

      <div style={{ textAlign: "center", marginBottom: "44px" }}>
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "rgba(240,237,230,0.35)",
            fontFamily: "var(--font-geist-mono), monospace",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            marginBottom: "20px",
          }}
        >
          Try Kin — no signup
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.65, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontSize: "clamp(26px, 4vw, 36px)",
            fontWeight: 600,
            color: "#F0EDE6",
            letterSpacing: "-0.8px",
            lineHeight: 1.2,
            marginBottom: "16px",
            maxWidth: "640px",
            margin: "0 auto 16px",
          }}
        >
          See your morning briefing.{" "}
          <span style={{ color: ACCENT }}>Tell us about your house.</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          style={{
            fontSize: "15px",
            color: "rgba(240,237,230,0.5)",
            lineHeight: 1.6,
            fontStyle: "italic",
            maxWidth: "480px",
            margin: "0 auto",
          }}
        >
          Pick a setup. We&apos;ll show you the 6am text Kin would actually send.
        </motion.p>
      </div>

      {config === null ? (
        <ConfigStep onSubmit={setConfig} />
      ) : (
        <PhoneMockup config={config} onReset={() => setConfig(null)} />
      )}
    </section>
  );
}
