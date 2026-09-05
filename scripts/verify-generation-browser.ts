import {chromium} from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'msedge',headless:true});const context=await browser.newContext({viewport:{width:1280,height:900}});const page=await context.newPage();
try{
 await page.goto('http://127.0.0.1:3300');await page.getByLabel('Your question',{exact:true}).fill('How does Zustand update nested objects?');
 await page.getByRole('button',{name:'Draft an answer',exact:true}).click();
 await page.getByText('Unvalidated draft',{exact:true}).waitFor({timeout:180000});await page.screenshot({path:'evidence/screenshots/generation-draft.png',fullPage:true});
 await page.getByRole('button',{name:'Inspect cited passage 1',exact:true}).waitFor({timeout:180000});
 const text=await page.locator('.answer-copy').innerText();const quote=await page.locator('.answer-copy blockquote').first().innerText();
 await page.getByRole('button',{name:'Inspect cited passage 1',exact:true}).click();if(!(await page.locator('.source-text').innerText()).includes(quote))throw new Error('Citation does not appear in inspected source');
 const checks=[];
 for(const width of [390,768,1280]){await page.setViewportSize({width,height:900});await page.screenshot({path:`evidence/screenshots/generation-pass-1-${width}.png`,fullPage:true});const axe=await new AxeBuilder({page}).analyze();const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);if(axe.violations.length||overflow)throw new Error(JSON.stringify({width,overflow,violations:axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))}));checks.push({width,overflow,axeViolations:0});}
 await writeFile('evidence/generation-browser.json',JSON.stringify({testedAt:new Date().toISOString(),draftVisibleBeforeFinal:true,draftLabel:'Unvalidated draft',exactQuoteInInspectedSource:true,answerText:text,checks},null,2));
 console.log('Real streamed draft, final citations, source inspection and responsive accessibility passed.');
}finally{await context.close();await browser.close();}
