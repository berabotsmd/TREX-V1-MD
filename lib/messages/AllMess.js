const { decodeJid, createInteractiveMessage, parsedJid } = require('../functions')
const Base = require('./Base')
const { writeExifWebp } = require('../sticker')
const config = require('../../config')
const ReplyMessage = require('./ReplyMessage')
const fileType = require('file-type')
const { generateWAMessageFromContent, generateWAMessage, getContentType, generateForwardMessageContent } = require('baileys')
const Message = require('./Message')
const { downloadMedia } = require('../serialize')

class AllMessage extends Base {
 constructor(client, data) {
  super(client)
  if (data) this._patch(data)
 }

 _patch(data) {
  this.user = decodeJid(this.client.user.id)
  this.key = data.key
  this.isGroup = data.isGroup
  this.prefix = data.prefix
  this.id = data.key.id
  this.jid = data.key.remoteJid
  this.message = { key: data.key, message: data.message }
  this.pushName = data.pushName
  this.participant = parsedJid(data.sender)[0]
  try {
   this.sudo = config.SUDO.split(',').includes(this.participant.split('@')[0])
  } catch {
   this.sudo = false
  }
  this.fromMe = data.key.fromMe
  this.isBaileys = this.id.startsWith('BAE5')
  this.timestamp = data.messageTimestamp.low || data.messageTimestamp

  if (data.type) {
   const type = data.type.replace('Message', '').toLowerCase()
   this[type] = data.message[data.type]
   const contextInfo = this[type].contextInfo
   this.mention = contextInfo?.mentionedJid || false

   if (data.quoted) {
    if (data.message.buttonsResponseMessage) return
    this.reply_message = this.quoted = this.msg?.contextInfo?.quotedMessage ? new ReplyMessage(this.client, { chat: this.chat, msg: this.msg, ...this.msg.contextInfo }) : false

    if (this.reply_message) {
     const quotedMessage = data.quoted.message.extendedTextMessage
     this.reply_message.type = data.quoted.type || 'extendedTextMessage'
     this.reply_message.mtype = data.quoted.mtype
     this.reply_message.mimetype = quotedMessage?.text?.mimetype || 'text/plain'
     this.reply_message.key = data.quoted.key
     this.reply_message.message = data.quoted.message
     this.reply_message.mention = quotedMessage?.contextInfo?.mentionedJid || false
    }
   } else {
    this.reply_message = false
   }
  } else {
   this.type = 'baileysEmit'
  }

  return super._patch(data)
 }

 async sendMessage(jid, text, options = {}) {
  return this.client.sendMessage(jid, text, options, this)
 }
 async sendReply(text, opt = {}) {
  if (!this.jid) {
   throw new Error('No recipient JID available. Make sure this.jid is set.')
  }

  const options = {
   quoted: this,
   ...opt,
  }

  return this.client.sendMessage(this.jid, { text }, options)
 }

 async log() {
  console.log(this.data)
 }

 async sendFile(content, options = {}) {
  const { data } = await this.client.getFile(content)
  const type = (await fileType.fromBuffer(data)) || {}
  return this.client.sendMessage(this.jid, { [type.mime.split('/')[0]]: data }, options)
 }

 async edit(text, opt = {}) {
  await this.client.sendMessage(this.jid, { text, edit: this.key, ...opt })
 }

 async reply(text, options) {
  const message = await this.client.sendMessage(this.jid, { text }, { quoted: this.data, ...options })
  return new Message(this.client, message)
 }

 async send(content, options = {}, type = 'text', jid = null) {
  let recipient = jid || this.jid
  if (!recipient) {
   throw new Error('No recipient specified. Please provide a JID or ensure this.jid is set.')
  }

  if (typeof recipient === 'string' && !recipient.endsWith('@s.whatsapp.net')) {
   recipient += '@s.whatsapp.net'
  }

  const defaultOptions = { packname: 'Xasena', author: 'X-electra' }
  const opt = { ...defaultOptions, ...options }

  const isUrl = url => {
   try {
    new URL(url)
    return true
   } catch {
    return false
   }
  }

  const detectFileType = async urlOrBuffer => {
   if (isUrl(urlOrBuffer)) {
    try {
     const response = await fetch(urlOrBuffer)
     const buffer = await response.buffer()
     const fileTypeInfo = (await fileType.fromBuffer(buffer)) || {}
     return fileTypeInfo
    } catch {
     throw new Error('Failed to fetch or detect file type from URL.')
    }
   } else if (Buffer.isBuffer(urlOrBuffer)) {
    const fileTypeInfo = (await fileType.fromBuffer(urlOrBuffer)) || {}
    return fileTypeInfo
   }
   throw new Error('Invalid content type for file type detection.')
  }

  switch (type.toLowerCase()) {
   case 'text':
    return this.client.sendMessage(recipient, { text: content, ...opt })

   case 'file':
    const { data } = await this.client.getFile(content)
    const fileTypeInfo = (await fileType.fromBuffer(data)) || {}
    return this.client.sendMessage(recipient, { [fileTypeInfo.mime.split('/')[0]]: data }, opt)

   case 'edit':
    return this.client.sendMessage(recipient, { text: content, edit: this.key, ...opt })

   case 'reply':
    const replyMessage = await this.client.sendMessage(recipient, { text: content }, { quoted: this.data, ...opt })
    return new Message(this.client, replyMessage)

   case 'image':
   case 'photo':
   case 'video':
   case 'audio':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(recipient, { [type]: content, ...opt })
    } else if (isUrl(content)) {
     return this.client.sendMessage(recipient, { [type]: { url: content }, ...opt })
    } else {
     throw new Error(`Unsupported content type for ${type}.`)
    }
    break

   case 'template':
    const optional = await generateWAMessage(recipient, content, opt)
    const templateMessage = {
     viewOnceMessage: {
      message: {
       ...optional.message,
      },
     },
    }
    return this.client.relayMessage(recipient, templateMessage, { messageId: optional.key.id })

   case 'interactive':
    const genMessage = createInteractiveMessage(content)
    return this.client.relayMessage(recipient, genMessage.message, { messageId: genMessage.key.id })

   case 'sticker':
    const { data: stickerData, mime } = await this.client.getFile(content)
    if (mime === 'image/webp') {
     const buff = await writeExifWebp(stickerData, opt)
     return this.client.sendMessage(recipient, { sticker: { url: buff }, ...opt }, opt)
    } else {
     const mimePrefix = mime.split('/')[0]
     if (mimePrefix === 'video' || mimePrefix === 'image') {
      return this.client.sendImageAsSticker(recipient, content, opt)
     }
    }
    break

   default:
    throw new Error(`Unsupported message type: ${type}`)
  }
 }

 async delete() {
  return await this.client.sendMessage(this.jid, { delete: { ...this.data.key, participant: this.sender } })
 }

 async edit(conversation) {
  return await this.client.relayMessage(this.jid, { protocolMessage: { key: this.data.key, type: 14, editedMessage: { conversation } } }, {})
 }
 async sendMessage(jid, content, opt = { packname: 'Xasena', author: 'X-electra' }, type = 'text') {
  switch (type.toLowerCase()) {
   case 'text':
    return this.client.sendMessage(jid, { text: content, ...opt })
   case 'image' || 'photo':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { image: content, ...opt })
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      image: { url: content },
      ...opt,
     })
    }
    break
   case 'video':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { video: content, ...opt })
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      video: { url: content },
      ...opt,
     })
    }
    break
   case 'audio':
    if (Buffer.isBuffer(content)) {
     return this.client.sendMessage(jid, { audio: content, ...opt })
    } else if (isUrl(content)) {
     return this.client.sendMessage(jid, {
      audio: { url: content },
      ...opt,
     })
    }
    break
   case 'template':
    const optional = await generateWAMessage(jid, content, opt)
    const message = {
     viewOnceMessage: {
      message: {
       ...optional.message,
      },
     },
    }
    await this.client.relayMessage(jid, message, {
     messageId: optional.key.id,
    })
    break
   case 'interactive':
    const genMessage = createInteractiveMessage(content)
    await this.client.relayMessage(jid, genMessage.message, {
     messageId: genMessage.key.id,
    })
    break
   case 'sticker':
    const { data, mime } = await this.client.getFile(content)
    if (mime == 'image/webp') {
     const buff = await writeExifWebp(data, opt)
     await this.client.sendMessage(jid, { sticker: { url: buff }, ...opt }, opt)
    } else {
     const mimePrefix = mime.split('/')[0]
     if (mimePrefix === 'video' || mimePrefix === 'image') {
      await this.client.sendImageAsSticker(this.jid, content, opt)
     }
    }
    break
  }
 }

 async forward(jid, content, options = {}) {
  if (options.readViewOnce) {
   content = content?.ephemeralMessage?.message || content
   const viewOnceKey = Object.keys(content)[0]
   delete content?.ignore
   delete content?.viewOnceMessage?.message?.[viewOnceKey]?.viewOnce
   content = { ...content?.viewOnceMessage?.message }
  }

  if (options.mentions) {
   content[getContentType(content)].contextInfo.mentionedJid = options.mentions
  }

  const forwardContent = generateForwardMessageContent(content, false)
  const contentType = getContentType(forwardContent)

  const forwardOptions = {
   ptt: options.ptt,
   waveform: options.audiowave,
   seconds: options.seconds,
   fileLength: options.fileLength,
   caption: options.caption,
   contextInfo: options.contextInfo,
  }

  if (options.mentions) {
   forwardOptions.contextInfo.mentionedJid = options.mentions
  }

  if (contentType !== 'conversation') {
   forwardOptions.contextInfo = content?.message[contentType]?.contextInfo || {}
  }

  forwardContent[contentType].contextInfo = {
   ...forwardOptions.contextInfo,
   ...forwardContent[contentType]?.contextInfo,
  }

  const waMessage = generateWAMessageFromContent(jid, forwardContent, {
   ...forwardContent[contentType],
   ...forwardOptions,
  })
  return await client.relayMessage(jid, waMessage.message, {
   messageId: waMessage.key.id,
  })
 }
 async download(pathFile = null) {
  try {
   const filePath = await downloadMedia(this.data.message, pathFile)
   return filePath
  } catch (error) {
   console.error('Failed to download media:', error)
   throw error
  }
 }
}

module.exports = AllMessage
