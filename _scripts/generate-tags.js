const fs = require("fs");
const path = require("path");
const yaml = require("yaml-front-matter");

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
    videos.push({
      data: parsed,
    });
  }

  return videos;
}

function primeDirectory(dir) {

  fs.rmdirSync(dir, {
    recursive: true
  }, (err) => {
    if (err) {
      throw err;
    }
  });

  fs.mkdirSync(dir, err => {
    if (err) {
      throw err;
    }
  });

}


function writeTags(tag, cantidad) {
  let description = `---
layout: tag
title: "#tags"
subtitle: "video about #tags"
tag-name: tags
---`;
  description = description.replaceAll('tags', tag);

  fs.writeFileSync(`_tag/${tag}.md`, description);
}

function writeTagsPage(tags, cantidad) {
  let description = `---
layout: base
title: "Cloud Tag"
redirect_from:
  - /tag
---\n
<div class="link-list">`;
  description += "<ul>\n";
  for (let i = 0; i < tags.length; i++) {
    description += `\t<li>
\t\t<a href="/tag/` + tags[i] + `">#` + tags[i] + ` [` + cantidad[i] + `]</a>
\t</li>\n`
  }
  description += "</ul>\n</div>"
  fs.writeFileSync(`_tag/cloud_tag.md`, description);
}

function writeDescriptions(videos) {
  primeDirectory("./_tag");

  let tags = []
  let cantidad = []
  for (let i = 0; i < videos.length; i++) {
    const data = videos[i].data;

    if (data.tags) {
      for (let i = 0; i < data.tags.length; ++i) {
        if (!tags.includes(data.tags[i])) {
          tags.push(data.tags[i]);
          cantidad.push(1)
        } else {
          indice = tags.indexOf(data.tags[i])
          cantidad[indice] += 1;
        }
      }
    }
  }

  for (let i = 0; i < tags.length; i++) {
    writeTags(tags[i], cantidad[i]);
  }
  writeTagsPage(tags, cantidad);
}

(() => {
  console.log("💫 Generating Tags 💫");
  writeDescriptions(getVideoData());
})();
