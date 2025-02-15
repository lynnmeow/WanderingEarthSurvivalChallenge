/**
 * 用户类
 */
class User {
    constructor(email, nickname, password) {
        this.email = email;
        this.nickname = nickname;
        this.password = password;
        this.score = 0;
        this.gamesPlayed = 0;
        this.gameHistory = [];
    }

    /**
     * 添加游戏记录
     * @param {Object} gameRecord - 游戏记录
     */
    addGameRecord(gameRecord) {
        this.gameHistory.push(gameRecord);
        this.gamesPlayed++;
        this.score += gameRecord.score;
        this.saveToStorage();
    }

    /**
     * 获取用户等级
     * @returns {Object} - 等级信息
     */
    getLevel() {
        let level = 0;
        for (let i = 0; i < Object.keys(LEVEL_CONFIG).length; i++) {
            if (this.score >= LEVEL_CONFIG[i].minScore) {
                level = i;
            } else {
                break;
            }
        }
        return {
            level,
            name: LEVEL_CONFIG[level].name,
            currentScore: this.score,
            nextLevelScore: LEVEL_CONFIG[level + 1]?.minScore || null
        };
    }

    /**
     * 保存用户数据到本地存储
     */
    saveToStorage() {
        users[this.email] = this;
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// 等级配置
const LEVEL_CONFIG = {
    0: { name: '新手', minScore: 0 },
    1: { name: '预备飞行员', minScore: 10 },
    2: { name: '实习航天员', minScore: 50 },
    3: { name: '初级航天员', minScore: 100 },
    4: { name: '正式航天员', minScore: 200 },
    5: { name: '空间站驻站人员', minScore: 350 },
    6: { name: '空间站小组长', minScore: 500 },
    7: { name: '冰雕', minScore: 700 },
    8: { name: '鲜花挂满枝头', minScore: 1000 },
    9: { name: '流浪英雄', minScore: 9999 }
};

// 用户数据存储
let users = {};

// 从localStorage加载用户数据并实例化User对象
function loadUsers() {
    const savedUsers = JSON.parse(localStorage.getItem('users')) || {};
    users = {};
    
    for (const email in savedUsers) {
        const userData = savedUsers[email];
        const user = new User(userData.email, userData.nickname, userData.password);
        user.score = userData.score || 0;
        user.gamesPlayed = userData.gamesPlayed || 0;
        user.gameHistory = userData.gameHistory || [];
        users[email] = user;
    }
}

// 初始化时加载用户数据
loadUsers();

/**
 * 检查邮箱格式是否有效
 * @param {string} email - 邮箱地址
 * @returns {boolean} - 是否有效
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * 检查用户名是否已存在
 * @param {string} email - 邮箱地址
 * @returns {boolean} - 是否存在
 */
function isEmailExists(email) {
    return users[email] !== undefined;
}

/**
 * 检查昵称是否已存在
 * @param {string} nickname - 昵称
 * @returns {boolean} - 是否存在
 */
function isNicknameExists(nickname) {
    return Object.values(users).some(user => user.nickname === nickname);
}

/**
 * 注册新用户
 * @param {string} email - 邮箱地址
 * @param {string} nickname - 昵称
 * @param {string} password - 密码
 * @returns {Object} - 注册结果
 */
function register(email, nickname, password) {
    if (!isValidEmail(email)) {
        return { success: false, message: '邮箱格式不正确' };
    }

    if (isEmailExists(email)) {
        return { success: false, message: '该邮箱已被注册' };
    }

    if (isNicknameExists(nickname)) {
        return { success: false, message: '该昵称已被使用' };
    }

    if (password.length < 6) {
        return { success: false, message: '密码长度不能少于6位' };
    }

    const user = new User(email, nickname, password);
    users[email] = user;
    localStorage.setItem('users', JSON.stringify(users));

    return { success: true, message: '注册成功' };
}

/**
 * 用户登录
 * @param {string} email - 邮箱地址
 * @param {string} password - 密码
 * @returns {Object} - 登录结果
 */
function login(email, password) {
    const user = users[email];
    if (!user) {
        return { success: false, message: '用户不存在' };
    }

    if (user.password !== password) {
        return { success: false, message: '密码错误' };
    }

    return { success: true, message: '登录成功', user };
}

/**
 * 获取用户排行榜
 * @returns {Array} - 排行榜数据
 */
function getLeaderboard() {
    return Object.values(users)
        .map(user => ({
            nickname: user.nickname,
            score: user.score,
            level: user.getLevel(),
            gamesPlayed: user.gamesPlayed
        }))
        .sort((a, b) => b.score - a.score);
}

/**
 * 获取用户详细信息
 * @param {string} email - 用户邮箱
 * @returns {Object} - 用户详细信息
 */
function getUserDetails(email) {
    const user = users[email];
    if (!user) return null;

    return {
        email: user.email,
        nickname: user.nickname,
        score: user.score,
        level: user.getLevel(),
        gamesPlayed: user.gamesPlayed,
        gameHistory: user.gameHistory
    };
}

// 导出函数
window.userSystem = {
    register,
    login,
    isValidEmail,
    isEmailExists,
    isNicknameExists,
    getLeaderboard,
    getUserDetails,
    LEVEL_CONFIG
}; 