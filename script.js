document.getElementById('start-game').addEventListener('click', async function() {
    const playerName = document.getElementById('player-name').value.trim();
    if (playerName) {
        startGame(playerName);
    } else {
        await showCustomAlert('请输入玩家姓名');
    }
});

// 定义卡牌类型
const CARD_TYPES = {
    DEATH: '死亡结局',
    SHIELD: '防护球',
    BAN: '禁止卡',
    FUNCTION: '功能牌',
    NORMAL: '普通牌'
};

// 定义所有卡牌
const CARDS = {
    // 死亡结局卡牌
    '死亡结局·陨石': { type: CARD_TYPES.DEATH, count: 1, description: '天降月球碎片，你不幸被砸中。', code: 'SI WANG', effect: 'MAYDAY!MAYDAY!' },
    '死亡结局·岩浆': { type: CARD_TYPES.DEATH, count: 1, description: '地震，你不幸落入岩浆。', code: 'SI WANG', effect: '杭州地下城，没了。' },
    '死亡结局·爆炸': { type: CARD_TYPES.DEATH, count: 1, description: '你乘坐的太空电梯轿厢爆炸了。', code: 'SI WANG', effect: 'BOOM！' },
    '死亡结局·耗尽': { type: CARD_TYPES.DEATH, count: 1, description: '缺乏补给，你的防护服能量耗尽了。', code: 'SI WANG', effect: '没有哪里是安全的。' },
    
    // 防护球
    '防护球': { type: CARD_TYPES.SHIELD, count: 2, description: 'UEG出品，防护效果一流，可抵御1次死亡结局。', code: 'FANG HU QIU', effect: '七成新，都检查过了。' },
    
    // 禁止卡
    '伏特加·禁止': { type: CARD_TYPES.BAN, count: 5, description: '任何时候都可以打出；可以阻止玩家的任何行为（死亡结局和防护球除外）；禁止卡可被禁止卡阻止。', code: 'WU LI JIN ZHI', effect: '你知道加加林时代为什么不允许带酒上太空吗？' },
    
    // 功能牌
    '550W': { type: CARD_TYPES.FUNCTION, count: 5, description: '查看抽牌堆的后3张牌后按原顺序放回。', code: '550W', effect: '您好，我量子体积8192。' },
    '电磁干扰枪': { type: CARD_TYPES.FUNCTION, count: 4, description: '本回合自己无需抽牌，下1位玩家需进行1次额外回合；可叠加使用。', code: 'DIAN CI GAN RAO QIANG', effect: '启动电磁枪，锁定目标！' },
    '地下城名额': { type: CARD_TYPES.FUNCTION, count: 4, description: '自己跳过本回合，无需抽牌。', code: 'ZHONG QIAN LA', effect: '我中签了，但我老婆儿子没有。' },
    '数字生命': { type: CARD_TYPES.FUNCTION, count: 4, description: '打乱当前牌库中剩余卡牌的顺序。', code: 'TONG TONG SHANG CHUAN', effect: '数字生命万岁！' },
    '多少随点': { type: CARD_TYPES.FUNCTION, count: 4, description: '向任意1位玩家讨要1张牌，由对方自选。', code: 'DUO SHAO SUI DIAN', effect: '这个好，帆了~' },
    
    // 普通牌
    '笨笨': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'DOG · BEN BEN', effect: '笨笨，你是条军犬！' },
    '门框机器人': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'MEN KUANG JI QI REN', effect: '禁止晾晒！' },
    '整点薯条': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'ZHENG DIAN SHU TIAO', effect: '去码头整点薯条。' },
    '叉车': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'CHA CHE', effect: '嘛哪！' },
    '冰美式': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'BING MEI SHI', effect: '一升装，吨吨吨……' }
};

let players = [];
let currentPlayerIndex = 0;
let deck = [];
let gameOver = false;
let deadPlayers = [];
let drawHistory = [];
let currentRound = 1;
let discardPile = []; // 弃牌堆
let extraTurns = {}; // 记录额外回合，格式：{playerName: count}
let lastCardUseTime = null; // 记录上一次使用卡牌的时间
let lastCardUser = null; // 记录上一次使用卡牌的玩家
let lastUsedCard = null; // 记录上一次使用的卡牌
let banCardTimeout = null; // 禁止卡的计时器
let cardUseHistory = []; // 用牌记录
let banCardQueue = []; // 禁止卡使用队列

// 添加AI玩家名字池
const AI_NAMES = [
    '刘培强', '韩朵朵', '张鹏', '马兆', '图恒宇', 
    '刘启', '韩子昂', '王磊', '周喆直', '郝晓晞', 
    '李一一', '550A', '550C', '550W', 'MOSS', '图丫丫'
];

// 获取随机AI名字
function getRandomAINames(count) {
    const shuffled = [...AI_NAMES].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
}

// 初始化牌组
function initializeDeck() {
    deck = [];
    for (const [cardName, card] of Object.entries(CARDS)) {
        for (let i = 0; i < card.count; i++) {
            deck.push({
                name: cardName,
                ...card
            });
        }
    }
    return shuffle(deck);
}

async function startGame(playerName) {
    if (!playerName) {
        await showCustomAlert('请输入玩家姓名！');
        return;
    }
    
    // 初始化游戏状态
    currentRound = 1;
    players = [];
    deadPlayers = [];
    drawHistory = [];
    cardUseHistory = [];
    extraTurns = {};
    
    // 创建玩家
    const humanPlayer = { name: playerName, cards: [], isAI: false };
    const aiNames = getRandomAINames(4);
    const aiPlayers = aiNames.map(name => ({ 
        name: name, 
        cards: [], 
        isAI: true 
    }));
    
    players = [humanPlayer, ...aiPlayers];
    
    // 初始化牌库并给每个玩家发放防护球
    deck = initializeDeck();
    players.forEach(player => {
        player.cards.push('防护球');
    });
    
    // 显示游戏界面
    document.getElementById('player-form').style.display = 'none';
    document.getElementById('game-info').style.display = 'block';
    
    // 更新游戏状态显示
    updateGameStatus();
    updateCardList();
    updateDrawHistory(); // 初始化抽牌历史
    
    // 设置初始状态
    currentPlayerIndex = 0;
    gameOver = false;
    document.getElementById('turn-info').textContent = `第${currentRound}回合 - 轮到 ${players[currentPlayerIndex].name} 了`;
    document.getElementById('drawn-card').textContent = '';
    document.getElementById('next-turn').style.display = 'block';
    document.getElementById('game-over').style.display = 'none';
}

document.getElementById('next-turn').addEventListener('click', async function() {
    if (gameOver) return;

    const currentPlayer = players[currentPlayerIndex];
    let skipDrawPhase = false;
    
    // 先处理使用卡牌阶段
    if (!currentPlayer.isAI) {
        let continueUsingCards = true;
        while (continueUsingCards) {
            const usableCards = getUsableCards(currentPlayer.cards);
            if (usableCards.length > 0) {
                const useCard = await showCardOptions(currentPlayer);
                if (!useCard) {
                    // 如果没有成功使用卡牌（比如取消选择），继续询问
                    continue;
                }
                // 检查是否使用了地下城名额
                if (typeof useCard === 'object' && useCard.skipDrawPhase) {
                    skipDrawPhase = true;
                    break;
                }
                // 检查是否还有可用卡牌
                const remainingUsableCards = getUsableCards(currentPlayer.cards);
                if (remainingUsableCards.length === 0) {
                    continueUsingCards = false;
                } else {
                    // 询问是否继续使用卡牌
                    continueUsingCards = await showCustomConfirm('您还有可以使用的卡牌，是否继续使用？');
                }
            } else {
                continueUsingCards = false;
            }
        }
        
        // 更新游戏状态
        updateCardList();
        updateGameStatus();
    } else {
        await handleAITurn(currentPlayer);
    }

    // 如果使用了地下城名额，跳过抽牌阶段
    if (skipDrawPhase) {
        return;
    }

    // 抽牌阶段
    if (deck.length === 0) {
        await showCustomAlert('牌库已空！游戏结束！');
        endGame();
        return;
    }

    const drawnCard = deck.pop();
    
    // 记录抽牌历史
    const drawRecord = {
        playerName: currentPlayer.name,
        card: drawnCard.name,
        time: new Date().toLocaleTimeString(),
        round: currentRound,
        useShield: false
    };
    drawHistory.push(drawRecord);
    updateDrawHistory();

    // 提示抽到的牌
    await showCustomAlert(`${currentPlayer.name} 抽到了：${drawnCard.name}`, true, drawnCard);

    // 处理卡牌效果
    if (drawnCard.type === CARD_TYPES.DEATH) {
        await handleDeathCard(currentPlayer, drawnCard);
    } else {
        // 将抽到的牌加入玩家手牌
        currentPlayer.cards.push(drawnCard.name);
        document.getElementById('drawn-card').textContent = `${currentPlayer.name} 抽到的牌是：${drawnCard.name}`;
        nextPlayerTurn();
    }

    updateCardList();
    updateGameStatus();
});

// 处理死亡结局卡牌
async function handleDeathCard(player, card) {
    if (player.cards.includes('防护球')) {
        player.cards = player.cards.filter(c => c !== '防护球');
        // 将死亡结局卡放入牌库随机位置
        const randomIndex = Math.floor(Math.random() * (deck.length + 1));
        deck.splice(randomIndex, 0, card);
        await showCustomAlert(`${player.name} 使用了"防护球"牌抵消了死亡结局！`);
        drawHistory[drawHistory.length - 1].useShield = true;
        // 记录使用防护球
        recordCardUse(player, '防护球', '抵消了死亡结局', card.name);
        updateCardList();
        updateDrawHistory();
        nextPlayerTurn();
        updateGameStatus();
        return;
    }

    // 玩家死亡
    await handlePlayerDeath(player, card);
}

// 处理玩家死亡
async function handlePlayerDeath(player, deathCard) {
    await showCustomAlert(`${player.name} 死亡！\n死因：${deathCard.name}\n${deathCard.description}`);
    deadPlayers.push({
        name: player.name,
        time: new Date().toLocaleTimeString(),
        round: currentRound,
        deathCard: deathCard.name,
        deathDescription: deathCard.description
    });
    
    // 将死亡玩家的所有卡牌加入弃牌堆
    if (player.cards.length > 0) {
        discardPile.push(...player.cards);
        player.cards = [];
    }
    
    updateDeadPlayersList();
    
    const playerIndex = players.indexOf(player);
    players.splice(playerIndex, 1);

        if (players.length === 1) {
            endGame();
        } else {
        if (currentPlayerIndex >= players.length) {
            currentPlayerIndex = 0;
        }
        nextPlayerTurn();
    }
    updateGameStatus();
}

// 处理玩家回合
async function handlePlayerTurn(player) {
    const usableCards = getUsableCards(player.cards);
    if (usableCards.length > 0) {
        const useCard = confirm('您有可以使用的卡牌，是否使用？');
        if (useCard) {
            await showCardOptions(player);
        }
    }
}

// 处理AI回合
async function handleAITurn(aiPlayer) {
    let usableCards = getUsableCards(aiPlayer.cards);
    if (usableCards.length === 0) return;

    // 优先级1：如果只有一张防护球，保留它
    if (aiPlayer.cards.filter(card => card === '防护球').length === 1) {
        usableCards = usableCards.filter(card => card !== '防护球');
    }

    // 优先级2：使用功能牌
    const functionCards = usableCards.filter(card => CARDS[card].type === CARD_TYPES.FUNCTION);
    if (functionCards.length > 0 && Math.random() < 0.8) { // 80%概率使用功能牌
        const cardToUse = functionCards[Math.floor(Math.random() * functionCards.length)];
        await useCard(aiPlayer, cardToUse);
        return;
    }

    // 优先级3：使用普通牌（如果有3张或以上）
    const normalCards = usableCards.filter(card => CARDS[card].type === CARD_TYPES.NORMAL);
    for (const cardName of normalCards) {
        const count = countCards(aiPlayer.cards, cardName);
        if (count >= 3 && Math.random() < 0.7) { // 70%概率使用3张
            await useCard(aiPlayer, cardName);
            return;
        }
    }

    // 优先级4：使用禁止卡（较低概率）
    const banCards = usableCards.filter(card => CARDS[card].type === CARD_TYPES.BAN);
    if (banCards.length > 0 && Math.random() < 0.3) { // 30%概率使用禁止卡
        const cardToUse = banCards[Math.floor(Math.random() * banCards.length)];
        await useCard(aiPlayer, cardToUse);
        return;
    }
}

// 获取可用卡牌
function getUsableCards(cards) {
    const cardCounts = {};
    cards.forEach(card => {
        cardCounts[card] = (cardCounts[card] || 0) + 1;
    });

    return Object.entries(cardCounts)
        .filter(([cardName, count]) => {
            const cardInfo = CARDS[cardName];
            if (cardInfo.type === CARD_TYPES.NORMAL) {
                return count >= 2; // 普通牌需要至少2张才能使用
            }
            return cardInfo.type === CARD_TYPES.FUNCTION || cardInfo.type === CARD_TYPES.BAN;
        })
        .map(([cardName]) => cardName);
}

// 显示卡牌选项
async function showCardOptions(player) {
    const usableCards = getUsableCards(player.cards);
    if (usableCards.length === 0) {
        await showCustomAlert('没有可以使用的卡牌。');
        return false;
    }

    const cardOptions = usableCards.map(card => {
        const cardInfo = CARDS[card];
        const cardCount = player.cards.filter(c => c === card).length;
        return `<option value="${card}">${card} (${cardCount}张) - ${cardInfo.description}</option>`;
    }).join('');
    
    const dialog = document.createElement('div');
    dialog.className = 'custom-alert';
    dialog.innerHTML = `
        <h3>选择要使用的卡牌</h3>
        <select class="custom-select">
            <option value="">请选择卡牌...</option>
            ${cardOptions}
        </select>
        <div class="button-container">
            <button onclick="this.parentElement.parentElement.dataset.result='cancel'">取消</button>
            <button onclick="this.parentElement.parentElement.dataset.result='confirm'">确定</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const result = await new Promise(resolve => {
        const select = dialog.querySelector('select');
        const buttons = dialog.querySelectorAll('button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const result = dialog.dataset.result === 'confirm' ? select.value : null;
                if (dialog.dataset.result === 'confirm' && result === '') {
                    // 如果点击确定但没有选择卡牌，不关闭对话框
                    return;
                }
                document.body.removeChild(overlay);
                resolve(result);
            });
        });
    });

    if (result) {
        const success = await useCard(player, result);
        return success;
    }
    return false;
}

// 统计卡牌数量
function countCards(cards, cardName) {
    return cards.filter(card => card === cardName).length;
}

// 使用卡牌
async function useCard(player, cardName) {
    const cardInfo = CARDS[cardName];
    let success = false;

    switch (cardInfo.type) {
        case CARD_TYPES.FUNCTION:
            success = await handleFunctionCard(player, cardName);
            break;
        case CARD_TYPES.NORMAL:
            success = await handleNormalCard(player, cardName);
            break;
        case CARD_TYPES.BAN:
            success = await handleBanCard(player, cardName);
            break;
    }

    if (success) {
        // 从玩家手牌中移除使用的卡牌
        const cardIndex = player.cards.indexOf(cardName);
        if (cardIndex !== -1) {
            player.cards.splice(cardIndex, 1);
        }
    updateCardList();
    }
    updateGameStatus();
}

// 处理功能牌
async function handleFunctionCard(player, cardName) {
    switch (cardName) {
        case '550W':
            const lastThreeCards = deck.slice(-3);
            await showCustomAlert(`${player.name} 使用了"${cardName}"：\n后3张牌是：\n${lastThreeCards.map(card => card.name).join('\n')}`);
            recordCardUse(player, cardName, '查看了牌库顶部3张牌');
            addToDiscardPile(cardName);
            return true;

        case '电磁干扰枪':
            const nextPlayer = players[(players.indexOf(player) + 1) % players.length];
            extraTurns[nextPlayer.name] = (extraTurns[nextPlayer.name] || 0) + 1;
            await showCustomAlert(`${player.name} 使用了"${cardName}"：\n${nextPlayer.name} 将在正常回合后进行 ${extraTurns[nextPlayer.name]} 次额外回合`);
            recordCardUse(player, cardName, '增加了额外回合', nextPlayer.name);
            addToDiscardPile(cardName);
            return true;

        case '地下城名额':
            recordCardUse(player, cardName, '使用了地下城名额');
            addToDiscardPile(cardName);
            // 跳过抽牌阶段，直接进入下一个玩家的回合
            nextPlayerTurn();
            updateCardList();
            updateGameStatus();
            return { skipDrawPhase: true };

        case '数字生命':
            deck = shuffle(deck);
            await showCustomAlert('牌库已重新洗牌！');
            recordCardUse(player, cardName, '重新洗牌');
            addToDiscardPile(cardName);
            return true;

        case '多少随点':
            if (players.length > 1) {
                const targetPlayer = player.isAI ? 
                    getRandomTarget(player) : 
                    await selectPlayer(player, cardName);
                    
                if (targetPlayer && targetPlayer.cards.length > 0) {
                    let selectedCard = null;
                    if (targetPlayer.isAI) {
                        selectedCard = getRandomCard(targetPlayer);
                    } else {
                        const cardOptions = targetPlayer.cards.map(card => 
                            `<option value="${card}">${card}</option>`).join('');
                            
                        const result = await new Promise(resolve => {
                            const dialog = document.createElement('div');
                            dialog.className = 'custom-alert';
                            dialog.innerHTML = `
                                <h3>选择要给出的卡牌</h3>
                                <select class="custom-select">
                                    <option value="">请选择卡牌...</option>
                                    ${cardOptions}
                                </select>
                                <div style="margin-top: 20px;">
                                    <button onclick="this.parentElement.parentElement.dataset.result='confirm'">确定</button>
                                </div>
                            `;
                            
                            document.body.appendChild(dialog);
                            
                            const select = dialog.querySelector('select');
                            const button = dialog.querySelector('button');
                            
                            setTimeout(() => {
                                if (dialog.parentNode) {
                                    selectedCard = getRandomCard(targetPlayer);
                                    document.body.removeChild(dialog);
                                    resolve(selectedCard);
                                }
                            }, 30000);
                            
                            button.addEventListener('click', () => {
                                selectedCard = select.value;
                                document.body.removeChild(dialog);
                                resolve(selectedCard);
                            });
                        });
                    }

                    if (selectedCard) {
                        transferCard(targetPlayer, player, selectedCard);
                        await showCustomAlert(`${targetPlayer.name} 给出了 ${selectedCard}`);
                        recordCardUse(player, cardName, '抽取了卡牌', targetPlayer.name);
                        addToDiscardPile(cardName);
                        return true;
                    }
                } else if (targetPlayer) {
                    await showCustomAlert(`${targetPlayer.name} 没有手牌！`);
                }
            }
            return false;
    }
    return false;
}

// 处理普通牌
async function handleNormalCard(player, cardName) {
    const cardCount = countCards(player.cards, cardName);
    if (cardCount >= 2) {
        const useCount = player.isAI ? 
            Math.random() < 0.7 ? 3 : 2 : // AI 70%概率使用3张，30%概率使用2张
            await selectCardCount(cardCount);
            
        if (useCount === 2 || useCount === 3) {
            const targetPlayer = player.isAI ? 
                getRandomTarget(player) : 
                await selectPlayer(player, cardName);
                
            if (targetPlayer) {
                if (targetPlayer.cards.length === 0) {
                    await showCustomAlert(`${targetPlayer.name} 没有手牌！`);
                    return false;
                }
                
                if (useCount === 2) {
                    const randomCard = getRandomCard(targetPlayer);
                    if (randomCard) {
                        player.cards.push(randomCard);
                        await showCustomAlert(`${player.name} 使用了"${cardName}"：\n从 ${targetPlayer.name} 手中抽取了 ${randomCard}`);
                        recordCardUse(player, cardName, '抽取了随机卡牌', targetPlayer.name);
                        removeCardsFromHand(player, cardName, 2);
                        addToDiscardPile(Array(2).fill(cardName));
                        return true;
                    }
                } else if (useCount === 3) {
                    if (player.isAI) {
                        // AI随机选择一张牌索要
                        const targetCards = targetPlayer.cards;
                        const requestedCard = targetCards[Math.floor(Math.random() * targetCards.length)];
                        if (targetPlayer.cards.includes(requestedCard)) {
                            transferCard(targetPlayer, player, requestedCard);
                            await showCustomAlert(`${player.name} 成功从 ${targetPlayer.name} 获得 ${requestedCard}`);
                            recordCardUse(player, cardName, '索要了卡牌', requestedCard);
                            removeCardsFromHand(player, cardName, 3);
                            addToDiscardPile(Array(3).fill(cardName));
                            return true;
                        }
                    } else {
                        // 玩家选择要索要的牌
                        const availableCards = getAllAvailableCards();
                        const cardOptions = availableCards.map(card => 
                            `<option value="${card}">${card}</option>`).join('');
                            
                        const result = await new Promise(resolve => {
                            const dialog = document.createElement('div');
                            dialog.className = 'custom-alert';
                            dialog.innerHTML = `
                                <h3>选择要索要的卡牌</h3>
                                <select class="custom-select">
                                    <option value="">请选择卡牌...</option>
                                    ${cardOptions}
                                </select>
                                <div style="margin-top: 20px;">
                                    <button onclick="this.parentElement.parentElement.dataset.result='cancel'">取消</button>
                                    <button onclick="this.parentElement.parentElement.dataset.result='confirm'" style="margin-left: 10px;">确定</button>
                                </div>
                            `;
                            
                            document.body.appendChild(dialog);
                            
                            const select = dialog.querySelector('select');
                            const buttons = dialog.querySelectorAll('button');
                            
                            buttons.forEach(button => {
                                button.addEventListener('click', () => {
                                    const result = dialog.dataset.result === 'confirm' ? select.value : null;
                                    document.body.removeChild(dialog);
                                    resolve(result);
                                });
                            });
                        });
                        
                        if (result) {
                            if (targetPlayer.cards.includes(result)) {
                                transferCard(targetPlayer, player, result);
                                await showCustomAlert(`成功从 ${targetPlayer.name} 获得 ${result}`);
                                recordCardUse(player, cardName, '索要了卡牌', result);
                                removeCardsFromHand(player, cardName, 3);
                                addToDiscardPile(Array(3).fill(cardName));
                                return true;
                            } else {
                                await showCustomAlert('目标玩家没有这张卡牌！');
                                removeCardsFromHand(player, cardName, 3);
                                addToDiscardPile(Array(3).fill(cardName));
                                return true; // 使用失败但仍然消耗卡牌
                            }
                        }
                    }
                }
            }
        }
    }
    return false;
}

// 处理禁止卡
async function handleBanCard(player, cardName) {
    if (!canUseBanCard()) {
        await showCustomAlert(`${player.name} 使用"${cardName}"失败：\n现在不能使用禁止卡！`);
        return false;
    }

    banCardQueue.push({
        player: player,
        cardName: cardName
    });

    if (banCardQueue.length === 1) {
        return await processBanCard();
    } else {
        await showCustomAlert('您的禁止卡已加入队列，等待前一张禁止卡处理完成。');
        return false;
    }
}

// 处理禁止卡队列
async function processBanCard() {
    if (banCardQueue.length === 0) return false;

    const currentBan = banCardQueue[0];
    const player = currentBan.player;
    const cardName = currentBan.cardName;

    // 记录禁止卡使用
    lastCardUseTime = Date.now();
    lastCardUser = player;
    lastUsedCard = cardName;

    // 等待其他玩家的禁止卡响应
    const otherPlayers = players.filter(p => p !== player);
    let isBlocked = false;

    for (const otherPlayer of otherPlayers) {
        if (otherPlayer.cards.includes('伏特加·禁止')) {
            let useCounter = false;
            
            if (otherPlayer.isAI) {
                useCounter = Math.random() < 0.3;
            } else {
                useCounter = await new Promise(resolve => {
                    setTimeout(() => resolve(false), 5000);
                    const response = confirm(`${player.name} 使用了禁止卡！\n您要使用禁止卡来阻止吗？`);
                    resolve(response);
                });
            }

            if (useCounter) {
                isBlocked = true;
                removeCardsFromHand(otherPlayer, '伏特加·禁止', 1);
                addToDiscardPile('伏特加·禁止');
                break;
            }
        }
    }

    if (!isBlocked) {
        removeCardsFromHand(player, cardName, 1);
        addToDiscardPile(cardName);
        
        // 处理撤销逻辑
        if (lastUsedCard) {
            // TODO: 实现具体的撤销逻辑
        }
    }

    // 移除当前处理的禁止卡
    banCardQueue.shift();

    // 如果队列中还有禁止卡，处理下一张
    if (banCardQueue.length > 0) {
        setTimeout(async () => {
            await processBanCard();
        }, 1000);
    }

    resetBanCardState();
    return !isBlocked;
}

// 选择玩家
async function selectPlayer(currentPlayer, cardName) {
    const otherPlayers = players.filter(p => p !== currentPlayer && !deadPlayers.some(dp => dp.name === p.name));
    const playerOptions = otherPlayers.map(p => `<option value="${p.name}">${p.name}</option>`).join('');
    
    const cardInfo = CARDS[cardName];
    const result = await new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-alert';
        dialog.innerHTML = `
            <h3>使用卡牌：${cardName}</h3>
            <p>效果：${cardInfo.description}</p>
            <select class="custom-select">
                <option value="">请选择目标玩家...</option>
                ${playerOptions}
            </select>
            <div style="margin-top: 20px;">
                <button onclick="this.parentElement.parentElement.dataset.result='cancel'">取消</button>
                <button onclick="this.parentElement.parentElement.dataset.result='confirm'" style="margin-left: 10px;">确定</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const select = dialog.querySelector('select');
        const buttons = dialog.querySelectorAll('button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const result = dialog.dataset.result === 'confirm' ? select.value : null;
                document.body.removeChild(dialog);
                resolve(result);
            });
        });
    });
    
    return result ? players.find(p => p.name === result) : null;
}

// 选择使用卡牌数量
async function selectCardCount(maxCount) {
    const options = Array.from({length: maxCount - 1}, (_, i) => i + 2)
        .map(num => `<option value="${num}">${num}张</option>`).join('');
    
    const result = await new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-alert';
        dialog.innerHTML = `
            <h3>选择使用数量</h3>
            <select class="custom-select">
                <option value="">请选择使用数量...</option>
                ${options}
            </select>
            <div style="margin-top: 20px;">
                <button onclick="this.parentElement.parentElement.dataset.result='cancel'">取消</button>
                <button onclick="this.parentElement.parentElement.dataset.result='confirm'" style="margin-left: 10px;">确定</button>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const select = dialog.querySelector('select');
        const buttons = dialog.querySelectorAll('button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const result = dialog.dataset.result === 'confirm' ? parseInt(select.value) : 0;
                document.body.removeChild(dialog);
                resolve(result);
            });
        });
    });
    
    return result;
}

function nextPlayerTurn() {
    if (players.length === 0) return;

    if (currentPlayerIndex >= players.length) {
        currentPlayerIndex = 0;
    }

        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
    const nextPlayer = players[currentPlayerIndex];

    // 处理额外回合
    if (extraTurns[nextPlayer.name] > 0) {
        extraTurns[nextPlayer.name]--;
        if (extraTurns[nextPlayer.name] === 0) {
            delete extraTurns[nextPlayer.name];
        }
    }
    
    // 当轮到第一个玩家时，增加回合数
    if (currentPlayerIndex === 0) {
        currentRound++;
    }
    
    document.getElementById('turn-info').textContent = 
        `第${currentRound}回合 - 轮到 ${nextPlayer.name} 了` + 
        (extraTurns[nextPlayer.name] ? ` (额外回合 ${extraTurns[nextPlayer.name]})` : '');
    updateGameStatus();
}

function endGame() {
    gameOver = true;
    document.getElementById('turn-info').textContent = '';
    document.getElementById('drawn-card').textContent = '';
    document.getElementById('next-turn').style.display = 'none';
    document.getElementById('game-over').style.display = 'block';
    const winner = players[0];
    document.getElementById('winner-info').textContent = `${winner.name} 获胜！`;
    
    // 显示获胜弹窗
    showCustomAlert(`游戏结束！\n\n🎉 恭喜 ${winner.name} 获得胜利！\n\n您成功在流浪地球的世界中存活到了最后！`);
}

document.getElementById('restart-game').addEventListener('click', function() {
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('player-form').style.display = 'block';
    document.getElementById('player-name').value = '';
});

function updateCardList() {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) {
        document.getElementById('card-list').textContent = '无';
        return;
    }
    
    const cardListElement = document.getElementById('card-list');
    cardListElement.innerHTML = currentPlayer.cards.map(cardName => {
        const cardInfo = CARDS[cardName];
        return `<span class="card-name ${cardInfo.type.toLowerCase()}-card">
            ${cardName}
            <span class="card-tooltip">效果：${cardInfo.description}</span>
        </span>`;
    }).join(', ') || '无';
}

function shuffle(array) {
    let currentIndex = array.length, randomIndex, temporaryValue;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

function updateDeadPlayersList() {
    const deadPlayersList = document.getElementById('dead-players-list');
    if (!deadPlayersList) {
        console.warn('找不到死亡玩家列表元素');
        return;
    }
    
    deadPlayersList.innerHTML = '';
    
    // 按时间倒序排序
    const sortedDeadPlayers = [...deadPlayers].sort((a, b) => 
        new Date(b.time) - new Date(a.time)
    );
    
    sortedDeadPlayers.forEach((player, index) => {
        const li = document.createElement('li');
        li.innerHTML = `${player.name} - 第${player.round}回合阵亡 (${player.time})<br>` +
                      `<span class="death-card">死因：${player.deathCard}</span><br>` +
                      `<span class="death-description">${player.deathDescription}</span>`;
        deadPlayersList.appendChild(li);
    });
}

function updateDrawHistory() {
    // 如果游戏还没开始，不更新历史记录
    if (!document.getElementById('game-info').style.display || 
        document.getElementById('game-info').style.display === 'none') {
        return;
    }

    const drawHistoryList = document.getElementById('draw-history-list');
    if (!drawHistoryList) {
        console.warn('找不到抽牌历史列表元素');
        return;
    }
    
    drawHistoryList.innerHTML = '';
    const recentHistory = drawHistory.slice(-10).reverse();
    
    recentHistory.forEach(record => {
        const li = document.createElement('li');
        const cardClass = record.card.includes('死亡结局') ? 'death-card' : 'normal-card';
        let text = `${record.playerName} 抽到了 <span class="${cardClass}">${record.card}</span>`;
        
        if (record.card.includes('死亡结局')) {
            if (record.useShield) {
                text += ' (使用防护球)';
            } else {
                text += ' (阵亡)';
            }
        }
        
        li.innerHTML = `${text} <span class="draw-time">- 第${record.round}回合 (${record.time})</span>`;
        drawHistoryList.appendChild(li);
    });
}

// 获取所有可用的卡牌列表（除死亡结局外）
function getAllAvailableCards() {
    return Object.keys(CARDS).filter(cardName => !cardName.startsWith('死亡结局'));
}

// 从玩家手牌中移除指定数量的卡牌
function removeCardsFromHand(player, cardName, count) {
    let removed = 0;
    player.cards = player.cards.filter(card => {
        if (card === cardName && removed < count) {
            removed++;
            return false;
        }
        return true;
    });
    return removed === count;
}

// 将卡牌加入弃牌堆
function addToDiscardPile(cards) {
    if (Array.isArray(cards)) {
        discardPile.push(...cards);
    } else {
        discardPile.push(cards);
    }
}

// 获取玩家最早获得的一张牌
function getEarliestCard(player) {
    return player.cards[0];
}

// 检查是否可以使用禁止卡
function canUseBanCard() {
    return lastCardUseTime && (Date.now() - lastCardUseTime) <= 5000;
}

// 重置禁止卡状态
function resetBanCardState() {
    lastCardUseTime = null;
    lastCardUser = null;
    lastUsedCard = null;
    if (banCardTimeout) {
        clearTimeout(banCardTimeout);
        banCardTimeout = null;
    }
}

// 开始禁止卡计时
function startBanCardTimer(callback) {
    if (banCardTimeout) {
        clearTimeout(banCardTimeout);
    }
    banCardTimeout = setTimeout(() => {
        resetBanCardState();
        if (callback) callback();
    }, 5000);
}

// 转移卡牌
function transferCard(fromPlayer, toPlayer, cardName) {
    const cardIndex = fromPlayer.cards.indexOf(cardName);
    if (cardIndex !== -1) {
        fromPlayer.cards.splice(cardIndex, 1);
        toPlayer.cards.push(cardName);
        return true;
    }
    return false;
}

// 获取随机卡牌
function getRandomCard(player) {
    if (player.cards.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * player.cards.length);
    const card = player.cards[randomIndex];
    player.cards.splice(randomIndex, 1);
    return card;
}

// 更新游戏状态显示
function updateGameStatus() {
    // 更新当前回合数显示
    document.getElementById('current-round').textContent = currentRound;

    // 更新牌库和弃牌堆数量
    document.getElementById('deck-count').textContent = deck.length;
    document.getElementById('discard-count').textContent = discardPile.length;

    // 更新玩家顺序和手牌数量
    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    // 重新排序玩家列表，当前玩家在最前面
    const orderedPlayers = [...players];
    const currentToEnd = orderedPlayers.splice(0, currentPlayerIndex);
    orderedPlayers.push(...currentToEnd);

    orderedPlayers.forEach((player, index) => {
        const li = document.createElement('li');
        li.className = index === 0 ? 'current' : '';
        li.innerHTML = `
            <span>${player.name}${player.isAI ? ' (AI)' : ''}</span>
            <span class="cards-count">手牌: ${player.cards.length}张</span>
        `;
        playersList.appendChild(li);
    });
}

// 添加记录卡牌使用的函数
function recordCardUse(player, cardName, action, target = null) {
    const record = {
        playerName: player.name,
        cardName: cardName,
        action: action,
        target: target,
        time: new Date().toLocaleTimeString(),
        round: currentRound
    };
    cardUseHistory.push(record);
    updateCardUseHistory();
}

// 修改更新卡牌使用记录显示的函数
function updateCardUseHistory() {
    const historyList = document.getElementById('card-use-history-list');
    if (!historyList) return;
    
    historyList.innerHTML = '';
    
    // 显示最近的10条记录
    const recentHistory = cardUseHistory.slice(-10).reverse();
    
    recentHistory.forEach(record => {
        const li = document.createElement('li');
        const cardInfo = CARDS[record.cardName];
        const cardClass = cardInfo ? cardInfo.type.toLowerCase() : 'normal';
        
        let text = `[${record.round}回合] ${record.playerName} `;
        text += `使用了 <span class="card-name ${cardClass}-card">${record.cardName}</span>`;
        if (record.target) {
            text += ` → <span class="card-target">${record.target}</span>`;
        }
        text += ` (${record.action})`;
        text += ` <span class="card-use-time">${record.time}</span>`;
        
        li.innerHTML = text;
        historyList.appendChild(li);
    });
}

// 获取随机目标玩家
function getRandomTarget(currentPlayer) {
    const possibleTargets = players.filter(p => 
        p !== currentPlayer && !deadPlayers.some(dp => dp.name === p.name));
    return possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
}

// 添加事件监听
document.getElementById('show-dead-players').addEventListener('click', showDeadPlayersDialog);
document.getElementById('show-draw-history').addEventListener('click', showDrawHistoryDialog);

// 显示阵亡玩家弹窗
async function showDeadPlayersDialog() {
    if (deadPlayers.length === 0) {
        await showCustomAlert('目前还没有玩家阵亡。');
        return;
    }

    const sortedDeadPlayers = [...deadPlayers].sort((a, b) => 
        new Date(b.time) - new Date(a.time)
    );

    const dialog = document.createElement('div');
    dialog.className = 'custom-alert history-dialog';
    dialog.innerHTML = `
        <div class="custom-alert-content">
            <h3>阵亡玩家列表</h3>
            <ul class="history-list">
                ${sortedDeadPlayers.map(player => `
                    <li>
                        ${player.name} - 第${player.round}回合阵亡 (${player.time})<br>
                        <span class="death-card">死因：${player.deathCard}</span><br>
                        <span class="death-description">${player.deathDescription}</span>
                    </li>
                `).join('')}
            </ul>
        </div>
        <div class="button-container">
            <button onclick="this.closest('.custom-alert-overlay').remove()">关闭</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

// 显示抽牌记录弹窗
async function showDrawHistoryDialog() {
    if (drawHistory.length === 0) {
        await showCustomAlert('目前还没有抽牌记录。');
        return;
    }

    const recentHistory = drawHistory.slice(-20).reverse();
    
    const dialog = document.createElement('div');
    dialog.className = 'custom-alert history-dialog';
    dialog.innerHTML = `
        <div class="custom-alert-content">
            <h3>抽牌记录</h3>
            <ul class="history-list">
                ${recentHistory.map(record => {
                    const cardClass = record.card.includes('死亡结局') ? 'death-card' : 'normal-card';
                    let text = `${record.playerName} 抽到了 <span class="${cardClass}">${record.card}</span>`;
                    if (record.card.includes('死亡结局')) {
                        text += record.useShield ? ' (使用防护球)' : ' (阵亡)';
                    }
                    return `<li>${text} <span class="draw-time">- 第${record.round}回合 (${record.time})</span></li>`;
                }).join('')}
            </ul>
        </div>
        <div class="button-container">
            <button onclick="this.closest('.custom-alert-overlay').remove()">关闭</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

// 修改显示卡牌的弹窗函数
async function showCustomAlert(message, isCard = false, cardInfo = null) {
    return new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-alert';

        if (isCard && cardInfo) {
            dialog.innerHTML = `
                <div class="card-alert">
                    <div class="card-header">THE WANDERING EARTH</div>
                    <div class="card-title">${cardInfo.name}</div>
                    <div class="card-code">${cardInfo.code}</div>
                    <div class="card-effect">${cardInfo.effect}</div>
                    <div class="card-description">${cardInfo.description}</div>
                    <div class="card-footer">在流浪地球世界里你能活多久</div>
                </div>
                <div class="button-container">
                    <button onclick="this.parentElement.parentElement.remove(); resolve();">确定</button>
                </div>
            `;
        } else {
            dialog.innerHTML = `
                <div class="custom-alert-content">
                    <p>${message}</p>
                </div>
                <div class="button-container">
                    <button onclick="this.parentElement.parentElement.remove(); resolve();">确定</button>
                </div>
            `;
        }

        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        dialog.querySelector('button').onclick = () => {
            document.body.removeChild(overlay);
            resolve();
        };
    });
}

async function showCustomConfirm(message) {
    return new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-alert';
        dialog.innerHTML = `
            <div class="custom-alert-content">
                <p>${message}</p>
            </div>
            <div class="button-container">
                <button onclick="this.parentElement.parentElement.dataset.result='false'">否</button>
                <button onclick="this.parentElement.parentElement.dataset.result='true'">是</button>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        dialog.querySelectorAll('button').forEach(button => {
            button.onclick = () => {
                const result = dialog.dataset.result === 'true';
                document.body.removeChild(overlay);
                resolve(result);
            };
        });
    });
}

// 在其他玩家使用卡牌时弹窗提示是否阻止
async function handleCardUseWithBanOption(player, cardName) {
    const otherPlayers = players.filter(p => p !== player && p.cards.includes('伏特加·禁止'));
    let isBlocked = false;

    for (const otherPlayer of otherPlayers) {
        const useCounter = await new Promise(resolve => {
            setTimeout(() => resolve(false), 5000);
            const response = confirm(`${player.name} 想使用 ${cardName}！\n您要使用禁止卡来阻止吗？`);
            resolve(response);
        });

        if (useCounter) {
            isBlocked = true;
            removeCardsFromHand(otherPlayer, '伏特加·禁止', 1);
            addToDiscardPile('伏特加·禁止');
            break;
        }
    }

    if (!isBlocked) {
        await useCard(player, cardName);
    } else {
        addToDiscardPile(cardName);
    }
}
