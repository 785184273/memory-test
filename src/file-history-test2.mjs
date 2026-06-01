import dotenv from 'dotenv'
import path from 'path'
import { FileSystemChatMessageHistory } from '@langchain/community/stores/message/file_system'
import { ChatOpenAI } from '@langchain/openai'
import { SystemMessage, HumanMessage } from '@langchain/core/messages'

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

    // 获取对话历史记录
    const messages = await history.getMessages()
    console.log(`从${filePath}文件恢复了${messages.length}条历史记录`)
    messages.forEach((message, index) => {
      const type = message.type === 'human'
        ? '用户'
        : '助手'

      console.log(`${index + 1}. ${type}: ${message.content.slice(0, 50)}...`)
    })

    console.log('开始第三轮对话')
    const userMessage3 = new HumanMessage('使用到了哪些食材？')
    // 将第三轮对话的用户信息保存到历史记录中
    await history.addMessage(userMessage3)

    const messages3 = [systemMessage, ...await history.getMessages()]
    const resp3 = await model.invoke(messages3)
    // 将第三轮对话的LLM的回复添加到历史记录
    await history.addMessage(resp3)

    console.log(`用户：${userMessage3.content}`)
    console.log(`助手：${resp3.content}\n`)
    console.log(`✓ 对话已更新到文件\n`);
  } catch (error) {
    console.error(error)
  }

}

inFileHistoryDemo()