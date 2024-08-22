const { downloadContentFromMessage, getContentType } = require('baileys')
const fs = require('fs')
const { fromBuffer } = require('file-type')
const path = require('path')
const { writeExifImg, writeExifVid, imageToWebp, videoToWebp } = require('./sticker')
const { parsedJid } = require('./functions')
const config = require('../config')
const axios = require('axios')
async function downloadMedia(message, pathFile = null) {
 const mimeMap = {
  imageMessage: 'image',
  videoMessage: 'video',
  stickerMessage: 'sticker',
  documentMessage: 'document',
  audioMessage: 'audio',
 }

 try {
  let type = Object.keys(message)[0]
  let mes = message

  // Handle different message types
  if (type === 'templateMessage') {
   mes = message.templateMessage.hydratedFourRowTemplate
   type = Object.keys(mes)[0]
  }

  if (type === 'interactiveResponseMessage') {
   mes = message.interactiveResponseMessage
   type = Object.keys(mes)[0]
  }

  if (type === 'buttonsMessage') {
   mes = message.buttonsMessage
   type = Object.keys(mes)[0]
  }

  // Download content
  const stream = await downloadContentFromMessage(mes[type], mimeMap[type])
  const buffer = []

  for await (const chunk of stream) {
   buffer.push(chunk)
  }

  const finalBuffer = Buffer.concat(buffer)

  // Determine the save path
  if (!pathFile) {
   const tempDir = path.join(__dirname, '../temp')
   if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir) // Ensure temp directory exists
   }

   const extension = mes[type].mimetype ? mes[type].mimetype.split('/')[1] : 'bin' // Default to .bin if no mimetype
   pathFile = path.join(tempDir, `${Date.now()}.${extension}`)
  }

  // Write the file to the specified path
  fs.writeFileSync(pathFile, finalBuffer)
  return pathFile
 } catch (error) {
  console.error('Error in downloadMedia:', error)
  throw error
 }
}
async function serialize(msg, conn) {
 conn.logger = { info() {}, error() {}, warn() {} }
 if (msg.key) {
  msg.id = msg.key.id
  msg.isSelf = msg.key.fromMe
  msg.from = msg.key.remoteJid
  msg.isGroup = msg.from.endsWith('@g.us')

  msg.sender = msg.isGroup ? msg.key.participant : msg.isSelf ? conn.user.id : msg.from

  try {
   msg.sudo = config.SUDO.split(',').includes(parsedJid(msg.sender)[0].split('@')[0]) || msg.key.fromMe
  } catch {
   msg.sudo = false
  }
 }

 if (msg.message) {
  msg.type = getContentType(msg.message)

  try {
   msg.mentions = msg.message[msg.type]?.contextInfo?.mentionedJid || []
  } catch {
   msg.mentions = false
  }

  try {
   const quoted = msg.message[msg.type]?.contextInfo
   if (quoted && quoted.quotedMessage) {
    if (quoted.quotedMessage['ephemeralMessage']) {
     type = Object.keys(quoted.quotedMessage.ephemeralMessage.message)[0]
     msg.quoted = {
      type: type === 'viewOnceMessageV2' ? 'view_once' : 'ephemeral',
      stanzaId: quoted.stanzaId,
      sender: quoted.participant,
      message: type === 'viewOnceMessageV2' ? quoted.quotedMessage.ephemeralMessage.message.viewOnceMessageV2.message : quoted.quotedMessage.ephemeralMessage.message,
     }
    } else if (quoted.quotedMessage['viewOnceMessageV2']) {
     msg.quoted = {
      type: 'view_once',
      stanzaId: quoted.stanzaId,
      sender: quoted.participant,
      message: quoted.quotedMessage.viewOnceMessageV2.message,
     }
    } else if (quoted.quotedMessage['viewOnceMessageV2Extension']) {
     msg.quoted = {
      type: 'view_once_audio',
      stanzaId: quoted.stanzaId,
      sender: quoted.participant,
      message: quoted.quotedMessage.viewOnceMessageV2Extension.message,
     }
    } else {
     msg.quoted = {
      type: 'normal',
      stanzaId: quoted.stanzaId,
      sender: quoted.participant,
      message: quoted.quotedMessage,
     }
    }

    msg.quoted.isSelf = msg.quoted.sender === conn.user.id
    msg.quoted.mtype = Object.keys(msg.quoted.message)

    msg.quoted.text =
     msg.quoted.message[msg.quoted.mtype]?.text ||
     msg.quoted.message[msg.quoted.mtype]?.description ||
     msg.quoted.message[msg.quoted.mtype]?.caption ||
     (msg.quoted.mtype === 'templateButtonReplyMessage' && msg.quoted.message[msg.quoted.mtype].hydratedTemplate?.hydratedContentText) ||
     msg.quoted.message[msg.quoted.mtype] ||
     ''
    msg.quoted.key = {
     id: msg.quoted.stanzaId,
     fromMe: msg.quoted.isSelf,
     remoteJid: msg.from,
    }
    msg.quoted.download = pathFile => downloadMedia(msg.quoted.message, pathFile)
   }
  } catch (error) {
   console.error('Error in processing quoted message:', error)
   msg.quoted = null
  }

  try {
   msg.body =
    msg.message.conversation ||
    msg.message[msg.type]?.text ||
    msg.message[msg.type]?.caption ||
    (msg.type === 'listResponseMessage' && msg.message[msg.type].singleSelectReply.selectedRowId) ||
    (msg.type === 'buttonsResponseMessage' && msg.message[msg.type].selectedButtonId && msg.message[msg.type].selectedButtonId) ||
    (msg.type === 'templateButtonReplyMessage' && msg.message[msg.type].selectedId) ||
    false
  } catch (error) {
   console.error('Error in extracting message body:', error)
   msg.body = false
  }

  msg.download = pathFile => downloadMedia(msg.message, pathFile)
  conn.client = msg

  conn.getFile = async (PATH, returnAsFilename) => {
   let res, filename
   let data = Buffer.isBuffer(PATH)
    ? PATH
    : /^data:.*?\/.*?;base64,/i.test(PATH)
    ? Buffer.from(PATH.split`,`[1], 'base64')
    : /^https?:\/\//.test(PATH)
    ? await (res = await axios.get(PATH, { responseType: 'arraybuffer' })).data
    : fs.existsSync(PATH)
    ? ((filename = PATH), fs.readFileSync(PATH))
    : typeof PATH === 'string'
    ? PATH
    : Buffer.alloc(0)

   if (!Buffer.isBuffer(data)) throw new TypeError('Result is not a buffer')

   let type = (await fromBuffer(data)) || {
    mime: 'application/octet-stream',
    ext: '.bin',
   }

   if (data && returnAsFilename && !filename) {
    filename = path.join(__dirname, '../' + new Date().getTime() + '.' + type.ext)
    await fs.promises.writeFile(filename, data)
   }

   return {
    res,
    filename,
    ...type,
    data,
   }
  }

  conn.sendImageAsSticker = async (jid, buff, options = {}) => {
   let buffer
   if (options && (options.packname || options.author)) {
    buffer = await writeExifImg(buff, options)
   } else {
    buffer = await imageToWebp(buff)
   }
   await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, options)
  }

  conn.sendVideoAsSticker = async (jid, buff, options = {}) => {
   let buffer
   if (options && (options.packname || options.author)) {
    buffer = await writeExifVid(buff, options)
   } else {
    buffer = await videoToWebp(buff)
   }
   await conn.sendMessage(jid, { sticker: { url: buffer }, ...options }, options)
  }
 }
 return msg
}

module.exports = { serialize, downloadMedia }
