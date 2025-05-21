function deepClone(obj, visited = new Map()) {
  // 处理 null 和非对象
  if (obj === null || typeof obj !== "object") return obj;

  // 避免循环引用
  if (visited.has(obj)) {
    return visited.get(obj);
  }

  // 特殊对象处理（Date、RegExp）
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);

  // 创建一个新的对象或数组
  const clone = Array.isArray(obj) ? [] : {};
  visited.set(obj, clone);

  // 递归拷贝属性
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      clone[key] = deepClone(obj[key], visited);
    }
  }

  return clone;
}

document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const playerHealthEl = document.getElementById("player-health");
  const playerManaEl = document.getElementById("player-mana");
  const playerHandEl = document.getElementById("player-hand");
  const playerBattlefieldEl = document.getElementById("player-battlefield");
  const playerHeroPortraitEl = document.getElementById("player-hero-portrait");
  const playerAreaEl = document.getElementById("player-area");

  const aiHealthEl = document.getElementById("ai-health");
  const aiManaEl = document.getElementById("ai-mana");
  const aiHandEl = document.getElementById("ai-hand");
  const aiBattlefieldEl = document.getElementById("ai-battlefield");
  const aiHeroPortraitEl = document.getElementById("ai-hero-portrait");
  const aiAreaEl = document.getElementById("ai-area");

  const endTurnButton = document.getElementById("end-turn-button");
  const gameMessageEl = document.getElementById("game-message");
  const gameOverMessageEl = document.getElementById("game-over-message");
  const cardTooltipEl = document.getElementById("card-tooltip");

  // --- Game State ---
  let gameIdCounter = 0;
  let player = {
    health: 30,
    mana: 0,
    maxMana: 0,
    deck: [],
    hand: [],
    battlefield: [],
    heroElement: playerHeroPortraitEl,
    areaElement: playerAreaEl,
    isPlayer: true,
    name: "Player",
  };
  let ai = {
    health: 30,
    mana: 0,
    maxMana: 0,
    deck: [],
    hand: [],
    battlefield: [],
    heroElement: aiHeroPortraitEl,
    areaElement: aiAreaEl,
    isPlayer: false,
    name: "AI",
  };
  let currentPlayer = player;
  let turn = 0;
  let selectedHandCard = null;
  let selectedAttacker = null;
  let isGameOver = false;

  // --- Card Definitions ---
  const cardDatabase = [
    {
      id: "CS2_023",
      name: "Arcane Missiles",
      type: "spell",
      cost: 1,
      text: "Deal 3 damage randomly split among all enemies.",
      color: "#ADD8E6", // Light Blue
      onPlay: (caster) => {
        console.log(
          `%cSPELL CAST: ${caster.name} plays Arcane Missiles.`,
          "color: #00CED1; font-weight: bold;"
        );
        const opponent = getOpponent(caster);
        let missileCount = 3;

        for (let i = 0; i < missileCount; i++) {
          // 1. REBUILD the list of LIVE potential targets FOR EACH MISSILE
          // This is crucial because a previous missile might have killed a target.
          let livePotentialTargets = [];

          // Add opponent's alive minions
          opponent.battlefield.forEach((minion) => {
            if (minion.currentHealth > 0) {
              livePotentialTargets.push({
                entity: minion,
                elementId: minion.instanceId, // ID of minion's DOM element
                type: "minion",
              });
            }
          });

          // Add opponent's alive hero
          if (opponent.health > 0) {
            livePotentialTargets.push({
              entity: opponent, // The actual opponent hero object
              elementId: opponent.heroElement.id, // ID of hero's DOM element
              type: "hero",
            });
          }

          console.log(
            `  Missile ${i + 1}: Live potential targets:`,
            livePotentialTargets.map((t) => ({
              name: t.entity.name || t.entity.owner.name + "'s Hero",
              health:
                t.type === "hero" ? t.entity.health : t.entity.currentHealth,
              id: t.elementId,
            }))
          );

          // 2. Check if any live targets remain
          if (livePotentialTargets.length === 0) {
            console.log(
              `  Missile ${i + 1}: No live targets left. Stopping missiles.`
            );
            break; // Stop firing missiles if no valid targets
          }

          // 3. Select a random live target
          const randomTargetEntry =
            livePotentialTargets[
              Math.floor(Math.random() * livePotentialTargets.length)
            ];
          const targetEntity = randomTargetEntry.entity;
          const targetElement = document.getElementById(
            randomTargetEntry.elementId
          ); // Fetch DOM element by ID

          const IS_TARGET_HERO_LOG =
            targetEntity === player || targetEntity === ai;
          const targetNameLog = IS_TARGET_HERO_LOG
            ? targetEntity.name
            : targetEntity.name;

          if (targetElement) {
            console.log(
              `  Missile ${i + 1} targeting: ${targetNameLog} (ID: ${
                randomTargetEntry.elementId
              })`
            );
            dealDamage(targetEntity, 1, targetElement);
            // dealDamage will call updateAllUI and checkGameOver if necessary
          } else {
            console.warn(
              `  Missile ${i + 1}: Could not find DOM element for target ID ${
                randomTargetEntry.elementId
              } (${targetNameLog}). Damage dealt to data model only.`
            );
            // Still deal damage to the data model if the element is missing for some reason
            dealDamage(targetEntity, 1, null); // Pass null for element
          }

          // Important: The health of targetEntity is modified by dealDamage.
          // The next iteration's livePotentialTargets will reflect this change.
        }

        // A final updateAllUI might be good practice after all missiles,
        // though dealDamage should handle individual updates.
        // updateAllUI(); // playCard which called this onPlay will also call updateAllUI.
      },
    },
    {
      id: "CS2_029",
      name: "Fireball",
      type: "spell",
      cost: 4,
      text: "Deal 6 damage.",
      color: "#FF4500",
      requiresTarget: true,
      onPlay: (caster, targetData, targetElement) => {
        const targetName =
          targetData.name || (targetData.isPlayer ? "Player Hero" : "AI Hero");
        console.log(
          `%cSPELL: ${caster.name} plays Fireball on ${targetName}.`,
          "color: cyan"
        );
        if (!targetData || !targetElement) {
          console.error(
            "Fireball: Target data or element is missing!",
            targetData,
            targetElement
          );
          return;
        }
        dealDamage(targetData, 6, targetElement);
        updateAllUI();
      },
    },
    {
      id: "CS2_022",
      name: "Polymorph",
      type: "spell",
      cost: 4,
      text: "Transform a minion into a 1/1 Sheep.",
      color: "#DA70D6",
      requiresTarget: true,
      targetType: "minion",
      onPlay: (caster, targetMinionData, originalTargetElement) => {
        // originalTargetElement is from the click
        if (!targetMinionData || targetMinionData.isHero) {
          console.warn(
            "Polymorph target was not a valid minion based on data:",
            targetMinionData
          );
          return;
        }
        console.log(
          `%cSPELL: ${caster.name} plays Polymorph on ${targetMinionData.name} (ID: ${targetMinionData.instanceId})`,
          "color: magenta; font-weight:bold;"
        );
        console.log(
          "Original target DOM element passed to onPlay:",
          originalTargetElement
        );

        const owner = targetMinionData.owner;
        if (!owner) {
          console.error(
            "Polymorph ERROR: Target minion data does not have an owner!",
            targetMinionData
          );
          return;
        }

        const sheepCardTemplate = {
          name: "Sheep",
          type: "minion",
          cost: 1,
          attack: 1,
          health: 1,
          text: "",
          color: "#EEE8AA",
          isToken: true,
        };
        const sheepTokenInstance = createCardInstance(sheepCardTemplate);
        sheepTokenInstance.owner = owner;
        sheepTokenInstance.canAttack = false; // Summoning sickness for the new sheep
        console.log("Created Sheep token instance:", sheepTokenInstance);

        const minionIndex = owner.battlefield.findIndex(
          (m) => m.instanceId === targetMinionData.instanceId
        );
        if (minionIndex !== -1) {
          console.log(
            `Found ${targetMinionData.name} at index ${minionIndex} in ${owner.name}'s battlefield data.`
          );
          owner.battlefield[minionIndex] = sheepTokenInstance; // Replace in data model

          // DOM Manipulation: Attempt to replace the specific element
          const battlefieldEl = owner.isPlayer
            ? playerBattlefieldEl
            : aiBattlefieldEl;
          // Re-fetch the element by ID just in case the passed 'originalTargetElement' is stale
          const currentTargetElement = document.getElementById(
            targetMinionData.instanceId
          );

          if (
            currentTargetElement &&
            currentTargetElement.parentNode === battlefieldEl
          ) {
            const newSheepElement = createMinionCardElement(sheepTokenInstance); // This will have the sheep's new instanceId
            console.log(
              `Replacing DOM element (ID: ${currentTargetElement.id}) with new Sheep element (ID: ${newSheepElement.id})`
            );
            battlefieldEl.replaceChild(newSheepElement, currentTargetElement);
          } else {
            console.warn(
              `Polymorph: Could not find DOM element for ${targetMinionData.name} (ID: ${targetMinionData.instanceId}) on the battlefield for direct replacement. Will rely on full re-render from updateAllUI.`
            );
            // If direct replacement fails, updateAllUI() should call renderBattlefield() which will build from the corrected data model.
          }
        } else {
          console.error(
            `Polymorph ERROR: Target minion ${targetMinionData.name} (ID: ${targetMinionData.instanceId}) not found in ${owner.name}'s battlefield data array!`
          );
        }

        console.log(
          `${owner.name}'s battlefield data after Polymorph:`,
          owner.battlefield.map((m) => ({
            name: m.name,
            id: m.instanceId,
            attack: m.attack,
            health: m.currentHealth,
          }))
        );
        updateAllUI(); // This will ensure mana is updated and potentially re-render battlefields if the direct DOM replacement had issues.
      },
    },
    {
      id: "CS2_188",
      name: "Bloodfen Raptor",
      type: "minion",
      cost: 2,
      attack: 3,
      health: 2,
      text: "",
      color: "#228B22",
    },
    {
      id: "CS2_182",
      name: "Chillwind Yeti",
      type: "minion",
      cost: 4,
      attack: 4,
      health: 5,
      text: "",
      color: "#B0C4DE",
    },
    {
      id: "EX1_008",
      name: "Argent Squire",
      type: "minion",
      cost: 1,
      attack: 1,
      health: 1,
      text: "Divine Shield",
      color: "#FFD700",
      abilities: ["DivineShield"],
      hasDivineShield: true,
    },
    {
      id: "NEW1_021",
      name: "Water Elemental",
      type: "minion",
      cost: 4,
      attack: 3,
      health: 6,
      text: "Freeze any character damaged by this minion.",
      color: "#87CEEB",
      onDamageDealt: (sourceMinion, targetData, targetElement) => {
        const targetName =
          targetData.name || (targetData.isPlayer ? "Player Hero" : "AI Hero");
        console.log(
          `${sourceMinion.name} damaged ${targetName}, attempting to freeze.`
        );
        if (targetData && !targetData.isFrozen) {
          targetData.isFrozen = true;
          if (!targetData.isHero) targetData.canAttack = false;
          if (targetElement) targetElement.classList.add("frozen");
          console.log(`${targetName} is now frozen.`);
          updateAllUI(); // Update UI to show frozen state
        } else {
          console.log(
            `${targetName} was already frozen or invalid target for freeze.`
          );
        }
      },
    },
  ];

  function createCardInstance(cardTemplate) {
    const instance = deepClone(cardTemplate);
    instance.instanceId = `card-${gameIdCounter++}`;
    if (instance.type === "minion") {
      instance.currentHealth = instance.health; // Max health
      instance.maxHealth = instance.health; // Store max health for reference
      instance.canAttack = false;
      instance.isFrozen = false;
      instance.hasAttackedThisTurn = false;
      if (instance.abilities && instance.abilities.includes("DivineShield")) {
        instance.hasDivineShield = true;
      }
    }
    return instance;
  }

  function shuffleDeck(deck) {
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function drawCard(p) {
    if (p.deck.length > 0 && p.hand.length < 10) {
      const card = p.deck.pop();
      p.hand.push(card);
      if (p.isPlayer) {
        console.log(
          `Player draws: ${card.name}. Hand: ${p.hand.length}, Deck: ${p.deck.length}`
        );
        const cardEl = createPlayerHandCardElement(card);
        playerHandEl.appendChild(cardEl);
        cardEl.classList.add("drawing-card");
        setTimeout(() => cardEl.classList.remove("drawing-card"), 500);
      } else {
        console.log(
          `AI draws a card. Hand: ${p.hand.length}, Deck: ${p.deck.length}. (Card: ${card.name})`
        ); // Log AI card for debugging
        const cardBackEl = createCardBackElement();
        aiHandEl.appendChild(cardBackEl);
        cardBackEl.classList.add("drawing-card");
        setTimeout(() => cardBackEl.classList.remove("drawing-card"), 500);
      }
    } else if (p.deck.length === 0) {
      console.log(
        `${p.name} attempts to draw but deck is empty! Fatigue (simplified).`
      );
      // dealDamage(p, 1, p.heroElement); // Proper fatigue would increment
    } else {
      console.log(
        `${p.name} attempts to draw but hand is full! Card burned (not implemented).`
      );
    }
    updateUIDeckCounts();
  }

  function updateUIDeckCounts() {
    // console.log(
    //   `Deck Counts - Player: ${player.deck.length}, AI: ${ai.deck.length}`
    // );
  }

  function startGame() {
    console.log(
      "%c--- NEW GAME STARTING ---",
      "color: green; font-size: 16px; font-weight: bold;"
    );
    isGameOver = false;
    gameOverMessageEl.style.display = "none";
    gameIdCounter = 0;
    turn = 0;

    player = {
      health: 30,
      mana: 0,
      maxMana: 0,
      deck: [],
      hand: [],
      battlefield: [],
      heroElement: playerHeroPortraitEl,
      areaElement: playerAreaEl,
      isPlayer: true,
      isHero: true,
      name: "Player",
    };
    ai = {
      health: 30,
      mana: 0,
      maxMana: 0,
      deck: [],
      hand: [],
      battlefield: [],
      heroElement: aiHeroPortraitEl,
      areaElement: aiAreaEl,
      isPlayer: false,
      isHero: true,
      name: "AI",
    };

    player.heroElement.id = "player-hero-portrait";
    ai.heroElement.id = "ai-hero-portrait";

    const fullDeckTemplate = [];
    for (let i = 0; i < 2; i++) {
      cardDatabase.forEach((c) => fullDeckTemplate.push(c));
    }
    player.deck = fullDeckTemplate.map((c) => createCardInstance(c));
    ai.deck = fullDeckTemplate.map((c) => createCardInstance(c));

    shuffleDeck(player.deck);
    shuffleDeck(ai.deck);

    for (let i = 0; i < 3; i++) drawCard(player);
    for (let i = 0; i < 4; i++) drawCard(ai);

    currentPlayer = player;
    startTurn();
  }

  function startTurn() {
    if (isGameOver) return;
    turn++;
    console.log(
      `%c--- START TURN ${turn} --- ${currentPlayer.name} ---`,
      "color: blue; font-weight: bold;"
    );
    showMessage(`${currentPlayer.name}'s Turn`, 2500);

    if (currentPlayer.maxMana < 10) currentPlayer.maxMana++;
    currentPlayer.mana = currentPlayer.maxMana;

    drawCard(currentPlayer);

    currentPlayer.battlefield.forEach((minion) => {
      minion.hasAttackedThisTurn = false;
      if (minion.isFrozen) {
        minion.isFrozen = false;
      }
      minion.canAttack = true;
    });

    selectedHandCard = null;
    selectedAttacker = null;
    clearTargetHighlights();
    updateAllUI();

    player.areaElement.classList.remove("active-turn");
    ai.areaElement.classList.remove("active-turn");
    currentPlayer.areaElement.classList.add("active-turn");

    if (currentPlayer === ai) {
      endTurnButton.disabled = true;
      setTimeout(aiTurnController, 1500);
    } else {
      endTurnButton.disabled = false;
    }
  }

  function endTurn() {
    if (isGameOver) {
      console.log("EndTurn: Game is over, not ending turn.");
      return;
    }
    if (currentPlayer === ai && !endTurnButton.disabled) {
      // Safety: Player somehow trying to end AI turn early
      console.warn("Player attempted to end AI's turn. Action blocked.");
      return;
    }
    console.log(
      `%c--- ${currentPlayer.name} ENDS TURN ---`,
      "color: orange; font-weight: bold;"
    );

    if (selectedHandCard && selectedHandCard.cardElement)
      selectedHandCard.cardElement.classList.remove("selected-card");
    if (selectedAttacker && selectedAttacker.minionElement)
      selectedAttacker.minionElement.classList.remove("selected-attacker");
    selectedHandCard = null;
    selectedAttacker = null;
    clearTargetHighlights();

    currentPlayer = getOpponent(currentPlayer);
    console.log(`Switching to ${currentPlayer.name}'s turn.`);
    startTurn();
  }
  endTurnButton.addEventListener("click", () => {
    if (currentPlayer === player && !endTurnButton.disabled) {
      endTurn();
    } else {
      console.warn(
        "End Turn button clicked at inappropriate time or by AI (should not happen)."
      );
    }
  });

  function playCard(
    cardData,
    cardElement,
    targetData = null,
    targetElement = null
  ) {
    console.log(
      `%cPLAY CARD ATTEMPT: ${currentPlayer.name} plays ${cardData.name} (Cost: ${cardData.cost}, Mana: ${currentPlayer.mana})`,
      "color: #DAA520;"
    );
    if (cardData.requiresTarget) {
      const targetNameStr = targetData
        ? targetData.name || (targetData.isPlayer ? "Player Hero" : "AI Hero")
        : "NO TARGET";
      console.log(`    Targeting: ${targetNameStr}`);
    }

    if (currentPlayer.mana < cardData.cost) {
      showMessage("Not enough mana!");
      console.log(
        `PlayCard FAIL: Not enough mana for ${cardData.name} (cost ${cardData.cost}, has ${currentPlayer.mana})`
      );
      return false;
    }
    if (cardData.type === "minion" && currentPlayer.battlefield.length >= 7) {
      showMessage("Battlefield is full!");
      console.log(`PlayCard FAIL: Battlefield full for ${cardData.name}`);
      return false;
    }

    currentPlayer.mana -= cardData.cost;

    const cardIndex = currentPlayer.hand.findIndex(
      (c) => c.instanceId === cardData.instanceId
    );
    if (cardIndex > -1) {
      currentPlayer.hand.splice(cardIndex, 1);
      if (cardElement) cardElement.remove();
    } else {
      /* ... AI plays without cardElement from hand ... */
    }

    if (cardData.type === "minion") {
      const minionInstance = { ...createCardInstance(cardData) }; // Ensure it's a fresh instance with correct health etc.
      minionInstance.owner = currentPlayer;
      minionInstance.canAttack = false;
      minionInstance.hasAttackedThisTurn = true;
      minionInstance.isFrozen = false;
      // Divine Shield already handled by createCardInstance
      currentPlayer.battlefield.push(minionInstance);
      console.log(
        `${currentPlayer.name}'s ${minionInstance.name} summoned. Battlefield count: ${currentPlayer.battlefield.length}`
      );

      const minionEl = createMinionCardElement(minionInstance);
      const battlefieldEl = currentPlayer.isPlayer
        ? playerBattlefieldEl
        : aiBattlefieldEl;
      battlefieldEl.appendChild(minionEl);
      minionEl.classList.add("playing-minion");
      setTimeout(() => minionEl.classList.remove("playing-minion"), 500);
    } else if (cardData.type === "spell") {
      console.log(`${currentPlayer.name} casts spell: ${cardData.name}.`);
      if (cardData.onPlay) {
        try {
          cardData.onPlay(currentPlayer, targetData, targetElement);
        } catch (e) {
          console.error(`Error during spell ${cardData.name} onPlay:`, e);
        }
      }
    }

    if (
      selectedHandCard &&
      selectedHandCard.cardData.instanceId === cardData.instanceId
    ) {
      selectedHandCard = null;
    }
    clearTargetHighlights();
    updateAllUI();
    checkGameOver();
    return true;
  }

  function dealDamage(targetEntity, amount, targetElement) {
    if (!targetEntity || amount <= 0) {
      console.warn(
        `DealDamage: Invalid target or amount. Target:`,
        targetEntity,
        `Amount: ${amount}`
      );
      return;
    }
    const IS_TARGET_HERO = targetEntity === player || targetEntity === ai;
    const targetName = IS_TARGET_HERO ? targetEntity.name : targetEntity.name;
    let currentHealthBeforeDamage = IS_TARGET_HERO
      ? targetEntity.health
      : targetEntity.currentHealth;

    console.log(
      `    DEAL_DAMAGE_INTERNAL: To ${targetName} (Hero: ${IS_TARGET_HERO}). Amount: ${amount}. Health Before: ${currentHealthBeforeDamage}. Divine Shield: ${
        !IS_TARGET_HERO && targetEntity.hasDivineShield
      }`
    );

    if (!IS_TARGET_HERO && targetEntity.hasDivineShield) {
      targetEntity.hasDivineShield = false;
      console.log(
        `      ${targetName}'s Divine Shield popped! No damage taken.`
      );
      // Add DS pop animation if you have one
      const dsPop = document.createElement("div");
      dsPop.textContent = "Shield Lost!";
      dsPop.className = "damage-popup";
      dsPop.style.color = "gold";
      dsPop.style.fontSize = "16px";
      if (targetElement) positionPopup(dsPop, targetElement);
      document.body.appendChild(dsPop);
      setTimeout(() => dsPop.remove(), 1200);
      updateAllUI();
      return;
    }

    const damagePopup = document.createElement("div"); /* ... same ... */
    damagePopup.textContent = `-${amount}`;
    damagePopup.className = "damage-popup";
    if (targetElement) positionPopup(damagePopup, targetElement);
    document.body.appendChild(damagePopup);
    setTimeout(() => damagePopup.remove(), 1000);

    if (IS_TARGET_HERO) {
      targetEntity.health -= amount;
      console.log(
        `      Hero ${targetName} health changed to ${targetEntity.health}.`
      );
      if (targetEntity.health < 0) targetEntity.health = 0;
    } else {
      targetEntity.currentHealth -= amount;
      console.log(
        `      Minion ${targetName} (ID: ${targetEntity.instanceId}) health changed to ${targetEntity.currentHealth}/${targetEntity.maxHealth}.`
      );
    }

    if (!IS_TARGET_HERO && targetEntity.currentHealth <= 0) {
      console.log(
        `      MINION DEATH: ${targetName} (ID: ${targetEntity.instanceId}) died.`
      );
      const owner = targetEntity.owner;
      const minionIdx = owner.battlefield.findIndex(
        (m) => m.instanceId === targetEntity.instanceId
      );
      if (minionIdx > -1) owner.battlefield.splice(minionIdx, 1);
      else
        console.warn(
          `Could not find ${targetName} in ${owner.name}'s data to remove on death.`
        );
      if (targetElement) {
        /* ... death animation ... */
      }
    } else if (IS_TARGET_HERO && targetEntity.health <= 0) {
      console.log(`      HERO DEFEATED: ${targetName}.`);
    }
    updateAllUI();
    checkGameOver();
  }

  function positionPopup(popupElement, targetElement) {
    const rect = targetElement.getBoundingClientRect();
    popupElement.style.left = `${
      window.scrollX + rect.left + rect.width / 2 - popupElement.offsetWidth / 2
    }px`;
    popupElement.style.top = `${
      window.scrollY +
      rect.top +
      rect.height / 2 -
      popupElement.offsetHeight / 2 -
      20
    }px`;
  }

  function minionAttack(
    attackerData,
    attackerElement,
    defenderData,
    defenderElement
  ) {
    const IS_ATTACKER_HERO = attackerData === player || attackerData === ai; // Should always be false
    const IS_DEFENDER_HERO = defenderData === player || defenderData === ai;

    const attackerName = attackerData.name;
    const defenderName = IS_DEFENDER_HERO
      ? defenderData.name
      : defenderData.name;
    const attackerCurrentHealthInitial = attackerData.currentHealth; // Health before any combat damage this action

    console.log(
      `%cATTACK EXECUTION: ${attackerData.owner.name}'s ${attackerName} (A:${
        attackerData.attack
      }, H:${attackerCurrentHealthInitial}, ID:${
        attackerData.instanceId
      }) attacks ${defenderName} (Hero:${IS_DEFENDER_HERO}, H:${
        IS_DEFENDER_HERO ? defenderData.health : defenderData.currentHealth
      }, A:${IS_DEFENDER_HERO ? 0 : defenderData.attack}, ID:${
        IS_DEFENDER_HERO ? defenderData.heroElement.id : defenderData.instanceId
      })`,
      "color: orange; font-weight:bold;"
    );

    if (IS_ATTACKER_HERO) {
      console.error(
        "MINION ATTACK CALLED WITH HERO AS ATTACKER!",
        attackerData
      );
      return;
    }
    if (
      !attackerData.canAttack ||
      attackerData.isFrozen ||
      attackerData.hasAttackedThisTurn
    ) {
      console.warn(
        `  ${attackerName} cannot attack now. CanAttack: ${attackerData.canAttack}, Frozen: ${attackerData.isFrozen}, HasAttackedThisTurn: ${attackerData.hasAttackedThisTurn}`
      );
      return;
    }

    // Attack line animation (same as before)
    const attackLine = document.createElement("div");
    /* ... */ document.body.appendChild(attackLine);
    const attackerRect = attackerElement.getBoundingClientRect();
    const defenderRect = defenderElement.getBoundingClientRect();
    const startX = window.scrollX + attackerRect.left + attackerRect.width / 2;
    const startY = window.scrollY + attackerRect.top + attackerRect.height / 2;
    const endX = window.scrollX + defenderRect.left + defenderRect.width / 2;
    const endY = window.scrollY + defenderRect.top + defenderRect.height / 2;
    const angle = (Math.atan2(endY - startY, endX - startX) * 180) / Math.PI;
    const length = Math.sqrt(
      Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
    );
    attackLine.id = "attack-line";
    attackLine.style.width = `${length}px`;
    attackLine.style.left = `${startX}px`;
    attackLine.style.top = `${startY - 1}px`;
    attackLine.style.transform = `rotate(${angle}deg)`;
    attackerElement.style.transform = "scale(1.1)";
    setTimeout(() => {
      attackerElement.style.transform = "scale(1)";
      if (attackLine) attackLine.remove();
    }, 300);

    // 1. Attacker deals damage to Defender
    if (attackerData.attack > 0) {
      console.log(
        `  ATTACKER ACTION: ${attackerName} deals ${attackerData.attack} damage to ${defenderName}.`
      );
      dealDamage(defenderData, attackerData.attack, defenderElement);
      if (attackerData.onDamageDealt) {
        try {
          attackerData.onDamageDealt(
            attackerData,
            defenderData,
            defenderElement
          );
        } catch (e) {
          console.error(`Error in onDamageDealt for ${attackerName}:`, e);
        }
      }
    } else {
      console.log(
        `  ATTACKER ACTION: ${attackerName} has 0 attack, deals no damage.`
      );
    }

    // State after attacker's hit (defender might be dead)
    const defenderHealthAfterInitialHit = IS_DEFENDER_HERO
      ? defenderData.health
      : defenderData.currentHealth;
    const defenderOriginalAttackValue = IS_DEFENDER_HERO
      ? 0
      : defenderData.attack; // Defender's original attack value

    console.log(
      `  POST-ATTACKER-DMG: ${defenderName} health is now ${defenderHealthAfterInitialHit}.`
    );

    // 2. Defender (if minion, alive, and has attack) deals damage back to Attacker
    console.log(
      "---- ",
      IS_DEFENDER_HERO,
      defenderHealthAfterInitialHit,
      defenderOriginalAttackValue
    );
    if (
      !IS_DEFENDER_HERO &&
      // defenderHealthAfterInitialHit > 0 &&
      defenderOriginalAttackValue > 0
    ) {
      console.log(
        `  DEFENDER RETALIATION: ${defenderName} (H:${defenderHealthAfterInitialHit}, A:${defenderOriginalAttackValue}) will retaliate against ${attackerName} (H before retal: ${attackerData.currentHealth}).`
      );
      dealDamage(attackerData, defenderOriginalAttackValue, attackerElement);
      // Attacker's health is now updated by the dealDamage call.
      console.log(
        `  POST-RETALIATION: ${attackerName}'s health is now ${attackerData.currentHealth}.`
      );

      if (defenderData.onDamageDealt) {
        // If defender has an onDamageDealt effect (e.g. Water Elemental)
        try {
          defenderData.onDamageDealt(
            defenderData,
            attackerData,
            attackerElement
          );
        } catch (e) {
          console.error(
            `Error in onDamageDealt for (retaliating) ${defenderData.name}:`,
            e
          );
        }
      }
    } else if (!IS_DEFENDER_HERO && defenderHealthAfterInitialHit <= 0) {
      console.log(
        `  DEFENDER RETALIATION: ${defenderName} died (H:${defenderHealthAfterInitialHit}) before it could retaliate.`
      );
    } else if (IS_DEFENDER_HERO) {
      console.log(
        `  DEFENDER RETALIATION: ${defenderName} is a hero, no direct attack retaliation.`
      );
    } else if (!IS_DEFENDER_HERO && defenderOriginalAttackValue <= 0) {
      console.log(
        `  DEFENDER RETALIATION: ${defenderName} has 0 attack, no retaliation.`
      );
    }

    attackerData.canAttack = false;
    attackerData.hasAttackedThisTurn = true;
    console.log(
      `  END OF ATTACK: ${attackerName} finished. CanAttack: ${attackerData.canAttack}, HasAttackedThisTurn: ${attackerData.hasAttackedThisTurn}`
    );

    if (
      selectedAttacker &&
      selectedAttacker.minionData.instanceId === attackerData.instanceId
    ) {
      selectedAttacker.minionElement.classList.remove("selected-attacker");
      selectedAttacker = null;
    }
    clearTargetHighlights();
    updateAllUI();
    checkGameOver();
  }

  function checkGameOver() {
    if (isGameOver) return; // Don't re-trigger
    if (player.health <= 0) {
      gameOver("AI Wins!");
    } else if (ai.health <= 0) {
      gameOver("Player Wins!");
    }
  }

  function gameOver(message) {
    if (isGameOver) return;
    isGameOver = true;
    console.log(
      `%c--- GAME OVER --- ${message} ---`,
      "color: red; font-size: 16px; font-weight: bold;"
    );
    endTurnButton.disabled = true;
    gameOverMessageEl.innerHTML = `${message}<br><button id="restart-button">Play Again</button>`;
    gameOverMessageEl.style.display = "flex";
    document.getElementById("restart-button").addEventListener("click", () => {
      console.log("Restart button clicked.");
      clearBoardForNewGame();
      startGame();
    });
  }

  function clearBoardForNewGame() {
    playerHandEl.innerHTML = "";
    playerBattlefieldEl.innerHTML = "";
    aiHandEl.innerHTML = "";
    aiBattlefieldEl.innerHTML = "";
    console.log("Board cleared for new game.");
  }

  // --- UI Update Functions ---
  function updateAllUI() {
    if (isGameOver && turn > 0) {
      // Allow final UI update on game over, but not repeatedly after
      console.log("UpdateAllUI: Game is over. Performing final UI refresh.");
    } else if (isGameOver) {
      return;
    }
    // console.log("Updating All UI elements.");
    playerHealthEl.textContent = player.health;
    renderManaCrystals(player, playerManaEl);
    renderPlayerHand();
    renderBattlefield(player, playerBattlefieldEl);

    aiHealthEl.textContent = ai.health;
    renderManaCrystals(ai, aiManaEl);
    renderAiHand();
    renderBattlefield(ai, aiBattlefieldEl);

    if (currentPlayer === player) {
      highlightPlayableCards(player.hand, playerHandEl, player.mana);
    }
    highlightAttackableMinions(
      currentPlayer.battlefield,
      currentPlayer.isPlayer ? playerBattlefieldEl : aiBattlefieldEl
    );
    updateUIDeckCounts();
  }

  function renderManaCrystals(p, manaContainer) {
    manaContainer.innerHTML = "";
    for (let i = 0; i < 10; i++) {
      // Always render 10 slots, style based on maxMana and currentMana
      const crystal = document.createElement("div");
      crystal.classList.add("mana-crystal");
      if (i < p.mana) {
        crystal.classList.add("full");
      } else if (i < p.maxMana) {
        crystal.classList.add("used"); // Shows as spent but available max
      } else {
        // Empty (not yet gained as maxMana) - default style
      }
      manaContainer.appendChild(crystal);
    }
  }

  function createPlayerHandCardElement(cardData) {
    const cardEl = document.createElement("div");
    // ... (rest of createPlayerHandCardElement same as before)
    cardEl.className = "card";
    cardEl.id = cardData.instanceId;
    cardEl.style.backgroundColor = cardData.color || "#a0a0a0";
    if (isDark(cardData.color)) cardEl.style.color = "white";
    else cardEl.style.color = "black";

    cardEl.innerHTML = `
            <div class="card-cost">${cardData.cost}</div>
            <div class="card-name">${cardData.name}</div>
            ${
              cardData.type === "minion"
                ? `<div class="minion-attack">${cardData.attack}</div><div class="minion-health">${cardData.health}</div>`
                : ""
            }
            <div class="card-type">${cardData.type}</div>
        `;

    cardEl.addEventListener("click", () => {
      if (currentPlayer !== player || isGameOver) return;
      console.log(
        `Player clicked hand card: ${cardData.name} (ID: ${cardData.instanceId})`
      );

      if (selectedAttacker) {
        console.log(
          "Player was selecting an attacker, cancelling attack selection."
        );
        selectedAttacker.minionElement.classList.remove("selected-attacker");
        selectedAttacker = null;
        clearTargetHighlights();
      }

      if (
        selectedHandCard &&
        selectedHandCard.cardData.instanceId === cardData.instanceId
      ) {
        console.log("Player clicked selected card again, deselecting.");
        selectedHandCard.cardElement.classList.remove("selected-card");
        selectedHandCard = null;
        clearTargetHighlights();
        return;
      }

      if (selectedHandCard)
        selectedHandCard.cardElement.classList.remove("selected-card");

      selectedHandCard = { cardData, cardElement: cardEl };
      cardEl.classList.add("selected-card");
      console.log(`Selected card: ${cardData.name}`);

      if (cardData.type === "minion") {
        if (player.mana >= cardData.cost && player.battlefield.length < 7) {
          console.log(`Playing minion ${cardData.name} directly.`);
          playCard(cardData, cardEl);
          // selectedHandCard = null; // playCard will clear it if it matches
        } else {
          const reason =
            player.battlefield.length >= 7
              ? "Battlefield full!"
              : "Not enough mana!";
          showMessage(reason);
          console.log(`Cannot play minion ${cardData.name}: ${reason}`);
          selectedHandCard.cardElement.classList.remove("selected-card");
          selectedHandCard = null;
        }
      } else if (cardData.type === "spell") {
        if (player.mana >= cardData.cost) {
          if (cardData.requiresTarget) {
            console.log(
              `Spell ${cardData.name} requires target, highlighting targets.`
            );
            highlightSpellTargets(cardData);
          } else {
            console.log(
              `Playing non-targeted spell ${cardData.name} directly.`
            );
            playCard(cardData, cardEl);
            // selectedHandCard = null; // playCard will clear
          }
        } else {
          showMessage("Not enough mana!");
          console.log(`Cannot play spell ${cardData.name}: Not enough mana.`);
          selectedHandCard.cardElement.classList.remove("selected-card");
          selectedHandCard = null;
        }
      }
    });

    cardEl.addEventListener("mouseenter", (event) =>
      showTooltip(cardData, event)
    );
    cardEl.addEventListener("mouseleave", hideTooltip);
    return cardEl;
  }

  function renderPlayerHand() {
    playerHandEl.innerHTML = "";
    player.hand.forEach((cardData) => {
      const cardEl = createPlayerHandCardElement(cardData);
      playerHandEl.appendChild(cardEl);
    });
    // console.log("Player hand rendered.");
  }

  function createCardBackElement() {
    // ... (same as before) ...
    const cardBack = document.createElement("div");
    cardBack.className = "card-back";
    return cardBack;
  }

  function renderAiHand() {
    aiHandEl.innerHTML = "";
    for (let i = 0; i < ai.hand.length; i++) {
      aiHandEl.appendChild(createCardBackElement());
    }
    // console.log("AI hand rendered with card backs.");
  }

  function createMinionCardElement(minionData) {
    const minionEl = document.createElement("div");
    minionEl.className = "minion-card";
    minionEl.id = minionData.instanceId; // Crucial for getElementById
    minionEl.style.backgroundColor = minionData.color || "#c0c0c0";
    if (isDark(minionData.color)) minionEl.style.color = "white";
    else minionEl.style.color = "black";

    if (minionData.hasDivineShield)
      minionEl.classList.add("divine-shield-visual");
    if (minionData.isFrozen) minionEl.classList.add("frozen");

    minionEl.innerHTML = `
            <div class="minion-cost">${minionData.cost}</div>
            <div class="minion-name">${minionData.name}</div>
            <div class="minion-attack">${minionData.attack}</div>
            <div class="minion-health ${
              minionData.currentHealth < minionData.maxHealth ? "damaged" : ""
            }">${minionData.currentHealth}</div>
        `;

    minionEl.addEventListener("click", () => {
      if (isGameOver) return;
      const owner = minionData.owner;
      console.log(
        `Clicked minion: ${minionData.name} (Owner: ${owner.name}, ID: ${minionData.instanceId}, CanAttack: ${minionData.canAttack}, Frozen: ${minionData.isFrozen}, AttackedThisTurn: ${minionData.hasAttackedThisTurn})`
      );

      if (
        selectedHandCard &&
        selectedHandCard.cardData.requiresTarget &&
        currentPlayer.isPlayer
      ) {
        if (
          selectedHandCard.cardData.targetType === "minion" ||
          !selectedHandCard.cardData.targetType
        ) {
          console.log(
            `Player targeting ${minionData.name} with spell ${selectedHandCard.cardData.name}`
          );
          if (player.mana >= selectedHandCard.cardData.cost) {
            playCard(
              selectedHandCard.cardData,
              selectedHandCard.cardElement,
              minionData,
              minionEl
            );
          }
        } else {
          console.log("Spell targetType mismatch for minion.");
        }
      } else if (
        currentPlayer === owner &&
        minionData.canAttack &&
        !minionData.isFrozen &&
        !minionData.hasAttackedThisTurn
      ) {
        if (
          selectedAttacker &&
          selectedAttacker.minionData.instanceId === minionData.instanceId
        ) {
          selectedAttacker.minionElement.classList.remove("selected-attacker");
          selectedAttacker = null;
          clearTargetHighlights();
        } else {
          if (selectedAttacker)
            selectedAttacker.minionElement.classList.remove(
              "selected-attacker"
            );
          selectedAttacker = { minionData, minionElement: minionEl };
          minionEl.classList.add("selected-attacker");
          highlightAttackTargets(getOpponent(owner));
        }
      } else if (
        selectedAttacker &&
        currentPlayer === selectedAttacker.minionData.owner &&
        owner !== currentPlayer
      ) {
        // Player is attacker, clicked opponent minion
        console.log(
          `${minionData.name} is being targeted for attack by player's ${selectedAttacker.minionData.name}.`
        );
        minionAttack(
          selectedAttacker.minionData,
          selectedAttacker.minionElement,
          minionData,
          minionEl
        );
      } else if (
        currentPlayer === owner &&
        (!minionData.canAttack ||
          minionData.isFrozen ||
          minionData.hasAttackedThisTurn)
      ) {
        const reason = minionData.isFrozen
          ? "is frozen"
          : minionData.hasAttackedThisTurn
          ? "already attacked"
          : "cannot attack (summoning sickness?)";
        showMessage(`${minionData.name} ${reason}.`);
      }
    });
    minionEl.addEventListener("mouseenter", (event) =>
      showTooltip(minionData, event)
    );
    minionEl.addEventListener("mouseleave", hideTooltip);
    return minionEl;
  }

  function renderBattlefield(p, battlefieldContainer) {
    battlefieldContainer.innerHTML = "";
    p.battlefield.forEach((minionData) => {
      const minionEl = createMinionCardElement(minionData);
      battlefieldContainer.appendChild(minionEl);
      // Class updates for can-attack, frozen, divine-shield are handled in createMinionCardElement and updateAllUI indirectly
      if (
        minionData.canAttack &&
        !minionData.isFrozen &&
        !minionData.hasAttackedThisTurn &&
        p === currentPlayer
      ) {
        minionEl.classList.add("can-attack");
      }
      if (minionData.isFrozen) {
        minionEl.classList.add("frozen");
        minionEl.style.borderColor = "cyan";
      } else {
        minionEl.classList.remove("frozen");
        // minionEl.style.borderColor = '#333'; // Reset by .can-attack or default
      }
      if (minionData.hasDivineShield) {
        minionEl.classList.add("divine-shield-visual"); // Make sure this class exists in CSS
        minionEl.style.boxShadow = "0 0 10px 3px gold";
      } else {
        minionEl.classList.remove("divine-shield-visual");
        // minionEl.style.boxShadow = ''; // Reset by .can-attack or default
      }
    });
    // console.log(`${p.name}'s battlefield rendered with ${p.battlefield.length} minions.`);
  }
  function highlightPlayableCards(hand, handElement, currentMana) {
    // ... (same as before) ...
    const cardElements = handElement.children;
    for (let i = 0; i < hand.length; i++) {
      if (cardElements[i]) {
        // Ensure element exists
        if (hand[i].cost <= currentMana) {
          cardElements[i].classList.add("playable");
        } else {
          cardElements[i].classList.remove("playable");
        }
      }
    }
  }
  function highlightAttackableMinions(battlefield, battlefieldElement) {
    // ... (same as before, ensure .can-attack class is styled) ...
    const minionElements = battlefieldElement.children;
    for (let i = 0; i < battlefield.length; i++) {
      if (minionElements[i]) {
        // Ensure element exists
        if (
          battlefield[i].canAttack &&
          !battlefield[i].isFrozen &&
          !battlefield[i].hasAttackedThisTurn
        ) {
          minionElements[i].classList.add("can-attack");
        } else {
          minionElements[i].classList.remove("can-attack");
        }
      }
    }
  }

  function highlightSpellTargets(spellData) {
    clearTargetHighlights();
    console.log("Highlighting targets for spell:", spellData.name);
    const opponent = getOpponent(currentPlayer);

    // Can target opponent minions?
    if (spellData.targetType === "minion" || !spellData.targetType) {
      opponent.battlefield.forEach((minion) => {
        const el = document.getElementById(minion.instanceId);
        if (el) el.classList.add("targetable");
      });
    }
    // Can target opponent hero?
    if (spellData.targetType !== "minion") {
      // If generic target or specifically not minion-only
      opponent.heroElement.classList.add("targetable");
    }
    // Add logic for friendly targets if needed
  }

  function highlightAttackTargets(opponent) {
    clearTargetHighlights();
    console.log(`Highlighting attack targets on ${opponent.name}'s side.`);
    opponent.battlefield.forEach((minion) => {
      const el = document.getElementById(minion.instanceId);
      if (el) el.classList.add("targetable");
    });
    opponent.heroElement.classList.add("targetable");
  }

  function clearTargetHighlights() {
    document
      .querySelectorAll(".targetable")
      .forEach((el) => el.classList.remove("targetable"));
    // Do not clear selected-attacker here, only when attack resolves or is cancelled.
    // console.log("Cleared target highlights.");
  }

  [player.heroElement, ai.heroElement].forEach((heroEl) => {
    heroEl.addEventListener("click", () => {
      if (isGameOver) return;
      const targetHero = heroEl.id === player.heroElement.id ? player : ai;
      console.log(`Clicked hero: ${targetHero.name} (ID: ${heroEl.id})`);

      if (
        selectedHandCard &&
        selectedHandCard.cardData.requiresTarget &&
        currentPlayer.isPlayer
      ) {
        console.log(
          `Player targeting ${targetHero.name} hero with spell ${selectedHandCard.cardData.name}`
        );
        if (selectedHandCard.cardData.targetType !== "minion") {
          if (player.mana >= selectedHandCard.cardData.cost) {
            playCard(
              selectedHandCard.cardData,
              selectedHandCard.cardElement,
              targetHero,
              heroEl
            );
          }
        } else {
          showMessage("This spell can only target minions.");
        }
      } else if (
        selectedAttacker &&
        targetHero.owner !== selectedAttacker.minionData.owner
      ) {
        console.log(
          `Player's ${selectedAttacker.minionData.name} is targeting ${targetHero.name} hero for attack.`
        );
        minionAttack(
          selectedAttacker.minionData,
          selectedAttacker.minionElement,
          targetHero,
          heroEl
        );
      }
    });
    heroEl.addEventListener("mouseenter", (event) => {
      /* ... same ... */
    });
    heroEl.addEventListener("mouseleave", hideTooltip);
  });

  function showMessage(msg, duration = 2000) {
    gameMessageEl.textContent = msg;
    gameMessageEl.style.display = "block";
    setTimeout(() => {
      gameMessageEl.style.display = "none";
    }, duration);
  }
  function getOpponent(p) {
    return p === player ? ai : player;
  }

  // --- AI Logic ---
  async function aiTurnController() {
    console.log(
      "%cAI CONTROLLER: Starting AI turn actions.",
      "color: purple; font-weight:bold;"
    );
    if (isGameOver) {
      console.log("AI Controller: Game Over.");
      return;
    }

    await aiPlayCardPhase();
    if (isGameOver) {
      console.log("AI Controller: Game Over after card phase.");
      return;
    }

    await aiAttackPhase();
    if (isGameOver) {
      console.log("AI Controller: Game Over after attack phase.");
      return;
    }

    console.log("AI CONTROLLER: AI actions complete. Ending turn.");
    // Ensure endTurn is called only once if game not over.
    if (!isGameOver) {
      endTurn();
    }
  }

  function aiPlayCardPhase() {
    return new Promise((resolve) => {
      console.log("AI: Card playing phase. Mana: " + ai.mana);

      const tryPlayCard = () => {
        if (isGameOver || ai.mana === 0) {
          resolve();
          return;
        }

        let playableCards = ai.hand.filter(
          (card) =>
            card.cost <= ai.mana &&
            (card.type !== "minion" || ai.battlefield.length < 7)
        );
        playableCards.sort((a, b) => b.cost - a.cost);

        if (playableCards.length > 0) {
          const cardToPlay = playableCards[0];
          console.log(
            `AI considering playing: ${cardToPlay.name} (cost ${cardToPlay.cost})`
          );

          let targetData = null;
          let targetElement = null;
          let canPlayThisCard = true;

          if (cardToPlay.requiresTarget) {
            let potentialTargets = [];
            const opponent = player;

            if (cardToPlay.targetType === "minion" || !cardToPlay.targetType) {
              opponent.battlefield.forEach((m) => {
                if (m.currentHealth > 0)
                  potentialTargets.push({
                    data: m,
                    element: document.getElementById(m.instanceId),
                  });
              });
            }
            if (cardToPlay.targetType !== "minion") {
              if (opponent.health > 0)
                potentialTargets.push({
                  data: opponent,
                  element: opponent.heroElement,
                });
            }

            potentialTargets = potentialTargets.filter((t) => t.element); // CRITICAL: Ensure element exists

            if (potentialTargets.length > 0) {
              // Simple targeting: if polymorph, target highest attack. Else, target minion then hero.
              if (
                cardToPlay.id === "CS2_022" &&
                potentialTargets.some((t) => !t.data.isHero)
              ) {
                // Polymorph
                let minionTargets = potentialTargets.filter(
                  (t) => !t.data.isHero
                );
                minionTargets.sort(
                  (a, b) =>
                    b.data.attack +
                    b.data.currentHealth -
                    (a.data.attack + a.data.currentHealth)
                );
                targetData = minionTargets[0].data;
                targetElement = minionTargets[0].element;
              } else {
                // Fireball, or other spells
                potentialTargets.sort((a, b) => {
                  // Prioritize minions, then by health/value
                  if (!a.data.isHero && b.data.isHero) return -1;
                  if (a.data.isHero && !b.data.isHero) return 1;
                  const healthA = a.data.isHero
                    ? a.data.health
                    : a.data.currentHealth;
                  const healthB = b.data.isHero
                    ? b.data.health
                    : b.data.currentHealth;
                  return healthB - healthA;
                });
                targetData = potentialTargets[0].data;
                targetElement = potentialTargets[0].element;
              }
              if (targetData && targetElement) {
                console.log(
                  `AI targets ${targetData.name || "Player Hero"} with ${
                    cardToPlay.name
                  }`
                );
              } else {
                console.warn(
                  `AI: No valid target object (data/element) found for ${cardToPlay.name} after sorting.`
                );
                canPlayThisCard = false;
              }
            } else {
              console.log(
                `AI: No valid DOM elements found for any potential targets of ${cardToPlay.name}. Skipping card.`
              );
              canPlayThisCard = false;
            }
          }

          if (canPlayThisCard) {
            const playedSuccessfully = playCard(
              cardToPlay,
              null,
              targetData,
              targetElement
            );
            if (playedSuccessfully) {
              setTimeout(tryPlayCard, 1200 + Math.random() * 800);
              return;
            } else {
              console.warn(
                `AI: ${cardToPlay.name} was chosen but playCard returned false. Trying next action.`
              );
              // AI might get stuck here if playCard always fails for the top card.
              // A simple fix: remove the card from consideration for this turn's play phase if it fails once.
              // This is a hacky way, better would be to understand why playCard failed.
              // For now, we'll just let it try again or move to attack phase.
            }
          }
        }
        console.log(
          "AI: No more cards to play this iteration or chosen card failed. Ending card play attempt loop."
        );
        resolve();
      };
      setTimeout(tryPlayCard, 500);
    });
  }

  function aiAttackPhase() {
    return new Promise((resolve) => {
      console.log("AI: Attack phase.");

      const tryAttack = () => {
        if (isGameOver) {
          resolve();
          return;
        }

        let attackers = ai.battlefield.filter(
          (m) =>
            m.canAttack && !m.isFrozen && !m.hasAttackedThisTurn && m.attack > 0
        );
        console.log(
          "AI attackers available:",
          attackers.map(
            (m) =>
              `${m.name} (ID: ${m.instanceId}, AttackedThisTurn: ${m.hasAttackedThisTurn})`
          )
        );

        if (attackers.length > 0) {
          attackers.sort((a, b) => b.attack - a.attack);
          const attackerData = attackers[0]; // Get the first one from sorted list
          const attackerElement = document.getElementById(
            attackerData.instanceId
          );

          if (!attackerElement) {
            console.warn(
              `AI Attack: Could not find element for attacker ${attackerData.name} (ID: ${attackerData.instanceId}). Marking as attacked to skip.`
            );
            attackerData.hasAttackedThisTurn = true;
            setTimeout(tryAttack, 100); // Very short delay to try next attacker
            return;
          }

          let possibleTargets = [];
          player.battlefield.forEach((m) => {
            if (m.currentHealth > 0)
              possibleTargets.push({
                data: m,
                element: document.getElementById(m.instanceId),
                type: "minion",
              });
          });
          if (player.health > 0)
            possibleTargets.push({
              data: player,
              element: player.heroElement,
              type: "hero",
            });
          possibleTargets = possibleTargets.filter((t) => t.element);

          let targetToAttack = null;
          if (possibleTargets.length > 0) {
            // AI Targeting Logic (same as before, ensure it works)
            let killableMinions = possibleTargets.filter(
              (t) =>
                t.type === "minion" &&
                t.data.currentHealth <= attackerData.attack
            );
            if (killableMinions.length > 0) {
              /* ... */ targetToAttack = killableMinions[0];
            } else if (player.health <= attackerData.attack /* && no taunt */) {
              targetToAttack = possibleTargets.find((t) => t.type === "hero");
            } else {
              /* ... target highest attack minion or hero ... */
              let enemyMinions = possibleTargets.filter(
                (t) => t.type === "minion"
              );
              if (enemyMinions.length > 0) {
                enemyMinions.sort((a, b) => b.data.attack - a.data.attack);
                targetToAttack = enemyMinions[0];
              } else {
                targetToAttack = possibleTargets.find((t) => t.type === "hero");
              }
            }
          }

          if (targetToAttack && targetToAttack.data && targetToAttack.element) {
            // Ensure target is fully valid
            console.log(
              `AI: ${attackerData.name} (ID: ${
                attackerData.instanceId
              }) will attack ${
                targetToAttack.data.name || "Player Hero"
              } (ID: ${targetToAttack.element.id})`
            );
            // attackerData.hasAttackedThisTurn = true; // minionAttack will set this now
            minionAttack(
              attackerData,
              attackerElement,
              targetToAttack.data,
              targetToAttack.element
            );
            // Check if game ended during attack
            if (isGameOver) {
              resolve();
              return;
            }
            setTimeout(tryAttack, 1200 + Math.random() * 800);
            return;
          } else {
            console.log(
              `AI: ${attackerData.name} found no valid targets or target object malformed. Marking as done for attack phase.`
            );
            attackerData.hasAttackedThisTurn = true;
            setTimeout(tryAttack, 100); // Try next attacker quickly
            return;
          }
        }
        console.log(
          "AI: No more (valid) attacks to make. Ending attack phase."
        );
        resolve();
      };
      setTimeout(tryAttack, 500);
    });
  }

  function showTooltip(cardData, event, isHeroTooltip = false) {
    cardTooltipEl.innerHTML = ""; // Clear previous
    cardTooltipEl.style.display = "block";

    if (isHeroTooltip) {
      cardTooltipEl.innerHTML = `
                <div class="card-name">${cardData.name}</div>
                <div class="card-type">${cardData.type}</div>
                <div style="text-align:center; margin-top: 10px; font-size:18px; color:red;">❤ ${cardData.health}</div>
            `;
    } else {
      cardTooltipEl.innerHTML = `
                <div class="card-cost">${cardData.cost}</div>
                <div class="card-name">${cardData.name}</div>
                <div class="card-type">${cardData.type}</div>
                ${
                  cardData.text
                    ? `<div class="card-text">${cardData.text}</div>`
                    : ""
                }
                ${
                  cardData.type === "minion"
                    ? `
                    <div class="minion-attack">${cardData.attack}</div>
                    <div class="minion-health">${
                      cardData.currentHealth !== undefined
                        ? cardData.currentHealth
                        : cardData.health
                    }</div>
                `
                    : ""
                }
            `;
      cardTooltipEl.style.backgroundColor = cardData.color || "#c0c0c0";
      // Adjust text color for dark backgrounds
      if (isDark(cardData.color)) {
        cardTooltipEl.style.color = "white";
      } else {
        cardTooltipEl.style.color = "black";
      }
    }

    // Position tooltip near mouse, avoiding screen edges
    let x = event.clientX + 15;
    let y = event.clientY + 15;
    const tooltipRect = cardTooltipEl.getBoundingClientRect();
    const gameBoardRect = document
      .getElementById("game-board")
      .getBoundingClientRect();

    if (x + tooltipRect.width > gameBoardRect.right) {
      x = event.clientX - tooltipRect.width - 15;
    }
    if (y + tooltipRect.height > gameBoardRect.bottom) {
      y = event.clientY - tooltipRect.height - 15;
    }
    if (x < gameBoardRect.left) x = gameBoardRect.left + 5;
    if (y < gameBoardRect.top) y = gameBoardRect.top + 5;

    cardTooltipEl.style.left = `${x}px`;
    cardTooltipEl.style.top = `${y}px`;
  }

  function hideTooltip() {
    cardTooltipEl.style.display = "none";
  }
  function isDark(color) {
    // Simple check if color is dark, for text contrast
    if (!color) return false;
    const hex = color.replace("#", "");
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  startGame();
});
