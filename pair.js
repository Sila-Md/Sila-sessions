const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
let router = express.Router();
const pino = require('pino');
const {
    default: makeWASocket,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    try {
        fs.rmSync(FilePath, { recursive: true, force: true });
        return true;
    } catch (error) {
        console.error('Error removing file:', error);
        return false;
    }
}

router.get('/', async (req, res) => {
    const id = makeid();
    let num = req.query.number;

    // Validate number parameter
    if (!num) {
        return res.status(400).json({ 
            code: 'Service Unavailable',
            error: 'Number parameter is required' 
        });
    }

    console.log(`🔢 Pairing request for number: ${num}`);

    async function SILA_MD_PAIR_CODE() {
        const { state, saveCreds } = await useMultiFileAuthState('./temp/' + id);
        
        try {
            let Pair_Code_By_SILA_Tech = makeWASocket({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
                },
                version: [2, 3000, 1025190524],
                printQRInTerminal: false,
                logger: pino({ level: 'fatal' }).child({ level: 'fatal' }),
                browser: Browsers.macOS('Safari')
            });

            if (!Pair_Code_By_SILA_Tech.authState.creds.registered) {
                await delay(1500);
                num = num.replace(/[^0-9]/g, '');
                
                try {
                    const code = await Pair_Code_By_SILA_Tech.requestPairingCode(num);
                    console.log(`✅ Pairing code generated: ${code}`);
                    
                    if (!res.headersSent) {
                        return res.json({ code });
                    }
                } catch (pairError) {
                    console.error('❌ Error generating pairing code:', pairError);
                    if (!res.headersSent) {
                        return res.status(500).json({ 
                            code: 'Service Unavailable',
                            error: 'Failed to generate pairing code' 
                        });
                    }
                }
            }

            Pair_Code_By_SILA_Tech.ev.on('creds.update', saveCreds);
            
            Pair_Code_By_SILA_Tech.ev.on('connection.update', async (s) => {
                const { connection, lastDisconnect } = s;
                
                if (connection === 'open') {
                    console.log('✅ WhatsApp connected successfully');
                    
                    await delay(5000);
                    
                    try {
                        let data = fs.readFileSync(__dirname + `/temp/${id}/creds.json`);
                        await delay(800);
                        let b64data = Buffer.from(data).toString('base64');
                        
                        let session = await Pair_Code_By_SILA_Tech.sendMessage(
                            Pair_Code_By_SILA_Tech.user.id, 
                            { text: 'sila~' + b64data }
                        );

                        let SILA_MD_TEXT = `
╔════════════════════◇
║『 SESSION CONNECTED』
╚════════════════════╝

╔════════════════════◇
║『 You've chosen SILA MD Bots』
║ -Set the session ID in Heroku:
║ - SESSION_ID: 
╚════════════════════╝
𒂀 SILA MD Bot

Don't Forget To Give Star⭐ To My Repo
______________________________`;

                        await Pair_Code_By_SILA_Tech.sendMessage(
                            Pair_Code_By_SILA_Tech.user.id, 
                            { text: SILA_MD_TEXT }, 
                            { quoted: session }
                        );

                        await delay(100);
                        await Pair_Code_By_SILA_Tech.ws.close();
                        removeFile('./temp/' + id);
                        
                    } catch (fileError) {
                        console.error('❌ Error handling session file:', fileError);
                    }
                    
                } else if (connection === 'close' && lastDisconnect && lastDisconnect.error && lastDisconnect.error.output.statusCode != 401) {
                    console.log('🔄 Connection closed, restarting...');
                    await delay(10000);
                    SILA_MD_PAIR_CODE();
                }
            });
            
        } catch (err) {
            console.error('❌ Service error:', err);
            await removeFile('./temp/' + id);
            
            if (!res.headersSent) {
                return res.status(503).json({ 
                    code: 'Service Unavailable',
                    error: 'Service temporarily unavailable' 
                });
            }
        }
    }

    return await SILA_MD_PAIR_CODE();
});

module.exports = router;
