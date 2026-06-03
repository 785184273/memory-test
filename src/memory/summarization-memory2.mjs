import dotenv from 'dotenv'
import { AIMessage, HumanMessage, getBufferString, SystemMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import path from 'path'
import { getEncoding } from 'js-tiktoken'
import { count } from 'console'

const __dirname = import.meta.dirname

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
})

const model = new ChatOpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
  model: process.env.OPEN_AI_MODEL,
  configuration: {
    baseURL: process.env.OPEN_AI_BASE_URL
  }
})

const tiktoken = getEncoding('cl100k_base')

// 获取messages的总token数
const countTokens = (messages) => {
  return messages.reduce((sum, message) => {
    const content = typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content)

    sum += tiktoken.encode(content).length
    return sum
  }, 0)
}

const summarizationMemoryDemo = async () => {
  const history = new InMemoryChatMessageHistory()

  const maxTokens = 200 // 超过200tokens进行汇总
  const keepRecentTokens = 80 // 保留最近消息的token数量

  const messages = [
    { type: 'human', content: '我想学做红烧肉，你能教我吗？' },
    { type: 'ai', content: '当然可以！红烧肉是一道经典的中式菜肴。首先需要准备五花肉、冰糖、生抽、老抽、料酒等材料。' },
    { type: 'human', content: '五花肉需要切多大块？' },
    { type: 'ai', content: '建议切成3-4厘米见方的块，这样既容易入味，口感也更好。切好后可以用开水焯一下去除血沫。' },
    { type: 'human', content: '炒糖色的时候有什么技巧吗？' },
    { type: 'ai', content: '炒糖色是关键步骤。用小火慢慢炒，等冰糖完全融化变成焦糖色，冒小泡时就可以下肉了。注意不要炒过头，否则会发苦。' },
    { type: 'human', content: '需要炖多长时间？' },
    { type: 'ai', content: '一般需要炖40-60分钟，用小火慢炖，直到肉变得软糯入味。可以用筷子戳一下，能轻松戳透就说明好了。' },
    { type: 'human', content: '最后收汁的时候要注意什么？' },
    { type: 'ai', content: '收汁时要用大火，不断翻动，让汤汁均匀包裹在肉块上。看到汤汁变得浓稠，颜色红亮就可以出锅了。' },
  ]

  // 将消息添加到内存中去
  for (const message of messages) {
    history.addMessage(
      message.type === 'human'
        ? new HumanMessage(message.content)
        : new AIMessage(message.content)
    )
  }

  const allMessages = await history.getMessages()

  // 所有消息的token数
  const allMessageTokens = countTokens(allMessages)

  // 如果所有消息列表的tokens大于等于maxtoken，则需要汇总
  if (allMessageTokens >= maxTokens) {
    // 最近的messages
    const recentMessages = []
    // 最近的message总的token数
    let recentTokens = 0

    // 从后往前循环，比对token
    for (let i = allMessages.length - 1; i >= 0; --i) {
      const message = allMessages[i]
      const tokens = countTokens([message])
      if (tokens + recentTokens <= keepRecentTokens) {
        recentMessages.unshift(message)
        recentTokens += tokens
      } else {
        break
      }
    }

    // 需要汇总的messages
    const messagesToSummarize = allMessages.slice(0, allMessages.length - recentMessages.length)

    // 需要汇总的message总token数
    const summarizeTokens = countTokens(messagesToSummarize)

    // 清除所有messages
    await history.clear()
    // 将最近的message添加到内存中
    await history.addMessages(recentMessages)

    console.log("\n💡 Token 数量超过阈值，开始总结...");
    console.log(`📝 将被总结的消息数量: ${messagesToSummarize.length} (${summarizeTokens} tokens)`);
    console.log(`📝 将被保留的消息数量: ${recentMessages.length} (${recentTokens} tokens)`);

    const _allMessages = await history.getMessages()
    // 汇总的消息内容
    const summarizeContent = await summarizeHistory(messagesToSummarize)

    console.log(`保留的消息：`)
    _allMessages.forEach((message, index) => {
      const type = message.type === 'human'
        ? '用户'
        : 'AI'
      console.log(`[${type}]: ${message.content}`)
    })
    console.log(`\n汇总消息内容: ${summarizeContent}`)
  }
}

// 汇总消息
const summarizeHistory = async (messages) => {
  const summarizeContent = getBufferString(messages, '用户', 'AI')

  const prompt = `
    请总结以下对话的核心内容，保留重要信息，帮我汇总。
    对话信息：${summarizeContent}
    汇总: 
  `
  const _messages = [
    new SystemMessage(prompt)
  ]

  const res = await model.invoke(_messages)
  return res.content
}

summarizationMemoryDemo().catch(console.error)