import dotenv from 'dotenv'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai'
import { MilvusClient, DataType, MetricType, IndexType } from '@zilliz/milvus2-sdk-node'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import path from 'path'

const __dirname = import.meta.dirname

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
})

// 集合名称
const COLLECTION_NAME = 'conversations'

// 向量维度
const DIMENSIONS = 1024

// 嵌入模型实例
const embedding = new OpenAIEmbeddings({
  apiKey: process.env.OPEN_AI_API_KEY,
  model: process.env.OPEN_AI_EMBEDDING_MODEL,
  configuration: {
    baseURL: process.env.OPEN_AI_BASE_URL
  },
  dimensions: DIMENSIONS
})

// LLM实例
const model = new ChatOpenAI({
  apiKey: process.env.OPEN_AI_API_KEY,
  model: process.env.OPEN_AI_MODEL,
  configuration: {
    baseURL: process.env.OPEN_AI_BASE_URL
  },
})

const client = new MilvusClient({
  address: 'localhost:19530'
})

// 获取向量
const getVector = async (text) => {
  return await embedding.embedQuery(text)
}

// 检索相关会话
const retrievalRelevantConversations = async (query, k = 2) => {
  try {
    const searchRes = await client.search({
      collection_name: COLLECTION_NAME,
      vector: await getVector(query),
      limit: k,
      metric_type: MetricType.COSINE,
      output_fields: ['content', 'round', 'timestamp']
    })
    return searchRes.results ?? []
  } catch (err) {
    console.err(err.message)
  }
}

const main = async () => {
  try {
    console.log('连接到 Milvus...')
    await client.connectPromise
    console.log('✓ 已连接\n')
  
    // 判断集合是否存在
    const exists = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    })
  
    if (!exists.value) {
      throw new Error(`集合(${COLLECTION_NAME})不存在`)
    }

    console.log('加载集合')
    await client.loadCollection({
      collection_name: COLLECTION_NAME
    })
    console.log('✓ 集合已加载')

    const history = new InMemoryChatMessageHistory()

    const conversations = [
      { input: "我之前提到的机器学习项目进展如何？" },
      { input: "我周末经常做什么？" },
      { input: "我的职业是什么？" },
    ]

    // 循环遍历每个用户问题
    for (let i = 0; i < conversations.length; ++i) {
      const { input } = conversations[i]
      //  用户信息
      const userMessage = new HumanMessage(input)

      console.log(`\n[第 ${i + 1} 轮对话]`)
      console.log(`用户: ${input}`)

       // 1. 检索相关的历史对话
      const relevantConversations = await retrievalRelevantConversations(input)

      let relevantHistory = ''
      if (relevantConversations.length) {
        relevantConversations.forEach((item, index) => {
          console.log(`\n[历史对话 ${index + 1}] 相似度: ${item.score.toFixed(4)}`)
          console.log(`轮次: ${item.round}`)
          console.log(`内容: ${item.content}`)
        })

        // 构建上下文
        relevantHistory = relevantConversations.map((item, index) => {
          return `[历史对话 ${index + 1}]
            轮次: ${item.round}
            ${item.content}`
        }).join('\n\n━━━━━\n\n')
      } else {
        console.log(`未找到和问题(${input})相关的历史上下文`)
      }

      // 2. 构建 prompt（使用检索到的历史作为上下文）
      const contextMessage = relevantHistory
        ? [new HumanMessage(`相关历史对话: \n${relevantHistory}\n\n用户问题: ${input}`)]
        : userMessage

      // 3. 调用模型生成回答
      console.log('\n【AI 回答】')
      const resp = await model.invoke(contextMessage)

      // 保存当前对话到历史消息
      await history.addMessage(userMessage)
      await history.addMessage(resp)

      // 4. 将对话保存到 Milvus 向量数据库
      const content = `用户: ${input}\n助手: ${resp.content}`
      const data = [{
        content,
        round: i + 1,
        vector: await getVector(content),
        timestamp: new Date().toISOString()
      }]

      try {
        await client.insert({
          collection_name: COLLECTION_NAME,
          data
        })
        console.log(`💾 已保存到 Milvus 向量数据库`)
        console.log(`助手: ${response.content}`);
      } catch (err) {
        throw new Error(`保存到向量数据库报错: ${err.message}`)
      }
    }

  } catch (err) {
    console.log(`保存到向量数据库报错: ${err.message}`)
  }

}

main()

