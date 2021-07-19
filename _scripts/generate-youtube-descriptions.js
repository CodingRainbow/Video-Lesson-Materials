const fs = require('fs');
const path = require('path');
const yaml = require('yaml-front-matter');

function findVideoFilesRecursive(dir, arrayOfFiles) {
  const files = fs.readdirSync(dir);

  arrayOfFiles = arrayOfFiles || [];

  for (const file of files) {
    if (fs.statSync(`${dir}/${file}`).isDirectory()) {
      arrayOfFiles = findVideoFilesRecursive(`${dir}/${file}`, arrayOfFiles);
    } else {
      if (file !== 'index.md' && file.substring(file.length - 3, file.length) === '.md') {
        arrayOfFiles.push(path.join(dir, '/', file));
      }
    }
  }

  return arrayOfFiles;
}

function getPlaylist(file) {
  const series = file.substring(0, file.lastIndexOf('/')) + '/index.md';
  const content = fs.readFileSync(series);
  const parsed = yaml.loadFront(content);
  if (parsed.playlist_id) {
    return parsed.playlist_id;
  }
  return false;
}

function getVideoData() {

  const directories = [
    '_learning',
    '_beginners',
    '_more',
    '_challenges',
    '_CodingChallenges',
    '_Courses',
    '_GuestTutorials',
    '_Streams',
    '_TeachableMachine',
    '_Tutorials',
  ];

  let files = [];
  for (const dir of directories) {
    findVideoFilesRecursive(dir, files);
  }

  const videos = [];

  for (const file of files) {
    const content = fs.readFileSync(`./${file}`, 'UTF8');
    const parsed = yaml.loadFront(content);
    let url = file.substring(1);
    url = url.substring(0, url.length - 3);
    videos.push({
      pageURL: url,
      data: parsed,
      playlist: getPlaylist(file),
    });
  }

  return videos;
}

function primeDirectory(dir) {

  fs.rmdirSync(dir, { recursive: true }, (err) => {
    if (err) {
        throw err;
    }
  });

  fs.mkdirSync(dir, err => {
    if(err) {
      throw err;
    }
  });

}

function getVideoID(url) {
  const location = url.substring(1, url.length);
  let page;
  try {
    // link to page on the site
    page = fs.readFileSync(`./_${location}.md`, "UTF8");
  } catch (err) {
    try {
      // link to series on site
      const files = fs.readdirSync(`./_${location}`);
      // get first page in series
      page = fs.readFileSync(`./_${location}/${files[0]}.md`, "UTF8");
    } catch (e) {
      // link to youtube playlist
      return url;
    }
  }
  const parsed_content = yaml.loadFront(page);
  return `https://youtu.be/${parsed_content.video_id}`;
}

function writeDescriptions(videos) {

  primeDirectory('./_descriptions');

  for (let i = 0; i < videos.length; i++) {

    const data = videos[i].data;
    const pageURL = videos[i].pageURL;
    const playlist = videos[i].playlist;

    let description = "";

    // Description
    let content = data.__content;
    description += `${content.trim()}`;

    // Code
    if (data.repository || data.web_editor) {
      description += ` https://thecodingtrain.com/${pageURL}.html`;
    }

    description += '\n';

    // Web Editor Links
    let hasWebEditorVariations = false;
    if (data.variations) {
      for (let j = 0; j < data.variations.length; ++j) {
        if (data.variations[j].web_editor) {

          if (!hasWebEditorVariations) {
            description += '\np5.js Web Editor Sketches:\n';

            if (data.web_editor) {
              description += `🕹️ Main Sketch: https://editor.p5js.org/codingtrain/sketches/${data.web_editor}\n`;
            }
          }

          description += `🕹️ ${data.variations[j].name}: https://editor.p5js.org/codingtrain/sketches/${data.variations[j].web_editor}\n`;

          hasWebEditorVariations = true;

        }
      }
    }

    if (!hasWebEditorVariations && data.web_editor) {
      description += `\n🕹️ p5.js Web Editor Sketch: https://editor.p5js.org/codingtrain/sketches/${data.web_editor}\n`;
    }

    // Next Video / Previous Video / Playlist
    let nextID;
    if (i !== videos.length - 1) {
      if (pageURL.substring(0, pageURL.lastIndexOf('/')) === videos[i + 1].pageURL.substring(0, videos[i + 1].pageURL.lastIndexOf('/'))) {
        nextID = videos[i + 1].data.video_id;
      } else {
        nextID = false;
      }
    } else {
      nextID = false;
    }

    let previousID;
    if (i !== 0) {
      if (pageURL.substring(0, pageURL.lastIndexOf('/')) === videos[i - 1].pageURL.substring(0, videos[i - 1].pageURL.lastIndexOf('/'))) {
        previousID = videos[i - 1].data.video_id;
      } else {
        previousID = false;
      }
    } else {
      previousID = false;
    }

    if (playlist || nextID) {
      description += '\n';

      if (previousID && playlist) {
        description += `🎥 Previous video: https://youtu.be/${previousID}?list=${playlist}\n`;
      } else if (previousID) {
        description += `🎥 Previous video: https://youtu.be/${previousID}\n`;
      }

      if (nextID && playlist) {
        description += `🎥 Next video: https://youtu.be/${nextID}?list=${playlist}\n`;
      } else if (nextID) {
        description += `🎥 Next video: https://youtu.be/${nextID}\n`;
      }

      if (playlist) {
        description += `🎥 All videos: https://www.youtube.com/playlist?list=${playlist}\n`;
      }
    }

    // Links
    if (data.links) {
      description += "\nLinks discussed in this video:\n";
      for (let i = 0; i < data.links.length; ++i) {
        const url = data.links[i].url;
        if (/https?:\/\/.*/.test(url)) { // starts with http:// or https://
          description += `🔗 ${data.links[i].title}: ${url}\n`
        } else { // assume relative link in thecodingtrain.com
          description += `🔗 ${data.links[i].title}: https://thecodingtrain.com${url}\n`
        }
      }
    }

    // Videos
    if (data.videos) {
      description += "\nOther videos mentioned in this video:\n";
      for (let i = 0; i < data.videos.length; ++i) {
        if (data.videos[i].video_id) {
          description += `🎥 ${data.videos[i].title}: https://youtu.be/${data.videos[i].video_id}\n`
        } else if (data.videos[i].url) {
          description += `🎥 ${data.videos[i].title}: ${getVideoID(data.videos[i].url)}\n`
        }
      }
    }

    // Timestamps
    if (data.topics) {
      description += "\nTimestamps:\n";
      for (let i = 0; i < data.topics.length; ++i) {
        description += `${data.topics[i].time} ${data.topics[i].title}\n`
      }
    }

    // General Links
    description += `
🚂 Website: http://thecodingtrain.com/
👾 Share Your Creation! https://thecodingtrain.com/Guides/community-contribution-guide.html
🚩 Suggest Topics: https://github.com/CodingTrain/Rainbow-Topics
💡 GitHub: https://github.com/CodingTrain
💬 Discord: https://discord.gg/hPuGy2g
💖 Membership: http://youtube.com/thecodingtrain/join
🛒 Store: https://standard.tv/codingtrain
📚 Books: https://www.amazon.com/shop/thecodingtrain
🖋️ Twitter: https://twitter.com/thecodingtrain
📸 Instagram: https://www.instagram.com/the.coding.train/

🎥 Coding Challenges: https://www.youtube.com/playlist?list=PLRqwX-V7Uu6ZiZxtDDRCi6uhfTH4FilpH
🎥 Intro to Programming: https://www.youtube.com/playlist?list=PLRqwX-V7Uu6Zy51Q-x9tMWIv9cueOFTFA

🔗 p5.js: https://p5js.org
🔗 p5.js Web Editor: https://editor.p5js.org/
🔗 Processing: https://processing.org

📄 Code of Conduct: https://github.com/CodingTrain/Code-of-Conduct

`


if (data.tags) {
    for (let i = 0; i < data.tags.length; ++i) {
      description += `#` + data.tags[i] + ` `;
    }
    description += `\n\n`;
  }

description += `This description was auto-generated. If you see a problem, please open an issue: https://github.com/CodingTrain/website/issues/new`;

    fs.writeFileSync(`_descriptions/${data.video_id}.txt`, description);
  }

}

(() => {

  console.log("💫 Generating YouTube Descriptions 💫")

  writeDescriptions(getVideoData());

})();
