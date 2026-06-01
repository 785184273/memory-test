import dotenv from 'dotenv'
import path from 'path'
import { ChatOpenAI } from '@langchain/openai'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { FileSystemChatMessageHistory } from '@langchain/community/stores/message/file_system'

const __dirname = import.meta.dirname

dotenv.config({
  path: path.resolve(__dirname, '../.env')
})

const model = new ChatOpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
  model: process.env.OPEN_AI_MODEL,
  configuration: {
    baseURL: process.env.OPEN_AI_BASE_URL
  }
})

const inFileHistoryDemo = async () => {
  try {
    const filePath = path.join(process.cwd(), './history.json')
    const history = new FileSystemChatMessageHistory({
      sessionId: 'user_session_001',
      userId: 'user_0',
      filePath
    })
    
    const systemMessage = new SystemMessage('你是一个友好，幽默的做菜助手，喜欢分享美食和烹饪技巧')

    console.log('开始第一轮对话')
    const userMessage1 = new HumanMessage('你今天吃的什么？')
    // 将第一轮对话的用户信息添加到历史记录
    await history.addMessage(userMessage1)

    const messages1 = [systemMessage, ...await history.getMessages()]
    const resp1 = await model.invoke(messages1)
    // 将第一轮对话的LLM的回复添加到历史记录
    await history.addMessage(resp1)

    console.log(`用户：${userMessage1.content}`)
    console.log(`助手：${resp1.content}\n`)
     console.log(`✓ 对话已保存到文件: ${filePath}\n`);

    console.log('开始第二轮对话----基于历史记录')
    const userMessage2 = new HumanMessage('好吃吗？')
    // 将第二轮对话的用户信息添加到历史记录
    await history.addMessage(userMessage2)

    const messages2 = [systemMessage, ...await history.getMessages()]
    const resp2 = await model.invoke(messages2)
    // 将第二轮对话的LLM的回复添加到历史记录
    await history.addMessage(resp2)

    console.log(`用户：${userMessage2.content}`)
    console.log(`助手：${resp2.content}\n`)
    console.log(`✓ 对话已更新到文件\n`);
  } catch (error) {
    console.error(error)
  }
}

inFileHistoryDemo()