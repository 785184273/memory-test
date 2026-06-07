import dotenv from 'dotenv'
import { OpenAIEmbeddings } from '@langchain/openai'
import { MilvusClient, DataType, MetricType, IndexType } from '@zilliz/milvus2-sdk-node'
import path from 'path'

const __dirname = import.meta.dirname

dotenv.config({
  path: path.resolve(__dirname, '../../.env')
})


// 集合名称
const COLLECTION_NAME = 'conversations'

// 向量维度
const DIMENSIONS = 1024

const embedding = new OpenAIEmbeddings({
  apiKey: process.env.OPEN_AI_API_KEY,
  model: process.env.OPEN_AI_EMBEDDING_MODEL,
  configuration: {
    baseURL: process.env.OPEN_AI_BASE_URL
  },
  dimensions: DIMENSIONS
})

const client = new MilvusClient({
  address: 'localhost:19530'
})

// 获取向量
const getVector = async (text) => {
  return await embedding.embedQuery(text)
}

// 模式
const schema = [
  {
    name: 'id',
    data_type: DataType.Int64,
    is_primary_key: true,
    autoID: true
  },
  {
    name: 'vector',
    data_type: DataType.FloatVector,
    dim: DIMENSIONS
  },
  {
    name: 'content',
    data_type: DataType.VarChar,
    max_length: 5000
  },
  {
    name: 'round',
    data_type: DataType.Int16
  },
  {
    name: 'timestamp',
    data_type: DataType.VarChar,
    max_length: 100
  }
]

const conversations = [
  {
    content: '用户: 我叫赵六，是一名数据科学家\n助手: 很高兴认识你，赵六！数据科学是一个很有趣的领域。',
    round: 1,
    timestamp: new Date().toISOString()
  },
  {
    content: '用户: 我最近在研究机器学习算法\n助手: 机器学习确实很有意思，你在研究哪些算法呢？',
    round: 2,
    timestamp: new Date().toISOString()
  },
  {
    content: '用户: 我喜欢打篮球和看电影\n助手: 运动和文化娱乐都是很好的爱好！',
    round: 3,
    timestamp: new Date().toISOString()
  },
  {
    content: '用户: 我周末经常去电影院\n助手: 看电影是很好的放松方式。',
    round: 4,
    timestamp: new Date().toISOString()
  },
  {
    content: '用户: 我的职业是软件工程师\n助手: 软件工程师是个很有前景的职业！',
    round: 5,
    timestamp: new Date().toISOString()
  }
]

const main = async () => {
  try {
    console.log('连接到 Milvus...')
    await client.connectPromise
    console.log('✓ 已连接\n')

    const exists = await client.hasCollection({
      collection_name: COLLECTION_NAME,
    })

    if (!exists.value) {
      console.log('创建集合')
      await client.createCollection({
        collection_name: COLLECTION_NAME,
        fields: schema
      })
      console.log('✓ 集合已创建')
    
      console.log('创建索引')
      await client.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: 'vector',
        index_name: 'conversations_vector',
        index_type: IndexType.IVF_FLAT,
        metric_type: MetricType.COSINE,
        params: { nlist: 1024 }
      })
      console.log('✓ 集合已创建')
    }

    console.log('加载集合')
    await client.loadCollection({
      collection_name: COLLECTION_NAME
    })
    console.log('✓ 集合已加载')

    console.log('生成向量嵌入...');
    const insertData = await Promise.all(
      conversations.map(async (item) => {
        return {
          ...item,
          vector: await getVector(item.content)
        }
      })
    )
    const insertResult = await client.insert({
      collection_name: COLLECTION_NAME,
      data: insertData
    })
    console.log(`✓ 已插入 ${insertResult.insert_cnt} 条记录\n`)

    console.log('='.repeat(60))
    console.log('说明：已成功将对话数据插入到 Milvus 向量数据库')
    console.log('这些对话数据将用于后续的 RAG 检索')
    console.log('='.repeat(60) + '\n')
  } catch (err) {
    console.error('错误:', err.message)
  }
}
main()

