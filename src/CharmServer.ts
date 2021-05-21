import net from 'net';

export class CharmServer {
    private charmCount = 0;
    private hitCount = 0;
    private tracking = false;

    public constructor(startedCallback: () => void, stoppedCallback: (hitCount, charmCount) => void) {
        const server = net.createServer(socket => {
            const gameOver = () => {
                if (this.tracking) {
                    stoppedCallback(this.hitCount, this.charmCount);
                }
                this.tracking = false;
            }

            socket.on('data', (data) => {
                if (data[0] == 'D'.charCodeAt(0)) socket.write(Buffer.from(['S'.charCodeAt(0)]));
                else if (data[0] == 'H'.charCodeAt(0)) {
                    this.hitCount++;
                }
                else if (data[0] == 'C'.charCodeAt(0)) {
                    this.charmCount++;
                }
                else if (data[0] == 'W'.charCodeAt(0)) gameOver();
                else if (data[0] == 'A'.charCodeAt(0)) {
                    this.charmCount = 0;
                    this.hitCount = 0;
                    this.tracking = true;
                    startedCallback();
                }
            })
            socket.on("error", (err) => { });
        })
        server.listen(5050);
    }
}