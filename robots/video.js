const gm = require('gm').subClass({imageMagick: true})
const state = require('./state.js')
const spawn = require("child_process").spawn
const path = require("path");
const rootPath = path.resolve(__dirname, '..')
const videoshow = require("videoshow")
const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath = require("@ffprobe-installer/ffprobe").path;
let ffmpeg = require("fluent-ffmpeg");
ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

async function robot() {
  console.log('> [video-robot] Starting...')
  const content = state.load()

  await convertAllImages(content)
  await createAllSentenceImages(content)
  await createYoutubeThumbnail()
  await mergeAllImages(content)
  await renderVideoWithNode(content)

  async function convertAllImages(content){
    for (let sentenceIndex=0; sentenceIndex < content.sentences.length; sentenceIndex++){
     await convertImage(sentenceIndex)
    }
  }

  async function convertImage(sentenceIndex){
    return new Promise( (resolve, reject) => {
      const inputFile = `./content/${sentenceIndex}-original.png[0]`
      const outputFile = `./content/${sentenceIndex}-converted.png`
      const width = 1920
      const height = 1080

      gm()
        .in(inputFile)
        .out('(')
          .out('-clone')
          .out('0')
          .out('-background', 'white')
          .out('-blur', '0x9')
          .out('-resize', `${width}x${height}^`)
        .out(')')
        .out('(')
          .out('-clone')
          .out('0')
          .out('-background', 'white')
          .out('-resize', `${width}x${height}`)
        .out(')')
        .out('-delete', '0')
        .out('-gravity', 'center')
        .out('-compose', 'over')
        .out('-composite')
        .out('-extent', `${width}x${height}`)
        .write(outputFile, (error) => {
          if (error) {
            return reject(error)
          }

          console.log(`> [video-robot] Image converted: ${outputFile}`)
          resolve()
          })
       })
  }

  async function createAllSentenceImages(content){
    for (let sentenceIndex = 0; sentenceIndex < content.sentences.length; sentenceIndex++){
      await createSentenceImage(sentenceIndex, content.sentences[sentenceIndex].text)
    }
  }

  async function createSentenceImage(sentenceIndex, sentenceText){
    return new Promise( (resolve, reject) => {
      const outputFile = `./content/${sentenceIndex}-sentence.png`
      
      const templateSettings = {
        0: {
          size: '1920x400',
          gravity: 'center'
        },
        1: {
          size: '1920x1080',
          gravity: 'center'
        },
        2: {
          size: '800x1080',
          gravity: 'west'
        },
        3: {
          size: '1920x400',
          gravity: 'center'
        },
        4: {
          size: '1920x1080',
          gravity: 'center'
        },
        5: {
          size: '800x1080',
          gravity: 'west'
        },
        6: {
          size: '1920x400',
          gravity: 'center'
        }

      }

      gm()
        .out('-size', templateSettings[sentenceIndex].size)
        .out('-gravity', templateSettings[sentenceIndex].gravity)
        .out('-background', 'transparent')
        .out('-fill', 'yellow')
        .out('-kerning', '-1')
        .out(`caption:${sentenceText}`)
        .write(outputFile, (error) => {
          if (error) {
            return reject(error)
          }

          console.log(`> [video-robot] Sentence created: ${outputFile}`)
          resolve()
        })
    })
  }

  async function createYoutubeThumbnail(){
    return new Promise( (resolve, reject) => {
      gm()
        .in('./content/0-converted.png')
        .write('./content/youtube-thumbnail.jpg', (error) => {
          if (error) {
            return reject(error)
          }

          console.log('> [video-robot] Youtube thumbnail created')
          resolve()
        })
     })
   }

   async function mergeAllImages(content){
    for (let sentenceIndex=0; sentenceIndex < content.sentences.length; sentenceIndex++){
      await mergeImage(sentenceIndex)
     }
   }

   async function mergeImage(sentenceIndex){
     return new Promise((resolve,reject) => {
      const inputImageFile = `./content/${sentenceIndex}-converted.png`
      const inputSentenceFile = `./content/${sentenceIndex}-sentence.png`
      const outputFile = `./content/${sentenceIndex}-merged.png`

      const templateSettings = {
        0: {
          gravity: 'South',
          geometry: '+0+0'
        },
        1: {
          gravity: 'center',
          geometry: '+0+0'
        },
        2: {
          gravity: 'center',
          geometry: '+20+0'
        },
        3: {
          gravity: 'South',
          geometry: '+0+0'
        },
        4: {
          gravity: 'center',
          geometry: '+0+0'
        },
        5: {
          gravity: 'center',
          geometry: '+20+0'
        },
        6: {
          gravity: 'South',
          geometry: '+0+0'
        }
      }
      
      gm(inputImageFile)
        .composite(inputSentenceFile)
        .gravity(templateSettings[sentenceIndex].gravity)
        .geometry(templateSettings[sentenceIndex].geometry)
        // .in(inputImageFile)
        // .in(inputSentenceFile)
        // .out('-composite','-gravity','center')
        // .out('-gravity','center')
        .write(outputFile, (error) => {
          if (error) {
            return reject(error)
          }

          console.log(`> [video-robot] Image merged: ${outputFile}`)
          resolve()
        })        
     })
   }

   async function renderVideoWithNode(content) {
     return new Promise((resolve, reject) => {
         let images = [];

        for (
          let sentenceIndex = 0;
          sentenceIndex < content.sentences.length;
          sentenceIndex++
        ) {
          images.push({
            path: `./content/${sentenceIndex}-merged.png`,
            // caption: content.sentences[sentenceIndex].text
          });
        }

        const videoOptions = {
          fps: 25,
          loop: 10, // seconds
          transition: true,
          transitionDuration: 1, // seconds
          videoBitrate: 1024,
          videoCodec: "libx264",
          size: "640x?",
          audioBitrate: "128k",
          audioChannels: 2,
          format: "mp4",
          pixelFormat: "yuv420p",
          useSubRipSubtitles: false, // Use ASS/SSA subtitles instead
          // logo: "./content/youtube-thumbnail.jpg",
          subtitleStyle: {
            Fontname: "Verdana",
            Fontsize: "40",
            PrimaryColour: "11861244",
            SecondaryColour: "11861244",
            TertiaryColour: "11861244",
            BackColour: "-2147483640",
            Bold: "2",
            Italic: "0",
            BorderStyle: "2",
            Outline: "2",
            Shadow: "3",
            Alignment: "2", // left, middle, right
            MarginL: "40",
            MarginR: "60",
            MarginV: "40"
          }
        };

        videoshow(images, videoOptions)
          .audio("./video_files/newsroom.mp3")
          .save("./video_files/video.mp4")
          .on("start", function(command) {
            //console.log("ffmpeg process started:", command);
            console.log('> [video-robot] Starting to render video...')
          })

          .on("error", function(err, stdout, stderr) {
            console.error("Error:", err);
            console.error("ffmpeg stderr:", stderr);
            reject(err);
          })
          .on("end", function(output) {
            console.error("> [video-robot] Video created in:", output);
            resolve();
          });
    })
  }

}

module.exports = robot
