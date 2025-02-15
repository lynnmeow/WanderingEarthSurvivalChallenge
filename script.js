// 全局变量
let currentUser = null;
let currentRoom = null;

// DOM 元素
const authForm = document.getElementById('auth-form');
const gameLobby = document.getElementById('game-lobby');
const roomView = document.getElementById('room-view');
const gameView = document.getElementById('game-view');

// 初始化时隐藏顶部按钮
document.addEventListener('DOMContentLoaded', () => {
    const topBar = document.querySelector('.top-bar');
    if (topBar) topBar.style.display = 'none';
});

// 登录/注册切换
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.auth-panel').forEach(panel => panel.classList.remove('active'));
        
        button.classList.add('active');
        document.getElementById(`${button.dataset.tab}-form`).classList.add('active');
    });
});

// 注册功能
document.getElementById('register-button').addEventListener('click', async () => {
    const email = document.getElementById('register-email').value;
    const nickname = document.getElementById('register-nickname').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;

    if (!email || !nickname || !password || !confirmPassword) {
        await showCustomAlert('请填写完整的注册信息');
        return;
    }

    if (password !== confirmPassword) {
        await showCustomAlert('两次输入的密码不一致');
        return;
    }

    if (!window.userSystem) {
        await showCustomAlert('系统错误：用户系统未初始化');
        return;
    }

    const result = window.userSystem.register(email, nickname, password);
    
    if (result.success) {
        await showCustomAlert('注册成功，请登录');
        // 切换到登录面板
        document.querySelector('[data-tab="login"]').click();
    } else {
        await showCustomAlert(result.message);
    }
});

// 页面加载时检查是否有保存的邮箱
document.addEventListener('DOMContentLoaded', () => {
    const savedEmail = localStorage.getItem('savedEmail');
    if (savedEmail) {
        document.getElementById('login-email').value = savedEmail;
    }
});

// 登录功能
document.getElementById('login-button').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const rememberEmail = document.getElementById('remember-email').checked;

    if (!email || !password) {
        await showCustomAlert('请填写完整的登录信息');
        return;
    }

    if (!window.userSystem) {
        await showCustomAlert('系统错误：用户系统未初始化');
        return;
    }

    const result = window.userSystem.login(email, password);
    
    if (result.success) {
        // 保存邮箱
        if (rememberEmail) {
            localStorage.setItem('savedEmail', email);
        } else {
            localStorage.removeItem('savedEmail');
        }

        currentUser = result.user;
        const authForm = document.getElementById('auth-form');
        const gameLobby = document.getElementById('game-lobby');
        const titleButtons = document.querySelector('.title-buttons');
        const userNickname = document.getElementById('user-nickname');
        
        if (authForm) authForm.style.display = 'none';
        if (gameLobby) gameLobby.style.display = 'block';
        if (titleButtons) titleButtons.style.display = 'flex';
        if (userNickname) userNickname.textContent = currentUser.nickname;
    } else {
        await showCustomAlert(result.message);
    }
});

// 退出登录
document.getElementById('logout-button').addEventListener('click', async () => {
    currentUser = null;
    document.getElementById('game-lobby').style.display = 'none';
    document.getElementById('auth-form').style.display = 'block';
    document.querySelector('.top-bar').style.display = 'none';
    
    // 关闭所有模态框
    document.querySelectorAll('.modal-panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    await showCustomAlert('已退出登录');
});

// 创建房间按钮
document.getElementById('create-room-button').addEventListener('click', () => {
    document.getElementById('room-name').value = `${currentUser.nickname}的房间`;
    document.getElementById('create-room-panel').style.display = 'block';
});

// 确认创建房间
document.getElementById('create-room-confirm').addEventListener('click', async () => {
    const name = document.getElementById('room-name').value;
    const password = document.getElementById('room-password').value;

    if (!name) {
        await showCustomAlert('请输入房间名称');
        return;
    }

    const room = window.roomManager.createRoom(name, password, currentUser);
    currentRoom = room;
    
    // 显示房间视图
    document.getElementById('create-room-panel').style.display = 'none';
    gameLobby.style.display = 'none';
    showRoomView(room);
});

// 取消创建房间
document.getElementById('create-room-cancel').addEventListener('click', () => {
    document.getElementById('create-room-panel').style.display = 'none';
    document.getElementById('room-name').value = '';
    document.getElementById('room-password').value = '';
});

// 加入房间按钮
document.getElementById('join-room-button').addEventListener('click', () => {
    document.getElementById('room-list-panel').style.display = 'block';
    updateRoomList();
});

// 刷新房间列表
document.getElementById('refresh-room-list').addEventListener('click', () => {
    updateRoomList();
});

// 返回大厅
document.getElementById('room-list-back').addEventListener('click', () => {
    document.getElementById('room-list-panel').style.display = 'none';
});

// 更新房间列表
function updateRoomList() {
    const roomList = document.getElementById('room-list');
    const rooms = window.roomManager.getRoomList();
    
    roomList.innerHTML = rooms.map(room => `
        <div class="room-item" data-room-id="${room.id}">
            <div class="room-name">${room.name}</div>
            <div class="room-info">
                ${room.playerCount}/${room.maxPlayers}人 
                ${room.hasPassword ? '🔒' : ''}
            </div>
            <div class="room-status ${getStatusClass(room)}">
                ${getStatusText(room)}
            </div>
        </div>
    `).join('') || '<div class="no-rooms">暂无可用房间</div>';

    // 绑定点击事件
    roomList.querySelectorAll('.room-item').forEach(item => {
        item.addEventListener('click', async () => {
            const roomId = parseInt(item.dataset.roomId);
            const room = window.roomManager.getRoom(roomId);
            
            if (room.hasPassword) {
                showJoinRoomPasswordPanel(roomId);
            } else {
                joinRoom(roomId);
            }
        });
    });
}

// 获取房间状态样式
function getStatusClass(room) {
    if (room.isStarted) return 'started';
    if (room.playerCount >= room.maxPlayers) return 'full';
    if (room.hasPassword) return 'locked';
    return 'open';
}

// 获取房间状态文本
function getStatusText(room) {
    if (room.isStarted) return '游戏中';
    if (room.playerCount >= room.maxPlayers) return '已满';
    if (room.hasPassword) return '需密码';
    return '可加入';
}

// 显示加入房间密码面板
function showJoinRoomPasswordPanel(roomId) {
    const panel = document.getElementById('join-room-panel');
    panel.style.display = 'block';
    panel.dataset.roomId = roomId;
}

// 确认加入房间
document.getElementById('join-room-confirm').addEventListener('click', async () => {
    const panel = document.getElementById('join-room-panel');
    const roomId = parseInt(panel.dataset.roomId);
    const password = document.getElementById('join-room-password').value;
    
    const result = window.roomManager.joinRoom(roomId, password, currentUser);
    if (result.success) {
        currentRoom = result.room;
        panel.style.display = 'none';
        document.getElementById('room-list-panel').style.display = 'none';
        document.getElementById('join-room-password').value = '';
        gameLobby.style.display = 'none';
        showRoomView(currentRoom);
    } else {
        await showCustomAlert(result.message);
    }
});

// 取消加入房间
document.getElementById('join-room-cancel').addEventListener('click', () => {
    const panel = document.getElementById('join-room-panel');
    panel.style.display = 'none';
    document.getElementById('join-room-password').value = '';
});

// 人机对战按钮
document.getElementById('ai-room-button').addEventListener('click', () => {
    document.getElementById('ai-room-panel').style.display = 'block';
});

// 确认创建人机房间
document.getElementById('ai-room-confirm').addEventListener('click', async () => {
    const aiCount = parseInt(document.getElementById('ai-count').value);
    const result = window.roomManager.createAIRoom(currentUser, aiCount);
    
    if (result.success) {
        document.getElementById('ai-room-panel').style.display = 'none';
        showRoomView(result.room);
        // 自动开始游戏
        startGame(result.room.players);
    } else {
        await showCustomAlert(result.message);
    }
});

// 取消创建人机房间
document.getElementById('ai-room-cancel').addEventListener('click', () => {
    document.getElementById('ai-room-panel').style.display = 'none';
});

// 显示房间视图
function showRoomView(room) {
    if (!room) {
        console.error('房间信息不存在');
        return;
    }

    const roomView = document.getElementById('room-view');
    const gameLobby = document.getElementById('game-lobby');
    
    if (!roomView || !gameLobby) {
        console.error('找不到必要的视图元素');
        return;
    }

    roomView.style.display = 'block';
    gameLobby.style.display = 'none';
    
    const roomNameElement = document.getElementById('current-room-name');
    if (roomNameElement) {
        roomNameElement.textContent = room.name || '未命名房间';
    }
    
    updateRoomPlayerList(room);
    
    // 只有房主且人数大于等于2人时才显示开始游戏按钮
    const startButton = document.getElementById('start-game-button');
    if (startButton) {
        startButton.style.display = 
            (room.creator && room.creator.email === currentUser.email && room.players && room.players.length >= 2)
                ? 'block' 
                : 'none';
    }
}

// 更新房间玩家列表
function updateRoomPlayerList(room) {
    if (!room || !room.players) {
        console.error('房间或玩家列表不存在');
        return;
    }

    const playerList = document.getElementById('room-player-list');
    if (!playerList) {
        console.error('找不到玩家列表元素');
        return;
    }

    playerList.innerHTML = '';
    room.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        playerItem.innerHTML = `
            <span class="player-name">${player.nickname || '未知玩家'}</span>
            ${player.isAI ? '<span class="ai-tag">AI</span>' : ''}
            ${room.creator && player.email === room.creator.email ? '<span class="host-tag">房主</span>' : ''}
        `;
        playerList.appendChild(playerItem);
    });
}

// 获取玩家样式类
function getPlayerClass(player) {
    if (player.isAI) return 'ai';
    if (player.email === currentRoom.creator.email) return 'creator';
    return '';
}

// 开始游戏按钮
document.getElementById('start-game-button').addEventListener('click', async () => {
    const result = window.roomManager.startGame(currentRoom.id);
    if (result.success) {
        roomView.style.display = 'none';
        startGame(currentRoom.players);
    } else {
        await showCustomAlert(result.message);
    }
});

// 离开房间按钮
document.getElementById('leave-room-button').addEventListener('click', async () => {
    const result = window.roomManager.leaveRoom(currentRoom.id, currentUser);
    if (result.success) {
        roomView.style.display = 'none';
        gameLobby.style.display = 'block';
        currentRoom = null;
        await showCustomAlert(result.message);
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
    '伏特加·禁止': { type: CARD_TYPES.BAN, count: 5, description: '任何时候都可以打出；<p>可以阻止玩家的任何行为（死亡结局和防护球除外）；禁止卡可被禁止卡阻止。', code: 'WU LI JIN ZHI', effect: '你知道加加林时代为什么不允许带酒上太空吗？' },
    
    // 功能牌
    '550W': { type: CARD_TYPES.FUNCTION, count: 5, description: '查看抽牌堆的后3张牌后按原顺序放回。', code: '550W', effect: '您好，我量子体积8192。' },
    '电磁干扰枪': { type: CARD_TYPES.FUNCTION, count: 4, description: '本回合自己无需抽牌，下1位玩家需进行1次额外回合；<p>可叠加使用。', code: 'DIAN CI GAN RAO QIANG', effect: '启动电磁枪，锁定目标！' },
    '地下城名额': { type: CARD_TYPES.FUNCTION, count: 4, description: '自己跳过本回合，无需抽牌。', code: 'ZHONG QIAN LA', effect: '我中签了，但我老婆儿子没有。' },
    '数字生命': { type: CARD_TYPES.FUNCTION, count: 4, description: '打乱当前牌库中剩余卡牌的顺序。', code: 'TONG TONG SHANG CHUAN', effect: '数字生命万岁！' },
    '多少随点': { type: CARD_TYPES.FUNCTION, count: 4, description: '向任意1位玩家讨要1张牌，由对方自选。', code: 'DUO SHAO SUI DIAN', effect: '这个好，帆了~' },
    
    // 普通牌
    '笨笨': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；<p>使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'DOG · BEN BEN', effect: '笨笨，你是条军犬！' },
    '门框机器人': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；<p>使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'MEN KUANG JI QI REN', effect: '禁止晾晒！' },
    '整点薯条': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；<p>使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'ZHENG DIAN SHU TIAO', effect: '去码头整点薯条。' },
    '叉车': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；<p>使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'CHA CHE', effect: '嘛哪！' },
    '冰美式': { type: CARD_TYPES.NORMAL, count: 4, description: '不可单独使用。使用2张，可从任意1位玩家手牌中抽取随机1张；<p>使用3张，可向任意1位玩家讨要1张指定卡牌，若其没有则无效。', code: 'BING MEI SHI', effect: '一升装，吨吨吨……' }
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

// 用于记录当前房间已使用的AI名字
let usedAINames = new Set();

// 重置已使用的AI名字记录
function resetUsedAINames() {
    usedAINames.clear();
}

// 获取随机AI名字
function getRandomAIName() {
    // 过滤掉已经使用过的名字
    const availableNames = AI_NAMES.filter(name => !usedAINames.has(name));
    
    if (availableNames.length === 0) {
        // 如果所有名字都被使用了，生成一个带数字的随机名字
        let index = 1;
        let newName;
        do {
            newName = `AI玩家${index}`;
            index++;
        } while (usedAINames.has(newName));
        usedAINames.add(newName);
        return newName;
    }
    
    // 随机选择一个可用名字
    const randomName = availableNames[Math.floor(Math.random() * availableNames.length)];
    usedAINames.add(randomName);
    return randomName;
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

async function startGame(roomPlayers) {
    // 检查参数
    if (!roomPlayers || !Array.isArray(roomPlayers)) {
        console.error('无效的玩家列表');
        await showCustomAlert('开始游戏失败：无效的玩家列表');
        return;
    }

    try {
        // 初始化游戏状态
        currentRound = 1;
        players = [];
        deadPlayers = [];
        drawHistory = [];
        cardUseHistory = [];
        extraTurns = {};
        
        // 重置已使用的AI名字记录
        resetUsedAINames();
        
        // 初始化玩家
        players = roomPlayers.map(player => ({
            ...player,
            cards: ['防护球'],
            isAI: player.isAI || false,
            nickname: player.isAI ? getRandomAIName() : (player.nickname || '未知玩家')
        }));
        
        // 初始化牌库
        deck = initializeDeck();
        
        // 更新界面显示
        const gameView = document.getElementById('game-view');
        const roomView = document.getElementById('room-view');
        const gameLobby = document.getElementById('game-lobby');
        
        if (gameView) gameView.style.display = 'block';
        if (roomView) roomView.style.display = 'none';
        if (gameLobby) gameLobby.style.display = 'none';
        
        // 更新游戏状态
        updateGameStatus();
        updateCardList();
        updateDrawHistory();
        
        // 设置初始状态
        currentPlayerIndex = 0;
        gameOver = false;
        
        // 更新回合信息
        const turnInfo = document.getElementById('turn-info');
        const drawnCard = document.getElementById('drawn-card');
        const nextTurn = document.getElementById('next-turn');
        const gameOverElement = document.getElementById('game-over');
        
        if (turnInfo) {
            turnInfo.textContent = `第${currentRound}回合 - 轮到 ${players[currentPlayerIndex].nickname || players[currentPlayerIndex].name} 了`;
        }
        if (drawnCard) drawnCard.textContent = '';
        if (nextTurn) nextTurn.style.display = 'block';
        if (gameOverElement) gameOverElement.style.display = 'none';
        
    } catch (error) {
        console.error('游戏初始化失败:', error);
        await showCustomAlert('游戏初始化失败，请刷新页面重试');
    }
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
                if (useCard === 'cancel') {
                    // 如果点击取消，结束使用卡牌环节
                    continueUsingCards = false;
                } else if (!useCard) {
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
        playerName: currentPlayer.nickname || currentPlayer.name,
        card: drawnCard.name,
        time: new Date().toLocaleTimeString(),
        round: currentRound,
        useShield: false
    };
    drawHistory.push(drawRecord);
    updateDrawHistory();

    // 提示抽到的牌
    await showCustomAlert(`${currentPlayer.nickname || currentPlayer.name} 抽到了：${drawnCard.name}`, true, drawnCard);

    // 处理卡牌效果
    if (drawnCard.type === CARD_TYPES.DEATH) {
        await handleDeathCard(currentPlayer, drawnCard);
    } else {
        // 将抽到的牌加入玩家手牌
        currentPlayer.cards.push(drawnCard.name);
        document.getElementById('drawn-card').textContent = `${currentPlayer.nickname || currentPlayer.name} 抽到的牌是：${drawnCard.name}`;
        nextPlayerTurn();
    }

    updateCardList();
    updateGameStatus();
});

// 处理死亡结局卡牌
async function handleDeathCard(player, card) {
    // 先显示抽到的卡牌
    await showCustomAlert(`${player.nickname || player.name} 抽到了：${card.name}`, true, card);

    if (player.cards.includes('防护球')) {
        player.cards = player.cards.filter(c => c !== '防护球');
        // 将死亡结局卡放入牌库随机位置
        const randomIndex = Math.floor(Math.random() * (deck.length + 1));
        deck.splice(randomIndex, 0, card);
        await showCustomAlert(`${player.nickname || player.name} 使用了"防护球"牌抵消了死亡结局！`);
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
    await showCustomAlert(`${player.nickname || player.name} 死亡！\n死因：${deathCard.name}\n${deathCard.description}`);
    deadPlayers.push({
        name: player.nickname || player.name,
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

    // 检查游戏是否结束
    if (players.length <= 1) {
        // 游戏结束，最后一名玩家获胜
        if (players.length === 1) {
            const winner = players[0];
            await showCustomAlert(`游戏结束！\n${winner.nickname || winner.name} 是最后的幸存者！`);
        } else {
            await showCustomAlert('游戏结束！所有玩家都已死亡！');
        }
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

    // AI决策逻辑
    for (const cardName of usableCards) {
        const cardInfo = CARDS[cardName];
        let shouldUseCard = Math.random() < 0.7; // 70%概率使用卡牌

        if (shouldUseCard) {
            let targetPlayer = null;
            let useCount = 2;

            // 自动选择目标玩家（排除自己和已死亡玩家）
            const possibleTargets = players.filter(p => 
                p !== aiPlayer && !deadPlayers.some(dp => dp.name === (p.nickname || p.name))
            );

            if (possibleTargets.length > 0) {
                targetPlayer = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
            }

            // 对于普通牌，随机决定使用2张还是3张
            if (cardInfo.type === CARD_TYPES.NORMAL) {
                const cardCount = countCards(aiPlayer.cards, cardName);
                useCount = cardCount >= 3 && Math.random() < 0.6 ? 3 : 2;
            }

            // 使用卡牌
            const success = await useCard(aiPlayer, cardName, targetPlayer, useCount);
            if (success) {
                await showCustomAlert(`${aiPlayer.nickname || aiPlayer.name} 使用了 ${cardName}`);
                break;
            }
        }
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
            return cardInfo.type === CARD_TYPES.FUNCTION; // 只返回功能牌，不返回禁止牌
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
    return 'cancel'; // 返回特殊值表示取消
}

// 统计卡牌数量
function countCards(cards, cardName) {
    return cards.filter(card => card === cardName).length;
}

/**
 * 处理卡牌使用的主函数
 * @param {Object} player - 使用卡牌的玩家
 * @param {string} cardName - 要使用的卡牌名称
 * @returns {Promise<boolean|Object>} - 返回使用是否成功，或包含特殊效果的对象
 */
async function useCard(player, cardName) {
    const cardInfo = CARDS[cardName];
    
    // 如果不是防护球，检查其他玩家是否有禁止牌
    if (cardInfo.type !== CARD_TYPES.SHIELD) {
        // 筛选出持有禁止牌的其他玩家
        const playersWithBanCard = players.filter(p => 
            p !== player && p.cards.includes('伏特加·禁止')
        );

        // 为每个拥有禁止牌的玩家提供使用机会
        for (const playerWithBan of playersWithBanCard) {
            let useCounter = false;
            
                if (playerWithBan.isAI) {
                // AI玩家有30%的概率使用禁止牌
                useCounter = Math.random() < 0.3;
                if (useCounter) {
                    await showCustomAlert(`${playerWithBan.nickname || playerWithBan.name} (AI) 决定使用禁止牌！`);
                }
                } else {
                // 为人类玩家显示带倒计时的确认对话框
                useCounter = await showCustomConfirm(
                    `${player.nickname || player.name} 想要使用 ${cardName}！\n` +
                    `您有禁止牌，是否要阻止？\n` +
                    `（5秒后自动选择"否"）`
                );
            }

            if (useCounter) {
                // 处理禁止牌的使用效果
                removeCardsFromHand(playerWithBan, '伏特加·禁止', 1);
                addToDiscardPile('伏特加·禁止');
                await showCustomAlert(`${playerWithBan.nickname || playerWithBan.name} 使用了禁止牌，阻止了 ${player.nickname || player.name} 使用 ${cardName}！`);
                
                // 将被阻止的卡牌加入弃牌堆
                removeCardsFromHand(player, cardName, 1);
                addToDiscardPile(cardName);
                
                // 记录禁止牌的使用
                recordCardUse(playerWithBan, '伏特加·禁止', `阻止了 ${player.nickname || player.name} 使用 ${cardName}`);
                
                // 更新界面显示
                updateCardList();
                updateGameStatus();
                return false;
            }
        }
    }

    let success = false;

    // 根据卡牌类型处理不同的效果
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
        // 处理卡牌使用后的效果
        if (typeof success === 'object' && success.skipDrawPhase) {
            // 特殊情况：跳过抽牌阶段
            removeCardsFromHand(player, cardName, 1);
        } else {
            removeCardsFromHand(player, cardName, 1);
        }
        // 将使用过的卡牌放入弃牌堆
        addToDiscardPile(cardName);
        // 更新界面显示
        updateCardList();
    }
    updateGameStatus();
    
    return success;
}

// 处理功能牌
async function handleFunctionCard(player, cardName) {
    switch (cardName) {
        case '550W':
            const lastThreeCards = deck.slice(-3);
            await showCustomAlert(`${player.nickname || player.name} 使用了"${cardName}"：\n后3张牌是：\n${lastThreeCards.map(card => card.name).join('\n')}`);
            recordCardUse(player, cardName, '查看了牌库顶部3张牌');
            addToDiscardPile(cardName);
            return true;

        case '电磁干扰枪':
            // 让玩家选择目标
            const targetPlayer = player.isAI ? 
                getRandomTarget(player) : 
                await selectPlayer(player, cardName);
            
            if (targetPlayer) {
                // 记录使用卡牌
                recordCardUse(player, cardName, `对${targetPlayer.nickname || targetPlayer.name}使用了电磁干扰枪`);
                addToDiscardPile(cardName);

                // 将目标玩家添加到额外回合队列
                if (!extraTurns[targetPlayer.nickname || targetPlayer.name]) {
                    extraTurns[targetPlayer.nickname || targetPlayer.name] = 0;
                }
                extraTurns[targetPlayer.nickname || targetPlayer.name]++;
                
                // 更新游戏状态
                updateCardList();
                updateGameStatus();
                
                return true;
            }
            return false;

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
                                <h3>${player.nickname || player.name} 向您索要一张卡牌</h3>
                                <p>请选择要给出的卡牌：</p>
                                <select class="custom-select">
                                    <option value="">请选择卡牌...</option>
                                    ${cardOptions}
                                </select>
                                <div class="button-container">
                                    <button class="confirm-button">确定</button>
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
                        await showCustomAlert(`${targetPlayer.nickname || targetPlayer.name} 给出了 ${selectedCard}`);
                        recordCardUse(player, cardName, '抽取了卡牌', targetPlayer.nickname || targetPlayer.name);
                        addToDiscardPile(cardName);
                        return true;
                    }
                } else if (targetPlayer) {
                    await showCustomAlert(`${targetPlayer.nickname || targetPlayer.name} 没有手牌！`);
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
                    await showCustomAlert(`${targetPlayer.nickname || targetPlayer.name} 没有手牌！`);
                    return false;
                }
                
                if (useCount === 2) {
                    const randomCard = getRandomCard(targetPlayer);
                    if (randomCard) {
                        player.cards.push(randomCard);
                        await showCustomAlert(`${player.nickname || player.name} 使用了"${cardName}"：\n从 ${targetPlayer.nickname || targetPlayer.name} 手中抽取了 ${randomCard}`);
                        recordCardUse(player, cardName, '抽取了随机卡牌', targetPlayer.nickname || targetPlayer.name);
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
                            await showCustomAlert(`${player.nickname || player.name} 成功从 ${targetPlayer.nickname || targetPlayer.name} 获得 ${requestedCard}`);
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
                                await showCustomAlert(`成功从 ${targetPlayer.nickname || targetPlayer.name} 获得 ${result}`);
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
        await showCustomAlert(`${player.nickname || player.name} 使用"${cardName}"失败：\n现在不能使用禁止卡！`);
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
                    const response = confirm(`${player.nickname || player.name} 使用了禁止卡！\n您要使用禁止卡来阻止吗？`);
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

/**
 * 选择目标玩家的对话框
 * @param {Object} currentPlayer - 当前玩家
 * @param {string} cardName - 使用的卡牌名称
 * @returns {Promise<Object|null>} - 选择的目标玩家或null
 */
async function selectPlayer(currentPlayer, cardName) {
    // 筛选可选择的玩家（排除当前玩家和已死亡玩家）
    const otherPlayers = players.filter(p => p !== currentPlayer && !deadPlayers.some(dp => dp.name === (p.nickname || p.name)));
    const playerOptions = otherPlayers.map(p => `<option value="${p.nickname || p.name}">${p.nickname || p.name}</option>`).join('');
    
    const cardInfo = CARDS[cardName];
    const result = await new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-alert';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = '1000';
        
        dialog.innerHTML = `
            <h3>使用卡牌：${cardName}</h3>
            <p>效果：${cardInfo.description}</p>
            <select class="custom-select">
                <option value="">请选择目标玩家...</option>
                ${playerOptions}
            </select>
            <div class="button-container" style="margin-top: 20px;">
                <button class="cancel-button" onclick="this.parentElement.parentElement.dataset.result='cancel'">取消</button>
                <button class="confirm-button" onclick="this.parentElement.parentElement.dataset.result='confirm'">确定</button>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const select = dialog.querySelector('select');
        const buttons = dialog.querySelectorAll('button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const result = dialog.dataset.result === 'confirm' ? select.value : null;
                document.body.removeChild(overlay);
                resolve(result);
            });
        });
    });
    
    return result ? players.find(p => (p.nickname || p.name) === result) : null;
}

/**
 * 选择使用卡牌数量的对话框
 * @param {number} maxCount - 最大可选数量
 * @returns {Promise<number>} - 选择的数量
 */
async function selectCardCount(maxCount) {
    const options = Array.from({length: maxCount - 1}, (_, i) => i + 2)
        .map(num => `<option value="${num}">${num}张</option>`).join('');
    
    const result = await new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-alert';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = '1000';
        
        dialog.innerHTML = `
            <h3>选择使用数量</h3>
            <select class="custom-select">
                <option value="">请选择使用数量...</option>
                ${options}
            </select>
            <div class="button-container" style="margin-top: 20px;">
                <button class="cancel-button" onclick="this.parentElement.parentElement.dataset.result='cancel'">取消</button>
                <button class="confirm-button" onclick="this.parentElement.parentElement.dataset.result='confirm'">确定</button>
            </div>
        `;
        
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        const select = dialog.querySelector('select');
        const buttons = dialog.querySelectorAll('button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const result = dialog.dataset.result === 'confirm' ? parseInt(select.value) : 0;
                document.body.removeChild(overlay);
                resolve(result);
            });
        });
    });
    
    return result;
}

function nextPlayerTurn() {
    if (players.length === 0) return;

    // 检查当前玩家是否有额外回合
    const currentPlayer = players[currentPlayerIndex];
    const currentPlayerName = currentPlayer.nickname || currentPlayer.name;
    
    if (extraTurns[currentPlayerName] && extraTurns[currentPlayerName] > 0) {
        extraTurns[currentPlayerName]--;
        if (extraTurns[currentPlayerName] === 0) {
            delete extraTurns[currentPlayerName];
        }
        // 如果有额外回合，不改变currentPlayerIndex
    } else {
        // 如果没有额外回合，移动到下一个玩家
        currentPlayerIndex = (currentPlayerIndex + 1) % players.length;
        
        // 检查下一个玩家是否有额外回合
        const nextPlayer = players[currentPlayerIndex];
        const nextPlayerName = nextPlayer.nickname || nextPlayer.name;
        
        if (extraTurns[nextPlayerName] && extraTurns[nextPlayerName] > 0) {
            // 如果下一个玩家有额外回合，显示提示
            showCustomAlert(`${nextPlayerName} 将进行一个额外回合！`);
        }
    }
    
    // 当轮到第一个玩家时，增加回合数
    if (currentPlayerIndex === 0 && !extraTurns[currentPlayerName]) {
        currentRound++;
    }
    
    const player = players[currentPlayerIndex];
    document.getElementById('turn-info').textContent = 
        `第${currentRound}回合 - 轮到 ${player.nickname || player.name} 了` + 
        (extraTurns[player.nickname || player.name] ? ` (额外回合)` : '');
    updateGameStatus();
}

function endGame() {
    gameOver = true;
    
    // 检查并更新UI元素
    const elements = {
        turnInfo: document.getElementById('turn-info'),
        drawnCard: document.getElementById('drawn-card'),
        nextTurn: document.getElementById('next-turn'),
        gameOver: document.getElementById('game-over')
    };

    // 安全地更新UI元素
    if (elements.turnInfo) elements.turnInfo.textContent = '';
    if (elements.drawnCard) elements.drawnCard.textContent = '';
    if (elements.nextTurn) elements.nextTurn.style.display = 'none';
    if (elements.gameOver) elements.gameOver.style.display = 'block';
    
    // 计算分数
    const scores = {};
    
    // 为死亡玩家分配分数（按死亡顺序倒序分配分数）
    deadPlayers.forEach((player, index) => {
        scores[player.name] = deadPlayers.length - index - 1;
    });
    
    // 为获胜者分配分数（如果有的话）
    if (players.length > 0) {
        const winner = players[0];
        scores[winner.name] = 5;
    }
    
    // 创建游戏记录
    const gameRecord = {
        date: new Date().toISOString(),
        players: [...deadPlayers.map(p => p.name), ...(players.length > 0 ? [players[0].name] : [])],
        scores: scores,
        winner: players.length > 0 ? players[0].name : null
    };
    
    // 更新所有玩家的分数
    [...deadPlayers, ...(players.length > 0 ? [players[0]] : [])].forEach(player => {
        if (!player.isAI && currentUser && users[currentUser.email]) {
            const user = users[currentUser.email];
            user.addGameRecord({
                ...gameRecord,
                score: scores[player.name]
            });
        }
    });
    
    // 显示结算界面
    showGameResults(gameRecord);
}

/**
 * 显示游戏结算界面
 * @param {Object} gameRecord - 游戏记录
 */
async function showGameResults(gameRecord) {
    const dialog = document.createElement('div');
    dialog.className = 'custom-alert';
    
    let resultHTML = '<h3>游戏结算</h3><div class="game-results">';
    
    // 显示获胜者（如果有的话）
    if (gameRecord.winner) {
        resultHTML += `<div class="winner">
            <h4>🏆 获胜者</h4>
            <p>${gameRecord.winner}</p>
            <p class="score">+5分</p>
        </div>`;
    }
    
    // 显示死亡玩家（按死亡顺序倒序显示）
    resultHTML += '<div class="other-players">';
    deadPlayers.slice().reverse().forEach((player, index) => {
        resultHTML += `
            <div class="player-result">
                <span>${player.name}</span>
                <span class="score">+${gameRecord.scores[player.name]}分</span>
                <span class="death-info">第${deadPlayers.length - index}个阵亡</span>
                <span class="death-cause">死因：${player.deathCard}</span>
            </div>
        `;
    });
    resultHTML += '</div>';
    
    // 如果当前玩家不是AI，显示等级信息
    if (currentUser && !currentUser.isAI) {
        try {
            const userDetails = window.userSystem.getUserDetails(currentUser.email);
            if (userDetails && userDetails.level) {
                const level = userDetails.level;
                resultHTML += `
                    <div class="level-info">
                        <h4>当前等级</h4>
                        <p>${level.name} (Level ${level.level})</p>
                        <p>总分：${level.currentScore}</p>
                        ${level.nextLevelScore ? `<p>距离下一级还需：${level.nextLevelScore - level.currentScore}分</p>` : ''}
                    </div>
                `;
            }
        } catch (error) {
            console.error('获取用户等级信息失败:', error);
        }
    }
    
    resultHTML += '</div>';
    
    dialog.innerHTML = `
        ${resultHTML}
        <div class="button-container">
            <button class="confirm-button" onclick="location.reload()">返回大厅</button>
        </div>
    `;
    
    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
}

/**
 * 更新玩家卡牌列表显示
 * 只显示当前玩家的卡牌
 */
function updateCardList() {
    const currentPlayer = players[currentPlayerIndex];
    if (!currentPlayer) {
        document.getElementById('card-list').textContent = '无';
        return;
    }
    
    const cardListElement = document.getElementById('card-list');
    // 只显示当前玩家的卡牌
    if (currentPlayer.isAI) {
        cardListElement.textContent = `${currentPlayer.cards.length}张卡牌`;
    } else {
    cardListElement.innerHTML = currentPlayer.cards.map(cardName => {
        const cardInfo = CARDS[cardName];
        return `<span class="card-name ${cardInfo.type.toLowerCase()}-card">
            ${cardName}
            <span class="card-tooltip">效果：${cardInfo.description}</span>
        </span>`;
    }).join(', ') || '无';
    }
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
    const drawHistoryList = document.getElementById('draw-history-list');
    if (!drawHistoryList) return;

    // 按时间倒序排序
    const sortedHistory = [...drawHistory].sort((a, b) => {
        const timeA = new Date(`2024-01-01 ${a.time}`).getTime();
        const timeB = new Date(`2024-01-01 ${b.time}`).getTime();
        return timeB - timeA;
    });

    drawHistoryList.innerHTML = `
        <table class="draw-history-table">
            <thead>
                <tr>
                    <th class="round-column">回合</th>
                    <th class="player-column">玩家</th>
                    <th class="card-column">记录</th>
                    <th class="time-column">时间</th>
                </tr>
            </thead>
            <tbody>
                ${sortedHistory.map(record => {
                    const isAI = record.playerName.includes('AI');
                    let cardText = isAI ? 
                        (record.useShield ? `使用了防护球抵挡了${record.card}` : '抽了一张卡牌') :
                        (record.useShield ? `抽到了${record.card}并使用了防护球` : `抽到了${record.card}`);
                    
                    return `
                        <tr>
                            <td class="round-column">${record.round}</td>
                            <td class="player-column"><span class="highlight-text">${record.playerName}</span></td>
                            <td class="card-column"><span class="highlight-text">${cardText}</span></td>
                            <td class="time-column">${record.time}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

function updateCardUseHistory() {
    const cardUseHistoryList = document.getElementById('card-use-history-list');
    if (!cardUseHistoryList) return;

    // 按时间倒序排序
    const sortedHistory = [...cardUseHistory].sort((a, b) => {
        const timeA = new Date(`2024-01-01 ${a.time}`);
        const timeB = new Date(`2024-01-01 ${b.time}`);
        return timeB - timeA;
    });

    if (sortedHistory.length === 0) {
        cardUseHistoryList.innerHTML = '<div class="no-history">暂无用牌记录</div>';
        return;
    }

    cardUseHistoryList.innerHTML = sortedHistory.map(record => {
        const playerName = `<span style="color: var(--accent-color-1)">${record.playerName}</span>`;
        const cardName = `<span style="color: var(--accent-color-1)">${record.cardName}</span>`;
        return `
            <div class="card-use-record">
                <div class="card-use-text">
                    第${record.round}回合，${playerName}使用了${cardName}：${record.action}
                </div>
                <div class="card-time">${record.time}</div>
            </div>
        `;
    }).join('');
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
    document.getElementById('current-round').textContent = currentRound;
    document.getElementById('deck-count').textContent = deck.length;
    document.getElementById('discard-count').textContent = discardPile.length;

    const playersList = document.getElementById('players-list');
    playersList.innerHTML = '';

    const orderedPlayers = [...players];
    const currentToEnd = orderedPlayers.splice(0, currentPlayerIndex);
    orderedPlayers.push(...currentToEnd);

    orderedPlayers.forEach((player, index) => {
        const li = document.createElement('li');
        li.className = index === 0 ? 'current' : '';
        li.innerHTML = `
            <span>${player.nickname || player.name}${player.isAI ? ' (AI)' : ''}</span>
            <span class="cards-count">手牌: ${player.cards.length}张</span>
        `;
        playersList.appendChild(li);
    });
}

// 添加记录卡牌使用的函数
function recordCardUse(player, cardName, action, target = null) {
    const record = {
        playerName: player.nickname || player.name,
        cardName: cardName,
        action: action,
        target: target ? (target.nickname || target.name) : null,
        time: new Date().toLocaleTimeString(),
        round: currentRound
    };
    cardUseHistory.push(record);
    updateCardUseHistory();
}

function getCardClass(cardName) {
    const cardInfo = CARDS[cardName];
    if (cardInfo.type === 'death') return 'death-card';
    if (cardInfo.type === 'shield') return 'shield-card';
    if (cardInfo.type === 'ban') return 'ban-card';
    if (cardInfo.type === 'function') return 'function-card';
    return 'normal-card';
}

// 获取随机目标玩家
function getRandomTarget(currentPlayer) {
    const possibleTargets = players.filter(p => 
        p !== currentPlayer && !deadPlayers.some(dp => dp.name === p.name));
    return possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
}

// 修改显示卡牌的弹窗函数
async function showCustomAlert(message, isCard = false, cardInfo = null) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        
        const dialog = document.createElement('div');
        dialog.className = isCard ? 'card-alert' : 'custom-alert';
        
        if (isCard && cardInfo) {
            dialog.innerHTML = `
                <div class="card-header">
                    <div class="card-title ${cardInfo.type === CARD_TYPES.DEATH ? 'death-title' : ''}">${cardInfo.name || ''}</div>
                    <div class="card-code">${cardInfo.code || ''}</div>
                </div>
                ${cardInfo.effect ? `<div class="card-effect">${cardInfo.effect}</div>` : ''}
                <div class="card-description" style="margin-top: 10px;">${cardInfo.description || ''}</div>
                <div class="button-container">
                    <button class="confirm-button">确定</button>
                </div>
            `;
        } else {
            dialog.innerHTML = `
                <h3>${message}</h3>
                <div class="button-container">
                    <button class="confirm-button">确定</button>
                </div>
            `;
        }

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const confirmButton = dialog.querySelector('.confirm-button');
        confirmButton.addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });
    });
}

/**
 * 显示带倒计时的确认对话框
 * @param {string} message - 要显示的消息
 * @returns {Promise<boolean>} - 用户的选择结果
 */
async function showCustomConfirm(message) {
    return new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-alert';
        dialog.style.position = 'fixed';
        dialog.style.top = '50%';
        dialog.style.left = '50%';
        dialog.style.transform = 'translate(-50%, -50%)';
        dialog.style.zIndex = '1000';
        
        dialog.innerHTML = `
            <div class="custom-alert-content">
                <p>${message}</p>
                <div id="timer" style="color: var(--accent-color-1); margin-top: 10px; font-weight: bold;"></div>
            </div>
            <div class="button-container">
                <button class="cancel-button" onclick="this.parentElement.parentElement.dataset.result='false'">否</button>
                <button class="confirm-button" onclick="this.parentElement.parentElement.dataset.result='true'">是</button>
            </div>
        `;

        const overlay = document.createElement('div');
        overlay.className = 'custom-alert-overlay';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        // 设置5秒倒计时
        let timeLeft = 5;
        const timerElement = dialog.querySelector('#timer');
        const timer = setInterval(() => {
            timeLeft--;
            timerElement.textContent = `剩余时间：${timeLeft} 秒`;
            if (timeLeft <= 0) {
                clearInterval(timer);
                if (dialog.parentNode) {
                    document.body.removeChild(overlay);
                    resolve(false);
                }
            }
        }, 1000);

        // 绑定按钮点击事件
        dialog.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', () => {
                clearInterval(timer);
                const result = dialog.dataset.result === 'true';
                document.body.removeChild(overlay);
                resolve(result);
            });
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

// 修改加入房间功能
function joinRoom(roomId) {
    if (!roomId) return;
    
    const result = window.roomManager.joinRoom(roomId, '', currentUser);
    if (result.success) {
        currentRoom = result.room;
        document.getElementById('room-list-panel').style.display = 'none';
        gameLobby.style.display = 'none';
        showRoomView(currentRoom);
    } else {
        showCustomAlert(result.message);
    }
}

// 显示个人信息面板
document.getElementById('show-profile').addEventListener('click', () => {
    showProfile();
});

// 显示排行榜面板
document.getElementById('show-leaderboard').addEventListener('click', () => {
    showLeaderboard();
});

// 关闭面板按钮
document.querySelectorAll('.close-panel').forEach(button => {
    button.addEventListener('click', (e) => {
        e.target.closest('.info-panel').style.display = 'none';
    });
});

// 排行榜标签切换
document.querySelectorAll('.leaderboard-tabs .tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
        document.querySelectorAll('.leaderboard-tabs .tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        showLeaderboard(e.target.dataset.tab);
    });
});

/**
 * 显示个人信息面板
 */
function showProfile() {
    const userDetails = window.userSystem.getUserDetails(currentUser.email);
    if (!userDetails) return;

    const dialog = document.createElement('div');
    dialog.className = 'custom-alert';
    dialog.innerHTML = `
        <h3>个人信息</h3>
        <div class="profile-content">
            <div class="profile-header">
                <div class="level-badge">
                    <span class="level-name">${userDetails.level.name}</span>
                    <span class="level-number">Level ${userDetails.level.level}</span>
                </div>
            </div>
            <div class="profile-details">
                <p><strong>昵称：</strong>${userDetails.nickname}</p>
                <p><strong>总分：</strong>${userDetails.score}</p>
                <p><strong>游戏局数：</strong>${userDetails.gamesPlayed}</p>
                ${userDetails.level.nextLevelScore ? `
                    <div class="level-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${(userDetails.score / userDetails.level.nextLevelScore) * 100}%"></div>
                        </div>
                        <span class="progress-text">距离下一级还需：${userDetails.level.nextLevelScore - userDetails.score}分</span>
                    </div>
                ` : ''}
            </div>
            <div class="game-history">
                <h4>最近游戏记录</h4>
                <div class="history-list">
                    ${userDetails.gameHistory.slice(-5).reverse().map(record => `
                        <div class="history-item">
                            <div class="game-result ${record.score === 5 ? 'winner' : ''}">
                                ${record.score === 5 ? '获胜' : `第${record.players.length - record.players.indexOf(userDetails.nickname)}名`}
                                <span class="score">+${record.score}分</span>
                            </div>
                            <div class="game-time">${new Date(record.date).toLocaleString()}</div>
                        </div>
                    `).join('') || '<div class="no-history">暂无游戏记录</div>'}
                </div>
            </div>
        </div>
        <div class="button-container">
            <button class="confirm-button">关闭</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const closeButton = dialog.querySelector('.confirm-button');
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });
}

/**
 * 显示排行榜面板
 * @param {string} type - 排序类型（score或games）
 */
function showLeaderboard(type = 'score') {
    const leaderboard = window.userSystem.getLeaderboard();
    const sortedLeaderboard = type === 'score' 
        ? leaderboard.sort((a, b) => b.score - a.score)
        : leaderboard.sort((a, b) => b.gamesPlayed - a.gamesPlayed);

    const dialog = document.createElement('div');
    dialog.className = 'custom-alert';
    dialog.innerHTML = `
        <h3>玩家排行榜</h3>
        <div class="leaderboard-tabs">
            <button class="tab ${type === 'score' ? 'active' : ''}" data-tab="score">总分排行</button>
            <button class="tab ${type === 'games' ? 'active' : ''}" data-tab="games">游戏局数</button>
        </div>
        <div class="leaderboard-content">
            <table class="leaderboard-table">
                <thead>
                    <tr>
                        <th>排名</th>
                        <th>昵称</th>
                        <th>等级</th>
                        <th>${type === 'score' ? '总分' : '游戏局数'}</th>
                    </tr>
                </thead>
                <tbody>
                    ${sortedLeaderboard.map((player, index) => `
                        <tr class="${player.nickname === currentUser.nickname ? 'current-user' : ''}">
                            <td>#${index + 1}</td>
                            <td>${player.nickname}</td>
                            <td>${player.level.name}</td>
                            <td>${type === 'score' ? player.score : player.gamesPlayed}</td>
                        </tr>
                    `).join('') || '<tr><td colspan="4">暂无数据</td></tr>'}
                </tbody>
            </table>
        </div>
        <div class="button-container">
            <button class="confirm-button">关闭</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // 绑定标签切换事件
    dialog.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const newType = e.target.dataset.tab;
            if (newType && newType !== type) {
                overlay.remove();
                showLeaderboard(newType);
            }
        });
    });

    const closeButton = dialog.querySelector('.confirm-button');
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });
}

// 绑定关闭按钮事件
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('close-panel')) {
        const panel = e.target.closest('.modal-panel, .custom-alert-overlay');
        if (panel) {
            panel.style.display = 'none';
            if (panel.parentNode) {
                panel.parentNode.removeChild(panel);
            }
        }
    }
});

// 显示抽牌记录
document.getElementById('show-draw-history')?.addEventListener('click', async () => {
    const dialog = document.createElement('div');
    dialog.className = 'custom-alert';
    dialog.innerHTML = `
        <h3>抽牌记录</h3>
        <div class="draw-history-list">
            ${drawHistory.map(record => {
                const isAI = record.playerName.includes('AI');
                let cardText = '';
                
                if (isAI) {
                    if (record.useShield) {
                        cardText = `使用了防护球抵挡了${record.card}`;
                    } else {
                        cardText = '抽了一张卡牌';
                    }
                } else {
                    cardText = record.useShield ? 
                        `抽到了${record.card}并使用了防护球` : 
                        `抽到了${record.card}`;
                }

                return `<div class="draw-history-item">
                    第${record.round}回合，${record.playerName} ${cardText}
                    <span class="draw-time">${record.time}</span>
                </div>`;
            }).join('') || '<div class="no-history">暂无抽牌记录</div>'}
        </div>
        <div class="button-container">
            <button class="confirm-button">关闭</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.className = 'custom-alert-overlay';
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    const closeButton = dialog.querySelector('.confirm-button');
    closeButton.addEventListener('click', () => {
        overlay.remove();
    });
});

