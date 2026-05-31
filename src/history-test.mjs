import dotenv from 'dotenv'
import path from 'path'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'

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

const inMemoryDemo = async () => {
  const history = new InMemoryChatMessageHistory()

  const systemMessage = new SystemMessage('你是一个友好，幽默的做菜助手，喜欢分享美食和烹饪技巧')

  console.log('开始第一轮对话')
  const userMessage1 = new HumanMessage('你今天吃的什么？')
  await history.addMessage(userMessage1)

  const messages1 = [systemMessage, ...await history.getMessages()]
  const resp1 = await model.invoke(messages1)
  await history.addMessage(resp1)

  console.log(`用户：${userMessage1.content}`)
  console.log(`助手：${resp1.content}\n`)

  console.log('开始第二轮对话----基于历史记录')
  const userMessage2 = new HumanMessage('好吃吗？')
  await history.addMessage(userMessage2)

  const messages2 = [systemMessage, ...await history.getMessages()]
  const resp2 = await model.invoke(messages2)
  await history.addMessage(resp2)

  console.log(`用户：${userMessage2.content}`)
  console.log(`助手：${resp2.content}\n`)

  console.log('历史消息记录')

  const allMessages = await history.getMessages()
  console.log(`共保存了 ${allMessages.length} 条消息：`)
  allMessages.forEach((msg, index) => {
    const type = msg.type
    const prefix = type === 'human' ? '用户' : '助手'
    console.log(`  ${index + 1}. [${prefix}]: ${msg.content.substring(0, 50)}...`)
  })
}

inMemoryDemo().catch(console.error)