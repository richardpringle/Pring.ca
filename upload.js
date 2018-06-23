'use strict'

const fs = require('fs')
const path = require('path')
const s3 = new (require('aws-sdk')).S3()

const join = dir => filename => path.join(dir, filename)

const Bucket = 'pring.ca'
const ACL = 'public-read'

const getContentType = filepath => {
  const [_, type] = filepath.match(/\.(html|css|js)$/) || []

  return !type ? type : type === 'js' ? 'text/javascript' : `text/${type}`
}

const upload = (Key, Body) =>
  s3.upload(
    {
      Bucket,
      ACL,
      Key,
      Body,
      ContentType: getContentType(Key),
    },
    {},
    err => err && console.log(err),
  )

const uploadAllFilesInDirectory = (directory, streamMap = new Map()) => {
  fs.readdir(directory, (err, files) => {
    files
      .filter(file => /^[^\.]/.test(file))
      .filter(file => file !== 'node_modules')
      .map(join(directory))
      .forEach(file => {
        const readStream = fs.createReadStream(file)

        readStream.on('error', err => {
          streamMap.delete(file)
          if (err.code === 'EISDIR') {
            uploadAllFilesInDirectory(file, streamMap)
          }
        })

        return streamMap.set(file, readStream)
      })
  })
}

const map = new Map()

uploadAllFilesInDirectory('./', map)

const uploadFromMap = map => {
  if (!map.size) return

  for (const [key, fileStream] of map) {
    upload(key, fileStream)
    map.delete(key)
  }

  setTimeout(uploadFromMap, 5000, map)
}

setImmediate(uploadFromMap, map)
