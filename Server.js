const { readFileSync } = require('fs');
const discord = require('discord.js-selfbot-v13');
const WebSocket = require('ws');
const { Buffer } = require('buffer');

const client = new discord.Client();

client.on('ready', () => {
    const wss = new WebSocket.Server({ port: 2742 });

    console.log("Ready!");

    wss.on('connection', (ws) => {
        console.log('WebSocket connection established');

        ws.on('message', async (message) => {
            try {
                const bytecodeBuffer = Buffer.from(message.toString(), 'base64');
                console.log('Received bytecode through WebSocket');

                const channel = client.channels.cache.get('1281680962182447146');

                const bytecode = new discord.MessageAttachment(bytecodeBuffer, 'AssetPreload.luauc');

                const response = await channel.sendSlash('1277811691492610088', 'decompile', bytecode)
                    .then(async (message) => {
                        if (message.flags.has('LOADING')) {
                            return new Promise((resolve, reject) => {
                                const timeout = setTimeout(() => reject('timeout'), 15 * 60 * 1000); // 15m timeout

                                const listener = (oldMessage, newMessage) => {
                                    if (newMessage.id == message.id) {
                                        clearTimeout(timeout);
                                        resolve(newMessage);

                                        client.off('messageUpdate', listener);
                                    }
                                };

                                client.on('messageUpdate', listener);
                            });
                        } else {
                            return Promise.resolve(message);
                        }
                    });

                const firstAttachment = response.attachments.first();
                if (firstAttachment) {
                    const fetchResponse = await fetch(firstAttachment.url);
                    const attachmentContent = await fetchResponse.text();

                    ws.send(attachmentContent);
                    console.log('Attachment content sent back through WebSocket');
                } else {
                    ws.send('-- No attachments found in the response.');
                }
            } catch (error) {
                console.error('Error processing message:', error);
                ws.send('-- Error occurred while processing the request.');
            }
        });

        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });
    });
});

client.login(readFileSync('./Token.dcToken', 'utf8').trim());
