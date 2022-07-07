// JSON-RPC over Websocket implementation
var JSONRPC_TIMEOUT_MS = 1000;

var app = new Vue({
    el: '#app',
    data: {
        endpoint: 'ws://localhost:8000/websocket',
        ws: null,
        isConnected: false,
        isDisabled: false,
        stateMessage: "Websocket connection",
        typeMsg: "",
        hasError: false,
        log: "",
        method: "sum",
        param1: 0,
        param2: 0,
        rpcid: 0,
        pending: {}
    },
    watch: {
        isConnected: function (val) {
            
            if (val) {
                
                this.connect();
            }
            else {
                
                this.disconnect();
            }
        },
        log: function () {

            let textarea = this.$refs.logArea.$refs.textarea;
            if (textarea.selectionStart == textarea.selectionEnd) {
                textarea.scrollTop = textarea.scrollHeight;
            }
        }
    },
    computed:{
        sendDisabled: function() {
            return !this.isConnected || this.isDisabled;
        }

    },
    methods: {
        connect() {

            if (this.ws) {
                console.log("Connection has been established before");
                return;
            }
            console.log("Starting connection to WebSocket Server");
            this.pending = {};
            this.rpcid = 0;
            this.isDisabled = true;
            this.ws = new WebSocket(this.endpoint);
            if (!this.ws) {
                console.log("Cannot to connect");
                this.isConnected = false;
                return;
            }
           
            this.typeMsg = "is-warning";
            this.stateMessage = "Connecting...";
            this.ws.onmessage = this.onmessagews;
            this.ws.onopen = this.onopenws;
            this.ws.onclose = this.onclosews;
            this.ws.onerror = this.onerrorws;

        },
        onopenws(event) {
            hasError = false;
            this.stateMessage = "Connected!";
            this.typeMsg = "is-success";
            this.isDisabled = false;
        },
        onerrorws(event) {

            this.stateMessage = "Can’t establish a connection to the server at " + event.target.url;
            this.typeMsg = "is-danger";
            this.isDisabled = false;
            hasError = true;
        },
        onclosews(event) {
            
            console.log("The connection between the client and the server is closed");
            
            this.isDisabled = false;
            this.isConnected = false;
            this.ws = null;
            if (!hasError) {
                this.stateMessage = "Websocket connection";
                this.typeMsg = "";
                hasError = false;
            }
        },
        onmessagews(msg) {
            

            const frame = JSON.parse(msg.data);
            
            if (frame.id !== undefined) {
                if (this.pending[frame.id] !== undefined) this.pending[frame.id](frame);  // Resolve
                delete (this.pending[frame.id]);
            } else {
                this.notification(frame);
            }
        },
        disconnect() {
            if (this.ws) {               
                this.ws.close();
                this.ws = null;
            }
        },
        notification(msg) {
            this.log += 'NOTIFICATION: ' + JSON.stringify(msg) + '\n';
        },
        addToLog(method, msg) {
            this.log += (method === 'sum' ? 'SUM: ' : 'MUL: ') + msg + '\n';
        },
        call(method, params) {
            if (!this.ws) {
                console.log('No connected socket to send message');
                return;
            }
            const id = this.rpcid++, request = { id, method, params };
            this.ws.send(JSON.stringify(request));
            
            var self = this;
            return new Promise(function (resolve, reject) {
                setTimeout(JSONRPC_TIMEOUT_MS, function () {
                    if (self.pending[id] === undefined) return;
                    console.log('Timing out frame ' + JSON.stringify(request));
                    delete (self.pending[id]);
                    reject();
                });
                self.pending[id] = x => resolve(x);

            });
        },
        async sendMessage() {
            var self = this;
            return this.call(this.method, [+this.param1, +this.param2])
                .then(function (res) {
                    self.addToLog(self.method, JSON.stringify(res))
                });
        }
    }
})