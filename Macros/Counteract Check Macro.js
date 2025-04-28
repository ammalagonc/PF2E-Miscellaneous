// PF2e Counteract Macro for Foundry VTT — v6
// Prompts for your base modifier (for new rolls), optional situational bonus/penalty,
// DC, your counter‑act rank, and the opposing rank.
// Two ways to feed a roll:
//   • **Roll** button → rolls d20 and adds Base Modifier + Bonus/Penalty.
//   • **Use Last Total** button → pulls the *total* of your most recent d20 roll in chat
//     (so it already contains any modifiers), then adds only the Bonus/Penalty.
// Implements PF2e counteract logic with secret‑roll option and capitalized degree results.

(async () => {
  const content = `
  <form>
    <div class="form-group">
      <label>Base Modifier <small>(ignored when using last total)</small></label>
      <input type="number" name="modifier" value="0"/>
    </div>
    <div class="form-group">
      <label>Bonus / Penalty</label>
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

  // Helper to send chat
  function postResult({originRoll, total, formulaDesc, dc, yourRank, oppRank, degree, counteracted, secret}) {
    const resultText = counteracted ? '<span class="success">Effect Counteracted!</span>' : '<span class="failure">Effect NOT Counteracted.</span>';

    const chatContent = `
      <div class="pf2e chat-card">
        <header class="card-header flexrow">
          <img src="icons/svg/d20.svg" width="36" height="36" />
          <h3>Counteract Check</h3>
        </header>
        <div class="card-content">
          <p><strong>Roll:</strong> ${formulaDesc} = <strong>${total}</strong></p>
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
      roll: originRoll
    };
    if (secret) {
      messageData.whisper = ChatMessage.getWhisperRecipients("GM");
      messageData.blind = true;
    }
    ChatMessage.create(messageData);
  }

  // Core evaluator
  function evaluateCounteract({rollTotal, dc, yourRank, oppRank}) {
    const diff = rollTotal - dc;
    let degree = diff >= 10 ? 'Critical Success' :
                 diff >= 0  ? 'Success' :
                 diff <= -10 ? 'Critical Failure' : 'Failure';

    if (yourRank > oppRank && degree === 'Failure') degree = 'Success';

    let counteracted = false;
    if (degree === 'Critical Success') counteracted = yourRank <= oppRank + 3;
    else if (degree === 'Success') counteracted = yourRank <= oppRank + 1;

    return {degree, counteracted};
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

          const originRoll = await (new Roll('1d20')).roll({async:false});
          await originRoll.toMessage({flavor: "Counteract d20 Roll", whisper: secret ? ChatMessage.getWhisperRecipients("GM") : [], blind: secret});

          const total = originRoll.total + mod + bonus;
          const formulaDesc = `${originRoll.result}${mod ? ` + ${mod}` : ''}${bonus ? ` ${bonus >=0 ? '+ ' : '- '}${Math.abs(bonus)}` : ''}`;

          const {degree, counteracted} = evaluateCounteract({rollTotal: total, dc, yourRank, oppRank});

          postResult({originRoll, total, formulaDesc, dc, yourRank, oppRank, degree, counteracted, secret});
        }
      },
      useLast: {
        icon: '<i class="fas fa-history"></i>',
        label: "Use Last Total",
        callback: html => {
          const lastMsg = [...game.messages].reverse().find(m => m.user.id === game.user.id && m.isRoll && m.rolls?.length);
          if (!lastMsg) return ui.notifications.warn("No previous roll found for your user.");

          const originRoll = lastMsg.rolls[0];

          const bonus = Number(html.find('[name="bonus"]').val());
          const dc = Number(html.find('[name="dc"]').val());
          const yourRank = Number(html.find('[name="yourRank"]').val());
          const oppRank = Number(html.find('[name="oppRank"]').val());
          const secret = html.find('[name="secret"]')[0].checked;

          const total = originRoll.total + bonus; // base modifier already included in roll
          const formulaDesc = `${originRoll.result}${bonus ? ` ${bonus>=0?'+ ':'- '}${Math.abs(bonus)}` : ''}`;

          const {degree, counteracted} = evaluateCounteract({rollTotal: total, dc, yourRank, oppRank});

          postResult({originRoll, total, formulaDesc, dc, yourRank, oppRank, degree, counteracted, secret});
        }
      },
      cancel: {
        label: 'Cancel'
      }
    },
    default: 'roll'
  }).render(true);
})();

