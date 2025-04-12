// PF2e Counteract Macro for Foundry VTT — v5
// Prompts for your base modifier, situational bonuses/penalties, DC, your counter‑act rank, and the opposing rank.
// Rolls a d20 (or re‑uses the last roll) and evaluates PF2e counteract results.
// New in v5
//   • Optional **Secret (GM‑only)** roll & result toggle
//   • Degree of Success text is now capitalized (Success, Critical Success, etc.)
//   • Chat card continues to display ranks, DC, and full roll breakdown.

(async () => {
  const content = `
  <form>
    <div class="form-group">
      <label>Base Modifier</label>
      <input type="number" name="modifier" value="0"/>
    </div>
    <div class="form-group">
      <label>Bonuses / Penalties</label>
      <input type="number" name="bonus" value="0"/>
    </div>
    <div class="form-group">
      <label>Opposing DC</label>
      <input type="number" name="dc" value="20"/>
    </div>
    <div class="form-group">
      <label>Your Counteract Rank</label>
      <input type="number" name="yourRank" value="1"/>
    </div>
    <div class="form-group">
      <label>Opposing Rank</label>
      <input type="number" name="oppRank" value="1"/>
    </div>
    <div class="form-group">
      <label>Secret (GM Only)</label>
      <input type="checkbox" name="secret"/>
    </div>
  </form>`;

  // Helper to evaluate result and send chat card
  async function resolveCounteract({roll, mod, bonus, dc, yourRank, oppRank, secret}) {
    const total = roll.total + mod + bonus; // Add base modifier and situational bonuses/penalties

    // Determine degree of success per PF2e rules (capitalized)
    const diff = total - dc;
    let degree = diff >= 10 ? 'Critical Success' :
                 diff >= 0  ? 'Success' :
                 diff <= -10 ? 'Critical Failure' : 'Failure';

    // Rank superiority: upgrade failure to success if your rank > opposing rank (unless crit failure)
    if (yourRank > oppRank && degree === 'Failure') degree = 'Success';

    // Check level caps to see if the effect is actually counteracted
    let counteracted = false;
    if (degree === 'Critical Success') {
      counteracted = yourRank <= oppRank + 3;
    } else if (degree === 'Success') {
      counteracted = yourRank <= oppRank + 1;
    }

    const resultText = counteracted ? '<span class="success">Effect Counteracted!</span>' : '<span class="failure">Effect NOT Counteracted.</span>';

    const modString = mod ? ` + ${mod}` : '';
    const bonusString = bonus ? ` ${bonus >= 0 ? '+ ' : '- '}${Math.abs(bonus)}` : '';

    const chatContent = `
      <div class="pf2e chat-card">
        <header class="card-header flexrow">
          <img src="icons/svg/d20-black.svg" width="36" height="36" />
          <h3>Counteract Check</h3>
        </header>
        <div class="card-content">
          <p><strong>Roll:</strong> ${roll.result}${modString}${bonusString}= <strong>${total}</strong></p>
          <p><strong>DC:</strong> ${dc}</p>
          <p><strong>Your Rank / Opposing Rank:</strong> ${yourRank} / ${oppRank}</p>
          <p><strong>Degree of Success:</strong> ${degree}</p>
          <p>${resultText}</p>
        </div>
      </div>`;

    const messageData = {
      user: game.user.id,
      speaker: ChatMessage.getSpeaker(),
      content: chatContent,
      type: CONST.CHAT_MESSAGE_TYPES.ROLL,
      roll
    };

    if (secret) {
      messageData.whisper = ChatMessage.getWhisperRecipients("GM");
      messageData.blind = true;
    }

    ChatMessage.create(messageData);
  }

  new Dialog({
    title: "Counteract Check",
    content,
    buttons: {
      roll: {
        icon: '<i class="fas fa-dice-d20"></i>',
        label: "Roll",
        callback: async html => {
          const mod = Number(html.find('[name="modifier"]').val());
          const bonus = Number(html.find('[name="bonus"]').val());
          const dc = Number(html.find('[name="dc"]').val());
          const yourRank = Number(html.find('[name="yourRank"]').val());
          const oppRank = Number(html.find('[name="oppRank"]').val());
          const secret = html.find('[name="secret"]')[0].checked;

          const roll = await (new Roll('1d20')).roll({async:false});
          await roll.toMessage({flavor: "Counteract d20 Roll", whisper: secret ? ChatMessage.getWhisperRecipients("GM") : [], blind: secret});
          resolveCounteract({roll, mod, bonus, dc, yourRank, oppRank, secret});
        }
      },
      useLast: {
        icon: '<i class="fas fa-history"></i>',
        label: "Use Last Roll",
        callback: html => {
          const lastMsg = [...game.messages].reverse().find(m => m.user.id === game.user.id && m.isRoll && m.rolls?.length);
          if (!lastMsg) {
            ui.notifications.warn("No previous roll found for your user.");
            return;
          }
          const roll = lastMsg.rolls[0];

          const mod = Number(html.find('[name="modifier"]').val());
          const bonus = Number(html.find('[name="bonus"]').val());
          const dc = Number(html.find('[name="dc"]').val());
          const yourRank = Number(html.find('[name="yourRank"]').val());
          const oppRank = Number(html.find('[name="oppRank"]').val());
          const secret = html.find('[name="secret"]')[0].checked;

          resolveCounteract({roll, mod, bonus, dc, yourRank, oppRank, secret});
        }
      },
      cancel: {
        label: 'Cancel'
      }
    },
    default: 'roll'
  }).render(true);
})();
