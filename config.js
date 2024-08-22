const { Sequelize } = require('sequelize')
require('dotenv').config()
const toBool = x => x === 'true'
const DATABASE_URL = process.env.DATABASE_URL || './database.db'
module.exports = {
 BASE_API: process.env.BASE_API || 'https://astro-api-guru.onrender.com',
 SESSION_ID: process.env.SESSION_ID || 'eyJub2lzZUtleSI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiV0RoYktFNnIvUmg5Zm9ObmZwRHFTK2VrZVpqTzJJZm9ISzRINGFFOHZuUT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiUFNMNW9FMU1zbVg4enZEM2N1a2pNN095QWE2VHN3WVFOc2ZCbUZQQ1dFQT0ifX0sInBhaXJpbmdFcGhlbWVyYWxLZXlQYWlyIjp7InByaXZhdGUiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJRR1RRS0lWbzBNanJUUlFaYVBJU09IMVZOL1cwZEZ0d0V5K201bXJOQmtnPSJ9LCJwdWJsaWMiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJWeEdUNktDb05DcUxWZTFIbjJMQnE5b3paQnlWckJXZXp3UHYzN3ZmeVhZPSJ9fSwic2lnbmVkSWRlbnRpdHlLZXkiOnsicHJpdmF0ZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IklDYTl0ZG9hakVSRnNacnJjeC9PSDFwRzM3L0haK3FzQm5EKzhER016bk09In0sInB1YmxpYyI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkxlZTYyenJrTHorVmZheG5VdnZPK1EyaktvN250ZDhtbUZxTHF5c0gyVnc9In19LCJzaWduZWRQcmVLZXkiOnsia2V5UGFpciI6eyJwcml2YXRlIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQUhtN0ZTTEZQaERMdS8xNFJkV3pvbk5QS2VpUnFmRW10UHBZcUwyQ1dFUT0ifSwicHVibGljIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiRjY5ejU0eUhPVmVwWFU2WkxCL1RuVlMxT2FKNkthekJRQWg3ZzhnVEVHMD0ifX0sInNpZ25hdHVyZSI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IjB3aTgvWGY2NVF0cVhtSHErTDVJREZVYlp5QnltQWR3V0l4bmFYK3RkekdoaTRVYlkzZjBMdUQ4WE1FYW4xaUxJdFlKMGh6aUtpcGVSaDl5R2tFUERnPT0ifSwia2V5SWQiOjF9LCJyZWdpc3RyYXRpb25JZCI6MiwiYWR2U2VjcmV0S2V5IjoiVVZXUng3d3BXZkppMUtJYmMxNDF0anBaSFVZWDBuNVZrU2tvL1FBZ3Z5UT0iLCJwcm9jZXNzZWRIaXN0b3J5TWVzc2FnZXMiOltdLCJuZXh0UHJlS2V5SWQiOjMxLCJmaXJzdFVudXBsb2FkZWRQcmVLZXlJZCI6MzEsImFjY291bnRTeW5jQ291bnRlciI6MCwiYWNjb3VudFNldHRpbmdzIjp7InVuYXJjaGl2ZUNoYXRzIjpmYWxzZX0sImRldmljZUlkIjoiclZzMk5nU3FTbC1UVnFneUJDQkJlZyIsInBob25lSWQiOiIwMTc2OWQyZC02Y2QzLTRiYWQtOWUyYS1iZDU4NzMzZjJmMmEiLCJpZGVudGl0eUlkIjp7InR5cGUiOiJCdWZmZXIiLCJkYXRhIjoiQ0hYMWRKYS9HMncvUVVlTU9Ca1QyaXgrK0NVPSJ9LCJyZWdpc3RlcmVkIjp0cnVlLCJiYWNrdXBUb2tlbiI6eyJ0eXBlIjoiQnVmZmVyIiwiZGF0YSI6IkVlb1RPdjNPZnBwTjNrVnFEc3BhdzQwM3U5QT0ifSwicmVnaXN0cmF0aW9uIjp7fSwicGFpcmluZ0NvZGUiOiJBRlkzS1RDRSIsIm1lIjp7ImlkIjoiMjU0NzQzOTgyMjA2OjkxQHMud2hhdHNhcHAubmV0IiwibmFtZSI6In5gYGBCRVJBIFRFQ0hgYGB+In0sImFjY291bnQiOnsiZGV0YWlscyI6IkNNang5Tm9HRVBpQm5iWUdHQllnQUNnQSIsImFjY291bnRTaWduYXR1cmVLZXkiOiJkT3FVb3NzMFI2VnlKRTlrTUljNmcwa1d3blJIRmh6d0VEd2pGTGVPcHhBPSIsImFjY291bnRTaWduYXR1cmUiOiJ3WU1VUTFnM2N3M2pzaDBha21HemlkcXZDVGpnc2ZWcjhCRDBsTE41Nm9iaVNZMVBGdTdyeDNHbHp0R3hsYm5VS0VpMWxvZldiTzJUMHdOYXRwd0ZEZz09IiwiZGV2aWNlU2lnbmF0dXJlIjoieWM5SkU5dmYxdVMwTXBqUWJ1ZUlHY2JjMnlvekZEYU1VRUF0OVVuc1BNT3RZRG9PSTRpVWJ4L0ZCK05ZdDEvbXZGZzVnUUU4ellpaEVKQXRhSkVURHc9PSJ9LCJzaWduYWxJZGVudGl0aWVzIjpbeyJpZGVudGlmaWVyIjp7Im5hbWUiOiIyNTQ3NDM5ODIyMDY6OTFAcy53aGF0c2FwcC5uZXQiLCJkZXZpY2VJZCI6MH0sImlkZW50aWZpZXJLZXkiOnsidHlwZSI6IkJ1ZmZlciIsImRhdGEiOiJCWFRxbEtMTE5FZWxjaVJQWkRDSE9vTkpGc0owUnhZYzhCQThJeFMzanFjUSJ9fV0sInBsYXRmb3JtIjoic21iYSIsImxhc3RBY2NvdW50U3luY1RpbWVzdGFtcCI6MTcyNDMzNDM0M30=',
 BOT_INFO: process.env.BOT_INFO || 'ᴀsᴛʀᴏ,ғxᴏᴘ-ᴍᴅ',
 SUDO: process.env.SUDO || '2348039607375,2349027862116',
 HANDLERS: process.env.HANDLER || '.',
 ANTILINK_ACTION: process.env.ANTI_LINK || 'kick',
 LANG: process.env.LANG || 'EN',
 BRANCH: 'master',
 WARN_COUNT: 3,
 PACKNAME: process.env.PACKNAME || 'ғxᴏᴘ-ᴍᴅ',
 WELCOME_MSG: process.env.WELCOME_MSG || 'Hi @user Welcome to @gname',
 GOODBYE_MSG: process.env.GOODBYE_MSG || 'Hi @user It was Nice Seeing you',
 AUTHOR: process.env.AUTHOR || 'ᴀsᴛʀᴏ',
 HEROKU_APP_NAME: process.env.HEROKU_APP_NAME || '',
 HEROKU_API_KEY: process.env.HEROKU_API_KEY || '',
 HEROKU: toBool(process.env.HEROKU) || false,
 AUTO_READ: toBool(process.env.AUTO_READ) || false,
 AUTO_STATUS_READ: toBool(process.env.AUTO_STATUS_READ) || false,
 ANTILINK: toBool(process.env.ANTI_LINK) || false,
 LOGS: toBool(process.env.LOGS) || true,
 RMBG_KEY: process.env.RMBG_KEY || false,
 DELETED_LOG: toBool(process.env.DELETED_LOG) || false,
 DELETED_LOG_CHAT: process.env.DELETED_LOG_CHAT || false,
 REMOVEBG: process.env.REMOVEBG || false,
 DATABASE_URL: DATABASE_URL,
 STATUS_SAVER: toBool(process.env.STATUS_SAVER) || true,
 WORK_TYPE: process.env.WORK_TYPE || 'private',
 PROCESSNAME: process.env.PROCESSNAME || 'fxop-md',
 DATABASE:
  DATABASE_URL === './database.db'
   ? new Sequelize({
      dialect: 'sqlite',
      storage: DATABASE_URL,
      logging: false,
     })
   : new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      ssl: true,
      protocol: 'postgres',
      dialectOptions: {
       native: true,
       ssl: { require: true, rejectUnauthorized: false },
      },
      logging: false,
     }),
}
