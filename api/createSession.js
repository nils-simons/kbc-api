const path = require('path');
const puppeteer = require('puppeteer');
const admin = require("firebase-admin");
const { getStorage } = require("firebase-admin/storage");
const fs = require('fs');

const createSession = (app) => {
    app.post('/api/session/create', async (req, res) => {
        const data = req.body;
        if (data.auth_provider !== 'itsme') {
            res.status(400).send(JSON.stringify({
                success: false,
                error: "Invalid auth provider"
            }));
            return
        }

        if (data.auth_provider == 'itsme' && !data.phone_number) {
            res.status(400).send(JSON.stringify({
                success: false,
                error: "Missing phone number"
            }));
            return
        }

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        const cookiesString = fs.readFileSync(path.join(__dirname, '../json/gdprCookies.json'), 'utf8');
        const cookies = JSON.parse(cookiesString);
        await page.setCookie(...cookies);

        try {
            await page.goto('https://kbctouch.kbc.be/LAE-P/A044/resources/0001/en/login/strategy/ITSME');

            await page.waitForSelector('.lae-touch-payment-dashboard-header-title', { timeout: 1000 }).catch(() => false);
            await page.type('input[name="y9c-login-itsme-phone-number"]', data.phone_number);
            await new Promise(r => setTimeout(r, 100));
            await page.keyboard.press('Enter');

            while (true) {
                await new Promise(r => setTimeout(r, 200));
                const elementExists = await page.waitForSelector('.lae-touch-payment-dashboard-header-title', { timeout: 0 }).catch(() => false);
                if (elementExists) {
                    const text = await page.evaluate(() => {
                        return document.querySelector('.lae-touch-payment-dashboard-header-title').textContent.trim();
                    });
                    if (text === "Payments") {
                        break;
                    }
                }
            }
        } catch (error) {
            try {
                browser.close();
            } catch (error) {}
            res.status(400).send(JSON.stringify({
                success: false,
                error: "Browser error"
            }));
            return
        }

        
        const sessionDoc = admin.firestore().collection('users').doc(data.user_data.id).collection('sessions').doc()

        const sessionCookies = await page.cookies();

        const local_tmp_cookies = path.join(__dirname, `../tmp/${sessionDoc.id}.json`);
        fs.writeFileSync(local_tmp_cookies, JSON.stringify(sessionCookies, null, 2));
        
        browser.close();        

        const storage_file_path = `users/${data.user_data.id}/sessions/cookies/${sessionDoc.id}.json`
        
        const bucket = getStorage().bucket('kbc-api-nilssimons.appspot.com');
        await bucket.upload(local_tmp_cookies, {
            destination: storage_file_path,
            metadata: {
              cacheControl: 'public, max-age=31536000',
            },
        });

        fs.unlinkSync(local_tmp_cookies);

        const now = new Date();
        const in25min = new Date();
        in25min.setMinutes(in25min.getMinutes() + 25);

        const [url] = await bucket.file(storage_file_path).getSignedUrl({
            version: "v4",
            action: "read",
            expires: new Date(in25min), // 25 minutes
        });

        await sessionDoc.set({
            auth_provider: data.auth_provider,
            phone_number: data.phone_number,
            cookies: url,
            created_at: now,
            expires_at: new Date(in25min)
        })

        res.status(200).send(JSON.stringify({
            success: true,
            data: {
                id: sessionDoc.id,
                created_at: now,
                expires_at: new Date(in25min)
            }
        }));
    })
}

exports.createSession = createSession;