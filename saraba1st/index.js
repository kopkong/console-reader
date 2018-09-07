/**
 * Read Stage1st Forum
 */
const puppeteer = require('puppeteer');
const readline = require('readline');
const process = require('process');
const devices = require('puppeteer/DeviceDescriptors');
const iPhone = devices['iPhone 8'];
const account = require('./config');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const routesConfig = {
  login: 'https://bbs.saraba1st.com/2b/member.php?mod=logging&action=login',
  home: 'https://bbs.saraba1st.com/2b/forum.php',
  waiye: 'https://bbs.saraba1st.com/2b/forum.php?mod=forumdisplay&fid=75'
};

(async () => {
  let browser, page, threads;

  async function init() {
    console.log('Launching');
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    });
    page = await browser.newPage();
    await page.emulate(iPhone);

    await login();
  }

  async function login() {
    await page.goto(routesConfig.login);

    const loggedStatus = await page.$('#loginstatus');

    // not logged-in
    if (!loggedStatus) {
      if (account.username && account.password) {
        await autoLogin();
      } else {
        await manualLogin();
      }
    }
  }

  async function autoLogin() {

    const inputUsername = await page.$('input[name=username]');
    await inputUsername.type(account.username);

    const inputPassword = await page.$('input[name=password]');
    await inputPassword.type(account.password);

    await triggerLogin();
  }

  async function manualLogin() {
    await rl.question('Input Username:', async (username) => {
      const inputUsername = await page.$('input[name=username]');
      await inputUsername.type(username);

      rl.question('Input Password:', async (password) => {
        console.log('logging...');

        const inputPassword = await page.$('input[name=password]');
        await inputPassword.type(password);

        await triggerLogin();
      });
    });
  }

  async function triggerLogin() {
    // trigger login
    await page.$eval('button[type=submit]', el => el.click());

    // wait for login submit process
    await page.waitForNavigation();

    // check login status
    if (page.mainFrame().url() === routesConfig.home) {
      await page.goto(routesConfig.waiye);

      await fetchThreads();

      await showThreads();
    } else {
      console.log('logging error, exiting');
      // await browser.close();
    }
  }

  async function fetchThreads() {
    console.log('Loading threads...');

    try {
      threads = await page.$$eval('.threadlist a', els => els.map(el=> {
        return {title: el.textContent.trim(), link: el.href};
      }));

    } catch(e) {
      console.log(e);
    }
  }

  async function reloadThreads() {
    try {
      await page.reload({waitUntil: 'domcontentloaded'});
      await fetchThreads();
    } catch(e) {
      console.log(e);
    }
  }

  async function showThreads() {
    console.log('-------Threads------');

    if (threads && threads.length) {
      await displayThreadList(threads);
    }
  }

  async function displayThreadList(list) {
    list.forEach((th,index) => {
      console.log(`${index + 1}  ${th.title.trim()}`);
    });

    rl.question('Input thread id (0 to refresh):', async (answer) => {
      // refresh list if 0
      switch(answer) {
        case '0' : {
          await reloadThreads();
          await showThreads();
          break;
        }
        default: {
          const idx = parseInt(answer) - 1;

          if (idx < list.length) {
            await displayThreadContent(list[idx]);
          }

          break;
        }
      }
    });
  }

  async function displayThreadContent(thread) {
    await page.goto(thread.link, {timeout: 300000});

    console.log('Loading thread content');
    const messages = await page.$$eval('.message', nodes => nodes.map( n => n.innerText));

    for(let msg of messages) {
      console.log(msg.trim());
    }

    rl.question('Input 0 back to list:', async (answer) => {
      if (answer === '0') {
        await showThreads();
      }
    });
  }

  await init();

})();



