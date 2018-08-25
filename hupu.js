const puppeteer = require('puppeteer');
const readline = require('readline');
const process = require('process');
const devices = require('puppeteer/DeviceDescriptors');
const iPhone = devices['iPhone 8'];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const bbs = [
  { name: '步行街', id: 34 },
  { name: '英超专区', id: 138 },
  { name: '足球话题区', id: 1389}
];

(async () => {
  let browser, page, threads;

  async function init() {
    console.log('Launching');
    browser = await puppeteer.launch();
    page = await browser.newPage();
    await page.emulate(iPhone);

    await showBBS();
  }

  async function fetchThreads(bbs) {
    console.log('Loading page content...');

    try {
      await page.goto('https://m.hupu.com/bbs/' + bbs);
      const threadNodes = await page.$$('.common-list li');
      threads = await queryThreadListContent(threadNodes);
    } catch(e) {
      console.log(e);
    }
  }

  async function showBBS() {
    bbs.forEach((b,index) => {
      console.log(`${index+1} ${b.name}`);
    });

    rl.question('Select bbs id : ', async (answer) => {
      const idx = parseInt(answer) - 1;

      if (idx < bbs.length) {
        await fetchThreads(bbs[idx].id);
        await showThreads();
      }
    });
  }

  async function showThreads() {
    console.log('-------Threads------');

    if (threads && threads.length) {
      await displayThreadList(threads);
    } else {
      await displayEmptyThreadList();
    }
  }

  async function queryThreadListContent(nodes) {
    const list = [];
    for(let node of nodes) {
      const title = await node.$$eval('h3', h3 => h3[0].textContent);
      const link = await node.$$eval('a', a => a[0].href);

      list.push({
        title: title,
        link: link
      });
    }

    return list;
  }

  async function queryReplyListContent(nodes) {
    const list = [];
    for(let node of nodes) {
      const user = await node.$$eval('.user-name', a => a[0].textContent);
      const content = await node.$$eval('.short-content', s => s[0].textContent);

      list.push({
        user: user.trim(),
        content: content
      });
    }

    return list;
  }

  async function displayThreadList(list) {
    list.forEach((th,index) => {
      console.log(`${index + 1}  ${th.title}`);
    });

    rl.question('Input thread id (0 to refresh):', async (answer) => {
      // refresh list if 0
      switch(answer) {
        case '0' : {
          await fetchThreads();
          await showThreads();
          break;
        }
        case 'back': {
          await showBBS();
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

  async function displayEmptyThreadList() {
    rl.question('No threads, input any characters to reload', async (answer) => {
      if (answer) {
        await showThreads();
      }
    });
  }

  async function displayThreadContent(thread) {
    await page.goto(thread.link);

    const content = await page.$$eval('.article-content',
        div => div[0].textContent);
    console.log(content);

    await displayReplyContent();

    rl.question('Input 0 back to list:', async (answer) => {
      if (answer === '0') {
        await showThreads();
      }
    });
  }

  async function displayReplyContent() {
    console.log('=============Reply=============');

    const replyNodes = await page.$$('.reply-inner dl');

    const replies = await queryReplyListContent(replyNodes);

    replies.forEach(re => {
      console.log(` ${re.user}: ${re.content}`);
    });
  }

  await init();

})();



