class NetworkManager {
  constructor() {
    this.peer = null;
    this.connection = null;
    this.isHost = false;
    this.isConnected = false;
    this.onInputReceived = null;
    this.onResetReceived = null;
    this.onConnected = null;
    this.onDisconnected = null;
    this.roomId = null;
  }

  createRoom() {
    return new Promise((resolve, reject) => {
      this.roomId = this.generateRoomId();
      this.peer = new Peer(this.roomId);
      this.isHost = true;

      this.peer.on('open', (id) => {
        console.log('방 생성 완료:', id);
        resolve(id);
      });

      this.peer.on('connection', (conn) => {
        this.connection = conn;
        this.setupConnection();
      });

      this.peer.on('error', (err) => {
        console.error('Peer 에러:', err);
        reject(err);
      });
    });
  }

  joinRoom(roomId) {
    return new Promise((resolve, reject) => {
      this.peer = new Peer();
      this.isHost = false;

      this.peer.on('open', () => {
        this.connection = this.peer.connect(roomId);
        this.setupConnection();
        resolve();
      });

      this.peer.on('error', (err) => {
        console.error('연결 에러:', err);
        reject(err);
      });
    });
  }

  setupConnection() {
    this.connection.on('open', () => {
      this.isConnected = true;
      console.log('연결 성공');
      if (this.onConnected) {
        this.onConnected();
      }
    });

    this.connection.on('data', (data) => {
      if (data.type === 'input' && this.onInputReceived) {
        this.onInputReceived(data);
      } else if (data.type === 'reset' && this.onResetReceived) {
        this.onResetReceived();
      }
    });

    this.connection.on('close', () => {
      this.isConnected = false;
      console.log('연결 종료');
      if (this.onDisconnected) {
        this.onDisconnected();
      }
    });

    this.connection.on('error', (err) => {
      console.error('연결 에러:', err);
    });
  }

  sendInput(eventType, code) {
    if (this.isConnected && this.connection) {
      console.log('[NET] Sending:', eventType, code);
      this.connection.send({
        type: 'input',
        eventType: eventType,
        code: code,
        timestamp: Date.now()
      });
    }
  }

  sendReset() {
    if (this.isConnected && this.connection) {
      this.connection.send({
        type: 'reset',
        timestamp: Date.now()
      });
    }
  }

  disconnect() {
    if (this.connection) {
      this.connection.close();
    }
    if (this.peer) {
      this.peer.destroy();
    }
    this.isConnected = false;
    this.isHost = false;
    this.roomId = null;
  }

  generateRoomId() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  getInviteLink() {
    if (!this.roomId) return '';
    return `${window.location.origin}${window.location.pathname}?room=${this.roomId}`;
  }
}

const networkManager = new NetworkManager();
