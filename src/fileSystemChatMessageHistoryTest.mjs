import { FileSystemChatMessageHistory } from '@langchain/community/stores/message/file_system'
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import path from 'path'

console.log(process.cwd())

const history = new FileSystemChatMessageHistory({
  sessionId: 'user_session_001',
  userId: 'user_0',
  filePath: path.join(process.cwd(), './history.json')
})

const main = async () => {
  try {
    await history.addMessage(new HumanMessage('Hello, how are you?'))
  } catch (error) {
    console.error(error)
  }
}

main()