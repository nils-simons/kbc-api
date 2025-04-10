const path = require('path');
const puppeteer = require('puppeteer');
const uuidv4 = require('uuid').v4;
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

                const currentUrl = page.url();
                if (currentUrl.includes('agreement')) {
                    await page.waitForSelector('div.maia-inner-content');
                    const buttons = await page.$$('div.maia-inner-content');
                    if (buttons.length >= 2) {
                        await buttons[1].click();
                        // await new Promise(r => setTimeout(r, 2000));
                        // page.goto('https://kbctouch.kbc.be/LAE-P/A044/resources/0001/en/authenticated/payments/payment-dashboard/personal/dashboard')
                    }
                }

                if (currentUrl.includes('didLogin=true')) {
                    try {
                        await page.waitForSelector('button.maia-icon-container', { timeout: 1000 })
                    } catch (error) {
                        await new Promise(r => setTimeout(r, 500));
                        break
                    }
                    const button = await page.$('button.maia-icon-container');
                    await button.click();
                }


                if (currentUrl.includes('authenticated/payments/payment-dashboard/personal/dashboard')) {
                    const text = await page.evaluate(() => {
                        return document.querySelector('.lae-touch-payment-dashboard-header-title').textContent.trim();
                    });
                    if (text === "Payments") {
                        break;
                    }
                }
                
            }
        } catch (error) {
            console.error(error)
            try {
                browser.close();
            } catch (error) {}
            res.status(400).send(JSON.stringify({
                success: false,
                error: "Browser error"
            }));
            return
        }

        const sessionCookies = await page.cookies();

        const uuid = uuidv4();
        const local_tmp_cookies = path.join(__dirname, `../cookies/${uuid}.json`);
        fs.writeFileSync(local_tmp_cookies, JSON.stringify(sessionCookies, null, 2));
        
        browser.close();        

        const now = new Date();
        const in25min = new Date();
        in25min.setMinutes(in25min.getMinutes() + 25);

        res.status(200).send(JSON.stringify({
            success: true,
            data: {
                uid: uuid,
                created_at: now,
                expires_at: new Date(in25min)
            }
        }));
    })
}

exports.createSession = createSession;