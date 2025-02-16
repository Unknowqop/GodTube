// config.js
const CONFIG = {
    API_URL: 'https://api.streamconnect.com',
    SOCKET_URL: 'wss://socket.streamconnect.com',
    STREAM_SERVER: 'rtmp://stream.streamconnect.com/live',
    APP_VERSION: '1.0.0',
    DAILY_REWARD: 1,
    CURRENCY_NAME: 'QOP',
    PLATFORM_FEE: 0.05, // 5%
};

// auth.js
class Auth {
    constructor() {
        this.isLoggedIn = false;
        this.user = null;
        this.token = localStorage.getItem('token');
    }

    async login(email, password) {
        try {
            const response = await fetch(`${CONFIG.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) throw new Error('Login failed');

            const data = await response.json();
            this.setSession(data);
            return true;
        } catch (error) {
            console.error('Login error:', error);
            return false;
        }
    }

    async loginWithGoogle() {
        // Implement Google login
    }

    async loginWithDiscord() {
        // Implement Discord login
    }

    setSession(data) {
        this.isLoggedIn = true;
        this.user = data.user;
        this.token = data.token;
        localStorage.setItem('token', data.token);
    }

    logout() {
        this.isLoggedIn = false;
        this.user = null;
        this.token = null;
        localStorage.removeItem('token');
    }
}

// stream.js
class StreamManager {
    constructor() {
        this.stream = null;
        this.viewers = 0;
        this.streamKey = null;
    }

    async startStream(streamKey) {
        // Implement stream start logic
    }

    async stopStream() {
        // Implement stream stop logic
    }

    updateViewerCount(count) {
        this.viewers = count;
        document.getElementById('viewerCount').textContent = count;
    }
}

// chat.js
class ChatManager {
    constructor() {
        this.socket = null;
        this.messages = [];
        this.moderators = new Set();
        this.bannedWords = new Set();
    }

    connect(channelId) {
        this.socket = new WebSocket(`${CONFIG.SOCKET_URL}/chat/${channelId}`);
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.onmessage = (event) => {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
        };
    }

    handleMessage(message) {
        if (this.isMessageValid(message)) {
            this.messages.push(message);
            this.displayMessage(message);
        }
    }

    isMessageValid(message) {
        return !this.containsBannedWords(message.content);
    }

    containsBannedWords(content) {
        return Array.from(this.bannedWords).some(word => 
            content.toLowerCase().includes(word.toLowerCase())
        );
    }

    displayMessage(message) {
        const chatMessages = document.getElementById('chatMessages');
        const messageElement = document.createElement('div');
        messageElement.className = 'chat-message';
        messageElement.innerHTML = `
            <span class="username">${message.username}</span>
            <span class="message">${message.content}</span>
        `;
        chatMessages.appendChild(messageElement);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
}

// app.js
document.addEventListener('DOMContentLoaded', function() {
    const auth = new Auth();
    const streamManager = new StreamManager();
    const chatManager = new ChatManager();

    // Initialize UI
    const loginBtn = document.getElementById('loginBtn');
    const loginModal = document.getElementById('loginModal');
    const loginForm = document.getElementById('loginForm');

    // Event Listeners
    loginBtn.addEventListener('click', () => {
        loginModal.style.display = 'block';
    });