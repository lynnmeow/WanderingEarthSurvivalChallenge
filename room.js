/**
 * 房间类
 */
class Room {
    constructor(id, name, password, creator) {
        this.id = id;
        this.name = name;
        this.password = password;
        this.creator = creator;
        this.players = [creator];
        this.maxPlayers = 6;
        this.isStarted = false;
        this.createTime = new Date().getTime();
    }

    addPlayer(player) {
        if (this.players.length >= this.maxPlayers) {
            return false;
        }
        if (!this.players.includes(player)) {
            this.players.push(player);
        }
        return true;
    }

    removePlayer(player) {
        const index = this.players.findIndex(p => p.email === player.email);
        if (index !== -1) {
            this.players.splice(index, 1);
        }
        return this.players.length === 0;
    }

    canStart() {
        return this.players.length >= 2 && !this.isStarted;
    }
}

// 房间管理
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.nextRoomId = 1;
    }

    /**
     * 创建新房间
     * @param {string} name - 房间名
     * @param {string} password - 房间密码
     * @param {Object} creator - 创建者
     * @returns {Room} - 创建的房间
     */
    createRoom(name, password, creator) {
        const roomId = this.nextRoomId++;
        const room = new Room(roomId, name, password, creator);
        this.rooms.set(roomId, room);
        return room;
    }

    /**
     * 加入房间
     * @param {number} roomId - 房间ID
     * @param {string} password - 房间密码
     * @param {Object} player - 加入的玩家
     * @returns {Object} - 加入结果
     */
    joinRoom(roomId, password, player) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, message: '房间不存在' };
        }

        if (room.isStarted) {
            return { success: false, message: '游戏已开始' };
        }

        if (room.players.length >= room.maxPlayers) {
            return { success: false, message: '房间已满' };
        }

        if (room.password && room.password !== password) {
            return { success: false, message: '密码错误' };
        }

        if (room.addPlayer(player)) {
            return { success: true, message: '加入成功', room };
        } else {
            return { success: false, message: '加入失败' };
        }
    }

    /**
     * 离开房间
     * @param {number} roomId - 房间ID
     * @param {Object} player - 离开的玩家
     * @returns {Object} - 离开结果
     */
    leaveRoom(roomId, player) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, message: '房间不存在' };
        }

        const isEmpty = room.removePlayer(player);
        if (isEmpty) {
            this.rooms.delete(roomId);
            return { success: true, message: '房间已解散' };
        }

        return { success: true, message: '已离开房间' };
    }

    /**
     * 获取房间列表
     * @returns {Array} - 房间列表
     */
    getRoomList() {
        return Array.from(this.rooms.values())
            .filter(room => !room.isStarted) // 只返回未开始的房间
            .map(room => ({
                id: room.id,
                name: room.name,
                playerCount: room.players.length,
                maxPlayers: room.maxPlayers,
                hasPassword: !!room.password,
                isStarted: room.isStarted,
                createTime: room.createTime,
                creator: room.creator.nickname
            }))
            .sort((a, b) => b.createTime - a.createTime); // 按创建时间倒序排序
    }

    /**
     * 获取房间信息
     * @param {number} roomId - 房间ID
     * @returns {Room|null} - 房间信息
     */
    getRoom(roomId) {
        return this.rooms.get(roomId) || null;
    }

    /**
     * 开始游戏
     * @param {number} roomId - 房间ID
     * @returns {Object} - 开始游戏结果
     */
    startGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) {
            return { success: false, message: '房间不存在' };
        }

        if (!room.canStart()) {
            return { success: false, message: '人数不足或游戏已开始' };
        }

        room.isStarted = true;
        return { success: true, message: '游戏开始', room };
    }

    /**
     * 创建人机房间
     * @param {Object} creator - 创建者
     * @param {number} aiCount - AI数量
     * @returns {Object} - 创建结果
     */
    createAIRoom(creator, aiCount) {
        if (aiCount < 1 || aiCount > 4) {
            return { success: false, message: 'AI数量必须在1-4之间' };
        }

        const roomId = this.nextRoomId++;
        const room = new Room(roomId, `${creator.nickname}的人机房间`, '', creator);
        
        // 添加AI玩家
        for (let i = 0; i < aiCount; i++) {
            const aiName = getRandomAIName();
            room.addPlayer({ 
                email: `ai_${aiName}@ai.com`,
                nickname: aiName,
                isAI: true 
            });
        }

        this.rooms.set(roomId, room);
        room.isStarted = true;
        return { success: true, message: '人机房间创建成功', room };
    }
}

// 创建全局房间管理器实例
window.roomManager = new RoomManager(); 