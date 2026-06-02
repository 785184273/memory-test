import { AIMessage, HumanMessage, trimMessages } from '@langchain/core/messages'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import { getEncoding } from 'js-tiktoken'

const tiktoken = getEncoding('cl100k_base')

// ============= 1. 按照消息数量截断 =============
const messageCountTruncation = async () => {
  // InMemoryChatMessageHistory中的消息列表是存储在内存中
  const history = new InMemoryChatMessageHistory()
  const maxMessages = 4

  const messages = [
    { type: 'human', content: '我叫张三' },
    { type: 'ai', content: '你好张三，很高兴认识你！' },
    { type: 'human', content: '我今年25岁' },
    { type: 'ai', content: '25岁正是青春年华，有什么我可以帮助你的吗？' },
    { type: 'human', content: '我喜欢编程' },
    { type: 'ai', content: '编程很有趣！你主要用什么语言？' },
    { type: 'human', content: '我住在北京' },
    { type: 'ai', content: '北京是个很棒的城市！' },
    { type: 'human', content: '我的职业是软件工程师' },
    { type: 'ai', content: '软件工程师是个很有前景的职业！' },
  ]

  // 将message添加到history中
  for (const message of messages) {
    history.addMessage(
      message.type === 'human'
        ? new HumanMessage(message.content)
        : new AIMessage(message.content)
    )
  }

  // 截取后的messages
  const trimmedMessages = (await history.getMessages()).slice(-maxMessages)

  console.log(`保留消息数量: ${trimmedMessages.length}`)
  console.log("保留的消息:", trimmedMessages.map(m => `${m.constructor.name}: ${m.content}`).join('\n  '))
}

/**
 * 获取messages消息列表总的token数
 */
const countTokens = (messages) => {
  return messages.reduce((sum, msg) => {
    sum += tiktoken.encode(msg.content).length
    return sum
  }, 0)
}

// ============= 2. 按照token数量截断 =============
const tokenCountTruncation = async () => {
  // InMemoryChatMessageHistory中的消息列表是存储在内存中
  const history = new InMemoryChatMessageHistory()

  // 最大token数量
  const maxTokens = 100

  const messages = [
    { type: 'human', content: '我叫李四' },
    { type: 'ai', content: '你好李四，很高兴认识你！' },
    { type: 'human', content: '我是一名设计师' },
    { type: 'ai', content: '设计师是个很有创造力的职业！你主要做什么类型的设计？' },
    { type: 'human', content: '我喜欢艺术和音乐' },
    { type: 'ai', content: '艺术和音乐都是很好的爱好，它们能激发创作灵感。' },
    { type: 'human', content: '我擅长 UI/UX 设计' },
    { type: 'ai', content: 'UI/UX 设计非常重要，好的用户体验能让产品更成功！' },
  ]

  // 将message添加到history中
  for (const message of messages) {
    history.addMessage(
      message.type === 'human'
        ? new HumanMessage(message.content)
        : new AIMessage(message.content)
    )
  }

  const trimmedMessages = await trimMessages(
    await history.getMessages(),
    {
      maxTokens,
      tokenCounter: (messages) => countTokens(messages),
      strategy: 'last',
    }
  )

  const totalTokens = countTokens(trimmedMessages)

  console.log(`总 token 数: ${totalTokens}/${maxTokens}`)
  console.log(`保留消息数量: ${trimmedMessages.length}`)
  console.log("保留的消息:", trimmedMessages.map(m => {
    const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content)
    const tokens = tiktoken.encode(content).length
    return `${m.constructor.name} (${tokens} tokens): ${content}`
  }).join('\n  '));
}

const main = async () => {
  await messageCountTruncation()
  await tokenCountTruncation()
}
main().catch(console.error)