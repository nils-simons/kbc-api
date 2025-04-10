const path = require('path');
const puppeteer = require('puppeteer');
const fs = require('fs');

const getAccount = (app) => {
    app.get('/api/account/:iban', async (req, res) => {

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
        
                const browser = await puppeteer.launch({ headless: false });
                const page = await browser.newPage();
                
                await page.setCookie(...sessionCookies);

        await page.goto('https://kbctouch.kbc.be/LAE-P/A044/resources/0001/en/authenticated/payments/payment-dashboard/personal/dashboard');

        await page.waitForSelector('.lae-touch-group-accounts-tile-account-display-element', { timeout: 500 }).catch(() => false);

        while (true) {
            await new Promise(r => setTimeout(r, 100));
            var accountsElm = await page.$$('.lae-touch-group-accounts-tile-account-display-element');
            if (accountsElm) {
                break
            }
        }

        const elements = await page.$$('.lae-touch-group-accounts-tile-account-display-element');

        await new Promise(r => setTimeout(r, 1500));
        for (const element of elements) {
            const textContent = await page.evaluate(el => el.textContent.trim(), element);
            if (textContent.replaceAll(' ', '').includes(req.params.iban)) {
                await element.click();
                break;
            }
        }

        await new Promise(r => setTimeout(r, 1500));

        while (true) {
            await new Promise(r => setTimeout(r, 200));
            var nameAccElm = await page.$('maia-tab[title="Manage"]');
            if (nameAccElm) {
                break
            }
        }

        await page.click('maia-tab[title="Manage"]');

        while (true) {
            await new Promise(r => setTimeout(r, 200));
            var nameAccElm = await page.$('.lae-touch-account-manage-header-accountName');
            if (nameAccElm) {
                break
            }
        }

        var accountData = {}
        accountData.account_name = await page.$eval('.account-name', elm => elm.textContent);
        accountData.account_holder = await page.$eval('maia-name-value-collection[key="Account holder"] maia-name-value-collection-item', elm => elm.textContent.trim());
        try {
            accountData.account_type = await page.$eval('maia-name-value-collection[key="Account type"] maia-name-value-collection-item', elm => elm.textContent.trim().replace('  More info', ''));
        } catch (error) {
            accountData.account_type = null;
        }
        accountData.balance = await page.$eval('.maia-sr-only', elm => parseFloat(elm.textContent.trim().replace(',', '.').replace(' EUR', '')));
        accountData.iban = req.params.iban


        try {
            const src = await page.$eval('img[alt="Photo"]', img => img.getAttribute('src'));
            if (src) {
                accountData.account_picture = src
            }            
        } catch (error) {
            accountData.account_picture = null;
        }

        browser.close();

        res.status(200).send(JSON.stringify({
            success: true,
            data: accountData
        }));
    })
}

exports.getAccount = getAccount