const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');

const getAccounts = (app) => {
    app.get('/api/accounts', async (req, res) => {

        const data = req.body;

        if (data.uid == undefined) {
            res.status(400).send(JSON.stringify({
                success: false,
                error: "Missing uid"
            }));
            return
        }

        const sessionCookies = await JSON.parse(fs.readFileSync(path.join(__dirname, `../cookies/${data.uid}.json`), 'utf8'));
        const s_ppn_cookie = sessionCookies.find(obj => obj.name === "s_ppn");

        if (s_ppn_cookie.expires < Math.floor(Date.now() / 1000)) {
            res.status(400).send(JSON.stringify({
                success: false,
                error: "Session expired"
            }));
            return
        }

        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        
        await page.setCookie(...sessionCookies);

        await page.goto('https://kbctouch.kbc.be/LAE-P/A044/resources/0001/en/authenticated/payments/payment-dashboard/personal/dashboard');

        await page.waitForSelector('.account-display', { timeout: 500 }).catch(() => false);

        const accountElements = await page.$$('.account-display');
    
        const accounts = [];
        
        for (const account of accountElements) {
            const accountName = await account.$eval('.account-name', element => element.innerText.trim());
            const iban = await account.$eval('.account-number', element => element.innerText.trim().replaceAll(' ', ''));
            
            var type = 'current';
            if (/BE..74/.test(iban)) {
                var type = 'saving';
            }
            if (/\d{6}X{6}\d{4}/.test(iban)) {
                var type = 'credit';
            }
            accounts.push({
                account_name: accountName,
                iban: iban,
                type: type
            });
        }
        browser.close();

        res.status(200).send(JSON.stringify({
            success: true,
            data: accounts
        }));
    })
}

exports.getAccounts = getAccounts