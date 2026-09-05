import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
const args=['--import',pathToFileURL(path.resolve('node_modules/tsx/dist/loader.mjs')).href,path.resolve('packages/mcp-server/index.ts')];
const transport=new StdioClientTransport({command:process.execPath,args,cwd:path.resolve('../../work/lane-c'),stderr:'pipe'});const client=new Client({name:'portable-command-check',version:'1.0.0'});
try{await client.connect(transport);const tools=await client.listTools();if(tools.tools.length!==2)throw new Error('Unexpected tool list');await writeFile('evidence/mcp-portable-command.json',JSON.stringify({testedAt:new Date().toISOString(),command:process.execPath,args,workingDirectory:path.resolve('../../work/lane-c'),initialized:true,tools:tools.tools.map(tool=>tool.name),note:'Verified absolute-loader launch from another directory. This is not a Codex/Claude conversation.'},null,2));console.log('Documented absolute-loader command initialized and listed tools from another working directory.');}finally{await client.close();}
