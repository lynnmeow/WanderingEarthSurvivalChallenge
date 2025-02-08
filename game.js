async function handleAITurn(aiPlayer) {
    const usableCards = getUsableCards(aiPlayer.cards);
    if (usableCards.length > 0) {
        // 随机决定是否使用卡牌
        if (Math.random() < 0.7) { // 70%的概率使用卡牌
            const cardToUse = usableCards[Math.floor(Math.random() * usableCards.length)];
            const cardInfo = CARDS[cardToUse];
            
            // 随机选择目标玩家
            const possibleTargets = players.filter(p => p !== aiPlayer && !deadPlayers.some(dp => dp.name === p.name));
            const targetPlayer = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
            
            // 随机选择数量（如果卡牌需要）
            let quantity = 1;
            if (cardInfo.requiresQuantity) {
                quantity = Math.floor(Math.random() * 3) + 1; // 随机 1-3
            }
            
            await useCard(aiPlayer, cardToUse, targetPlayer, quantity);
            await showCustomAlert(`${aiPlayer.name} 使用了 ${cardToUse} ${targetPlayer ? `对 ${targetPlayer.name}` : ''}`);
        }
    }
}

async function showCardOptions(player) {
    const usableCards = getUsableCards(player.cards);
    const cardOptions = usableCards.map(card => `<option value="${card}">${card} (${CARDS[card].description})</option>`).join('');
    
    const selectElement = document.createElement('select');
    selectElement.className = 'custom-select';
    selectElement.innerHTML = `
        <option value="">请选择要使用的卡牌...</option>
        ${cardOptions}
    `;
    
    const result = await new Promise(resolve => {
        const dialog = document.createElement('div');
        dialog.className = 'custom-alert';
        dialog.innerHTML = `
            <h3>选择卡牌</h3>
            ${selectElement.outerHTML}
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
        await useCard(player, result);
    }
}

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