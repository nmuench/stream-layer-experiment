import { default as WebSocket } from "ws";
import * as readline from "readline";
import { MockService, } from "./MockService.js";
const Server = WebSocket.Server;
const BROADCAST_INTERVAL = 1000;
class StreamServer extends Server {
    constructor(options) {
        super(options);
        this.socketInfo = new Map();
        this.on("connection", this._onConnection.bind(this));
    }
    broadcast(message) {
        for (const socket of this.clients) {
            if (socket.readyState === WebSocket.OPEN &&
                this.socketInfo.has(socket) &&
                socket.bufferedAmount < this.options.maxBufferredAmount * 1024)
                socket.send(message);
        }
    }
    _onConnection(socket) {
        socket.on("message", (message) => this._onMessage(socket, message));
        socket.on("close", (code, reason) => this._onClose(socket, code, reason));
        socket.on("error", this._onError.bind(this));
    }
    _handshake(socket, message) {
        try {
            const parsed = JSON.parse(message);
            // This example server only supports WebMercator but we know that's the format
            // the client will use. Make sure you support projecting features in the the spatial
            // reference requested by the client if it can vary from that of your underlying data
            if (parsed.spatialReference.wkid !== 102100) {
                socket.close();
                return;
            }
            // Echo back the properties set in the handshake
            socket.send(JSON.stringify({
                format: "json",
                spatialReference: {
                    wkid: parsed.spatialReference.wkid
                },
            }));
            this.socketInfo.set(socket, { ready: true });
        }
        catch (e) {
            console.debug("Got error on handshake", e);
            socket.close();
        }
    }
    _onMessage(socket, message) {
        // Only handle text
        if (typeof message !== "string") {
            socket.close();
            return;
        }
        const socketInfo = this.socketInfo.get(socket);
        // Still need to handle handshake
        if (!socketInfo || !socketInfo.ready) {
            this._handshake(socket, message);
        }
        else {
            try {
                const result = JSON.parse(message);
                console.log("Got message", message);
                if ("type" in result) {
                    switch (result.type) {
                        case "echo":
                            socket.send(JSON.stringify(result));
                            break;
                        case "echo-data":
                            socket.send(JSON.stringify(result.data));
                            break;
                    }
                }
            }
            catch (e) {
                console.debug("Got error decoding message", e);
                socket.close();
            }
        }
    }
    _onClose(socket, _code, _reason) {
        if (this.socketInfo.has(socket)) {
            this.socketInfo.delete(socket);
        }
    }
    _onError(error) {
        console.debug("Websocket errored", error);
    }
}
// Fetch polylines to feed to our mock service
function fetchPoints() {
    const features = [{ latitude: 33.788799, longitude: -84.416451 }];
    for (let i = 0; i < 9; i++) {
        const point = { latitude: 33.788799 + Math.random(), longitude: -84.416451 + Math.random() };
        features.push(point);
    }
    return features;
}
async function main() {
    const server = new StreamServer({ port: 8000, maxBufferredAmount: 256 });
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    const mockService = new MockService();
    const data = fetchPoints();
    mockService.initialize(data, (str) => server.broadcast(str));
    console.log("Started listening on port 8000");
    rl.question("Press ENTER to stop server", (_response) => {
        console.log("Closing Server...");
        server.close();
        rl.close();
    });
}
main();
//# sourceMappingURL=main.js.map