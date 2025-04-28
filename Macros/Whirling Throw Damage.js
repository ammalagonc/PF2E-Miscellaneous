// ============================================================================
// PF2e Macros Collection (Counteract + Whirling Throw) — Foundry VTT
// ============================================================================
// This file bundles two standalone macros:
//   1. Counteract Check (v6)   — unchanged placeholder.
//   2. Whirling Throw Damage (v6) — zero‑input, auto‑reads Str mod, with rule
//      adjustment: if Str mod ≤ 0, damage is a flat 1d6.
// Copy each IIFE into its own Foundry script‑macro slot.
// ----------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1) Counteract Check — v6 (unchanged)
// ---------------------------------------------------------------------------

// <Counteract Check macro code remains exactly as in v6. Removed here for brevity>

// ---------------------------------------------------------------------------
// 2) Whirling Throw Damage Macro — v6 (zero‑input, Str≤0 → 1d6)
// ---------------------------------------------------------------------------
// • Pulls Strength modifier from the first controlled token’s actor, or from
//   the user’s assigned character. Warns if no actor.
// • Distance = max(0, 10 ft + 5 ft × Str mod). Normally damage is Str mod +
//   1d6 per 10 ft, but if Str mod ≤ 0, damage is a flat 1d6.
// • Posts clickable @Damage syntax immediately.
// ---------------------------------------------------------------------------

(async () => {
    function getStrMod() {
      const t = canvas?.tokens?.controlled?.[0];
      const actor = t?.actor ?? game.user.character ?? null;
      return actor?.system?.abilities?.str?.mod ?? null;
    }
  
    const strMod = getStrMod();
    if (strMod === null) {
      return ui.notifications.warn("Whirling Throw: No actor selected and no assigned character found.");
    }
  
    // Calculate distance (still useful for flavor)
    const distance = Math.max(0, 10 + (strMod * 5));
    let diceCount = Math.floor(distance / 10);
  
    let dicePart, modPart;
    if (strMod <= 0) {
      dicePart = "1d6"; // rule override for Str 0 or negative
      modPart = "";
      diceCount = 1; // for flavor display
    } else {
      // Ensure at least 1d6 even on anomalous low distance
      dicePart = diceCount > 0 ? `${diceCount}d6` : "1d6";
      modPart = ` + ${strMod}`;
    }
  
    const damageSyntax = `@Damage[( ${dicePart}${modPart} )[untyped]]`;
    const flavor = `<strong>Whirling Throw Damage</strong><br>(Distance: ${distance} ft → ${diceCount}d6)`;
  
    ChatMessage.create({
      user: game.user.id,
      speaker: ChatMessage.getSpeaker(),
      content: `${flavor}<br>${damageSyntax}`
    });
  })();